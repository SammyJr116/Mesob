import { prisma } from "../../lib/prisma.js";
import { Role } from "@prisma/client";
import { inventoryService } from "../inventory/inventory.service.js";

export class RecipeError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = "RecipeError";
    this.statusCode = statusCode;
  }
}

export class RecipesService {
  /**
   * List all recipes
   */
  async listRecipes() {
    return prisma.recipe.findMany({
      include: {
        menuItem: true,
        lines: {
          include: { inventoryItem: true },
        },
      },
      orderBy: { menuItem: { name: "asc" } },
    });
  }

  /**
   * Get recipe for specific menu item
   */
  async getRecipeByMenuItem(menuItemId: string) {
    const recipe = await prisma.recipe.findUnique({
      where: { menuItemId },
      include: {
        menuItem: true,
        lines: {
          include: { inventoryItem: true },
        },
      },
    });
    return recipe;
  }

  /**
   * Upsert recipe and lines for a menu item (PRD 7.9)
   * Allowed: Manager and Kitchen (PRD 7.9.4)
   */
  async upsertRecipe(
    menuItemId: string,
    data: {
      yieldPortions?: number;
      notes?: string;
      lines: Array<{
        inventoryItemId: string;
        quantity: number;
        unit?: string;
      }>;
    },
    caller: { id: string; role: Role }
  ) {
    if (caller.role !== Role.MANAGER && caller.role !== Role.KITCHEN && caller.role !== Role.ADMIN) {
      throw new RecipeError("Only Manager and Kitchen staff can create or edit recipes (PRD 7.9.4)", 403);
    }

    const menuItem = await prisma.menuItem.findUnique({ where: { id: menuItemId } });
    if (!menuItem) throw new RecipeError("Menu item not found", 404);

    if (!data.lines || data.lines.length === 0) {
      throw new RecipeError("A recipe requires at least one ingredient line (PRD 7.9.1)", 400);
    }

    // Validate inventory items and quantities
    const validatedLines: Array<{ inventoryItemId: string; quantity: number; unit: string }> = [];
    for (const line of data.lines) {
      const item = await prisma.inventoryItem.findUnique({ where: { id: line.inventoryItemId } });
      if (!item) {
        throw new RecipeError(`Inventory item ${line.inventoryItemId} not found`, 404);
      }
      const qty = Number(line.quantity);
      if (isNaN(qty) || qty <= 0) {
        throw new RecipeError(`Invalid quantity for ingredient ${item.name}`, 400);
      }
      // PRD 7.9.3: Recipes always use the item's base unit
      validatedLines.push({
        inventoryItemId: item.id,
        quantity: qty,
        unit: line.unit || item.baseUnit,
      });
    }

    const result = await prisma.$transaction(async (tx: any) => {
      // Find or create Recipe
      const existingRecipe = await tx.recipe.findUnique({ where: { menuItemId } });

      let recipe;
      if (existingRecipe) {
        // Delete existing lines and re-create
        await tx.recipeLine.deleteMany({ where: { recipeId: existingRecipe.id } });

        recipe = await tx.recipe.update({
          where: { id: existingRecipe.id },
          data: {
            yieldPortions: data.yieldPortions || 1,
            notes: data.notes?.trim() || null,
            lines: {
              create: validatedLines,
            },
          },
          include: { lines: { include: { inventoryItem: true } }, menuItem: true },
        });
      } else {
        recipe = await tx.recipe.create({
          data: {
            menuItemId,
            yieldPortions: data.yieldPortions || 1,
            notes: data.notes?.trim() || null,
            lines: {
              create: validatedLines,
            },
          },
          include: { lines: { include: { inventoryItem: true } }, menuItem: true },
        });
      }

      // Log recipe edit in ActivityLog (PRD 7.9.4)
      const userExists = caller.id ? await tx.user.findUnique({ where: { id: caller.id } }) : null;
      await tx.activityLog.create({
        data: {
          userId: userExists ? caller.id : null,
          role: caller.role,
          action: "RECIPE_UPSERT",
          target: "MenuItem",
          targetId: menuItemId,
          newValue: `Recipe updated with ${validatedLines.length} ingredients`,
          reason: `Recipe modified by ${caller.role}`,
        },
      });

      return recipe;
    });

    // Post-transaction: recalculate auto-availability for this menu item
    for (const line of validatedLines) {
      await inventoryService.checkAndSyncAutoAvailability(line.inventoryItemId);
    }

    return result;
  }
}

export const recipesService = new RecipesService();
