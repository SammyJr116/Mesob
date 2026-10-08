import { prisma } from "../../lib/prisma.js";
import { Role } from "@prisma/client";
import { inventoryService } from "../inventory/inventory.service.js";

export class PurchaseError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = "PurchaseError";
    this.statusCode = statusCode;
  }
}

export class PurchasesService {
  /**
   * Generates continuous PO numbering (PO-0001, etc.)
   */
  async getNextPoNumber(): Promise<string> {
    const key = "PO";
    const seq = await prisma.numberSequence.upsert({
      where: { key },
      update: { nextValue: { increment: 1 } },
      create: { key, nextValue: 2 },
    });
    const num = seq.nextValue === 2 ? 1 : seq.nextValue - 1;
    return `PO-${String(num).padStart(4, "0")}`;
  }

  // ------------------------------------------------------------------
  // SUPPLIERS
  // ------------------------------------------------------------------

  async listSuppliers() {
    return prisma.supplier.findMany({
      include: { items: true },
      orderBy: { name: "asc" },
    });
  }

  async getSupplierById(id: string) {
    const supplier = await prisma.supplier.findUnique({
      where: { id },
      include: {
        items: true,
        purchases: {
          orderBy: { createdAt: "desc" },
          take: 20,
        },
      },
    });
    if (!supplier) throw new PurchaseError("Supplier not found", 404);
    return supplier;
  }

  async createSupplier(data: {
    name: string;
    contactPerson?: string;
    phone: string;
    email?: string;
    tin?: string;
    address?: string;
    paymentTerms?: string;
  }) {
    return prisma.supplier.create({
      data: {
        name: data.name,
        contactPerson: data.contactPerson,
        phone: data.phone,
        email: data.email,
        tin: data.tin,
        address: data.address,
        paymentTerms: data.paymentTerms || "Net 15",
      },
    });
  }

  async updateSupplier(id: string, data: any) {
    const existing = await prisma.supplier.findUnique({ where: { id } });
    if (!existing) throw new PurchaseError("Supplier not found", 404);

    return prisma.supplier.update({
      where: { id },
      data,
    });
  }

  // ------------------------------------------------------------------
  // PURCHASE REQUESTS & ORDERS
  // ------------------------------------------------------------------

  async listPurchases(filters: { status?: string; supplierId?: string }) {
    const where: any = {};
    if (filters.status) where.status = filters.status;
    if (filters.supplierId) where.supplierId = filters.supplierId;

    return prisma.purchaseRequest.findMany({
      where,
      include: {
        supplier: true,
        lines: {
          include: { inventoryItem: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async getPurchaseById(id: string) {
    const po = await prisma.purchaseRequest.findUnique({
      where: { id },
      include: {
        supplier: true,
        lines: {
          include: { inventoryItem: true },
        },
      },
    });
    if (!po) throw new PurchaseError("Purchase request not found", 404);
    return po;
  }

  /**
   * Creates a purchase request (PRD 16.2.1)
   */
  async createPurchase(
    input: {
      supplierId: string;
      status?: "Draft" | "Pending Approval";
      notes?: string;
      lines: Array<{
        inventoryItemId: string;
        orderedQuantity: number;
        unitPrice: number;
      }>;
    },
    caller: { id: string; role: Role }
  ) {
    if (!input.lines || input.lines.length === 0) {
      throw new PurchaseError("Purchase request requires at least one item line", 400);
    }

    const supplier = await prisma.supplier.findUnique({ where: { id: input.supplierId } });
    if (!supplier) throw new PurchaseError("Supplier not found", 404);

    const poNumber = await this.getNextPoNumber();

    let totalAmount = 0;
    const linesData = input.lines.map((l) => {
      const qty = Number(l.orderedQuantity);
      const price = Number(l.unitPrice);
      const lineTotal = qty * price;
      totalAmount += lineTotal;

      return {
        inventoryItemId: l.inventoryItemId,
        orderedQuantity: qty,
        unitPrice: price,
        lineTotal,
      };
    });

    const initialStatus = input.status || "Pending Approval";

    return prisma.purchaseRequest.create({
      data: {
        poNumber,
        supplierId: supplier.id,
        status: initialStatus,
        totalAmount,
        requestedById: caller.id,
        approvalNotes: input.notes,
        lines: {
          create: linesData,
        },
      },
      include: {
        supplier: true,
        lines: { include: { inventoryItem: true } },
      },
    });
  }

  /**
   * One-click Draft Purchase Request from Low Stock Alert (PRD 16.7)
   */
  async createDraftFromLowStock(inventoryItemId: string, caller: { id: string; role: Role }) {
    const item = await prisma.inventoryItem.findUnique({
      where: { id: inventoryItemId },
      include: { defaultSupplier: true },
    });

    if (!item) throw new PurchaseError("Inventory item not found", 404);

    let supplierId = item.defaultSupplierId;
    if (!supplierId) {
      const anySupplier = await prisma.supplier.findFirst({ where: { status: "Active" } });
      if (!anySupplier) {
        throw new PurchaseError("No active suppliers found. Please add a supplier first.", 400);
      }
      supplierId = anySupplier.id;
    }

    const poNumber = await this.getNextPoNumber();
    const orderedQuantity = Number(item.reorderQuantity) > 0 ? Number(item.reorderQuantity) : 10;
    const unitPrice = Number(item.costPerUnit) > 0 ? Number(item.costPerUnit) : 100;
    const lineTotal = orderedQuantity * unitPrice;

    return prisma.purchaseRequest.create({
      data: {
        poNumber,
        supplierId,
        status: "Draft",
        totalAmount: lineTotal,
        requestedById: caller.id,
        approvalNotes: `Auto-generated draft for low stock item: ${item.name}`,
        lines: {
          create: [
            {
              inventoryItemId: item.id,
              orderedQuantity,
              unitPrice,
              lineTotal,
            },
          ],
        },
      },
      include: {
        supplier: true,
        lines: { include: { inventoryItem: true } },
      },
    });
  }

  /**
   * Submits a Draft to Pending Approval (PRD 16.2.2)
   */
  async submitPurchase(id: string) {
    const po = await prisma.purchaseRequest.findUnique({ where: { id } });
    if (!po) throw new PurchaseError("Purchase request not found", 404);
    if (po.status !== "Draft") {
      throw new PurchaseError(`Cannot submit purchase request in status "${po.status}"`, 400);
    }

    return prisma.purchaseRequest.update({
      where: { id },
      data: { status: "Pending Approval" },
      include: { supplier: true, lines: true },
    });
  }

  /**
   * Manager approves purchase request (PRD 16.3.1)
   */
  async approvePurchase(id: string, caller: { id: string; role: Role }) {
    if (caller.role !== Role.MANAGER && caller.role !== Role.ADMIN) {
      throw new PurchaseError("Only the Manager can approve purchase requests (PRD 16.3.1)", 403);
    }

    const po = await prisma.purchaseRequest.findUnique({ where: { id } });
    if (!po) throw new PurchaseError("Purchase request not found", 404);

    if (po.status !== "Pending Approval" && po.status !== "Draft") {
      throw new PurchaseError(`Cannot approve purchase in status "${po.status}"`, 400);
    }

    return prisma.purchaseRequest.update({
      where: { id },
      data: {
        status: "Approved",
        approvedById: caller.id,
      },
      include: { supplier: true, lines: true },
    });
  }

  /**
   * Manager rejects purchase request with mandatory reason (PRD 16.2.2)
   */
  async rejectPurchase(id: string, reason: string, caller: { id: string; role: Role }) {
    if (caller.role !== Role.MANAGER && caller.role !== Role.ADMIN) {
      throw new PurchaseError("Only the Manager can reject purchase requests (PRD 16.2.2)", 403);
    }

    if (!reason || !reason.trim()) {
      throw new PurchaseError("A reason is required to reject a purchase request (PRD 16.2.2)", 400);
    }

    const po = await prisma.purchaseRequest.findUnique({ where: { id } });
    if (!po) throw new PurchaseError("Purchase request not found", 404);

    return prisma.purchaseRequest.update({
      where: { id },
      data: {
        status: "Rejected",
        approvedById: caller.id,
        approvalNotes: `Rejected: ${reason.trim()}`,
      },
      include: { supplier: true, lines: true },
    });
  }

  /**
   * Receives delivered goods, increments inventory stock and records movements (PRD 16.4)
   */
  async receiveDelivery(
    id: string,
    delivery: {
      deliveryDate?: string;
      invoiceReference?: string;
      lines: Array<{
        purchaseLineId: string;
        receivedQuantity: number;
        actualUnitPrice?: number;
      }>;
    },
    caller: { id: string; role: Role }
  ) {
    const po = await prisma.purchaseRequest.findUnique({
      where: { id },
      include: { lines: true, supplier: true },
    });

    if (!po) throw new PurchaseError("Purchase request not found", 404);

    if (po.status !== "Approved" && po.status !== "Partially Received") {
      throw new PurchaseError(`Cannot receive deliveries for PO in status "${po.status}" (must be Approved or Partially Received)`, 400);
    }

    if (!delivery.lines || delivery.lines.length === 0) {
      throw new PurchaseError("At least one received line must be provided", 400);
    }

    const deliveryTime = delivery.deliveryDate ? new Date(delivery.deliveryDate) : new Date();

    const affectedItemIds: string[] = [];

    await prisma.$transaction(async (tx: any) => {
      for (const delLine of delivery.lines) {
        const poLine = po.lines.find((l: any) => l.id === delLine.purchaseLineId);
        if (!poLine) continue;

        const deliveredQty = Number(delLine.receivedQuantity);
        if (deliveredQty <= 0) continue;

        const item = await tx.inventoryItem.findUnique({ where: { id: poLine.inventoryItemId } });
        if (!item) continue;

        const factor = Number(item.conversionFactor) || 1.0;
        const baseQtyToAdd = deliveredQty * factor;

        // 1. Update purchase line received qty
        await tx.purchaseRequestLine.update({
          where: { id: poLine.id },
          data: {
            receivedQuantity: { increment: deliveredQty },
          },
        });

        // 2. Increment inventory item stock
        const updatedItem = await tx.inventoryItem.update({
          where: { id: item.id },
          data: {
            currentStock: { increment: baseQtyToAdd },
            costPerUnit: delLine.actualUnitPrice ? Number(delLine.actualUnitPrice) : undefined,
          },
        });

        // 3. Record stock movement (PRD 15.4)
        await tx.stockMovement.create({
          data: {
            inventoryItemId: item.id,
            type: "Purchase",
            quantity: baseQtyToAdd,
            balanceAfter: updatedItem.currentStock,
            reason: `Purchase Receipt ${po.poNumber}${delivery.invoiceReference ? ` (Inv #${delivery.invoiceReference})` : ""}`,
            referenceId: po.id,
            userId: caller.id,
            happenedAt: deliveryTime,
          },
        });

        affectedItemIds.push(item.id);
      }

      // Check overall PO status after this receipt (PRD 16.4.3)
      const freshPo = await tx.purchaseRequest.findUnique({
        where: { id },
        include: { lines: true },
      });

      const allFulfilled = freshPo!.lines.every(
        (l: any) => Number(l.receivedQuantity) >= Number(l.orderedQuantity)
      );

      const nextStatus = allFulfilled ? "Received" : "Partially Received";

      await tx.purchaseRequest.update({
        where: { id },
        data: {
          status: nextStatus,
          deliveryDate: deliveryTime,
          invoiceReference: delivery.invoiceReference?.trim() || po.invoiceReference,
        },
      });
    });

    // Post-transaction: recalculate auto-availability for each restocked item (PRD 7.7.4)
    for (const itemId of affectedItemIds) {
      await inventoryService.checkAndSyncAutoAvailability(itemId);
    }

    return this.getPurchaseById(id);
  }

  /**
   * Finalizes completed purchase (PRD 16.2.2)
   */
  async completePurchase(id: string) {
    const po = await prisma.purchaseRequest.findUnique({ where: { id } });
    if (!po) throw new PurchaseError("Purchase request not found", 404);

    if (po.status !== "Received") {
      throw new PurchaseError(`Cannot complete purchase in status "${po.status}" (must be Received)`, 400);
    }

    return prisma.purchaseRequest.update({
      where: { id },
      data: { status: "Completed" },
    });
  }

  /**
   * Closes purchase short with mandatory reason (PRD 16.2.2)
   */
  async closePurchase(id: string, reason: string, caller: { id: string; role: Role }) {
    if (caller.role !== Role.MANAGER && caller.role !== Role.ADMIN) {
      throw new PurchaseError("Only the Manager can close short a purchase (PRD 16.2.2)", 403);
    }

    if (!reason || !reason.trim()) {
      throw new PurchaseError("A reason is required to close short a purchase (PRD 16.2.2)", 400);
    }

    const po = await prisma.purchaseRequest.findUnique({ where: { id } });
    if (!po) throw new PurchaseError("Purchase request not found", 404);

    return prisma.purchaseRequest.update({
      where: { id },
      data: {
        status: "Closed",
        approvalNotes: `Closed short: ${reason.trim()}`,
      },
    });
  }

  /**
   * Emergency Purchase (PRD 16.5)
   * Recorded afterwards without prior approval; immediately adds stock and flags for Manager review.
   */
  async recordEmergencyPurchase(
    input: {
      supplierName?: string;
      supplierId?: string;
      notes?: string;
      lines: Array<{
        inventoryItemId: string;
        quantity: number;
        unitPrice: number;
      }>;
    },
    caller: { id: string; role: Role }
  ) {
    if (!input.lines || input.lines.length === 0) {
      throw new PurchaseError("Emergency purchase requires at least one item line", 400);
    }

    let supplierId = input.supplierId;
    if (!supplierId) {
      // Find or create a generic / ad-hoc supplier record
      let supplier = await prisma.supplier.findFirst({
        where: { name: input.supplierName || "Emergency Vendor" },
      });
      if (!supplier) {
        supplier = await prisma.supplier.create({
          data: {
            name: input.supplierName || "Emergency Vendor",
            phone: "N/A",
            paymentTerms: "Immediate Cash",
          },
        });
      }
      supplierId = supplier.id;
    }

    const poNumber = await this.getNextPoNumber();

    let totalAmount = 0;
    const linesData = input.lines.map((l) => {
      const qty = Number(l.quantity);
      const price = Number(l.unitPrice);
      const lineTotal = qty * price;
      totalAmount += lineTotal;
      return {
        inventoryItemId: l.inventoryItemId,
        orderedQuantity: qty,
        receivedQuantity: qty,
        unitPrice: price,
        lineTotal,
      };
    });

    const affectedItemIds: string[] = [];

    const po = await prisma.$transaction(async (tx: any) => {
      const emergencyPo = await tx.purchaseRequest.create({
        data: {
          poNumber,
          supplierId: supplierId!,
          status: "Emergency - Received",
          isEmergency: true,
          isReviewed: false,
          totalAmount,
          requestedById: caller.id,
          deliveryDate: new Date(),
          approvalNotes: input.notes?.trim() || "Emergency purchase recorded without prior PO",
          lines: {
            create: linesData,
          },
        },
        include: { lines: true, supplier: true },
      });

      // Immediately increment inventory stock
      for (const line of input.lines) {
        const item = await tx.inventoryItem.findUnique({ where: { id: line.inventoryItemId } });
        if (!item) continue;

        const factor = Number(item.conversionFactor) || 1.0;
        const baseQtyToAdd = Number(line.quantity) * factor;

        const updated = await tx.inventoryItem.update({
          where: { id: item.id },
          data: {
            currentStock: { increment: baseQtyToAdd },
            costPerUnit: Number(line.unitPrice),
          },
        });

        await tx.stockMovement.create({
          data: {
            inventoryItemId: item.id,
            type: "Purchase",
            quantity: baseQtyToAdd,
            balanceAfter: updated.currentStock,
            reason: `Emergency Purchase: ${emergencyPo.poNumber}`,
            referenceId: emergencyPo.id,
            userId: caller.id,
          },
        });

        affectedItemIds.push(item.id);
      }

      // Log to Activity Log (PRD 4.8.2)
      const userExists = caller.id ? await tx.user.findUnique({ where: { id: caller.id } }) : null;
      await tx.activityLog.create({
        data: {
          userId: userExists ? caller.id : null,
          role: caller.role,
          action: "EMERGENCY_PURCHASE",
          target: "PurchaseRequest",
          targetId: emergencyPo.id,
          newValue: String(totalAmount),
          reason: input.notes?.trim() || "Emergency purchase recorded",
        },
      });

      return emergencyPo;
    });

    for (const itemId of affectedItemIds) {
      await inventoryService.checkAndSyncAutoAvailability(itemId);
    }

    return po;
  }

  /**
   * Manager reviews emergency purchase (PRD 16.5.2)
   */
  async reviewEmergencyPurchase(id: string, caller: { id: string; role: Role }) {
    if (caller.role !== Role.MANAGER && caller.role !== Role.ADMIN) {
      throw new PurchaseError("Only the Manager can mark emergency purchases as reviewed (PRD 16.5.2)", 403);
    }

    const po = await prisma.purchaseRequest.findUnique({ where: { id } });
    if (!po) throw new PurchaseError("Purchase request not found", 404);

    return prisma.purchaseRequest.update({
      where: { id },
      data: { isReviewed: true },
    });
  }
}

export const purchasesService = new PurchasesService();
