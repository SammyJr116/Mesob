import { prisma } from "../../lib/prisma.js";
import { Role } from "@prisma/client";

export class CustomerError extends Error {
  constructor(message: string, public statusCode: number = 400) {
    super(message);
    this.name = "CustomerError";
  }
}

/**
 * Normalizes Ethiopian phone numbers:
 * 0911223344 -> +251911223344
 * 251911223344 -> +251911223344
 * +251911223344 -> +251911223344
 */
export function normalizePhone(raw: string): string {
  if (!raw) return "";
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("0")) {
    return "+251" + digits.slice(1);
  } else if (digits.startsWith("251")) {
    return "+" + digits;
  }
  return raw.trim();
}

export const customersService = {
  /**
   * Fast auto-complete lookup by phone prefix or name (PRD 12.1, 12.3)
   */
  async lookup(query: string) {
    if (!query || query.trim().length < 2) {
      return [];
    }
    const q = query.trim();
    const normalized = normalizePhone(q);

    return prisma.customer.findMany({
      where: {
        isArchived: false,
        OR: [
          { phone: { contains: q } },
          { phone: { contains: normalized } },
          { name: { contains: q } },
        ],
      },
      take: 10,
      orderBy: { updatedAt: "desc" },
    });
  },

  /**
   * List customers with aggregated stats (total spend, visits, last visit)
   */
  async listCustomers(options: { search?: string; includeArchived?: boolean } = {}) {
    const where: any = {};
    if (!options.includeArchived) {
      where.isArchived = false;
    }

    if (options.search) {
      const s = options.search.trim();
      const norm = normalizePhone(s);
      where.OR = [
        { name: { contains: s } },
        { phone: { contains: s } },
        { phone: { contains: norm } },
        { email: { contains: s } },
      ];
    }

    const customers = await prisma.customer.findMany({
      where,
      include: {
        orders: {
          select: {
            id: true,
            total: true,
            createdAt: true,
            status: true,
          },
        },
        reservations: {
          select: {
            id: true,
            date: true,
            time: true,
            status: true,
            createdAt: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    return customers.map((c: any) => {
      // Calculate total spend from orders
      const totalSpend = c.orders?.reduce((sum: number, o: any) => {
        return sum + Number(o.total || 0);
      }, 0) || 0;

      // Determine last visit date
      const dates = [
        ...(c.orders || []).map((o: any) => new Date(o.createdAt).getTime()),
        ...(c.reservations || []).map((r: any) => new Date(r.createdAt).getTime()),
      ];
      const lastVisit = dates.length > 0 ? new Date(Math.max(...dates)).toISOString() : null;

      return {
        id: c.id,
        name: c.name,
        phone: c.phone,
        email: c.email,
        notes: c.notes,
        isArchived: c.isArchived,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        ordersCount: c.orders?.length || 0,
        reservationsCount: c.reservations?.length || 0,
        totalSpend: Math.round(totalSpend * 100) / 100,
        lastVisit,
      };
    });
  },

  /**
   * Get customer details with full history
   */
  async getCustomerById(id: string) {
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        orders: {
          include: {
            tables: {
              include: {
                table: true,
              },
            },
            invoice: true,
          },
          orderBy: { createdAt: "desc" },
          take: 20,
        },
        reservations: {
          include: {
            tables: {
              include: {
                table: true,
              },
            },
          },
          orderBy: { date: "desc" },
          take: 20,
        },
      },
    });

    if (!customer) {
      throw new CustomerError("Customer not found", 404);
    }

    const totalSpend = (customer as any).orders?.reduce((sum: number, o: any) => {
      return sum + Number(o.total || 0);
    }, 0) || 0;

    return {
      ...customer,
      totalSpend: Math.round(totalSpend * 100) / 100,
      ordersCount: (customer as any).orders?.length || 0,
      reservationsCount: (customer as any).reservations?.length || 0,
    };
  },

  /**
   * Create or find customer (auto-match by normalized phone, PRD 12.2)
   */
  async createCustomer(data: { name: string; phone: string; email?: string; notes?: string }) {
    if (!data.name || !data.phone) {
      throw new CustomerError("Name and phone number are required (PRD 12.1.1)", 400);
    }

    const normalizedPhone = normalizePhone(data.phone);

    // Check if customer with this normalized phone already exists
    const existing = await prisma.customer.findFirst({
      where: {
        OR: [
          { phone: data.phone.trim() },
          { phone: normalizedPhone },
        ],
      },
    });

    if (existing) {
      // If customer exists but has empty name, fill it in (PRD 12.2.2)
      if (!existing.name || existing.name.trim() === "") {
        return prisma.customer.update({
          where: { id: existing.id },
          data: {
            name: data.name.trim(),
            notes: data.notes ? (existing.notes ? `${existing.notes}\n${data.notes}` : data.notes) : existing.notes,
          },
        });
      }
      return existing;
    }

    return prisma.customer.create({
      data: {
        name: data.name.trim(),
        phone: normalizedPhone,
        email: data.email?.trim() || null,
        notes: data.notes?.trim() || null,
      },
    });
  },

  /**
   * Update customer record (PRD 12.3)
   */
  async updateCustomer(id: string, data: { name?: string; phone?: string; email?: string; notes?: string }) {
    const existing = await prisma.customer.findUnique({ where: { id } });
    if (!existing) {
      throw new CustomerError("Customer not found", 404);
    }

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name.trim();
    if (data.email !== undefined) updateData.email = data.email?.trim() || null;
    if (data.notes !== undefined) updateData.notes = data.notes?.trim() || null;
    if (data.phone !== undefined) {
      const normalized = normalizePhone(data.phone);
      if (normalized !== existing.phone) {
        const phoneTaken = await prisma.customer.findUnique({ where: { phone: normalized } });
        if (phoneTaken && phoneTaken.id !== id) {
          throw new CustomerError("Another customer already has this phone number", 409);
        }
        updateData.phone = normalized;
      }
    }

    return prisma.customer.update({
      where: { id },
      data: updateData,
    });
  },

  /**
   * Merge customer profiles transaction (PRD 12.4, Manager only)
   */
  async mergeCustomers(sourceCustomerId: string, targetCustomerId: string, managerId: string) {
    if (sourceCustomerId === targetCustomerId) {
      throw new CustomerError("Cannot merge customer profile into itself", 400);
    }

    const source = await prisma.customer.findUnique({ where: { id: sourceCustomerId } });
    const target = await prisma.customer.findUnique({ where: { id: targetCustomerId } });

    if (!source) throw new CustomerError("Source customer not found", 404);
    if (!target) throw new CustomerError("Target customer not found", 404);

    return prisma.$transaction(async (tx) => {
      // 1. Re-point orders from source to target
      await tx.order.updateMany({
        where: { customerId: sourceCustomerId },
        data: { customerId: targetCustomerId },
      });

      // 2. Re-point reservations from source to target
      await tx.reservation.updateMany({
        where: { customerId: sourceCustomerId },
        data: { customerId: targetCustomerId },
      });

      // 3. Append notes
      const appendedNote = `[Merged from ${source.name} (${source.phone})]: ${source.notes || "No notes"}`;
      const mergedNotes = target.notes ? `${target.notes}\n\n${appendedNote}` : appendedNote;

      const updatedTarget = await tx.customer.update({
        where: { id: targetCustomerId },
        data: { notes: mergedNotes },
      });

      // 4. Archive source customer (PRD 4.6.3: customers are archive-only)
      await tx.customer.update({
        where: { id: sourceCustomerId },
        data: { isArchived: true },
      });

      // 5. Activity log
      await tx.activityLog.create({
        data: {
          userId: managerId,
          role: Role.MANAGER,
          action: "CUSTOMER_MERGE",
          target: "Customer",
          targetId: targetCustomerId,
          reason: `Merged customer ${source.name} (${source.phone}) into ${target.name} (${target.phone})`,
        },
      });

      return updatedTarget;
    });
  },
};
