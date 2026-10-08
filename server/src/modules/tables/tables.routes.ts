import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { authenticate } from "../../middleware/rbac.js";
import { emitTableUpdated } from "../../ws/gateway.js";
import { ordersService } from "../orders/orders.service.js";

const updateStatusSchema = z.object({
  status: z.enum(["Available", "Occupied", "Reserved", "Cleaning"]),
});

const mergeSchema = z.object({
  secondaryTableId: z.string(),
});

const transferSchema = z.object({
  toTableId: z.string(),
});

export async function tablesRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authenticate);

  /**
   * GET /api/v1/tables
   * Returns list of all tables with open orders and cleaning status
   */
  app.get("/", async (_request: FastifyRequest, reply: FastifyReply) => {
    const tables = await prisma.table.findMany({
      orderBy: { number: "asc" },
      include: {
        orders: {
          include: {
            order: {
              select: {
                id: true,
                orderNumber: true,
                status: true,
                type: true,
                waiter: { select: { id: true, name: true } },
                total: true,
                createdAt: true,
              },
            },
          },
        },
        cleaningTasks: {
          where: { status: { in: ["Pending", "In Progress"] } },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    return reply.status(200).send({
      status: "ok",
      tables: (tables as any[]).map((t: any) => ({
        id: t.id,
        number: t.number,
        seats: t.seats,
        section: t.section,
        status: t.status,
        mergedIntoTableId: t.mergedIntoTableId,
        activeOrder: t.orders?.find((o: any) => ["Open", "In Progress", "Billed"].includes(o.order?.status))?.order || null,
        activeCleaningTask: t.cleaningTasks?.[0] || null,
      })),
    });
  });

  /**
   * GET /api/v1/tables/:id
   */
  app.get("/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const table = await prisma.table.findUnique({
      where: { id },
      include: {
        orders: {
          include: {
            order: true,
          },
        },
        cleaningTasks: true,
      },
    });

    if (!table) {
      return reply.status(404).send({ error: "NotFound", message: "Table not found" });
    }

    return reply.status(200).send({ status: "ok", table });
  });

  /**
   * PATCH /api/v1/tables/:id/status
   */
  app.patch("/:id/status", async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const parsed = updateStatusSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Validation Error", message: "Invalid status value" });
    }

    const updated = await prisma.table.update({
      where: { id },
      data: { status: parsed.data.status },
    });

    emitTableUpdated(updated);
    return reply.status(200).send({ status: "ok", table: updated });
  });

  /**
   * POST /api/v1/tables/:id/merge
   * PRD 8.3.1: Table Merging
   */
  app.post("/:id/merge", async (request: FastifyRequest, reply: FastifyReply) => {
    const { id: primaryId } = request.params as { id: string };
    const parsed = mergeSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Validation Error", message: "secondaryTableId required" });
    }

    const { secondaryTableId } = parsed.data;

    // Both must exist and be available or open
    const [primary, secondary] = await Promise.all([
      prisma.table.findUnique({ where: { id: primaryId } }),
      prisma.table.findUnique({ where: { id: secondaryTableId } }),
    ]);

    if (!primary || !secondary) {
      return reply.status(404).send({ error: "NotFound", message: "One or both tables not found" });
    }

    // Mark secondary as merged into primary
    const updatedSecondary = await prisma.table.update({
      where: { id: secondaryTableId },
      data: { mergedIntoTableId: primaryId, status: primary.status },
    });

    emitTableUpdated(primary);
    emitTableUpdated(updatedSecondary);

    return reply.status(200).send({
      status: "ok",
      primary,
      secondary: updatedSecondary,
      combinedSeats: primary.seats + secondary.seats,
    });
  });

  /**
   * POST /api/v1/tables/:id/transfer
   * Transfer order from this table to another table (PRD 8.3.2)
   */
  app.post("/:id/transfer", async (request: FastifyRequest, reply: FastifyReply) => {
    const { id: fromTableId } = request.params as { id: string };
    const parsed = transferSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Validation Error", message: "toTableId required" });
    }

    // Find active order on fromTable
    const activeOrderTable = await prisma.orderTable.findFirst({
      where: {
        tableId: fromTableId,
        order: { status: { in: ["Open", "In Progress", "Billed"] } },
      },
    });

    if (!activeOrderTable) {
      return reply.status(400).send({ error: "BadRequest", message: "No active order on origin table" });
    }

    const movedOrder = await ordersService.moveTable(activeOrderTable.orderId, parsed.data.toTableId, request.user!);
    return reply.status(200).send({ status: "ok", order: movedOrder });
  });
}
