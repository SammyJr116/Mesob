import { FastifyInstance } from "fastify";
import { z } from "zod";
import { employeesService, EmployeeError } from "./employees.service.js";
import { requireRole } from "../../middleware/rbac.js";
import { Role } from "@prisma/client";

const createEmployeeSchema = z.object({
  name: z.string().min(1, "Name is required"),
  role: z.string().min(1, "Role/position is required"),
  phone: z.string().min(1, "Phone is required"),
  email: z.string().email().optional().or(z.literal("")),
  nationalId: z.string().optional().or(z.literal("")),
  department: z.string().optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  emergencyContactName: z.string().optional().or(z.literal("")),
  emergencyContactPhone: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
  status: z.enum(["Active", "On Leave", "Terminated", "Inactive"]).optional(),
  joinedDate: z.string().optional(),
});

const updateEmployeeSchema = createEmployeeSchema.partial();

export async function employeesRoutes(app: FastifyInstance) {
  /**
   * GET /api/v1/employees
   * List and search employees (Manager & Admin)
   */
  app.get(
    "/",
    { preHandler: [requireRole(Role.MANAGER, Role.ADMIN)] },
    async (request, reply) => {
      const query = request.query as any;
      const employees = await employeesService.listEmployees(query);
      return reply.send({ employees });
    }
  );

  /**
   * GET /api/v1/employees/:id
   * Get single employee
   */
  app.get(
    "/:id",
    { preHandler: [requireRole(Role.MANAGER, Role.ADMIN)] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const employee = await employeesService.getEmployeeById(id);
        return reply.send({ employee });
      } catch (err: any) {
        if (err instanceof EmployeeError) {
          return reply.status(err.statusCode).send({ error: err.message });
        }
        throw err;
      }
    }
  );

  /**
   * POST /api/v1/employees
   * Create employee (Manager only, PRD 6.1)
   */
  app.post(
    "/",
    { preHandler: [requireRole(Role.MANAGER)] },
    async (request, reply) => {
      try {
        const parsed = createEmployeeSchema.safeParse(request.body);
        if (!parsed.success) {
          return reply.status(400).send({
            error: "Validation Error",
            message: parsed.error.issues[0]?.message || "Invalid input",
          });
        }

        const caller = request.user as { id: string; role: Role };
        const employee = await employeesService.createEmployee(parsed.data, caller.id);
        return reply.status(201).send({ employee });
      } catch (err: any) {
        if (err instanceof EmployeeError) {
          return reply.status(err.statusCode).send({ error: err.message });
        }
        throw err;
      }
    }
  );

  /**
   * PATCH /api/v1/employees/:id
   * Update employee (Manager only)
   */
  app.patch(
    "/:id",
    { preHandler: [requireRole(Role.MANAGER)] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const parsed = updateEmployeeSchema.safeParse(request.body);
        if (!parsed.success) {
          return reply.status(400).send({
            error: "Validation Error",
            message: parsed.error.issues[0]?.message || "Invalid input",
          });
        }

        const caller = request.user as { id: string; role: Role };
        const employee = await employeesService.updateEmployee(id, parsed.data, caller.id);
        return reply.send({ employee });
      } catch (err: any) {
        if (err instanceof EmployeeError) {
          return reply.status(err.statusCode).send({ error: err.message });
        }
        throw err;
      }
    }
  );

  /**
   * DELETE /api/v1/employees/:id
   * Delete unreferenced employee (Manager only, PRD 4.6.1)
   */
  app.delete(
    "/:id",
    { preHandler: [requireRole(Role.MANAGER)] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const caller = request.user as { id: string; role: Role };
        await employeesService.deleteEmployee(id, caller.id);
        return reply.send({ success: true, message: "Employee deleted successfully" });
      } catch (err: any) {
        if (err instanceof EmployeeError) {
          return reply.status(err.statusCode).send({ error: err.message });
        }
        throw err;
      }
    }
  );
}
