import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { Role } from "@prisma/client";
import { purchasesService, PurchaseError } from "./purchases.service.js";
import { authenticate, requireRole } from "../../middleware/rbac.js";

export async function purchasesRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authenticate);

  /**
   * GET /api/v1/purchases - List purchase orders
   */
  app.get(
    "/",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const query = request.query as { status?: string; supplierId?: string };
      const purchases = await purchasesService.listPurchases(query);
      return reply.send({ purchases });
    }
  );

  /**
   * GET /api/v1/purchases/:id - Retrieve purchase order by ID
   */
  app.get(
    "/:id",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      try {
        const purchase = await purchasesService.getPurchaseById(id);
        return reply.send({ purchase });
      } catch (err: any) {
        if (err instanceof PurchaseError) {
          return reply.status(err.statusCode).send({ error: err.message });
        }
        throw err;
      }
    }
  );

  /**
   * POST /api/v1/purchases - Create purchase request (PRD 16.2.1)
   */
  app.post(
    "/",
    { preHandler: requireRole(Role.MANAGER, Role.INVENTORY, Role.ADMIN) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const caller = (request as any).user;
      try {
        const purchase = await purchasesService.createPurchase(request.body as any, caller);
        return reply.status(201).send({ purchase });
      } catch (err: any) {
        if (err instanceof PurchaseError) {
          return reply.status(err.statusCode).send({ error: err.message });
        }
        throw err;
      }
    }
  );

  /**
   * POST /api/v1/purchases/draft-from-low-stock/:itemId - One-click draft PO from low stock alert (PRD 16.7)
   */
  app.post(
    "/draft-from-low-stock/:itemId",
    { preHandler: requireRole(Role.MANAGER, Role.INVENTORY, Role.ADMIN) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { itemId } = request.params as { itemId: string };
      const caller = (request as any).user;
      try {
        const purchase = await purchasesService.createDraftFromLowStock(itemId, caller);
        return reply.status(201).send({ purchase });
      } catch (err: any) {
        if (err instanceof PurchaseError) {
          return reply.status(err.statusCode).send({ error: err.message });
        }
        throw err;
      }
    }
  );

  /**
   * PATCH /api/v1/purchases/:id/submit - Submit Draft to Pending Approval (PRD 16.2.2)
   */
  app.patch(
    "/:id/submit",
    { preHandler: requireRole(Role.MANAGER, Role.INVENTORY, Role.ADMIN) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      try {
        const purchase = await purchasesService.submitPurchase(id);
        return reply.send({ purchase });
      } catch (err: any) {
        if (err instanceof PurchaseError) {
          return reply.status(err.statusCode).send({ error: err.message });
        }
        throw err;
      }
    }
  );

  /**
   * PATCH /api/v1/purchases/:id/approve - Manager approves purchase request (PRD 16.3.1)
   */
  app.patch(
    "/:id/approve",
    { preHandler: requireRole(Role.MANAGER, Role.ADMIN) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const caller = (request as any).user;
      try {
        const purchase = await purchasesService.approvePurchase(id, caller);
        return reply.send({ purchase });
      } catch (err: any) {
        if (err instanceof PurchaseError) {
          return reply.status(err.statusCode).send({ error: err.message });
        }
        throw err;
      }
    }
  );

  /**
   * PATCH /api/v1/purchases/:id/reject - Manager rejects purchase request (PRD 16.2.2)
   */
  app.patch(
    "/:id/reject",
    { preHandler: requireRole(Role.MANAGER, Role.ADMIN) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const { reason } = (request.body || {}) as { reason: string };
      const caller = (request as any).user;
      try {
        const purchase = await purchasesService.rejectPurchase(id, reason, caller);
        return reply.send({ purchase });
      } catch (err: any) {
        if (err instanceof PurchaseError) {
          return reply.status(err.statusCode).send({ error: err.message });
        }
        throw err;
      }
    }
  );

  /**
   * POST /api/v1/purchases/:id/receive - Receive delivered goods (PRD 16.4)
   */
  app.post(
    "/:id/receive",
    { preHandler: requireRole(Role.MANAGER, Role.INVENTORY, Role.ADMIN) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const caller = (request as any).user;
      try {
        const purchase = await purchasesService.receiveDelivery(id, request.body as any, caller);
        return reply.send({ purchase });
      } catch (err: any) {
        if (err instanceof PurchaseError) {
          return reply.status(err.statusCode).send({ error: err.message });
        }
        throw err;
      }
    }
  );

  /**
   * PATCH /api/v1/purchases/:id/complete - Finalize completed purchase (PRD 16.2.2)
   */
  app.patch(
    "/:id/complete",
    { preHandler: requireRole(Role.MANAGER, Role.INVENTORY, Role.ADMIN) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      try {
        const purchase = await purchasesService.completePurchase(id);
        return reply.send({ purchase });
      } catch (err: any) {
        if (err instanceof PurchaseError) {
          return reply.status(err.statusCode).send({ error: err.message });
        }
        throw err;
      }
    }
  );

  /**
   * PATCH /api/v1/purchases/:id/close - Manager closes purchase short (PRD 16.2.2)
   */
  app.patch(
    "/:id/close",
    { preHandler: requireRole(Role.MANAGER, Role.ADMIN) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const { reason } = (request.body || {}) as { reason: string };
      const caller = (request as any).user;
      try {
        const purchase = await purchasesService.closePurchase(id, reason, caller);
        return reply.send({ purchase });
      } catch (err: any) {
        if (err instanceof PurchaseError) {
          return reply.status(err.statusCode).send({ error: err.message });
        }
        throw err;
      }
    }
  );

  /**
   * POST /api/v1/purchases/emergency - Record emergency purchase (PRD 16.5)
   */
  app.post(
    "/emergency",
    { preHandler: requireRole(Role.MANAGER, Role.INVENTORY, Role.ADMIN) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const caller = (request as any).user;
      try {
        const purchase = await purchasesService.recordEmergencyPurchase(request.body as any, caller);
        return reply.status(201).send({ purchase });
      } catch (err: any) {
        if (err instanceof PurchaseError) {
          return reply.status(err.statusCode).send({ error: err.message });
        }
        throw err;
      }
    }
  );

  /**
   * PATCH /api/v1/purchases/:id/review - Manager reviews emergency purchase (PRD 16.5.2)
   */
  app.patch(
    "/:id/review",
    { preHandler: requireRole(Role.MANAGER, Role.ADMIN) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const caller = (request as any).user;
      try {
        const purchase = await purchasesService.reviewEmergencyPurchase(id, caller);
        return reply.send({ purchase });
      } catch (err: any) {
        if (err instanceof PurchaseError) {
          return reply.status(err.statusCode).send({ error: err.message });
        }
        throw err;
      }
    }
  );
}
