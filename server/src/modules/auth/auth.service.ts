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

  /**
   * Update own profile (phone, email)
   */
  async updateProfile(userId: string, data: { email?: string; phone?: string; name?: string }) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { employee: true },
    });

    if (!user) {
      throw new AuthError("User not found", 404);
    }

    if (data.email && data.email !== user.email) {
      const emailExisting = await prisma.user.findUnique({ where: { email: data.email } });
      if (emailExisting && emailExisting.id !== userId) {
        throw new AuthError("Email is already in use by another user", 409);
      }
      await prisma.user.update({
        where: { id: userId },
        data: { email: data.email },
      });
    }

    if (user.employeeId && (data.phone || data.email || data.name)) {
      await prisma.employee.update({
        where: { id: user.employeeId },
        data: {
          ...(data.phone ? { phone: data.phone } : {}),
          ...(data.email ? { email: data.email } : {}),
          ...(data.name ? { name: data.name } : {}),
        },
      });
    }

    return this.getUserById(userId);
  }

  /**
   * Change password self-service (PRD 6.4, 6.5)
   */
  async changePassword(userId: string, currentPasswordPlain: string, newPasswordPlain: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new AuthError("User not found", 404);
    }

    if (!newPasswordPlain || newPasswordPlain.length < 8) {
      throw new AuthError("New password must be at least 8 characters (PRD 6.5.1)", 400);
    }

    const isValid = await bcrypt.compare(currentPasswordPlain, user.passwordHash);
    if (!isValid) {
      throw new AuthError("Current password is incorrect", 400);
    }

    const passwordHash = await bcrypt.hash(newPasswordPlain, 10);

    await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        mustChangePassword: false,
      },
    });

    await prisma.activityLog.create({
      data: {
        userId,
        role: user.role,
        action: "PASSWORD_CHANGE",
        target: "User",
        targetId: userId,
        reason: "User self-changed account password",
      },
    });

    return { success: true, message: "Password updated successfully" };
  }

  /**
   * Grant back-entry permission to user (PRD 4.5.2, Manager only)
   */
  async createBackEntryGrant(managerId: string, data: { userId: string; durationHours?: number; reason: string }) {
    const targetUser = await prisma.user.findUnique({ where: { id: data.userId } });
    if (!targetUser) {
      throw new AuthError("Target user not found", 404);
    }

    const hours = data.durationHours && data.durationHours > 0 ? data.durationHours : 12;
    const now = new Date();
    const endTime = new Date(now.getTime() + hours * 60 * 60 * 1000);

    const grant = await prisma.backEntryGrant.create({
      data: {
        userId: data.userId,
        grantedById: managerId,
        startTime: now,
        endTime,
        reason: data.reason || "Outage recovery paper entry",
      },
    });

    await prisma.activityLog.create({
      data: {
        userId: managerId,
        role: Role.MANAGER,
        action: "BACK_ENTRY_GRANT",
        target: "User",
        targetId: data.userId,
        newValue: JSON.stringify({ durationHours: hours, expiresAt: endTime }),
        reason: data.reason || "Granted back-entry permission",
      },
    });

    return grant;
  }

  /**
   * Check active back-entry grant for user
   */
  async getActiveBackEntryGrant(userId: string) {
    const now = new Date();
    const grant = await prisma.backEntryGrant.findFirst({
      where: {
        userId,
        startTime: { lte: now },
        endTime: { gte: now },
      },
      orderBy: { endTime: "desc" },
    });

    return grant;
  }
}

export const authService = new AuthService();
