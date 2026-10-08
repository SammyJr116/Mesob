import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { Role } from "@prisma/client";
import { reservationsService, ReservationError } from "./reservations.service.js";
import { authenticate, requireRole } from "../../middleware/rbac.js";

export async function reservationsRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authenticate);

  /**
   * GET /api/v1/reservations - List reservations
   */
  app.get(
    "/",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const query = request.query as { date?: string; status?: string; phone?: string };
      const reservations = await reservationsService.listReservations(query);
      return reply.send({ reservations });
    }
  );

  /**
   * GET /api/v1/reservations/:id - Retrieve reservation by ID
   */
  app.get(
    "/:id",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      try {
        const reservation = await reservationsService.getReservationById(id);
        return reply.send({ reservation });
      } catch (err: any) {
        if (err instanceof ReservationError) {
          return reply.status(err.statusCode).send({ error: err.message });
        }
        throw err;
      }
    }
  );

  /**
   * POST /api/v1/reservations - Create reservation (Manager and Waiter, PRD 13.1.3)
   */
  app.post(
    "/",
    { preHandler: requireRole(Role.MANAGER, Role.WAITER, Role.ADMIN) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const caller = (request as any).user;
      try {
        const reservation = await reservationsService.createReservation(request.body as any, caller);
        return reply.status(201).send({ reservation });
      } catch (err: any) {
        if (err instanceof ReservationError) {
          return reply.status(err.statusCode).send({ error: err.message });
        }
        throw err;
      }
    }
  );

  /**
   * PATCH /api/v1/reservations/:id/status - Update reservation status
   */
  app.patch(
    "/:id/status",
    { preHandler: requireRole(Role.MANAGER, Role.WAITER, Role.ADMIN) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const { status, overrideReason } = (request.body || {}) as { status: any; overrideReason?: string };
      const caller = (request as any).user;
      try {
        const reservation = await reservationsService.updateReservationStatus(id, status, caller, overrideReason);
        return reply.send({ reservation });
      } catch (err: any) {
        if (err instanceof ReservationError) {
          return reply.status(err.statusCode).send({ error: err.message });
        }
        throw err;
      }
    }
  );
}
