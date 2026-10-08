import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { Role } from "@prisma/client";
import { recipesService, RecipeError } from "./recipes.service.js";
import { authenticate, requireRole } from "../../middleware/rbac.js";

export async function recipesRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authenticate);

  /**
   * GET /api/v1/recipes - List all recipes
   */
  app.get(
    "/",
    async (_request: FastifyRequest, reply: FastifyReply) => {
      const recipes = await recipesService.listRecipes();
      return reply.send({ recipes });
    }
  );

  /**
   * GET /api/v1/recipes/menu-item/:menuItemId - Get recipe for menu item
   */
  app.get(
    "/menu-item/:menuItemId",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { menuItemId } = request.params as { menuItemId: string };
      const recipe = await recipesService.getRecipeByMenuItem(menuItemId);
      if (!recipe) {
        return reply.status(404).send({ error: "Recipe not configured for this menu item" });
      }
      return reply.send({ recipe });
    }
  );

  /**
   * PUT /api/v1/recipes/menu-item/:menuItemId - Upsert recipe for menu item (PRD 7.9.4: Manager and Kitchen)
   */
  app.put(
    "/menu-item/:menuItemId",
    { preHandler: requireRole(Role.MANAGER, Role.KITCHEN, Role.ADMIN) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { menuItemId } = request.params as { menuItemId: string };
      const caller = (request as any).user;
      try {
        const recipe = await recipesService.upsertRecipe(menuItemId, request.body as any, caller);
        return reply.send({ recipe });
      } catch (err: any) {
        if (err instanceof RecipeError) {
          return reply.status(err.statusCode).send({ error: err.message });
        }
        throw err;
      }
    }
  );
}
