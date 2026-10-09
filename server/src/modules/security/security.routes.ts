import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { Role } from "@prisma/client";
import { visitorsService, SecurityError } from "./visitors.service.js";
import { incidentsService } from "./incidents.service.js";
import { lostFoundService } from "./lost-found.service.js";
import { authenticate, requireRole } from "../../middleware/rbac.js";

export async function securityRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authenticate);

  // -------------------------------------------------------------
  // VISITORS (PRD 19.1)
  // -------------------------------------------------------------
  app.get(
    "/visitors",
    { preHandler: requireRole(Role.SECURITY, Role.MANAGER, Role.ADMIN) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const query = request.query as any;
      const visitors = await visitorsService.listVisitors(query);
      return reply.send({ visitors });
    }
  );

  app.post(
    "/visitors",
    { preHandler: requireRole(Role.SECURITY, Role.MANAGER, Role.ADMIN) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const caller = (request as any).user;
      try {
        const visitor = await visitorsService.checkInVisitor(caller, request.body as any);
        return reply.status(201).send({ visitor });
      } catch (err: any) {
        if (err instanceof SecurityError) {
          return reply.status(err.statusCode).send({ error: err.message });
        }
        throw err;
      }
    }
  );

  app.patch(
    "/visitors/:id/checkout",
    { preHandler: requireRole(Role.SECURITY, Role.MANAGER, Role.ADMIN) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      try {
        const visitor = await visitorsService.checkOutVisitor(id);
        return reply.send({ visitor });
      } catch (err: any) {
        if (err instanceof SecurityError) {
          return reply.status(err.statusCode).send({ error: err.message });
        }
        throw err;
      }
    }
  );

  app.delete(
    "/visitors/:id",
    { preHandler: requireRole(Role.MANAGER, Role.ADMIN) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const caller = (request as any).user;
      try {
        await visitorsService.deleteVisitor(caller, id);
        return reply.send({ success: true });
      } catch (err: any) {
        if (err instanceof SecurityError) {
          return reply.status(err.statusCode).send({ error: err.message });
        }
        throw err;
      }
    }
  );

  // -------------------------------------------------------------
  // INCIDENTS (PRD 19.2)
  // -------------------------------------------------------------
  app.get(
    "/incidents",
    { preHandler: requireRole(Role.SECURITY, Role.MANAGER, Role.ADMIN) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const query = request.query as any;
      const incidents = await incidentsService.listIncidents(query);
      return reply.send({ incidents });
    }
  );

  // Any staff member can report an incident (PRD 19.2.1)
  app.post(
    "/incidents",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const caller = (request as any).user;
      try {
        const incident = await incidentsService.reportIncident(caller, request.body as any);
        return reply.status(201).send({ incident });
      } catch (err: any) {
        if (err instanceof SecurityError) {
          return reply.status(err.statusCode).send({ error: err.message });
        }
        throw err;
      }
    }
  );

  app.patch(
    "/incidents/:id/review",
    { preHandler: requireRole(Role.SECURITY, Role.MANAGER, Role.ADMIN) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const caller = (request as any).user;
      try {
        const incident = await incidentsService.reviewIncident(caller, id);
        return reply.send({ incident });
      } catch (err: any) {
        if (err instanceof SecurityError) {
          return reply.status(err.statusCode).send({ error: err.message });
        }
        throw err;
      }
    }
  );

  app.patch(
    "/incidents/:id/resolve",
    { preHandler: requireRole(Role.MANAGER, Role.ADMIN) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const caller = (request as any).user;
      const { resolutionNotes } = (request.body as any) || {};
      try {
        const incident = await incidentsService.resolveIncident(caller, id, resolutionNotes);
        return reply.send({ incident });
      } catch (err: any) {
        if (err instanceof SecurityError) {
          return reply.status(err.statusCode).send({ error: err.message });
        }
        throw err;
      }
    }
  );

  app.delete(
    "/incidents/:id",
    { preHandler: requireRole(Role.SECURITY, Role.MANAGER, Role.ADMIN) },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      return reply.status(403).send({
        error: "Incidents are archive-only and cannot be deleted (PRD 19.2.4)",
      });
    }
  );

  // -------------------------------------------------------------
  // LOST AND FOUND (PRD 19.3)
  // -------------------------------------------------------------
  app.get(
    "/lost-found",
    { preHandler: requireRole(Role.SECURITY, Role.MANAGER, Role.ADMIN) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const query = request.query as any;
      const items = await lostFoundService.listItems(query);
      return reply.send({ items });
    }
  );

  app.post(
    "/lost-found",
    { preHandler: requireRole(Role.SECURITY, Role.MANAGER, Role.ADMIN) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const caller = (request as any).user;
      try {
        const item = await lostFoundService.recordItem(caller, request.body as any);
        return reply.status(201).send({ item });
      } catch (err: any) {
        if (err instanceof SecurityError) {
          return reply.status(err.statusCode).send({ error: err.message });
        }
        throw err;
      }
    }
  );

  app.patch(
    "/lost-found/:id/claim",
    { preHandler: requireRole(Role.SECURITY, Role.MANAGER, Role.ADMIN) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const caller = (request as any).user;
      try {
        const item = await lostFoundService.claimItem(caller, id, request.body as any);
        return reply.send({ item });
      } catch (err: any) {
        if (err instanceof SecurityError) {
          return reply.status(err.statusCode).send({ error: err.message });
        }
        throw err;
      }
    }
  );

  app.delete(
    "/lost-found/:id",
    { preHandler: requireRole(Role.MANAGER, Role.ADMIN) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const caller = (request as any).user;
      try {
        await lostFoundService.deleteItem(caller, id);
        return reply.send({ success: true });
      } catch (err: any) {
        if (err instanceof SecurityError) {
          return reply.status(err.statusCode).send({ error: err.message });
        }
        throw err;
      }
    }
  );
}
