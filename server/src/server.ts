import Fastify, { FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import jwt from "@fastify/jwt";
import * as dotenv from "dotenv";
import { authRoutes } from "./modules/auth/auth.routes.js";
import { requireRole } from "./middleware/rbac.js";
import { Role } from "@prisma/client";

dotenv.config();

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: process.env.NODE_ENV === "test" ? false : true,
  });

  await app.register(cors, {
    origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  });

  await app.register(cookie, {
    secret: process.env.COOKIE_SECRET || "mesob-super-secret-cookie-signing-key-minimum-32-chars",
  });

  await app.register(jwt, {
    secret: process.env.JWT_SECRET || "mesob-jwt-super-secret-token-key-change-in-prod",
    cookie: {
      cookieName: "mesob_token",
      signed: true,
    },
  });

  // Health check route
  app.get("/api/v1/health", async () => {
    return {
      status: "ok",
      service: "Mesob Restaurant API",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  });

  // Authentication & Session Routes (PRD 6)
  await app.register(authRoutes, { prefix: "/api/v1/auth" });

  // Example Protected RBAC Route for Testing (PRD 3.3: Reports visible to Manager & Admin only)
  app.get(
    "/api/v1/reports/test",
    { preHandler: [requireRole(Role.MANAGER, Role.ADMIN)] },
    async (request) => {
      return {
        status: "ok",
        message: "Reports accessed successfully",
        caller: request.user,
      };
    }
  );

  return app;
}

export async function start() {
  try {
    const app = await buildApp();
    const port = Number(process.env.PORT) || 4000;
    const host = process.env.HOST || "0.0.0.0";

    await app.listen({ port, host });
    console.log(`[Mesob API] Server running at http://localhost:${port}`);
    console.log(`[Mesob API] Health endpoint at http://localhost:${port}/api/v1/health`);
    return app;
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
}

// Only auto-start when run directly
if (process.env.NODE_ENV !== "test" && !process.env.DISABLE_AUTO_START) {
  start();
}
