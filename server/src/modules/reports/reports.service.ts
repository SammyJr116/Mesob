import { prisma } from "../../lib/prisma.js";

export class ReportsService {
  /**
   * Financial & Sales Summary Aggregates (PRD 22.2.1)
   * Formula: Net sales = item subtotal - discount - extracted tax - credit notes issued
   */
  async getSalesSummary(startDate: string, endDate: string) {
    const invoices = await prisma.invoice.findMany({
      where: {
        businessDate: { gte: startDate, lte: endDate },
      },
      include: {
        order: {
          include: { payments: true },
        },
      },
    });

    let totalSubtotal = 0;
    let totalDiscount = 0;
    let totalServiceCharge = 0;
    let totalTaxPortion = 0;
    let totalCollected = 0;
    const paymentsByMethod: Record<string, number> = {};

    for (const inv of invoices) {
      totalSubtotal += Number(inv.subtotal);
      totalDiscount += Number(inv.discount);
      totalServiceCharge += Number(inv.serviceCharge);
      totalTaxPortion += Number(inv.tax);

      if (inv.order?.payments) {
        for (const p of inv.order.payments) {
          const amt = Number(p.amount);
          totalCollected += amt;
          paymentsByMethod[p.paymentMethod] = (paymentsByMethod[p.paymentMethod] || 0) + amt;
        }
      }
    }

    // Credit notes issued in this date range (PRD 22.2.1: reduces net sales & tax in issue period)
    const creditNotes = await prisma.creditNote.findMany({
      where: {
        businessDate: { gte: startDate, lte: endDate },
      },
    });

    let creditNotesTotal = 0;
    let creditNotesTaxTotal = 0;
    for (const cn of creditNotes) {
      creditNotesTotal += Number(cn.amount);
      creditNotesTaxTotal += Number(cn.taxAmount);
    }

    const rawNetSales = totalSubtotal - totalDiscount - totalTaxPortion;
    const netSales = Math.max(0, rawNetSales - (creditNotesTotal - creditNotesTaxTotal));
    const taxCollected = Math.max(0, totalTaxPortion - creditNotesTaxTotal);

    const cancelledOrdersCount = await prisma.order.count({
      where: {
        orderDate: { gte: startDate, lte: endDate },
        status: "Cancelled",
      },
    });

    return {
      period: { startDate, endDate },
      completedOrdersCount: invoices.length,
      cancelledOrdersCount,
      subtotal: Math.round(totalSubtotal * 100) / 100,
      discounts: Math.round(totalDiscount * 100) / 100,
      serviceCharge: Math.round(totalServiceCharge * 100) / 100,
      taxCollected: Math.round(taxCollected * 100) / 100,
      netSales: Math.round(netSales * 100) / 100,
      totalCollected: Math.round(totalCollected * 100) / 100,
      paymentsByMethod,
      creditNotes: {
        count: creditNotes.length,
        totalAmount: Math.round(creditNotesTotal * 100) / 100,
        taxDeducted: Math.round(creditNotesTaxTotal * 100) / 100,
      },
    };
  }

  /**
   * Sales breakdown by Menu Item (PRD 22.2.2, 22.2.3 proportional discount allocation)
   */
  async getSalesByItem(startDate: string, endDate: string) {
    const invoices = await prisma.invoice.findMany({
      where: { businessDate: { gte: startDate, lte: endDate } },
      include: { lines: true },
    });

    const itemsMap = new Map<string, { itemName: string; quantity: number; grossSales: number; discountAllocated: number; netSales: number }>();

    for (const inv of invoices) {
      const invSubtotal = Number(inv.subtotal);
      const invDiscount = Number(inv.discount);

      for (const line of inv.lines) {
        const lineTotal = Number(line.subtotal);
        // Allocate discount in proportion to item value (PRD 22.2.3)
        const allocatedDiscount = invSubtotal > 0 ? (lineTotal / invSubtotal) * invDiscount : 0;
        const lineNet = lineTotal - allocatedDiscount;

        const existing = itemsMap.get(line.itemName) || {
          itemName: line.itemName,
          quantity: 0,
          grossSales: 0,
          discountAllocated: 0,
          netSales: 0,
        };

        existing.quantity += line.quantity;
        existing.grossSales += lineTotal;
        existing.discountAllocated += allocatedDiscount;
        existing.netSales += lineNet;

        itemsMap.set(line.itemName, existing);
      }
    }

    return Array.from(itemsMap.values()).map((item) => ({
      ...item,
      grossSales: Math.round(item.grossSales * 100) / 100,
      discountAllocated: Math.round(item.discountAllocated * 100) / 100,
      netSales: Math.round(item.netSales * 100) / 100,
    })).sort((a, b) => b.netSales - a.netSales);
  }

  /**
   * Sales breakdown by Waiter (PRD 22.2.2)
   */
  async getSalesByWaiter(startDate: string, endDate: string) {
    const invoices = await prisma.invoice.findMany({
      where: { businessDate: { gte: startDate, lte: endDate } },
      include: {
        order: {
          include: { waiter: true },
        },
      },
    });

    const waiterMap = new Map<string, { waiterName: string; ordersCount: number; totalSales: number; totalServiceCharge: number }>();

    for (const inv of invoices) {
      const waiterName = inv.order?.waiter?.name || "Unassigned / Manager";
      const total = Number(inv.total);
      const sc = Number(inv.serviceCharge);

      const existing = waiterMap.get(waiterName) || {
        waiterName,
        ordersCount: 0,
        totalSales: 0,
        totalServiceCharge: 0,
      };

      existing.ordersCount += 1;
      existing.totalSales += total;
      existing.totalServiceCharge += sc;

      waiterMap.set(waiterName, existing);
    }

    return Array.from(waiterMap.values()).map((w) => ({
      ...w,
      totalSales: Math.round(w.totalSales * 100) / 100,
      totalServiceCharge: Math.round(w.totalServiceCharge * 100) / 100,
      averageOrderValue: Math.round((w.totalSales / (w.ordersCount || 1)) * 100) / 100,
    })).sort((a, b) => b.totalSales - a.totalSales);
  }

  /**
   * Item and order cancellations with mandatory reasons (PRD 22.2.2)
   */
  async getCancellations(startDate: string, endDate: string) {
    const cancelledItems = await prisma.ticketItem.findMany({
      where: {
        status: "Cancelled",
        ticket: {
          order: {
            orderDate: { gte: startDate, lte: endDate },
          },
        },
      },
      include: {
        menuItem: true,
        ticket: {
          include: { order: true },
        },
      },
      orderBy: { cancelledAt: "desc" },
    });

    return cancelledItems.map((ci) => ({
      id: ci.id,
      orderNumber: ci.ticket.order.orderNumber,
      orderDate: ci.ticket.order.orderDate,
      itemName: ci.menuItem.name,
      quantity: ci.quantity,
      unitPrice: Number(ci.unitPrice),
      cancellationReason: ci.cancellationReason || "No reason given",
      cancelledAt: ci.cancelledAt?.toISOString() || null,
      cancelledById: ci.cancelledById || "Unknown",
    }));
  }

  /**
   * Helper: converts rows array into valid CSV string
   */
  generateCsv(headers: string[], rows: (string | number)[][]): string {
    const escapeCsv = (val: string | number) => {
      const str = String(val ?? "");
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const lines = [
      headers.map(escapeCsv).join(","),
      ...rows.map((row) => row.map(escapeCsv).join(",")),
    ];

    return lines.join("\r\n");
  }
}

export const reportsService = new ReportsService();
