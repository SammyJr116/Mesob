# Mesob Restaurant Management System — Implementation Roadmap & Tasks

Derived from [`PRD.md`](./PRD.md) and the completed frontend prototype. This document establishes the concrete engineering phases to fill remaining frontend gaps, build the full-stack backend, and connect them.

---

## Roadmap Overview

```
┌────────────────────────────────────────────────────────────────────────┐
│                        DEVELOPMENT ROADMAP                             │
├────────────────────────────────────────────────────────────────────────┤
│ Phase 1: Frontend Gap Filling (PRD Alignment)                         │
│ Phase 2: Backend Architecture & Database Foundation                    │
│ Phase 3: Core Operations, Real-Time WebSockets & Billing (Stage 1)     │
│ Phase 4: Inventory, Recipes & Sourcing Backend (Stage 2)               │
│ Phase 5: Reservations, Facility, Scheduler & Reporting (Stage 3)       │
│ Phase 6: Frontend-to-Backend Integration & E2E Acceptance Testing      │
└────────────────────────────────────────────────────────────────────────┘
```

---

## Phase 1 — Frontend Gap Filling (PRD Alignment)
*Goal: Ensure the UI exposes all mandatory operational controls and workflows specified in the PRD.*

### 1.1 Invoicing, Credit Notes & PDF Export (PRD Section 11 & 22)
- [ ] **1.1.1 [P0] Credit Note Modal & Workflow (`OrderDetail.jsx`)** [PRD 11.7]
  - Allow Manager to issue a Full or Partial Credit Note against a completed invoice with mandatory reason and refund method.
  - Calculate proportional reduction of taxable amount, tax portion, and service charge.
  - Display credit notes under the invoice section with continuous `CN-` numbering.
- [ ] **1.1.2 [P1] Buyer Tax Information Inputs (`OrderDetail.jsx`)** [PRD 11.5.3]
  - Add optional Buyer Organization Name and Buyer TIN fields in the `PaymentModal` for commercial clients.
- [ ] **1.1.3 [P1] PDF Invoice & Credit Note Download Triggers** [PRD 11.5.1, 22.1.3]
  - Add "Download PDF Invoice" button on completed orders.
  - Add "Download PDF Credit Note" button on issued credit notes.

### 1.2 Table & Order Life-Cycle Operations (PRD Section 8 & 9)
- [ ] **1.2.1 [P0] Move Order to Another Table (`OrderDetail.jsx`, `Tables.jsx`)** [PRD 8.3.2]
  - Action for Waiter/Manager to transfer an open order to another `Available` table.
  - Automatically transitions original table to `Cleaning` and target table to `Occupied`.
- [ ] **1.2.2 [P1] Reassign Order Waiter Modal (`OrderDetail.jsx`)** [PRD 8.5.2, 9.9.3]
  - Allow Manager to reassign an active order to another waiter when shift changes occur; log to activity log.
- [ ] **1.2.3 [P1] Line-Item Cancellation with Reason Prompt** [PRD 9.6]
  - Enable item-level quantity reduction or cancellation on `Submitted` tickets.
  - When cancelling an item already `Preparing` or `Ready`, require Manager authorization and prompt for waste logging.

### 1.3 Menu Availability & Scheduled Pricing (PRD Section 7)
- [ ] **1.3.1 [P1] Scheduled Future Price Changes (`Menu.jsx`)** [PRD 7.8]
  - Add "Schedule Price Change" modal with effective date picker.
  - Preserve price history and ensure existing orders keep snapshot prices.
- [ ] **1.3.2 [P1] Meal Period Time-of-Day Enforcer (`NewOrder.jsx`)** [PRD 7.6, 7.7]
  - Compare current clock time against meal period definitions (e.g. Breakfast 06:00–11:00).
  - Disable out-of-period items with clear badge: "Breakfast only", "Dinner only".

### 1.4 Business Day & Shift Controls (PRD Section 4.1 & 22)
- [ ] **1.4.1 [P1] Business Day Close & Reopen Controls (`Reports.jsx`)** [PRD 4.1.5 - 4.1.7]
  - Add explicit "Close Business Day" confirmation modal and "Reopen Day" (Manager-only, most recent day).
  - Enforce locked day indicators on past records.
- [ ] **1.4.2 [P2] Back-Entry Permission Indicator (`NewOrder.jsx`, `Expenses.jsx`)** [PRD 4.5, 23.2]
  - For outage recovery, allow users with back-entry permission to specify historical date/time.

### 1.5 Security, Sessions & CSV Tools (PRD Section 6 & 23.9)
- [ ] **1.5.1 [P1] 30-Minute Inactivity Warning Modal (`App.jsx`)** [PRD 6.6]
  - Global idle timer triggering a 2-minute countdown modal ("Stay signed in" / "Logout").
- [ ] **1.5.2 [P2] Downloadable CSV Templates & Validation Previews** [PRD 23.9]
  - Add sample CSV download templates and upload validation modals for Menu Items, Recipes, and Inventory.

---

## Phase 2 — Backend Architecture & Database Foundation
*Goal: Initialize a clean, robust backend service with strict database schema enforcement.*

### 2.1 Backend Project Setup
- [ ] **2.1.1 [P0] Initialize `server/` with Node.js & TypeScript**
  - Configure Fastify or Express with TypeScript, ESLint, and Prettier.
  - Configure environment variables (`PORT`, `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGIN`).
- [ ] **2.1.2 [P0] Database Setup & Migration Framework**
  - Configure PostgreSQL 16 connection with Prisma ORM or Drizzle.
  - Setup migration scripts and database seeders.

### 2.2 Relational Data Model (PRD Section 24)
- [ ] **2.2.1 [P0] Schema: Users, Roles, Employees & Audit Log** [PRD 24.1]
  - `users`, `employees`, `activity_logs`, `back_entry_grants`.
- [ ] **2.2.2 [P0] Schema: Settings, Tables & Managed Lists** [PRD 24.1]
  - `settings`, `tables`, `payment_methods`, `meal_periods`.
- [ ] **2.2.3 [P0] Schema: Menu, Variants, Add-ons & Recipes** [PRD 24.1]
  - `menu_categories`, `menu_items`, `item_variants`, `addons`, `recipes`, `recipe_lines`.
- [ ] **2.2.4 [P0] Schema: Orders, Tickets & Line Items** [PRD 24.1]
  - `orders`, `order_tables`, `tickets`, `ticket_items`.
- [ ] **2.2.5 [P0] Schema: Invoices, Credit Notes & Payments** [PRD 24.1]
  - `invoices`, `credit_notes`, `payments`, `day_closures`.
- [ ] **2.2.6 [P0] Schema: Inventory, Suppliers & Purchasing** [PRD 24.1]
  - `inventory_items`, `stock_movements`, `suppliers`, `purchase_requests`, `waste_records`.
- [ ] **2.2.7 [P0] Schema: Reservations, Tasks & Facilities** [PRD 24.1]
  - `reservations`, `cleaning_tasks`, `maintenance_requests`, `incidents`, `visitors`, `lost_found`.

### 2.3 Authentication, RBAC & Session Security (PRD Section 3 & 6)
- [ ] **2.3.1 [P0] JWT Authentication with HTTP-Only Cookies** [PRD 6.4]
  - Secure login endpoint accepting username/email + password with bcrypt hashing.
  - Sliding session expiration (30 minutes of inactivity).
- [ ] **2.3.2 [P0] Account Lockout Policy** [PRD 6.5]
  - Track consecutive failed logins; lock account for 15 minutes after 5 failures.
  - Administrator unlock endpoint (`/api/v1/users/:id/unlock`).
- [ ] **2.3.3 [P0] Role-Based Access Control (RBAC) Middleware** [PRD 3.3]
  - Server-side guard matching the PRD Permission Matrix across all 7 roles.

### 2.4 Gapless Sequence Number Generators (PRD Section 4.4, 23.5)
- [ ] **2.4.1 [P0] Continuous Invoices (`INV-XXXXXX`) and Credit Notes (`CN-XXXXXX`)**
  - Implement PostgreSQL sequence / atomic lock to guarantee zero numbering gaps under concurrent checkouts.
- [ ] **2.4.2 [P0] Daily Order Numbers (`ORD-YYYYMMDD-XXX`)**
  - Reset sequence per business day.

---

## Phase 3 — Core Operations, Real-Time WebSockets & Billing (Stage 1)
*Goal: Implement Stage 1 operational features with sub-3-second real-time sync.*

### 3.1 Real-Time WebSocket Gateway (PRD Section 10.4, 23.1.2)
- [ ] **3.1.1 [P0] Socket.io Gateway Setup**
  - Establish authenticated rooms: `room:kitchen`, `room:waiter:${id}`, `room:manager`.
- [ ] **3.1.2 [P0] Ticket Events Broadcast**
  - Emit `ticket:new` to Kitchen on round send.
  - Emit `ticket:ready` to owning Waiter on kitchen mark ready.
  - Emit `ticket:delayed` to Manager when prep time exceeds `delayThreshold`.

### 3.2 Order & Ticket API Endpoints (PRD Section 9 & 10)
- [ ] **3.2.1 [P0] Order Creation & Ticket Round Dispatch**
  - `POST /api/v1/orders`: Validate table availability, meal periods, and stock.
  - `POST /api/v1/orders/:id/tickets`: Add batches and dispatch tickets.
- [ ] **3.2.2 [P0] Kitchen Ticket Transitions**
  - `PATCH /api/v1/tickets/:id/status`: `Submitted` → `Preparing` → `Ready`.
  - `POST /api/v1/tickets/:id/reject`: Kitchen item rejection with reason.
- [ ] **3.2.3 [P0] Waiter Serving Transition**
  - `PATCH /api/v1/tickets/:id/serve`: Mark ticket `Served`.

### 3.3 Financial Calculations & Invoice Engine (PRD Section 11)
- [ ] **3.3.1 [P0] Tax-Inclusive Bill Calculator** [PRD 11.1]
  - Exact formula implementation: subtotal, service charge (pre-discount), discount, extracted tax portion, net sales.
- [ ] **3.3.2 [P0] Payment Recording & Invoice Generation** [PRD 11.4, 11.5]
  - Atomic transaction: verify all tickets `Served` → issue invoice `INV-XXXXXX` → set table `Cleaning` → spawn table cleaning task.
- [ ] **3.3.3 [P0] Credit Note Processing** [PRD 11.7]
  - Partial/full refund reversal, proportional tax adjustment, immutable audit entry.
- [ ] **3.3.4 [P1] PDF Generation Microservice** [PRD 22.1.3]
  - Generate official PDF tax invoices and credit notes via PDFKit / `@react-pdf/renderer`.

---

## Phase 4 — Inventory, Recipes & Sourcing Backend (Stage 2)
*Goal: Connect the menu to automated inventory depletion and procurement.*

### 4.1 Stock Depletion & Recipes (PRD Section 7.9, 15.6)
- [ ] **4.1.1 [P0] Automated Recipe Deduction Engine**
  - When ticket item transitions to `Served` and `inventoryTracking == true`, atomically deduct:
    $\text{Deduction} = \text{Recipe Qty} \times \text{Variant Multiplier} \times \text{Item Qty} + \text{Addons}$.
- [ ] **4.1.2 [P0] Immutable Stock Movements Ledger**
  - Write all movements (`Sale`, `Adjustment`, `Waste`, `Purchase Receipt`) with signed quantities.
- [ ] **4.1.3 [P1] Auto-Unavailability Rule** [PRD 7.7.3]
  - Auto-flag menu items as unavailable when any recipe ingredient falls below 1 portion.

### 4.2 Stock Management & Counts (PRD Section 15.5, 15.7)
- [ ] **4.2.1 [P1] Stock Count Reconciliation**
  - Record expected vs counted quantities, calculate variance %, and flag threshold alerts.
- [ ] **4.2.2 [P1] Waste Recording**
  - Deduct stock with mandatory reason and link to cancelled tickets where applicable.

### 4.3 Purchasing & Sourcing Pipeline (PRD Section 16)
- [ ] **4.3.1 [P1] Purchase Request & Manager Approval Lifecycle**
  - `Draft` → `Submitted` → `Approved` / `Rejected` → `Partially Received` → `Received`.
- [ ] **4.3.2 [P1] Emergency Purchases**
  - Instantly increase stock upon entry and flag for Manager review.

---

## Phase 5 — Reservations, Facility, Scheduler & Reporting (Stage 3)
*Goal: Implement background automation, operations modules, and business-day analytics.*

### 5.1 Reservations Engine (PRD Section 13)
- [ ] **5.1.1 [P0] Overlap Validation & Walk-In Table Blocking**
  - Atomic check ensuring no overlapping bookings on any assigned table for `reservationDuration` minutes.
  - Automatically block tables with active reservations from walk-in orders on that business day.
- [ ] **5.1.2 [P1] Reservation Arrival & Group Table Merge**
  - Marking `Arrived` merges multi-table reservations into a single order.

### 5.2 Background Automation Scheduler (PRD Section 4.1, 23.8.1)
- [ ] **5.2.1 [P0] Business Day Auto-Close (Daily at configured closing time, e.g. 04:00 AM)**
  - Lock business day, compile end-of-day summary, generate EOD PDF, and reset daily order sequences.
- [ ] **5.2.2 [P1] Delayed Ticket Polling Job (Every 1 minute)**
  - Notify Manager when active tickets exceed `delayThreshold`.
- [ ] **5.2.3 [P1] Reservation No-Show Monitor (Every 5 minutes)**
  - Automatically mark reservations past `noShowGrace` minutes as `No Show` and release tables.
- [ ] **5.2.4 [P2] Expiring Warranty & Preventive Maintenance Job (Daily)**
  - Generate alerts 30 days prior to warranty expiration.

### 5.3 Reporting, Analytics & CSV Streaming (PRD Section 22)
- [ ] **5.3.1 [P0] Financial & Sales Reports Engine**
  - Calculate Net sales, Tax extracted, Service charge, and Credit notes grouped by Day, Item, Category, Waiter, and Payment Method.
- [ ] **5.3.2 [P1] Cost Reports (Side-by-Side Reporting)** [PRD 22.4]
  - Present Purchases, Expenses, and Maintenance costs side-by-side without combining into a misleading total.
- [ ] **5.3.3 [P1] Streaming CSV Exports**
  - Export CSV reports for sales, inventory, and procurement.

---

## Phase 6 — Frontend-Backend Integration & E2E Validation
*Goal: Wire the React frontend to the backend API, replacing local mock storage.*

### 6.1 Client API Layer Integration
- [ ] **6.1.1 [P0] Replace `localStorage` in `DataContext.jsx` with Axios / Fetch Client**
  - Point endpoints to `/api/v1/` with HTTP-only cookie credentials.
- [ ] **6.1.2 [P0] Wire Socket.io Client**
  - Listen for real-time ticket updates, ready notifications, and table state changes.
- [ ] **6.1.3 [P0] Wire Auth & Session Expiration**
  - Connect login, logout, and 30-minute inactivity modal to real backend auth endpoints.

### 6.2 End-to-End Acceptance Verification (PRD Section 25.4)
- [ ] **6.2.1 [P0] Stage 1 Acceptance Test Suite** [PRD 25.4.1]
  - Order creation → Kitchen prep → Waiter serve → Bill calculation → Invoice PDF → Table clean transition.
- [ ] **6.2.2 [P0] Stage 2 Acceptance Test Suite** [PRD 25.4.2]
  - Stock receipt → Recipe deduction on serve → Negative stock warning → Low stock reorder PO.
- [ ] **6.2.3 [P0] Stage 3 Acceptance Test Suite** [PRD 25.4.3]
  - Reservation overlap prevention → Walk-in block → Group table merge → Business day auto-close at 04:00 AM.