import { prisma } from "../lib/prisma.js";
import { emitTicketDelayed, emitReservationNoShow, emitTableUpdated } from "../ws/gateway.js";
import { recurringExpensesJob } from "./recurring-expenses.job.js";
import { maintenanceJob } from "./maintenance.job.js";

export class MonitorsJob {
  private timer: NodeJS.Timeout | null = null;

  /**
   * Scans active tickets and flags any exceeding the threshold as delayed (PRD 10.3)
   */
  async checkDelayedTickets(): Promise<any[]> {
    const settings = await prisma.setting.findUnique({ where: { id: "singleton" } });
    const thresholdMinutes = settings?.delayedTicketMinutes || 20;

    const activeTickets = await prisma.ticket.findMany({
      where: {
        status: { in: ["Submitted", "Preparing"] },
      },
      include: {
        order: true,
        items: true,
      },
    });

    const now = Date.now();
    const newlyDelayed: any[] = [];

    for (const ticket of activeTickets) {
      const elapsedMs = now - new Date(ticket.submittedAt).getTime();
      const elapsedMinutes = elapsedMs / (60 * 1000);

      if (elapsedMinutes >= thresholdMinutes && !ticket.isDelayed) {
        const updated = await prisma.ticket.update({
          where: { id: ticket.id },
          data: { isDelayed: true },
          include: { order: true, items: true },
        });

        emitTicketDelayed(updated);
        newlyDelayed.push(updated);
      }
    }

    return newlyDelayed;
  }

  /**
   * Scans reservations and marks those exceeding no-show grace period as No Show (PRD 13.4)
   */
  async checkNoShowReservations(): Promise<any[]> {
    const settings = await prisma.setting.findUnique({ where: { id: "singleton" } });
    const today = settings?.currentBusinessDate || new Date().toISOString().slice(0, 10);
    const graceMinutes = 15; // PRD 5.7, 13.4.1

    const reservations = await prisma.reservation.findMany({
      where: {
        date: today,
        status: { in: ["Confirmed", "Pending"] },
      },
      include: {
        tables: { include: { table: true } },
      },
    });

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const newlyNoShow: any[] = [];

    for (const res of reservations) {
      const [h, m] = res.time.split(":").map(Number);
      const resMinutes = (h || 0) * 60 + (m || 0);

      if (currentMinutes >= resMinutes + graceMinutes) {
        const updated = await prisma.$transaction(async (tx) => {
          const updatedRes = await tx.reservation.update({
            where: { id: res.id },
            data: { status: "No Show" },
            include: { tables: { include: { table: true } } },
          });

          // Release tables if Reserved (PRD 13.4.1)
          for (const rt of res.tables) {
            if (rt.table.status === "Reserved") {
              await tx.table.update({
                where: { id: rt.tableId },
                data: { status: "Available" },
              });
            }
          }

          return updatedRes;
        });

        emitReservationNoShow(updated);
        for (const rt of res.tables) {
          const freshTable = await prisma.table.findUnique({ where: { id: rt.tableId } });
          if (freshTable) emitTableUpdated(freshTable);
        }

        newlyNoShow.push(updated);
      }
    }

    return newlyNoShow;
  }

  /**
   * Starts background monitor interval
   */
  start(intervalMs = 60000) {
    if (this.timer) return;
    this.timer = setInterval(async () => {
      try {
        await this.checkDelayedTickets();
        await this.checkNoShowReservations();
        await recurringExpensesJob.run();
        await maintenanceJob.run();
      } catch (err) {
        console.error("[MonitorsJob] Poller encountered error:", err);
      }
    }, intervalMs);
  }

  /**
   * Stops background monitor interval
   */
  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}

export const monitorsJob = new MonitorsJob();
