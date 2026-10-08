import { buildApp } from "./src/server.js";
import { prisma } from "./src/lib/prisma.js";
import { calculateBill } from "./src/modules/billing/calculator.js";
import { Role } from "@prisma/client";

async function runStage1Acceptance() {
  console.log("=================================================");
  console.log("   MESOB RMS - STAGE 1 ACCEPTANCE SUITE (PRD 25.4.1)   ");
  console.log("=================================================");

  process.env.DISABLE_AUTO_START = "1";
  process.env.NODE_ENV = "test";

  const app = await buildApp();
  const address = await app.listen({ port: 4011, host: "127.0.0.1" });
  const baseUrl = `${address}/api/v1`;

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, desc: string) {
    if (condition) {
      console.log(`[PASS] ${desc}`);
      passed++;
    } else {
      console.error(`[FAIL] ${desc}`);
      failed++;
      throw new Error(`Assertion failed: ${desc}`);
    }
  }

  try {
    // -------------------------------------------------------------
    // PRD 25.4.1.1: Users, Roles, Lockout & RBAC
    // -------------------------------------------------------------
    console.log("\n--- PRD 25.4.1.1: Users, Roles, Lockout & RBAC ---");

    // 1. Sign in works by username or email
    const loginManager = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ login: "owner", password: "mesob1234" }),
    });
    assert(loginManager.status === 200, "Manager signs in successfully by username");
    const managerCookie = loginManager.headers.get("set-cookie") || "";

    const loginWaiter = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ login: "selam@mesob.et", password: "mesob1234" }),
    });
    assert(loginWaiter.status === 200, "Waiter signs in successfully by email (selam@mesob.et)");
    const waiterCookie = loginWaiter.headers.get("set-cookie") || "";

    const loginKitchen = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ login: "chef", password: "mesob1234" }),
    });
    assert(loginKitchen.status === 200, "Kitchen signs in successfully");
    const kitchenCookie = loginKitchen.headers.get("set-cookie") || "";

    const loginCleaner = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ login: "tigist", password: "mesob1234" }),
    });
    assert(loginCleaner.status === 200, "Cleaner signs in successfully");
    const cleanerCookie = loginCleaner.headers.get("set-cookie") || "";

    // 2. Lockout test on dummy user
    const testLockedUser = "lockout_tester_s1";
    await prisma.user.upsert({
      where: { username: testLockedUser },
      update: { failedAttempts: 0, status: "ACTIVE", lockedUntil: null },
      create: {
        username: testLockedUser,
        email: "lockout_s1@mesob.et",
        passwordHash: "$2a$10$wE.K9X4N9oXk0m9R12345678901234567890123456789012345678",
        role: Role.WAITER,
      },
    });

    for (let i = 0; i < 4; i++) {
      await fetch(`${baseUrl}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login: testLockedUser, password: "WrongPassword!" }),
      });
    }
    const fifthAttempt = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ login: testLockedUser, password: "WrongPassword!" }),
    });
    assert(fifthAttempt.status === 423, "5 failed attempts lock the account (423 Locked - PRD 6.5)");

    // Administrator unlocks
    const adminLogin = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ login: "admin1", password: "mesob1234" }),
    });
    assert(adminLogin.status === 200, "Admin logs in successfully");
    const adminCookie = adminLogin.headers.get("set-cookie") || "";

    const userToUnlock = await prisma.user.findUnique({ where: { username: testLockedUser } });
    const unlockRes = await fetch(`${baseUrl}/auth/unlock/${userToUnlock!.id}`, {
      method: "POST",
      headers: { Cookie: adminCookie },
    });
    assert(unlockRes.status === 200, "Administrator unlocks account (PRD 6.5.3)");

    // 3. RBAC gating: waiter cannot reach reports
    const waiterReportsAttempt = await fetch(`${baseUrl}/reports/sales-summary?startDate=2026-10-15&endDate=2026-10-15`, {
      headers: { Cookie: waiterCookie },
    });
    assert(waiterReportsAttempt.status === 403, "Server refuses forbidden action for unauthorized role (PRD 3.3)");

    // -------------------------------------------------------------
    // PRD 25.4.1.2 & 25.4.1.3: Order Open, Variant, Addon, Multiple Tickets
    // -------------------------------------------------------------
    console.log("\n--- PRD 25.4.1.2 & 25.4.1.3: Order Open, Addons, Multiple Tickets ---");

    const todayDate = "2026-10-20";
    await prisma.setting.upsert({
      where: { id: "singleton" },
      update: { currentBusinessDate: todayDate, delayedTicketMinutes: 20 },
      create: { id: "singleton", currentBusinessDate: todayDate, delayedTicketMinutes: 20 },
    });

    const testTable1 = await prisma.table.upsert({
      where: { number: "T1" },
      update: { status: "Available", seats: 4 },
      create: { number: "T1", section: "Main Dining", seats: 4, status: "Available" },
    });

    // Clean up any lingering cleaning tasks on test table
    await prisma.cleaningTask.deleteMany({ where: { tableId: testTable1.id } });

    const menuItem = await prisma.menuItem.findFirst({
      where: { name: { contains: "Doro" } },
      include: { variants: true, addons: { include: { addon: true } } },
    });
    assert(!!menuItem, "Menu item exists in database");

    const selectedVariant = menuItem!.variants[0];
    const selectedAddon = menuItem!.addons[0];

    // Waiter opens order on Available table
    const orderRes = await fetch(`${baseUrl}/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: waiterCookie },
      body: JSON.stringify({
        type: "Dine-in",
        tableId: testTable1.id,
        guestCount: 2,
        items: [
          {
            menuItemId: menuItem!.id,
            variantId: selectedVariant?.id,
            quantity: 1,
            addons: selectedAddon ? [{ id: selectedAddon.addon.id, name: selectedAddon.addon.name, price: Number(selectedAddon.addon.price) }] : [],
          },
        ],
      }),
    });
    assert(orderRes.status === 201, "Waiter opens order on Available table with variant and addons (PRD 25.4.1.2)");
    const orderData = (await orderRes.json()) as any;
    const orderId = orderData.order.id;

    // Table transitioned to Occupied
    const refreshedTable = await prisma.table.findUnique({ where: { id: testTable1.id } });
    assert(refreshedTable?.status === "Occupied", "Table transitions to Occupied upon order creation (PRD 8.2)");

    // Round 2: Second batch on same order creates separate ticket (PRD 25.4.1.3)
    const round2Res = await fetch(`${baseUrl}/orders/${orderId}/tickets`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: waiterCookie },
      body: JSON.stringify({
        items: [{ menuItemId: menuItem!.id, quantity: 1 }],
      }),
    });
    assert(round2Res.status === 201, "Second batch on same order creates separate ticket Round 2 (PRD 25.4.1.3)");
    const round2Data = (await round2Res.json()) as any;
    const round2TicketId = round2Data.ticket.id;
    assert(round2Data.ticket.roundNumber === 2, "Second batch has roundNumber = 2");

    // -------------------------------------------------------------
    // PRD 25.4.1.4: Item Cancellation on Submitted vs Preparing
    // -------------------------------------------------------------
    console.log("\n--- PRD 25.4.1.4: Item Cancellation on Submitted vs Preparing ---");

    const ticket1Id = orderData.order.tickets[0].id;
    const ticket1ItemId = orderData.order.tickets[0].items[0].id;

    // Cancelling item on Submitted ticket without reason is rejected
    const cancelNoReason = await fetch(`${baseUrl}/orders/items/${ticket1ItemId}/cancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: waiterCookie },
      body: JSON.stringify({}),
    });
    assert(cancelNoReason.status === 400, "Cancelling item without reason rejected (PRD 9.6.1)");

    // Cancelling item with reason on Submitted ticket succeeds
    const cancelWithReason = await fetch(`${baseUrl}/orders/items/${ticket1ItemId}/cancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: waiterCookie },
      body: JSON.stringify({ reason: "Guest changed mind before cooking" }),
    });
    assert(cancelWithReason.status === 200, "Waiter cancels item on Submitted ticket with reason (PRD 25.4.1.4)");

    // -------------------------------------------------------------
    // PRD 25.4.1.5: Kitchen Preparing -> Ready -> Waiter Marks Served
    // -------------------------------------------------------------
    console.log("\n--- PRD 25.4.1.5: Kitchen Workflow & Waiter Serving ---");

    // Kitchen moves Round 2 ticket to Preparing
    const prepRes = await fetch(`${baseUrl}/tickets/${round2TicketId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: kitchenCookie },
      body: JSON.stringify({ status: "Preparing" }),
    });
    assert(prepRes.status === 200, "Kitchen marks ticket Preparing (PRD 10.2)");

    // Waiter cannot cancel an item once ticket is Preparing (PRD 25.4.1.4)
    const round2ItemId = round2Data.ticket.items[0].id;
    const waiterCancelPreparing = await fetch(`${baseUrl}/orders/items/${round2ItemId}/cancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: waiterCookie },
      body: JSON.stringify({ reason: "Trying to cancel while preparing" }),
    });
    assert(waiterCancelPreparing.status === 403, "Waiter cannot cancel item on Preparing ticket (PRD 25.4.1.4)");

    // Kitchen marks Ready
    const readyRes = await fetch(`${baseUrl}/tickets/${round2TicketId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: kitchenCookie },
      body: JSON.stringify({ status: "Ready" }),
    });
    assert(readyRes.status === 200, "Kitchen marks ticket Ready (PRD 10.2)");

    // Kitchen staff forbidden from marking Served
    const kitchenServeAttempt = await fetch(`${baseUrl}/tickets/${round2TicketId}/serve`, {
      method: "POST",
      headers: { Cookie: kitchenCookie },
    });
    assert(kitchenServeAttempt.status === 403, "Kitchen forbidden from marking ticket Served (PRD 10.2.2)");

    // Owning waiter marks Served
    const waiterServe = await fetch(`${baseUrl}/tickets/${round2TicketId}/serve`, {
      method: "POST",
      headers: { Cookie: waiterCookie },
    });
    assert(waiterServe.status === 200, "Owning waiter marks ticket Served (PRD 25.4.1.5)");

    // -------------------------------------------------------------
    // PRD 25.4.1.9 & 25.4.1.10: Financial Billing & Manager Discount
    // -------------------------------------------------------------
    console.log("\n--- PRD 25.4.1.9 & 25.4.1.10: Billing Engine & Manager Discount ---");

    // Worked billing engine test
    const workedBill = calculateBill(
      [{ name: "Special Doro Wot", quantity: 1, unitPrice: 1000.0 }],
      { discountPercent: 10, taxRatePercent: 15, serviceChargePercent: 10 }
    );
    assert(workedBill.subtotal === 1000.0, "Subtotal: 1000.00 ETB");
    assert(workedBill.serviceChargeAmount === 100.0, "Service charge: 100.00 ETB (before discount)");
    assert(workedBill.discountAmount === 100.0, "Discount: 100.00 ETB");
    assert(workedBill.total === 1000.0, "Total: 1000.00 ETB (PRD 11.1.2 worked example)");
    assert(workedBill.taxAmount === 117.39, "Tax extracted: 117.39 ETB (PRD 11.1.2)");
    assert(workedBill.netSales === 782.61, "Net sales: 782.61 ETB (PRD 11.1.2)");

    // Waiter cannot apply discount
    const waiterDiscount = await fetch(`${baseUrl}/orders/${orderId}/discount`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: waiterCookie },
      body: JSON.stringify({ percent: 10, reason: "Waiter discount test" }),
    });
    assert(waiterDiscount.status === 403, "Only Manager can apply discount; Waiter forbidden (PRD 25.4.1.10)");

    // Manager applies discount
    const managerDiscount = await fetch(`${baseUrl}/orders/${orderId}/discount`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: managerCookie },
      body: JSON.stringify({ percent: 10, reason: "VIP Guest Courtesy" }),
    });
    assert(managerDiscount.status === 200, "Manager applies percentage discount successfully (PRD 25.4.1.10)");

    // -------------------------------------------------------------
    // PRD 25.4.1.11: Payment, Continuous Invoicing & PDF Stream
    // -------------------------------------------------------------
    console.log("\n--- PRD 25.4.1.11: Payment, Invoicing & PDF Stream ---");

    const paymentRes = await fetch(`${baseUrl}/billing/orders/${orderId}/payment`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: waiterCookie },
      body: JSON.stringify({
        paymentMethod: "Mobile Money",
        reference: "TLB-778899",
      }),
    });
    assert(paymentRes.status === 200, "Waiter records payment after tickets are Served (PRD 25.4.1.11)");
    const paymentData = (await paymentRes.json()) as any;
    const invoiceNumber = paymentData.invoice.invoiceNumber;
    assert(invoiceNumber.startsWith("INV-"), "Continuous invoice number generated (INV-XXXXXX)");

    // PDF Invoice Stream
    const pdfRes = await fetch(`${baseUrl}/billing/invoices/${paymentData.invoice.id}/pdf`, {
      headers: { Cookie: waiterCookie },
    });
    assert(pdfRes.status === 200, "PDF invoice stream returns 200 OK");
    assert(pdfRes.headers.get("content-type")?.includes("application/pdf"), "Invoice Content-Type is application/pdf");

    // -------------------------------------------------------------
    // PRD 25.4.1.12: Full & Partial Credit Notes
    // -------------------------------------------------------------
    console.log("\n--- PRD 25.4.1.12: Credit Notes ---");

    const creditNoteRes = await fetch(`${baseUrl}/billing/invoices/${paymentData.invoice.id}/credit-note`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: managerCookie },
      body: JSON.stringify({
        amount: 50.0,
        reason: "Customer dissatisfaction with beverage",
        refundMethod: "Mobile Money",
      }),
    });
    assert(creditNoteRes.status === 201, "Manager issues credit note with continuous numbering (PRD 25.4.1.12)");

    // -------------------------------------------------------------
    // PRD 25.4.1.13: Table Cleaning Task & Turnover
    // -------------------------------------------------------------
    console.log("\n--- PRD 25.4.1.13: Table Cleaning & Turnover ---");

    const tableAfterPay = await prisma.table.findUnique({ where: { id: testTable1.id } });
    assert(tableAfterPay?.status === "Cleaning", "Table status transitioned to Cleaning after payment (PRD 25.4.1.13)");

    const cleaningTask = await prisma.cleaningTask.findFirst({
      where: { tableId: testTable1.id, status: { in: ["Pending", "In Progress"] } },
    });
    assert(!!cleaningTask, "Auto-created table-clean task exists in cleaning queue (PRD 25.4.1.13)");

    // Waiter blocked from marking Available before cleaning complete
    const markAvailBlocked = await fetch(`${baseUrl}/cleaning/tables/${testTable1.id}/mark-available`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: waiterCookie },
      body: JSON.stringify({}),
    });
    assert(markAvailBlocked.status === 403, "Waiter blocked from marking Available before cleaner completes task (PRD 25.4.1.13)");

    // Cleaner completes task
    const cleanComplete = await fetch(`${baseUrl}/cleaning/tasks/${cleaningTask!.id}/complete`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: cleanerCookie },
      body: JSON.stringify({ notes: "Table wiped and sanitized" }),
    });
    assert(cleanComplete.status === 200, "Cleaner completes table-clean task");

    // Now waiter marks Available
    const markAvailAllowed = await fetch(`${baseUrl}/cleaning/tables/${testTable1.id}/mark-available`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: waiterCookie },
      body: JSON.stringify({}),
    });
    assert(markAvailAllowed.status === 200, "Waiter marks table Available after cleaning completed (PRD 25.4.1.13)");

    // -------------------------------------------------------------
    // PRD 25.4.1.14: Takeaway Order Requires Phone Number
    // -------------------------------------------------------------
    console.log("\n--- PRD 25.4.1.14: Takeaway Customer Flow ---");

    const takeawayNoPhone = await fetch(`${baseUrl}/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: waiterCookie },
      body: JSON.stringify({
        type: "Takeaway",
        items: [{ menuItemId: menuItem!.id, quantity: 1 }],
      }),
    });
    assert(takeawayNoPhone.status === 400, "Takeaway order requires customer phone number (PRD 25.4.1.14)");

    const takeawayWithPhone = await fetch(`${baseUrl}/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: waiterCookie },
      body: JSON.stringify({
        type: "Takeaway",
        customerPhone: "+251911998877",
        customerName: "Abebe Bikila",
        items: [{ menuItemId: menuItem!.id, quantity: 1 }],
      }),
    });
    assert(takeawayWithPhone.status === 201, "Takeaway order created with customer matching (PRD 25.4.1.14)");

    // -------------------------------------------------------------
    // PRD 25.4.1.15: Order Move to Another Available Table
    // -------------------------------------------------------------
    console.log("\n--- PRD 25.4.1.15: Move Order to Another Table ---");

    const testTable2 = await prisma.table.upsert({
      where: { number: "T2" },
      update: { status: "Available", seats: 4 },
      create: { number: "T2", section: "Main Dining", seats: 4, status: "Available" },
    });

    const orderToMove = await fetch(`${baseUrl}/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: waiterCookie },
      body: JSON.stringify({
        type: "Dine-in",
        tableId: testTable1.id,
        items: [{ menuItemId: menuItem!.id, quantity: 1 }],
      }),
    });
    const orderToMoveData = (await orderToMove.json()) as any;

    const moveRes = await fetch(`${baseUrl}/orders/${orderToMoveData.order.id}/move-table`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: waiterCookie },
      body: JSON.stringify({ targetTableId: testTable2.id }),
    });
    assert(moveRes.status === 200, "Order successfully moved to another Available table (PRD 25.4.1.15)");

    console.log("\n=================================================");
    console.log(`   STAGE 1 ACCEPTANCE SUITE PASSED (${passed}/${passed})   `);
    console.log("=================================================");
  } finally {
    await app.close();
  }
}

runStage1Acceptance().catch((err) => {
  console.error("Stage 1 Acceptance test failed:", err);
  process.exit(1);
});
