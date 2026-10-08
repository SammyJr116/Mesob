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
      const query = request.query as { status?: string; area?: string; assignedToId?: string };
      const tasks = await cleaningService.listTasks(query);
      return reply.send({ tasks });
    }
  );

  /**
   * POST /api/v1/cleaning/tasks - Create cleaning task
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
      try {
        const task = await cleaningService.completeTask(id, caller);
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
}
