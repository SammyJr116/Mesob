import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { authenticate } from "../../middleware/rbac.js";
import { emitItemAutoAvailable, emitItemAutoUnavailable } from "../../ws/gateway.js";

const toggleAvailabilitySchema = z.object({
  manualAvailable: z.boolean(),
  reason: z.string().optional(),
});

export async function menuRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authenticate);

  /**
   * GET /api/v1/menu/categories
   */
  app.get("/categories", async (_request: FastifyRequest, reply: FastifyReply) => {
    const categories = await prisma.menuCategory.findMany({
      orderBy: { orderIndex: "asc" },
      include: {
        _count: { select: { items: true } },
      },
    });
    return reply.status(200).send({ status: "ok", categories });
  });

  /**
   * GET /api/v1/menu/items
   */
  app.get("/items", async (request: FastifyRequest<{ Querystring: { categoryId?: string; activeOnly?: string } }>, reply: FastifyReply) => {
    const { categoryId, activeOnly } = request.query;
    const where: any = {};
    if (categoryId) where.categoryId = categoryId;
    if (activeOnly === "true") where.status = "Active";

    const items = await prisma.menuItem.findMany({
      where,
      orderBy: { name: "asc" },
      include: {
        category: true,
        variants: true,
        addons: {
          include: { addon: true },
        },
        recipe: {
          include: {
            lines: {
              include: { inventoryItem: true },
            },
          },
        },
      },
    });

    return reply.status(200).send({ status: "ok", items });
  });

  /**
   * GET /api/v1/menu/items/:id
   */
  app.get("/items/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const item = await prisma.menuItem.findUnique({
      where: { id },
      include: {
        category: true,
        variants: true,
        addons: {
          include: { addon: true },
        },
        recipe: {
          include: {
            lines: {
              include: { inventoryItem: true },
            },
          },
        },
      },
    });

    if (!item) {
      return reply.status(404).send({ error: "NotFound", message: "Menu item not found" });
    }

    return reply.status(200).send({ status: "ok", item });
  });

  /**
   * PATCH /api/v1/menu/items/:id/availability
   * PRD 7.7.2: Manual item 86ing / availability toggle
   */
  app.patch("/items/:id/availability", async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const parsed = toggleAvailabilitySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Validation Error", message: "manualAvailable boolean is required" });
    }

    const { manualAvailable, reason } = parsed.data;

    const updated = await prisma.menuItem.update({
      where: { id },
      data: { manualAvailable },
      include: { category: true },
    });

    // Activity Log
    await prisma.activityLog.create({
      data: {
        userId: request.user?.id,
        role: request.user?.role || "SYSTEM",
        action: manualAvailable ? "MENU_ITEM_RESTORED" : "MENU_ITEM_86ED",
        target: "MenuItem",
        targetId: id,
        reason: reason || undefined,
      },
    });

    // Broadcast WebSocket event
    if (!manualAvailable) {
      emitItemAutoUnavailable(updated);
    } else {
      emitItemAutoAvailable(updated);
    }

    return reply.status(200).send({ status: "ok", item: updated });
  });
}
