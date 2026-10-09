import { buildApp } from "./src/server.js";
import { prisma } from "./src/lib/prisma.js";
import { cleaningJob } from "./src/scheduler/cleaning.job.js";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`[FAIL] ${message}`);
    process.exit(1);
  }
  console.log(`[PASS] ${message}`);
}

async function runPhase9Tests() {
  console.log("\n=================================================");
  console.log("   MESOB RMS - PHASE 9 ACCEPTANCE TEST SUITE     ");
  console.log("=================================================\n");

  const app = await buildApp();
  await app.ready();

  async function login(username: string, password = "mesob1234") {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { login: username, password },
    });
    const cookieHeader = res.headers["set-cookie"];
    const cookieStr = Array.isArray(cookieHeader) ? cookieHeader.join("; ") : cookieHeader || "";
    let body: any = {};
    try {
      body = JSON.parse(res.body);
    } catch {
      // ignored
    }
    return { cookie: cookieStr, user: body.user, statusCode: res.statusCode };
  }

  // Clean up any test artifacts from prior runs
  await prisma.cleaningTask.deleteMany({
    where: { description: { contains: "Phase9Test" } },
  });
  await prisma.cleaningTemplate.deleteMany({
    where: { taskName: { contains: "Phase9Test" } },
  });
  await prisma.notification.deleteMany({
    where: { title: { contains: "Phase9Test" } },
  });

  const manager = await login("owner");
  const waiter = await login("selam");
  const cleaner = await login("tigist");

  assert(manager.statusCode === 200, "Manager logs in successfully");
  assert(waiter.statusCode === 200, "Waiter logs in successfully");
  assert(cleaner.statusCode === 200, "Cleaner logs in successfully");

  // -------------------------------------------------------------
  // 9.1 Routine Facility Cleaning & Templates (PRD 14.1, 14.2)
  // -------------------------------------------------------------
  console.log("\n--- 9.1 Routine Facility Cleaning & Templates (PRD Section 14) ---");

  // 9.1.1 Manager creates recurring cleaning template
  const createTplRes = await app.inject({
    method: "POST",
    url: "/api/v1/cleaning/templates",
    headers: { cookie: manager.cookie },
    payload: {
      area: "Restrooms",
      taskName: "Phase9Test Sanitize mirrors & sinks",
      description: "Use disinfectant spray and microfiber cloth",
      frequency: "Daily",
      preferredTime: "09:00",
      assignedEmployeeId: "E04", // Tigist A.
    },
  });
  assert(createTplRes.statusCode === 201, "Manager creates recurring cleaning template (PRD 14.2.1)");
  const createdTpl = JSON.parse(createTplRes.body).template;
  assert(createdTpl.frequency === "Daily", "Template frequency defaults or sets to Daily");
  assert(createdTpl.assignedEmployeeId === "E04", "Template assigned to specific cleaner (PRD 14.3.1)");

  // 9.1.2 Waiter cannot create templates (RBAC)
  const waiterTplRes = await app.inject({
    method: "POST",
    url: "/api/v1/cleaning/templates",
    headers: { cookie: waiter.cookie },
    payload: {
      area: "Dining area",
      taskName: "Phase9Test Waiter Unauthorized Template",
    },
  });
  assert(waiterTplRes.statusCode === 403, "Non-manager forbidden from creating cleaning templates (PRD 14.2)");

  // 9.1.3 List templates
  const listTplsRes = await app.inject({
    method: "GET",
    url: "/api/v1/cleaning/templates",
    headers: { cookie: cleaner.cookie },
  });
  assert(listTplsRes.statusCode === 200, "Templates listed successfully");
  const templates = JSON.parse(listTplsRes.body).templates;
  assert(templates.some((t: any) => t.id === createdTpl.id), "Created template exists in list");

  // 9.1.4 Manager runs template on-demand
  const runTplRes = await app.inject({
    method: "POST",
    url: `/api/v1/cleaning/templates/${createdTpl.id}/run`,
    headers: { cookie: manager.cookie },
  });
  assert(runTplRes.statusCode === 201, "Manager runs template on-demand");
  const onDemandTask = JSON.parse(runTplRes.body).task;
  assert(onDemandTask.templateId === createdTpl.id, "On-demand task links to template");
  assert(onDemandTask.status === "Pending", "On-demand task starts as Pending");

  // 9.1.5 Scheduled routine task generation job (PRD 14.2.1, 4.9)
  const scheduledTasks = await cleaningJob.runRoutineCleaningGenerator();
  assert(Array.isArray(scheduledTasks), "Routine cleaning job runs successfully");
  // Run again to verify idempotency (does not duplicate today's task)
  const secondRun = await cleaningJob.runRoutineCleaningGenerator();
  assert(
    !secondRun.some((t) => t.templateId === createdTpl.id),
    "Routine cleaning job is idempotent for today (no duplicate generation)"
  );

  // -------------------------------------------------------------
  // 9.2 Cleaner Task Lifecycle & Actions (PRD 14.3, 14.4)
  // -------------------------------------------------------------
  console.log("\n--- 9.2 Cleaner Task Lifecycle & Actions (PRD 14.3, 14.4) ---");

  // Cleaner starts the on-demand task
  const startTaskRes = await app.inject({
    method: "PATCH",
    url: `/api/v1/cleaning/tasks/${onDemandTask.id}/start`,
    headers: { cookie: cleaner.cookie },
  });
  assert(startTaskRes.statusCode === 200, "Cleaner starts cleaning task (PRD 14.4.1)");
  const startedTask = JSON.parse(startTaskRes.body).task;
  assert(startedTask.status === "In Progress", "Task status transitions to In Progress");
  assert(startedTask.startedAt !== null, "Task records startedAt timestamp");

  // Cleaner completes the task with notes and optional photo (PRD 14.4.1)
  const completeTaskRes = await app.inject({
    method: "PATCH",
    url: `/api/v1/cleaning/tasks/${onDemandTask.id}/complete`,
    headers: { cookie: cleaner.cookie },
    payload: {
      notes: "Phase9Test All mirrors sanitized with streak-free cleaner",
      photoUrl: "https://photos.mesob.et/cleaning-test.jpg",
    },
  });
  assert(completeTaskRes.statusCode === 200, "Cleaner completes cleaning task (PRD 14.4.1)");
  const completedTask = JSON.parse(completeTaskRes.body).task;
  assert(completedTask.status === "Completed", "Task status transitions to Completed");
  assert(completedTask.completedAt !== null, "completedAt timestamp is recorded");
  assert(completedTask.notes.includes("Phase9Test"), "Completion notes preserved");

  // Manager reassigns a cleaning task (PRD 14.3.3)
  const unassignedTask = await prisma.cleaningTask.create({
    data: {
      area: "Storage",
      description: "Phase9Test Sweep back storage",
      status: "Pending",
      assignedToId: "E04", // Tigist
    },
  });

  const reassignRes = await app.inject({
    method: "PATCH",
    url: `/api/v1/cleaning/tasks/${unassignedTask.id}/reassign`,
    headers: { cookie: manager.cookie },
    payload: { assignedToId: "E05" }, // Solomon G.
  });
  assert(reassignRes.statusCode === 200, "Manager reassigns cleaning task (PRD 14.3.3)");
  const reassigned = JSON.parse(reassignRes.body).task;
  assert(reassigned.assignedToId === "E05", "Task assignedToId updated to new cleaner");

  const reassignAudit = await prisma.activityLog.findFirst({
    where: {
      action: "CLEANING_TASK_REASSIGNED",
      targetId: unassignedTask.id,
    },
  });
  assert(reassignAudit !== null, "Reassignment logged to ActivityLog (PRD 14.3.3)");

  // -------------------------------------------------------------
  // 9.3 Table-Clean Task & Waiter Gate (PRD 14.6.2)
  // -------------------------------------------------------------
  console.log("\n--- 9.3 Table-Clean Tasks & Waiter Gate (PRD Section 14.6) ---");

  // Table 3 in Cleaning state with pending task
  await prisma.table.update({
    where: { id: "T03" },
    data: { status: "Cleaning" },
  });
  const tableCleanTask = await prisma.cleaningTask.create({
    data: {
      area: "Table 3",
      tableId: "T03",
      description: "Phase9Test Clean table 3",
      source: "Table",
      status: "Pending",
    },
  });

  // Waiter attempts to mark Available before cleaning completion
  const waiterMarkRes = await app.inject({
    method: "POST",
    url: "/api/v1/cleaning/tables/T03/mark-available",
    headers: { cookie: waiter.cookie },
  });
  assert(
    waiterMarkRes.statusCode === 403,
    "Waiter cannot mark table Available before cleaning task completes (PRD 14.6.2)"
  );

  // Manager override allows marking Available, completing task, and logging (PRD 14.6.2)
  const managerOverrideRes = await app.inject({
    method: "POST",
    url: "/api/v1/cleaning/tables/T03/mark-available",
    headers: { cookie: manager.cookie },
  });
  assert(managerOverrideRes.statusCode === 200, "Manager override marks table Available (PRD 14.6.2)");

  const closedTask = await prisma.cleaningTask.findUnique({ where: { id: tableCleanTask.id } });
  assert(closedTask?.status === "Completed", "Manager override closes pending cleaning task");

  const overrideLog = await prisma.activityLog.findFirst({
    where: {
      action: "TABLE_CLEANING_OVERRIDE",
      targetId: "T03",
    },
  });
  assert(overrideLog !== null, "Manager cleaning override logged to ActivityLog (PRD 14.6.2)");

  // -------------------------------------------------------------
  // 9.4 Overdue Cleaning Monitor (PRD 14.5.1, 20.3)
  // -------------------------------------------------------------
  console.log("\n--- 9.4 Overdue Cleaning Tasks Automation (PRD 14.5.1) ---");

  // Create task with dueTime 2 hours in the past
  const pastDue = new Date(Date.now() - 2 * 3600 * 1000);
  const overdueTask = await prisma.cleaningTask.create({
    data: {
      area: "Entrance",
      description: "Phase9Test Mop entrance mats",
      dueTime: pastDue,
      status: "Pending",
      assignedToId: "E04",
    },
  });

  const overdueAlerts = await cleaningJob.runOverdueCleaningCheck();
  assert(
    overdueAlerts.some((t) => t.id === overdueTask.id),
    "Overdue monitor detects past-due uncompleted task (PRD 14.5.1)"
  );

  const overdueNotification = await prisma.notification.findFirst({
    where: {
      eventType: "CLEANING_OVERDUE",
      message: { contains: "Mop entrance mats" },
    },
  });
  assert(overdueNotification !== null, "Overdue task creates persistent notification for Manager (PRD 20.3)");
  assert(overdueNotification?.playSound === false, "Overdue alerts are silent (PRD 20.2.1)");

  // -------------------------------------------------------------
  // 9.5 In-App Notification Center & Sound Policy (PRD Section 20)
  // -------------------------------------------------------------
  console.log("\n--- 9.5 Notification Center & Sound Policy (PRD Section 20) ---");

  // 9.5.1 Sound rule: Only NEW_KITCHEN_TICKET and TICKET_READY can play sound (PRD 20.2.1)
  const soundNotifRes = await app.inject({
    method: "POST",
    url: "/api/v1/notifications",
    headers: { cookie: manager.cookie },
    payload: {
      title: "Phase9Test New Kitchen Ticket",
      message: "Order ORD-999 sent to kitchen",
      eventType: "NEW_KITCHEN_TICKET",
      recipientRole: "KITCHEN",
      playSound: true,
    },
  });
  assert(soundNotifRes.statusCode === 201, "Kitchen ticket notification created");
  const kitchenNotif = JSON.parse(soundNotifRes.body).notification;
  assert(kitchenNotif.playSound === true, "NEW_KITCHEN_TICKET event is permitted sound (PRD 20.2.1)");

  // Other events must be silent even if client requests sound
  const silentNotifRes = await app.inject({
    method: "POST",
    url: "/api/v1/notifications",
    headers: { cookie: manager.cookie },
    payload: {
      title: "Phase9Test Low Stock Alert",
      message: "Berbere spice running low",
      eventType: "LOW_STOCK",
      recipientRole: "MANAGER",
      playSound: true, // Should be overridden to false!
    },
  });
  const lowStockNotif = JSON.parse(silentNotifRes.body).notification;
  assert(lowStockNotif.playSound === false, "Non-designated events strictly enforced SILENT (PRD 20.2.1)");

  // 9.5.2 Recipient scoping (PRD 20.3)
  const waiterNotifRes = await app.inject({
    method: "GET",
    url: "/api/v1/notifications",
    headers: { cookie: waiter.cookie },
  });
  assert(waiterNotifRes.statusCode === 200, "Waiter retrieves role-scoped notifications");
  const waiterNotifs = JSON.parse(waiterNotifRes.body).notifications;
  assert(
    !waiterNotifs.some((n: any) => n.id === kitchenNotif.id),
    "Waiter does not see Kitchen-scoped notifications (PRD 20.3)"
  );

  // 9.5.3 Mark single notification read (PRD 20.1)
  const markReadRes = await app.inject({
    method: "PATCH",
    url: `/api/v1/notifications/${overdueNotification!.id}/read`,
    headers: { cookie: manager.cookie },
  });
  assert(markReadRes.statusCode === 200, "Notification marked read (PRD 20.1.1)");
  const updatedNotif = JSON.parse(markReadRes.body).notification;
  assert(updatedNotif.isRead === true, "isRead flag updated to true in database");

  // 9.5.4 Mark all read (PRD 20.1)
  const markAllRes = await app.inject({
    method: "POST",
    url: "/api/v1/notifications/read-all",
    headers: { cookie: manager.cookie },
  });
  assert(markAllRes.statusCode === 200, "Manager marks all notifications as read");

  const unreadCountRes = await app.inject({
    method: "GET",
    url: "/api/v1/notifications?unreadOnly=true",
    headers: { cookie: manager.cookie },
  });
  const unreadData = JSON.parse(unreadCountRes.body);
  assert(unreadData.unreadCount === 0, "Unread count is 0 after mark-all-read");

  // 9.5.5 Retention cleanup (PRD 20.1.1)
  const cleanupRes = await app.inject({
    method: "POST",
    url: "/api/v1/notifications/cleanup?days=30",
    headers: { cookie: manager.cookie },
  });
  assert(cleanupRes.statusCode === 200, "Notification retention cleanup endpoint returns 200 (PRD 20.1.1)");

  console.log("\n=================================================");
  console.log("   ALL PHASE 9 ACCEPTANCE CRITERIA VERIFIED (PASS)");
  console.log("=================================================\n");
  process.exit(0);
}

runPhase9Tests().catch((err) => {
  console.error("Test failed with exception:", err);
  process.exit(1);
});
