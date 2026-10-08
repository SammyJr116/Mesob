import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { Role } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { inventoryService, InventoryError } from "./inventory.service.js";
import { authenticate, requireRole } from "../../middleware/rbac.js";

interface StockCountLineInput {
  inventoryItemId: string;
  countedQuantity: number;
  reason?: string;
}

interface StockCountInput {
  notes?: string;
  lines: StockCountLineInput[];
}

export async function stockCountRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authenticate);

  /**
   * POST /api/v1/inventory/counts - Stock Count Reconciliation Endpoint (PRD 15.5)
   */
  app.post(
    "/counts",
    { preHandler: requireRole(Role.MANAGER, Role.INVENTORY, Role.ADMIN) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const caller = (request as any).user;
      const body = request.body as StockCountInput;

      if (!body.lines || !Array.isArray(body.lines) || body.lines.length === 0) {
        return reply.status(400).send({ error: "Stock count requires at least one item line (PRD 15.5)" });
      }

      // Read variance threshold from settings (default 10% per PRD 5.7)
      const settings = await prisma.setting.findUnique({ where: { id: "singleton" } });
      const varianceThreshold = 10.0; // 10%

      const result = await prisma.$transaction(async (tx: any) => {
        // 1. Create StockCount header
        const stockCount = await tx.stockCount.create({
          data: {
            countedById: caller.id,
            notes: body.notes?.trim() || null,
          },
        });

        const createdLines: any[] = [];
        const highVarianceAlerts: any[] = [];

        // 2. Process each line
        for (const line of body.lines) {
          const item = await tx.inventoryItem.findUnique({
            where: { id: line.inventoryItemId },
          });

          if (!item) {
            throw new InventoryError(`Item with ID ${line.inventoryItemId} not found`, 404);
          }

          const expectedQty = Number(item.currentStock);
          const countedQty = Number(line.countedQuantity);
          const variance = countedQty - expectedQty;

          // Calculate variance percentage
          let variancePercent = 0;
          if (expectedQty !== 0) {
            variancePercent = Math.abs((variance / expectedQty) * 100);
          } else if (countedQty !== 0) {
            variancePercent = 100;
          }

          // Create count line
          const countLine = await tx.stockCountLine.create({
            data: {
              stockCountId: stockCount.id,
              inventoryItemId: item.id,
              expectedQuantity: expectedQty,
              countedQuantity: countedQty,
              variance: variance,
              reason: line.reason?.trim() || null,
            },
          });
          createdLines.push(countLine);

          // If there is a discrepancy, reconcile stock & create adjustment movement
          if (variance !== 0) {
            await tx.inventoryItem.update({
              where: { id: item.id },
              data: { currentStock: countedQty },
            });

            await tx.stockMovement.create({
              data: {
                inventoryItemId: item.id,
                type: "Adjustment",
                quantity: variance,
                balanceAfter: countedQty,
                reason: line.reason?.trim() || `Stock count reconciliation (Count #${stockCount.id})`,
                referenceId: stockCount.id,
                userId: caller.id,
              },
            });

            // PRD 15.5.2: Flag variances above threshold in Activity Log
            if (variancePercent > varianceThreshold) {
              const userExists = caller.id ? await tx.user.findUnique({ where: { id: caller.id } }) : null;
              await tx.activityLog.create({
                data: {
                  userId: userExists ? caller.id : null,
                  role: caller.role,
                  action: "STOCK_COUNT_HIGH_VARIANCE",
                  target: "InventoryItem",
                  targetId: item.id,
                  oldValue: String(expectedQty),
                  newValue: String(countedQty),
                  reason: `Variance of ${variancePercent.toFixed(1)}% exceeded threshold ${varianceThreshold}% (${variance > 0 ? "+" : ""}${variance} ${item.baseUnit})`,
                },
              });

              highVarianceAlerts.push({
                item: item.name,
                expected: expectedQty,
                counted: countedQty,
                variancePercent: variancePercent.toFixed(1),
              });
            }
          }
        }

        return { stockCount, lines: createdLines, highVarianceAlerts };
      });

      // Post-transaction: update auto-availability for each counted item
      for (const line of body.lines) {
        await inventoryService.checkAndSyncAutoAvailability(line.inventoryItemId);
      }

      return reply.status(201).send(result);
    }
  );

  /**
   * GET /api/v1/inventory/counts - List stock count history
   */
  app.get(
    "/counts",
    async (_request: FastifyRequest, reply: FastifyReply) => {
      const counts = await prisma.stockCount.findMany({
        include: {
          lines: {
            include: { inventoryItem: true },
          },
        },
        orderBy: { countedAt: "desc" },
        take: 50,
      });
      return reply.send({ counts });
    }
  );

  /**
   * GET /api/v1/inventory/counts/:id - Retrieve specific stock count details
   */
  app.get(
    "/counts/:id",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const count = await prisma.stockCount.findUnique({
        where: { id },
        include: {
          lines: {
            include: { inventoryItem: true },
          },
        },
      });

      if (!count) {
        return reply.status(404).send({ error: "Stock count not found" });
      }

      return reply.send({ count });
    }
  );
}
