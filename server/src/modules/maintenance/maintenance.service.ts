import { prisma } from "../../lib/prisma.js";
import { Role } from "@prisma/client";

export class MaintenanceError extends Error {
  constructor(message: string, public statusCode: number = 400) {
    super(message);
    this.name = "MaintenanceError";
  }
}

export const maintenanceService = {
  /**
   * List maintenance requests with scoping:
   * - Manager/Admin: sees all requests
   * - Other staff: sees only what they reported or what is assigned to them
   */
  async listRequests(user: { id: string; role: Role }, query: {
    status?: string;
    priority?: string;
    assetId?: string;
    search?: string;
  }) {
    const where: any = {};

    if (user.role !== Role.MANAGER && user.role !== Role.ADMIN) {
      where.OR = [
        { reportedById: user.id },
        { assignedTo: user.id },
      ];
    }

    if (query.status && query.status !== "All") where.status = query.status;
    if (query.priority && query.priority !== "All") where.priority = query.priority;
    if (query.assetId) where.assetId = query.assetId;

    if (query.search) {
      const searchConditions = [
        { problem: { contains: query.search } },
        { description: { contains: query.search } },
        { assetName: { contains: query.search } },
        { assignedTo: { contains: query.search } },
      ];
      if (where.OR) {
        where.AND = [{ OR: where.OR }, { OR: searchConditions }];
        delete where.OR;
      } else {
        where.OR = searchConditions;
      }
    }

    return prisma.maintenanceRequest.findMany({
      where,
      include: { asset: true },
      orderBy: [{ createdAt: "desc" }],
    });
  },

  /**
   * Any staff can report an issue (PRD 18.2.1)
   */
  async createRequest(user: { id: string; role: Role }, data: {
    assetId?: string;
    problem: string;
    description: string;
    priority?: string;
  }) {
    if (!data.problem || !data.problem.trim()) {
      throw new MaintenanceError("Problem title is required", 400);
    }
    if (!data.description || !data.description.trim()) {
      throw new MaintenanceError("Description is required", 400);
    }

    let assetName: string | null = null;
    if (data.assetId) {
      const asset = await prisma.asset.findUnique({ where: { id: data.assetId } });
      if (asset) assetName = asset.name;
    }

    const priority = ["Low", "Medium", "High", "Critical"].includes(data.priority || "")
      ? data.priority!
      : "Medium";

    const request = await prisma.maintenanceRequest.create({
      data: {
        assetId: data.assetId || null,
        assetName: assetName || (data.assetId ? null : "Facility / General"),
        problem: data.problem.trim(),
        description: data.description.trim(),
        priority,
        status: "Reported",
        reportedById: user.id,
      },
      include: { asset: true },
    });

    return request;
  },

  /**
   * Manager updates/assigns/resolves request (PRD 18.2.2, 18.3, 18.6)
   */
  async updateRequest(user: { id: string; role: Role }, id: string, data: Partial<{
    assignedTo: string;
    vendorPhone: string;
    status: string;
    cost: number;
    resolutionNotes: string;
  }>) {
    const existing = await prisma.maintenanceRequest.findUnique({ where: { id } });
    if (!existing) throw new MaintenanceError("Maintenance request not found", 404);

    const isCompleting = data.status === "Completed" && existing.status !== "Completed";

    const updated = await prisma.maintenanceRequest.update({
      where: { id },
      data: {
        ...(data.assignedTo !== undefined && { assignedTo: data.assignedTo?.trim() || null }),
        ...(data.vendorPhone !== undefined && { vendorPhone: data.vendorPhone?.trim() || null }),
        ...(data.status && { status: data.status }),
        ...(data.cost !== undefined && { cost: data.cost }),
        ...(data.resolutionNotes !== undefined && { resolutionNotes: data.resolutionNotes?.trim() || null }),
        ...(isCompleting && { resolvedAt: new Date() }),
      },
      include: { asset: true },
    });

    // If cost recorded, log to activity
    if (data.cost !== undefined && data.cost > 0) {
      await prisma.activityLog.create({
        data: {
          userId: user.id,
          role: user.role,
          action: "Recorded maintenance cost",
          target: existing.problem,
          newValue: `${data.cost} ETB`,
          reason: data.resolutionNotes || "Maintenance work completed",
        },
      });
    }

    return updated;
  },

  /**
   * Manager deletes maintenance request (PRD 18.7.1):
   * Deletion ONLY allowed if cost === 0.
   */
  async deleteRequest(user: { id: string; role: Role }, id: string) {
    const existing = await prisma.maintenanceRequest.findUnique({ where: { id } });
    if (!existing) throw new MaintenanceError("Maintenance request not found", 404);

    if (Number(existing.cost) > 0) {
      throw new MaintenanceError(
        "Cannot delete maintenance requests with recorded costs. Archive only (PRD 18.7.1).",
        400
      );
    }

    await prisma.maintenanceRequest.delete({ where: { id } });

    await prisma.activityLog.create({
      data: {
        userId: user.id,
        role: user.role,
        action: "Deleted maintenance request",
        target: existing.problem,
        reason: "Manager deleted cost-free maintenance request",
      },
    });

    return { success: true };
  },

  /**
   * Preventive Maintenance Templates (PRD 18.5)
   */
  async listPreventiveTemplates() {
    return prisma.preventiveMaintenanceTemplate.findMany({
      include: { asset: true },
      orderBy: { nextDueDate: "asc" },
    });
  },

  async createPreventiveTemplate(data: {
    assetId: string;
    taskName: string;
    frequencyDays: number;
    assignedTo?: string;
    vendorPhone?: string;
    nextDueDate: string;
  }) {
    if (!data.assetId || !data.taskName) {
      throw new MaintenanceError("Asset and task name are required", 400);
    }

    return prisma.preventiveMaintenanceTemplate.create({
      data: {
        assetId: data.assetId,
        taskName: data.taskName.trim(),
        frequencyDays: data.frequencyDays || 30,
        assignedTo: data.assignedTo?.trim() || null,
        vendorPhone: data.vendorPhone?.trim() || null,
        nextDueDate: new Date(data.nextDueDate),
        isActive: true,
      },
      include: { asset: true },
    });
  },

  async updatePreventiveTemplate(id: string, data: Partial<{
    taskName: string;
    frequencyDays: number;
    assignedTo: string;
    vendorPhone: string;
    nextDueDate: string;
    isActive: boolean;
  }>) {
    return prisma.preventiveMaintenanceTemplate.update({
      where: { id },
      data: {
        ...(data.taskName && { taskName: data.taskName.trim() }),
        ...(data.frequencyDays && { frequencyDays: data.frequencyDays }),
        ...(data.assignedTo !== undefined && { assignedTo: data.assignedTo?.trim() || null }),
        ...(data.vendorPhone !== undefined && { vendorPhone: data.vendorPhone?.trim() || null }),
        ...(data.nextDueDate && { nextDueDate: new Date(data.nextDueDate) }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
      include: { asset: true },
    });
  },

  async deletePreventiveTemplate(id: string) {
    return prisma.preventiveMaintenanceTemplate.delete({ where: { id } });
  },
};
