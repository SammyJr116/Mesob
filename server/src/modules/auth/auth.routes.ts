import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { authService, AuthError } from "./auth.service.js";
import { authenticate, requireRole, AuthUserPayload } from "../../middleware/rbac.js";
import { Role } from "@prisma/client";

const loginSchema = z.object({
  login: z.string().min(1, "Username or email is required"),
  password: z.string().min(1, "Password is required"),
});

export async function authRoutes(app: FastifyInstance) {
  /**
   * POST /api/v1/auth/login
   * Validates username/email and password, enforces 5-attempt lockout, sets 30-min JWT cookie
   */
  app.post("/login", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const parsed = loginSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: "Validation Error",
          message: parsed.error.issues[0]?.message || "Invalid input",
        });
      }

      const { login, password } = parsed.data;
      const user = await authService.login(login, password);

      // Sign JWT with 30-minute expiry (PRD 6.6.1)
      const token = app.jwt.sign(
        {
          id: user.id,
          username: user.username,
          role: user.role,
          employeeId: user.employeeId,
        },
        { expiresIn: "30m" }
      );

      // Set HTTP-only signed cookie with 30-minute max age
      reply.setCookie("mesob_token", token, {
        path: "/",
        httpOnly: true,
        signed: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 30 * 60, // 30 minutes in seconds
      });

      return reply.status(200).send({
        status: "ok",
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          status: user.status,
          mustChangePassword: user.mustChangePassword,
          employee: user.employee ? {
            id: user.employee.id,
            employeeNumber: user.employee.employeeNumber,
            name: user.employee.name,
            role: user.employee.role,
          } : null,
        },
      });
    } catch (err: any) {
      if (err instanceof AuthError) {
        return reply.status(err.statusCode).send({
          error: err.statusCode === 423 ? "Locked" : err.statusCode === 403 ? "Forbidden" : "Unauthorized",
          message: err.message,
          remainingMinutes: err.remainingMinutes,
        });
      }

      request.log.error(err);
      return reply.status(500).send({
        error: "Internal Server Error",
        message: "An unexpected error occurred during sign-in",
      });
    }
  });

  /**
   * POST /api/v1/auth/logout
   * Clears session cookie
   */
  app.post("/logout", async (request: FastifyRequest, reply: FastifyReply) => {
    reply.clearCookie("mesob_token", { path: "/" });
    return reply.status(200).send({
      status: "ok",
      message: "Signed out successfully",
    });
  });

  /**
   * GET /api/v1/auth/me
   * Returns current authenticated user information
   */
  app.get("/me", { preHandler: [authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userPayload = request.user as AuthUserPayload | undefined;
    if (!userPayload?.id) {
      return reply.status(401).send({ error: "Unauthorized" });
    }

    const user = await authService.getUserById(userPayload.id);
    if (!user) {
      reply.clearCookie("mesob_token", { path: "/" });
      return reply.status(401).send({ error: "User not found" });
    }

    return reply.status(200).send({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        status: user.status,
        mustChangePassword: user.mustChangePassword,
        employee: user.employee,
      },
    });
  });

  /**
   * POST /api/v1/auth/unlock/:id
   * Administrator unlocks a locked account early (PRD 6.5.2)
   */
  app.post<{ Params: { id: string } }>(
    "/unlock/:id",
    { preHandler: [requireRole(Role.ADMIN)] },
    async (request, reply) => {
      try {
        const targetUserId = request.params.id;
        const adminUser = request.user as AuthUserPayload;

        const unlocked = await authService.unlockUser(targetUserId, adminUser.id);

        return reply.status(200).send({
          status: "ok",
          message: `User ${unlocked.username} has been successfully unlocked.`,
        });
      } catch (err: any) {
        if (err instanceof AuthError) {
          return reply.status(err.statusCode).send({
            error: err.name,
            message: err.message,
          });
        }
        return reply.status(500).send({ error: "Internal Server Error", message: err.message });
      }
    }
  );
}
