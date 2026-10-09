import { buildApp } from "./src/server.js";
import { prisma } from "./src/lib/prisma.js";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`[FAIL] ${message}`);
    process.exit(1);
  }
  console.log(`[PASS] ${message}`);
}

async function runPhase8Tests() {
  console.log("\n=================================================");
  console.log("   MESOB RMS - PHASE 8 ACCEPTANCE TEST SUITE     ");
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
  await prisma.activityLog.deleteMany({
    where: { reason: { contains: "Test Phase 8" } },
  });
  await prisma.customer.deleteMany({
    where: { phone: { in: ["+251911999901", "+251911999902", "+251911999903"] } },
  });
  await prisma.employee.deleteMany({
    where: { phone: { in: ["+251911888801", "+251911888802"] } },
  });
  await prisma.user.deleteMany({
    where: { username: { in: ["testuser8_1", "testuser8_2"] } },
  });

  const manager = await login("owner");
  const admin = await login("admin1");
  const waiter = await login("selam");

  // -------------------------------------------------------------
  // 8.1 Employee Records & User Administration (PRD 6)
  // -------------------------------------------------------------
  console.log("\n--- 8.1 Employees & Users Administration (PRD Section 6) ---");

  // 8.1.1 Create employee as Manager
  const createEmpRes = await app.inject({
    method: "POST",
    url: "/api/v1/employees",
    headers: { cookie: manager.cookie },
    payload: {
      name: "Alemayehu Tesfaye",
      role: "Waiter",
      phone: "+251911888801",
      email: "alemayehu@mesob.et",
      department: "Front of House",
      status: "Active",
    },
  });
  assert(createEmpRes.statusCode === 201, "Manager creates employee successfully (PRD 6.1.1)");
  const empData = JSON.parse(createEmpRes.body);
  const createdEmp = empData.employee;
  assert(createdEmp.employeeNumber.startsWith("EMP-"), `Employee has sequence EMP-XXX number: ${createdEmp.employeeNumber}`);

  // Non-manager cannot create employee
  const waiterCreateEmp = await app.inject({
    method: "POST",
    url: "/api/v1/employees",
    headers: { cookie: waiter.cookie },
    payload: {
      name: "Unauthorized Staff",
      role: "Waiter",
      phone: "+251911888802",
    },
  });
  assert(waiterCreateEmp.statusCode === 403, "Non-manager forbidden from creating employee (PRD 6.1.1)");

  // 8.1.2 Create user as Admin and link to employee
  const createUserRes = await app.inject({
    method: "POST",
    url: "/api/v1/users",
    headers: { cookie: admin.cookie },
    payload: {
      username: "testuser8_1",
      email: "testuser8_1@mesob.et",
      password: "password123",
      role: "WAITER",
      employeeId: createdEmp.id,
    },
  });
  assert(createUserRes.statusCode === 201, "Administrator creates user and links to employee (PRD 6.2, 6.3)");
  const userData = JSON.parse(createUserRes.body);
  const createdUser = userData.user;
  assert(createdUser.mustChangePassword === true, "New user defaults to mustChangePassword = true (PRD 6.4.2)");

  // Non-admin forbidden from creating users
  const mgrCreateUser = await app.inject({
    method: "POST",
    url: "/api/v1/users",
    headers: { cookie: manager.cookie },
    payload: {
      username: "testuser8_2",
      email: "testuser8_2@mesob.et",
      password: "password123",
      role: "WAITER",
    },
  });
  assert(mgrCreateUser.statusCode === 403, "Non-administrator forbidden from accessing /users (PRD 6.3.3)");

  // 8.1.1 Guardrail: Deactivating employee automatically deactivates linked user
  const terminateEmpRes = await app.inject({
    method: "PATCH",
    url: `/api/v1/employees/${createdEmp.id}`,
    headers: { cookie: manager.cookie },
    payload: { status: "Terminated" },
  });
  assert(terminateEmpRes.statusCode === 200, "Manager sets employee status to Terminated");

  const checkLinkedUser = await prisma.user.findUnique({ where: { id: createdUser.id } });
  assert(checkLinkedUser?.status === "SUSPENDED", "Terminating employee auto-suspends linked user account (PRD 6.2.3, 6.7)");

  // 8.1.2 Guardrail: Admin cannot deactivate own account
  const selfDeactivateRes = await app.inject({
    method: "PATCH",
    url: `/api/v1/users/${admin.user.id}/status`,
    headers: { cookie: admin.cookie },
    payload: { status: "SUSPENDED" },
  });
  assert(selfDeactivateRes.statusCode === 400, "Administrator blocked from deactivating own account (PRD 6.7.2)");

  // 8.1.2 Password reset by Admin
  const resetPwRes = await app.inject({
    method: "POST",
    url: `/api/v1/users/${createdUser.id}/reset-password`,
    headers: { cookie: admin.cookie },
    payload: { temporaryPassword: "TempPassword123!" },
  });
  assert(resetPwRes.statusCode === 200, "Administrator resets password with temporary password (PRD 6.4.2)");

  // 8.1.2 Unlock user
  const unlockRes = await app.inject({
    method: "POST",
    url: `/api/v1/users/${createdUser.id}/unlock`,
    headers: { cookie: admin.cookie },
  });
  assert(unlockRes.statusCode === 200, "Administrator unlocks user account (PRD 6.5.2)");

  // 8.1.3 Self-service password change
  await prisma.user.update({
    where: { id: createdUser.id },
    data: { status: "ACTIVE" },
  });
  const testUserLogin = await login("testuser8_1", "TempPassword123!");

  const badChangePw = await app.inject({
    method: "POST",
    url: "/api/v1/auth/change-password",
    headers: { cookie: testUserLogin.cookie },
    payload: {
      currentPassword: "wrongpassword",
      newPassword: "BrandNewPass123!",
    },
  });
  assert(badChangePw.statusCode === 400, "Change password rejects incorrect current password");

  const goodChangePw = await app.inject({
    method: "POST",
    url: "/api/v1/auth/change-password",
    headers: { cookie: testUserLogin.cookie },
    payload: {
      currentPassword: "TempPassword123!",
      newPassword: "BrandNewPass123!",
    },
  });
  assert(goodChangePw.statusCode === 200, "User changes own password successfully (PRD 6.4.2)");

  // -------------------------------------------------------------
  // 8.2 Customer Directory & Order History (PRD 12)
  // -------------------------------------------------------------
  console.log("\n--- 8.2 Customer Directory & Merging (PRD Section 12) ---");

  // Create customer 1 with 09... format
  const createCust1 = await app.inject({
    method: "POST",
    url: "/api/v1/customers",
    headers: { cookie: waiter.cookie },
    payload: {
      name: "Tadesse Chala",
      phone: "0911999901",
      email: "tadesse@example.com",
      notes: "Likes corner booth",
    },
  });
  assert(createCust1.statusCode === 201, "Waiter creates customer record (PRD 12.2)");
  const cust1 = JSON.parse(createCust1.body).customer;
  assert(cust1.phone === "+251911999901", "Phone number is normalized to +251... format (PRD 12.2.2)");

  // Create customer 2
  const createCust2 = await app.inject({
    method: "POST",
    url: "/api/v1/customers",
    headers: { cookie: waiter.cookie },
    payload: {
      name: "Tadesse C.",
      phone: "0911999902",
      notes: "Vegetarian only",
    },
  });
  const cust2 = JSON.parse(createCust2.body).customer;

  // Auto-complete lookup
  const lookupRes = await app.inject({
    method: "GET",
    url: "/api/v1/customers/lookup?phone=0911999901",
    headers: { cookie: waiter.cookie },
  });
  assert(lookupRes.statusCode === 200, "Customer phone lookup returns 200 OK");
  const lookupData = JSON.parse(lookupRes.body);
  assert(lookupData.matches.length > 0 && lookupData.matches[0].id === cust1.id, "Lookup finds customer by phone prefix (PRD 12.1)");

  // Attach a test order to cust2
  const testOrder = await prisma.order.create({
    data: {
      orderNumber: "ORD-999",
      orderDate: "2026-10-09",
      type: "Takeaway",
      customerId: cust2.id,
      total: 250.0,
    },
  });

  // 8.2.2 Merge customer 2 into customer 1
  const mergeRes = await app.inject({
    method: "POST",
    url: "/api/v1/customers/merge",
    headers: { cookie: manager.cookie },
    payload: {
      sourceCustomerId: cust2.id,
      targetCustomerId: cust1.id,
    },
  });
  assert(mergeRes.statusCode === 200, "Manager merges duplicate customer profiles (PRD 12.4)");

  // Verify cust2 is archived and order moved to cust1
  const updatedCust2 = await prisma.customer.findUnique({ where: { id: cust2.id } });
  assert(updatedCust2?.isArchived === true, "Source customer marked archived after merge (PRD 12.4.1)");

  const movedOrder = await prisma.order.findUnique({ where: { id: testOrder.id } });
  assert(movedOrder?.customerId === cust1.id, "Past orders transferred to primary customer profile (PRD 12.4)");

  const updatedCust1 = await prisma.customer.findUnique({ where: { id: cust1.id } });
  assert(updatedCust1?.notes?.includes("Vegetarian only") === true, "Source customer notes appended to primary profile (PRD 12.4)");

  // Customer deletion blocked
  const delCustRes = await app.inject({
    method: "DELETE",
    url: `/api/v1/customers/${cust1.id}`,
    headers: { cookie: manager.cookie },
  });
  assert(delCustRes.statusCode === 403, "Customer hard-deletion blocked (archive-only, PRD 12.4.1, 4.6.3)");

  // -------------------------------------------------------------
  // 8.3 System Settings & Business Profile (PRD Section 5)
  // -------------------------------------------------------------
  console.log("\n--- 8.3 System Settings & Business Profile (PRD Section 5) ---");

  // Manager gets settings
  const getSettingsRes = await app.inject({
    method: "GET",
    url: "/api/v1/settings",
    headers: { cookie: manager.cookie },
  });
  assert(getSettingsRes.statusCode === 200, "Manager accesses restaurant settings (PRD 5.1)");
  const currentSettings = JSON.parse(getSettingsRes.body).settings;
  assert(currentSettings.tin !== undefined, "Settings includes TIN number");

  // Administrator forbidden from settings (PRD 5.1.1)
  const adminSettingsRes = await app.inject({
    method: "GET",
    url: "/api/v1/settings",
    headers: { cookie: admin.cookie },
  });
  assert(adminSettingsRes.statusCode === 403, "Administrator forbidden from settings (PRD 5.1.1)");

  // Update settings and audit log
  const patchSettingsRes = await app.inject({
    method: "PATCH",
    url: "/api/v1/settings",
    headers: { cookie: manager.cookie },
    payload: {
      vatRate: 15.0,
      serviceChargeRate: 10.0,
      closingTime: "04:00",
      delayedTicketMinutes: 20,
    },
  });
  assert(patchSettingsRes.statusCode === 200, "Manager updates operational settings (PRD 5.1, 5.7)");

  // 8.3.2 Payment Methods configuration
  const listMethodsRes = await app.inject({
    method: "GET",
    url: "/api/v1/settings/payment-methods",
    headers: { cookie: manager.cookie },
  });
  assert(listMethodsRes.statusCode === 200, "Payment methods listed successfully (PRD 5.3)");
  const methodsData = JSON.parse(listMethodsRes.body);
  assert(methodsData.methods.length >= 4, "Default payment methods seeded (Cash, Telebirr, CBE Birr, Card)");

  const telebirr = methodsData.methods.find((m: any) => m.name === "Telebirr");
  assert(telebirr && telebirr.referenceRequired === true, "Telebirr requires reference number by default (PRD 5.3.2)");

  // -------------------------------------------------------------
  // 8.4 Activity Log Audit Trail & Outage Back-Entry (PRD 4.5, 4.8)
  // -------------------------------------------------------------
  console.log("\n--- 8.4 Activity Log & Back-Entry Engine (PRD Sections 4.5, 4.8) ---");

  // Manager lists activity logs
  const listLogsRes = await app.inject({
    method: "GET",
    url: "/api/v1/activity-logs?limit=10",
    headers: { cookie: manager.cookie },
  });
  assert(listLogsRes.statusCode === 200, "Manager retrieves activity log entries (PRD 4.8.1)");
  const logsData = JSON.parse(listLogsRes.body);
  assert(logsData.logs.length > 0, "Activity log contains recorded sensitive actions");

  // Non-manager forbidden
  const waiterLogsRes = await app.inject({
    method: "GET",
    url: "/api/v1/activity-logs",
    headers: { cookie: waiter.cookie },
  });
  assert(waiterLogsRes.statusCode === 403, "Non-manager forbidden from activity log (PRD 4.8.1)");

  // CSV export stream
  const csvRes = await app.inject({
    method: "GET",
    url: "/api/v1/activity-logs/csv",
    headers: { cookie: manager.cookie },
  });
  assert(csvRes.statusCode === 200, "Activity log CSV export returns 200 OK");
  assert(csvRes.headers["content-type"]?.includes("text/csv") === true, "Activity log export Content-Type is text/csv");
  assert(csvRes.body.includes("Timestamp,User,Role,Action"), "CSV export contains standard audit header row");

  // Immutability: Deletion strictly blocked (PRD 4.8.3)
  const delLogRes = await app.inject({
    method: "DELETE",
    url: `/api/v1/activity-logs/${logsData.logs[0].id}`,
    headers: { cookie: manager.cookie },
  });
  assert(delLogRes.statusCode === 403, "Activity log deletion strictly forbidden (immutable, PRD 4.8.3)");

  // 8.4.2 Temporary back-entry grant
  const grantRes = await app.inject({
    method: "POST",
    url: "/api/v1/auth/back-entry-grant",
    headers: { cookie: manager.cookie },
    payload: {
      userId: waiter.user.id,
      durationHours: 12,
      reason: "Test Phase 8 - Power outage paper entry",
    },
  });
  assert(grantRes.statusCode === 201, "Manager grants temporary back-entry permission (PRD 4.5.2)");

  const checkGrantRes = await app.inject({
    method: "GET",
    url: "/api/v1/auth/back-entry-grant",
    headers: { cookie: waiter.cookie },
  });
  assert(checkGrantRes.statusCode === 200, "Check back-entry permission returns 200 OK");
  const grantStatus = JSON.parse(checkGrantRes.body);
  assert(grantStatus.hasPermission === true, "Waiter now has active back-entry permission");

  // Clean up test order
  await prisma.order.delete({ where: { id: testOrder.id } });

  console.log("\n=================================================");
  console.log("   ALL PHASE 8 ACCEPTANCE CRITERIA VERIFIED (PASS)");
  console.log("=================================================\n");
  process.exit(0);
}

runPhase8Tests().catch((err) => {
  console.error("Unhandled test error:", err);
  process.exit(1);
});
