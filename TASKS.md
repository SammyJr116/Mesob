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

- [ ] **Task 2.1.1: Initialize `server/` Node.js + Fastify/Express Service**
  - **Files**: `server/package.json`, `server/tsconfig.json`, `server/src/server.ts`
  - **Spec**: Fastify with `@fastify/cors`, `@fastify/cookie`, `@fastify/jwt`, `zod`.
  - **Done When**: Running `npm run dev` in `server/` boots API listening on `http://localhost:4000/api/v1/health` returning `{ status: "ok" }`.

- [ ] **Task 2.1.2: PostgreSQL & Prisma Setup**
  - **Files**: `server/prisma/schema.prisma`, `server/.env.example`
  - **Spec**: PostgreSQL 16 connection with Prisma client.
  - **Done When**: `npx prisma db push` successfully connects and initializes database tables.

### 2.2 Relational Data Schema (PRD Section 24)
*Priority: P0 | Target: `server/prisma/schema.prisma`*

- [ ] **Task 2.2.1: Users, Roles, Employees & Activity Log Models**
  - **Spec**: PRD 24.1. Models: `User`, `Employee`, `ActivityLog`.
  - **Done When**: Enforces unique username/email, enum roles (`ADMIN`, `MANAGER`, `KITCHEN`, `WAITER`, `INVENTORY`, `CLEANER`, `SECURITY`).

- [ ] **Task 2.2.2: Menu, Pricing, Variants & Recipes Models**
  - **Spec**: PRD 24.1. Models: `MenuCategory`, `MenuItem`, `ItemVariant`, `Addon`, `Recipe`, `RecipeLine`.
  - **Done When**: Enforces variant recipe multipliers and base ingredient unit links.

- [ ] **Task 2.2.3: Tables, Orders, Tickets & Billing Models**
  - **Spec**: PRD 24.1. Models: `Table`, `Order`, `Ticket`, `TicketItem`, `Invoice`, `CreditNote`, `Payment`.
  - **Done When**: Continuous sequence numbering constraints for invoices and credit notes.

- [ ] **Task 2.2.4: Inventory, Suppliers, Purchasing & Operations Models**
  - **Spec**: PRD 24.1. Models: `InventoryItem`, `StockMovement`, `Supplier`, `PurchaseRequest`, `Reservation`, `CleaningTask`.
  - **Done When**: Schema migration passes without warnings.

### 2.3 Authentication, RBAC & Lockout Engine
*Priority: P0 | Target: `server/src/modules/auth/`*

- [ ] **Task 2.3.1: Login, Logout & Session Cookie Endpoints**
  - **Files**: `server/src/modules/auth/auth.routes.ts`, `auth.service.ts`
  - **Spec**: PRD 6.4. `POST /api/v1/auth/login` validates username/password with `argon2` or `bcrypt`. Returns HTTP-only signed JWT cookie with 30-minute expiry.
  - **Done When**: Valid credentials issue cookie; invalid credentials return 401 without revealing username existence.

- [ ] **Task 2.3.2: 5-Attempt Lockout Handler**
  - **Files**: `server/src/modules/auth/auth.service.ts`
  - **Spec**: PRD 6.5. Increments `failedAttempts`. On 5th failure, sets `lockedUntil = now + 15 min`.
  - **Done When**: Locked user receives 423 Locked with remaining minutes; Administrator endpoint `/unlock` clears lock.

- [ ] **Task 2.3.3: Server-Side RBAC Guard Middleware**
  - **Files**: `server/src/middleware/rbac.ts`
  - **Spec**: PRD 3.3 Permission Matrix. Guards routes by role; e.g. only `MANAGER` and `ADMIN` can reach `/api/v1/reports`.
  - **Done When**: Unauthorized roles receive 403 Forbidden.

---

## Phase 3 — Core Operations, Real-Time WebSockets & Billing (Stage 1)

### 3.1 Socket.io Real-Time Dispatch Gateway
*Priority: P0 | Target: `server/src/ws/gateway.ts`*

- [ ] **Task 3.1.1: Authenticated Socket Server**
  - **Files**: `server/src/ws/gateway.ts`
  - **Spec**: PRD 10.4, 23.1. Authenticates socket connections via session cookie; assigns sockets to rooms: `room:kitchen`, `room:waiter:${userId}`, `room:manager`.
  - **Done When**: Client joins room based on verified role token.

- [ ] **Task 3.1.2: Ticket & Order Event Broadcasters**
  - **Spec**:
    - `ticket:submitted` → emits to `room:kitchen` with sound flag.
    - `ticket:ready` → emits to `room:waiter:${waiterId}` with sound flag.
    - `table:cleaning` → emits to `room:cleaner`.
  - **Done When**: Emitting event on server triggers immediate response on connected test client.

### 3.2 Order & Ticket REST APIs
*Priority: P0 | Target: `server/src/modules/orders/`*

- [ ] **Task 3.2.1: Order Creation & Ticket Dispatch Endpoints**
  - **Files**: `server/src/modules/orders/orders.routes.ts`, `orders.service.ts`
  - **Spec**: PRD 9.3, 9.4. `POST /api/v1/orders` opens order; `POST /api/v1/orders/:id/tickets` dispatches new ticket rounds atomically.
  - **Done When**: Creating order sets table to `Occupied` and emits WebSocket event within 500ms.

- [ ] **Task 3.2.2: Kitchen Ticket Status Lifecycle**
  - **Files**: `server/src/modules/tickets/tickets.routes.ts`
  - **Spec**: PRD 10.2. `PATCH /api/v1/tickets/:id/status` accepts transitions `Submitted` → `Preparing` → `Ready`.
  - **Done When**: Updating ticket status records timestamp and notifies owning waiter.

- [ ] **Task 3.2.3: Waiter Serving Transition**
  - **Spec**: PRD 9.5.1. `POST /api/v1/tickets/:id/serve` transitions ticket to `Served`. Only owning waiter or Manager allowed.
  - **Done When**: Transition to `Served` unlocks payment eligibility for the order.

### 3.3 Billing, Invoicing & PDF Generation
*Priority: P0 | Target: `server/src/modules/billing/`, `server/src/services/pdf.ts`*

- [ ] **Task 3.3.1: Strict Financial Bill Engine**
  - **Files**: `server/src/modules/billing/calculator.ts`
  - **Spec**: PRD 11.1. Implements exact subtotal, service charge, discount, and tax extraction formulas.
  - **Done When**: Calculation matches PRD 11.1.2 test numbers down to exact cents.

- [ ] **Task 3.3.2: Payment & Continuous Invoice Sequence**
  - **Files**: `server/src/modules/billing/billing.service.ts`
  - **Spec**: PRD 11.4 - 11.6. `POST /api/v1/orders/:id/payment` in a PostgreSQL transaction:
    - Verifies all tickets are `Served`.
    - Generates next continuous sequence `INV-XXXXXX`.
    - Transitions order to `Completed`, table to `Cleaning`, creates cleaner task in `CleaningTask`.
  - **Done When**: Concurrent payments generate strictly sequential invoice numbers without duplicates.

- [ ] **Task 3.3.3: Official PDF Invoice Generator**
  - **Files**: `server/src/services/pdf.ts`, `server/src/modules/billing/billing.routes.ts`
  - **Spec**: PRD 11.6.1, 22.1.3. `GET /api/v1/invoices/:id/pdf` streams generated PDF invoice containing restaurant details, TIN, line items, and tax breakdown.
  - **Done When**: Endpoint downloads valid PDF invoice matching legal fields.

---

## Phase 4 — Inventory, Recipes & Sourcing Backend (Stage 2)

### 4.1 Automated Recipe Depletion Engine
*Priority: P0 | Target: `server/src/modules/inventory/`*

- [ ] **Task 4.1.1: Recipe Depletion Transaction**
  - **Files**: `server/src/modules/inventory/depletion.service.ts`
  - **Spec**: PRD 15.6. Triggered when ticket item transitions to `Served` and `settings.inventoryTracking == true`.
  - **Logic**: For each item, multiplies recipe ingredient lines by variant multiplier and item quantity; inserts `StockMovement` (type `Sale`) with negative quantity.
  - **Done When**: Serving 2 Large Doro Wot items deducts correct recipe multiples from stock records.

- [ ] **Task 4.1.2: Auto-Unavailability Rule**
  - **Files**: `server/src/modules/inventory/inventory.service.ts`
  - **Spec**: PRD 7.7.3. If stock of any ingredient drops below 1 portion, flag menu item as `isAutoUnavailable = true`.
  - **Done When**: Short stock automatically blocks menu item from new orders; restocking clears the auto flag.

### 4.2 Stock Counts & Purchasing Pipeline
*Priority: P1 | Target: `server/src/modules/purchasing/`*

- [ ] **Task 4.2.1: Stock Count Reconciliation Endpoint**
  - **Files**: `server/src/modules/inventory/stock-count.routes.ts`
  - **Spec**: PRD 15.5. `POST /api/v1/inventory/counts` saves counted quantities, creates adjustment movements, and alerts Manager if variance exceeds threshold.
  - **Done When**: Count creates signed adjustment movements and logs variance.

- [ ] **Task 4.2.2: Purchase Approval & Receiving Workflow**
  - **Files**: `server/src/modules/purchasing/purchases.routes.ts`
  - **Spec**: PRD 16.2. `PATCH /api/v1/purchases/:id/approve` (Manager only); `POST /api/v1/purchases/:id/receive` adds delivered quantity to inventory stock.
  - **Done When**: Receiving PO increments stock and records receiving date.

---

## Phase 5 — Reservations, Facility, Scheduler & Reporting (Stage 3)

### 5.1 Reservations Engine
*Priority: P0 | Target: `server/src/modules/reservations/`*

- [ ] **Task 5.1.1: Reservation Overlap Validator**
  - **Files**: `server/src/modules/reservations/reservations.service.ts`
  - **Spec**: PRD 13.2. Checks `startTime` to `startTime + reservationDuration` across all requested tables.
  - **Done When**: Overlapping booking on same table is rejected with 409 Conflict.

- [ ] **Task 5.1.2: Walk-In Blocking Enforcer**
  - **Spec**: PRD 8.2.3, 13.3. Opening dine-in walk-in order rejects tables that have an active reservation today.
  - **Done When**: Walk-in attempt on reserved table returns validation error.

### 5.2 Background Automation Scheduler
*Priority: P0 | Target: `server/src/scheduler/`*

- [ ] **Task 5.2.1: Business Day Auto-Close Job (Daily at 04:00 AM)**
  - **Files**: `server/src/scheduler/day-close.job.ts`
  - **Spec**: PRD 4.1.5, 22.6. Runs at configured closing time: closes business day, compiles EOD summary, resets daily order sequence.
  - **Done When**: Cron triggers day close and logs summary to `DayClosure`.

- [ ] **Task 5.2.2: Delayed Ticket & No-Show Poller**
  - **Files**: `server/src/scheduler/monitors.job.ts`
  - **Spec**: PRD 10.3, 13.4. Runs every 1 minute for delayed tickets; runs every 5 minutes to mark reservations past `noShowGrace` as `No Show`.
  - **Done When**: Overdue reservations auto-transition to `No Show` and release tables.

### 5.3 Reporting & CSV Streaming Engine
*Priority: P1 | Target: `server/src/modules/reports/`*

- [ ] **Task 5.3.1: Financial & Sales Analytics Endpoints**
  - **Files**: `server/src/modules/reports/reports.service.ts`
  - **Spec**: PRD 22.2. Computes net sales, taxes, discounts, and credit notes by day range.
  - **Done When**: Aggregates match PRD financial definitions exactly.

- [ ] **Task 5.3.2: CSV Report Streaming**
  - **Files**: `server/src/modules/reports/reports.routes.ts`
  - **Spec**: PRD 22.1.2. `GET /api/v1/reports/:type/csv` streams CSV download.
  - **Done When**: Endpoint downloads CSV matching report rows.

---

## Phase 6 — Frontend-Backend Integration & E2E Validation

### 6.1 Client API Layer Integration
*Priority: P0 | Target: `src/api/`, `src/lib/DataContext.jsx`*

- [ ] **Task 6.1.1: Axios/Fetch API Client & Interceptors**
  - **Files**: `src/api/client.js`
  - **Spec**: Base URL `http://localhost:4000/api/v1` with `withCredentials: true`. Handles 401 redirect and 403 alerts.
  - **Done When**: API client successfully executes authenticated requests.

- [ ] **Task 6.1.2: Replace `localStorage` in `DataContext.jsx` with Server Queries**
  - **Files**: [`src/lib/DataContext.jsx`](file:///c:/Users/Hp/Documents/Mesob%20Restaurant/src/lib/DataContext.jsx)
  - **Spec**: Replaces initial seed from `mockData.js` with server queries; mutations call API endpoints.
  - **Done When**: UI renders real database records upon login.

- [ ] **Task 6.1.3: Wire Socket.io Client for Real-Time State**
  - **Files**: [`src/lib/DataContext.jsx`](file:///c:/Users/Hp/Documents/Mesob%20Restaurant/src/lib/DataContext.jsx), [`src/lib/notify.js`](file:///c:/Users/Hp/Documents/Mesob%20Restaurant/src/lib/notify.js)
  - **Spec**: Connects to WebSocket server; updates tickets, notifications, and tables live on inbound events.
  - **Done When**: Marking ticket ready on one browser tab immediately chimes and updates waiter screen on another browser without refresh.

### 6.2 Acceptance Criteria Verification
*Priority: P0 | Target: End-to-End Testing*

- [ ] **Task 6.2.1: Stage 1 Acceptance Suite** [PRD 25.4.1]
  - Verify complete workflow: Order Creation → Kitchen Queue → Waiter Serve → Payment → PDF Invoice → Table Cleaning.
- [ ] **Task 6.2.2: Stage 2 Acceptance Suite** [PRD 25.4.2]
  - Verify Recipe Depletion, Low Stock alerts, and Purchase Approvals.
- [ ] **Task 6.2.3: Stage 3 Acceptance Suite** [PRD 25.4.3]
  - Verify Reservation overlap blocking, Day Auto-Close at 04:00 AM, and Reports exports.