import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { Role } from "@prisma/client";
import { maintenanceService, MaintenanceError } from "./maintenance.service.js";
import { authenticate, requireRole } from "../../middleware/rbac.js";

export async function maintenanceRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authenticate);

  /**
   * GET /api/v1/maintenance/requests - List requests (Manager sees all, staff sees own)
   */
  app.get(
    "/requests",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const caller = (request as any).user;
      const query = request.query as any;
      const requests = await maintenanceService.listRequests(caller, query);
      return reply.send({ requests });
    }
  );

  /**
   * POST /api/v1/maintenance/requests - Open to ANY staff via "Report an issue" form (PRD 18.2.1)
   */
  app.post(
    "/requests",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const caller = (request as any).user;
      try {
        const req = await maintenanceService.createRequest(caller, request.body as any);
        return reply.status(201).send({ request: req });
      } catch (err: any) {
        if (err instanceof MaintenanceError) {
          return reply.status(err.statusCode).send({ error: err.message });
        }
        throw err;
      }
    }
  );

  /**
   * PATCH /api/v1/maintenance/requests/:id - Manager assigns/updates request (PRD 18.2.2)
   */
  app.patch(
    "/requests/:id",
    { preHandler: requireRole(Role.MANAGER, Role.ADMIN) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const caller = (request as any).user;
      try {
        const req = await maintenanceService.updateRequest(caller, id, request.body as any);
        return reply.send({ request: req });
      } catch (err: any) {
        if (err instanceof MaintenanceError) {
          return reply.status(err.statusCode).send({ error: err.message });
        }
        throw err;
      }
    }
  );

  /**
   * DELETE /api/v1/maintenance/requests/:id - Manager deletes request (cost === 0 only, PRD 18.7.1)
   */
  app.delete(
    "/requests/:id",
    { preHandler: requireRole(Role.MANAGER, Role.ADMIN) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const caller = (request as any).user;
      try {
        await maintenanceService.deleteRequest(caller, id);
        return reply.send({ success: true });
      } catch (err: any) {
        if (err instanceof MaintenanceError) {
          return reply.status(err.statusCode).send({ error: err.message });
        }
        throw err;
      }
    }
  );

  /**
   * Preventive Maintenance Templates (PRD 18.5)
   */
  app.get(
    "/preventive",
    { preHandler: requireRole(Role.MANAGER, Role.ADMIN) },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      const templates = await maintenanceService.listPreventiveTemplates();
      return reply.send({ templates });
    }
  );

  app.post(
    "/preventive",
    { preHandler: requireRole(Role.MANAGER, Role.ADMIN) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const template = await maintenanceService.createPreventiveTemplate(request.body as any);
        return reply.status(201).send({ template });
      } catch (err: any) {
        if (err instanceof MaintenanceError) {
          return reply.status(err.statusCode).send({ error: err.message });
        }
        throw err;
      }
    }
  );

  app.patch(
    "/preventive/:id",
    { preHandler: requireRole(Role.MANAGER, Role.ADMIN) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const template = await maintenanceService.updatePreventiveTemplate(id, request.body as any);
      return reply.send({ template });
    }
  );

  app.delete(
    "/preventive/:id",
    { preHandler: requireRole(Role.MANAGER, Role.ADMIN) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      await maintenanceService.deletePreventiveTemplate(id);
      return reply.send({ success: true });
    }
  );
}
