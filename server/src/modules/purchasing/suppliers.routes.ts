import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { Role } from "@prisma/client";
import { purchasesService, PurchaseError } from "./purchases.service.js";
import { authenticate, requireRole } from "../../middleware/rbac.js";

export async function suppliersRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authenticate);

  /**
   * GET /api/v1/purchasing/suppliers - List all active suppliers
   */
  app.get(
    "/suppliers",
    async (_request: FastifyRequest, reply: FastifyReply) => {
      const suppliers = await purchasesService.listSuppliers();
      return reply.send({ suppliers });
    }
  );

  /**
   * GET /api/v1/purchasing/suppliers/:id - Retrieve supplier by ID
   */
  app.get(
    "/suppliers/:id",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      try {
        const supplier = await purchasesService.getSupplierById(id);
        return reply.send({ supplier });
      } catch (err: any) {
        if (err instanceof PurchaseError) {
          return reply.status(err.statusCode).send({ error: err.message });
        }
        throw err;
      }
    }
  );

  /**
   * POST /api/v1/purchasing/suppliers - Create supplier
   */
  app.post(
    "/suppliers",
    { preHandler: requireRole(Role.MANAGER, Role.INVENTORY, Role.ADMIN) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const supplier = await purchasesService.createSupplier(request.body as any);
        return reply.status(201).send({ supplier });
      } catch (err: any) {
        if (err instanceof PurchaseError) {
          return reply.status(err.statusCode).send({ error: err.message });
        }
        throw err;
      }
    }
  );

  /**
   * PATCH /api/v1/purchasing/suppliers/:id - Update supplier
   */
  app.patch(
    "/suppliers/:id",
    { preHandler: requireRole(Role.MANAGER, Role.INVENTORY, Role.ADMIN) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      try {
        const supplier = await purchasesService.updateSupplier(id, request.body as any);
        return reply.send({ supplier });
      } catch (err: any) {
        if (err instanceof PurchaseError) {
          return reply.status(err.statusCode).send({ error: err.message });
        }
        throw err;
      }
    }
  );
}
