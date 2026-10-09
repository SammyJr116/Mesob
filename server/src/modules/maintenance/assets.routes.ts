import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { Role } from "@prisma/client";
import { assetsService, AssetError } from "./assets.service.js";
import { authenticate, requireRole } from "../../middleware/rbac.js";

export async function assetsRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authenticate);

  /**
   * GET /api/v1/assets - List assets
   */
  app.get(
    "/",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const query = request.query as any;
      const assets = await assetsService.listAssets(query);
      return reply.send({ assets });
    }
  );

  /**
   * POST /api/v1/assets - Create asset (Manager/Admin)
   */
  app.post(
    "/",
    { preHandler: requireRole(Role.MANAGER, Role.ADMIN) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const asset = await assetsService.createAsset(request.body as any);
        return reply.status(201).send({ asset });
      } catch (err: any) {
        if (err instanceof AssetError) {
          return reply.status(err.statusCode).send({ error: err.message });
        }
        throw err;
      }
    }
  );

  /**
   * PATCH /api/v1/assets/:id - Update asset (Manager/Admin)
   */
  app.patch(
    "/:id",
    { preHandler: requireRole(Role.MANAGER, Role.ADMIN) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      try {
        const asset = await assetsService.updateAsset(id, request.body as any);
        return reply.send({ asset });
      } catch (err: any) {
        if (err instanceof AssetError) {
          return reply.status(err.statusCode).send({ error: err.message });
        }
        throw err;
      }
    }
  );

  /**
   * DELETE /api/v1/assets/:id - Retire asset (PRD 18.1.1: Assets are retired, not deleted)
   */
  app.delete(
    "/:id",
    { preHandler: requireRole(Role.MANAGER, Role.ADMIN) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      try {
        const asset = await assetsService.retireAsset(id);
        return reply.send({ asset, message: "Asset retired successfully" });
      } catch (err: any) {
        if (err instanceof AssetError) {
          return reply.status(err.statusCode).send({ error: err.message });
        }
        throw err;
      }
    }
  );
}
