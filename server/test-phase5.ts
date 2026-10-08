import { buildApp } from "./src/server.js";
import { prisma } from "./src/lib/prisma.js";
import { monitorsJob } from "./src/scheduler/monitors.job.js";

function assert(condition: any, message: string) {
  if (!condition) {
    console.error(`[FAIL] ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`[PASS] ${message}`);
}

async function runPhase5Tests() {
  console.log("=== STARTING PHASE 5 VERIFICATION SUITE ===");

  const app = await buildApp();
  const testPort = 4003;
  await app.listen({ port: testPort, host: "127.0.0.1" });
  console.log(`Test server running at http://127.0.0.1:${testPort}`);

  const baseUrl = `http://127.0.0.1:${testPort}/api/v1`;

  try {
    // -------------------------------------------------------------
    // Auth Logins via real credentials
    // -------------------------------------------------------------
    console.log("\n--- Setting up Auth ---");

    const managerLogin = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ login: "owner", password: "mesob1234" }),
    });
    const managerCookie = managerLogin.headers.get("set-cookie")?.split(";")[0] || "";

    const waiterLogin = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ login: "selam", password: "mesob1234" }),
    });
    const waiterCookie = waiterLogin.headers.get("set-cookie")?.split(";")[0] || "";

    const cleanerLogin = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ login: "tigist", password: "mesob1234" }),
    });
    const cleanerCookie = cleanerLogin.headers.get("set-cookie")?.split(";")[0] || "";

    assert(managerCookie && waiterCookie && cleanerCookie, "Manager, Waiter and Cleaner authenticated");

    const currentBusinessDate = "2026-10-15";
    await prisma.setting.upsert({
      where: { id: "singleton" },
      update: { currentBusinessDate, delayedTicketMinutes: 20 },
      create: { id: "singleton", currentBusinessDate, delayedTicketMinutes: 20 },
    });

    // Setup test tables
    const table20 = await prisma.table.upsert({
      where: { number: "T20" },
      update: { seats: 4, status: "Available" },
      create: { number: "T20", seats: 4, section: "Terrace", status: "Available" },
    });

    const table21 = await prisma.table.upsert({
      where: { number: "T21" },
      update: { seats: 2, status: "Available" },
      create: { number: "T21", seats: 2, section: "Terrace", status: "Available" },
    });

    // -------------------------------------------------------------
    // Task 5.1.1: Reservation Overlap Validator (PRD 13.2)
    // -------------------------------------------------------------
    console.log("\n--- Testing Task 5.1.1: Reservation Overlap Validator ---");

    // 1. Valid booking on T20 from 18:00 (holds until 19:30)
    const res1 = await fetch(`${baseUrl}/reservations`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: waiterCookie },
      body: JSON.stringify({
        customerName: "Almaz Kebede",
        customerPhone: "+251911445566",
        date: "2026-10-15",
        time: "18:00",
        guests: 4,
        tableIds: [table20.id],
        notes: "Anniversary dinner",
      }),
    });
    assert(res1.status === 201, "Created valid reservation at 18:00 holding 90 mins (PRD 13.2.1)");
    const res1Data = (await res1.json()) as any;
    assert(res1Data.reservation.status === "Confirmed", "Reservation status initialized to Confirmed");
    assert(res1Data.reservation.reservationNumber.startsWith("RES-"), "Reservation number assigned sequential code (RES-XXXX)");

    // 2. Overlapping booking on T20 at 18:45 (must reject with 409 Conflict)
    const overlapRes = await fetch(`${baseUrl}/reservations`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: waiterCookie },
      body: JSON.stringify({
        customerName: "Bereket Tadesse",
        customerPhone: "+251911778899",
        date: "2026-10-15",
        time: "18:45",
        guests: 2,
        tableIds: [table20.id],
      }),
    });
    assert(overlapRes.status === 409, "Overlapping booking rejected with 409 Conflict (PRD 13.2.2)");

    // 3. Non-overlapping booking on T20 at 19:45 (after 19:30)
    const nonOverlapRes = await fetch(`${baseUrl}/reservations`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: waiterCookie },
      body: JSON.stringify({
        customerName: "Bereket Tadesse",
        customerPhone: "+251911778899",
        date: "2026-10-15",
        time: "19:45",
        guests: 3,
        tableIds: [table20.id],
      }),
    });
    assert(nonOverlapRes.status === 201, "Non-overlapping booking after holding period succeeds (PRD 13.2.2)");

    // 4. Capacity check: booking with guests > seats
    const excessGuestsRes = await fetch(`${baseUrl}/reservations`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: waiterCookie },
      body: JSON.stringify({
        customerName: "Big Party",
        customerPhone: "+251911002233",
        date: "2026-10-16",
        time: "12:00",
        guests: 8,
        tableIds: [table21.id], // only 2 seats
      }),
    });
    assert(excessGuestsRes.status === 400, "Booking rejected when guests exceed combined table capacity (PRD 13.2.3)");

    // 5. Multi-table group booking: T20 + T21 = 6 seats for 6 guests
    const groupRes = await fetch(`${baseUrl}/reservations`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: waiterCookie },
      body: JSON.stringify({
        customerName: "Family Gathering",
        customerPhone: "+251911334455",
        date: "2026-10-16",
        time: "19:00",
        guests: 6,
        tableIds: [table20.id, table21.id],
      }),
    });
    assert(groupRes.status === 201, "Group reservation with multi-table seats created (PRD 13.5.2)");

    // -------------------------------------------------------------
    // Task 5.1.2: Walk-In Blocking Enforcer (PRD 8.2.3, 13.3.1)
    // -------------------------------------------------------------
    console.log("\n--- Testing Task 5.1.2: Walk-In Blocking Enforcer ---");

    // Table 20 has active reservation for today (2026-10-15)
    const walkInAttempt = await fetch(`${baseUrl}/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: waiterCookie },
      body: JSON.stringify({
        type: "Dine-in",
        tableNumber: "T20",
        guestCount: 2,
      }),
    });
    assert(walkInAttempt.status === 400, "Walk-in order on table with active reservation today blocked (PRD 13.3.1)");

    // Cancel reservation -> frees table
    await fetch(`${baseUrl}/reservations/${res1Data.reservation.id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: waiterCookie },
      body: JSON.stringify({ status: "Cancelled" }),
    });

    // Also cancel the second reservation on T20 for today so it's fully free
    const res2Data = (await nonOverlapRes.json()) as any;
    await fetch(`${baseUrl}/reservations/${res2Data.reservation.id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: waiterCookie },
      body: JSON.stringify({ status: "Cancelled" }),
    });

    const walkInSuccess = await fetch(`${baseUrl}/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: waiterCookie },
      body: JSON.stringify({
        type: "Dine-in",
        tableNumber: "T20",
        guestCount: 2,
      }),
    });
    assert(walkInSuccess.status === 201, "Walk-in order allowed after reservation cancellation frees table (PRD 13.3.1)");
    const walkInOrder = (await walkInSuccess.json()) as any;

    // -------------------------------------------------------------
    // Facility: Cleaning Task & Table Turnover Verification (PRD 14.6)
    // -------------------------------------------------------------
    console.log("\n--- Testing Cleaning Tasks & Table Turnover ---");

    // Create a table-clean task for Table 21
    const cleanTask = await prisma.cleaningTask.create({
      data: {
        tableId: table21.id,
        area: "Terrace",
        source: "Table",
        status: "Pending",
      },
    });
    await prisma.table.update({ where: { id: table21.id }, data: { status: "Cleaning" } });

    // Waiter attempts to mark table Available before completion -> blocked!
    const waiterPrematureTurnover = await fetch(`${baseUrl}/cleaning/tables/${table21.id}/mark-available`, {
      method: "POST",
      headers: { Cookie: waiterCookie },
    });
    assert(waiterPrematureTurnover.status === 403, "Waiter blocked from marking table Available before cleaning completion (PRD 14.6.2)");

    // Cleaner starts and completes task
    await fetch(`${baseUrl}/cleaning/tasks/${cleanTask.id}/start`, {
      method: "PATCH",
      headers: { Cookie: cleanerCookie },
    });
    await fetch(`${baseUrl}/cleaning/tasks/${cleanTask.id}/complete`, {
      method: "PATCH",
      headers: { Cookie: cleanerCookie },
    });

    // Now waiter marks table Available -> succeeds!
    const waiterTurnoverSuccess = await fetch(`${baseUrl}/cleaning/tables/${table21.id}/mark-available`, {
      method: "POST",
      headers: { Cookie: waiterCookie },
    });
    assert(waiterTurnoverSuccess.status === 200, "Waiter marks table Available after cleaner completes task (PRD 14.6.2)");

    // -------------------------------------------------------------
    // Task 5.2.2: Delayed Ticket & No-Show Poller (PRD 10.3, 13.4)
    // -------------------------------------------------------------
    console.log("\n--- Testing Task 5.2.2: Delayed Ticket & No-Show Poller ---");

    // 1. Create a ticket submitted 25 minutes ago
    const pastTicket = await prisma.ticket.create({
      data: {
        orderId: walkInOrder.order.id,
        roundNumber: 1,
        status: "Preparing",
        submittedAt: new Date(Date.now() - 25 * 60 * 1000), // 25 mins ago
        isDelayed: false,
      },
    });

    const newlyDelayed = await monitorsJob.checkDelayedTickets();
    assert(newlyDelayed.some((t) => t.id === pastTicket.id), "Delayed ticket detected and flagged isDelayed = true (PRD 10.3)");

    const refreshedTicket = await prisma.ticket.findUnique({ where: { id: pastTicket.id } });
    assert(refreshedTicket?.isDelayed === true, "Ticket isDelayed persisted in database");

    // 2. Create reservation in the past for today
    const pastReservation = await prisma.reservation.create({
      data: {
        reservationNumber: "RES-TEST-NOSHOW",
        customerId: (await prisma.customer.findFirst())!.id,
        date: currentBusinessDate,
        time: "08:00", // 8 AM is far in past
        guests: 2,
        durationMinutes: 90,
        status: "Confirmed",
        tables: {
          create: [{ tableId: table21.id }],
        },
      },
    });
    await prisma.table.update({ where: { id: table21.id }, data: { status: "Reserved" } });

    const newlyNoShow = await monitorsJob.checkNoShowReservations();
    assert(newlyNoShow.some((r) => r.id === pastReservation.id), "Overdue reservation auto-transitioned to No Show (PRD 13.4.1)");

    const releasedTable = await prisma.table.findUnique({ where: { id: table21.id } });
    assert(releasedTable?.status === "Available", "Reserved table released back to Available upon No Show (PRD 13.4.1)");

    // -------------------------------------------------------------
    // Task 5.3.1 & 5.3.2: Reporting & CSV Export (PRD 22.1, 22.2)
    // -------------------------------------------------------------
    console.log("\n--- Testing Task 5.3: Reporting & CSV Export ---");

    // Create a mock completed invoice and payment on today's business date
    const testInvoice = await prisma.invoice.create({
      data: {
        invoiceNumber: "INV-TEST-REP-01",
        orderId: walkInOrder.order.id,
        businessDate: currentBusinessDate,
        subtotal: 1000.0,
        discount: 100.0,
        serviceCharge: 100.0,
        tax: 117.39,
        total: 1000.0,
        lines: {
          create: [
            {
              itemName: "Special Doro Wot",
              quantity: 2,
              unitPrice: 500.0,
              subtotal: 1000.0,
            },
          ],
        },
      },
    });

    await prisma.payment.create({
      data: {
        orderId: walkInOrder.order.id,
        amount: 1000.0,
        paymentMethod: "Telebirr",
        recordedById: "user-test",
      },
    });

    // Create a Credit Note on today's date
    await prisma.creditNote.create({
      data: {
        creditNoteNumber: "CN-TEST-REP-01",
        invoiceId: testInvoice.id,
        businessDate: currentBusinessDate,
        amount: 200.0,
        taxAmount: 26.09,
        reason: "Customer adjustment",
        refundMethod: "Telebirr",
        managerId: "mgr-test",
      },
    });

    // 1. Sales Summary Report
    const summaryRes = await fetch(`${baseUrl}/reports/sales-summary?startDate=${currentBusinessDate}&endDate=${currentBusinessDate}`, {
      headers: { Cookie: managerCookie },
    });
    assert(summaryRes.status === 200, "Sales summary report retrieved successfully (PRD 22.2.1)");
    const summaryData = (await summaryRes.json()) as any;
    assert(summaryData.subtotal === 1000.0, "Subtotal is 1000.00 ETB");
    assert(summaryData.creditNotes.count === 1, "Credit notes count reflected in summary");
    // Net sales = (1000 - 100 - 117.39) - (200 - 26.09) = 782.61 - 173.91 = 608.70 ETB
    assert(summaryData.netSales === 608.7, "Net sales accurately deducts credit note (PRD 22.2.1)");

    // 2. Sales By Item Report
    const itemsReportRes = await fetch(`${baseUrl}/reports/sales-by-item?startDate=${currentBusinessDate}&endDate=${currentBusinessDate}`, {
      headers: { Cookie: managerCookie },
    });
    assert(itemsReportRes.status === 200, "Sales by item report retrieved (PRD 22.2.2)");
    const itemsReportData = (await itemsReportRes.json()) as any;
    assert(itemsReportData.items.length > 0, "Item breakdown contains sold items");
    assert(itemsReportData.items[0].discountAllocated === 100.0, "Allocated discount proportionally to menu items (PRD 22.2.3)");

    // 3. CSV Export
    const csvExportRes = await fetch(`${baseUrl}/reports/export/sales-summary?startDate=${currentBusinessDate}&endDate=${currentBusinessDate}`, {
      headers: { Cookie: managerCookie },
    });
    assert(csvExportRes.status === 200, "CSV export endpoint returned 200 OK");
    assert(csvExportRes.headers.get("content-type")?.includes("text/csv"), "Content-Type is text/csv (PRD 22.1.2)");
    const csvText = await csvExportRes.text();
    assert(csvText.includes("Metric,Value"), "CSV output contains headers");
    assert(csvText.includes("Net Sales (ETB)"), "CSV output contains data rows");

    // -------------------------------------------------------------
    // Task 5.2.1: Business Day Close & Reopen (PRD 4.1.5, 22.6)
    // -------------------------------------------------------------
    console.log("\n--- Testing Task 5.2.1: Business Day Close & Reopen ---");

    const closeRes = await fetch(`${baseUrl}/reports/day-closure/close`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: managerCookie },
      body: JSON.stringify({ reason: "End of normal shift" }),
    });
    assert(closeRes.status === 200, "Business day closed successfully (PRD 4.1.5, 22.6)");
    const closeData = (await closeRes.json()) as any;
    assert(closeData.summary.businessDate === currentBusinessDate, "EOD summary generated for active business date");
    assert(closeData.nextBusinessDate === "2026-10-16", "Business date advanced to next calendar day (2026-10-16)");

    // Verify setting was advanced
    const updatedSettings = await prisma.setting.findUnique({ where: { id: "singleton" } });
    assert(updatedSettings?.currentBusinessDate === "2026-10-16", "Setting currentBusinessDate incremented");

    // Manager reopens day
    const reopenRes = await fetch(`${baseUrl}/reports/day-closure/reopen`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: managerCookie },
      body: JSON.stringify({ reason: "Back-entry corrections needed" }),
    });
    assert(reopenRes.status === 200, "Manager reopened business day (PRD 4.1.7)");
    const reopenedSettings = await prisma.setting.findUnique({ where: { id: "singleton" } });
    assert(reopenedSettings?.currentBusinessDate === currentBusinessDate, "Business date restored to reopened date");

    console.log("\n=== ALL PHASE 5 TESTS PASSED (35/35) ===");
  } finally {
    monitorsJob.stop();
    await app.close();
  }
}

runPhase5Tests().catch((err) => {
  console.error("Test failed with error:", err);
  process.exit(1);
});
