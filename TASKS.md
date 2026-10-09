# Mesob Restaurant Management System — Implementation Tasks & Specifications

Derived directly from [`PRD.md`](./PRD.md), [`AGENTS.md`](./AGENTS.md), and current codebase state.
Every task is broken down into atomic, unambiguous specifications with exact target files, UI controls, business logic, storage keys, and acceptance criteria so that an agent can execute each task without guesswork.

---

## Task Conventions & Quality Gates

* **Zero Out-of-Scope Code**: Strictly adhere to [PRD Section 2.2](./PRD.md#L126) (no payment gateway integrations, no split bills, no multi-branch, no customer self-ordering).
* **Quality Gate**: Every frontend task must pass `npm run lint` and `npm run typecheck` (`tsc -p ./jsconfig.json`).
* **Persistence Convention**:
  * Frontend tasks read/write via `useData()` (`db`, `updateItem`, `insertItem`, `setCollection`) stored in `localStorage["rms_data"]`.
  * Backend tasks adhere to PostgreSQL schema models in `server/`.
* **Currency & Time**: All monetary values are in Ethiopian Birr (`ETB`, 2 decimal places). Timezone is `Africa/Addis_Ababa`.

---

## Phase 1 — Frontend Gap Filling (PRD Alignment)

### 1.1 Invoicing, Credit Notes & Tax Breakdown
*Priority: P0 | Target: `src/pages/OrderDetail.jsx`, `src/lib/format.js`, `src/lib/mockData.js`*

- [x] **Task 1.1.1: Credit Note Data Structure & Math Helper**
  - **Files**: [`src/lib/format.js`](file:///c:/Users/Hp/Documents/Mesob%20Restaurant/src/lib/format.js), [`src/lib/mockData.js`](file:///c:/Users/Hp/Documents/Mesob%20Restaurant/src/lib/mockData.js)
  - **Spec**: PRD 11.7.3 & 11.7.4. Add function `calcCreditNote(invoice, creditedItemAmount, creditServiceCharge, taxRate)`:
    - $\text{Tax Reversed} = \text{creditedItemAmount} \times \frac{\text{taxRate}}{1 + \text{taxRate}}$
    - $\text{Net Sales Deduction} = \text{creditedItemAmount} - \text{Tax Reversed}$
    - $\text{Service Charge Deduction} = \text{creditServiceCharge} \ ? \ (\text{invoice.serviceCharge} \times \frac{\text{creditedItemAmount}}{\text{invoice.itemSubtotal}}) : 0$
    - $\text{Total Refund} = \text{creditedItemAmount} + \text{Service Charge Deduction}$
  - **Seed**: Add `creditNotes: []` array to `sampleData` in `mockData.js`.
  - **Done When**: Unit calculation tests in `format.js` match PRD 11.7.3 rounding to 2 decimal places.

- [x] **Task 1.1.2: Credit Note Issue Modal in `OrderDetail.jsx`**
  - **Files**: [`src/pages/OrderDetail.jsx`](file:///c:/Users/Hp/Documents/Mesob%20Restaurant/src/pages/OrderDetail.jsx)
  - **Spec**: PRD 11.7.1, 11.7.4. Gated to Manager only (`isManager`).
  - **UI Controls**:
    - Trigger: Button `"Issue credit note"` in `Bill summary` section when order status is `Completed` and invoice exists.
    - Modal inputs:
      - Credit Type: Radio `Full Refund` or `Partial Refund`.
      - If Partial: Number input `Credited item amount` (capped at remaining invoice subtotal).
      - Checkbox: `Reverse proportional service charge` (default checked).
      - Dropdown `Refund method`: `Cash`, `Bank Transfer`, `Mobile Money`, `Card` (PRD 11.7.4).
      - Textarea `Reason (required)`: Validation blocks submit if empty.
  - **Action**: Generates continuous id `CN-` with 6 digits (e.g. `CN-000001` using `nextId`), inserts record into `db.creditNotes`, logs to `db.activityLog` with action `"Issued credit note"`.
  - **Done When**: Issuing a credit note stores record in `db.creditNotes` and displays a `"Credit Note CN-000001"` badge and summary on the order detail page.

- [x] **Task 1.1.3: Buyer Tax Details in Checkout Modal**
  - **Files**: [`src/pages/OrderDetail.jsx`](file:///c:/Users/Hp/Documents/Mesob%20Restaurant/src/pages/OrderDetail.jsx)
  - **Spec**: PRD 11.5.3, 11.6.1. Optional fields for commercial VAT receipts.
  - **UI Controls**: Inside `PaymentModal`:
    - Optional input: `Buyer Organization Name` (`id="buyer-name"`).
    - Optional input: `Buyer Tax ID (TIN)` (`id="buyer-tin"`).
  - **Action**: Stored on `order.buyerName` and `order.buyerTin` upon invoice generation.
  - **Done When**: Entering buyer info at checkout displays buyer details in both `BillPreview` and `orderInfo`.

- [x] **Task 1.1.4: Printable Receipt & PDF Trigger**
  - **Files**: [`src/pages/OrderDetail.jsx`](file:///c:/Users/Hp/Documents/Mesob%20Restaurant/src/pages/OrderDetail.jsx)
  - **Spec**: PRD 11.5.1, 22.1.3.
  - **UI Controls**: Add `"Print / Save Tax Invoice"` button in `BillPreview` footer that calls `window.print()` with `@media print` styling hiding sidebar/nav chrome.
  - **Done When**: Clicking print triggers standard browser print dialog showing clean invoice formatted with restaurant TIN, line items, and tax breakdown.

---

### 1.2 Table & Order Life-Cycle Gaps
*Priority: P0 | Target: `src/pages/OrderDetail.jsx`, `src/pages/Tables.jsx`, `src/pages/NewOrder.jsx`*

- [x] **Task 1.2.1: Move Order to Another Table Action**
  - **Files**: [`src/pages/OrderDetail.jsx`](file:///c:/Users/Hp/Documents/Mesob%20Restaurant/src/pages/OrderDetail.jsx), [`src/pages/Tables.jsx`](file:///c:/Users/Hp/Documents/Mesob%20Restaurant/src/pages/Tables.jsx)
  - **Spec**: PRD 8.3.2. Enabled for order owner (Waiter) or Manager on active dine-in orders.
  - **UI Controls**: Button `"Move table"` in `Order info` card opens a selection modal.
  - **Modal**: Shows dropdown of tables that have status `Available` and no active reservation today.
  - **Action**:
    - Updates order's `table` to new table number.
    - Updates old table in `db.tables` to status `Cleaning`.
    - Updates new table in `db.tables` to status `Occupied` with `order: order.id`.
    - Spawns cleaning task in `db.cleaningTasks` for the old table with area `"Table <oldTable> (Moved)"`.
    - Logs to `db.activityLog`: `"Moved order from Table X to Table Y"`.
  - **Done When**: Moving an order updates both tables and transfers order ownership without data loss.

- [x] **Task 1.2.2: Reassign Order Waiter Modal**
  - **Files**: [`src/pages/OrderDetail.jsx`](file:///c:/Users/Hp/Documents/Mesob%20Restaurant/src/pages/OrderDetail.jsx)
  - **Spec**: PRD 8.5.2, 9.9.3. Manager only (`isManager`).
  - **UI Controls**: In `Order info` card, render a small `"Reassign"` link next to `order.waiter`.
  - **Modal**: Dropdown populated from `db.users.filter(u => u.role === "waiter" || u.role === "manager")`.
  - **Action**: Updates `order.waiter` to selected user; logs to `db.activityLog`.
  - **Done When**: Manager reassigns order from Waiter A to Waiter B; order now appears in Waiter B's `/orders` filter.

- [x] **Task 1.2.3: Line-Item Cancellation & Waste Prompt**
  - **Files**: [`src/pages/OrderDetail.jsx`](file:///c:/Users/Hp/Documents/Mesob%20Restaurant/src/pages/OrderDetail.jsx)
  - **Spec**: PRD 9.6.1 - 9.6.3.
  - **UI Controls**: Next to each line item on a ticket:
    - If ticket is `Submitted`: Waiter or Manager can click `"Cancel item"`. Requires text reason. Item marked `cancelled: true` with `cancelReason`.
    - If ticket is `Preparing` or `Ready`: Manager only. Requires reason. Pops confirmation: *"Item was already in prep. Record as kitchen waste?"*. If confirmed, inserts record into `db.stockMovements` (type `Waste`).
  - **Done When**: Cancelling line item recalculates ticket totals and bills, preserving immutable audit note.

---

### 1.3 Menu Availability, Scheduled Prices & Meal Periods
*Priority: P1 | Target: `src/pages/Menu.jsx`, `src/pages/NewOrder.jsx`, `src/lib/datetime.js`*

- [x] **Task 1.3.1: Scheduled Price Change Modal**
  - **Files**: [`src/pages/Menu.jsx`](file:///c:/Users/Hp/Documents/Mesob%20Restaurant/src/pages/Menu.jsx)
  - **Spec**: PRD 7.8. Manager only.
  - **UI Controls**: In Menu Item Edit modal, add section `"Scheduled Price Changes"`:
    - Input `New Price (ETB)`
    - Input `Effective Date` (date picker, min date tomorrow)
    - Action stores array `scheduledPrices: [{ price, effectiveDate }]` on the menu item.
  - **Done When**: Price changes schedule properly; current orders continue using snapshot prices at creation time.

- [x] **Task 1.3.2: Meal Period Enforcement in `NewOrder.jsx`**
  - **Files**: [`src/pages/NewOrder.jsx`](file:///c:/Users/Hp/Documents/Mesob%20Restaurant/src/pages/NewOrder.jsx), [`src/lib/datetime.js`](file:///c:/Users/Hp/Documents/Mesob%20Restaurant/src/lib/datetime.js)
  - **Spec**: PRD 7.6, 7.7.
  - **Logic**: Helper `isItemInMealPeriod(item, currentTimeStr)`:
    - If `item.mealPeriod === "All day"`, return `true`.
    - If `item.mealPeriod === "Breakfast"` and current clock time is not between 06:00 and 11:00, return `false`.
    - If `item.mealPeriod === "Lunch"` and not between 11:30 and 15:30, return `false`.
    - If `item.mealPeriod === "Dinner"` and not between 17:00 and 22:30, return `false`.
  - **UI Controls**: Disabled button with badge `"Breakfast only"` / `"Outside meal period"`; prevents adding to cart.
  - **Done When**: Out-of-period items cannot be added to new orders, with a clear explanatory badge.

---

### 1.4 Business Day Lifecycle & Back-Entry
*Priority: P1 | Target: `src/pages/Reports.jsx`, `src/pages/Settings.jsx`, `src/lib/datetime.js`*

- [x] **Task 1.4.1: Business Day Close & Reopen Controls**
  - **Files**: [`src/pages/Reports.jsx`](file:///c:/Users/Hp/Documents/Mesob%20Restaurant/src/pages/Reports.jsx)
  - **Spec**: PRD 4.1.5 - 4.1.7. Manager only.
  - **UI Controls**:
    - Button `"Close Business Day"` under End-of-Day Summary tab.
    - Shows confirmation dialog with summary: Total Completed Orders, Net Sales, Tax, Open Orders Carried Over.
    - Sets `db.restaurant.currentBusinessDate` to next day; adds record to `db.dayClosures`.
    - If day is closed, show `"Reopen Day"` button (reopens most recent day, logs to activity log).
  - **Done When**: Closing day increments active business date and archives snapshot summary.

- [x] **Task 1.4.2: Credit Notes Reflection in Reports**
  - **Files**: [`src/pages/Reports.jsx`](file:///c:/Users/Hp/Documents/Mesob%20Restaurant/src/pages/Reports.jsx)
  - **Spec**: PRD 22.2.1, 22.6.2.
  - **Logic**: Net sales in reports = $\text{Item Subtotals} - \text{Discounts} - \text{Extracted Tax} - \text{Credit Notes Issued in Period}$.
  - **UI Controls**: Add `"Credit notes"` row in Sales Summary cards and DataTable.
  - **Done When**: Reports accurately deduct issued credit notes from net sales and tax totals.

---

### 1.5 Security & CSV Tools
*Priority: P2 | Target: `src/App.jsx`, `src/pages/Login.jsx`, `src/pages/Menu.jsx`, `src/pages/Inventory.jsx`*

- [x] **Task 1.5.1: 30-Minute Idle Session Warning Modal**
  - **Files**: [`src/App.jsx`](file:///c:/Users/Hp/Documents/Mesob%20Restaurant/src/App.jsx)
  - **Spec**: PRD 6.6. Global inactivity timer across all roles.
  - **Logic**: Tracks mousemove/keydown/click. If idle for 28 minutes, render modal: *"Your session will expire in 2 minutes due to inactivity."* with button `"Stay signed in"`. If 30 minutes expires without interaction, clear active role and redirect to `/`.
  - **Done When**: 30-minute idle timer reliably triggers warning and logout.

- [x] **Task 1.5.2: Downloadable CSV Templates & Validation Previews**
  - **Files**: [`src/pages/Menu.jsx`](file:///c:/Users/Hp/Documents/Mesob%20Restaurant/src/pages/Menu.jsx), [`src/pages/Inventory.jsx`](file:///c:/Users/Hp/Documents/Mesob%20Restaurant/src/pages/Inventory.jsx)
  - **Spec**: PRD 23.9.
  - **UI Controls**: `"Import CSV"` button opening a modal with:
    - `"Download sample CSV template"` link.
    - File upload dropzone.
    - Preview table highlighting missing required columns or parse errors by line number.
  - **Done When**: Uploading valid CSV inserts records; uploading invalid CSV displays exact row error report.

---

## Phase 2 — Backend Architecture & Database Foundation

### 2.1 Backend Project Setup
*Priority: P0 | Target: `server/package.json`, `server/tsconfig.json`, `server/src/server.ts`*

- [x] **Task 2.1.1: Initialize `server/` Node.js + Fastify/Express Service**
  - **Files**: `server/package.json`, `server/tsconfig.json`, `server/src/server.ts`
  - **Spec**: Fastify with `@fastify/cors`, `@fastify/cookie`, `@fastify/jwt`, `zod`.
  - **Done When**: Running `npm run dev` in `server/` boots API listening on `http://localhost:4000/api/v1/health` returning `{ status: "ok" }`.

- [x] **Task 2.1.2: Laragon MySQL & Prisma Setup**
  - **Files**: `server/prisma/schema.prisma`, `server/.env.example`, `server/.env`
  - **Spec**: Laragon MySQL connection (`mysql://root:@localhost:3306/mesob_restaurant`) with Prisma client.
  - **Done When**: `npx prisma db push` successfully connects and initializes database tables.

### 2.2 Relational Data Schema (PRD Section 24)
*Priority: P0 | Target: `server/prisma/schema.prisma`*

- [x] **Task 2.2.1: Users, Roles, Employees & Activity Log Models**
  - **Spec**: PRD 24.1. Models: `User`, `Employee`, `ActivityLog`.
  - **Done When**: Enforces unique username/email, enum roles (`ADMIN`, `MANAGER`, `KITCHEN`, `WAITER`, `INVENTORY`, `CLEANER`, `SECURITY`).

- [x] **Task 2.2.2: Menu, Pricing, Variants & Recipes Models**
  - **Spec**: PRD 24.1. Models: `MenuCategory`, `MenuItem`, `ItemVariant`, `Addon`, `Recipe`, `RecipeLine`.
  - **Done When**: Enforces variant recipe multipliers and base ingredient unit links.

- [x] **Task 2.2.3: Tables, Orders, Tickets & Billing Models**
  - **Spec**: PRD 24.1. Models: `Table`, `Order`, `Ticket`, `TicketItem`, `Invoice`, `CreditNote`, `Payment`.
  - **Done When**: Continuous sequence numbering constraints for invoices and credit notes.

- [x] **Task 2.2.4: Inventory, Suppliers, Purchasing & Operations Models**
  - **Spec**: PRD 24.1. Models: `InventoryItem`, `StockMovement`, `Supplier`, `PurchaseRequest`, `Reservation`, `CleaningTask`.
  - **Done When**: Schema migration passes without warnings.

### 2.3 Authentication, RBAC & Lockout Engine
*Priority: P0 | Target: `server/src/modules/auth/`*

- [x] **Task 2.3.1: Login, Logout & Session Cookie Endpoints**
  - **Files**: `server/src/modules/auth/auth.routes.ts`, `auth.service.ts`
  - **Spec**: PRD 6.4. `POST /api/v1/auth/login` validates username/password with `argon2` or `bcrypt`. Returns HTTP-only signed JWT cookie with 30-minute expiry.
  - **Done When**: Valid credentials issue cookie; invalid credentials return 401 without revealing username existence.

- [x] **Task 2.3.2: 5-Attempt Lockout Handler**
  - **Files**: `server/src/modules/auth/auth.service.ts`
  - **Spec**: PRD 6.5. Increments `failedAttempts`. On 5th failure, sets `lockedUntil = now + 15 min`.
  - **Done When**: Locked user receives 423 Locked with remaining minutes; Administrator endpoint `/unlock` clears lock.

- [x] **Task 2.3.3: Server-Side RBAC Guard Middleware**
  - **Files**: `server/src/middleware/rbac.ts`
  - **Spec**: PRD 3.3 Permission Matrix. Guards routes by role; e.g. only `MANAGER` and `ADMIN` can reach `/api/v1/reports`.
  - **Done When**: Unauthorized roles receive 403 Forbidden.

---

## Phase 3 — Core Operations, Real-Time WebSockets & Billing (Stage 1)

### 3.1 Socket.io Real-Time Dispatch Gateway
*Priority: P0 | Target: `server/src/ws/gateway.ts`*

- [x] **Task 3.1.1: Authenticated Socket Server**
  - **Files**: `server/src/ws/gateway.ts`
  - **Spec**: PRD 10.4, 23.1. Authenticates socket connections via session cookie; assigns sockets to rooms: `room:kitchen`, `room:waiter:${userId}`, `room:manager`.
  - **Done When**: Client joins room based on verified role token.

- [x] **Task 3.1.2: Ticket & Order Event Broadcasters**
  - **Spec**:
    - `ticket:submitted` → emits to `room:kitchen` with sound flag.
    - `ticket:ready` → emits to `room:waiter:${waiterId}` with sound flag.
    - `table:cleaning` → emits to `room:cleaner`.
  - **Done When**: Emitting event on server triggers immediate response on connected test client.

### 3.2 Order & Ticket REST APIs
*Priority: P0 | Target: `server/src/modules/orders/`*

- [x] **Task 3.2.1: Order Creation & Ticket Dispatch Endpoints**
  - **Files**: `server/src/modules/orders/orders.routes.ts`, `orders.service.ts`
  - **Spec**: PRD 9.3, 9.4. `POST /api/v1/orders` opens order; `POST /api/v1/orders/:id/tickets` dispatches new ticket rounds atomically.
  - **Done When**: Creating order sets table to `Occupied` and emits WebSocket event within 500ms.

- [x] **Task 3.2.2: Kitchen Ticket Status Lifecycle**
  - **Files**: `server/src/modules/tickets/tickets.routes.ts`
  - **Spec**: PRD 10.2. `PATCH /api/v1/tickets/:id/status` accepts transitions `Submitted` → `Preparing` → `Ready`.
  - **Done When**: Updating ticket status records timestamp and notifies owning waiter.

- [x] **Task 3.2.3: Waiter Serving Transition**
  - **Spec**: PRD 9.5.1. `POST /api/v1/tickets/:id/serve` transitions ticket to `Served`. Only owning waiter or Manager allowed.
  - **Done When**: Transition to `Served` unlocks payment eligibility for the order.

### 3.3 Billing, Invoicing & PDF Generation
*Priority: P0 | Target: `server/src/modules/billing/`, `server/src/services/pdf.ts`*

- [x] **Task 3.3.1: Strict Financial Bill Engine**
  - **Files**: `server/src/modules/billing/calculator.ts`
  - **Spec**: PRD 11.1. Implements exact subtotal, service charge, discount, and tax extraction formulas.
  - **Done When**: Calculation matches PRD 11.1.2 test numbers down to exact cents.

- [x] **Task 3.3.2: Payment & Continuous Invoice Sequence**
  - **Files**: `server/src/modules/billing/billing.service.ts`
  - **Spec**: PRD 11.4 - 11.6. `POST /api/v1/orders/:id/payment` in a PostgreSQL transaction:
    - Verifies all tickets are `Served`.
    - Generates next continuous sequence `INV-XXXXXX`.
    - Transitions order to `Completed`, table to `Cleaning`, creates cleaner task in `CleaningTask`.
  - **Done When**: Concurrent payments generate strictly sequential invoice numbers without duplicates.

- [x] **Task 3.3.3: Official PDF Invoice Generator**
  - **Files**: `server/src/services/pdf.ts`, `server/src/modules/billing/billing.routes.ts`
  - **Spec**: PRD 11.6.1, 22.1.3. `GET /api/v1/invoices/:id/pdf` streams generated PDF invoice containing restaurant details, TIN, line items, and tax breakdown.
  - **Done When**: Endpoint downloads valid PDF invoice matching legal fields.

---

## Phase 4 — Inventory, Recipes & Sourcing Backend (Stage 2)

### 4.1 Automated Recipe Depletion Engine
*Priority: P0 | Target: `server/src/modules/inventory/`*

- [x] **Task 4.1.1: Recipe Depletion Transaction**
  - **Files**: `server/src/modules/inventory/depletion.service.ts`
  - **Spec**: PRD 15.6. Triggered when ticket item transitions to `Served` and `settings.inventoryTracking == true`.
  - **Logic**: For each item, multiplies recipe ingredient lines by variant multiplier and item quantity; inserts `StockMovement` (type `Sale`) with negative quantity.
  - **Done When**: Serving 2 Large Doro Wot items deducts correct recipe multiples from stock records.

- [x] **Task 4.1.2: Auto-Unavailability Rule**
  - **Files**: `server/src/modules/inventory/inventory.service.ts`
  - **Spec**: PRD 7.7.3. If stock of any ingredient drops below 1 portion, flag menu item as `isAutoUnavailable = true`.
  - **Done When**: Short stock automatically blocks menu item from new orders; restocking clears the auto flag.

### 4.2 Stock Counts & Purchasing Pipeline
*Priority: P1 | Target: `server/src/modules/purchasing/`*

- [x] **Task 4.2.1: Stock Count Reconciliation Endpoint**
  - **Files**: `server/src/modules/inventory/stock-count.routes.ts`
  - **Spec**: PRD 15.5. `POST /api/v1/inventory/counts` saves counted quantities, creates adjustment movements, and alerts Manager if variance exceeds threshold.
  - **Done When**: Count creates signed adjustment movements and logs variance.

- [x] **Task 4.2.2: Purchase Approval & Receiving Workflow**
  - **Files**: `server/src/modules/purchasing/purchases.routes.ts`
  - **Spec**: PRD 16.2. `PATCH /api/v1/purchases/:id/approve` (Manager only); `POST /api/v1/purchases/:id/receive` adds delivered quantity to inventory stock.
  - **Done When**: Receiving PO increments stock and records receiving date.

---

## Phase 5 — Reservations, Facility, Scheduler & Reporting (Stage 3)

### 5.1 Reservations Engine
*Priority: P0 | Target: `server/src/modules/reservations/`*

- [x] **Task 5.1.1: Reservation Overlap Validator**
  - **Files**: `server/src/modules/reservations/reservations.service.ts`
  - **Spec**: PRD 13.2. Checks `startTime` to `startTime + reservationDuration` across all requested tables.
  - **Done When**: Overlapping booking on same table is rejected with 409 Conflict.

- [x] **Task 5.1.2: Walk-In Blocking Enforcer**
  - **Spec**: PRD 8.2.3, 13.3. Opening dine-in walk-in order rejects tables that have an active reservation today.
  - **Done When**: Walk-in attempt on reserved table returns validation error.

### 5.2 Background Automation Scheduler
*Priority: P0 | Target: `server/src/scheduler/`*

- [x] **Task 5.2.1: Business Day Auto-Close Job (Daily at 04:00 AM)**
  - **Files**: `server/src/scheduler/day-close.job.ts`
  - **Spec**: PRD 4.1.5, 22.6. Runs at configured closing time: closes business day, compiles EOD summary, resets daily order sequence.
  - **Done When**: Cron triggers day close and logs summary to `DayClosure`.

- [x] **Task 5.2.2: Delayed Ticket & No-Show Poller**
  - **Files**: `server/src/scheduler/monitors.job.ts`
  - **Spec**: PRD 10.3, 13.4. Runs every 1 minute for delayed tickets; runs every 5 minutes to mark reservations past `noShowGrace` as `No Show`.
  - **Done When**: Overdue reservations auto-transition to `No Show` and release tables.

### 5.3 Reporting & CSV Streaming Engine
*Priority: P1 | Target: `server/src/modules/reports/`*

- [x] **Task 5.3.1: Financial & Sales Analytics Endpoints**
  - **Files**: `server/src/modules/reports/reports.service.ts`
  - **Spec**: PRD 22.2. Computes net sales, taxes, discounts, and credit notes by day range.
  - **Done When**: Aggregates match PRD financial definitions exactly.

- [x] **Task 5.3.2: CSV Report Streaming**
  - **Files**: `server/src/modules/reports/reports.routes.ts`
  - **Spec**: PRD 22.1.2. `GET /api/v1/reports/:type/csv` streams CSV download.
  - **Done When**: Endpoint downloads CSV matching report rows.

---

## Phase 6 — Frontend-Backend Integration & E2E Validation

### 6.1 Client API Layer Integration
*Priority: P0 | Target: `src/api/`, `src/lib/DataContext.jsx`*

- [x] **Task 6.1.1: Axios/Fetch API Client & Interceptors**
  - **Files**: `src/api/client.js`
  - **Spec**: Base URL `http://localhost:4000/api/v1` with `withCredentials: true`. Handles 401 redirect and 403 alerts.
  - **Done When**: API client successfully executes authenticated requests.

- [x] **Task 6.1.2: Replace `localStorage` in `DataContext.jsx` with Server Queries**
  - **Files**: [`src/lib/DataContext.jsx`](file:///c:/Users/Hp/Documents/Mesob%20Restaurant/src/lib/DataContext.jsx)
  - **Spec**: Replaces initial seed from `mockData.js` with server queries; mutations call API endpoints.
  - **Done When**: UI renders real database records upon login.

- [x] **Task 6.1.3: Wire Socket.io Client for Real-Time State**
  - **Files**: [`src/lib/DataContext.jsx`](file:///c:/Users/Hp/Documents/Mesob%20Restaurant/src/lib/DataContext.jsx), [`src/lib/notify.js`](file:///c:/Users/Hp/Documents/Mesob%20Restaurant/src/lib/notify.js)
  - **Spec**: Connects to WebSocket server; updates tickets, notifications, and tables live on inbound events.
  - **Done When**: Marking ticket ready on one browser tab immediately chimes and updates waiter screen on another browser without refresh.

### 6.2 Acceptance Criteria Verification
*Priority: P0 | Target: End-to-End Testing*

- [x] **Task 6.2.1: Stage 1 Acceptance Suite** [PRD 25.4.1]
  - Verify complete workflow: Order Creation → Kitchen Queue → Waiter Serve → Payment → PDF Invoice → Table Cleaning.
- [x] **Task 6.2.2: Stage 2 Acceptance Suite** [PRD 25.4.2]
  - Verify Recipe Depletion, Low Stock alerts, and Purchase Approvals.
- [x] **Task 6.2.3: Stage 3 Acceptance Suite** [PRD 25.4.3]
  - Verify Reservation overlap blocking, Day Auto-Close at 04:00 AM, and Reports exports.

---

## Phase 7 — Operations & Facility: Expenses, Maintenance & Security (PRD Sections 17, 18, 19)

### 7.1 Expenses Management Engine (PRD Section 17)
*Priority: P1 | Target: `server/src/modules/expenses/`, `server/src/scheduler/recurring-expenses.job.ts`, `src/pages/Expenses.jsx`*

- [x] **Task 7.1.1: Expense REST Endpoints & Scoped Permissions**
  - **Files**: `server/src/modules/expenses/expenses.routes.ts`, `server/src/modules/expenses/expenses.service.ts`
  - **Spec**: PRD 17.1, 17.2, 3.3.
  - **Logic**:
    - `POST /api/v1/expenses`: Manager and Inventory Staff only. Inventory Staff auto-sets `recordedById = user.id`, status = `Confirmed`. Validates `amount > 0`. Category must not be `"Emergency purchase"` (PRD 17.4.1).
    - `GET /api/v1/expenses`: Query with filters (`from`, `to`, `category`, `status`). Scoped by role: Inventory Staff sees only their own entries (`recordedById == user.id`), Manager sees all.
    - `PATCH /api/v1/expenses/:id`: Manager only. Allows editing description, amount, category. Logs old vs new values to `ActivityLog` (PRD 17.2.2).
    - `DELETE /api/v1/expenses/:id`: Hard-blocked (returns 403: *"Expenses are never deleted"* - PRD 17.2.2, 4.6.1).
  - **Done When**: Inventory staff can only view/create own records; Manager can view/edit any with activity log; delete attempts fail with 403.

- [x] **Task 7.1.2: Recurring Expense Templates & Automated Generation Job**
  - **Files**: `server/prisma/schema.prisma`, `server/src/modules/expenses/recurring-expenses.routes.ts`, `server/src/scheduler/recurring-expenses.job.ts`
  - **Spec**: PRD 17.3, 4.9.
  - **Logic**:
    - Schema: Add `RecurringExpenseTemplate` (`category`, `description`, `amount`, `period` [Weekly, Monthly], `dayOfWeek`, `dayOfMonth`, `isActive`).
    - Endpoints: `GET /api/v1/expenses/templates`, `POST /templates`, `PATCH /templates/:id` (Manager only).
    - Daily Scheduled Job: Checks active templates. If today matches recurrence schedule, creates a new `Expense` entry with `status = "Pending confirmation"` and template amount. Emits notification to Manager: *"Recurring expense pending confirmation: <description>"*.
    - Confirmation Endpoint: `PATCH /api/v1/expenses/:id/confirm` (Manager only) updates actual amount and sets `status = "Confirmed"`.
  - **Done When**: Cron job creates "Pending confirmation" expense entries; confirming makes them visible in financial reports.

- [x] **Task 7.1.3: Expenses Frontend UI & Client Integration**
  - **Files**: [`src/pages/Expenses.jsx`](file:///c:/Users/Hp/Documents/Mesob%20Restaurant/src/pages/Expenses.jsx), [`src/api/client.js`](file:///c:/Users/Hp/Documents/Mesob%20Restaurant/src/api/client.js)
  - **Spec**: PRD 17.5.
  - **UI Controls**:
    - Expenses table with search, category filter, date picker, status filter.
    - Top StatCards: Total Confirmed Expenses this month, Pending Confirmations count, Top Expense Category.
    - Modal `"Record Expense"`: Category dropdown, amount input, date picker, description textarea, receipt URL input.
    - Manager controls: `"Confirm"` badge button on pending entries with amount edit modal; `"Edit"` button on confirmed entries; `"Recurring Templates"` tab. Remove hard-delete button to align with PRD 17.2.2.
    - Wire `expensesApi` into `client.js` (`list`, `create`, `update`, `confirm`, `listTemplates`, `createTemplate`).
  - **Done When**: Expenses page displays real database records; Inventory staff sees only their records; Manager can confirm recurring expenses.

### 7.2 Equipment & Preventive Maintenance Engine (PRD Section 18)
*Priority: P1 | Target: `server/src/modules/maintenance/`, `server/src/scheduler/maintenance.job.ts`, `src/pages/Maintenance.jsx`*

- [x] **Task 7.2.1: Asset Registry Data Model & REST Endpoints**
  - **Files**: `server/prisma/schema.prisma`, `server/src/modules/maintenance/assets.routes.ts`, `server/src/modules/maintenance/assets.service.ts`
  - **Spec**: PRD 18.1, 3.3.
  - **Logic**:
    - Schema: Add `Asset` (`name`, `category`, `serialNumber`, `purchaseDate`, `warrantyExpiryDate`, `location`, `status` [Active, Under Maintenance, Out of Service, Retired], `notes`).
    - Endpoints: `GET /api/v1/assets`, `POST /api/v1/assets`, `PATCH /api/v1/assets/:id` (Manager only).
    - Status Rules: Assets cannot be hard-deleted; soft status transition to `Retired` (PRD 18.1.1).
  - **Done When**: Manager can register and update equipment assets; retired assets are preserved; non-managers forbidden.

- [x] **Task 7.2.2: Maintenance Request Workflow, Costs & Deletion Safeguards**
  - **Files**: `server/src/modules/maintenance/maintenance.routes.ts`, `server/src/modules/maintenance/maintenance.service.ts`
  - **Spec**: PRD 18.2, 18.3, 18.6, 18.7.
  - **Logic**:
    - `POST /api/v1/maintenance/requests`: Open to ANY staff via "Report an issue" form (`assetId` optional, `problem`, `priority` [Low, Medium, High, Critical], `description`).
    - `GET /api/v1/maintenance/requests`: Manager sees all; other staff see own reported issues.
    - `PATCH /api/v1/maintenance/requests/:id`: Manager only. Assign to internal employee (`assignedTo`) OR external vendor (`vendorName`, `vendorPhone` text); transition status (`Reported` -> `Assigned` -> `In Progress` -> `Completed`); record resolution `cost` and notes.
    - `DELETE /api/v1/maintenance/requests/:id`: Manager only. If `cost > 0`, reject with 400: *"Cannot delete maintenance requests with recorded costs. Archive only."* (PRD 18.7.1). If `cost === 0`, allow deletion and log to `ActivityLog`.
  - **Done When**: Staff can report issues; Manager assigns and records costs; deleting request with cost is blocked while cost-free can be deleted.

- [x] **Task 7.2.3: Warranty Expiry Alerts & Preventive Maintenance Scheduler**
  - **Files**: `server/prisma/schema.prisma`, `server/src/scheduler/maintenance.job.ts`
  - **Spec**: PRD 18.4, 18.5, 4.9.
  - **Logic**:
    - Schema: Add `PreventiveMaintenanceTemplate` (`assetId`, `taskName`, `frequencyDays`, `assignedTo`, `nextDueDate`, `isActive`).
    - Warranty Alert Job: Runs daily. Checks assets where `warrantyExpiryDate` is between now and now + 30 days. Emits notification to Manager: *"Asset <name> warranty expires in <X> days"*.
    - Preventive Maintenance Job: Runs daily. Checks templates where `nextDueDate <= now`. Automatically creates a `MaintenanceRequest` (priority `Medium`, title `[Preventive] <taskName>`), advances `nextDueDate = now + frequencyDays`, notifies Manager.
  - **Done When**: Scheduled job triggers warranty alert 30 days prior and generates recurring maintenance requests.

- [x] **Task 7.2.4: Maintenance & Assets Frontend UI Integration**
  - **Files**: [`src/pages/Maintenance.jsx`](file:///c:/Users/Hp/Documents/Mesob%20Restaurant/src/pages/Maintenance.jsx), [`src/api/client.js`](file:///c:/Users/Hp/Documents/Mesob%20Restaurant/src/api/client.js)
  - **Spec**: PRD 18.2, 18.5.
  - **UI Controls**:
    - Tabs: `"Requests"` and `"Asset Registry"`.
    - Priority pills including Critical (red), status badges, assignee, cost display.
    - Manager modal `"Manage Request"`: Assign to staff/vendor, update status, record cost.
    - `"Add Asset"` modal for Manager with warranty date picker and category.
    - Wire `maintenanceApi` into `client.js` (`listRequests`, `createRequest`, `updateRequest`, `deleteRequest`, `listAssets`, `createAsset`, `updateAsset`).
  - **Done When**: Maintenance page manages assets and requests against server; cost-bearing requests protect from deletion in UI.

### 7.3 Security Records & Incident Lifecycle (PRD Section 19)
*Priority: P1 | Target: `server/src/modules/security/`, `src/pages/Visitors.jsx`, `src/pages/Incidents.jsx`, `src/pages/LostFound.jsx`*

- [x] **Task 7.3.1: Visitor Log Endpoints & Check-Out Tracking**
  - **Files**: `server/src/modules/security/visitors.routes.ts`, `server/src/modules/security/visitors.service.ts`
  - **Spec**: PRD 19.1, 3.3.
  - **Logic**:
    - `POST /api/v1/security/visitors`: Security and Manager. Fields: `name`, `phone`, `purpose`, `personVisited`, `badgeNumber` optional, `checkInTime`. Strictly NO ID numbers, NO vehicle plates (PRD 19.1.2).
    - `GET /api/v1/security/visitors`: Security and Manager only.
    - `PATCH /api/v1/security/visitors/:id/checkout`: Sets `checkOutTime = now()`.
    - `DELETE /api/v1/security/visitors/:id`: Manager only (PRD 19.1.3). Logs to `ActivityLog`.
  - **Done When**: Security can check in/out visitors; Manager can view/delete; other roles receive 403 Forbidden.

- [x] **Task 7.3.2: Incident Management & Manager Resolution Workflow**
  - **Files**: `server/src/modules/security/incidents.routes.ts`, `server/src/modules/security/incidents.service.ts`
  - **Spec**: PRD 19.2, 3.3, 4.6.3.
  - **Logic**:
    - `POST /api/v1/security/incidents`: Any staff via issue reporter, or Security directly. Fields: `category`, `title`, `severity` [Low, Medium, High, Critical], `description`, `location`, `peopleInvolved`, `occurredAt`. Status starts as `Reported`.
    - `GET /api/v1/security/incidents`: Security and Manager only.
    - `PATCH /api/v1/security/incidents/:id/review`: Security or Manager moves status to `Under Review`.
    - `PATCH /api/v1/security/incidents/:id/resolve`: Manager ONLY. Requires `resolutionNotes`. Status becomes `Resolved`, `resolvedAt = now()`.
    - `DELETE /api/v1/security/incidents/:id`: Strictly blocked (403: *"Incidents are archive-only and never deleted"* - PRD 19.2.4).
  - **Done When**: Incidents transition Reported -> Under Review -> Resolved by Manager with resolution notes; deletion rejected.

- [x] **Task 7.3.3: Lost & Found Register & Claim Verification**
  - **Files**: `server/src/modules/security/lost-found.routes.ts`, `server/src/modules/security/lost-found.service.ts`
  - **Spec**: PRD 19.3, 3.3, 4.6.2.
  - **Logic**:
    - `POST /api/v1/security/lost-found`: Security and Manager. Fields: `itemDescription`, `locationFound`, `foundAt`. Status = `Found`.
    - `GET /api/v1/security/lost-found`: Security and Manager.
    - `PATCH /api/v1/security/lost-found/:id/claim`: Security or Manager. Requires `claimantName`, `claimantPhone`. Sets status to `Claimed`, `claimedAt = now()`.
    - `DELETE /api/v1/security/lost-found/:id`: Manager only (PRD 19.3.3). Logs to `ActivityLog`.
  - **Done When**: Lost items recorded; claiming requires claimant name & phone; Manager can delete; others blocked.

- [x] **Task 7.3.4: Security Role Frontend UI & Privacy Gating**
  - **Files**: [`src/pages/Visitors.jsx`](file:///c:/Users/Hp/Documents/Mesob%20Restaurant/src/pages/Visitors.jsx), [`src/pages/Incidents.jsx`](file:///c:/Users/Hp/Documents/Mesob%20Restaurant/src/pages/Incidents.jsx), [`src/pages/LostFound.jsx`](file:///c:/Users/Hp/Documents/Mesob%20Restaurant/src/pages/LostFound.jsx), [`src/api/client.js`](file:///c:/Users/Hp/Documents/Mesob%20Restaurant/src/api/client.js)
  - **Spec**: PRD 19.4, 3.5.
  - **UI Controls**:
    - `Visitors.jsx`: Active visitors count, Check-in modal, Check-out button, Manager-only Delete button.
    - `Incidents.jsx`: Severity pills, Filter by status, "Under Review" transition button, Manager "Resolve Incident" modal with notes textarea.
    - `LostFound.jsx`: "Record Lost Item" modal, "Claim Item" modal with claimant verification inputs.
    - Wire `securityApi` into `client.js` (`visitors`, `incidents`, `lostFound`).
  - **Done When**: Pages display live data; Privacy gating blocks unauthorized roles; check-in/claim/resolve flows work end-to-end.

---

## Phase 8 — Administration, Staffing & Compliance (PRD Sections 5, 6, 12, 4.5, 4.8)

### 8.1 Employee Records & User Administration (PRD Section 6)
*Priority: P0 | Target: `server/src/modules/employees/`, `server/src/modules/users/`, `src/pages/Employees.jsx`, `src/pages/Users.jsx`*

- [x] **Task 8.1.1: Employee Directory CRUD & Employee Number Sequence**
  - **Files**: `server/src/modules/employees/employees.routes.ts`, `server/src/modules/employees/employees.service.ts`
  - **Spec**: PRD 6.1, 6.3, 3.3. Manager only (`requireRole(Role.MANAGER)`).
  - **Logic**:
    - `POST /api/v1/employees`: Auto-generates next `employeeNumber` (`EMP-001`, `EMP-002` via `NumberSequence`). Fields: `name`, `role`, `phone`, `email`, `nationalId`, `status` [Active, On Leave, Terminated], `joinedDate`.
    - `GET /api/v1/employees`: Search by name/phone, filter by role/status.
    - `PATCH /api/v1/employees/:id`: Update employee info or status. Setting `Terminated` automatically sets linked User account `status = SUSPENDED` (PRD 6.7).
    - `DELETE /api/v1/employees/:id`: If employee has linked orders or transactions, block deletion (archive-only, PRD 4.6.1).
  - **Done When**: Creating employee auto-increments EMP-XXX; setting Terminated deactivates linked user account; active transactions block deletion.

- [x] **Task 8.1.2: Administrator User Management & Password Reset Workflow**
  - **Files**: `server/src/modules/users/users.routes.ts`, `server/src/modules/users/users.service.ts`
  - **Spec**: PRD 6.2, 6.5, 3.3. Administrator only (`requireRole(Role.ADMIN)`).
  - **Logic**:
    - `GET /api/v1/users`: List users with status (Active, Suspended, Locked), role, linked employee name.
    - `POST /api/v1/users`: Create user account. Validate unique username/email, minimum 8 characters password, hash with bcrypt/argon2, link `employeeId` optional.
    - `PATCH /api/v1/users/:id/status`: Suspend or Activate user. Suspended users cannot log in (PRD 4.11.10).
    - `POST /api/v1/users/:id/reset-password`: Sets temporary password and flags `mustChangePassword = true` (PRD 6.2).
    - `POST /api/v1/users/:id/unlock`: Clears lockout (`failedAttempts = 0`, `lockedUntil = null`).
  - **Done When**: Only Admin can access `/api/v1/users`; password resets enforce `mustChangePassword`; locked accounts can be unlocked.

- [x] **Task 8.1.3: User Profile & Self-Service Password Change**
  - **Files**: `server/src/modules/auth/auth.routes.ts`, [`src/pages/Profile.jsx`](file:///c:/Users/Hp/Documents/Mesob%20Restaurant/src/pages/Profile.jsx)
  - **Spec**: PRD 3.2.8, 6.4. All authenticated users.
  - **Logic**:
    - `GET /api/v1/auth/me`: Current user info + employee details.
    - `PATCH /api/v1/auth/profile`: Update own contact phone/email.
    - `POST /api/v1/auth/change-password`: Requires `currentPassword` and `newPassword` (min 8 chars). Verifies current password before updating; sets `mustChangePassword = false`.
  - **Done When**: User can verify old password and update to new password; invalid old password returns 400.

- [x] **Task 8.1.4: Staff Management Frontend Integration**
  - **Files**: [`src/pages/Employees.jsx`](file:///c:/Users/Hp/Documents/Mesob%20Restaurant/src/pages/Employees.jsx), [`src/pages/Users.jsx`](file:///c:/Users/Hp/Documents/Mesob%20Restaurant/src/pages/Users.jsx), [`src/api/client.js`](file:///c:/Users/Hp/Documents/Mesob%20Restaurant/src/api/client.js)
  - **Spec**: PRD 6.1, 6.2.
  - **UI Controls**:
    - `Employees.jsx`: Manager-only view. Add employee modal with phone/national ID, Edit modal, Status dropdown (Active, On Leave, Terminated). Remove hard-delete action for referenced employees.
    - `Users.jsx`: Admin-only view. User table with status badge, Create user modal, Reset password dialog displaying temporary password, Unlock button calling server unlock.
    - Wire `employeesApi` and `usersApi` into `client.js`.
  - **Done When**: Manager manages employees; Admin manages users; UI updates backend directly.

### 8.2 Customer Directory & Order History Engine (PRD Section 12)
*Priority: P1 | Target: `server/src/modules/customers/`, `src/pages/Customers.jsx`*

- [x] **Task 8.2.1: Customer Search, Lookup & Aggregated History Endpoints**
  - **Files**: `server/src/modules/customers/customers.routes.ts`, `server/src/modules/customers/customers.service.ts`
  - **Spec**: PRD 12.1, 12.2, 12.3. Waiter and Manager.
  - **Logic**:
    - `GET /api/v1/customers/lookup?phone=09...`: Fast search by phone prefix or name for auto-complete in takeaway orders and reservations.
    - `GET /api/v1/customers`: List customers with order count, reservation count, total spend (ETB), last visit date.
    - `GET /api/v1/customers/:id`: Detailed profile with past order history, past reservations, notes / dietary restrictions.
    - `POST /api/v1/customers`: Create customer record (`name`, `phone`, `email` optional, `notes`). Phone must be unique.
    - `PATCH /api/v1/customers/:id`: Update customer details or notes.
  - **Done When**: Phone lookup responds under 100ms; customer detail aggregates total spend and order history accurately.

- [x] **Task 8.2.2: Customer Profile Merging Transaction**
  - **Files**: `server/src/modules/customers/customers.service.ts`, `server/src/modules/customers/customers.routes.ts`
  - **Spec**: PRD 12.4. Manager only.
  - **Logic**:
    - `POST /api/v1/customers/merge`: Body `{ sourceCustomerId, targetCustomerId }`.
    - In a database transaction:
      - Re-points all `Order` records from source to target.
      - Re-points all `Reservation` records from source to target.
      - Appends source customer's notes to target customer.
      - Marks source customer as archived.
      - Logs to `ActivityLog`: *"Merged customer <source> into <target>"*.
  - **Done When**: Merging moves all orders and reservations to target profile without data loss; logged to activity log.

- [x] **Task 8.2.3: Customers Directory Frontend UI Integration**
  - **Files**: [`src/pages/Customers.jsx`](file:///c:/Users/Hp/Documents/Mesob%20Restaurant/src/pages/Customers.jsx), [`src/api/client.js`](file:///c:/Users/Hp/Documents/Mesob%20Restaurant/src/api/client.js)
  - **Spec**: PRD 12.3, 12.4.
  - **UI Controls**:
    - Customer search bar by phone/name, customer cards showing Visits, Total Spend (ETB), Last Visit, Notes.
    - Customer Detail Drawer showing order history, past reservations, and editable notes.
    - Manager-only `"Merge Customer"` button opening duplicate selection modal.
    - Wire `customersApi` into `client.js` (`lookup`, `list`, `getById`, `create`, `update`, `merge`).
  - **Done When**: Customers page renders database records; Waiter can search customer during order creation; Manager can merge profiles.

### 8.3 System Settings & Business Profile Configuration (PRD Section 5)
*Priority: P1 | Target: `server/src/modules/settings/`, `src/pages/Settings.jsx`*

- [x] **Task 8.3.1: Settings API Endpoints & Operational Parameters**
  - **Files**: `server/src/modules/settings/settings.routes.ts`, `server/src/modules/settings/settings.service.ts`
  - **Spec**: PRD 5.1, 5.2, 5.4, 5.5, 5.7. Manager only (`requireRole(Role.MANAGER)`).
  - **Logic**:
    - `GET /api/v1/settings`: Returns restaurant profile, TIN, VAT rate, service charge rate, closing time, delayed ticket minutes, low stock threshold, inventory tracking boolean.
    - `PATCH /api/v1/settings`: Update settings fields.
    - Audit: Any change to `vatRate`, `serviceChargeRate`, `tin`, `closingTime`, or `inventoryTracking` writes to `ActivityLog` with old and new values (PRD 5.1.1).
  - **Done When**: Manager can update settings; non-managers get 403; changes write audit log entries with old vs new values.

- [x] **Task 8.3.2: Payment Methods & Reference Requirements Configuration**
  - **Files**: `server/prisma/schema.prisma`, `server/src/modules/settings/payment-methods.routes.ts`
  - **Spec**: PRD 5.3.
  - **Logic**:
    - Schema: Model `PaymentMethodConfig` (`name`, `referenceRequired`, `isActive`, `orderIndex`).
    - Endpoints: `GET /api/v1/settings/payment-methods`, `POST /methods`, `PATCH /methods/:id`.
    - Defaults: Cash (reference optional), Telebirr (reference required), CBE Birr (reference required), Card (reference optional).
    - Billing Enforcer: When recording order payment, validates if selected method requires reference; if required and reference empty, rejects with 400 (PRD 5.3.2).
  - **Done When**: Payment methods configurable; payment engine rejects missing reference for Telebirr/CBE Birr.

- [x] **Task 8.3.3: Settings Frontend UI & Server Synchronization**
  - **Files**: [`src/pages/Settings.jsx`](file:///c:/Users/Hp/Documents/Mesob%20Restaurant/src/pages/Settings.jsx), [`src/api/client.js`](file:///c:/Users/Hp/Documents/Mesob%20Restaurant/src/api/client.js)
  - **Spec**: PRD 5.1 - 5.7.
  - **UI Controls**:
    - Form sections: Restaurant Profile (TIN, Name, Address, Phone, Invoice Footer), Financial Rates (VAT %, Service Charge %), Operational Timers (Day Close Time, Delayed Ticket Minutes, Low Stock Threshold), Inventory Tracking Switch, Payment Methods table.
    - Save button with confirmation modal and success toast.
    - Wire `settingsApi` into `client.js` (`get`, `update`, `listPaymentMethods`, `updatePaymentMethod`).
  - **Done When**: Settings form loads server settings on mount; submitting updates database and reflects across application.

### 8.4 Activity Log Audit Trail & Outage Back-Entry Engine (PRD Sections 4.5, 4.8)
*Priority: P0 | Target: `server/src/modules/audit/`, `server/src/middleware/back-entry.ts`, `src/pages/ActivityLog.jsx`*

- [x] **Task 8.4.1: Activity Log Querying, Filtering & CSV Streaming**
  - **Files**: `server/src/modules/audit/audit.routes.ts`, `server/src/modules/audit/audit.service.ts`
  - **Spec**: PRD 4.8, 3.3. Manager only (`requireRole(Role.MANAGER)`).
  - **Logic**:
    - `GET /api/v1/activity-logs`: Paginated query with filters by `action` (discounts, cancels, price changes, lockouts, day close, back-entry), `role`, `userId`, `from` date, `to` date.
    - `GET /api/v1/activity-logs/csv`: Streams CSV export formatted with Timestamp, User, Role, Action, Target, Old Value, New Value, Reason.
    - Immutability: Deletions or updates to `ActivityLog` are strictly forbidden (PRD 4.8.3).
  - **Done When**: Manager can filter activity log by event type; CSV download streams complete audit rows.

- [x] **Task 8.4.2: Temporary Back-Entry Grants & Timestamp Guard**
  - **Files**: `server/src/middleware/back-entry.ts`, `server/src/modules/audit/back-entry.routes.ts`
  - **Spec**: PRD 4.5. Outage paper fallback support.
  - **Logic**:
    - `POST /api/v1/auth/back-entry-grant`: Manager only. Grants back-entry permission to specific `userId` with `durationHours` (default 12h) and `reason`. Logs grant to `ActivityLog`.
    - `GET /api/v1/auth/back-entry-grant`: Check active back-entry grant for current user.
    - Middleware Guard: Inspects incoming mutation timestamps (`happenedAt` vs `enteredAt`). If `happenedAt < enteredAt`:
      - Checks if caller is Manager OR has active unexpired `BackEntryGrant`. If neither, rejects with 403: *"Back-entry permission required"*.
      - If valid, logs back-entry usage to `ActivityLog`.
      - Rejects if `happenedAt` falls inside a locked/closed business day unless day is reopened (PRD 4.5.3).
  - **Done When**: Unauthorized back-entry is blocked; Manager or granted user can back-enter outage paper orders; audit entry is logged.

- [x] **Task 8.4.3: Activity Log Explorer Frontend Integration**
  - **Files**: [`src/pages/ActivityLog.jsx`](file:///c:/Users/Hp/Documents/Mesob%20Restaurant/src/pages/ActivityLog.jsx), [`src/api/client.js`](file:///c:/Users/Hp/Documents/Mesob%20Restaurant/src/api/client.js)
  - **Spec**: PRD 4.8.
  - **UI Controls**:
    - Date range filter, Action type multiselect, Role filter.
    - Audit table showing Timestamp, User badge, Action, Old/New changes diff, Reason note.
    - `"Export CSV"` button triggering direct download.
    - `"Grant Back-Entry Permission"` modal for Manager with staff select, hours slider, reason input.
    - Wire `auditApi` into `client.js`.
  - **Done When**: Activity log explorer renders live audit records; Manager can grant temporary back-entry from UI.

---

## Phase 9 — Notification Center & Facility Routine Automation (PRD Sections 14, 20)

### 9.1 Routine Facility Cleaning & Overdue Automation (PRD Section 14)
*Priority: P1 | Target: `server/src/modules/facility/`, `server/src/scheduler/cleaning.job.ts`, `src/pages/Cleaning.jsx`, `src/pages/MyTasks.jsx`*

- [ ] **Task 9.1.1: Cleaning Templates & Routine Task Scheduler**
  - **Files**: `server/prisma/schema.prisma`, `server/src/modules/facility/cleaning-templates.routes.ts`, `server/src/scheduler/cleaning.job.ts`
  - **Spec**: PRD 14.1, 14.2, 4.9.
  - **Logic**:
    - Schema: Add `CleaningTemplate` (`area`, `description`, `frequency` [Daily, Weekly, Per Shift], `preferredTime`, `assignedEmployeeId`, `isActive`).
    - Endpoints: `GET /api/v1/cleaning/templates`, `POST /templates`, `PATCH /templates/:id`, `DELETE /templates/:id` (Manager only).
    - Scheduled Job: Runs at shift start / daily; generates `CleaningTask` records with `source = "Routine"`, copies checklist and preferred time.
  - **Done When**: Routine cleaning tasks auto-generate on schedule; templates manageable by Manager.

- [ ] **Task 9.1.2: Overdue Cleaning Monitor & Cleaner Queue Dispatch**
  - **Files**: `server/src/scheduler/cleaning.job.ts`, `server/src/modules/facility/cleaning.service.ts`
  - **Spec**: PRD 14.3, 14.5.
  - **Logic**:
    - Runs every 15 minutes. Detects uncompleted `CleaningTask` where `dueTime < now()`.
    - Alerts: Emits WebSocket event `cleaning:overdue` to `room:cleaner` and `room:manager`; creates persistent Notification: *"Cleaning task overdue: <area>"*.
  - **Done When**: Tasks past due time trigger overdue alerts to cleaner and manager.

- [ ] **Task 9.1.3: Cleaner Tasks & Facility Checklist Frontend Integration**
  - **Files**: [`src/pages/Cleaning.jsx`](file:///c:/Users/Hp/Documents/Mesob%20Restaurant/src/pages/Cleaning.jsx), [`src/pages/MyTasks.jsx`](file:///c:/Users/Hp/Documents/Mesob%20Restaurant/src/pages/MyTasks.jsx), [`src/pages/TableQueue.jsx`](file:///c:/Users/Hp/Documents/Mesob%20Restaurant/src/pages/TableQueue.jsx), [`src/api/client.js`](file:///c:/Users/Hp/Documents/Mesob%20Restaurant/src/api/client.js)
  - **Spec**: PRD 14.3, 14.4.
  - **UI Controls**:
    - `MyTasks.jsx`: Cleaner's assigned routine tasks, Start button (`In Progress`), Complete button with notes textarea.
    - `TableQueue.jsx`: Shared unassigned table-clean tasks, claim task, complete task.
    - `Cleaning.jsx`: Manager facility overview, Templates tab, Overdue task indicator.
    - Wire `cleaningApi` (`listTasks`, `updateTaskStatus`, `listTemplates`, `createTemplate`).
  - **Done When**: Cleaner updates routine tasks live; TableQueue syncs completed cleaning tasks.

### 9.2 In-App Notification Center & Event Delivery (PRD Section 20)
*Priority: P1 | Target: `server/src/modules/notifications/`, `src/pages/Notifications.jsx`*

- [ ] **Task 9.2.1: Persistent Notifications REST API & Mark-Read Handlers**
  - **Files**: `server/src/modules/notifications/notifications.routes.ts`, `server/src/modules/notifications/notifications.service.ts`
  - **Spec**: PRD 20.1, 20.3.
  - **Logic**:
    - `GET /api/v1/notifications`: Returns current user's notifications (matching `recipientUserId == user.id` OR `recipientRole == user.role`). Supports `unreadOnly=true`.
    - `PATCH /api/v1/notifications/:id/read`: Marks single notification as read (`isRead = true`).
    - `POST /api/v1/notifications/read-all`: Marks all notifications for user/role as read.
    - Retention Cleanup: Scheduled job archives / deletes notifications older than 30 days (PRD 20.1.1).
  - **Done When**: Users receive only role/user-scoped notifications; mark-read and read-all update database.

- [ ] **Task 9.2.2: Notification Bell, Dropdown & Sound Preferences Integration**
  - **Files**: [`src/pages/Notifications.jsx`](file:///c:/Users/Hp/Documents/Mesob%20Restaurant/src/pages/Notifications.jsx), [`src/api/client.js`](file:///c:/Users/Hp/Documents/Mesob%20Restaurant/src/api/client.js)
  - **Spec**: PRD 20.1, 20.2.
  - **UI Controls**:
    - Global header notification bell with live unread badge count.
    - Popover dropdown showing latest 5 unread alerts with direct navigation links.
    - `Notifications.jsx` page: Full notification history, filter by unread/read, `"Mark all as read"` button.
    - Sound triggers: Restricted to New kitchen ticket (Kitchen screen) and Ticket ready (owning Waiter) (PRD 20.2.1).
    - Wire `notificationsApi` into `client.js`.
  - **Done When**: Unread count updates in header; clicking notification marks it read; sound plays strictly on designated events.