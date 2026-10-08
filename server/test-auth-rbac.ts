import { buildApp } from "./src/server.js";
import { prisma } from "./src/lib/prisma.js";
import { Role } from "@prisma/client";

async function runTests() {
  console.log("=== STARTING AUTH & RBAC VERIFICATION SUITE ===");
  process.env.DISABLE_AUTO_START = "1";
  process.env.NODE_ENV = "test";

  const app = await buildApp();
  await app.ready();

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, desc: string) {
    if (condition) {
      console.log(`[PASS] ${desc}`);
      passed++;
    } else {
      console.error(`[FAIL] ${desc}`);
      failed++;
    }
  }

  try {
    // ---------------------------------------------------------------
    // 1. Health check
    // ---------------------------------------------------------------
    const healthRes = await app.inject({ method: "GET", url: "/api/v1/health" });
    assert(healthRes.statusCode === 200, "Health check returns 200 OK");

    // ---------------------------------------------------------------
    // 2. Task 2.3.1: Valid Login & Cookie issuance
    // ---------------------------------------------------------------
    const loginSuccessRes = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { login: "owner", password: "mesob1234" },
    });
    assert(loginSuccessRes.statusCode === 200, "Valid manager login returns 200");
    const loginJson = JSON.parse(loginSuccessRes.body);
    assert(loginJson.user.role === "MANAGER", "Logged-in user has role MANAGER");
    assert(loginJson.user.username === "owner", "Logged-in username is owner");

    // Verify cookie set
    const setCookieHeader = loginSuccessRes.headers["set-cookie"];
    assert(Boolean(setCookieHeader && String(setCookieHeader).includes("mesob_token")), "Response sets signed mesob_token cookie");
    const cookieHeaderStr = Array.isArray(setCookieHeader) ? setCookieHeader.join("; ") : String(setCookieHeader);

    // ---------------------------------------------------------------
    // 3. Invalid credentials (obscured error message - PRD 6.4.3)
    // ---------------------------------------------------------------
    const invalidPassRes = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { login: "owner", password: "wrongpassword" },
    });
    assert(invalidPassRes.statusCode === 401, "Invalid password returns 401");
    const invalidJson = JSON.parse(invalidPassRes.body);
    assert(invalidJson.message === "Invalid username or password", "Error does not reveal password specifics");

    const invalidUserRes = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { login: "nonexistent_person_123", password: "mesob1234" },
    });
    assert(invalidUserRes.statusCode === 401, "Nonexistent user returns 401");
    const invalidUserJson = JSON.parse(invalidUserRes.body);
    assert(invalidUserJson.message === "Invalid username or password", "Error does not reveal whether username exists (PRD 6.4.3)");

    // ---------------------------------------------------------------
    // 4. Task 2.3.2: 5-Attempt Lockout Handler & Admin Unlock
    // ---------------------------------------------------------------
    // Create a temporary test user for lockout test
    const testUser = await prisma.user.upsert({
      where: { username: "lockout_tester" },
      update: { failedAttempts: 0, status: "ACTIVE", lockedUntil: null },
      create: {
        username: "lockout_tester",
        email: "tester@mesob.et",
        passwordHash: "$2a$10$wE.K9X4N9oXk0m9R...dummy", // dummy hash
        role: Role.WAITER,
      },
    });

    // 4 consecutive failed attempts
    for (let i = 1; i <= 4; i++) {
      const failRes = await app.inject({
        method: "POST",
        url: "/api/v1/auth/login",
        payload: { login: "lockout_tester", password: "badpassword" },
      });
      assert(failRes.statusCode === 401, `Failed attempt #${i} returns 401`);
    }

    // 5th attempt must trigger 423 Locked
    const lockRes = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { login: "lockout_tester", password: "badpassword" },
    });
    assert(lockRes.statusCode === 423, "5th failed attempt triggers 423 Locked (PRD 6.5.2)");
    const lockJson = JSON.parse(lockRes.body);
    assert(lockJson.remainingMinutes === 15, "Lockout indicates 15 minutes remaining");

    // Attempting again while locked still returns 423
    const lockedAgainRes = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { login: "lockout_tester", password: "badpassword" },
    });
    assert(lockedAgainRes.statusCode === 423, "Subsequent attempt while locked returns 423 Locked");

    // Login as Admin to get Admin session cookie
    const adminLoginRes = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { login: "admin1", password: "mesob1234" },
    });
    const adminCookie = Array.isArray(adminLoginRes.headers["set-cookie"])
      ? adminLoginRes.headers["set-cookie"].join("; ")
      : String(adminLoginRes.headers["set-cookie"]);

    // Admin unlocks user via POST /api/v1/auth/unlock/:id
    const unlockRes = await app.inject({
      method: "POST",
      url: `/api/v1/auth/unlock/${testUser.id}`,
      headers: { cookie: adminCookie },
    });
    assert(unlockRes.statusCode === 200, "Administrator unlock endpoint returns 200 OK");

    const refreshedUser = await prisma.user.findUnique({ where: { id: testUser.id } });
    assert(refreshedUser?.status === "ACTIVE", "User status restored to ACTIVE after unlock");
    assert(refreshedUser?.failedAttempts === 0, "Failed attempts reset to 0 after unlock");

    // Clean up test user
    await prisma.activityLog.deleteMany({ where: { userId: testUser.id } });
    await prisma.user.delete({ where: { id: testUser.id } });

    // ---------------------------------------------------------------
    // 5. Task 2.3.3: Server-Side RBAC Guard Middleware (PRD 3.3)
    // ---------------------------------------------------------------
    // 5a. Unauthenticated request to protected route
    const unauthReportRes = await app.inject({
      method: "GET",
      url: "/api/v1/reports/test",
    });
    assert(unauthReportRes.statusCode === 401, "Unauthenticated access to protected route returns 401");

    // 5b. Authenticated as Waiter trying to access Manager/Admin-only route
    const waiterLoginRes = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { login: "selam", password: "mesob1234" },
    });
    const waiterCookie = Array.isArray(waiterLoginRes.headers["set-cookie"])
      ? waiterLoginRes.headers["set-cookie"].join("; ")
      : String(waiterLoginRes.headers["set-cookie"]);

    const forbiddenReportRes = await app.inject({
      method: "GET",
      url: "/api/v1/reports/test",
      headers: { cookie: waiterCookie },
    });
    assert(forbiddenReportRes.statusCode === 403, "Waiter role accessing Manager-only route returns 403 Forbidden");

    // 5c. Authenticated as Manager accessing Manager/Admin route
    const allowedReportRes = await app.inject({
      method: "GET",
      url: "/api/v1/reports/test",
      headers: { cookie: cookieHeaderStr },
    });
    assert(allowedReportRes.statusCode === 200, "Manager role accessing Manager route returns 200 OK");
    const allowedJson = JSON.parse(allowedReportRes.body);
    assert(allowedJson.caller.role === "MANAGER", "Report response contains verified caller role");

    // ---------------------------------------------------------------
    // 6. GET /api/v1/auth/me & POST /api/v1/auth/logout
    // ---------------------------------------------------------------
    const meRes = await app.inject({
      method: "GET",
      url: "/api/v1/auth/me",
      headers: { cookie: cookieHeaderStr },
    });
    assert(meRes.statusCode === 200, "/api/v1/auth/me returns 200 with valid session");
    const meJson = JSON.parse(meRes.body);
    assert(meJson.user.username === "owner", "Current session user profile matches owner");

    const logoutRes = await app.inject({
      method: "POST",
      url: "/api/v1/auth/logout",
    });
    assert(logoutRes.statusCode === 200, "Logout returns 200 OK");
    const logoutCookie = String(logoutRes.headers["set-cookie"]);
    assert(logoutCookie.includes("mesob_token=;") || logoutCookie.includes("Max-Age=0"), "Logout clears mesob_token cookie");

    console.log(`\n=== SUITE COMPLETE: ${passed} PASSED, ${failed} FAILED ===`);
    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error("Test execution failed:", err);
    process.exit(1);
  } finally {
    await app.close();
    await prisma.$disconnect();
  }
}

runTests();
