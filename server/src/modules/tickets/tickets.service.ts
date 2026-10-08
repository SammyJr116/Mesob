import { prisma } from "../../lib/prisma.js";
import { Role } from "@prisma/client";
import { emitTicketStatus, emitOrderUpdated } from "../../ws/gateway.js";
import { ordersService } from "../orders/orders.service.js";

export class TicketError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number = 400) {
    super(message);
    this.name = "TicketError";
    this.statusCode = statusCode;
  }
}

export class TicketsService {
  /**
   * Kitchen moves ticket Submitted -> Preparing -> Ready (PRD 10.2)
   */
  async updateTicketStatus(
    ticketId: string,
    newStatus: "Preparing" | "Ready",
    caller: { id: string; role: Role; employeeId?: string | null }
  ) {
    // Only Kitchen or Manager may progress kitchen tickets (PRD 10.2)
    if (caller.role !== Role.KITCHEN && caller.role !== Role.MANAGER && caller.role !== Role.ADMIN) {
      throw new TicketError("Only Kitchen staff or Manager can change kitchen ticket status (PRD 10.2)", 403);
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        order: {
          include: {
            waiter: true,
            tables: { include: { table: true } },
          },
        },
        items: true,
      },
    });

    if (!ticket) throw new TicketError("Ticket not found", 404);

    if (ticket.status === "Served" || ticket.status === "Cancelled") {
      throw new TicketError(`Cannot update status of ${ticket.status} ticket`, 400);
    }

    const now = new Date();
    const updateData: any = { status: newStatus };

    if (newStatus === "Preparing") {
      updateData.preparingAt = now;
      // Update item statuses to Preparing
      await prisma.ticketItem.updateMany({
        where: { ticketId, status: "Pending" },
        data: { status: "Preparing" },
      });
    } else if (newStatus === "Ready") {
      updateData.readyAt = now;
      // Update item statuses to Ready
      await prisma.ticketItem.updateMany({
        where: { ticketId, status: { in: ["Pending", "Preparing"] } },
        data: { status: "Ready" },
      });
    }

    const updated = await prisma.ticket.update({
      where: { id: ticketId },
      data: updateData,
      include: {
        items: { include: { menuItem: true } },
        order: {
          include: {
            waiter: true,
            tables: { include: { table: true } },
          },
        },
      },
    });

    // Notify owning waiter with sound if Ready (PRD 10.4.1)
    const waiterEmployeeId = ticket.order.waiterId;
    let waiterUserId: string | null = null;
    if (waiterEmployeeId) {
      const waiterUser = await prisma.user.findFirst({
        where: { employeeId: waiterEmployeeId },
      });
      if (waiterUser) waiterUserId = waiterUser.id;
    }

    emitTicketStatus(updated, waiterUserId, waiterEmployeeId);

    const fullOrder = await ordersService.getOrderById(ticket.orderId);
    emitOrderUpdated(fullOrder);

    return updated;
  }

  /**
   * Waiter marks ticket Served (PRD 9.5.1, Task 3.2.3)
   * Only owning waiter or Manager allowed. Kitchen is strictly forbidden (PRD 10.2.2).
   */
  async serveTicket(
    ticketId: string,
    caller: { id: string; role: Role; employeeId?: string | null }
  ) {
    if (caller.role === Role.KITCHEN) {
      throw new TicketError("Kitchen staff cannot mark a ticket Served (PRD 9.5.1, 10.2.2)", 403);
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        order: {
          include: {
            tickets: true,
            waiter: true,
            tables: { include: { table: true } },
          },
        },
        items: true,
      },
    });

    if (!ticket) throw new TicketError("Ticket not found", 404);

    const isManager = caller.role === Role.MANAGER || caller.role === Role.ADMIN;
    const isOwnerWaiter = caller.employeeId && caller.employeeId === ticket.order.waiterId;

    if (!isManager && !isOwnerWaiter) {
      throw new TicketError("Only the owning waiter or Manager can mark tickets Served (PRD 9.5.1)", 403);
    }

    const now = new Date();

    const updatedTicket = await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        status: "Served",
        servedAt: now,
      },
      include: {
        items: { include: { menuItem: true } },
        order: {
          include: {
            tickets: true,
            waiter: true,
            tables: { include: { table: true } },
          },
        },
      },
    });

    // Mark items Served
    await prisma.ticketItem.updateMany({
      where: { ticketId, status: { not: "Cancelled" } },
      data: { status: "Served" },
    });

    // Check if ALL non-cancelled tickets in this order are now Served (PRD 9.5.2)
    const allOrderTickets = await prisma.ticket.findMany({
      where: { orderId: ticket.orderId },
    });

    const allServed = allOrderTickets
      .filter((t) => t.status !== "Cancelled")
      .every((t) => t.id === ticketId || t.status === "Served");

    if (allServed) {
      // Transition order status to Served -> Unlocks payment recording!
      await prisma.order.update({
        where: { id: ticket.orderId },
        data: { status: "Served" },
      });
    }

    emitTicketStatus(updatedTicket);

    const fullOrder = await ordersService.getOrderById(ticket.orderId);
    emitOrderUpdated(fullOrder);

    return { ticket: updatedTicket, allServed, order: fullOrder };
  }

  /**
   * Kitchen rejects item on Submitted ticket (PRD 9.6.4)
   */
  async rejectTicketItem(
    ticketItemId: string,
    reason: string,
    caller: { id: string; role: Role }
  ) {
    if (caller.role !== Role.KITCHEN && caller.role !== Role.MANAGER) {
      throw new TicketError("Only Kitchen staff or Manager can reject ticket items (PRD 9.6.4)", 403);
    }

    const item = await prisma.ticketItem.findUnique({
      where: { id: ticketItemId },
      include: { ticket: { include: { order: true } } },
    });

    if (!item) throw new TicketError("Item not found", 404);

    if (item.ticket.status !== "Submitted") {
      throw new TicketError("Can only reject items on a Submitted ticket (PRD 9.6.4)", 400);
    }

    const updatedItem = await prisma.ticketItem.update({
      where: { id: ticketItemId },
      data: {
        status: "Cancelled",
        cancellationReason: `Rejected by Kitchen: ${reason || "Out of stock"}`,
        cancelledAt: new Date(),
        cancelledById: caller.id,
      },
    });

    await ordersService.recalculateOrderTotals(item.ticket.orderId);

    const fullOrder = await ordersService.getOrderById(item.ticket.orderId);
    emitOrderUpdated(fullOrder);

    return updatedItem;
  }

  /**
   * Retrieves active kitchen queue tickets (PRD 10.1)
   */
  async getKitchenQueue() {
    return prisma.ticket.findMany({
      where: {
        status: { in: ["Submitted", "Preparing", "Ready"] },
      },
      include: {
        items: { include: { menuItem: true } },
        order: {
          include: {
            tables: { include: { table: true } },
            waiter: true,
          },
        },
      },
      orderBy: { submittedAt: "asc" },
    });
  }
}

export const ticketsService = new TicketsService();
