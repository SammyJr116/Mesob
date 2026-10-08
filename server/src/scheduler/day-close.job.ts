import { prisma } from "../lib/prisma.js";
import { Role } from "@prisma/client";

export class DayCloseError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = "DayCloseError";
    this.statusCode = statusCode;
  }
}

export class DayCloseJob {
  /**
   * Closes the active business day, generates EOD summary snapshot and advances business date (PRD 4.1.5, 22.6)
   */
  async executeDayClose(options: {
    callerId?: string;
    callerRole?: Role;
    isManual?: boolean;
    reason?: string;
  }) {
    const settings = await prisma.setting.findUnique({ where: { id: "singleton" } });
    const businessDate = settings?.currentBusinessDate || new Date().toISOString().slice(0, 10);

    // 1. Check if already closed and not reopened
    const existingClosure = await prisma.dayClosure.findUnique({ where: { businessDate } });
    if (existingClosure && !existingClosure.reopenedAt) {
      throw new DayCloseError(`Business day ${businessDate} has already been closed`, 400);
    }

    // 2. Fetch all invoices issued on this business date
    const invoices = await prisma.invoice.findMany({
      where: { businessDate },
      include: {
        lines: true,
        order: {
          include: { payments: true },
        },
      },
    });

    let totalSubtotal = 0;
    let totalDiscount = 0;
    let totalServiceCharge = 0;
    let totalTaxPortion = 0;
    let totalInvoiceAmount = 0;

    for (const inv of invoices) {
      totalSubtotal += Number(inv.subtotal);
      totalDiscount += Number(inv.discount);
      totalServiceCharge += Number(inv.serviceCharge);
      totalTaxPortion += Number(inv.tax);
      totalInvoiceAmount += Number(inv.total);
    }

    // 3. Fetch credit notes issued on this business date (PRD 22.2.1)
    const creditNotes = await prisma.creditNote.findMany({
      where: { businessDate },
    });

    let creditNotesTotal = 0;
    let creditNotesTaxTotal = 0;
    for (const cn of creditNotes) {
      creditNotesTotal += Number(cn.amount);
      creditNotesTaxTotal += Number(cn.taxAmount);
    }

    // Calculate Net Sales & Tax per PRD 22.2.1:
    // Net sales = item subtotal - discount - tax portion - credit notes issued
    const rawNetSales = totalSubtotal - totalDiscount - totalTaxPortion;
    const netSales = Math.max(0, rawNetSales - (creditNotesTotal - creditNotesTaxTotal));
    const taxCollected = Math.max(0, totalTaxPortion - creditNotesTaxTotal);

    // 4. Group payments by method
    const payments = await prisma.payment.findMany({
      where: {
        order: {
          invoice: { businessDate },
        },
      },
    });

    const paymentsByMethod: Record<string, number> = {};
    let totalCollected = 0;
    for (const p of payments) {
      const amt = Number(p.amount);
      totalCollected += amt;
      paymentsByMethod[p.paymentMethod] = (paymentsByMethod[p.paymentMethod] || 0) + amt;
    }

    // 5. Completed & Cancelled orders counts
    const completedOrdersCount = invoices.length;

    const cancelledOrders = await prisma.order.findMany({
      where: {
        orderDate: businessDate,
        status: "Cancelled",
      },
    });

    // 6. Open orders carried over (PRD 4.1.4, 22.6.2)
    const openOrdersCarriedOver = await prisma.order.count({
      where: {
        status: { in: ["Open", "Active", "In Progress", "Ready", "Served"] },
      },
    });

    // 7. Cancelled items breakdown
    const cancelledItems = await prisma.ticketItem.findMany({
      where: {
        status: "Cancelled",
        ticket: { order: { orderDate: businessDate } },
      },
    });

    const cancellationReasons: Record<string, number> = {};
    for (const ci of cancelledItems) {
      const reason = ci.cancellationReason || "Unspecified";
      cancellationReasons[reason] = (cancellationReasons[reason] || 0) + 1;
    }

    // 8. Compile EOD snapshot summary (PRD 22.6.2)
    const summary = {
      businessDate,
      completedOrdersCount,
      cancelledOrdersCount: cancelledOrders.length,
      openOrdersCarriedOverCount: openOrdersCarriedOver,
      subtotal: Math.round(totalSubtotal * 100) / 100,
      discountTotal: Math.round(totalDiscount * 100) / 100,
      serviceChargeTotal: Math.round(totalServiceCharge * 100) / 100,
      taxCollected: Math.round(taxCollected * 100) / 100,
      netSales: Math.round(netSales * 100) / 100,
      totalCollected: Math.round(totalCollected * 100) / 100,
      paymentsByMethod,
      creditNotesCount: creditNotes.length,
      creditNotesTotal: Math.round(creditNotesTotal * 100) / 100,
      creditNotesTaxTotal: Math.round(creditNotesTaxTotal * 100) / 100,
      cancellationReasonsBreakdown: cancellationReasons,
      closedAt: new Date().toISOString(),
      isManual: Boolean(options.isManual),
    };

    // 9. Save DayClosure record
    const closure = await prisma.dayClosure.upsert({
      where: { businessDate },
      update: {
        closedAt: new Date(),
        closedById: options.callerId || "SYSTEM_SCHEDULER",
        summaryJson: JSON.stringify(summary),
        reopenedAt: null,
        reopenedById: null,
      },
      create: {
        businessDate,
        closedAt: new Date(),
        closedById: options.callerId || "SYSTEM_SCHEDULER",
        summaryJson: JSON.stringify(summary),
      },
    });

    // 10. Discard unsent draft orders that were never sent to kitchen (PRD 4.6.3)
    await prisma.order.deleteMany({
      where: {
        orderDate: businessDate,
        status: "Open",
        tickets: { none: {} },
      },
    });

    // 11. Advance business day to next date (PRD 4.1.1)
    const [y, m, d] = businessDate.split("-").map(Number);
    const dateObj = new Date(Date.UTC(y, m - 1, d));
    dateObj.setUTCDate(dateObj.getUTCDate() + 1);
    const nextBusinessDate = dateObj.toISOString().slice(0, 10);

    await prisma.setting.update({
      where: { id: "singleton" },
      data: { currentBusinessDate: nextBusinessDate },
    });

    // 12. Write ActivityLog
    const userExists = options.callerId ? await prisma.user.findUnique({ where: { id: options.callerId } }) : null;
    await prisma.activityLog.create({
      data: {
        userId: userExists ? options.callerId : null,
        role: options.callerRole || Role.MANAGER,
        action: "DAY_CLOSE",
        target: "DayClosure",
        targetId: closure.id,
        oldValue: businessDate,
        newValue: nextBusinessDate,
        reason: options.reason || (options.isManual ? "Manager manual business day close" : "Scheduled automatic business day close"),
      },
    });

    return { closure, summary, nextBusinessDate };
  }

  /**
   * Reopens most recently closed business day (PRD 4.1.7)
   */
  async reopenDay(reason: string, caller: { id: string; role: Role }) {
    if (caller.role !== Role.MANAGER && caller.role !== Role.ADMIN) {
      throw new DayCloseError("Only the Manager can reopen a closed business day (PRD 4.1.7)", 403);
    }

    if (!reason || !reason.trim()) {
      throw new DayCloseError("Reopen reason is required (PRD 4.1.7)", 400);
    }

    // Find most recently closed day
    const lastClosure = await prisma.dayClosure.findFirst({
      orderBy: { closedAt: "desc" },
    });

    if (!lastClosure) {
      throw new DayCloseError("No closed business day found to reopen", 404);
    }

    const updated = await prisma.dayClosure.update({
      where: { id: lastClosure.id },
      data: {
        reopenedAt: new Date(),
        reopenedById: caller.id,
        reopenReason: reason.trim(),
      },
    });

    // Restore business date in Settings
    await prisma.setting.update({
      where: { id: "singleton" },
      data: { currentBusinessDate: lastClosure.businessDate },
    });

    // Log ActivityLog
    const userExists = caller.id ? await prisma.user.findUnique({ where: { id: caller.id } }) : null;
    await prisma.activityLog.create({
      data: {
        userId: userExists ? caller.id : null,
        role: caller.role,
        action: "DAY_REOPEN",
        target: "DayClosure",
        targetId: lastClosure.id,
        newValue: lastClosure.businessDate,
        reason: reason.trim(),
      },
    });

    return updated;
  }
}

export const dayCloseJob = new DayCloseJob();
