import { prisma } from "../../lib/prisma.js";
import { Role } from "@prisma/client";
import { emitLowStockAlert, emitItemAutoUnavailable, emitItemAutoAvailable } from "../../ws/gateway.js";

export class InventoryError extends Error {
  statusCode: number;
  details?: any;
  constructor(message: string, statusCode = 400, details?: any) {
    super(message);
    this.name = "InventoryError";
    this.statusCode = statusCode;
    this.details = details;
  }
}

export interface CreateInventoryItemInput {
  code: string;
  name: string;
  category: string;
  baseUnit: string;
  currentStock?: number;
  minimumStock?: number;
  reorderQuantity?: number;
  costPerUnit?: number;
  defaultSupplierId?: string;
  purchaseUnit?: string;
  conversionFactor?: number;
}

export class InventoryService {
  /**
   * Recalculates and synchronizes auto-availability for all menu items using this inventory item (PRD 7.7.3, 15.8.2)
   */
  async checkAndSyncAutoAvailability(inventoryItemId: string) {
    const settings = await prisma.setting.findUnique({ where: { id: "singleton" } });
    if (!settings?.inventoryTracking) {
      return;
    }

    // Find all recipes that use this inventory item
    const recipeLines = await prisma.recipeLine.findMany({
      where: { inventoryItemId },
      include: {
        recipe: {
          include: {
            menuItem: true,
            lines: {
              include: {
                inventoryItem: true,
              },
            },
          },
        },
      },
    });

    for (const rl of recipeLines) {
      const recipe = rl.recipe;
      const menuItem = recipe.menuItem;
      if (!menuItem) continue;

      // Check if ANY ingredient for this recipe has stock less than 1 portion (PRD 7.7.3)
      let canMakeOnePortion = true;
      for (const line of recipe.lines) {
        const requiredQty = Number(line.quantity);
        const currentStock = Number(line.inventoryItem.currentStock);
        if (currentStock < requiredQty) {
          canMakeOnePortion = false;
          break;
        }
      }

      if (!canMakeOnePortion && menuItem.autoAvailable) {
        // Stock short -> flag unavailable automatically (PRD 15.8.2)
        const updated = await prisma.menuItem.update({
          where: { id: menuItem.id },
          data: { autoAvailable: false },
        });
        emitItemAutoUnavailable(updated);
      } else if (canMakeOnePortion && !menuItem.autoAvailable) {
        // Restocked -> clear auto flag (PRD 7.7.4)
        const updated = await prisma.menuItem.update({
          where: { id: menuItem.id },
          data: { autoAvailable: true },
        });
        emitItemAutoAvailable(updated);
      }
    }
  }

  /**
   * Lists inventory items with optional filters
   */
  async getInventoryItems(query: { category?: string; lowStock?: boolean; search?: string }) {
    const where: any = {};
    if (query.category) {
      where.category = query.category;
    }
    if (query.search) {
      where.OR = [
        { name: { contains: query.search } },
        { code: { contains: query.search } },
      ];
    }

    const items = await prisma.inventoryItem.findMany({
      where,
      include: {
        defaultSupplier: true,
      },
      orderBy: { name: "asc" },
    });

    if (query.lowStock) {
      return items.filter((item: any) => Number(item.currentStock) <= Number(item.minimumStock));
    }

    return items;
  }

  /**
   * Retrieves an inventory item by ID with supplier, recipe usages and recent movements
   */
  async getInventoryItemById(id: string) {
    const item = await prisma.inventoryItem.findUnique({
      where: { id },
      include: {
        defaultSupplier: true,
        movements: {
          orderBy: { happenedAt: "desc" },
          take: 50,
        },
        recipeLines: {
          include: {
            recipe: {
              include: {
                menuItem: true,
              },
            },
          },
        },
      },
    });

    if (!item) throw new InventoryError("Inventory item not found", 404);
    return item;
  }

  /**
   * Creates an inventory item
   */
  async createInventoryItem(input: CreateInventoryItemInput, caller: { id: string; role: Role }) {
    const existing = await prisma.inventoryItem.findUnique({ where: { code: input.code } });
    if (existing) {
      throw new InventoryError(`Item with code "${input.code}" already exists`, 400);
    }

    const currentStock = input.currentStock ?? 0;

    const item = await prisma.inventoryItem.create({
      data: {
        code: input.code,
        name: input.name,
        category: input.category,
        baseUnit: input.baseUnit,
        currentStock,
        minimumStock: input.minimumStock ?? 0,
        reorderQuantity: input.reorderQuantity ?? 0,
        costPerUnit: input.costPerUnit ?? 0,
        defaultSupplierId: input.defaultSupplierId,
        purchaseUnit: input.purchaseUnit,
        conversionFactor: input.conversionFactor ?? 1,
      },
    });

    if (currentStock > 0) {
      await prisma.stockMovement.create({
        data: {
          inventoryItemId: item.id,
          type: "Adjustment",
          quantity: currentStock,
          balanceAfter: currentStock,
          reason: "Initial opening stock",
          userId: caller.id,
        },
      });
    }

    await this.checkAndSyncAutoAvailability(item.id);
    return item;
  }

  /**
   * Updates an inventory item
   */
  async updateInventoryItem(id: string, input: Partial<CreateInventoryItemInput>, caller: { id: string; role: Role }) {
    const existing = await prisma.inventoryItem.findUnique({ where: { id } });
    if (!existing) throw new InventoryError("Item not found", 404);

    const updated = await prisma.inventoryItem.update({
      where: { id },
      data: {
        name: input.name,
        category: input.category,
        baseUnit: input.baseUnit,
        minimumStock: input.minimumStock !== undefined ? input.minimumStock : undefined,
        reorderQuantity: input.reorderQuantity !== undefined ? input.reorderQuantity : undefined,
        costPerUnit: input.costPerUnit !== undefined ? input.costPerUnit : undefined,
        defaultSupplierId: input.defaultSupplierId !== undefined ? input.defaultSupplierId : undefined,
        purchaseUnit: input.purchaseUnit !== undefined ? input.purchaseUnit : undefined,
        conversionFactor: input.conversionFactor !== undefined ? input.conversionFactor : undefined,
      },
      include: { defaultSupplier: true },
    });

    await this.checkAndSyncAutoAvailability(id);
    return updated;
  }

  /**
   * Manual stock adjustment (PRD 15.4.3, PRD 4.11.12)
   */
  async adjustStock(
    input: { inventoryItemId: string; quantity: number; reason: string },
    caller: { id: string; role: Role }
  ) {
    if (!input.reason || !input.reason.trim()) {
      throw new InventoryError("Adjustment reason is required (PRD 15.4.3)", 400);
    }

    const item = await prisma.inventoryItem.findUnique({ where: { id: input.inventoryItemId } });
    if (!item) throw new InventoryError("Item not found", 404);

    const adjustmentQty = Number(input.quantity);
    if (isNaN(adjustmentQty) || adjustmentQty === 0) {
      throw new InventoryError("Valid non-zero adjustment quantity is required", 400);
    }

    const newStock = Number(item.currentStock) + adjustmentQty;

    // Rule 4.11.12: Manual stock issues cannot make stock negative without Manager permission
    if (newStock < 0 && caller.role !== Role.MANAGER && caller.role !== Role.ADMIN) {
      throw new InventoryError(
        "Manual stock adjustment cannot make stock negative without Manager approval (PRD 4.11.12)",
        403
      );
    }

    const updated = await prisma.inventoryItem.update({
      where: { id: item.id },
      data: { currentStock: newStock },
    });

    const movement = await prisma.stockMovement.create({
      data: {
        inventoryItemId: item.id,
        type: "Adjustment",
        quantity: adjustmentQty,
        balanceAfter: newStock,
        reason: input.reason.trim(),
        userId: caller.id,
      },
    });

    // Activity log if negative or significant adjustment
    if (newStock < 0 || Math.abs(adjustmentQty) > 50) {
      const userExists = caller.id ? await prisma.user.findUnique({ where: { id: caller.id } }) : null;
      await prisma.activityLog.create({
        data: {
          userId: userExists ? caller.id : null,
          role: caller.role,
          action: "STOCK_ADJUSTMENT",
          target: "InventoryItem",
          targetId: item.id,
          oldValue: String(item.currentStock),
          newValue: String(newStock),
          reason: input.reason.trim(),
        },
      });
    }

    // Check low stock
    if (newStock <= Number(updated.minimumStock)) {
      emitLowStockAlert(updated);
    }

    await this.checkAndSyncAutoAvailability(item.id);

    return { item: updated, movement };
  }

  /**
   * Records waste record and decrements stock (PRD 15.7)
   */
  async recordWaste(
    input: { inventoryItemId: string; quantity: number; unit: string; reason: string; ticketItemId?: string },
    caller: { id: string; role: Role }
  ) {
    if (!input.reason) throw new InventoryError("Waste reason is required (PRD 15.7.1)", 400);
    const wasteQty = Number(input.quantity);
    if (isNaN(wasteQty) || wasteQty <= 0) {
      throw new InventoryError("Waste quantity must be greater than zero", 400);
    }

    const item = await prisma.inventoryItem.findUnique({ where: { id: input.inventoryItemId } });
    if (!item) throw new InventoryError("Item not found", 404);

    const newStock = Number(item.currentStock) - wasteQty;

    const wasteRecord = await prisma.wasteRecord.create({
      data: {
        inventoryItemId: item.id,
        quantity: wasteQty,
        unit: input.unit || item.baseUnit,
        reason: input.reason,
        reportedById: caller.id,
        ticketItemId: input.ticketItemId,
      },
    });

    const updated = await prisma.inventoryItem.update({
      where: { id: item.id },
      data: { currentStock: newStock },
    });

    const movement = await prisma.stockMovement.create({
      data: {
        inventoryItemId: item.id,
        type: "Waste",
        quantity: -wasteQty,
        balanceAfter: newStock,
        reason: `Waste: ${input.reason}`,
        referenceId: wasteRecord.id,
        userId: caller.id,
      },
    });

    if (newStock <= Number(updated.minimumStock)) {
      emitLowStockAlert(updated);
    }

    await this.checkAndSyncAutoAvailability(item.id);

    return { wasteRecord, movement, item: updated };
  }

  /**
   * Readiness checklist before enabling inventory tracking (PRD 15.1.3)
   */
  async getReadinessChecklist() {
    const openingCountsCount = await prisma.stockCount.count();
    const hasOpeningCount = openingCountsCount > 0;

    // Check all Active menu items have a recipe with at least one ingredient line
    const activeMenuItems = await prisma.menuItem.findMany({
      where: { status: "Active" },
      include: {
        recipe: {
          include: { lines: true },
        },
      },
    });

    const missingRecipes = activeMenuItems.filter(
      (m: any) => !m.recipe || m.recipe.lines.length === 0
    );

    // Check all recipe lines have base unit
    const allRecipeLines = await prisma.recipeLine.findMany({
      include: { inventoryItem: true },
    });
    const missingUnits = allRecipeLines.filter((l: any) => !l.unit || !l.inventoryItem?.baseUnit);

    const isReady = hasOpeningCount && missingRecipes.length === 0 && missingUnits.length === 0;

    return {
      isReady,
      hasOpeningCount,
      missingRecipes: missingRecipes.map((m: any) => ({ id: m.id, name: m.name })),
      missingUnitsCount: missingUnits.length,
    };
  }

  /**
   * Toggles inventory tracking setting with readiness check (PRD 15.1)
   */
  async toggleInventoryTracking(enabled: boolean, caller: { id: string; role: Role }) {
    if (caller.role !== Role.MANAGER && caller.role !== Role.ADMIN) {
      throw new InventoryError("Only Manager can change inventory tracking (PRD 5.1.1, 15.1.4)", 403);
    }

    if (enabled) {
      const readiness = await this.getReadinessChecklist();
      if (!readiness.isReady) {
        throw new InventoryError(
          "Cannot enable inventory tracking: readiness checklist not met (PRD 15.1.3)",
          400,
          readiness
        );
      }
    }

    const updated = await prisma.setting.update({
      where: { id: "singleton" },
      data: { inventoryTracking: enabled },
    });

    const userExists = caller.id ? await prisma.user.findUnique({ where: { id: caller.id } }) : null;
    await prisma.activityLog.create({
      data: {
        userId: userExists ? caller.id : null,
        role: caller.role,
        action: "INVENTORY_TRACKING_TOGGLE",
        target: "Setting",
        targetId: "singleton",
        oldValue: String(!enabled),
        newValue: String(enabled),
        reason: `Manager switched inventory tracking to ${enabled ? "ON" : "OFF"}`,
      },
    });

    return updated;
  }

  /**
   * Stock movements query
   */
  async getStockMovements(query: { itemId?: string; type?: string; limit?: number }) {
    const where: any = {};
    if (query.itemId) where.inventoryItemId = query.itemId;
    if (query.type) where.type = query.type;

    return prisma.stockMovement.findMany({
      where,
      include: {
        inventoryItem: true,
      },
      orderBy: { happenedAt: "desc" },
      take: query.limit || 100,
    });
  }
}

export const inventoryService = new InventoryService();
