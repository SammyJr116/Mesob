import { prisma } from "../../lib/prisma.js";
import { Role } from "@prisma/client";

export class SettingsError extends Error {
  constructor(message: string, public statusCode: number = 400) {
    super(message);
    this.name = "SettingsError";
  }
}

export const settingsService = {
  /**
   * Ensure default settings singleton and payment methods exist
   */
  async getSettings() {
    let settings = await prisma.setting.findUnique({
      where: { id: "singleton" },
    });

    if (!settings) {
      settings = await prisma.setting.create({
        data: {
          id: "singleton",
          restaurantName: "Mesob Ethiopian Restaurant",
          tin: "0012345678",
          vatRate: 15.0,
          serviceChargeRate: 10.0,
          closingTime: "04:00",
          delayedTicketMinutes: 20,
          lowStockThreshold: 5,
          inventoryTracking: true,
          currentBusinessDate: "2026-10-08",
          currency: "ETB",
          address: "Bole Medhanialem, Addis Ababa, Ethiopia",
          phone: "+251 11 661 2345",
          email: "contact@mesob.et",
          invoiceFooter: "Thank you for dining at Mesob!",
        },
      });
    }

    // Ensure default payment methods exist (PRD 5.3)
    const count = await prisma.paymentMethodConfig.count();
    if (count === 0) {
      await prisma.paymentMethodConfig.createMany({
        data: [
          { name: "Cash", referenceRequired: false, isActive: true, orderIndex: 1 },
          { name: "Telebirr", referenceRequired: true, isActive: true, orderIndex: 2 },
          { name: "CBE Birr", referenceRequired: true, isActive: true, orderIndex: 3 },
          { name: "Card", referenceRequired: false, isActive: true, orderIndex: 4 },
        ],
      });
    }

    return settings;
  },

  /**
   * Update restaurant settings (Manager only, PRD 5.1)
   */
  async updateSettings(data: {
    restaurantName?: string;
    tin?: string;
    vatRate?: number;
    serviceChargeRate?: number;
    closingTime?: string;
    delayedTicketMinutes?: number;
    lowStockThreshold?: number;
    inventoryTracking?: boolean;
    address?: string;
    phone?: string;
    email?: string;
    invoiceFooter?: string;
  }, managerId: string) {
    const existing = await this.getSettings();

    const updateData: any = {};
    if (data.restaurantName !== undefined) updateData.restaurantName = data.restaurantName;
    if (data.tin !== undefined) updateData.tin = data.tin;
    if (data.vatRate !== undefined) updateData.vatRate = data.vatRate;
    if (data.serviceChargeRate !== undefined) updateData.serviceChargeRate = data.serviceChargeRate;
    if (data.closingTime !== undefined) updateData.closingTime = data.closingTime;
    if (data.delayedTicketMinutes !== undefined) updateData.delayedTicketMinutes = data.delayedTicketMinutes;
    if (data.lowStockThreshold !== undefined) updateData.lowStockThreshold = data.lowStockThreshold;
    if (data.inventoryTracking !== undefined) updateData.inventoryTracking = data.inventoryTracking;
    if (data.address !== undefined) updateData.address = data.address;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.invoiceFooter !== undefined) updateData.invoiceFooter = data.invoiceFooter;

    const updated = await prisma.setting.update({
      where: { id: "singleton" },
      data: updateData,
    });

    // PRD 5.1.1: Every change to tax rate, service charge and other listed settings is written to activity log
    const trackedKeys: Array<keyof typeof data> = [
      "vatRate",
      "serviceChargeRate",
      "tin",
      "closingTime",
      "inventoryTracking",
      "restaurantName",
    ];

    for (const key of trackedKeys) {
      if (data[key] !== undefined && (data as any)[key] !== (existing as any)[key]) {
        await prisma.activityLog.create({
          data: {
            userId: managerId,
            role: Role.MANAGER,
            action: `SETTING_CHANGE_${key.toUpperCase()}`,
            target: "Setting",
            targetId: "singleton",
            oldValue: String((existing as any)[key]),
            newValue: String((data as any)[key]),
            reason: `Manager updated setting ${key}`,
          },
        });
      }
    }

    return updated;
  },

  /**
   * List configured payment methods (PRD 5.3)
   */
  async listPaymentMethods() {
    await this.getSettings(); // ensures defaults seeded
    return prisma.paymentMethodConfig.findMany({
      orderBy: { orderIndex: "asc" },
    });
  },

  /**
   * Add payment method (Manager only, PRD 5.3.3)
   */
  async createPaymentMethod(data: { name: string; referenceRequired?: boolean }, managerId: string) {
    if (!data.name || !data.name.trim()) {
      throw new SettingsError("Payment method name is required", 400);
    }

    const name = data.name.trim();
    const existing = await prisma.paymentMethodConfig.findUnique({ where: { name } });
    if (existing) {
      throw new SettingsError(`Payment method '${name}' already exists`, 409);
    }

    const maxOrder = await prisma.paymentMethodConfig.aggregate({ _max: { orderIndex: true } });
    const orderIndex = (maxOrder._max.orderIndex || 0) + 1;

    const method = await prisma.paymentMethodConfig.create({
      data: {
        name,
        referenceRequired: data.referenceRequired ?? false, // PRD 5.3.3: defaults to reference optional
        orderIndex,
        isActive: true,
      },
    });

    await prisma.activityLog.create({
      data: {
        userId: managerId,
        role: Role.MANAGER,
        action: "PAYMENT_METHOD_CREATE",
        target: "PaymentMethodConfig",
        targetId: method.id,
        newValue: JSON.stringify(method),
        reason: `Added payment method ${name}`,
      },
    });

    return method;
  },

  /**
   * Update payment method (activate, deactivate, referenceRequired)
   */
  async updatePaymentMethod(id: string, data: {
    referenceRequired?: boolean;
    isActive?: boolean;
    orderIndex?: number;
  }, managerId: string) {
    const existing = await prisma.paymentMethodConfig.findUnique({ where: { id } });
    if (!existing) {
      throw new SettingsError("Payment method not found", 404);
    }

    const updated = await prisma.paymentMethodConfig.update({
      where: { id },
      data,
    });

    await prisma.activityLog.create({
      data: {
        userId: managerId,
        role: Role.MANAGER,
        action: "PAYMENT_METHOD_UPDATE",
        target: "PaymentMethodConfig",
        targetId: id,
        oldValue: JSON.stringify(existing),
        newValue: JSON.stringify(updated),
        reason: `Updated payment method ${existing.name}`,
      },
    });

    return updated;
  },
};
