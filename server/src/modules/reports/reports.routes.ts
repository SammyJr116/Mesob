import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { Role } from "@prisma/client";
import { reportsService } from "./reports.service.js";
import { dayCloseJob, DayCloseError } from "../../scheduler/day-close.job.js";
import { authenticate, requireRole } from "../../middleware/rbac.js";
import { prisma } from "../../lib/prisma.js";

export async function reportsRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authenticate);
  // All reporting routes restricted strictly to Manager and Admin (PRD 22.1.1)
  app.addHook("preHandler", requireRole(Role.MANAGER, Role.ADMIN));

  /**
   * Helper to parse date range params defaulting to current business date
   */
  async function getDateRange(query: { startDate?: string; endDate?: string }) {
    const settings = await prisma.setting.findUnique({ where: { id: "singleton" } });
    const today = settings?.currentBusinessDate || new Date().toISOString().slice(0, 10);
    return {
      startDate: query.startDate || today,
      endDate: query.endDate || today,
    };
  }

  /**
   * GET /api/v1/reports/sales-summary - Financial Sales Summary (PRD 22.2.1)
   */
  app.get(
    "/sales-summary",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { startDate, endDate } = await getDateRange(request.query as any);
      const summary = await reportsService.getSalesSummary(startDate, endDate);
      return reply.send(summary);
    }
  );

  /**
   * GET /api/v1/reports/sales-by-item - Item Sales Breakdown (PRD 22.2.2)
   */
  app.get(
    "/sales-by-item",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { startDate, endDate } = await getDateRange(request.query as any);
      const items = await reportsService.getSalesByItem(startDate, endDate);
      return reply.send({ items });
    }
  );

  /**
   * GET /api/v1/reports/sales-by-waiter - Waiter Performance (PRD 22.2.2)
   */
  app.get(
    "/sales-by-waiter",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { startDate, endDate } = await getDateRange(request.query as any);
      const waiters = await reportsService.getSalesByWaiter(startDate, endDate);
      return reply.send({ waiters });
    }
  );

  /**
   * GET /api/v1/reports/cancellations - Item and Order Cancellations (PRD 22.2.2)
   */
  app.get(
    "/cancellations",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { startDate, endDate } = await getDateRange(request.query as any);
      const cancellations = await reportsService.getCancellations(startDate, endDate);
      return reply.send({ cancellations });
    }
  );

  /**
   * GET /api/v1/reports/export/:type - Stream CSV Report (PRD 22.1.2)
   */
  app.get(
    "/export/:type",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { type } = request.params as { type: string };
      const { startDate, endDate } = await getDateRange(request.query as any);

      let csvContent = "";
      const filename = `${type}_${startDate}_${endDate}.csv`;

      if (type === "sales-summary") {
        const summary = await reportsService.getSalesSummary(startDate, endDate);
        const headers = ["Metric", "Value"];
        const rows = [
          ["Start Date", summary.period.startDate],
          ["End Date", summary.period.endDate],
          ["Completed Orders", summary.completedOrdersCount],
          ["Cancelled Orders", summary.cancelledOrdersCount],
          ["Subtotal (ETB)", summary.subtotal],
          ["Discounts Total (ETB)", summary.discounts],
          ["Service Charge Total (ETB)", summary.serviceCharge],
          ["Tax Collected (ETB)", summary.taxCollected],
          ["Net Sales (ETB)", summary.netSales],
          ["Total Collected (ETB)", summary.totalCollected],
          ["Credit Notes Count", summary.creditNotes.count],
          ["Credit Notes Total (ETB)", summary.creditNotes.totalAmount],
        ];
        csvContent = reportsService.generateCsv(headers, rows);
      } else if (type === "sales-by-item") {
        const items = await reportsService.getSalesByItem(startDate, endDate);
        const headers = ["Item Name", "Quantity Sold", "Gross Sales", "Allocated Discount", "Net Sales"];
        const rows = items.map((i) => [
          i.itemName,
          i.quantity,
          i.grossSales,
          i.discountAllocated,
          i.netSales,
        ]);
        csvContent = reportsService.generateCsv(headers, rows);
      } else if (type === "sales-by-waiter") {
        const waiters = await reportsService.getSalesByWaiter(startDate, endDate);
        const headers = ["Waiter", "Orders Count", "Total Sales", "Service Charge", "Average Order Value"];
        const rows = waiters.map((w) => [
          w.waiterName,
          w.ordersCount,
          w.totalSales,
          w.totalServiceCharge,
          w.averageOrderValue,
        ]);
        csvContent = reportsService.generateCsv(headers, rows);
      } else if (type === "cancellations") {
        const cancellations = await reportsService.getCancellations(startDate, endDate);
        const headers = ["Order #", "Order Date", "Item Name", "Quantity", "Price", "Reason", "Cancelled At"];
        const rows = cancellations.map((c) => [
          c.orderNumber,
          c.orderDate,
          c.itemName,
          c.quantity,
          c.unitPrice,
          c.cancellationReason,
          c.cancelledAt || "",
        ]);
        csvContent = reportsService.generateCsv(headers, rows);
      } else {
        return reply.status(400).send({ error: `Unsupported export report type "${type}"` });
      }

      reply.header("Content-Type", "text/csv");
      reply.header("Content-Disposition", `attachment; filename="${filename}"`);
      return reply.send(csvContent);
    }
  );

  /**
   * GET /api/v1/reports/day-closure/:date - End-of-Day Summary Snapshot (PRD 22.6)
   */
  app.get(
    "/day-closure/:date",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { date } = request.params as { date: string };
      const closure = await prisma.dayClosure.findUnique({ where: { businessDate: date } });
      if (!closure) {
        return reply.status(404).send({ error: `No closure record found for date ${date}` });
      }
      return reply.send({
        closure: {
          ...closure,
          summary: JSON.parse(closure.summaryJson),
        },
      });
    }
  );

  /**
   * POST /api/v1/reports/day-closure/close - Manual business day close (PRD 4.1.5, 22.6)
   */
  app.post(
    "/day-closure/close",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const caller = (request as any).user;
      const { reason } = (request.body || {}) as { reason?: string };
      try {
        const result = await dayCloseJob.executeDayClose({
          callerId: caller.id,
          callerRole: caller.role,
          isManual: true,
          reason,
        });
        return reply.send(result);
      } catch (err: any) {
        if (err instanceof DayCloseError) {
          return reply.status(err.statusCode).send({ error: err.message });
        }
        throw err;
      }
    }
  );

  /**
   * POST /api/v1/reports/day-closure/reopen - Reopen business day (PRD 4.1.7)
   */
  app.post(
    "/day-closure/reopen",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const caller = (request as any).user;
      const { reason } = (request.body || {}) as { reason: string };
      try {
        const reopened = await dayCloseJob.reopenDay(reason, caller);
        return reply.send({ reopened });
      } catch (err: any) {
        if (err instanceof DayCloseError) {
          return reply.status(err.statusCode).send({ error: err.message });
        }
        throw err;
      }
    }
  );
}
