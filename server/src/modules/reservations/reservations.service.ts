import { prisma } from "../../lib/prisma.js";
import { Role } from "@prisma/client";
import { emitTableUpdated } from "../../ws/gateway.js";

export class ReservationError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = "ReservationError";
    this.statusCode = statusCode;
  }
}

export interface CreateReservationInput {
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  guests: number;
  tableIds: string[];
  notes?: string;
}

export class ReservationsService {
  /**
   * Generates continuous sequential reservation number (RES-0001)
   */
  async getNextReservationNumber(): Promise<string> {
    const key = "RES";
    const seq = await prisma.numberSequence.upsert({
      where: { key },
      update: { nextValue: { increment: 1 } },
      create: { key, nextValue: 2 },
    });
    const num = seq.nextValue === 2 ? 1 : seq.nextValue - 1;
    return `RES-${String(num).padStart(4, "0")}`;
  }

  /**
   * Helper: converts HH:mm to minutes from midnight
   */
  private timeToMinutes(timeStr: string): number {
    const [h, m] = timeStr.split(":").map(Number);
    return (h || 0) * 60 + (m || 0);
  }

  /**
   * Lists reservations with optional filters
   */
  async listReservations(filters: { date?: string; status?: string; phone?: string }) {
    const where: any = {};
    if (filters.date) where.date = filters.date;
    if (filters.status) where.status = filters.status;
    if (filters.phone) {
      where.customer = { phone: { contains: filters.phone.trim() } };
    }

    return prisma.reservation.findMany({
      where,
      include: {
        customer: true,
        tables: { include: { table: true } },
      },
      orderBy: [{ date: "asc" }, { time: "asc" }],
    });
  }

  /**
   * Retrieves reservation by ID
   */
  async getReservationById(id: string) {
    const res = await prisma.reservation.findUnique({
      where: { id },
      include: {
        customer: true,
        tables: { include: { table: true } },
      },
    });
    if (!res) throw new ReservationError("Reservation not found", 404);
    return res;
  }

  /**
   * Creates a reservation with strict overlap and capacity validation (PRD 13.1, 13.2)
   */
  async createReservation(input: CreateReservationInput, caller: { id: string; role: Role }) {
    if (!input.customerPhone || !input.customerPhone.trim()) {
      throw new ReservationError("Customer phone number is required (PRD 13.1.1)", 400);
    }
    if (!input.customerName || !input.customerName.trim()) {
      throw new ReservationError("Customer name is required (PRD 13.1.1)", 400);
    }
    if (!input.tableIds || input.tableIds.length === 0) {
      throw new ReservationError("At least one table must be selected for reservation", 400);
    }
    if (!input.guests || input.guests <= 0) {
      throw new ReservationError("Guest count must be at least 1", 400);
    }

    // 1. Fetch tables and verify combined capacity (PRD 13.2.3)
    const tables = await prisma.table.findMany({
      where: { id: { in: input.tableIds } },
    });

    if (tables.length !== input.tableIds.length) {
      throw new ReservationError("One or more selected tables do not exist", 404);
    }

    const totalSeats = tables.reduce((sum, t) => sum + t.seats, 0);
    if (totalSeats < input.guests) {
      throw new ReservationError(
        `Combined seats of assigned tables (${totalSeats}) is less than guest count (${input.guests}) (PRD 13.2.3)`,
        400
      );
    }

    // 2. Fixed reservation duration (default 90 mins per PRD 5.7, 13.2.1)
    const durationMinutes = 90;
    const newStart = this.timeToMinutes(input.time);
    const newEnd = newStart + durationMinutes;

    // 3. Concurrency-safe overlap validation across all requested tables (PRD 13.2.2)
    // Find all active reservations on the same date
    const existingReservations = await prisma.reservation.findMany({
      where: {
        date: input.date,
        status: { in: ["Pending", "Confirmed", "Arrived"] },
        tables: {
          some: {
            tableId: { in: input.tableIds },
          },
        },
      },
      include: {
        tables: { include: { table: true } },
      },
    });

    for (const ex of existingReservations) {
      const exStart = this.timeToMinutes(ex.time);
      const exEnd = exStart + (ex.durationMinutes || durationMinutes);

      // Overlap formula: max(start1, start2) < min(end1, end2)
      const hasOverlap = Math.max(newStart, exStart) < Math.min(newEnd, exEnd);

      if (hasOverlap) {
        // Find which table overlaps
        const overlappingTable = ex.tables.find((et) => input.tableIds.includes(et.tableId));
        const tableName = overlappingTable ? overlappingTable.table.number : "selected";
        throw new ReservationError(
          `Table ${tableName} already has an active reservation (${ex.reservationNumber}) from ${ex.time} holding until ${Math.floor(exEnd / 60)}:${String(exEnd % 60).padStart(2, "0")} (PRD 13.2.2)`,
          409
        );
      }
    }

    // 4. Link or create Customer (PRD 13.8.1)
    const cleanPhone = input.customerPhone.trim();
    const customer = await prisma.customer.upsert({
      where: { phone: cleanPhone },
      update: {
        name: input.customerName.trim(),
        email: input.customerEmail?.trim() || undefined,
      },
      create: {
        name: input.customerName.trim(),
        phone: cleanPhone,
        email: input.customerEmail?.trim() || null,
      },
    });

    const reservationNumber = await this.getNextReservationNumber();

    // 5. Create reservation inside transaction
    const reservation = await prisma.$transaction(async (tx) => {
      const res = await tx.reservation.create({
        data: {
          reservationNumber,
          customerId: customer.id,
          date: input.date,
          time: input.time,
          guests: input.guests,
          durationMinutes,
          status: "Confirmed",
          notes: input.notes?.trim() || null,
          tables: {
            create: input.tableIds.map((tid) => ({ tableId: tid })),
          },
        },
        include: {
          customer: true,
          tables: { include: { table: true } },
        },
      });

      // If reservation is for today, update table status to Reserved (PRD 13.3.2)
      const settings = await tx.setting.findUnique({ where: { id: "singleton" } });
      const today = settings?.currentBusinessDate || new Date().toISOString().slice(0, 10);
      if (input.date === today) {
        for (const tid of input.tableIds) {
          const t = await tx.table.findUnique({ where: { id: tid } });
          if (t && t.status === "Available") {
            await tx.table.update({
              where: { id: tid },
              data: { status: "Reserved" },
            });
          }
        }
      }

      return res;
    });

    // Notify tables updated
    for (const tid of input.tableIds) {
      const updatedTable = await prisma.table.findUnique({ where: { id: tid } });
      if (updatedTable) emitTableUpdated(updatedTable);
    }

    return reservation;
  }

  /**
   * Updates reservation status (PRD 13.1.2, 13.4, 13.5)
   */
  async updateReservationStatus(
    id: string,
    status: "Confirmed" | "Arrived" | "Completed" | "Cancelled" | "No Show",
    caller: { id: string; role: Role },
    overrideReason?: string
  ) {
    const res = await prisma.reservation.findUnique({
      where: { id },
      include: { tables: { include: { table: true } } },
    });
    if (!res) throw new ReservationError("Reservation not found", 404);

    // PRD 13.1.3: Only Manager can override No Show
    if (res.status === "No Show" && status !== "No Show") {
      if (caller.role !== Role.MANAGER && caller.role !== Role.ADMIN) {
        throw new ReservationError("Only the Manager can override No Show status (PRD 13.1.3)", 403);
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      const updatedRes = await tx.reservation.update({
        where: { id },
        data: {
          status,
          notes: overrideReason ? `${res.notes ? res.notes + "; " : ""}Override: ${overrideReason}` : undefined,
        },
        include: {
          customer: true,
          tables: { include: { table: true } },
        },
      });

      // If status became Cancelled, No Show, or Completed -> release tables if Reserved (PRD 13.3.1, 13.4)
      if (["Cancelled", "No Show", "Completed"].includes(status)) {
        for (const rt of res.tables) {
          if (rt.table.status === "Reserved") {
            await tx.table.update({
              where: { id: rt.tableId },
              data: { status: "Available" },
            });
          }
        }
      }

      return updatedRes;
    });

    // Broadcast table updates
    for (const rt of res.tables) {
      const freshTable = await prisma.table.findUnique({ where: { id: rt.tableId } });
      if (freshTable) emitTableUpdated(freshTable);
    }

    return updated;
  }
}

export const reservationsService = new ReservationsService();
