import { FastifyInstance } from "fastify";
import { z } from "zod";
import { usersService, UserError } from "./users.service.js";
import { requireRole } from "../../middleware/rbac.js";
import { Role, UserStatus } from "@prisma/client";

const createUserSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Valid email is required"),
  password: z.string().min(8, "Password must be at least 8 characters").optional(),
  role: z.nativeEnum(Role),
  employeeId: z.string().optional().or(z.literal("")),
  mustChangePassword: z.boolean().optional(),
});

const updateStatusSchema = z.object({
  status: z.nativeEnum(UserStatus),
});

const updateRoleSchema = z.object({
  role: z.nativeEnum(Role),
});

const resetPasswordSchema = z.object({
  temporaryPassword: z.string().min(8, "Temporary password must be at least 8 characters").optional(),
});

export async function usersRoutes(app: FastifyInstance) {
  /**
   * GET /api/v1/users
   * List all users with linked employee (Admin only, PRD 6.2, 6.3)
   */
  app.get(
    "/",
    { preHandler: [requireRole(Role.ADMIN)] },
    async (request, reply) => {
      const users = await usersService.listUsers();
      return reply.send({ users });
    }
  );

  /**
   * POST /api/v1/users
   * Create user account (Admin only, PRD 6.3)
   */
  app.post(
    "/",
    { preHandler: [requireRole(Role.ADMIN)] },
    async (request, reply) => {
      try {
        const parsed = createUserSchema.safeParse(request.body);
        if (!parsed.success) {
          return reply.status(400).send({
            error: "Validation Error",
            message: parsed.error.issues[0]?.message || "Invalid input",
          });
        }

        const caller = request.user as { id: string; role: Role };
        const user = await usersService.createUser(
          {
            ...parsed.data,
            employeeId: parsed.data.employeeId || undefined,
          },
          caller.id
        );
        return reply.status(201).send({ user });
      } catch (err: any) {
        if (err instanceof UserError) {
          return reply.status(err.statusCode).send({ error: err.message });
        }
        throw err;
      }
    }
  );

  /**
   * PATCH /api/v1/users/:id/status
   * Suspend or Activate user (Admin only, PRD 6.7)
   */
  app.patch(
    "/:id/status",
    { preHandler: [requireRole(Role.ADMIN)] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const parsed = updateStatusSchema.safeParse(request.body);
        if (!parsed.success) {
          return reply.status(400).send({
            error: "Validation Error",
            message: parsed.error.issues[0]?.message || "Invalid input",
          });
        }

        const caller = request.user as { id: string; role: Role };
        const user = await usersService.updateUserStatus(id, parsed.data.status, caller.id);
        return reply.send({ user });
      } catch (err: any) {
        if (err instanceof UserError) {
          return reply.status(err.statusCode).send({ error: err.message });
        }
        throw err;
      }
    }
  );

  /**
   * PATCH /api/v1/users/:id/role
   * Update user role (Admin only, PRD 6.7.4)
   */
  app.patch(
    "/:id/role",
    { preHandler: [requireRole(Role.ADMIN)] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const parsed = updateRoleSchema.safeParse(request.body);
        if (!parsed.success) {
          return reply.status(400).send({
            error: "Validation Error",
            message: parsed.error.issues[0]?.message || "Invalid input",
          });
        }

        const caller = request.user as { id: string; role: Role };
        const user = await usersService.updateUserRole(id, parsed.data.role, caller.id);
        return reply.send({ user });
      } catch (err: any) {
        if (err instanceof UserError) {
          return reply.status(err.statusCode).send({ error: err.message });
        }
        throw err;
      }
    }
  );

  /**
   * POST /api/v1/users/:id/reset-password
   * Reset user password with temporary password (Admin only, PRD 6.4.2)
   */
  app.post(
    "/:id/reset-password",
    { preHandler: [requireRole(Role.ADMIN)] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const parsed = resetPasswordSchema.safeParse(request.body || {});
        if (!parsed.success) {
          return reply.status(400).send({
            error: "Validation Error",
            message: parsed.error.issues[0]?.message || "Invalid input",
          });
        }

        const caller = request.user as { id: string; role: Role };
        const result = await usersService.resetPassword(id, parsed.data?.temporaryPassword, caller.id);
        return reply.send(result);
      } catch (err: any) {
        if (err instanceof UserError) {
          return reply.status(err.statusCode).send({ error: err.message });
        }
        throw err;
      }
    }
  );

  /**
   * POST /api/v1/users/:id/unlock
   * Unlock account (Admin only, PRD 6.5.2)
   */
  app.post(
    "/:id/unlock",
    { preHandler: [requireRole(Role.ADMIN)] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const caller = request.user as { id: string; role: Role };
        const result = await usersService.unlockUser(id, caller.id);
        return reply.send(result);
      } catch (err: any) {
        if (err instanceof UserError) {
          return reply.status(err.statusCode).send({ error: err.message });
        }
        throw err;
      }
    }
  );
}
