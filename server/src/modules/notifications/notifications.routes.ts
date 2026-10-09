import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { Role } from "@prisma/client";
import { notificationsService, NotificationError } from "./notifications.service.js";
import { authenticate, requireRole } from "../../middleware/rbac.js";

export async function notificationsRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authenticate);

  /**
   * GET /api/v1/notifications - List notifications for caller
   */
  app.get(
    "/",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const caller = (request as any).user;
      const query = request.query as { unreadOnly?: string };
      const unreadOnly = query.unreadOnly === "true";

      const data = await notificationsService.listNotifications(caller, unreadOnly);
      return reply.send(data);
    }
  );

  /**
   * PATCH /api/v1/notifications/:id/read - Mark notification as read
   */
  app.patch(
    "/:id/read",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const caller = (request as any).user;
      try {
        const notification = await notificationsService.markAsRead(id, caller);
        return reply.send({ notification });
      } catch (err: any) {
        if (err instanceof NotificationError) {
          return reply.status(err.statusCode).send({ error: err.message });
        }
        return reply.status(400).send({ error: err.message });
      }
    }
  );

  /**
   * POST /api/v1/notifications/read-all - Mark all caller notifications as read
   */
  app.post(
    "/read-all",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const caller = (request as any).user;
      const result = await notificationsService.markAllAsRead(caller);
      return reply.send({ success: true, count: result.count });
    }
  );

  /**
   * POST /api/v1/notifications - Create notification (Manager / Admin)
   */
  app.post(
    "/",
    { preHandler: requireRole(Role.MANAGER, Role.ADMIN) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = request.body as any;
      const notification = await notificationsService.createNotification(body);
      return reply.status(201).send({ notification });
    }
  );

  /**
   * POST /api/v1/notifications/cleanup - Retention cleanup (Manager only)
   */
  app.post(
    "/cleanup",
    { preHandler: requireRole(Role.MANAGER, Role.ADMIN) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const query = request.query as { days?: string };
      const days = query.days ? parseInt(query.days, 10) : 30;
      const deletedCount = await notificationsService.cleanupOldNotifications(days);
      return reply.send({ success: true, deletedCount });
    }
  );
}
