import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { ticketsService, TicketError } from "./tickets.service.js";
import { authenticate } from "../../middleware/rbac.js";

const statusSchema = z.object({
  status: z.enum(["Preparing", "Ready"]),
});

const rejectSchema = z.object({
  reason: z.string().min(1, "Rejection reason is required"),
});

export async function ticketsRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authenticate);

  /**
   * GET /api/v1/tickets/queue
   * Kitchen screen ticket list (PRD 10.1)
   */
  app.get("/queue", async (request: FastifyRequest, reply: FastifyReply) => {
    const queue = await ticketsService.getKitchenQueue();
    return reply.status(200).send({ status: "ok", queue });
  });

  /**
   * PATCH /api/v1/tickets/:id/status
   * Moves ticket Submitted -> Preparing -> Ready (PRD 10.2)
   */
  app.patch("/:id/status", async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const parsed = statusSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: "Validation Error",
          message: parsed.error.issues[0]?.message || "Invalid status",
        });
      }

      const updated = await ticketsService.updateTicketStatus(request.params.id, parsed.data.status, request.user!);
      return reply.status(200).send({ status: "ok", ticket: updated });
    } catch (err: any) {
      if (err instanceof TicketError) {
        return reply.status(err.statusCode).send({ error: err.name, message: err.message });
      }
      return reply.status(500).send({ error: "Internal Error", message: err.message });
    }
  });

  /**
   * POST /api/v1/tickets/:id/serve
   * Waiter or Manager marks ticket Served (PRD 9.5.1, Task 3.2.3)
   */
  app.post("/:id/serve", async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const result = await ticketsService.serveTicket(request.params.id, request.user!);
      return reply.status(200).send({ status: "ok", ...result });
    } catch (err: any) {
      if (err instanceof TicketError) {
        return reply.status(err.statusCode).send({ error: err.name, message: err.message });
      }
      return reply.status(500).send({ error: "Internal Error", message: err.message });
    }
  });

  /**
   * POST /api/v1/tickets/items/:id/reject
   * Kitchen rejects item on Submitted ticket (PRD 9.6.4)
   */
  app.post("/items/:id/reject", async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const parsed = rejectSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: "Validation Error",
          message: parsed.error.issues[0]?.message || "Rejection reason required",
        });
      }

      const updated = await ticketsService.rejectTicketItem(request.params.id, parsed.data.reason, request.user!);
      return reply.status(200).send({ status: "ok", item: updated });
    } catch (err: any) {
      if (err instanceof TicketError) {
        return reply.status(err.statusCode).send({ error: err.name, message: err.message });
      }
      return reply.status(500).send({ error: "Internal Error", message: err.message });
    }
  });
}
