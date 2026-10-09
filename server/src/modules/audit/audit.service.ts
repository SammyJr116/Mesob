import { prisma } from "../../lib/prisma.js";

export const auditService = {
  /**
   * List paginated activity logs with filtering (Manager only, PRD 4.8)
   */
  async listLogs(query: {
    page?: number;
    limit?: number;
    action?: string;
    role?: string;
    userId?: string;
    from?: string;
    to?: string;
    search?: string;
  }) {
    const page = Math.max(1, Number(query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(query.limit || 30)));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query.action) {
      where.action = { contains: query.action };
    }

    if (query.role) {
      where.role = query.role;
    }

    if (query.userId) {
      where.userId = query.userId;
    }

    if (query.from || query.to) {
      where.createdAt = {};
      if (query.from) {
        where.createdAt.gte = new Date(query.from);
      }
      if (query.to) {
        const toDate = new Date(query.to);
        toDate.setHours(23, 59, 59, 999);
        where.createdAt.lte = toDate;
      }
    }

    if (query.search) {
      const s = query.search.trim();
      where.OR = [
        { action: { contains: s } },
        { target: { contains: s } },
        { reason: { contains: s } },
        { user: { username: { contains: s } } },
      ];
    }

    const [logs, total] = await Promise.all([
      prisma.activityLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              username: true,
              email: true,
              role: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.activityLog.count({ where }),
    ]);

    return {
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  /**
   * Generate CSV format for activity logs (PRD 4.8)
   */
  async exportCsv(query: {
    action?: string;
    role?: string;
    userId?: string;
    from?: string;
    to?: string;
  }) {
    const where: any = {};
    if (query.action) where.action = { contains: query.action };
    if (query.role) where.role = query.role;
    if (query.userId) where.userId = query.userId;

    if (query.from || query.to) {
      where.createdAt = {};
      if (query.from) where.createdAt.gte = new Date(query.from);
      if (query.to) {
        const toDate = new Date(query.to);
        toDate.setHours(23, 59, 59, 999);
        where.createdAt.lte = toDate;
      }
    }

    const logs = await prisma.activityLog.findMany({
      where,
      include: {
        user: {
          select: { username: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 1000,
    });

    const headers = [
      "Timestamp",
      "User",
      "Role",
      "Action",
      "Target",
      "Target ID",
      "Old Value",
      "New Value",
      "Reason",
    ];

    const escapeCsv = (val: any) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = logs.map((log) => [
      log.createdAt.toISOString(),
      log.user?.username || "System",
      log.role,
      log.action,
      log.target,
      log.targetId || "",
      log.oldValue || "",
      log.newValue || "",
      log.reason || "",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((r) => r.map(escapeCsv).join(",")),
    ].join("\n");

    return csvContent;
  },
};
