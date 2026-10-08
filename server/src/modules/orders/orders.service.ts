import { prisma } from "../../lib/prisma.js";
import { Role } from "@prisma/client";
import { calculateBill } from "../billing/calculator.js";
import { emitTicketSubmitted, emitTicketStatus, emitTableUpdated, emitOrderUpdated } from "../../ws/gateway.js";

export class OrderError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number = 400) {
    super(message);
    this.name = "OrderError";
    this.statusCode = statusCode;
  }
}

export interface CreateOrderItemInput {
  menuItemId: string;
  variantId?: string;
  quantity: number;
  notes?: string;
  addons?: { id: string; name: string; price: number }[];
}

export interface CreateOrderInput {
  type: "Dine-in" | "Takeaway";
  tableId?: string;
  tableNumber?: string;
  waiterId?: string;
  customerPhone?: string;
  customerName?: string;
  guestCount?: number;
  notes?: string;
  items?: CreateOrderItemInput[];
}

export class OrdersService {
  /**
   * Generates next daily sequential order number (PRD 4.4.1)
   */
  async getNextOrderNumber(businessDate: string): Promise<string> {
    const key = `ORDER_${businessDate}`;
    const seq = await prisma.numberSequence.upsert({
      where: { key },
      update: { nextValue: { increment: 1 } },
      create: { key, nextValue: 2 },
    });

    const num = seq.nextValue === 2 ? 1 : seq.nextValue - 1;
    return `ORD-${String(num).padStart(4, "0")}`;
  }

  /**
   * Opens an order (PRD 9.3, 9.4, 9.8)
   */
  async createOrder(input: CreateOrderInput, caller: { id: string; role: Role; employeeId?: string | null }) {
    const settings = await prisma.setting.findUnique({ where: { id: "singleton" } });
    const businessDate = settings?.currentBusinessDate || new Date().toISOString().slice(0, 10);

    let table = null;
    if (input.type === "Dine-in") {
      if (!input.tableId && !input.tableNumber) {
        throw new OrderError("Table is required for dine-in orders", 400);
      }

      table = await prisma.table.findFirst({
        where: input.tableId ? { id: input.tableId } : { number: input.tableNumber },
      });

      if (!table) {
        throw new OrderError("Selected table not found", 404);
      }

      if (table.status !== "Available") {
        throw new OrderError(`Table ${table.number} is currently ${table.status}. Only Available tables can be seated.`, 400);
      }
    }

    // Takeaway customer validation (PRD 9.8.1)
    let customerId: string | undefined;
    if (input.type === "Takeaway") {
      if (!input.customerPhone || !input.customerPhone.trim()) {
        throw new OrderError("Customer phone number is required for takeaway orders (PRD 9.8.1)", 400);
      }

      const cleanPhone = input.customerPhone.trim();
      const customer = await prisma.customer.upsert({
        where: { phone: cleanPhone },
        update: {
          name: input.customerName?.trim() || undefined,
        },
        create: {
          phone: cleanPhone,
          name: input.customerName?.trim() || "Takeaway Customer",
        },
      });
      customerId = customer.id;
    } else if (input.customerPhone) {
      const cleanPhone = input.customerPhone.trim();
      const customer = await prisma.customer.upsert({
        where: { phone: cleanPhone },
        update: {
          name: input.customerName?.trim() || undefined,
        },
        create: {
          phone: cleanPhone,
          name: input.customerName?.trim() || "Guest",
        },
      });
      customerId = customer.id;
    }

    const orderNumber = await this.getNextOrderNumber(businessDate);
    const waiterId = input.waiterId || caller.employeeId || null;

    // Create Order record
    const order = await prisma.order.create({
      data: {
        orderNumber,
        orderDate: businessDate,
        type: input.type,
        status: input.items && input.items.length > 0 ? "Active" : "Open",
        waiterId,
        customerId,
        guestCount: input.guestCount || 1,
        notes: input.notes,
        tables: table ? { create: [{ tableId: table.id }] } : undefined,
      },
      include: {
        tables: { include: { table: true } },
        waiter: true,
        customer: true,
      },
    });

    // Update table status to Occupied
    if (table) {
      const updatedTable = await prisma.table.update({
        where: { id: table.id },
        data: { status: "Occupied" },
      });
      emitTableUpdated(updatedTable);
    }

    // If items provided, create Round 1 ticket
    if (input.items && input.items.length > 0) {
      await this.dispatchTicket(order.id, input.items, caller);
    }

    const fullOrder = await this.getOrderById(order.id);
    emitOrderUpdated(fullOrder);
    return fullOrder;
  }

  /**
   * Dispatches a new ticket round for an order (PRD 9.4)
   */
  async dispatchTicket(orderId: string, items: CreateOrderItemInput[], caller: { id: string; role: Role }) {
    if (!items || items.length === 0) {
      throw new OrderError("Cannot dispatch empty ticket. At least one item is required.", 400);
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        tickets: true,
        tables: { include: { table: true } },
        waiter: true,
      },
    });

    if (!order) {
      throw new OrderError("Order not found", 404);
    }

    if (order.status === "Completed" || order.status === "Cancelled") {
      throw new OrderError(`Cannot add ticket to ${order.status} order`, 400);
    }

    const nextRound = order.tickets.length + 1;

    // Fetch menu item snapshots
    const itemIds = items.map((i) => i.menuItemId);
    const dbItems = await prisma.menuItem.findMany({
      where: { id: { in: itemIds } },
      include: { variants: true },
    });
    const dbItemMap = new Map(dbItems.map((m) => [m.id, m]));

    // Build ticket items
    const ticketItemsCreate = items.map((inputItem) => {
      const menuItem = dbItemMap.get(inputItem.menuItemId);
      if (!menuItem) {
        throw new OrderError(`Menu item ${inputItem.menuItemId} not found`, 404);
      }

      if (menuItem.status !== "Active" || !menuItem.manualAvailable || !menuItem.autoAvailable) {
        throw new OrderError(`Menu item "${menuItem.name}" is currently unavailable`, 400);
      }

      let unitPrice = Number(menuItem.basePrice);
      let variantName: string | undefined;

      if (inputItem.variantId) {
        const variant = menuItem.variants.find((v) => v.id === inputItem.variantId);
        if (variant) {
          unitPrice = Number(variant.price);
          variantName = variant.name;
        }
      }

      // Add addons prices to snapshot
      if (inputItem.addons && inputItem.addons.length > 0) {
        for (const addon of inputItem.addons) {
          unitPrice += Number(addon.price || 0);
        }
      }

      return {
        menuItemId: menuItem.id,
        variantId: inputItem.variantId,
        variantName,
        quantity: inputItem.quantity || 1,
        unitPrice,
        notes: inputItem.notes,
        addonsJson: inputItem.addons ? JSON.stringify(inputItem.addons) : null,
        status: "Pending",
      };
    });

    const ticket = await prisma.ticket.create({
      data: {
        orderId: order.id,
        roundNumber: nextRound,
        status: "Submitted",
        items: {
          create: ticketItemsCreate,
        },
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
    });

    // Recalculate order totals
    await this.recalculateOrderTotals(order.id);

    // Update order status back to Active
    await prisma.order.update({
      where: { id: order.id },
      data: { status: "Active" },
    });

    // Emit real-time event to Kitchen with sound (PRD 10.4.1)
    emitTicketSubmitted(ticket);

    const updatedOrder = await this.getOrderById(order.id);
    emitOrderUpdated(updatedOrder);

    return ticket;
  }

  /**
   * Recalculates order subtotal, service charge, tax portion, and total payable (PRD 11.1)
   */
  async recalculateOrderTotals(orderId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        tickets: {
          include: { items: true },
        },
      },
    });

    if (!order) return;

    const settings = await prisma.setting.findUnique({ where: { id: "singleton" } });
    const taxRate = settings ? Number(settings.vatRate) : 15;
    const serviceRate = settings ? Number(settings.serviceChargeRate) : 10;

    const billItems = order.tickets.flatMap((t) =>
      t.items.map((i) => ({
        name: i.variantName || "Item",
        quantity: i.quantity,
        unitPrice: Number(i.unitPrice),
        cancelled: i.status === "Cancelled",
      }))
    );

    const discountPercent = Number(order.discountValue || 0);
    const bill = calculateBill(billItems, {
      discountPercent,
      taxRatePercent: taxRate,
      serviceChargePercent: serviceRate,
    });

    await prisma.order.update({
      where: { id: orderId },
      data: {
        subtotal: bill.subtotal,
        serviceCharge: bill.serviceChargeAmount,
        tax: bill.taxAmount,
        total: bill.total,
      },
    });
  }

  /**
   * Cancels an item with reason requirement (PRD 9.6)
   */
  async cancelTicketItem(
    ticketItemId: string,
    reason: string,
    caller: { id: string; role: Role; employeeId?: string | null }
  ) {
    if (!reason || !reason.trim()) {
      throw new OrderError("Cancellation reason is strictly required (PRD 9.6.1)", 400);
    }

    const ticketItem = await prisma.ticketItem.findUnique({
      where: { id: ticketItemId },
      include: {
        ticket: {
          include: {
            order: true,
          },
        },
      },
    });

    if (!ticketItem) {
      throw new OrderError("Ticket item not found", 404);
    }

    const ticketStatus = ticketItem.ticket.status;
    const isManager = caller.role === Role.MANAGER || caller.role === Role.ADMIN;
    const isOwnerWaiter = caller.employeeId && caller.employeeId === ticketItem.ticket.order.waiterId;

    if (ticketStatus === "Submitted") {
      // Both owning waiter and manager can cancel before prep starts (PRD 9.6.1)
      if (!isManager && !isOwnerWaiter) {
        throw new OrderError("Only the owning waiter or manager can cancel items on a submitted ticket", 403);
      }
    } else {
      // Once Preparing, Ready or Served, only Manager can cancel (PRD 9.6.2)
      if (!isManager) {
        throw new OrderError(
          `Ticket is already ${ticketStatus}. Only a Manager can cancel items after preparation starts (PRD 9.6.2).`,
          403
        );
      }
    }

    const updatedItem = await prisma.ticketItem.update({
      where: { id: ticketItemId },
      data: {
        status: "Cancelled",
        cancellationReason: reason.trim(),
        cancelledAt: new Date(),
        cancelledById: caller.id,
      },
    });

    // Check if all items in ticket are cancelled -> cancel ticket
    const remainingItems = await prisma.ticketItem.findMany({
      where: { ticketId: ticketItem.ticketId, status: { not: "Cancelled" } },
    });

    if (remainingItems.length === 0) {
      await prisma.ticket.update({
        where: { id: ticketItem.ticketId },
        data: { status: "Cancelled" },
      });
    }

    await this.recalculateOrderTotals(ticketItem.ticket.orderId);

    const updatedOrder = await this.getOrderById(ticketItem.ticket.orderId);
    emitOrderUpdated(updatedOrder);

    return updatedItem;
  }

  /**
   * Applies manager discount percentage (PRD 11.2)
   */
  async applyDiscount(
    orderId: string,
    percent: number,
    reason: string,
    manager: { id: string; role: Role }
  ) {
    if (manager.role !== Role.MANAGER && manager.role !== Role.ADMIN) {
      throw new OrderError("Only a Manager can apply discounts (PRD 11.2.1)", 403);
    }

    if (!reason || !reason.trim()) {
      throw new OrderError("Discount reason is mandatory (PRD 11.2.2)", 400);
    }

    if (percent < 0 || percent > 100) {
      throw new OrderError("Discount percentage must be between 0 and 100", 400);
    }

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new OrderError("Order not found", 404);
    if (order.status === "Completed" || order.status === "Cancelled") {
      throw new OrderError(`Cannot discount ${order.status} order`, 400);
    }

    await prisma.order.update({
      where: { id: orderId },
      data: {
        discountType: "PERCENT",
        discountValue: percent,
        discountReason: reason.trim(),
        discountManagerId: manager.id,
      },
    });

    await this.recalculateOrderTotals(orderId);

    // Audit log
    await prisma.activityLog.create({
      data: {
        userId: manager.id,
        role: manager.role,
        action: "Discount Applied",
        target: `Order: ${order.orderNumber}`,
        oldValue: `${order.discountValue}%`,
        newValue: `${percent}%`,
        reason: reason.trim(),
      },
    });

    const updated = await this.getOrderById(orderId);
    emitOrderUpdated(updated);
    return updated;
  }

  /**
   * Moves order to another Available table (PRD 25.4.1.15)
   */
  async moveTable(orderId: string, newTableId: string, caller: { id: string; role: Role }) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { tables: true },
    });
    if (!order) throw new OrderError("Order not found", 404);

    const targetTable = await prisma.table.findUnique({ where: { id: newTableId } });
    if (!targetTable) throw new OrderError("Target table not found", 404);
    if (targetTable.status !== "Available") {
      throw new OrderError(`Target table ${targetTable.number} is ${targetTable.status}. Must be Available.`, 400);
    }

    // Release old tables
    const oldTableIds = order.tables.map((t) => t.tableId);
    await prisma.orderTable.deleteMany({ where: { orderId } });

    for (const tid of oldTableIds) {
      const freed = await prisma.table.update({
        where: { id: tid },
        data: { status: "Available" },
      });
      emitTableUpdated(freed);
    }

    // Assign new table
    await prisma.orderTable.create({
      data: { orderId, tableId: newTableId },
    });
    const occupied = await prisma.table.update({
      where: { id: newTableId },
      data: { status: "Occupied" },
    });
    emitTableUpdated(occupied);

    const updated = await this.getOrderById(orderId);
    emitOrderUpdated(updated);
    return updated;
  }

  /**
   * Reassigns order waiter (PRD 9.9.3)
   */
  async reassignWaiter(orderId: string, newWaiterId: string, manager: { id: string; role: Role }) {
    if (manager.role !== Role.MANAGER && manager.role !== Role.ADMIN) {
      throw new OrderError("Only a Manager can reassign order waiters (PRD 9.9.3)", 403);
    }

    const waiter = await prisma.employee.findUnique({ where: { id: newWaiterId } });
    if (!waiter) throw new OrderError("Waiter not found", 404);

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: { waiterId: newWaiterId },
      include: { waiter: true, tables: { include: { table: true } } },
    });

    emitOrderUpdated(updated);
    return updated;
  }

  /**
   * Cancels entire order (PRD 9.7)
   */
  async cancelOrder(orderId: string, reason: string, caller: { id: string; role: Role; employeeId?: string | null }) {
    if (!reason || !reason.trim()) {
      throw new OrderError("Cancellation reason is required", 400);
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        tickets: true,
        tables: true,
        invoice: true,
      },
    });

    if (!order) throw new OrderError("Order not found", 404);
    if (order.invoice) throw new OrderError("Order has an issued invoice and cannot be cancelled (PRD 9.7.2)", 400);

    const hasStartedTicket = order.tickets.some((t) => t.status === "Preparing" || t.status === "Ready" || t.status === "Served");
    const isManager = caller.role === Role.MANAGER || caller.role === Role.ADMIN;
    const isOwner = caller.employeeId && caller.employeeId === order.waiterId;

    if (hasStartedTicket && !isManager) {
      throw new OrderError("Tickets have already been prepared. Only a Manager can cancel this order.", 403);
    }
    if (!hasStartedTicket && !isManager && !isOwner) {
      throw new OrderError("Only the owning waiter or a Manager can cancel this order.", 403);
    }

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: "Cancelled",
        cancellationReason: reason.trim(),
        cancelledAt: new Date(),
        cancelledById: caller.id,
      },
    });

    // Free up table if dine-in
    for (const t of order.tables) {
      const freed = await prisma.table.update({
        where: { id: t.tableId },
        data: { status: "Available" },
      });
      emitTableUpdated(freed);
    }

    emitOrderUpdated(updated);
    return updated;
  }

  async getOrderById(orderId: string) {
    return prisma.order.findUnique({
      where: { id: orderId },
      include: {
        tables: { include: { table: true } },
        waiter: true,
        customer: true,
        tickets: {
          include: {
            items: { include: { menuItem: true } },
          },
        },
        invoice: {
          include: { creditNotes: true, lines: true },
        },
        payments: true,
      },
    });
  }

  async listOrders(filters: { date?: string; status?: string; type?: string; waiterId?: string }) {
    return prisma.order.findMany({
      where: {
        orderDate: filters.date,
        status: filters.status,
        type: filters.type,
        waiterId: filters.waiterId,
      },
      include: {
        tables: { include: { table: true } },
        waiter: true,
        customer: true,
        tickets: {
          include: { items: { include: { menuItem: true } } },
        },
        invoice: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }
}

export const ordersService = new OrdersService();
