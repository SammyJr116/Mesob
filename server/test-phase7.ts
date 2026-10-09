import { buildApp } from "./src/server.js";
import { prisma } from "./src/lib/prisma.js";
import { recurringExpensesJob } from "./src/scheduler/recurring-expenses.job.js";
import { maintenanceJob } from "./src/scheduler/maintenance.job.js";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`[FAIL] ${message}`);
    process.exit(1);
  }
  console.log(`[PASS] ${message}`);
}

async function runPhase7Tests() {
  console.log("\n=================================================");
  console.log("   MESOB RMS - PHASE 7 ACCEPTANCE TEST SUITE     ");
  console.log("=================================================\n");

  const app = await buildApp();
  await app.ready();

  // Helper to log in and get cookie
  async function login(username: string) {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { login: username, password: "mesob1234" },
    });
    const cookieHeader = res.headers["set-cookie"];
    const cookieStr = Array.isArray(cookieHeader) ? cookieHeader.join("; ") : cookieHeader || "";
    return cookieStr;
  }

  // 1. EXPENSES (PRD 17)
  console.log("--- 7.1 Expenses Management (PRD Section 17) ---");
  const inventoryCookie = await login("yonas"); // Inventory role
  const managerCookie = await login("owner");   // Manager role
  const waiterCookie = await login("selam");    // Waiter role

  // Inventory creates expense
  const expRes1 = await app.inject({
    method: "POST",
    url: "/api/v1/expenses",
    headers: { cookie: inventoryCookie },
    payload: {
      category: "Packaging Supplies",
      amount: 450.50,
      description: "Takeaway kraft boxes",
      date: "2026-10-09",
    },
  });
  assert(expRes1.statusCode === 201, "Inventory staff records expense successfully (PRD 17.2.1)");
  const exp1 = JSON.parse(expRes1.body).expense;
  assert(exp1.expenseNumber.startsWith("EXP-"), "Expense has sequential EXP-XXXXXX number");
  assert(exp1.status === "Confirmed", "Standard expense starts as Confirmed");

  // Attempt emergency purchase category
  const badExpRes = await app.inject({
    method: "POST",
    url: "/api/v1/expenses",
    headers: { cookie: inventoryCookie },
    payload: {
      category: "Emergency purchase",
      amount: 100,
      description: "Tomatoes",
      date: "2026-10-09",
    },
  });
  assert(badExpRes.statusCode === 400, "Emergency purchase cannot be recorded as an expense (PRD 16.5.3, 17.4.1)");

  // Inventory lists expenses -> sees own entries
  const invListRes = await app.inject({
    method: "GET",
    url: "/api/v1/expenses",
    headers: { cookie: inventoryCookie },
  });
  const invList = JSON.parse(invListRes.body).expenses;
  assert(invList.length >= 1, "Inventory staff sees their recorded expense");

  // Manager lists expenses -> sees all
  const mgrListRes = await app.inject({
    method: "GET",
    url: "/api/v1/expenses",
    headers: { cookie: managerCookie },
  });
  const mgrList = JSON.parse(mgrListRes.body).expenses;
  assert(mgrList.length >= invList.length, "Manager sees all expenses across staff");

  // Manager updates expense
  const updateExpRes = await app.inject({
    method: "PATCH",
    url: `/api/v1/expenses/${exp1.id}`,
    headers: { cookie: managerCookie },
    payload: { amount: 500.00 },
  });
  assert(updateExpRes.statusCode === 200, "Manager can update expense details (PRD 17.2.2)");

  // Hard delete expense attempt -> 403 Forbidden
  const deleteExpRes = await app.inject({
    method: "DELETE",
    url: `/api/v1/expenses/${exp1.id}`,
    headers: { cookie: managerCookie },
  });
  assert(deleteExpRes.statusCode === 403, "Expenses cannot be deleted (PRD 17.2.2, 4.6.1)");

  // Clean up any previous test runs for idempotency
  await prisma.expense.deleteMany({ where: { description: "Monthly Internet Bill" } });
  await prisma.recurringExpenseTemplate.deleteMany({ where: { description: "Monthly Internet Bill" } });
  await prisma.maintenanceRequest.deleteMany({ where: { problem: "[Preventive] Descaling and boiler check" } });

  // Recurring template & job
  const tplRes = await app.inject({
    method: "POST",
    url: "/api/v1/expenses/templates",
    headers: { cookie: managerCookie },
    payload: {
      category: "Utilities",
      description: "Monthly Internet Bill",
      amount: 2500.00,
      period: "Monthly",
      dayOfMonth: new Date().getDate(),
    },
  });
  assert(tplRes.statusCode === 201, "Manager creates recurring expense template (PRD 17.3.1)");
  const tpl = JSON.parse(tplRes.body).template;

  // Run recurring expenses job
  await recurringExpensesJob.run();
  const pendingExp = await prisma.expense.findFirst({
    where: { description: "Monthly Internet Bill", status: "Pending confirmation" },
  });
  assert(pendingExp !== null, "Scheduler creates 'Pending confirmation' expense from template (PRD 17.3.2)");

  // Manager confirms recurring expense
  const confirmRes = await app.inject({
    method: "PATCH",
    url: `/api/v1/expenses/${pendingExp!.id}/confirm`,
    headers: { cookie: managerCookie },
    payload: { amount: 2400.00 },
  });
  assert(confirmRes.statusCode === 200, "Manager confirms recurring expense with actual amount (PRD 17.3.2)");
  assert(JSON.parse(confirmRes.body).expense.status === "Confirmed", "Status updated to Confirmed");


  // 2. MAINTENANCE & ASSETS (PRD 18)
  console.log("\n--- 7.2 Maintenance & Assets (PRD Section 18) ---");

  // Manager creates Asset
  const assetRes = await app.inject({
    method: "POST",
    url: "/api/v1/assets",
    headers: { cookie: managerCookie },
    payload: {
      name: "Espresso Machine",
      category: "Kitchen Equipment",
      location: "Coffee Station",
      serialNumber: "SN-ESP-9981",
      warrantyExpiryDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
    },
  });
  assert(assetRes.statusCode === 201, "Manager registers asset in Asset Registry (PRD 18.1.1)");
  const asset = JSON.parse(assetRes.body).asset;

  // Waiter reports maintenance issue
  const maintReqRes = await app.inject({
    method: "POST",
    url: "/api/v1/maintenance/requests",
    headers: { cookie: waiterCookie },
    payload: {
      assetId: asset.id,
      problem: "Steam wand leaking",
      description: "Steam pressure dropping during peak service",
      priority: "High",
    },
  });
  assert(maintReqRes.statusCode === 201, "Any staff member can report a maintenance issue (PRD 18.2.1)");
  const maintReq = JSON.parse(maintReqRes.body).request;
  assert(maintReq.status === "Reported", "Maintenance request starts as Reported");

  // Manager assigns to vendor and records resolution cost
  const updateMaintRes = await app.inject({
    method: "PATCH",
    url: `/api/v1/maintenance/requests/${maintReq.id}`,
    headers: { cookie: managerCookie },
    payload: {
      assignedTo: "Addis Espresso Techs",
      vendorPhone: "+251911223344",
      status: "Completed",
      cost: 1200.00,
      resolutionNotes: "Replaced high-pressure valve seal",
    },
  });
  assert(updateMaintRes.statusCode === 200, "Manager assigns vendor and records resolution cost (PRD 18.3, 18.6)");
  const updatedMaint = JSON.parse(updateMaintRes.body).request;
  assert(updatedMaint.status === "Completed", "Status transitioned to Completed");

  // Attempt to delete request with cost -> blocked
  const delCostReqRes = await app.inject({
    method: "DELETE",
    url: `/api/v1/maintenance/requests/${maintReq.id}`,
    headers: { cookie: managerCookie },
  });
  assert(delCostReqRes.statusCode === 400, "Requests with cost cannot be deleted (PRD 18.7.1)");

  // Cost-free request deletion -> succeeds
  const costFreeRes = await app.inject({
    method: "POST",
    url: "/api/v1/maintenance/requests",
    headers: { cookie: waiterCookie },
    payload: {
      problem: "Loose table leg",
      description: "Table 4 wobbly",
      priority: "Low",
    },
  });
  const costFree = JSON.parse(costFreeRes.body).request;
  const delCostFreeRes = await app.inject({
    method: "DELETE",
    url: `/api/v1/maintenance/requests/${costFree.id}`,
    headers: { cookie: managerCookie },
  });
  assert(delCostFreeRes.statusCode === 200, "Cost-free maintenance request deleted successfully (PRD 18.7.1)");

  // Preventive maintenance template
  const prevRes = await app.inject({
    method: "POST",
    url: "/api/v1/maintenance/preventive",
    headers: { cookie: managerCookie },
    payload: {
      assetId: asset.id,
      taskName: "Descaling and boiler check",
      frequencyDays: 30,
      assignedTo: "Internal Tech",
      nextDueDate: new Date().toISOString(),
    },
  });
  assert(prevRes.statusCode === 201, "Manager creates preventive maintenance template (PRD 18.5.1)");

  // Run maintenance job (warranty alerts & preventive generation)
  await maintenanceJob.run();
  const autoMaintReq = await prisma.maintenanceRequest.findFirst({
    where: { problem: "[Preventive] Descaling and boiler check" },
  });
  assert(autoMaintReq !== null, "Preventive maintenance generator creates automated request (PRD 18.5.1)");


  // 3. SECURITY (PRD 19)
  console.log("\n--- 7.3 Security Operations (PRD Section 19) ---");
  const securityCookie = await login("robel"); // Security role

  // Security checks in visitor
  const visitorRes = await app.inject({
    method: "POST",
    url: "/api/v1/security/visitors",
    headers: { cookie: securityCookie },
    payload: {
      name: "Alemayehu Tadesse",
      phone: "+251911445566",
      purpose: "Food delivery inspection",
      personVisited: "Chef Dawit",
    },
  });
  assert(visitorRes.statusCode === 201, "Security checks in visitor (PRD 19.1.1)");
  const visitor = JSON.parse(visitorRes.body).visitor;
  assert(visitor.checkOutTime === null, "Visitor checked in without check-out time");

  // Security checks out visitor
  const checkoutRes = await app.inject({
    method: "PATCH",
    url: `/api/v1/security/visitors/${visitor.id}/checkout`,
    headers: { cookie: securityCookie },
  });
  assert(checkoutRes.statusCode === 200, "Security marks visitor checked out (PRD 19.1.1)");

  // Manager deletes visitor record
  const delVisitorRes = await app.inject({
    method: "DELETE",
    url: `/api/v1/security/visitors/${visitor.id}`,
    headers: { cookie: managerCookie },
  });
  assert(delVisitorRes.statusCode === 200, "Manager can delete visitor records (PRD 19.1.3)");

  // Waiter reports incident
  const incRes = await app.inject({
    method: "POST",
    url: "/api/v1/security/incidents",
    headers: { cookie: waiterCookie },
    payload: {
      title: "Broken glassware in main dining",
      category: "Safety",
      severity: "Medium",
      location: "Table 8 area",
      description: "Guest dropped wine glass. Area secured and sweep requested.",
    },
  });
  assert(incRes.statusCode === 201, "Any staff member can report an incident (PRD 19.2.1)");
  const incident = JSON.parse(incRes.body).incident;

  // Security moves incident to Under Review
  const reviewIncRes = await app.inject({
    method: "PATCH",
    url: `/api/v1/security/incidents/${incident.id}/review`,
    headers: { cookie: securityCookie },
  });
  assert(reviewIncRes.statusCode === 200, "Security moves incident to Under Review (PRD 19.2.3)");

  // Security blocked from resolving
  const secResolveRes = await app.inject({
    method: "PATCH",
    url: `/api/v1/security/incidents/${incident.id}/resolve`,
    headers: { cookie: securityCookie },
    payload: { resolutionNotes: "Done" },
  });
  assert(secResolveRes.statusCode === 403, "Non-manager forbidden from resolving incident (PRD 19.2.3)");

  // Manager resolves incident with resolution notes
  const resolveIncRes = await app.inject({
    method: "PATCH",
    url: `/api/v1/security/incidents/${incident.id}/resolve`,
    headers: { cookie: managerCookie },
    payload: { resolutionNotes: "Glass cleaned immediately by cleaner Tigist. No injuries." },
  });
  assert(resolveIncRes.statusCode === 200, "Manager resolves incident with required notes (PRD 19.2.3)");

  // Deletion of incident blocked
  const delIncRes = await app.inject({
    method: "DELETE",
    url: `/api/v1/security/incidents/${incident.id}`,
    headers: { cookie: managerCookie },
  });
  assert(delIncRes.statusCode === 403, "Incidents are archive-only and never deleted (PRD 19.2.4)");

  // Lost & Found
  const lostRes = await app.inject({
    method: "POST",
    url: "/api/v1/security/lost-found",
    headers: { cookie: securityCookie },
    payload: {
      itemDescription: "Black leather wallet with bank cards",
      locationFound: "Booth 3",
    },
  });
  assert(lostRes.statusCode === 201, "Security records lost item (PRD 19.3.1)");
  const lostItem = JSON.parse(lostRes.body).item;

  // Security marks claimed
  const claimRes = await app.inject({
    method: "PATCH",
    url: `/api/v1/security/lost-found/${lostItem.id}/claim`,
    headers: { cookie: securityCookie },
    payload: {
      claimantName: "Berhanu Haile",
      claimantPhone: "+251922334455",
    },
  });
  assert(claimRes.statusCode === 200, "Claiming records claimant name and phone (PRD 19.3.2)");

  // Manager deletes lost item
  const delLostRes = await app.inject({
    method: "DELETE",
    url: `/api/v1/security/lost-found/${lostItem.id}`,
    headers: { cookie: managerCookie },
  });
  assert(delLostRes.statusCode === 200, "Manager can delete lost and found records (PRD 19.3.3)");

  console.log("\n=================================================");
  console.log("   ALL PHASE 7 ACCEPTANCE CRITERIA VERIFIED (PASS) ");
  console.log("=================================================\n");

  await app.close();
}

runPhase7Tests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
