import { buildApp } from "./src/server.js";
import { prisma } from "./src/lib/prisma.js";
import { monitorsJob } from "./src/scheduler/monitors.job.js";

async function runStage3Acceptance() {
  console.log("=================================================");
  console.log("   MESOB RMS - STAGE 3 ACCEPTANCE SUITE (PRD 25.4.3)   ");
  console.log("=================================================");

  process.env.DISABLE_AUTO_START = "1";
  process.env.NODE_ENV = "test";

  const app = await buildApp();
  const address = await app.listen({ port: 4013, host: "127.0.0.1" });
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
    // Auth logins
    const loginManager = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ login: "owner", password: "mesob1234" }),
    });
    const managerCookie = loginManager.headers.get("set-cookie") || "";

    const loginWaiter = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ login: "selam", password: "mesob1234" }),
    });
    const waiterCookie = loginWaiter.headers.get("set-cookie") || "";

    const currentBusinessDate = "2026-10-25";
    await prisma.setting.upsert({
      where: { id: "singleton" },
      update: { currentBusinessDate, delayedTicketMinutes: 20 },
      create: { id: "singleton", currentBusinessDate, delayedTicketMinutes: 20 },
    });

    const table30 = await prisma.table.upsert({
      where: { number: "T30" },
      update: { seats: 4, status: "Available" },
      create: { number: "T30", seats: 4, section: "VIP Lounge", status: "Available" },
    });

    const table31 = await prisma.table.upsert({
      where: { number: "T31" },
      update: { seats: 2, status: "Available" },
      create: { number: "T31", seats: 2, section: "VIP Lounge", status: "Available" },
    });

    // Clean up any test reservations on T30/T31
    await prisma.reservationTable.deleteMany({
      where: { tableId: { in: [table30.id, table31.id] } },
    });

    // -------------------------------------------------------------
    // PRD 25.4.3.1: Reservation Overlap Validator & Capacity Check
    // -------------------------------------------------------------
    console.log("\n--- PRD 25.4.3.1: Reservation Overlap & Capacity Check ---");

    // 1. Valid booking on T30 from 18:00
    const res1 = await fetch(`${baseUrl}/reservations`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: waiterCookie },
      body: JSON.stringify({
        customerName: "Hiwot Assefa",
        customerPhone: "+251911889900",
        date: currentBusinessDate,
        time: "18:00",
        guests: 4,
        tableIds: [table30.id],
      }),
    });
    assert(res1.status === 201, "Confirmed reservation created at 18:00 (PRD 25.4.3.1)");

    // 2. Overlapping booking on same table at 18:30 rejected with 409
    const overlapRes = await fetch(`${baseUrl}/reservations`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: waiterCookie },
      body: JSON.stringify({
        customerName: "Desta Haile",
        customerPhone: "+251911223344",
        date: currentBusinessDate,
        time: "18:30",
        guests: 2,
        tableIds: [table30.id],
      }),
    });
    assert(overlapRes.status === 409, "Overlapping booking rejected with 409 Conflict (PRD 25.4.3.1)");

    // 3. Excess guest count rejected with 400
    const excessGuestsRes = await fetch(`${baseUrl}/reservations`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: waiterCookie },
      body: JSON.stringify({
        customerName: "Large Party Excess",
        customerPhone: "+251911445566",
        date: currentBusinessDate,
        time: "20:00",
        guests: 6,
        tableIds: [table30.id], // only 4 seats
      }),
    });
    assert(excessGuestsRes.status === 400, "Booking rejected when guests exceed combined table seats (PRD 25.4.3.1)");

    // -------------------------------------------------------------
    // PRD 25.4.3.2: Walk-In Blocking on Reserved Table
    // -------------------------------------------------------------
    console.log("\n--- PRD 25.4.3.2: Walk-In Blocking on Reserved Table ---");

    // Walk-in attempt on T30 (has reservation today)
    const walkInAttempt = await fetch(`${baseUrl}/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: waiterCookie },
      body: JSON.stringify({
        type: "Dine-in",
        tableId: table30.id,
        guestCount: 2,
      }),
    });
    assert(walkInAttempt.status === 400, "Walk-in dine-in order on reserved table blocked (PRD 25.4.3.2)");

    // -------------------------------------------------------------
    // PRD 25.4.3.3: Overdue Reservation Auto-Transition to No Show
    // -------------------------------------------------------------
    console.log("\n--- PRD 25.4.3.3: Delayed Ticket & No-Show Poller ---");

    // Create overdue reservation past grace period
    await prisma.reservation.deleteMany({ where: { reservationNumber: "RES-TEST-NOSHOW-S3" } });
    const overdueRes = await prisma.reservation.create({
      data: {
        reservationNumber: "RES-TEST-NOSHOW-S3",
        customerId: (await prisma.customer.findFirst())!.id,
        date: currentBusinessDate,
        time: "07:00", // 7:00 AM past grace
        guests: 2,
        durationMinutes: 90,
        status: "Confirmed",
        tables: { create: [{ tableId: table31.id }] },
      },
    });
    await prisma.table.update({ where: { id: table31.id }, data: { status: "Reserved" } });

    const noShowList = await monitorsJob.checkNoShowReservations();
    assert(noShowList.some((r) => r.id === overdueRes.id), "Overdue reservation auto-transitioned to No Show (PRD 25.4.3.3)");

    const releasedTable = await prisma.table.findUnique({ where: { id: table31.id } });
    assert(releasedTable?.status === "Available", "Table released back to Available upon No Show (PRD 25.4.3.3)");

    // -------------------------------------------------------------
    // PRD 25.4.3.6: Reports, Net Sales Formula & CSV Export
    // -------------------------------------------------------------
    console.log("\n--- PRD 25.4.3.6: Financial Reports & CSV Export ---");

    // Clean up test reports data on currentBusinessDate
    await prisma.creditNote.deleteMany({ where: { businessDate: currentBusinessDate } });
    await prisma.invoiceLine.deleteMany({ where: { invoice: { businessDate: currentBusinessDate } } });
    await prisma.invoice.deleteMany({ where: { businessDate: currentBusinessDate } });
    await prisma.dayClosure.deleteMany({ where: { businessDate: currentBusinessDate } });

    // Create test order & invoice
    const dummyOrder = await prisma.order.create({
      data: {
        orderNumber: "ORD-REP-S3",
        orderDate: currentBusinessDate,
        status: "Completed",
        total: 1000.0,
      },
    });

    const testInvoice = await prisma.invoice.create({
      data: {
        invoiceNumber: "INV-REP-S3",
        orderId: dummyOrder.id,
        businessDate: currentBusinessDate,
        subtotal: 1000.0,
        discount: 100.0,
        serviceCharge: 100.0,
        tax: 117.39,
        total: 1000.0,
        lines: {
          create: [{ itemName: "Traditional Combo", quantity: 1, unitPrice: 1000.0, subtotal: 1000.0 }],
        },
      },
    });

    await prisma.creditNote.create({
      data: {
        creditNoteNumber: "CN-REP-S3",
        invoiceId: testInvoice.id,
        businessDate: currentBusinessDate,
        amount: 200.0,
        taxAmount: 26.09,
        reason: "Customer voucher applied late",
        refundMethod: "Cash",
        managerId: "mgr-test",
      },
    });

    // 1. Sales Summary
    const sumRes = await fetch(`${baseUrl}/reports/sales-summary?startDate=${currentBusinessDate}&endDate=${currentBusinessDate}`, {
      headers: { Cookie: managerCookie },
    });
    assert(sumRes.status === 200, "Sales summary retrieved");
    const sumData = (await sumRes.json()) as any;
    assert(sumData.subtotal === 1000.0, "Subtotal is 1000.00 ETB");
    // Net sales: (1000 - 100 - 117.39) - (200 - 26.09) = 608.70 ETB
    assert(sumData.netSales === 608.7, "Net sales matches PRD 22.2.1 formula exactly (PRD 25.4.3.6)");

    // 2. CSV Export
    const csvRes = await fetch(`${baseUrl}/reports/export/sales-summary?startDate=${currentBusinessDate}&endDate=${currentBusinessDate}`, {
      headers: { Cookie: managerCookie },
    });
    assert(csvRes.status === 200, "CSV export returned 200 OK");
    assert(csvRes.headers.get("content-type")?.includes("text/csv"), "Content-Type is text/csv (PRD 22.1.2)");
    const csvContent = await csvRes.text();
    assert(csvContent.includes("Net Sales (ETB)"), "CSV stream contains financial metrics");

    // -------------------------------------------------------------
    // PRD 25.4.1.16: Business Day Close & Next Business Date
    // -------------------------------------------------------------
    console.log("\n--- PRD 25.4.1.16: Day Close & Next Business Date ---");

    const closeRes = await fetch(`${baseUrl}/reports/day-closure/close`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: managerCookie },
      body: JSON.stringify({ reason: "End of evening service" }),
    });
    assert(closeRes.status === 200, "Business day closed successfully (PRD 25.4.1.16)");
    const closeData = (await closeRes.json()) as any;
    assert(closeData.nextBusinessDate === "2026-10-26", "Business date advanced to 2026-10-26");

    console.log("\n=================================================");
    console.log(`   STAGE 3 ACCEPTANCE SUITE PASSED (${passed}/${passed})   `);
    console.log("=================================================");
  } finally {
    monitorsJob.stop();
    await app.close();
  }
}

runStage3Acceptance().catch((err) => {
  console.error("Stage 3 Acceptance test failed:", err);
  process.exit(1);
});
