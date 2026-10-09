import { prisma } from "../../lib/prisma.js";
import { Role } from "@prisma/client";

export class ExpenseError extends Error {
  constructor(message: string, public statusCode: number = 400) {
    super(message);
    this.name = "ExpenseError";
  }
}

export const expensesService = {
  /**
   * Auto-generate sequential expense number EXP-000001
   */
  async getNextExpenseNumber(): Promise<string> {
    const seq = await prisma.numberSequence.upsert({
      where: { key: "EXPENSE" },
      update: { nextValue: { increment: 1 } },
      create: { key: "EXPENSE", nextValue: 2 },
    });
    const val = seq.nextValue - 1;
    return `EXP-${String(val).padStart(6, "0")}`;
  },

  /**
   * List expenses with scoping:
   * - Manager/Admin: sees all expenses
   * - Inventory Staff: sees only own entries (PRD 17.2.1)
   */
  async listExpenses(user: { id: string; role: Role }, query: {
    from?: string;
    to?: string;
    category?: string;
    status?: string;
    search?: string;
  }) {
    const where: any = {};

    // RBAC Scoping
    if (user.role === Role.INVENTORY) {
      where.recordedById = user.id;
    }

    if (query.from || query.to) {
      where.date = {};
      if (query.from) where.date.gte = query.from;
      if (query.to) where.date.lte = query.to;
    }

    if (query.category && query.category !== "All") {
      where.category = query.category;
    }

    if (query.status && query.status !== "All") {
      where.status = query.status;
    }

    if (query.search) {
      where.OR = [
        { description: { contains: query.search } },
        { category: { contains: query.search } },
        { expenseNumber: { contains: query.search } },
      ];
    }

    return prisma.expense.findMany({
      where,
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    });
  },

  /**
   * Record new expense (PRD 17.1, 17.2)
   */
  async createExpense(user: { id: string; role: Role }, data: {
    category: string;
    amount: number;
    description: string;
    date: string;
    receiptUrl?: string;
  }) {
    if (!data.category || !data.category.trim()) {
      throw new ExpenseError("Category is required", 400);
    }
    if (data.category.toLowerCase().includes("emergency purchase")) {
      throw new ExpenseError("Emergency purchase cannot be recorded as an expense (PRD 16.5.3, 17.4.1)", 400);
    }
    if (!data.amount || Number(data.amount) <= 0) {
      throw new ExpenseError("Amount must be greater than 0", 400);
    }
    if (!data.description || !data.description.trim()) {
      throw new ExpenseError("Description is required", 400);
    }
    if (!data.date) {
      throw new ExpenseError("Date is required", 400);
    }

    const expenseNumber = await this.getNextExpenseNumber();

    const expense = await prisma.expense.create({
      data: {
        expenseNumber,
        category: data.category.trim(),
        amount: data.amount,
        description: data.description.trim(),
        date: data.date,
        receiptUrl: data.receiptUrl || null,
        status: "Confirmed",
        recordedById: user.id,
      },
    });

    // Audit log
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        role: user.role,
        action: "Recorded expense",
        target: expense.expenseNumber,
        newValue: `${expense.category}: ${expense.amount} ETB`,
        reason: expense.description,
      },
    });

    return expense;
  },

  /**
   * Manager updates an expense (PRD 17.2.2)
   */
  async updateExpense(user: { id: string; role: Role }, id: string, data: {
    category?: string;
    amount?: number;
    description?: string;
    date?: string;
    receiptUrl?: string;
  }) {
    const existing = await prisma.expense.findUnique({ where: { id } });
    if (!existing) {
      throw new ExpenseError("Expense not found", 404);
    }

    if (data.category && data.category.toLowerCase().includes("emergency purchase")) {
      throw new ExpenseError("Emergency purchase cannot be recorded as an expense", 400);
    }
    if (data.amount !== undefined && Number(data.amount) <= 0) {
      throw new ExpenseError("Amount must be greater than 0", 400);
    }

    const updated = await prisma.expense.update({
      where: { id },
      data: {
        ...(data.category && { category: data.category.trim() }),
        ...(data.amount !== undefined && { amount: data.amount }),
        ...(data.description && { description: data.description.trim() }),
        ...(data.date && { date: data.date }),
        ...(data.receiptUrl !== undefined && { receiptUrl: data.receiptUrl || null }),
      },
    });

    // Audit log edit
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        role: user.role,
        action: "Updated expense",
        target: existing.expenseNumber,
        oldValue: `${existing.category}: ${existing.amount} ETB`,
        newValue: `${updated.category}: ${updated.amount} ETB`,
        reason: data.description || "Manager updated expense details",
      },
    });

    return updated;
  },

  /**
   * Manager confirms a pending recurring expense (PRD 17.3.2)
   */
  async confirmExpense(user: { id: string; role: Role }, id: string, actualAmount?: number) {
    const existing = await prisma.expense.findUnique({ where: { id } });
    if (!existing) {
      throw new ExpenseError("Expense not found", 404);
    }

    const updated = await prisma.expense.update({
      where: { id },
      data: {
        status: "Confirmed",
        ...(actualAmount !== undefined && actualAmount > 0 && { amount: actualAmount }),
      },
    });

    await prisma.activityLog.create({
      data: {
        userId: user.id,
        role: user.role,
        action: "Confirmed recurring expense",
        target: existing.expenseNumber,
        oldValue: existing.status,
        newValue: "Confirmed",
        reason: `Confirmed with amount ${updated.amount} ETB`,
      },
    });

    return updated;
  },

  /**
   * Recurring Expense Templates (PRD 17.3)
   */
  async listTemplates() {
    return prisma.recurringExpenseTemplate.findMany({
      orderBy: { createdAt: "desc" },
    });
  },

  async createTemplate(data: {
    category: string;
    description: string;
    amount: number;
    period: string; // Weekly or Monthly
    dayOfWeek?: number;
    dayOfMonth?: number;
  }) {
    if (!data.category || !data.amount || !data.description || !data.period) {
      throw new ExpenseError("Category, description, amount and period are required", 400);
    }
    return prisma.recurringExpenseTemplate.create({
      data: {
        category: data.category.trim(),
        description: data.description.trim(),
        amount: data.amount,
        period: data.period,
        dayOfWeek: data.dayOfWeek ?? null,
        dayOfMonth: data.dayOfMonth ?? null,
        isActive: true,
      },
    });
  },

  async updateTemplate(id: string, data: Partial<{
    category: string;
    description: string;
    amount: number;
    period: string;
    dayOfWeek: number;
    dayOfMonth: number;
    isActive: boolean;
  }>) {
    return prisma.recurringExpenseTemplate.update({
      where: { id },
      data,
    });
  },

  async deleteTemplate(id: string) {
    return prisma.recurringExpenseTemplate.delete({
      where: { id },
    });
  },
};
