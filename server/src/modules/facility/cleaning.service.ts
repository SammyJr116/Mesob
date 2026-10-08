import { prisma } from "../../lib/prisma.js";
import { Role } from "@prisma/client";
import { emitTableUpdated, emitTableCleaning } from "../../ws/gateway.js";

export class CleaningError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = "CleaningError";
    this.statusCode = statusCode;
  }
}

export class CleaningService {
  /**
   * Lists cleaning tasks with optional filters
   */
  async listTasks(filters: { status?: string; area?: string; assignedToId?: string }) {
    const where: any = {};
    if (filters.status) where.status = filters.status;
    if (filters.area) where.area = filters.area;
    if (filters.assignedToId) where.assignedToId = filters.assignedToId;

    return prisma.cleaningTask.findMany({
      where,
      include: {
        table: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Creates a cleaning task (PRD 14.2)
   */
  async createTask(data: {
    area: string;
    description?: string;
    tableId?: string;
    assignedToId?: string;
    dueTime?: Date;
    source?: string;
  }) {
    const task = await prisma.cleaningTask.create({
      data: {
        area: data.area,
        description: data.description,
        tableId: data.tableId,
        assignedToId: data.assignedToId,
        dueTime: data.dueTime,
        source: data.source || "Manual",
        status: "Pending",
      },
      include: { table: true },
    });

    if (data.tableId && task.table) {
      emitTableCleaning(task.table, task);
    }

    return task;
  }

  /**
   * Cleaner starts a task, assigning self if unassigned (PRD 14.3.2)
   */
  async startTask(id: string, cleanerId: string) {
    const task = await prisma.cleaningTask.findUnique({ where: { id } });
    if (!task) throw new CleaningError("Task not found", 404);

    return prisma.cleaningTask.update({
      where: { id },
      data: {
        status: "In Progress",
        assignedToId: task.assignedToId || cleanerId,
      },
      include: { table: true },
    });
  }

  /**
   * Cleaner completes task (PRD 14.4.1, 14.6.2)
   */
  async completeTask(id: string, caller: { id: string; role: Role }) {
    const task = await prisma.cleaningTask.findUnique({ where: { id }, include: { table: true } });
    if (!task) throw new CleaningError("Task not found", 404);

    const updatedTask = await prisma.cleaningTask.update({
      where: { id },
      data: {
        status: "Completed",
        completedAt: new Date(),
      },
      include: { table: true },
    });

    return updatedTask;
  }

  /**
   * Waiter or Manager marks table Available (PRD 14.6.2)
   * Enforces that cleaner must complete table-clean task before waiter can mark Available.
   * Manager can override.
   */
  async markTableAvailable(tableId: string, caller: { id: string; role: Role }) {
    const table = await prisma.table.findUnique({ where: { id: tableId } });
    if (!table) throw new CleaningError("Table not found", 404);

    if (table.status === "Cleaning") {
      // Check active uncompleted cleaning tasks for this table
      const pendingTask = await prisma.cleaningTask.findFirst({
        where: {
          tableId,
          status: { in: ["Pending", "In Progress"] },
        },
      });

      if (pendingTask) {
        if (caller.role !== Role.MANAGER && caller.role !== Role.ADMIN) {
          throw new CleaningError(
            "Waiter cannot mark table Available before cleaner completes cleaning task (PRD 14.6.2)",
            403
          );
        }

        // Manager override: close task and log (PRD 14.6.2)
        await prisma.cleaningTask.update({
          where: { id: pendingTask.id },
          data: { status: "Completed", completedAt: new Date() },
        });

        const userExists = caller.id ? await prisma.user.findUnique({ where: { id: caller.id } }) : null;
        await prisma.activityLog.create({
          data: {
            userId: userExists ? caller.id : null,
            role: caller.role,
            action: "TABLE_CLEANING_OVERRIDE",
            target: "Table",
            targetId: table.id,
            reason: `Manager override closed cleaning task #${pendingTask.id} and marked table ${table.number} Available`,
          },
        });
      }
    }

    const updatedTable = await prisma.table.update({
      where: { id: tableId },
      data: { status: "Available" },
    });

    emitTableUpdated(updatedTable);
    return updatedTable;
  }
}

export const cleaningService = new CleaningService();
