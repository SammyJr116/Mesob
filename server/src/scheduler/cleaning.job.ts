import { prisma } from "../lib/prisma.js";
import { emitNotification } from "../ws/gateway.js";

export class CleaningJob {
  private lastRoutineDate: string | null = null;
  private alertedTaskIds: Set<string> = new Set();

  /**
   * Generates daily routine cleaning tasks from active templates (PRD 14.2.1)
   */
  async runRoutineCleaningGenerator(): Promise<any[]> {
    const today = new Date().toISOString().slice(0, 10);
    const startOfDay = new Date(`${today}T00:00:00.000Z`);

    const activeTemplates = await prisma.cleaningTemplate.findMany({
      where: { isActive: true },
      include: { assignedTo: true },
    });

    const createdTasks: any[] = [];

    for (const template of activeTemplates) {
      // Check if task from this template was already generated today
      const existing = await prisma.cleaningTask.findFirst({
        where: {
          templateId: template.id,
          createdAt: { gte: startOfDay },
        },
      });

      if (!existing) {
        let dueTime: Date | null = null;
        if (template.preferredTime) {
          const [h, m] = template.preferredTime.split(":").map(Number);
          dueTime = new Date();
          dueTime.setHours(h || 12, m || 0, 0, 0);
        } else {
          dueTime = new Date(Date.now() + 4 * 3600 * 1000);
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
          include: { assignedTo: true, template: true },
        });

        createdTasks.push(task);
        console.log(`[CleaningJob] Generated routine task: "${task.description}" (${task.area})`);
      }
    }

    this.lastRoutineDate = today;
    return createdTasks;
  }

  /**
   * Detects overdue cleaning tasks and alerts Manager and Cleaner (PRD 14.5.1, 20.3)
   */
  async runOverdueCleaningCheck(): Promise<any[]> {
    const now = new Date();

    const overdueTasks = await prisma.cleaningTask.findMany({
      where: {
        status: { in: ["Pending", "In Progress"] },
        dueTime: { lt: now },
      },
      include: {
        assignedTo: { include: { user: true } },
        table: true,
      },
    });

    const alerted: any[] = [];

    for (const task of overdueTasks) {
      if (!this.alertedTaskIds.has(task.id)) {
        this.alertedTaskIds.add(task.id);

        const taskLabel = task.description || `${task.area} cleaning`;
        const alertMsg = `Cleaning task "${taskLabel}" is overdue.`;

        // 1. Create persistent Notification for Manager (PRD 20.3)
        await prisma.notification.create({
          data: {
            title: "Cleaning Task Overdue",
            message: alertMsg,
            eventType: "CLEANING_OVERDUE",
            recipientRole: "MANAGER",
            playSound: false, // Silent per PRD 20.2.1
            link: "/cleaning",
          },
        });

        // 2. If assigned to a cleaner with a user account, create notification for them
        if (task.assignedTo?.userId) {
          await prisma.notification.create({
            data: {
              title: "Cleaning Task Overdue",
              message: `Your assigned task "${taskLabel}" is overdue.`,
              eventType: "CLEANING_OVERDUE",
              recipientUserId: task.assignedTo.userId,
              recipientRole: "CLEANER",
              playSound: false,
              link: "/my-tasks",
            },
          });
        }

        // 3. Emit WebSocket event to manager and cleaner rooms
        emitNotification("room:manager", {
          title: "Cleaning Task Overdue",
          message: alertMsg,
          eventType: "CLEANING_OVERDUE",
          link: "/cleaning",
          taskId: task.id,
        });

        emitNotification("room:cleaner", {
          title: "Cleaning Task Overdue",
          message: alertMsg,
          eventType: "CLEANING_OVERDUE",
          link: "/my-tasks",
          taskId: task.id,
        });

        alerted.push(task);
      }
    }

    return alerted;
  }

  /**
   * Runs all cleaning jobs
   */
  async run() {
    await this.runRoutineCleaningGenerator();
    await this.runOverdueCleaningCheck();
  }
}

export const cleaningJob = new CleaningJob();
