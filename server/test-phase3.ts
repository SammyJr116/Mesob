import { buildApp } from "./src/server.js";
import { prisma } from "./src/lib/prisma.js";
import { calculateBill } from "./src/modules/billing/calculator.js";
import { io as ClientSocket } from "socket.io-client";
import { Role } from "@prisma/client";

async function runPhase3Tests() {
  console.log("=== STARTING PHASE 3 VERIFICATION SUITE ===");
  process.env.DISABLE_AUTO_START = "1";
  process.env.NODE_ENV = "test";

  const app = await buildApp();
  const address = await app.listen({ port: 4001, host: "127.0.0.1" });
  console.log(`Test server running at ${address}`);

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
    // -----------------------------------------------------------------
    // 1. Task 3.3.1: Strict Financial Bill Engine (PRD 11.1.2 Test Case)
    // -----------------------------------------------------------------
    console.log("\n--- Testing Task 3.3.1: Financial Bill Engine ---");
    const testCalculation = calculateBill(
      [{ name: "Test Meal", quantity: 1, unitPrice: 1000.0 }],
      { discountPercent: 10, taxRatePercent: 15, serviceChargePercent: 10 }
    );

    assert(testCalculation.subtotal === 1000.0, "Item subtotal is exactly 1000.00 ETB");
    assert(testCalculation.serviceChargeAmount === 100.0, "Service charge (10% of subtotal before discount) is 100.00 ETB");
    assert(testCalculation.discountAmount === 100.0, "Discount (10% of subtotal) is 100.00 ETB");
    assert(testCalculation.total === 1000.0, "Total payable is exactly 1000.00 ETB (1000 - 100 + 100)");
    assert(testCalculation.taxableAmount === 900.0, "Taxable amount is exactly 900.00 ETB (1000 - 100)");
    assert(testCalculation.taxAmount === 117.39, "Tax portion extracted (15% VAT on 900) is 117.39 ETB (matches PRD 11.1.2)");
    assert(testCalculation.netSales === 782.61, "Net sales is 782.61 ETB (900 - 117.39, matches PRD 11.1.2)");

    // -----------------------------------------------------------------
    // 2. Setup Logins (Manager, Waiter, Kitchen)
    // -----------------------------------------------------------------
    console.log("\n--- Setting up Logins for Role Testing ---");
    const managerLogin = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { login: "owner", password: "mesob1234" },
    });
    const managerCookie = String(managerLogin.headers["set-cookie"]);

    const waiterLogin = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { login: "selam", password: "mesob1234" },
    });
    const waiterCookie = String(waiterLogin.headers["set-cookie"]);

    const kitchenLogin = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { login: "chef", password: "mesob1234" },
    });
    const kitchenCookie = String(kitchenLogin.headers["set-cookie"]);

    // Extract raw tokens for WebSockets
    const waiterToken = app.jwt.sign({ id: "waiter_test", username: "selam", role: Role.WAITER, employeeId: "E01" });
    const kitchenToken = app.jwt.sign({ id: "kitchen_test", username: "chef", role: Role.KITCHEN });

    // -----------------------------------------------------------------
    // 3. Task 3.1: Socket.io Real-Time Dispatch Gateway
    // -----------------------------------------------------------------
    const kitchenSocket = ClientSocket(`http://127.0.0.1:4001`, {
      auth: { token: kitchenToken },
      transports: ["websocket", "polling"],
      timeout: 5000,
    });

    const waiterSocket = ClientSocket(`http://127.0.0.1:4001`, {
      auth: { token: waiterToken },
      transports: ["websocket", "polling"],
      timeout: 5000,
    });

    await new Promise((resolve) => {
      let count = 0;
      const timer = setTimeout(() => {
        resolve(null);
      }, 4000);

      kitchenSocket.on("connect", () => {
        if (++count === 2) {
          clearTimeout(timer);
          resolve(null);
        }
      });
      waiterSocket.on("connect", () => {
        if (++count === 2) {
          clearTimeout(timer);
          resolve(null);
        }
      });
      kitchenSocket.on("connect_error", (err) => console.log("Kitchen socket error:", err.message));
      waiterSocket.on("connect_error", (err) => console.log("Waiter socket error:", err.message));
    });
    assert(kitchenSocket.connected, "Kitchen WebSocket connected and authenticated");
    assert(waiterSocket.connected, "Waiter WebSocket connected and authenticated");

    let kitchenReceivedSound = false;
    kitchenSocket.on("ticket:submitted", (payload: any) => {
      if (payload.playSound === true) {
        kitchenReceivedSound = true;
      }
    });

    let waiterReceivedSound = false;
    waiterSocket.on("ticket:ready", (payload: any) => {
      if (payload.playSound === true) {
        waiterReceivedSound = true;
      }
    });

    // -----------------------------------------------------------------
    // 4. Task 3.2.1: Open Order & Dispatch Ticket
    // -----------------------------------------------------------------
    console.log("\n--- Testing Task 3.2.1: Order Creation & Ticket Dispatch ---");
    // Ensure Table 7 is Available for test
    const table7 = await prisma.table.upsert({
      where: { number: "7" },
      update: { status: "Available" },
      create: { number: "7", seats: 4, section: "Main Hall", status: "Available" },
    });

    const doroWot = await prisma.menuItem.findFirst({ where: { name: "Doro Wot" }, include: { variants: true } });
    assert(Boolean(doroWot), "Doro Wot menu item exists");

    const openOrderRes = await app.inject({
      method: "POST",
      url: "/api/v1/orders",
      headers: { cookie: waiterCookie },
      payload: {
        type: "Dine-in",
        tableNumber: "7",
        guestCount: 2,
        notes: "Anniversary table",
        items: [
          {
            menuItemId: doroWot!.id,
            variantId: doroWot!.variants[0]?.id,
            quantity: 2,
            notes: "extra spicy",
          },
        ],
      },
    });

    assert(openOrderRes.statusCode === 201, "Open dine-in order returns 201 Created");
    const openOrderData = JSON.parse(openOrderRes.body).order;
    assert(openOrderData.status === "Active", "Order status is Active");
    assert(openOrderData.orderNumber.startsWith("ORD-"), "Order number assigned sequentially (ORD-XXXX)");

    // Verify Table status updated to Occupied
    const updatedTable7 = await prisma.table.findUnique({ where: { number: "7" } });
    assert(updatedTable7?.status === "Occupied", "Table 7 transitioned to Occupied automatically (PRD 8.2)");

    // Give 200ms for WebSocket delivery
    await new Promise((r) => setTimeout(r, 200));
    assert(kitchenReceivedSound, "Kitchen received ticket:submitted event with playSound: true (PRD 10.4.1)");

    // -----------------------------------------------------------------
    // 5. Task 3.2.1 & 3.2.2: Second Round & Cancellation
    // -----------------------------------------------------------------
    console.log("\n--- Testing Ticket Round 2 & Item Cancellation ---");
    const macchiato = await prisma.menuItem.findFirst({ where: { name: "Macchiato" }, include: { variants: true } });

    const round2Res = await app.inject({
      method: "POST",
      url: `/api/v1/orders/${openOrderData.id}/tickets`,
      headers: { cookie: waiterCookie },
      payload: {
        items: [
          {
            menuItemId: macchiato!.id,
            variantId: macchiato!.variants[0]?.id,
            quantity: 2,
            notes: "less sugar",
          },
        ],
      },
    });

    assert(round2Res.statusCode === 201, "Second ticket round dispatched (Round 2)");
    const round2Data = JSON.parse(round2Res.body).ticket;
    assert(round2Data.roundNumber === 2, "Second batch has roundNumber 2 (PRD 9.4)");
    assert(round2Data.status === "Submitted", "New round starts as Submitted");

    // Cancel item without reason -> MUST FAIL with 400
    const cancelNoReasonRes = await app.inject({
      method: "POST",
      url: `/api/v1/orders/items/${round2Data.items[0].id}/cancel`,
      headers: { cookie: waiterCookie },
      payload: { reason: "" },
    });
    assert(cancelNoReasonRes.statusCode === 400, "Cancelling item without reason rejected (PRD 9.6.1)");

    // -----------------------------------------------------------------
    // 6. Task 3.2.2 & 3.2.3: Kitchen Lifecycle & Waiter Serving
    // -----------------------------------------------------------------
    console.log("\n--- Testing Task 3.2.2 & 3.2.3: Ticket Lifecycle ---");
    const round1Id = openOrderData.tickets[0].id;

    // Kitchen moves Round 1 to Preparing
    const prepRes = await app.inject({
      method: "PATCH",
      url: `/api/v1/tickets/${round1Id}/status`,
      headers: { cookie: kitchenCookie },
      payload: { status: "Preparing" },
    });
    assert(prepRes.statusCode === 200, "Kitchen moves ticket to Preparing");

    // Kitchen moves Round 1 to Ready
    const readyRes = await app.inject({
      method: "PATCH",
      url: `/api/v1/tickets/${round1Id}/status`,
      headers: { cookie: kitchenCookie },
      payload: { status: "Ready" },
    });
    assert(readyRes.statusCode === 200, "Kitchen moves ticket to Ready");

    await new Promise((r) => setTimeout(r, 200));
    assert(waiterReceivedSound, "Owning waiter received ticket:ready event with playSound: true (PRD 10.4.1)");

    // Kitchen attempts to mark Served -> MUST FAIL (PRD 10.2.2)
    const kitchenServeRes = await app.inject({
      method: "POST",
      url: `/api/v1/tickets/${round1Id}/serve`,
      headers: { cookie: kitchenCookie },
    });
    assert(kitchenServeRes.statusCode === 403, "Kitchen staff forbidden from marking ticket Served (PRD 10.2.2)");

    // Waiter marks Round 1 Served -> SUCCESS
    const waiterServeRes = await app.inject({
      method: "POST",
      url: `/api/v1/tickets/${round1Id}/serve`,
      headers: { cookie: waiterCookie },
    });
    assert(waiterServeRes.statusCode === 200, "Owning waiter marks ticket Served (PRD 9.5.1)");

    // Also progress Round 2 to Served
    await app.inject({
      method: "PATCH",
      url: `/api/v1/tickets/${round2Data.id}/status`,
      headers: { cookie: kitchenCookie },
      payload: { status: "Preparing" },
    });
    await app.inject({
      method: "PATCH",
      url: `/api/v1/tickets/${round2Data.id}/status`,
      headers: { cookie: kitchenCookie },
      payload: { status: "Ready" },
    });
    const round2ServeRes = await app.inject({
      method: "POST",
      url: `/api/v1/tickets/${round2Data.id}/serve`,
      headers: { cookie: waiterCookie },
    });
    assert(round2ServeRes.statusCode === 200, "Round 2 marked Served");

    // Check order status is now Served
    const servedOrderRes = await app.inject({
      method: "GET",
      url: `/api/v1/orders/${openOrderData.id}`,
      headers: { cookie: waiterCookie },
    });
    const servedOrderData = JSON.parse(servedOrderRes.body).order;
    assert(servedOrderData.status === "Served", "Order status transitioned to Served when all tickets are Served (PRD 9.5.2)");

    // -----------------------------------------------------------------
    // 7. Task 3.3.2: Payment & Continuous Invoicing
    // -----------------------------------------------------------------
    console.log("\n--- Testing Task 3.3.2: Payment & Continuous Invoicing ---");
    // Apply 10% manager discount
    const discountRes = await app.inject({
      method: "POST",
      url: `/api/v1/orders/${openOrderData.id}/discount`,
      headers: { cookie: managerCookie },
      payload: { percent: 10, reason: "VIP Guest" },
    });
    assert(discountRes.statusCode === 200, "Manager applies 10% discount successfully");

    // Record Payment
    const paymentRes = await app.inject({
      method: "POST",
      url: `/api/v1/billing/orders/${openOrderData.id}/payment`,
      headers: { cookie: waiterCookie },
      payload: {
        paymentMethod: "Cash",
        buyerName: "Dawit Kebede",
        buyerTin: "TIN-987654",
      },
    });

    assert(paymentRes.statusCode === 200, "Record payment returns 200 OK");
    const paymentData = JSON.parse(paymentRes.body);
    const invoice = paymentData.invoice;
    assert(invoice.invoiceNumber.startsWith("INV-"), "Generated strictly continuous invoice number (INV-XXXXXX)");
    assert(Number(invoice.discount) > 0, "Invoice reflects applied discount");
    assert(Number(invoice.serviceCharge) > 0, "Invoice reflects 10% service charge");

    // Verify order completed
    assert(paymentData.order.status === "Completed", "Order transitioned to Completed (PRD 9.5.2)");

    // Verify Table 7 transitioned to Cleaning & cleaning task created (PRD 11.8.1, 14.6)
    const cleaningTable7 = await prisma.table.findUnique({ where: { number: "7" } });
    assert(cleaningTable7?.status === "Cleaning", "Table 7 transitioned to Cleaning upon payment (PRD 11.8.1)");

    const cleanTask = await prisma.cleaningTask.findFirst({ where: { tableId: table7.id } });
    assert(Boolean(cleanTask), "Auto-created table-clean task in queue (PRD 14.6)");

    // -----------------------------------------------------------------
    // 8. Task 3.3.2: Credit Note Issuance
    // -----------------------------------------------------------------
    console.log("\n--- Testing Credit Note Issuance ---");
    const creditNoteRes = await app.inject({
      method: "POST",
      url: `/api/v1/billing/invoices/${invoice.id}/credit-note`,
      headers: { cookie: managerCookie },
      payload: {
        amount: 50.0,
        reason: "Customer dissatisfaction with beverage temperature",
        refundMethod: "Cash",
      },
    });

    assert(creditNoteRes.statusCode === 201, "Manager issues credit note successfully (PRD 11.7)");
    const creditNote = JSON.parse(creditNoteRes.body).creditNote;
    assert(creditNote.creditNoteNumber.startsWith("CN-"), "Credit note assigned continuous sequence (CN-XXXXXX)");
    assert(Number(creditNote.taxAmount) > 0, "Credit note proportional tax portion calculated");

    // Credit note exceeding invoice total -> MUST FAIL
    const creditNoteExceedRes = await app.inject({
      method: "POST",
      url: `/api/v1/billing/invoices/${invoice.id}/credit-note`,
      headers: { cookie: managerCookie },
      payload: {
        amount: 999999.0,
        reason: "Excessive refund test",
        refundMethod: "Cash",
      },
    });
    assert(creditNoteExceedRes.statusCode === 400, "Credit note exceeding invoice total rejected (PRD 11.7.3)");

    // -----------------------------------------------------------------
    // 9. Task 3.3.3: Legal PDF Invoice Generator
    // -----------------------------------------------------------------
    console.log("\n--- Testing Task 3.3.3: PDF Invoice Stream ---");
    const pdfRes = await app.inject({
      method: "GET",
      url: `/api/v1/billing/invoices/${invoice.id}/pdf`,
      headers: { cookie: waiterCookie },
    });

    assert(pdfRes.statusCode === 200, "PDF invoice endpoint returns 200 OK");
    assert(pdfRes.headers["content-type"] === "application/pdf", "Content-Type is application/pdf");
    assert(pdfRes.rawPayload.length > 500, "Downloaded PDF contains non-empty valid binary payload");
    assert(pdfRes.rawPayload.slice(0, 4).toString() === "%PDF", "Payload starts with standard %PDF magic bytes");

    kitchenSocket.disconnect();
    waiterSocket.disconnect();

    console.log(`\n=== PHASE 3 SUITE COMPLETE: ${passed} PASSED, ${failed} FAILED ===`);
    if (failed > 0) process.exit(1);
  } catch (err) {
    console.error("Test execution failed:", err);
    process.exit(1);
  } finally {
    await app.close();
    await prisma.$disconnect();
  }
}

runPhase3Tests();
