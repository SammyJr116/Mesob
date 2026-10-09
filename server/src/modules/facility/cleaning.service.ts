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
  async listTasks(filters: { status?: string; area?: string; assignedToId?: string; source?: string }) {
    const where: any = {};
    if (filters.status) where.status = filters.status;
    if (filters.area) where.area = filters.area;
    if (filters.assignedToId) where.assignedToId = filters.assignedToId;
    if (filters.source) where.source = filters.source;

    const tasks = await prisma.cleaningTask.findMany({
      where,
      include: {
        table: true,
        assignedTo: true,
        template: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const now = new Date();
    return tasks.map((t) => {
      const isOverdue = t.status !== "Completed" && t.dueTime ? new Date(t.dueTime) < now : false;
      return {
        ...t,
        isOverdue,
      };
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
    dueTime?: Date | string;
    source?: string;
    templateId?: string;
    notes?: string;
    photoUrl?: string;
  }) {
    const task = await prisma.cleaningTask.create({
      data: {
        area: data.area,
        description: data.description,
        tableId: data.tableId,
        assignedToId: data.assignedToId,
        dueTime: data.dueTime ? new Date(data.dueTime) : null,
        source: data.source || "Manual",
        templateId: data.templateId,
        notes: data.notes,
        photoUrl: data.photoUrl,
        status: "Pending",
      },
      include: {
        table: true,
        assignedTo: true,
        template: true,
      },
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
        startedAt: new Date(),
        assignedToId: task.assignedToId || cleanerId,
      },
      include: {
        table: true,
        assignedTo: true,
        template: true,
      },
    });
  }

  /**
   * Cleaner completes task (PRD 14.4.1, 14.6.2)
   */
  async completeTask(
    id: string,
    caller: { id: string; role: Role },
    data?: { notes?: string; photoUrl?: string }
  ) {
    const task = await prisma.cleaningTask.findUnique({ where: { id }, include: { table: true } });
    if (!task) throw new CleaningError("Task not found", 404);

    const updatedTask = await prisma.cleaningTask.update({
      where: { id },
      data: {
        status: "Completed",
        completedAt: new Date(),
        notes: data?.notes !== undefined ? data.notes : task.notes,
        photoUrl: data?.photoUrl !== undefined ? data.photoUrl : task.photoUrl,
      },
      include: {
        table: true,
        assignedTo: true,
        template: true,
      },
    });

    return updatedTask;
  }

  /**
   * Manager reassigns a cleaning task (PRD 14.3.3)
   */
  async reassignTask(id: string, assignedToId: string, caller: { id: string; role: Role }) {
    const task = await prisma.cleaningTask.findUnique({ where: { id } });
    if (!task) throw new CleaningError("Task not found", 404);

    const updated = await prisma.cleaningTask.update({
      where: { id },
      data: { assignedToId },
      include: {
        table: true,
        assignedTo: true,
        template: true,
      },
    });

    const userExists = caller.id ? await prisma.user.findUnique({ where: { id: caller.id } }) : null;
    await prisma.activityLog.create({
      data: {
        userId: userExists ? caller.id : null,
        role: caller.role,
        action: "CLEANING_TASK_REASSIGNED",
        target: "CleaningTask",
        targetId: task.id,
        reason: `Reassigned cleaning task #${task.id} (${task.area}) to employee ${assignedToId}`,
      },
    });

    return updated;
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

  // -------------------------------------------------------------
  // CLEANING TEMPLATES (PRD 14.2.1)
  // -------------------------------------------------------------

  async listTemplates() {
    return prisma.cleaningTemplate.findMany({
      include: { assignedTo: true },
      orderBy: { createdAt: "desc" },
    });
  }

  async createTemplate(data: {
    area: string;
    taskName: string;
    description?: string;
    frequency?: string;
    preferredTime?: string;
    assignedEmployeeId?: string;
  }) {
    if (!data.area || !data.taskName) {
      throw new CleaningError("Area and taskName are required", 400);
    }

    return prisma.cleaningTemplate.create({
      data: {
        area: data.area,
        taskName: data.taskName,
        description: data.description,
        frequency: data.frequency || "Daily",
        preferredTime: data.preferredTime,
        assignedEmployeeId: data.assignedEmployeeId,
      },
      include: { assignedTo: true },
    });
  }

  async updateTemplate(id: string, data: any) {
    const template = await prisma.cleaningTemplate.findUnique({ where: { id } });
    if (!template) throw new CleaningError("Template not found", 404);

    return prisma.cleaningTemplate.update({
      where: { id },
      data,
      include: { assignedTo: true },
    });
  }

  async deleteTemplate(id: string) {
    const template = await prisma.cleaningTemplate.findUnique({ where: { id } });
    if (!template) throw new CleaningError("Template not found", 404);

    return prisma.cleaningTemplate.delete({ where: { id } });
  }

  async runTemplate(id: string) {
    const template = await prisma.cleaningTemplate.findUnique({
      where: { id },
      include: { assignedTo: true },
    });
    if (!template) throw new CleaningError("Template not found", 404);

    // Calculate dueTime for today
    let dueTime: Date | null = null;
    if (template.preferredTime) {
      const [h, m] = template.preferredTime.split(":").map(Number);
      dueTime = new Date();
      dueTime.setHours(h || 12, m || 0, 0, 0);
    } else {
      dueTime = new Date(Date.now() + 4 * 3600 * 1000); // 4 hours from now
    }

    const task = await prisma.cleaningTask.create({
      data: {
        area: template.area,
        description: template.taskName + (template.description ? ` · ${template.description}` : ""),
        assignedToId: template.assignedEmployeeId,
        source: `Template · ${template.frequency}`,
        templateId: template.id,
        dueTime,
        status: "Pending",
      },
      include: {
        table: true,
        assignedTo: true,
        template: true,
      },
    });

    return task;
  }
}

export const cleaningService = new CleaningService();
