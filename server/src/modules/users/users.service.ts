import { prisma } from "../../lib/prisma.js";
import { Role, UserStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

export class UserError extends Error {
  constructor(message: string, public statusCode: number = 400) {
    super(message);
    this.name = "UserError";
  }
}

export const usersService = {
  /**
   * List all user accounts (Admin only, PRD 6.3)
   */
  async listUsers() {
    return prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        status: true,
        failedAttempts: true,
        lockedUntil: true,
        mustChangePassword: true,
        createdAt: true,
        updatedAt: true,
        employeeId: true,
        employee: {
          select: {
            id: true,
            employeeNumber: true,
            name: true,
            role: true,
            phone: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  },

  /**
   * Create user account (Admin only, PRD 6.3)
   */
  async createUser(data: {
    username: string;
    email: string;
    password?: string;
    role: Role;
    employeeId?: string;
    mustChangePassword?: boolean;
  }, adminId: string) {
    const username = data.username.trim();
    const email = data.email.trim();

    if (username.length < 3) {
      throw new UserError("Username must be at least 3 characters", 400);
    }

    const password = data.password || "mesob1234";
    if (password.length < 8) {
      throw new UserError("Password must be at least 8 characters (PRD 6.5.1)", 400);
    }

    // Check unique username
    const existingUser = await prisma.user.findUnique({ where: { username } });
    if (existingUser) {
      throw new UserError(`Username '${username}' is already in use`, 409);
    }

    // Check unique email
    const existingEmail = await prisma.user.findUnique({ where: { email } });
    if (existingEmail) {
      throw new UserError(`Email '${email}' is already registered`, 409);
    }

    // Check employee linkage if provided
    if (data.employeeId) {
      const emp = await prisma.employee.findUnique({ where: { id: data.employeeId } });
      if (!emp) {
        throw new UserError("Selected employee not found", 404);
      }
      const linkedUser = await prisma.user.findUnique({ where: { employeeId: data.employeeId } });
      if (linkedUser) {
        throw new UserError("Employee is already linked to another user account", 409);
      }
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        username,
        email,
        passwordHash,
        role: data.role,
        status: UserStatus.ACTIVE,
        employeeId: data.employeeId || null,
        mustChangePassword: data.mustChangePassword !== undefined ? data.mustChangePassword : true,
      },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        status: true,
        mustChangePassword: true,
        employee: true,
        createdAt: true,
      },
    });

    // If employee was linked, update their userId
    if (data.employeeId) {
      await prisma.employee.update({
        where: { id: data.employeeId },
        data: { userId: user.id },
      });
    }

    // Audit log
    await prisma.activityLog.create({
      data: {
        userId: adminId,
        role: Role.ADMIN,
        action: "USER_CREATE",
        target: "User",
        targetId: user.id,
        newValue: JSON.stringify({ username, email, role: data.role }),
        reason: `Created user account ${username}`,
      },
    });

    return user;
  },

  /**
   * Update user status (Suspend / Activate) with guardrails (PRD 6.7)
   */
  async updateUserStatus(targetId: string, status: UserStatus, adminId: string) {
    const user = await prisma.user.findUnique({ where: { id: targetId } });
    if (!user) {
      throw new UserError("User not found", 404);
    }

    // Guardrail PRD 6.7.2: A user cannot deactivate their own account
    if (user.id === adminId && status === UserStatus.SUSPENDED) {
      throw new UserError("You cannot deactivate your own account (PRD 6.7.2)", 400);
    }

    // Guardrail PRD 6.7.1: The last active Administrator cannot be deactivated
    if (user.role === Role.ADMIN && status === UserStatus.SUSPENDED) {
      const activeAdminCount = await prisma.user.count({
        where: { role: Role.ADMIN, status: UserStatus.ACTIVE },
      });
      if (activeAdminCount <= 1) {
        throw new UserError("Cannot deactivate the only active Administrator (PRD 6.7.1)", 400);
      }
    }

    const updated = await prisma.user.update({
      where: { id: targetId },
      data: { status },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        status: true,
        employee: true,
      },
    });

    await prisma.activityLog.create({
      data: {
        userId: adminId,
        role: Role.ADMIN,
        action: "USER_STATUS_CHANGE",
        target: "User",
        targetId,
        oldValue: user.status,
        newValue: status,
        reason: `Changed user status to ${status}`,
      },
    });

    return updated;
  },

  /**
   * Update user role with guardrails (PRD 6.7.4)
   */
  async updateUserRole(targetId: string, newRole: Role, adminId: string) {
    const user = await prisma.user.findUnique({ where: { id: targetId } });
    if (!user) {
      throw new UserError("User not found", 404);
    }

    if (user.role === Role.ADMIN && newRole !== Role.ADMIN) {
      const activeAdminCount = await prisma.user.count({
        where: { role: Role.ADMIN, status: UserStatus.ACTIVE },
      });
      if (activeAdminCount <= 1) {
        throw new UserError(
          "Cannot reassign role of the only active Administrator (PRD 6.7.4)",
          400
        );
      }
    }

    const updated = await prisma.user.update({
      where: { id: targetId },
      data: { role: newRole },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        status: true,
      },
    });

    await prisma.activityLog.create({
      data: {
        userId: adminId,
        role: Role.ADMIN,
        action: "USER_ROLE_CHANGE",
        target: "User",
        targetId,
        oldValue: user.role,
        newValue: newRole,
        reason: `Changed user role from ${user.role} to ${newRole}`,
      },
    });

    return updated;
  },

  /**
   * Reset user password (Admin only, PRD 6.4.2)
   */
  async resetPassword(targetId: string, temporaryPassword: string | undefined, adminId: string) {
    const user = await prisma.user.findUnique({ where: { id: targetId } });
    if (!user) {
      throw new UserError("User not found", 404);
    }

    const tempPass = temporaryPassword || `Mesob${Math.floor(1000 + Math.random() * 9000)}!`;
    if (tempPass.length < 8) {
      throw new UserError("Password must be at least 8 characters (PRD 6.5.1)", 400);
    }

    const passwordHash = await bcrypt.hash(tempPass, 10);

    await prisma.user.update({
      where: { id: targetId },
      data: {
        passwordHash,
        mustChangePassword: true,
        failedAttempts: 0,
        lockedUntil: null,
      },
    });

    await prisma.activityLog.create({
      data: {
        userId: adminId,
        role: Role.ADMIN,
        action: "PASSWORD_RESET",
        target: "User",
        targetId,
        reason: `Administrator reset password for ${user.username}`,
      },
    });

    return {
      message: `Password reset successfully for ${user.username}`,
      temporaryPassword: tempPass,
    };
  },

  /**
   * Unlock locked account (Admin only, PRD 6.5.2)
   */
  async unlockUser(targetId: string, adminId: string) {
    const user = await prisma.user.findUnique({ where: { id: targetId } });
    if (!user) {
      throw new UserError("User not found", 404);
    }

    await prisma.user.update({
      where: { id: targetId },
      data: {
        failedAttempts: 0,
        lockedUntil: null,
      },
    });

    await prisma.activityLog.create({
      data: {
        userId: adminId,
        role: Role.ADMIN,
        action: "USER_UNLOCK",
        target: "User",
        targetId,
        reason: `Administrator cleared lockout for ${user.username}`,
      },
    });

    return {
      message: `User ${user.username} unlocked successfully`,
    };
  },
};
