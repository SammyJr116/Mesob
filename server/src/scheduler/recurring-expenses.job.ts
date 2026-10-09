import { prisma } from "../lib/prisma.js";
import { expensesService } from "../modules/expenses/expenses.service.js";
import { emitNotification } from "../ws/gateway.js";

export const recurringExpensesJob = {
  async run() {
    try {
      const today = new Date();
      const todayStr = today.toISOString().split("T")[0]; // YYYY-MM-DD
      const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
      const dayOfMonth = today.getDate(); // 1 - 31

      const templates = await prisma.recurringExpenseTemplate.findMany({
        where: { isActive: true },
      });

      for (const t of templates) {
        let isDue = false;
        if (t.period.toLowerCase() === "weekly" && t.dayOfWeek === dayOfWeek) {
          isDue = true;
        } else if (t.period.toLowerCase() === "monthly" && t.dayOfMonth === dayOfMonth) {
          isDue = true;
        }

        if (isDue) {
          // Check if already created today
          const existing = await prisma.expense.findFirst({
            where: {
              category: t.category,
              description: t.description,
              date: todayStr,
            },
          });

          if (!existing) {
            const expenseNumber = await expensesService.getNextExpenseNumber();
            const expense = await prisma.expense.create({
              data: {
                expenseNumber,
                category: t.category,
                amount: t.amount,
                description: t.description,
                date: todayStr,
                status: "Pending confirmation",
                recordedById: "system",
              },
            });

            // Emit notification to Manager
            emitNotification("room:manager", {
              title: "Recurring Expense Pending",
              message: `Recurring expense ${t.category} (${t.amount} ETB) requires confirmation`,
              eventType: "expense:pending",
              playSound: false,
              link: "/expenses",
            });

            console.log(`[Recurring Expenses] Created pending expense: ${expense.expenseNumber} for ${t.description}`);
          }
        }
      }
    } catch (err) {
      console.error("[Recurring Expenses Job] Error running job:", err);
    }
  },
};
