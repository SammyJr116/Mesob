import { prisma } from "../../lib/prisma.js";
import { Role } from "@prisma/client";
import { inventoryService } from "./inventory.service.js";
import { emitLowStockAlert } from "../../ws/gateway.js";

export class DepletionService {
  /**
   * Depletes stock for all items in a served ticket (PRD 15.6)
   * Idempotent: Skips items already depleted.
   */
  async depleteStockForTicket(
    ticketId: string,
    caller: { id: string; role: Role }
  ): Promise<{ depleted: boolean; message: string; movements: any[] }> {
    // 1. Check if inventory tracking is active (PRD 15.1.2)
    const settings = await prisma.setting.findUnique({ where: { id: "singleton" } });
    if (!settings?.inventoryTracking) {
      return { depleted: false, message: "Inventory tracking is disabled", movements: [] };
    }

    // 2. Fetch ticket with non-cancelled items and recipes
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        order: true,
        items: {
          where: { status: { not: "Cancelled" } },
          include: {
            menuItem: {
              include: {
                recipe: {
                  include: {
                    lines: {
                      include: {
                        inventoryItem: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!ticket) {
      return { depleted: false, message: "Ticket not found", movements: [] };
    }

    const createdMovements: any[] = [];

    for (const item of ticket.items) {
      // Check idempotency: have we already logged Sale movements for this ticketItem?
      const existingMovement = await prisma.stockMovement.findFirst({
        where: {
          referenceId: item.id,
          type: "Sale",
        },
      });

      if (existingMovement) {
        continue; // Already depleted
      }

      const recipe = item.menuItem.recipe;
      if (!recipe || !recipe.lines || recipe.lines.length === 0) {
        continue; // No recipe configured
      }

      // Variant multiplier (PRD 15.6.1)
      let variantMultiplier = 1.0;
      if (item.variantId) {
        const variant = await prisma.itemVariant.findUnique({ where: { id: item.variantId } });
        if (variant && variant.recipeMultiplier) {
          variantMultiplier = Number(variant.recipeMultiplier);
        }
      }

      // For each ingredient line in the recipe:
      for (const line of recipe.lines) {
        const lineBaseQty = Number(line.quantity);
        const totalDeduct = lineBaseQty * variantMultiplier * item.quantity;

        if (totalDeduct <= 0) continue;

        // Atomically decrement current stock (may become negative per PRD 15.6.4)
        const updatedInventory = await prisma.inventoryItem.update({
          where: { id: line.inventoryItemId },
          data: {
            currentStock: {
              decrement: totalDeduct,
            },
          },
        });

        const newStock = Number(updatedInventory.currentStock);

        // Record stock movement (PRD 15.4)
        const movement = await prisma.stockMovement.create({
          data: {
            inventoryItemId: line.inventoryItemId,
            type: "Sale",
            quantity: -totalDeduct,
            balanceAfter: newStock,
            reason: `Order ${ticket.order.orderNumber} (Round ${ticket.roundNumber}) - ${item.menuItem.name}${
              item.variantName ? ` (${item.variantName})` : ""
            } x${item.quantity}`,
            referenceId: item.id,
            userId: caller.id,
          },
        });

        createdMovements.push(movement);

        // PRD 15.6.4: Automatic deduction may make stock negative; alert Manager/Inventory
        if (newStock < 0) {
          const userExists = caller.id ? await prisma.user.findUnique({ where: { id: caller.id } }) : null;
          await prisma.activityLog.create({
            data: {
              userId: userExists ? caller.id : null,
              role: caller.role,
              action: "NEGATIVE_STOCK_ALERT",
              target: "InventoryItem",
              targetId: line.inventoryItemId,
              oldValue: String(newStock + totalDeduct),
              newValue: String(newStock),
              reason: `Sale pushed stock below zero for item ${updatedInventory.name} (${newStock} ${updatedInventory.baseUnit})`,
            },
          });
        }

        // PRD 15.8.1: Check low stock alert threshold
        if (newStock <= Number(updatedInventory.minimumStock)) {
          emitLowStockAlert(updatedInventory);
        }

        // PRD 7.7.3 & 15.8.2: Synchronize auto-unavailability rule for affected menu items
        await inventoryService.checkAndSyncAutoAvailability(line.inventoryItemId);
      }
    }

    return {
      depleted: true,
      message: `Depleted stock for ${ticket.items.length} items (${createdMovements.length} ingredient deductions)`,
      movements: createdMovements,
    };
  }
}

export const depletionService = new DepletionService();
