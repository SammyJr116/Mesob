import { prisma } from "../../lib/prisma.js";

export class AssetError extends Error {
  constructor(message: string, public statusCode: number = 400) {
    super(message);
    this.name = "AssetError";
  }
}

export const assetsService = {
  async listAssets(query: { category?: string; status?: string; search?: string }) {
    const where: any = {};
    if (query.category && query.category !== "All") where.category = query.category;
    if (query.status && query.status !== "All") where.status = query.status;
    if (query.search) {
      where.OR = [
        { name: { contains: query.search } },
        { location: { contains: query.search } },
        { serialNumber: { contains: query.search } },
      ];
    }
    return prisma.asset.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });
  },

  async createAsset(data: {
    name: string;
    category: string;
    location: string;
    serialNumber?: string;
    purchaseDate?: string;
    warrantyExpiryDate?: string;
    notes?: string;
  }) {
    if (!data.name || !data.name.trim()) throw new AssetError("Asset name is required", 400);
    if (!data.category || !data.category.trim()) throw new AssetError("Category is required", 400);
    if (!data.location || !data.location.trim()) throw new AssetError("Location is required", 400);

    return prisma.asset.create({
      data: {
        name: data.name.trim(),
        category: data.category.trim(),
        location: data.location.trim(),
        serialNumber: data.serialNumber ? data.serialNumber.trim() : null,
        purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : null,
        warrantyExpiryDate: data.warrantyExpiryDate ? new Date(data.warrantyExpiryDate) : null,
        notes: data.notes ? data.notes.trim() : null,
        status: "Active",
      },
    });
  },

  async updateAsset(id: string, data: Partial<{
    name: string;
    category: string;
    location: string;
    serialNumber: string;
    purchaseDate: string;
    warrantyExpiryDate: string;
    status: string;
    notes: string;
  }>) {
    const existing = await prisma.asset.findUnique({ where: { id } });
    if (!existing) throw new AssetError("Asset not found", 404);

    return prisma.asset.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name.trim() }),
        ...(data.category && { category: data.category.trim() }),
        ...(data.location && { location: data.location.trim() }),
        ...(data.serialNumber !== undefined && { serialNumber: data.serialNumber?.trim() || null }),
        ...(data.purchaseDate !== undefined && { purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : null }),
        ...(data.warrantyExpiryDate !== undefined && { warrantyExpiryDate: data.warrantyExpiryDate ? new Date(data.warrantyExpiryDate) : null }),
        ...(data.status && { status: data.status }),
        ...(data.notes !== undefined && { notes: data.notes?.trim() || null }),
      },
    });
  },

  async retireAsset(id: string) {
    const existing = await prisma.asset.findUnique({ where: { id } });
    if (!existing) throw new AssetError("Asset not found", 404);

    return prisma.asset.update({
      where: { id },
      data: { status: "Retired" },
    });
  },
};
