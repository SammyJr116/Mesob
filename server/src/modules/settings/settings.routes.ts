import { FastifyInstance } from "fastify";
import { z } from "zod";
import { settingsService, SettingsError } from "./settings.service.js";
import { requireRole } from "../../middleware/rbac.js";
import { Role } from "@prisma/client";

const updateSettingsSchema = z.object({
  restaurantName: z.string().optional(),
  tin: z.string().optional(),
  vatRate: z.number().min(0).max(100).optional(),
  serviceChargeRate: z.number().min(0).max(100).optional(),
  closingTime: z.string().regex(/^\d{2}:\d{2}$/, "Format HH:mm").optional(),
  delayedTicketMinutes: z.number().min(1).optional(),
  lowStockThreshold: z.number().min(0).optional(),
  inventoryTracking: z.boolean().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  invoiceFooter: z.string().optional(),
});

const createPaymentMethodSchema = z.object({
  name: z.string().min(1, "Name is required"),
  referenceRequired: z.boolean().optional(),
});

const updatePaymentMethodSchema = z.object({
  referenceRequired: z.boolean().optional(),
  isActive: z.boolean().optional(),
  orderIndex: z.number().optional(),
});

export async function settingsRoutes(app: FastifyInstance) {
  /**
   * GET /api/v1/settings
   * Retrieve restaurant settings (Manager only, PRD 5.1.1)
   */
  app.get(
    "/",
    { preHandler: [requireRole(Role.MANAGER)] },
    async (_request, reply) => {
      const settings = await settingsService.getSettings();
      return reply.send({ settings });
    }
  );

  /**
   * PATCH /api/v1/settings
   * Update restaurant settings (Manager only, PRD 5.1.1)
   */
  app.patch(
    "/",
    { preHandler: [requireRole(Role.MANAGER)] },
    async (request, reply) => {
      try {
        const parsed = updateSettingsSchema.safeParse(request.body);
        if (!parsed.success) {
          return reply.status(400).send({
            error: "Validation Error",
            message: parsed.error.issues[0]?.message || "Invalid input",
          });
        }

        const caller = request.user as { id: string; role: Role };
        const settings = await settingsService.updateSettings(parsed.data, caller.id);
        return reply.send({ status: "ok", settings });
      } catch (err: any) {
        if (err instanceof SettingsError) {
          return reply.status(err.statusCode).send({ error: err.message });
        }
        throw err;
      }
    }
  );

  /**
   * GET /api/v1/settings/payment-methods
   * List configured payment methods (Manager and Waiter for billing)
   */
  app.get(
    "/payment-methods",
    { preHandler: [requireRole(Role.MANAGER, Role.WAITER)] },
    async (_request, reply) => {
      const methods = await settingsService.listPaymentMethods();
      return reply.send({ methods });
    }
  );

  /**
   * POST /api/v1/settings/payment-methods
   * Add new payment method (Manager only, PRD 5.3.3)
   */
  app.post(
    "/payment-methods",
    { preHandler: [requireRole(Role.MANAGER)] },
    async (request, reply) => {
      try {
        const parsed = createPaymentMethodSchema.safeParse(request.body);
        if (!parsed.success) {
          return reply.status(400).send({
            error: "Validation Error",
            message: parsed.error.issues[0]?.message || "Invalid input",
          });
        }

        const caller = request.user as { id: string; role: Role };
        const method = await settingsService.createPaymentMethod(parsed.data, caller.id);
        return reply.status(201).send({ method });
      } catch (err: any) {
        if (err instanceof SettingsError) {
          return reply.status(err.statusCode).send({ error: err.message });
        }
        throw err;
      }
    }
  );

  /**
   * PATCH /api/v1/settings/payment-methods/:id
   * Update payment method (Manager only)
   */
  app.patch(
    "/payment-methods/:id",
    { preHandler: [requireRole(Role.MANAGER)] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const parsed = updatePaymentMethodSchema.safeParse(request.body);
        if (!parsed.success) {
          return reply.status(400).send({
            error: "Validation Error",
            message: parsed.error.issues[0]?.message || "Invalid input",
          });
        }

        const caller = request.user as { id: string; role: Role };
        const method = await settingsService.updatePaymentMethod(id, parsed.data, caller.id);
        return reply.send({ method });
      } catch (err: any) {
        if (err instanceof SettingsError) {
          return reply.status(err.statusCode).send({ error: err.message });
        }
        throw err;
      }
    }
  );
}
