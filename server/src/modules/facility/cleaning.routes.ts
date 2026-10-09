import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { Role } from "@prisma/client";
import { cleaningService, CleaningError } from "./cleaning.service.js";
import { authenticate, requireRole } from "../../middleware/rbac.js";

export async function cleaningRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authenticate);

  /**
   * GET /api/v1/cleaning/tasks - List cleaning tasks
   */
  app.get(
    "/tasks",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const query = request.query as { status?: string; area?: string; assignedToId?: string; source?: string };
      const tasks = await cleaningService.listTasks(query);
      return reply.send({ tasks });
    }
  );

  /**
   * POST /api/v1/cleaning/tasks - Create cleaning task (Manager / Admin)
   */
  app.post(
    "/tasks",
    { preHandler: requireRole(Role.MANAGER, Role.ADMIN) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const task = await cleaningService.createTask(request.body as any);
        return reply.status(201).send({ task });
      } catch (err: any) {
        if (err instanceof CleaningError) {
          return reply.status(err.statusCode).send({ error: err.message });
        }
        throw err;
      }
    }
  );

  /**
   * PATCH /api/v1/cleaning/tasks/:id/start - Cleaner starts task (PRD 14.3.2)
   */
  app.patch(
    "/tasks/:id/start",
    { preHandler: requireRole(Role.CLEANER, Role.MANAGER, Role.ADMIN) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const caller = (request as any).user;
      try {
        const task = await cleaningService.startTask(id, caller.employeeId || caller.id);
        return reply.send({ task });
      } catch (err: any) {
        if (err instanceof CleaningError) {
          return reply.status(err.statusCode).send({ error: err.message });
        }
        throw err;
      }
    }
  );

  /**
   * PATCH /api/v1/cleaning/tasks/:id/complete - Cleaner completes task (PRD 14.4.1)
   */
  app.patch(
    "/tasks/:id/complete",
    { preHandler: requireRole(Role.CLEANER, Role.MANAGER, Role.ADMIN) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const caller = (request as any).user;
      const body = request.body as { notes?: string; photoUrl?: string } | undefined;
      try {
        const task = await cleaningService.completeTask(id, caller, body);
        return reply.send({ task });
      } catch (err: any) {
        if (err instanceof CleaningError) {
          return reply.status(err.statusCode).send({ error: err.message });
        }
        throw err;
      }
    }
  );

  /**
   * PATCH /api/v1/cleaning/tasks/:id/reassign - Manager reassigns task (PRD 14.3.3)
   */
  app.patch(
    "/tasks/:id/reassign",
    { preHandler: requireRole(Role.MANAGER, Role.ADMIN) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const { assignedToId } = request.body as { assignedToId: string };
      const caller = (request as any).user;
      try {
        const task = await cleaningService.reassignTask(id, assignedToId, caller);
        return reply.send({ task });
      } catch (err: any) {
        if (err instanceof CleaningError) {
          return reply.status(err.statusCode).send({ error: err.message });
        }
        throw err;
      }
    }
  );

  /**
   * POST /api/v1/cleaning/tables/:tableId/mark-available - Waiter marks table Available (PRD 14.6.2)
   */
  app.post(
    "/tables/:tableId/mark-available",
    { preHandler: requireRole(Role.WAITER, Role.MANAGER, Role.ADMIN) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { tableId } = request.params as { tableId: string };
      const caller = (request as any).user;
      try {
        const table = await cleaningService.markTableAvailable(tableId, caller);
        return reply.send({ table });
      } catch (err: any) {
        if (err instanceof CleaningError) {
          return reply.status(err.statusCode).send({ error: err.message });
        }
        throw err;
      }
    }
  );

  // -------------------------------------------------------------
  // CLEANING TEMPLATES (PRD 14.2.1)
  // -------------------------------------------------------------

  /**
   * GET /api/v1/cleaning/templates - List recurring cleaning templates
   */
  app.get(
    "/templates",
    async (_request: FastifyRequest, reply: FastifyReply) => {
      const templates = await cleaningService.listTemplates();
      return reply.send({ templates });
    }
  );

  /**
   * POST /api/v1/cleaning/templates - Create cleaning template (Manager only)
   */
  app.post(
    "/templates",
    { preHandler: requireRole(Role.MANAGER, Role.ADMIN) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const template = await cleaningService.createTemplate(request.body as any);
        return reply.status(201).send({ template });
      } catch (err: any) {
        if (err instanceof CleaningError) {
          return reply.status(err.statusCode).send({ error: err.message });
        }
        throw err;
      }
    }
  );

  /**
   * PATCH /api/v1/cleaning/templates/:id - Update cleaning template (Manager only)
   */
  app.patch(
    "/templates/:id",
    { preHandler: requireRole(Role.MANAGER, Role.ADMIN) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      try {
        const template = await cleaningService.updateTemplate(id, request.body as any);
        return reply.send({ template });
      } catch (err: any) {
        if (err instanceof CleaningError) {
          return reply.status(err.statusCode).send({ error: err.message });
        }
        throw err;
      }
    }
  );

  /**
   * DELETE /api/v1/cleaning/templates/:id - Delete cleaning template (Manager only)
   */
  app.delete(
    "/templates/:id",
    { preHandler: requireRole(Role.MANAGER, Role.ADMIN) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      try {
        await cleaningService.deleteTemplate(id);
        return reply.send({ success: true, message: "Template deleted" });
      } catch (err: any) {
        if (err instanceof CleaningError) {
          return reply.status(err.statusCode).send({ error: err.message });
        }
        throw err;
      }
    }
  );

  /**
   * POST /api/v1/cleaning/templates/:id/run - Run template on-demand (Manager only)
   */
  app.post(
    "/templates/:id/run",
    { preHandler: requireRole(Role.MANAGER, Role.ADMIN) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      try {
        const task = await cleaningService.runTemplate(id);
        return reply.status(201).send({ task });
      } catch (err: any) {
        if (err instanceof CleaningError) {
          return reply.status(err.statusCode).send({ error: err.message });
        }
        throw err;
      }
    }
  );
}
