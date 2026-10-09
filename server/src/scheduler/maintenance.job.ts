import { prisma } from "../lib/prisma.js";
import { emitNotification } from "../ws/gateway.js";

export const maintenanceJob = {
  async run() {
    try {
      const now = new Date();
      const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      // 1. Warranty Alerts (PRD 18.4)
      const expiringAssets = await prisma.asset.findMany({
        where: {
          warrantyExpiryDate: {
            gte: now,
            lte: in30Days,
          },
          status: { not: "Retired" },
        },
      });

      for (const asset of expiringAssets) {
        const daysLeft = Math.ceil(
          (asset.warrantyExpiryDate!.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );
        emitNotification("room:manager", {
          title: "Asset Warranty Expiring",
          message: `Asset ${asset.name} (${asset.location}) warranty expires in ${daysLeft} days`,
          eventType: "asset:warranty_expiring",
          playSound: false,
          link: "/maintenance",
        });
      }

      // 2. Preventive Maintenance Request Generator (PRD 18.5)
      const dueTemplates = await prisma.preventiveMaintenanceTemplate.findMany({
        where: {
          isActive: true,
          nextDueDate: { lte: now },
        },
        include: { asset: true },
      });

      for (const t of dueTemplates) {
        // Auto-create request
        await prisma.maintenanceRequest.create({
          data: {
            assetId: t.assetId,
            assetName: t.asset.name,
            problem: `[Preventive] ${t.taskName}`,
            description: `Automated preventive maintenance generated from template for ${t.asset.name} (${t.asset.location}).`,
            priority: "Medium",
            status: t.assignedTo ? "Assigned" : "Reported",
            reportedById: "system",
            assignedTo: t.assignedTo,
            vendorPhone: t.vendorPhone,
          },
        });

        // Advance next due date
        const nextDate = new Date(now.getTime() + t.frequencyDays * 24 * 60 * 60 * 1000);
        await prisma.preventiveMaintenanceTemplate.update({
          where: { id: t.id },
          data: { nextDueDate: nextDate },
        });

        emitNotification("room:manager", {
          title: "Preventive Maintenance Generated",
          message: `Created scheduled maintenance request for ${t.asset.name}: ${t.taskName}`,
          eventType: "maintenance:preventive_created",
          playSound: false,
          link: "/maintenance",
        });

        console.log(`[Maintenance Job] Generated preventive request for asset: ${t.asset.name}`);
      }
    } catch (err) {
      console.error("[Maintenance Job] Error running job:", err);
    }
  },
};
