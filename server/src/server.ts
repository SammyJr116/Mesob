import Fastify, { FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import jwt from "@fastify/jwt";
import * as dotenv from "dotenv";
import { authRoutes } from "./modules/auth/auth.routes.js";
import { ordersRoutes } from "./modules/orders/orders.routes.js";
import { ticketsRoutes } from "./modules/tickets/tickets.routes.js";
import { billingRoutes } from "./modules/billing/billing.routes.js";
import { inventoryRoutes } from "./modules/inventory/inventory.routes.js";
import { stockCountRoutes } from "./modules/inventory/stock-count.routes.js";
import { suppliersRoutes } from "./modules/purchasing/suppliers.routes.js";
import { purchasesRoutes } from "./modules/purchasing/purchases.routes.js";
import { recipesRoutes } from "./modules/recipes/recipes.routes.js";
import { reservationsRoutes } from "./modules/reservations/reservations.routes.js";
import { cleaningRoutes } from "./modules/facility/cleaning.routes.js";
import { reportsRoutes } from "./modules/reports/reports.routes.js";
import { monitorsJob } from "./scheduler/monitors.job.js";
import { requireRole } from "./middleware/rbac.js";
import { Role } from "@prisma/client";
import { initSocketGateway } from "./ws/gateway.js";

dotenv.config();

const COOKIE_SECRET = process.env.COOKIE_SECRET || "mesob-super-secret-cookie-signing-key-minimum-32-chars";

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
    secret: COOKIE_SECRET,
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

  // Orders & Floor Management Routes (PRD 9, 8)
  await app.register(ordersRoutes, { prefix: "/api/v1/orders" });

  // Kitchen Tickets & Dispatch Routes (PRD 10)
  await app.register(ticketsRoutes, { prefix: "/api/v1/tickets" });

  // Billing, Invoices & PDF Routes (PRD 11)
  await app.register(billingRoutes, { prefix: "/api/v1/billing" });

  // Inventory & Stock Count Routes (PRD 15)
  await app.register(inventoryRoutes, { prefix: "/api/v1/inventory" });
  await app.register(stockCountRoutes, { prefix: "/api/v1/inventory" });

  // Purchasing & Suppliers Routes (PRD 16)
  await app.register(suppliersRoutes, { prefix: "/api/v1/purchasing" });
  await app.register(purchasesRoutes, { prefix: "/api/v1/purchases" });

  // Recipes Routes (PRD 7.9)
  await app.register(recipesRoutes, { prefix: "/api/v1/recipes" });

  // Reservations Engine Routes (PRD 13)
  await app.register(reservationsRoutes, { prefix: "/api/v1/reservations" });

  // Facility & Cleaning Routes (PRD 14)
  await app.register(cleaningRoutes, { prefix: "/api/v1/cleaning" });

  // Reporting, Analytics & Day Closure Routes (PRD 22)
  await app.register(reportsRoutes, { prefix: "/api/v1/reports" });

  // Example Protected RBAC Route for Testing (PRD 3.3)
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

  // Initialize Real-time WebSocket Gateway (PRD 10.4, 23.1)
  initSocketGateway(app, COOKIE_SECRET);

  return app;
}

export async function start() {
  try {
    const app = await buildApp();
    const port = Number(process.env.PORT) || 4000;
    const host = process.env.HOST || "0.0.0.0";

    await app.listen({ port, host });
    monitorsJob.start();
    console.log(`[Mesob API] Server running at http://localhost:${port}`);
    console.log(`[Mesob API] Health endpoint at http://localhost:${port}/api/v1/health`);
    console.log(`[Mesob API] WebSocket Gateway initialized on port ${port}`);
    console.log(`[Mesob API] Background Monitors Poller started`);
    return app;
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
}

// Only auto-start when run directly as the entry file
const isEntryFile = process.argv[1] && (process.argv[1].endsWith("server.ts") || process.argv[1].endsWith("server.js"));
if (isEntryFile && process.env.NODE_ENV !== "test" && !process.env.DISABLE_AUTO_START) {
  start();
}
