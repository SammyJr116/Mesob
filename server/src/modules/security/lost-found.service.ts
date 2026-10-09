import { prisma } from "../../lib/prisma.js";
import { Role } from "@prisma/client";
import { SecurityError } from "./visitors.service.js";

export const lostFoundService = {
  async listItems(query: { status?: string; search?: string }) {
    const where: any = {};
    if (query.status && query.status !== "All") where.status = query.status;
    if (query.search) {
      where.OR = [
        { itemDescription: { contains: query.search } },
        { locationFound: { contains: query.search } },
        { claimantName: { contains: query.search } },
      ];
    }
    return prisma.lostFoundItem.findMany({
      where,
      orderBy: { foundAt: "desc" },
    });
  },

  async recordItem(user: { id: string; role: Role }, data: {
    itemDescription: string;
    locationFound: string;
    foundAt?: string;
  }) {
    if (!data.itemDescription || !data.itemDescription.trim()) {
      throw new SecurityError("Item description is required", 400);
    }
    if (!data.locationFound || !data.locationFound.trim()) {
      throw new SecurityError("Location found is required", 400);
    }

    return prisma.lostFoundItem.create({
      data: {
        itemDescription: data.itemDescription.trim(),
        locationFound: data.locationFound.trim(),
        foundAt: data.foundAt ? new Date(data.foundAt) : new Date(),
        status: "Found",
        recordedById: user.id,
      },
    });
  },

  async claimItem(user: { id: string; role: Role }, id: string, data: {
    claimantName: string;
    claimantPhone: string;
  }) {
    const existing = await prisma.lostFoundItem.findUnique({ where: { id } });
    if (!existing) throw new SecurityError("Item not found", 404);
    if (existing.status === "Claimed") throw new SecurityError("Item already claimed", 400);

    if (!data.claimantName || !data.claimantName.trim()) {
      throw new SecurityError("Claimant name is required", 400);
    }
    if (!data.claimantPhone || !data.claimantPhone.trim()) {
      throw new SecurityError("Claimant phone is required", 400);
    }

    return prisma.lostFoundItem.update({
      where: { id },
      data: {
        status: "Claimed",
        claimantName: data.claimantName.trim(),
        claimantPhone: data.claimantPhone.trim(),
        claimedAt: new Date(),
      },
    });
  },

  async deleteItem(user: { id: string; role: Role }, id: string) {
    const existing = await prisma.lostFoundItem.findUnique({ where: { id } });
    if (!existing) throw new SecurityError("Item not found", 404);

    await prisma.lostFoundItem.delete({ where: { id } });

    await prisma.activityLog.create({
      data: {
        userId: user.id,
        role: user.role,
        action: "Deleted lost-and-found item",
        target: existing.itemDescription,
        reason: "Manager deleted item (PRD 19.3.3)",
      },
    });

    return { success: true };
  },
};
