import { Server as SocketServer, Socket } from "socket.io";
import { Server as HttpServer } from "http";
import cookie from "cookie";
// @ts-ignore
import cookieParser from "cookie-signature";
import { Role } from "@prisma/client";
import { FastifyInstance } from "fastify";
import { AuthUserPayload } from "../middleware/rbac.js";

export let io: SocketServer | null = null;

export function initSocketGateway(fastify: FastifyInstance, cookieSecret: string) {
  const httpServer = fastify.server as HttpServer;

  io = new SocketServer(httpServer, {
    cors: {
      origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
      credentials: true,
    },
  });

  // Authentication Middleware for WebSocket Connections
  io.use(async (socket: Socket, next) => {
    try {
      let rawToken: string | undefined;

      // 1. Try handshake auth object (token passed directly by client)
      if (socket.handshake.auth && socket.handshake.auth.token) {
        rawToken = socket.handshake.auth.token;
      }

      // 2. Try cookie from handshake headers
      if (!rawToken && socket.handshake.headers.cookie) {
        const parsedCookies = cookie.parse(socket.handshake.headers.cookie);
        const signedCookie = parsedCookies.mesob_token;
        if (signedCookie) {
          const unsigned = cookieParser.unsign(signedCookie, cookieSecret);
          if (unsigned !== false) {
            rawToken = unsigned;
          } else {
            rawToken = signedCookie;
          }
        }
      }

      if (!rawToken) {
        return next(new Error("Authentication error: No session token provided"));
      }

      // Verify token with Fastify JWT
      const decoded = (await fastify.jwt.verify(rawToken)) as AuthUserPayload;
      socket.data.user = decoded;
      return next();
    } catch (err: any) {
      return next(new Error(`Authentication error: ${err.message}`));
    }
  });

  // Connection Handler & Room Assignment
  io.on("connection", (socket: Socket) => {
    const user: AuthUserPayload = socket.data.user;
    if (!user) {
      socket.disconnect();
      return;
    }

    // Join user-specific room
    socket.join(`user:${user.id}`);

    // Join role-specific rooms (PRD 10.4, 23.1)
    switch (user.role) {
      case Role.KITCHEN:
        socket.join("room:kitchen");
        break;
      case Role.WAITER:
        socket.join("room:waiter");
        socket.join(`room:waiter:${user.id}`);
        if (user.employeeId) {
          socket.join(`room:waiter:${user.employeeId}`);
        }
        break;
      case Role.CLEANER:
        socket.join("room:cleaner");
        break;
      case Role.MANAGER:
        socket.join("room:manager");
        socket.join("room:kitchen");
        socket.join("room:cleaner");
        socket.join("room:waiter");
        break;
      case Role.ADMIN:
        socket.join("room:admin");
        socket.join("room:manager");
        break;
      case Role.INVENTORY:
        socket.join("room:inventory");
        break;
      case Role.SECURITY:
        socket.join("room:security");
        break;
    }

    socket.on("disconnect", () => {
      // Clean disconnect
    });
  });

  return io;
}

// -------------------------------------------------------------
// EVENT BROADCASTERS (PRD 10.4, 20.2, 23.1)
// -------------------------------------------------------------

/**
 * Emits newly submitted ticket to Kitchen with sound alert (PRD 10.4.1, 20.2.1)
 */
export function emitTicketSubmitted(ticket: any) {
  if (!io) return;
  io.to("room:kitchen").to("room:manager").emit("ticket:submitted", {
    ticket,
    playSound: true, // Kitchen plays sound alert
    timestamp: new Date().toISOString(),
  });
}

/**
 * Emits ticket status change. If Ready, alerts the owning waiter with sound (PRD 10.4.1, 20.2.1)
 */
export function emitTicketStatus(ticket: any, waiterUserId?: string | null, waiterEmployeeId?: string | null) {
  if (!io) return;

  const isReady = ticket.status === "Ready";

  // If ticket is Ready, emit to owning waiter with sound
  if (isReady) {
    if (waiterUserId) {
      io.to(`room:waiter:${waiterUserId}`).emit("ticket:ready", {
        ticket,
        playSound: true, // Owning waiter plays sound alert
        timestamp: new Date().toISOString(),
      });
    }
    if (waiterEmployeeId && waiterEmployeeId !== waiterUserId) {
      io.to(`room:waiter:${waiterEmployeeId}`).emit("ticket:ready", {
        ticket,
        playSound: true,
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Also broadcast status change to Kitchen and Managers
  io.to("room:kitchen").to("room:manager").to("room:waiter").emit("ticket:status_changed", {
    ticket,
    playSound: false,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Emits table transitioned to Cleaning, dispatching task to Cleaner room (PRD 14.6)
 */
export function emitTableCleaning(table: any, task?: any) {
  if (!io) return;
  io.to("room:cleaner").to("room:manager").emit("table:cleaning", {
    table,
    task,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Emits table status update
 */
export function emitTableUpdated(table: any) {
  if (!io) return;
  io.emit("table:updated", {
    table,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Emits order status update
 */
export function emitOrderUpdated(order: any) {
  if (!io) return;
  io.emit("order:updated", {
    order,
    timestamp: new Date().toISOString(),
  });
}
