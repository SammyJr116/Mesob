import { prisma } from "../../lib/prisma.js";
import { Role } from "@prisma/client";

export class SecurityError extends Error {
  constructor(message: string, public statusCode: number = 400) {
    super(message);
    this.name = "SecurityError";
  }
}

export const visitorsService = {
  async listVisitors(query: { activeOnly?: boolean; search?: string }) {
    const where: any = {};
    if (query.activeOnly) {
      where.checkOutTime = null;
    }
    if (query.search) {
      where.OR = [
        { name: { contains: query.search } },
        { phone: { contains: query.search } },
        { purpose: { contains: query.search } },
        { company: { contains: query.search } },
      ];
    }
    return prisma.visitor.findMany({
      where,
      orderBy: { checkInTime: "desc" },
    });
  },

  async checkInVisitor(user: { id: string; role: Role }, data: {
    name: string;
    phone: string;
    purpose: string;
    personVisited?: string;
    company?: string;
    badgeNumber?: string;
  }) {
    if (!data.name || !data.name.trim()) throw new SecurityError("Visitor name is required", 400);
    if (!data.phone || !data.phone.trim()) throw new SecurityError("Phone number is required", 400);
    if (!data.purpose || !data.purpose.trim()) throw new SecurityError("Purpose is required", 400);

    return prisma.visitor.create({
      data: {
        name: data.name.trim(),
        phone: data.phone.trim(),
        purpose: data.purpose.trim(),
        personVisited: data.personVisited ? data.personVisited.trim() : null,
        company: data.company ? data.company.trim() : null,
        badgeNumber: data.badgeNumber ? data.badgeNumber.trim() : null,
        recordedById: user.id,
      },
    });
  },

  async checkOutVisitor(id: string) {
    const existing = await prisma.visitor.findUnique({ where: { id } });
    if (!existing) throw new SecurityError("Visitor not found", 404);
    if (existing.checkOutTime) throw new SecurityError("Visitor already checked out", 400);

    return prisma.visitor.update({
      where: { id },
      data: { checkOutTime: new Date() },
    });
  },

  async deleteVisitor(user: { id: string; role: Role }, id: string) {
    const existing = await prisma.visitor.findUnique({ where: { id } });
    if (!existing) throw new SecurityError("Visitor not found", 404);

    await prisma.visitor.delete({ where: { id } });

    await prisma.activityLog.create({
      data: {
        userId: user.id,
        role: user.role,
        action: "Deleted visitor record",
        target: existing.name,
        reason: "Manager deleted visitor record (PRD 19.1.3)",
      },
    });

    return { success: true };
  },
};
