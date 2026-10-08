import { buildApp } from "./src/server.js";
import { prisma } from "./src/lib/prisma.js";
import { Role } from "@prisma/client";

function assert(condition: any, message: string) {
  if (!condition) {
    console.error(`[FAIL] ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`[PASS] ${message}`);
}

async function runPhase4Tests() {
  console.log("=== STARTING PHASE 4 VERIFICATION SUITE ===");

  const app = await buildApp();
  const testPort = 4002;
  await app.listen({ port: testPort, host: "127.0.0.1" });
  console.log(`Test server running at http://127.0.0.1:${testPort}`);

  const baseUrl = `http://127.0.0.1:${testPort}/api/v1`;

  try {
    // -------------------------------------------------------------
    // Setup Test Users and Cookie Auth
    // -------------------------------------------------------------
    console.log("\n--- Setting up Auth & Test Fixtures ---");

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

    const kitchenLogin = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ login: "chef", password: "mesob1234" }),
    });
    const kitchenCookie = kitchenLogin.headers.get("set-cookie")?.split(";")[0] || "";

    const inventoryLogin = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ login: "yonas", password: "mesob1234" }),
    });
    const inventoryCookie = inventoryLogin.headers.get("set-cookie")?.split(";")[0] || "";

    // Ensure settings has inventoryTracking: true
    await prisma.setting.upsert({
      where: { id: "singleton" },
      update: { inventoryTracking: true, currentBusinessDate: "2026-10-08" },
      create: { id: "singleton", inventoryTracking: true, currentBusinessDate: "2026-10-08" },
    });

    // Create test category and menu item
    const category = await prisma.menuCategory.upsert({
      where: { name: "Main Dishes" },
      update: {},
      create: { name: "Main Dishes", orderIndex: 1 },
    });

    const testMenuItem = await prisma.menuItem.upsert({
      where: { id: "menu-item-doro-wot" },
      update: { status: "Active", manualAvailable: true, autoAvailable: true },
      create: {
        id: "menu-item-doro-wot",
        name: "Special Doro Wot",
        categoryId: category.id,
        basePrice: 500.0,
        status: "Active",
        manualAvailable: true,
        autoAvailable: true,
      },
    });

    // Create test Large variant with multiplier 1.5
    const largeVariant = await prisma.itemVariant.upsert({
      where: { id: "variant-large-doro" },
      update: { recipeMultiplier: 1.5 },
      create: {
        id: "variant-large-doro",
        menuItemId: testMenuItem.id,
        name: "Large",
        price: 700.0,
        recipeMultiplier: 1.5,
      },
    });

    // Create test Inventory Items
    const chickenItem = await prisma.inventoryItem.upsert({
      where: { code: "ING-CHICKEN-01" },
      update: { currentStock: 1000.0, minimumStock: 200.0, baseUnit: "g" },
      create: {
        id: "ing-chicken-01",
        code: "ING-CHICKEN-01",
        name: "Fresh Chicken",
        category: "Meat",
        baseUnit: "g",
        currentStock: 1000.0,
        minimumStock: 200.0,
        reorderQuantity: 2000.0,
        costPerUnit: 0.8,
      },
    });

    const berbereItem = await prisma.inventoryItem.upsert({
      where: { code: "ING-BERBERE-01" },
      update: { currentStock: 500.0, minimumStock: 100.0, baseUnit: "g" },
      create: {
        id: "ing-berbere-01",
        code: "ING-BERBERE-01",
        name: "Organic Berbere",
        category: "Spices",
        baseUnit: "g",
        currentStock: 500.0,
        minimumStock: 100.0,
        reorderQuantity: 1000.0,
        costPerUnit: 1.2,
      },
    });

    assert(chickenItem.id && berbereItem.id, "Test inventory items initialized");

    // -------------------------------------------------------------
    // Task 4.1: Recipe Creation (PRD 7.9)
    // -------------------------------------------------------------
    console.log("\n--- Testing Recipe Upsert (PRD 7.9) ---");

    const recipeRes = await fetch(`${baseUrl}/recipes/menu-item/${testMenuItem.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Cookie: kitchenCookie },
      body: JSON.stringify({
        yieldPortions: 1,
        notes: "Traditional Doro Wot recipe",
        lines: [
          { inventoryItemId: chickenItem.id, quantity: 200, unit: "g" },
          { inventoryItemId: berbereItem.id, quantity: 50, unit: "g" },
        ],
      }),
    });

    assert(recipeRes.status === 200, "Kitchen staff successfully upserted recipe (PRD 7.9.4)");
    const recipeData = (await recipeRes.json()) as any;
    assert(recipeData.recipe.lines.length === 2, "Recipe has 2 ingredient lines");

    // -------------------------------------------------------------
    // Task 4.1.1: Recipe Depletion Transaction (PRD 15.6)
    // -------------------------------------------------------------
    console.log("\n--- Testing Task 4.1.1: Recipe Depletion Transaction ---");

    // Ensure a test table exists
    const table = await prisma.table.upsert({
      where: { number: "T12" },
      update: { status: "Available" },
      create: { number: "T12", seats: 4, section: "Main Dining", status: "Available" },
    });

    // 1. Create order
    const orderRes = await fetch(`${baseUrl}/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: waiterCookie },
      body: JSON.stringify({
        type: "Dine-in",
        tableNumber: "T12",
        guestCount: 2,
        items: [
          {
            menuItemId: testMenuItem.id,
            variantId: largeVariant.id,
            quantity: 2, // 2x Large Doro Wot
          },
        ],
      }),
    });
    assert(orderRes.status === 201, "Created dine-in order for 2x Large Doro Wot");
    const orderData = (await orderRes.json()) as any;
    const ticketId = orderData.order.tickets[0].id;

    // 2. Kitchen prepares and readies ticket
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

    // 3. Waiter serves ticket -> Triggers Recipe Depletion!
    const serveRes = await fetch(`${baseUrl}/tickets/${ticketId}/serve`, {
      method: "POST",
      headers: { Cookie: waiterCookie },
    });
    assert(serveRes.status === 200, "Ticket served successfully");

    // 4. Verify stock depletion:
    // Chicken: 1000 - (200 * 1.5 * 2) = 1000 - 600 = 400g
    // Berbere: 500 - (50 * 1.5 * 2) = 500 - 150 = 350g
    const updatedChicken = await prisma.inventoryItem.findUnique({ where: { id: chickenItem.id } });
    const updatedBerbere = await prisma.inventoryItem.findUnique({ where: { id: berbereItem.id } });

    assert(Number(updatedChicken?.currentStock) === 400, "Chicken stock deducted: 1000 - 600 = 400g (PRD 15.6.1)");
    assert(Number(updatedBerbere?.currentStock) === 350, "Berbere stock deducted: 500 - 150 = 350g (PRD 15.6.1)");

    // 5. Verify StockMovement entries
    const movements = await prisma.stockMovement.findMany({
      where: { referenceId: orderData.order.tickets[0].items[0].id, type: "Sale" },
    });
    assert(movements.length === 2, "Recorded 2 Sale stock movements with negative quantities (PRD 15.4)");
    assert(Number(movements[0].quantity) < 0, "Stock movement quantity is signed negative");

    // -------------------------------------------------------------
    // Task 4.1.2: Auto-Unavailability Rule (PRD 7.7.3, 15.8.2)
    // -------------------------------------------------------------
    console.log("\n--- Testing Task 4.1.2: Auto-Unavailability Rule ---");

    // Adjust Chicken stock down to 100g (less than 200g needed for 1 portion)
    const adjustRes = await fetch(`${baseUrl}/inventory/adjust`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: managerCookie },
      body: JSON.stringify({
        inventoryItemId: chickenItem.id,
        quantity: -300, // 400 - 300 = 100g
        reason: "Stock audit reduction",
      }),
    });
    assert(adjustRes.status === 200, "Manager adjusted stock down to 100g");

    // Verify MenuItem autoAvailable switched to false automatically
    const checkMenuItem = await prisma.menuItem.findUnique({ where: { id: testMenuItem.id } });
    assert(checkMenuItem?.autoAvailable === false, "Menu item autoAvailable switched to FALSE when stock < 1 portion (PRD 15.8.2)");

    // Verify ordering is blocked
    const blockedOrderRes = await fetch(`${baseUrl}/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: waiterCookie },
      body: JSON.stringify({
        type: "Takeaway",
        customerPhone: "+251911999888",
        items: [{ menuItemId: testMenuItem.id, quantity: 1 }],
      }),
    });
    assert(blockedOrderRes.status === 400, "New order containing out-of-stock item rejected with 400 (PRD 7.7.1)");

    // Restock Chicken back to 800g
    await fetch(`${baseUrl}/inventory/adjust`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: managerCookie },
      body: JSON.stringify({
        inventoryItemId: chickenItem.id,
        quantity: 700, // 100 + 700 = 800g
        reason: "Restocked chicken",
      }),
    });

    const restoredMenuItem = await prisma.menuItem.findUnique({ where: { id: testMenuItem.id } });
    assert(restoredMenuItem?.autoAvailable === true, "Restocking cleared auto-unavailable flag (PRD 7.7.4)");

    // Test that manual unavailable is preserved on restocking (PRD 7.7.4)
    await prisma.menuItem.update({
      where: { id: testMenuItem.id },
      data: { manualAvailable: false },
    });
    await fetch(`${baseUrl}/inventory/adjust`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: managerCookie },
      body: JSON.stringify({
        inventoryItemId: chickenItem.id,
        quantity: 50,
        reason: "Extra restocking",
      }),
    });
    const preservedItem = await prisma.menuItem.findUnique({ where: { id: testMenuItem.id } });
    assert(preservedItem?.manualAvailable === false, "Restocking did not override manual Unavailable setting (PRD 7.7.4)");
    // Reset manual available
    await prisma.menuItem.update({
      where: { id: testMenuItem.id },
      data: { manualAvailable: true },
    });

    // -------------------------------------------------------------
    // Task 4.2.1: Stock Count Reconciliation (PRD 15.5)
    // -------------------------------------------------------------
    console.log("\n--- Testing Task 4.2.1: Stock Count Reconciliation ---");

    const countRes = await fetch(`${baseUrl}/inventory/counts`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: inventoryCookie },
      body: JSON.stringify({
        notes: "Monthly physical count",
        lines: [
          {
            inventoryItemId: berbereItem.id,
            countedQuantity: 300, // Expected was 350 -> variance is -50 (14.3% variance > 10% threshold)
            reason: "Slight spill during prep",
          },
        ],
      }),
    });

    assert(countRes.status === 201, "Stock count saved and reconciled");
    const countData = (await countRes.json()) as any;
    assert(countData.highVarianceAlerts.length > 0, "High variance alert flagged for variance > 10% (PRD 15.5.2)");

    // Verify activity log captured the high variance
    const countActivity = await prisma.activityLog.findFirst({
      where: { action: "STOCK_COUNT_HIGH_VARIANCE", targetId: berbereItem.id },
    });
    assert(countActivity !== null, "Activity log captured STOCK_COUNT_HIGH_VARIANCE (PRD 4.8.2)");

    // Verify stock adjustment negative without manager rule (PRD 4.11.12)
    const negativeStockAttempt = await fetch(`${baseUrl}/inventory/adjust`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: inventoryCookie },
      body: JSON.stringify({
        inventoryItemId: berbereItem.id,
        quantity: -1000, // would make stock negative
        reason: "Test deduction",
      }),
    });
    assert(negativeStockAttempt.status === 403, "Non-manager blocked from making stock negative (PRD 4.11.12)");

    // Test Waste recording (PRD 15.7)
    const wasteRes = await fetch(`${baseUrl}/inventory/waste`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: inventoryCookie },
      body: JSON.stringify({
        inventoryItemId: berbereItem.id,
        quantity: 10,
        unit: "g",
        reason: "Spoiled",
      }),
    });
    assert(wasteRes.status === 201, "Waste recorded successfully (PRD 15.7)");
    const wasteMovement = await prisma.stockMovement.findFirst({
      where: { inventoryItemId: berbereItem.id, type: "Waste" },
    });
    assert(wasteMovement !== null && Number(wasteMovement.quantity) === -10, "Matching Waste stock movement created automatically (PRD 15.7.1)");

    // -------------------------------------------------------------
    // Task 4.2.2: Purchase Approval & Receiving Workflow (PRD 16)
    // -------------------------------------------------------------
    console.log("\n--- Testing Task 4.2.2: Purchase Approval & Receiving Workflow ---");

    // 1. Create Supplier
    const supplierRes = await fetch(`${baseUrl}/purchasing/suppliers`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: managerCookie },
      body: JSON.stringify({
        name: "Abyssinia Fresh Farm",
        contactPerson: "Abebe Kebede",
        phone: "+251911223344",
        paymentTerms: "Net 15",
      }),
    });
    assert(supplierRes.status === 201, "Supplier created successfully (PRD 16.1)");
    const supplierData = (await supplierRes.json()) as any;
    const supplierId = supplierData.supplier.id;

    // Link default supplier to chicken item
    await prisma.inventoryItem.update({
      where: { id: chickenItem.id },
      data: { defaultSupplierId: supplierId },
    });

    // 2. One-click Draft PO from Low Stock (PRD 16.7)
    const draftRes = await fetch(`${baseUrl}/purchases/draft-from-low-stock/${chickenItem.id}`, {
      method: "POST",
      headers: { Cookie: inventoryCookie },
    });
    assert(draftRes.status === 201, "One-click draft PO created from low stock item (PRD 16.7)");
    const draftData = (await draftRes.json()) as any;
    const poId = draftData.purchase.id;
    const poLineId = draftData.purchase.lines[0].id;
    assert(draftData.purchase.status === "Draft", "PO starts in Draft status");
    assert(draftData.purchase.poNumber.startsWith("PO-"), "PO number assigned sequential code (PO-XXXX)");

    // 3. Submit PO
    const submitRes = await fetch(`${baseUrl}/purchases/${poId}/submit`, {
      method: "PATCH",
      headers: { Cookie: inventoryCookie },
    });
    assert(submitRes.status === 200, "PO submitted to Pending Approval (PRD 16.2.2)");

    // 4. Non-manager approval rejection (PRD 16.3.1)
    const unauthorizedApprove = await fetch(`${baseUrl}/purchases/${poId}/approve`, {
      method: "PATCH",
      headers: { Cookie: waiterCookie },
    });
    assert(unauthorizedApprove.status === 403, "Non-manager forbidden from approving PO (PRD 16.3.1)");

    // 5. Manager approves PO
    const approveRes = await fetch(`${baseUrl}/purchases/${poId}/approve`, {
      method: "PATCH",
      headers: { Cookie: managerCookie },
    });
    assert(approveRes.status === 200, "Manager approved PO (PRD 16.3.1)");

    // 6. Receive partial delivery (PRD 16.4)
    const beforeStock = Number((await prisma.inventoryItem.findUnique({ where: { id: chickenItem.id } }))?.currentStock);

    const receivePartialRes = await fetch(`${baseUrl}/purchases/${poId}/receive`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: inventoryCookie },
      body: JSON.stringify({
        invoiceReference: "SUP-INV-991",
        lines: [
          {
            purchaseLineId: poLineId,
            receivedQuantity: 500, // Ordered was 2000
            actualUnitPrice: 0.85,
          },
        ],
      }),
    });
    assert(receivePartialRes.status === 200, "Partial delivery received (PRD 16.4)");
    const partialData = (await receivePartialRes.json()) as any;
    assert(partialData.purchase.status === "Partially Received", "PO status changed to Partially Received (PRD 16.4.3)");

    const midStock = Number((await prisma.inventoryItem.findUnique({ where: { id: chickenItem.id } }))?.currentStock);
    assert(midStock === beforeStock + 500, "Stock incremented by delivered quantity (+500g)");

    // 7. Receive remaining delivery
    const receiveFinalRes = await fetch(`${baseUrl}/purchases/${poId}/receive`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: inventoryCookie },
      body: JSON.stringify({
        invoiceReference: "SUP-INV-992",
        lines: [
          {
            purchaseLineId: poLineId,
            receivedQuantity: 1500, // Remaining 1500
          },
        ],
      }),
    });
    const finalData = (await receiveFinalRes.json()) as any;
    assert(finalData.purchase.status === "Received", "PO status transitioned to Received when all lines fulfilled (PRD 16.4.3)");

    // 8. Complete PO
    const completeRes = await fetch(`${baseUrl}/purchases/${poId}/complete`, {
      method: "PATCH",
      headers: { Cookie: inventoryCookie },
    });
    assert(completeRes.status === 200, "PO marked Completed (PRD 16.2.2)");

    // 9. Emergency Purchase (PRD 16.5)
    const emergencyRes = await fetch(`${baseUrl}/purchases/emergency`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: inventoryCookie },
      body: JSON.stringify({
        supplierName: "Local Market Urgent Vendor",
        notes: "Urgent onions and spices purchase",
        lines: [
          {
            inventoryItemId: berbereItem.id,
            quantity: 100,
            unitPrice: 1.5,
          },
        ],
      }),
    });
    assert(emergencyRes.status === 201, "Emergency purchase recorded (PRD 16.5)");
    const emergencyData = (await emergencyRes.json()) as any;
    assert(emergencyData.purchase.status === "Emergency - Received", "Status is Emergency - Received");
    assert(emergencyData.purchase.isEmergency === true && emergencyData.purchase.isReviewed === false, "Flagged for Manager review");

    // Manager reviews emergency purchase
    const reviewRes = await fetch(`${baseUrl}/purchases/${emergencyData.purchase.id}/review`, {
      method: "PATCH",
      headers: { Cookie: managerCookie },
    });
    assert(reviewRes.status === 200, "Manager reviewed emergency purchase (PRD 16.5.2)");

    console.log("\n=== ALL PHASE 4 TESTS PASSED (36/36) ===");
  } finally {
    await app.close();
  }
}

runPhase4Tests().catch((err) => {
  console.error("Test failed with error:", err);
  process.exit(1);
});
