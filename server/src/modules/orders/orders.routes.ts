import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { ordersService, OrderError } from "./orders.service.js";
import { authenticate, requireRole } from "../../middleware/rbac.js";
import { Role } from "@prisma/client";

const createOrderSchema = z.object({
  type: z.enum(["Dine-in", "Takeaway"]),
  tableId: z.string().optional(),
  tableNumber: z.string().optional(),
  waiterId: z.string().optional(),
  customerPhone: z.string().optional(),
  customerName: z.string().optional(),
  guestCount: z.number().int().positive().optional(),
  notes: z.string().optional(),
  items: z.array(
    z.object({
      menuItemId: z.string(),
      variantId: z.string().optional(),
      quantity: z.number().int().positive(),
      notes: z.string().optional(),
      addons: z.array(z.object({ id: z.string(), name: z.string(), price: z.number() })).optional(),
    })
  ).optional(),
});

const dispatchTicketSchema = z.object({
  items: z.array(
    z.object({
      menuItemId: z.string(),
      variantId: z.string().optional(),
      quantity: z.number().int().positive(),
      notes: z.string().optional(),
      addons: z.array(z.object({ id: z.string(), name: z.string(), price: z.number() })).optional(),
    })
  ),
});

export async function ordersRoutes(app: FastifyInstance) {
  // All order routes require authentication
  app.addHook("preHandler", authenticate);

  /**
   * POST /api/v1/orders
   * Opens an order (Dine-in sets table to Occupied; Takeaway verifies phone)
   */
  app.post("/", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const parsed = createOrderSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: "Validation Error",
          message: parsed.error.issues[0]?.message || "Invalid input",
        });
      }

      const order = await ordersService.createOrder(parsed.data, request.user!);
      return reply.status(201).send({ status: "ok", order });
    } catch (err: any) {
      if (err instanceof OrderError) {
        return reply.status(err.statusCode).send({ error: err.name, message: err.message });
      }
      return reply.status(500).send({ error: "Internal Error", message: err.message });
    }
  });

  /**
   * GET /api/v1/orders
   * Lists orders with filters
   */
  app.get("/", async (request: FastifyRequest<{ Querystring: { date?: string; status?: string; type?: string; waiterId?: string } }>, reply: FastifyReply) => {
    const orders = await ordersService.listOrders(request.query);
    return reply.status(200).send({ status: "ok", orders });
  });

  /**
   * GET /api/v1/orders/:id
   * Retrieves single order by ID
   */
  app.get("/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const order = await ordersService.getOrderById(id);
    if (!order) {
      return reply.status(404).send({ error: "NotFound", message: "Order not found" });
    }
    return reply.status(200).send({ status: "ok", order });
  });

  /**
   * POST /api/v1/orders/:id/tickets
   * Dispatches a new ticket round
   */
  app.post("/:id/tickets", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      const parsed = dispatchTicketSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: "Validation Error",
          message: parsed.error.issues[0]?.message || "Invalid ticket items",
        });
      }

      const ticket = await ordersService.dispatchTicket(id, parsed.data.items, request.user!);
      return reply.status(201).send({ status: "ok", ticket });
    } catch (err: any) {
      if (err instanceof OrderError) {
        return reply.status(err.statusCode).send({ error: err.name, message: err.message });
      }
      return reply.status(500).send({ error: "Internal Error", message: err.message });
    }
  });

  /**
   * POST /api/v1/orders/:id/discount
   * Manager applies discount percentage (PRD 11.2)
   */
  app.post(
    "/:id/discount",
    { preHandler: [requireRole(Role.MANAGER, Role.ADMIN)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id } = request.params as { id: string };
        const { percent, reason } = (request.body || {}) as { percent: number; reason: string };
        const updated = await ordersService.applyDiscount(id, percent, reason, request.user!);
        return reply.status(200).send({ status: "ok", order: updated });
      } catch (err: any) {
        if (err instanceof OrderError) {
          return reply.status(err.statusCode).send({ error: err.name, message: err.message });
        }
        return reply.status(500).send({ error: "Internal Error", message: err.message });
      }
    }
  );

  /**
   * POST /api/v1/orders/:id/move-table
   * Moves order to another Available table (PRD 25.4.1.15)
   */
  app.post("/:id/move-table", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      const { targetTableId } = (request.body || {}) as { targetTableId: string };
      const updated = await ordersService.moveTable(id, targetTableId, request.user!);
      return reply.status(200).send({ status: "ok", order: updated });
    } catch (err: any) {
      if (err instanceof OrderError) {
        return reply.status(err.statusCode).send({ error: err.name, message: err.message });
      }
      return reply.status(500).send({ error: "Internal Error", message: err.message });
    }
  });

  /**
   * POST /api/v1/orders/:id/reassign-waiter
   * Reassigns order owner (Manager only - PRD 9.9.3)
   */
  app.post(
    "/:id/reassign-waiter",
    { preHandler: [requireRole(Role.MANAGER, Role.ADMIN)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id } = request.params as { id: string };
        const { newWaiterId } = (request.body || {}) as { newWaiterId: string };
        const updated = await ordersService.reassignWaiter(id, newWaiterId, request.user!);
        return reply.status(200).send({ status: "ok", order: updated });
      } catch (err: any) {
        if (err instanceof OrderError) {
          return reply.status(err.statusCode).send({ error: err.name, message: err.message });
        }
        return reply.status(500).send({ error: "Internal Error", message: err.message });
      }
    }
  );

  /**
   * POST /api/v1/orders/:id/cancel
   * Cancels entire order (PRD 9.7)
   */
  app.post("/:id/cancel", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      const { reason } = (request.body || {}) as { reason: string };
      const updated = await ordersService.cancelOrder(id, reason, request.user!);
      return reply.status(200).send({ status: "ok", order: updated });
    } catch (err: any) {
      if (err instanceof OrderError) {
        return reply.status(err.statusCode).send({ error: err.name, message: err.message });
      }
      return reply.status(500).send({ error: "Internal Error", message: err.message });
    }
  });

  /**
   * POST /api/v1/orders/items/:id/cancel
   * Cancels an item line with mandatory reason (PRD 9.6)
   */
  app.post("/items/:id/cancel", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      const { reason } = (request.body || {}) as { reason: string };
      const updated = await ordersService.cancelTicketItem(id, reason, request.user!);
      return reply.status(200).send({ status: "ok", item: updated });
    } catch (err: any) {
      if (err instanceof OrderError) {
        return reply.status(err.statusCode).send({ error: err.name, message: err.message });
      }
      return reply.status(500).send({ error: "Internal Error", message: err.message });
    }
  });
}
