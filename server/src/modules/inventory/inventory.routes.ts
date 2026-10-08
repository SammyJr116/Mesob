import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { Role } from "@prisma/client";
import { inventoryService, InventoryError } from "./inventory.service.js";
import { authenticate, requireRole } from "../../middleware/rbac.js";

export async function inventoryRoutes(app: FastifyInstance) {
  // All inventory routes require authentication
  app.addHook("preHandler", authenticate);

  /**
   * GET /api/v1/inventory/items - List inventory items
   */
  app.get(
    "/items",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const query = request.query as { category?: string; lowStock?: string; search?: string };
      const items = await inventoryService.getInventoryItems({
        category: query.category,
        lowStock: query.lowStock === "true",
        search: query.search,
      });
      return reply.send({ items });
    }
  );

  /**
   * GET /api/v1/inventory/items/:id - Retrieve item by ID
   */
  app.get(
    "/items/:id",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      try {
        const item = await inventoryService.getInventoryItemById(id);
        return reply.send({ item });
      } catch (err: any) {
        if (err instanceof InventoryError) {
          return reply.status(err.statusCode).send({ error: err.message });
        }
        throw err;
      }
    }
  );

  /**
   * POST /api/v1/inventory/items - Create inventory item
   */
  app.post(
    "/items",
    { preHandler: requireRole(Role.MANAGER, Role.INVENTORY, Role.ADMIN) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const caller = (request as any).user;
      try {
        const item = await inventoryService.createInventoryItem(request.body as any, caller);
        return reply.status(201).send({ item });
      } catch (err: any) {
        if (err instanceof InventoryError) {
          return reply.status(err.statusCode).send({ error: err.message });
        }
        throw err;
      }
    }
  );

  /**
   * PATCH /api/v1/inventory/items/:id - Update inventory item
   */
  app.patch(
    "/items/:id",
    { preHandler: requireRole(Role.MANAGER, Role.INVENTORY, Role.ADMIN) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const caller = (request as any).user;
      try {
        const item = await inventoryService.updateInventoryItem(id, request.body as any, caller);
        return reply.send({ item });
      } catch (err: any) {
        if (err instanceof InventoryError) {
          return reply.status(err.statusCode).send({ error: err.message });
        }
        throw err;
      }
    }
  );

  /**
   * POST /api/v1/inventory/adjust - Manual stock adjustment (PRD 15.4.3, PRD 4.11.12)
   */
  app.post(
    "/adjust",
    { preHandler: requireRole(Role.MANAGER, Role.INVENTORY, Role.ADMIN) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const caller = (request as any).user;
      try {
        const result = await inventoryService.adjustStock(request.body as any, caller);
        return reply.send(result);
      } catch (err: any) {
        if (err instanceof InventoryError) {
          return reply.status(err.statusCode).send({ error: err.message });
        }
        throw err;
      }
    }
  );

  /**
   * POST /api/v1/inventory/waste - Record waste (PRD 15.7)
   */
  app.post(
    "/waste",
    { preHandler: requireRole(Role.MANAGER, Role.INVENTORY, Role.ADMIN) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const caller = (request as any).user;
      try {
        const result = await inventoryService.recordWaste(request.body as any, caller);
        return reply.status(201).send(result);
      } catch (err: any) {
        if (err instanceof InventoryError) {
          return reply.status(err.statusCode).send({ error: err.message });
        }
        throw err;
      }
    }
  );

  /**
   * GET /api/v1/inventory/movements - Stock movements history (PRD 15.4)
   */
  app.get(
    "/movements",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const query = request.query as { itemId?: string; type?: string; limit?: string };
      const movements = await inventoryService.getStockMovements({
        itemId: query.itemId,
        type: query.type,
        limit: query.limit ? parseInt(query.limit, 10) : undefined,
      });
      return reply.send({ movements });
    }
  );

  /**
   * GET /api/v1/inventory/low-stock - List items at or below minimum stock (PRD 15.8.1)
   */
  app.get(
    "/low-stock",
    async (_request: FastifyRequest, reply: FastifyReply) => {
      const items = await inventoryService.getInventoryItems({ lowStock: true });
      return reply.send({ lowStockItems: items });
    }
  );

  /**
   * GET /api/v1/inventory/readiness - Readiness checklist for tracking switch (PRD 15.1.3)
   */
  app.get(
    "/readiness",
    async (_request: FastifyRequest, reply: FastifyReply) => {
      const checklist = await inventoryService.getReadinessChecklist();
      return reply.send(checklist);
    }
  );

  /**
   * POST /api/v1/inventory/toggle-tracking - Toggle inventory tracking (PRD 15.1)
   */
  app.post(
    "/toggle-tracking",
    { preHandler: requireRole(Role.MANAGER, Role.ADMIN) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { enabled } = (request.body || {}) as { enabled: boolean };
      const caller = (request as any).user;
      try {
        const setting = await inventoryService.toggleInventoryTracking(Boolean(enabled), caller);
        return reply.send({ setting });
      } catch (err: any) {
        if (err instanceof InventoryError) {
          return reply.status(err.statusCode).send({ error: err.message, details: err.details });
        }
        throw err;
      }
    }
  );
}
