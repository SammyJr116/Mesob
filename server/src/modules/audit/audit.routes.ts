import { FastifyInstance } from "fastify";
import { auditService } from "./audit.service.js";
import { requireRole } from "../../middleware/rbac.js";
import { Role } from "@prisma/client";

export async function auditRoutes(app: FastifyInstance) {
  /**
   * GET /api/v1/activity-logs
   * Query and filter activity logs (Manager only, PRD 4.8.1)
   */
  app.get(
    "/",
    { preHandler: [requireRole(Role.MANAGER)] },
    async (request, reply) => {
      const query = request.query as any;
      const result = await auditService.listLogs(query);
      return reply.send(result);
    }
  );

  /**
   * GET /api/v1/activity-logs/csv
   * Export activity logs as CSV stream (Manager only, PRD 4.8)
   */
  app.get(
    "/csv",
    { preHandler: [requireRole(Role.MANAGER)] },
    async (request, reply) => {
      const query = request.query as any;
      const csv = await auditService.exportCsv(query);

      return reply
        .header("Content-Type", "text/csv")
        .header("Content-Disposition", 'attachment; filename="activity-logs.csv"')
        .send(csv);
    }
  );

  /**
   * DELETE /api/v1/activity-logs/:id
   * Blocked 403: Activity logs are strictly immutable (PRD 4.8.3)
   */
  app.delete(
    "/:id",
    { preHandler: [requireRole(Role.MANAGER)] },
    async (_request, reply) => {
      return reply.status(403).send({
        error: "Forbidden",
        message: "Activity log entries are strictly immutable and cannot be deleted (PRD 4.8.3)",
      });
    }
  );

  /**
   * PATCH /api/v1/activity-logs/:id
   * Blocked 403: Activity logs are strictly immutable (PRD 4.8.3)
   */
  app.patch(
    "/:id",
    { preHandler: [requireRole(Role.MANAGER)] },
    async (_request, reply) => {
      return reply.status(403).send({
        error: "Forbidden",
        message: "Activity log entries are strictly immutable and cannot be edited (PRD 4.8.3)",
      });
    }
  );
}
