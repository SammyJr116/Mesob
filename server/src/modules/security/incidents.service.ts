import { prisma } from "../../lib/prisma.js";
import { Role } from "@prisma/client";
import { SecurityError } from "./visitors.service.js";

export const incidentsService = {
  async listIncidents(query: { status?: string; severity?: string; search?: string }) {
    const where: any = {};
    if (query.status && query.status !== "All") where.status = query.status;
    if (query.severity && query.severity !== "All") where.severity = query.severity;
    if (query.search) {
      where.OR = [
        { title: { contains: query.search } },
        { description: { contains: query.search } },
        { location: { contains: query.search } },
        { category: { contains: query.search } },
      ];
    }
    return prisma.incident.findMany({
      where,
      orderBy: { occurredAt: "desc" },
    });
  },

  async reportIncident(user: { id: string; role: Role }, data: {
    title: string;
    category: string;
    severity?: string;
    description: string;
    location: string;
    peopleInvolved?: string;
    occurredAt?: string;
  }) {
    if (!data.title || !data.title.trim()) throw new SecurityError("Incident title is required", 400);
    if (!data.description || !data.description.trim()) throw new SecurityError("Description is required", 400);
    if (!data.location || !data.location.trim()) throw new SecurityError("Location is required", 400);

    const severity = ["Low", "Medium", "High", "Critical"].includes(data.severity || "")
      ? data.severity!
      : "Low";

    return prisma.incident.create({
      data: {
        title: data.title.trim(),
        category: (data.category || "General").trim(),
        severity,
        description: data.description.trim(),
        location: data.location.trim(),
        peopleInvolved: data.peopleInvolved?.trim() || null,
        occurredAt: data.occurredAt ? new Date(data.occurredAt) : new Date(),
        status: "Reported",
        reportedById: user.id,
      },
    });
  },

  async reviewIncident(user: { id: string; role: Role }, id: string) {
    const existing = await prisma.incident.findUnique({ where: { id } });
    if (!existing) throw new SecurityError("Incident not found", 404);

    return prisma.incident.update({
      where: { id },
      data: { status: "Under Review" },
    });
  },

  async resolveIncident(user: { id: string; role: Role }, id: string, resolutionNotes: string) {
    const existing = await prisma.incident.findUnique({ where: { id } });
    if (!existing) throw new SecurityError("Incident not found", 404);

    if (!resolutionNotes || !resolutionNotes.trim()) {
      throw new SecurityError("Resolution notes are required to resolve an incident (PRD 19.2.3)", 400);
    }

    const updated = await prisma.incident.update({
      where: { id },
      data: {
        status: "Resolved",
        resolvedById: user.id,
        resolutionNotes: resolutionNotes.trim(),
        resolvedAt: new Date(),
      },
    });

    await prisma.activityLog.create({
      data: {
        userId: user.id,
        role: user.role,
        action: "Resolved incident",
        target: existing.title,
        oldValue: existing.status,
        newValue: "Resolved",
        reason: resolutionNotes.trim(),
      },
    });

    return updated;
  },
};
