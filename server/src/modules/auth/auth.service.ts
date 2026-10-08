import { prisma } from "../../lib/prisma.js";
import { Role, UserStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

export class AuthError extends Error {
  statusCode: number;
  remainingMinutes?: number;

  constructor(message: string, statusCode: number = 400, remainingMinutes?: number) {
    super(message);
    this.name = "AuthError";
    this.statusCode = statusCode;
    this.remainingMinutes = remainingMinutes;
  }
}

export class AuthService {
  /**
   * Validates user credentials with 5-attempt lockout enforcement (PRD 6.4, 6.5)
   */
  async login(loginInput: string, passwordPlain: string) {
    const trimmedLogin = (loginInput || "").trim().toLowerCase();

    // Search user by username or email
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username: trimmedLogin },
          { email: trimmedLogin },
        ],
      },
      include: {
        employee: true,
      },
    });

    if (!user) {
      // Do not reveal whether user exists (PRD 6.4.3)
      throw new AuthError("Invalid username or password", 401);
    }

    const now = new Date();

    // Check if account is locked (PRD 6.5.2)
    if (user.status === UserStatus.LOCKED || (user.lockedUntil && user.lockedUntil > now)) {
      let remaining = 15;
      if (user.lockedUntil) {
        remaining = Math.max(1, Math.ceil((user.lockedUntil.getTime() - now.getTime()) / (60 * 1000)));
      }
      throw new AuthError(
        `Account is locked due to too many failed sign-in attempts. Please try again in ${remaining} minute${remaining > 1 ? "s" : ""} or contact an administrator.`,
        423,
        remaining
      );
    }

    // Check if account is suspended / deactivated (PRD 6.7.3)
    if (user.status === UserStatus.SUSPENDED) {
      throw new AuthError("Account is inactive. Please contact an administrator.", 403);
    }

    // Verify password hash
    const isValid = await bcrypt.compare(passwordPlain, user.passwordHash);

    if (!isValid) {
      const updatedAttempts = user.failedAttempts + 1;

      if (updatedAttempts >= 5) {
        const lockoutTime = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes lockout

        await prisma.user.update({
          where: { id: user.id },
          data: {
            failedAttempts: updatedAttempts,
            status: UserStatus.LOCKED,
            lockedUntil: lockoutTime,
          },
        });

        // Log lockout event (PRD 6.5.2)
        await prisma.activityLog.create({
          data: {
            userId: user.id,
            role: user.role,
            action: "Account Locked",
            target: `User: ${user.username}`,
            reason: "Account locked after 5 consecutive failed sign-in attempts",
          },
        });

        throw new AuthError(
          "Account is locked due to too many failed sign-in attempts. Please try again in 15 minutes or contact an administrator.",
          423,
          15
        );
      } else {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            failedAttempts: updatedAttempts,
          },
        });

        // Do not reveal remaining attempts or username existence (PRD 6.4.3)
        throw new AuthError("Invalid username or password", 401);
      }
    }

    // Successful sign-in: reset failed attempts and clear any previous lock
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        failedAttempts: 0,
        lockedUntil: null,
        status: UserStatus.ACTIVE,
      },
      include: {
        employee: true,
      },
    });

    return updatedUser;
  }

  /**
   * Unlocks an account early by an Administrator (PRD 6.5.2)
   */
  async unlockUser(targetUserId: string, adminUserId: string) {
    const user = await prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!user) {
      throw new AuthError("User not found", 404);
    }

    const updated = await prisma.user.update({
      where: { id: targetUserId },
      data: {
        failedAttempts: 0,
        lockedUntil: null,
        status: UserStatus.ACTIVE,
      },
    });

    await prisma.activityLog.create({
      data: {
        userId: adminUserId,
        role: "ADMIN",
        action: "Account Unlocked",
        target: `User: ${user.username}`,
        reason: "Administrator unlocked account early",
      },
    });

    return updated;
  }

  /**
   * Retrieve current user profile
   */
  async getUserById(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
      include: {
        employee: true,
      },
    });
  }
}

export const authService = new AuthService();
