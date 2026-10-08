import { buildApp } from "./src/server.js";
import { prisma } from "./src/lib/prisma.js";
import { depletionService } from "./src/modules/inventory/depletion.service.js";
import { Role } from "@prisma/client";

async function runStage2Acceptance() {
  console.log("=================================================");
  console.log("   MESOB RMS - STAGE 2 ACCEPTANCE SUITE (PRD 25.4.2)   ");
  console.log("=================================================");

  process.env.DISABLE_AUTO_START = "1";
  process.env.NODE_ENV = "test";

  const app = await buildApp();
  const address = await app.listen({ port: 4012, host: "127.0.0.1" });
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

    const loginInventory = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ login: "yonas", password: "mesob1234" }),
    });
    const invCookie = loginInventory.headers.get("set-cookie") || "";

    const loginWaiter = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ login: "selam", password: "mesob1234" }),
    });
    const waiterCookie = loginWaiter.headers.get("set-cookie") || "";

    const loginKitchen = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ login: "chef", password: "mesob1234" }),
    });
    const kitchenCookie = loginKitchen.headers.get("set-cookie") || "";

    await prisma.setting.upsert({
      where: { id: "singleton" },
      update: { inventoryTracking: true },
      create: { id: "singleton", inventoryTracking: true },
    });

    const chickenItem = await prisma.inventoryItem.upsert({
      where: { code: "ING-CHICKEN-01" },
      update: { currentStock: 2000.0, baseUnit: "g", minimumStock: 200.0, reorderQuantity: 2000.0 },
      create: {
        id: "ing-chicken-01",
        code: "ING-CHICKEN-01",
        name: "Fresh Chicken",
        category: "Meat",
        baseUnit: "g",
        currentStock: 2000.0,
        minimumStock: 200.0,
        reorderQuantity: 2000.0,
        costPerUnit: 0.8,
      },
    });

    const category = await prisma.menuCategory.findFirst();

    const doroMenuItem = await prisma.menuItem.upsert({
      where: { id: "item-doro-stage2" },
      update: { manualAvailable: true, autoAvailable: true },
      create: {
        id: "item-doro-stage2",
        name: "Doro Wot Stage 2",
        categoryId: category!.id,
        basePrice: 500,
        manualAvailable: true,
        autoAvailable: true,
      },
    });

    // Create variant: Large (recipe multiplier 1.5)
    const largeVariant = await prisma.itemVariant.upsert({
      where: { id: "var-doro-large-s2" },
      update: { recipeMultiplier: 1.5 },
      create: {
        id: "var-doro-large-s2",
        menuItemId: doroMenuItem.id,
        name: "Large Portion",
        price: 750,
        recipeMultiplier: 1.5,
      },
    });

    // Create Recipe: 400g chicken per base portion
    const recipe = await prisma.recipe.upsert({
      where: { menuItemId: doroMenuItem.id },
      update: { yieldPortions: 1 },
      create: { menuItemId: doroMenuItem.id, yieldPortions: 1 },
    });

    await prisma.recipeLine.deleteMany({ where: { recipeId: recipe.id } });
    await prisma.recipeLine.create({
      data: {
        recipeId: recipe.id,
        inventoryItemId: chickenItem.id,
        quantity: 400, // 400g per base portion
        unit: "g",
      },
    });

    // -------------------------------------------------------------
    // PRD 25.4.2.4: Serving item deducts recipe x variant multiplier x quantity
    // -------------------------------------------------------------
    console.log("\n--- PRD 25.4.2.4: Recipe Depletion upon Serving ---");

    const testTable = await prisma.table.upsert({
      where: { number: "T_STAGE2" },
      update: { status: "Available" },
      create: { number: "T_STAGE2", seats: 4, status: "Available" },
    });

    const orderRes = await fetch(`${baseUrl}/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: waiterCookie },
      body: JSON.stringify({
        type: "Dine-in",
        tableId: testTable.id,
        items: [{ menuItemId: doroMenuItem.id, variantId: largeVariant.id, quantity: 2 }],
      }),
    });
    assert(orderRes.status === 201, "Created dine-in order for 2x Large Doro Wot");
    const orderData = (await orderRes.json()) as any;
    const ticketId = orderData.order.tickets[0].id;

    // Kitchen prepares and readies ticket
    await fetch(`${baseUrl}/tickets/${ticketId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: kitchenCookie },
      body: JSON.stringify({ status: "Preparing" }),
    });
    await fetch(`${baseUrl}/tickets/${ticketId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: kitchenCookie },
      body: JSON.stringify({ status: "Ready" }),
    });

    // Waiter serves ticket -> automatically triggers recipe depletion!
    const serveRes = await fetch(`${baseUrl}/tickets/${ticketId}/serve`, {
      method: "POST",
      headers: { Cookie: waiterCookie },
    });
    assert(serveRes.status === 200, "Ticket served successfully");

    const chickenAfterServe = await prisma.inventoryItem.findUnique({ where: { id: chickenItem.id } });
    // 2000 - 1200 = 800g
    assert(Number(chickenAfterServe?.currentStock) === 800, "Serving 2 Large portions deducted exactly 1,200g (PRD 25.4.2.4)");

    const lastMovement = await prisma.stockMovement.findFirst({
      where: { inventoryItemId: chickenItem.id, type: "Sale" },
      orderBy: { happenedAt: "desc" },
    });
    assert(Number(lastMovement?.quantity) === -1200, "Stock movement of type Sale logged with -1,200g");

    // -------------------------------------------------------------
    // PRD 25.4.2.5: Short Ingredient Triggers Auto-Unavailable
    // -------------------------------------------------------------
    console.log("\n--- PRD 25.4.2.5: Auto-Unavailability Rule ---");

    // Adjust stock down below 1 portion (< 400g)
    const adjustDown = await fetch(`${baseUrl}/inventory/adjust`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: managerCookie },
      body: JSON.stringify({
        inventoryItemId: chickenItem.id,
        quantity: -600, // 800 - 600 = 200g (need 400g)
        reason: "Stock audit reduction",
      }),
    });
    assert(adjustDown.status === 200, "Manager adjusted stock down below 1 portion");

    const refreshedMenu = await prisma.menuItem.findUnique({ where: { id: doroMenuItem.id } });
    assert(refreshedMenu?.autoAvailable === false, "Menu item flagged autoAvailable = false when ingredient < 1 portion (PRD 25.4.2.5)");

    // Restocking clears the autoAvailable flag
    const adjustUp = await fetch(`${baseUrl}/inventory/adjust`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: managerCookie },
      body: JSON.stringify({
        inventoryItemId: chickenItem.id,
        quantity: 1800, // 200 + 1800 = 2000g
        reason: "Restocked from cold storage",
      }),
    });
    assert(adjustUp.status === 200, "Manager restocked chicken item");

    const restoredMenu = await prisma.menuItem.findUnique({ where: { id: doroMenuItem.id } });
    assert(restoredMenu?.autoAvailable === true, "Restocking clears autoAvailable flag (PRD 25.4.2.5)");

    // -------------------------------------------------------------
    // PRD 25.4.2.3: Stock Count Reconciliation & Variance
    // -------------------------------------------------------------
    console.log("\n--- PRD 25.4.2.3: Stock Count Reconciliation ---");

    const countRes = await fetch(`${baseUrl}/inventory/counts`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: invCookie },
      body: JSON.stringify({
        notes: "Routine month-end count",
        lines: [
          {
            inventoryItemId: chickenItem.id,
            countedQuantity: 1500, // expected 2000, variance = -500 (-25%)
            reason: "Inventory recount",
          },
        ],
      }),
    });
    assert(countRes.status === 201, "Stock count saved and reconciled");
    const countData = (await countRes.json()) as any;
    assert(countData.highVarianceAlerts.length > 0, "High variance flag raised for variance > 10% (PRD 15.5.2)");

    // -------------------------------------------------------------
    // PRD 25.4.2.6 & 25.4.2.7: Purchasing Approval & Receiving
    // -------------------------------------------------------------
    console.log("\n--- PRD 25.4.2.6 & 25.4.2.7: Purchasing Lifecycle ---");

    // Link default supplier to chicken item
    const supplier = (await prisma.supplier.findFirst()) || (await prisma.supplier.create({
      data: { name: "Abyssinia Meat Supply", phone: "+251911002233" },
    }));
    await prisma.inventoryItem.update({
      where: { id: chickenItem.id },
      data: { defaultSupplierId: supplier.id },
    });

    // 1. One-click draft PO from low stock item
    const draftPoRes = await fetch(`${baseUrl}/purchases/draft-from-low-stock/${chickenItem.id}`, {
      method: "POST",
      headers: { Cookie: invCookie },
    });
    assert(draftPoRes.status === 201, "One-click draft PO created from low stock item (PRD 25.4.2.6)");
    const poData = (await draftPoRes.json()) as any;
    const poId = poData.purchase.id;
    assert(poData.purchase.status === "Draft", "PO created in Draft status");

    // 2. Submit PO to Pending Approval
    const submitPo = await fetch(`${baseUrl}/purchases/${poId}/submit`, {
      method: "PATCH",
      headers: { Cookie: invCookie },
    });
    assert(submitPo.status === 200, "PO submitted to Pending Approval (PRD 16.2.2)");

    // 3. Inventory staff forbidden from approving PO
    const invApproveAttempt = await fetch(`${baseUrl}/purchases/${poId}/approve`, {
      method: "PATCH",
      headers: { Cookie: invCookie },
    });
    assert(invApproveAttempt.status === 403, "Non-manager forbidden from approving PO (PRD 25.4.2.7)");

    // 4. Manager approves PO
    const mgrApprove = await fetch(`${baseUrl}/purchases/${poId}/approve`, {
      method: "PATCH",
      headers: { Cookie: managerCookie },
    });
    assert(mgrApprove.status === 200, "Manager approves PO (PRD 25.4.2.7)");

    // 5. Receive delivery
    const receiveRes = await fetch(`${baseUrl}/purchases/${poId}/receive`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: invCookie },
      body: JSON.stringify({
        lines: [
          {
            purchaseLineId: poData.purchase.lines[0].id,
            receivedQuantity: 500, // 500g
          },
        ],
      }),
    });
    assert(receiveRes.status === 200, "Delivery received and added to inventory stock (PRD 25.4.2.7)");

    // -------------------------------------------------------------
    // PRD 25.4.2.8: Emergency Purchase Workflow
    // -------------------------------------------------------------
    console.log("\n--- PRD 25.4.2.8: Emergency Purchase ---");

    const emergencyRes = await fetch(`${baseUrl}/purchases/emergency`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: invCookie },
      body: JSON.stringify({
        supplierName: "Local Market Urgent Vendor",
        notes: "Unexpected party reservation surge",
        lines: [
          {
            inventoryItemId: chickenItem.id,
            quantity: 1000,
            unitPrice: 0.40,
          },
        ],
      }),
    });
    assert(emergencyRes.status === 201, "Emergency purchase recorded and added to stock immediately (PRD 25.4.2.8)");
    const emData = (await emergencyRes.json()) as any;
    assert(emData.purchase.status === "Emergency - Received", "Status is Emergency - Received");

    // Manager reviews emergency purchase
    const reviewRes = await fetch(`${baseUrl}/purchases/${emData.purchase.id}/review`, {
      method: "PATCH",
      headers: { Cookie: managerCookie },
    });
    assert(reviewRes.status === 200, "Manager reviews and confirms emergency purchase (PRD 16.5.2)");

    // -------------------------------------------------------------
    // PRD 25.4.2.9: Waste Record creates Stock Movement
    // -------------------------------------------------------------
    console.log("\n--- PRD 25.4.2.9: Waste Logging ---");

    const wasteRes = await fetch(`${baseUrl}/inventory/waste`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: invCookie },
      body: JSON.stringify({
        inventoryItemId: chickenItem.id,
        quantity: 100,
        unit: "g",
        reason: "Expired batch past refrigeration safety",
      }),
    });
    assert(wasteRes.status === 201, "Waste recorded successfully (PRD 25.4.2.9)");
    const wasteData = (await wasteRes.json()) as any;
    assert(wasteData.movement.type === "Waste", "Matching Waste stock movement created automatically (PRD 15.7.1)");

    console.log("\n=================================================");
    console.log(`   STAGE 2 ACCEPTANCE SUITE PASSED (${passed}/${passed})   `);
    console.log("=================================================");
  } finally {
    await app.close();
  }
}

runStage2Acceptance().catch((err) => {
  console.error("Stage 2 Acceptance test failed:", err);
  process.exit(1);
});
