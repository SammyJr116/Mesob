import { FastifyReply, FastifyRequest } from "fastify";
import { Role } from "@prisma/client";

export interface AuthUserPayload {
  id: string;
  username: string;
  role: Role;
  employeeId?: string | null;
}

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: AuthUserPayload;
    user: AuthUserPayload;
  }
}

/**
 * Authentication middleware verifying JWT session cookie or Bearer header
 */
export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  try {
    let token: string | undefined;

    // 1. Check signed cookie
    const cookieToken = request.cookies.mesob_token;
    if (cookieToken) {
      const unsigned = request.unsignCookie(cookieToken);
      if (unsigned.valid && unsigned.value) {
        token = unsigned.value;
      }
    }

    // 2. Check Authorization header
    if (!token && request.headers.authorization) {
      const parts = request.headers.authorization.split(" ");
      if (parts.length === 2 && parts[0] === "Bearer") {
        token = parts[1];
      }
    }

    if (!token) {
      return reply.status(401).send({
        error: "Unauthorized",
        message: "Sign-in required to access this resource",
      });
    }

    // Verify token
    const decoded = (await request.server.jwt.verify(token)) as AuthUserPayload;
    request.user = decoded;
  } catch (err) {
    return reply.status(401).send({
      error: "Unauthorized",
      message: "Session expired or invalid token",
    });
  }
}

/**
 * Server-Side RBAC Guard Middleware (PRD 3.3 Permission Matrix)
 * Checks if the authenticated user's role matches one of the authorized roles
 */
export function requireRole(...allowedRoles: Role[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.user) {
      await authenticate(request, reply);
      if (reply.sent) return;
    }

    const user = request.user as AuthUserPayload | undefined;
    const userRole = user?.role;
    if (!userRole || !allowedRoles.includes(userRole)) {
      return reply.status(403).send({
        error: "Forbidden",
        message: `Your role (${userRole || "unknown"}) does not have permission to perform this action.`,
      });
    }
  };
}
