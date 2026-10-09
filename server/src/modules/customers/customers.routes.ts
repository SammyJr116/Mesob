import { FastifyInstance } from "fastify";
import { z } from "zod";
import { customersService, CustomerError } from "./customers.service.js";
import { requireRole } from "../../middleware/rbac.js";
import { Role } from "@prisma/client";

const createCustomerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().min(3, "Phone number is required"),
  email: z.string().email().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
});

const updateCustomerSchema = z.object({
  name: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  notes: z.string().optional(),
});

const mergeCustomersSchema = z.object({
  sourceCustomerId: z.string().min(1, "sourceCustomerId is required"),
  targetCustomerId: z.string().min(1, "targetCustomerId is required"),
});

export async function customersRoutes(app: FastifyInstance) {
  /**
   * GET /api/v1/customers/lookup
   * Fast auto-complete lookup by phone prefix or name (Waiter, Manager, Admin)
   */
  app.get(
    "/lookup",
    { preHandler: [requireRole(Role.WAITER, Role.MANAGER, Role.ADMIN)] },
    async (request, reply) => {
      const { phone, query } = request.query as { phone?: string; query?: string };
      const search = phone || query || "";
      const matches = await customersService.lookup(search);
      return reply.send({ matches });
    }
  );

  /**
   * GET /api/v1/customers
   * List customers with aggregated spend & visit history (Waiter, Manager, Admin)
   */
  app.get(
    "/",
    { preHandler: [requireRole(Role.WAITER, Role.MANAGER, Role.ADMIN)] },
    async (request, reply) => {
      const query = request.query as any;
      const customers = await customersService.listCustomers(query);
      return reply.send({ customers });
    }
  );

  /**
   * GET /api/v1/customers/:id
   * Detailed customer profile with past order & reservation history
   */
  app.get(
    "/:id",
    { preHandler: [requireRole(Role.WAITER, Role.MANAGER, Role.ADMIN)] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const customer = await customersService.getCustomerById(id);
        return reply.send({ customer });
      } catch (err: any) {
        if (err instanceof CustomerError) {
          return reply.status(err.statusCode).send({ error: err.message });
        }
        throw err;
      }
    }
  );

  /**
   * POST /api/v1/customers
   * Create or auto-match customer (Waiter, Manager, Admin)
   */
  app.post(
    "/",
    { preHandler: [requireRole(Role.WAITER, Role.MANAGER, Role.ADMIN)] },
    async (request, reply) => {
      try {
        const parsed = createCustomerSchema.safeParse(request.body);
        if (!parsed.success) {
          return reply.status(400).send({
            error: "Validation Error",
            message: parsed.error.issues[0]?.message || "Invalid input",
          });
        }

        const customer = await customersService.createCustomer(parsed.data);
        return reply.status(201).send({ customer });
      } catch (err: any) {
        if (err instanceof CustomerError) {
          return reply.status(err.statusCode).send({ error: err.message });
        }
        throw err;
      }
    }
  );

  /**
   * PATCH /api/v1/customers/:id
   * Update customer profile or notes
   */
  app.patch(
    "/:id",
    { preHandler: [requireRole(Role.WAITER, Role.MANAGER, Role.ADMIN)] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const parsed = updateCustomerSchema.safeParse(request.body);
        if (!parsed.success) {
          return reply.status(400).send({
            error: "Validation Error",
            message: parsed.error.issues[0]?.message || "Invalid input",
          });
        }

        const customer = await customersService.updateCustomer(id, parsed.data);
        return reply.send({ customer });
      } catch (err: any) {
        if (err instanceof CustomerError) {
          return reply.status(err.statusCode).send({ error: err.message });
        }
        throw err;
      }
    }
  );

  /**
   * POST /api/v1/customers/merge
   * Merge customer profiles transaction (Manager only, PRD 12.4)
   */
  app.post(
    "/merge",
    { preHandler: [requireRole(Role.MANAGER)] },
    async (request, reply) => {
      try {
        const parsed = mergeCustomersSchema.safeParse(request.body);
        if (!parsed.success) {
          return reply.status(400).send({
            error: "Validation Error",
            message: parsed.error.issues[0]?.message || "Invalid input",
          });
        }

        const caller = request.user as { id: string; role: Role };
        const merged = await customersService.mergeCustomers(
          parsed.data.sourceCustomerId,
          parsed.data.targetCustomerId,
          caller.id
        );

        return reply.send({
          status: "ok",
          message: "Customer profiles merged successfully",
          customer: merged,
        });
      } catch (err: any) {
        if (err instanceof CustomerError) {
          return reply.status(err.statusCode).send({ error: err.message });
        }
        throw err;
      }
    }
  );

  /**
   * DELETE /api/v1/customers/:id
   * Customer deletion blocked (PRD 12.4.1: archive-only)
   */
  app.delete(
    "/:id",
    { preHandler: [requireRole(Role.MANAGER)] },
    async (_request, reply) => {
      return reply.status(403).send({
        error: "Forbidden",
        message: "Customer records are archive-only and cannot be deleted (PRD 12.4.1, 4.6.3)",
      });
    }
  );
}
