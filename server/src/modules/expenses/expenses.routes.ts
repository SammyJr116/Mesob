import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { Role } from "@prisma/client";
import { expensesService, ExpenseError } from "./expenses.service.js";
import { authenticate, requireRole } from "../../middleware/rbac.js";

export async function expensesRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authenticate);

  /**
   * GET /api/v1/expenses - List expenses
   */
  app.get(
    "/",
    { preHandler: requireRole(Role.MANAGER, Role.ADMIN, Role.INVENTORY) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const caller = (request as any).user;
      const query = request.query as any;
      const expenses = await expensesService.listExpenses(caller, query);
      return reply.send({ expenses });
    }
  );

  /**
   * POST /api/v1/expenses - Create expense
   */
  app.post(
    "/",
    { preHandler: requireRole(Role.MANAGER, Role.ADMIN, Role.INVENTORY) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const caller = (request as any).user;
      try {
        const expense = await expensesService.createExpense(caller, request.body as any);
        return reply.status(201).send({ expense });
      } catch (err: any) {
        if (err instanceof ExpenseError) {
          return reply.status(err.statusCode).send({ error: err.message });
        }
        throw err;
      }
    }
  );

  /**
   * PATCH /api/v1/expenses/:id - Manager edits expense (PRD 17.2.2)
   */
  app.patch(
    "/:id",
    { preHandler: requireRole(Role.MANAGER, Role.ADMIN) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const caller = (request as any).user;
      try {
        const expense = await expensesService.updateExpense(caller, id, request.body as any);
        return reply.send({ expense });
      } catch (err: any) {
        if (err instanceof ExpenseError) {
          return reply.status(err.statusCode).send({ error: err.message });
        }
        throw err;
      }
    }
  );

  /**
   * PATCH /api/v1/expenses/:id/confirm - Manager confirms recurring expense (PRD 17.3.2)
   */
  app.patch(
    "/:id/confirm",
    { preHandler: requireRole(Role.MANAGER, Role.ADMIN) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const caller = (request as any).user;
      const { amount } = (request.body as any) || {};
      try {
        const expense = await expensesService.confirmExpense(caller, id, amount ? Number(amount) : undefined);
        return reply.send({ expense });
      } catch (err: any) {
        if (err instanceof ExpenseError) {
          return reply.status(err.statusCode).send({ error: err.message });
        }
        throw err;
      }
    }
  );

  /**
   * DELETE /api/v1/expenses/:id - Hard block deletion (PRD 4.6.1, 17.2.2)
   */
  app.delete(
    "/:id",
    { preHandler: requireRole(Role.MANAGER, Role.ADMIN, Role.INVENTORY) },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      return reply.status(403).send({
        error: "Expenses are permanent financial records and cannot be deleted (PRD 17.2.2, 4.6.1)",
      });
    }
  );

  /**
   * Templates endpoints (PRD 17.3)
   */
  app.get(
    "/templates",
    { preHandler: requireRole(Role.MANAGER, Role.ADMIN) },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      const templates = await expensesService.listTemplates();
      return reply.send({ templates });
    }
  );

  app.post(
    "/templates",
    { preHandler: requireRole(Role.MANAGER, Role.ADMIN) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const template = await expensesService.createTemplate(request.body as any);
        return reply.status(201).send({ template });
      } catch (err: any) {
        if (err instanceof ExpenseError) {
          return reply.status(err.statusCode).send({ error: err.message });
        }
        throw err;
      }
    }
  );

  app.patch(
    "/templates/:id",
    { preHandler: requireRole(Role.MANAGER, Role.ADMIN) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const template = await expensesService.updateTemplate(id, request.body as any);
      return reply.send({ template });
    }
  );

  app.delete(
    "/templates/:id",
    { preHandler: requireRole(Role.MANAGER, Role.ADMIN) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      await expensesService.deleteTemplate(id);
      return reply.send({ success: true });
    }
  );
}
