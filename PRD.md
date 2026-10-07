# Product Requirements Document (PRD)

## Single-Branch Restaurant Management System

| | |
|---|---|
| **Document** | PRD.md |
| **Version** | 1.0 |
| **Date** | September 29, 2026 |
| **Status** | Draft for client review |
| **Client** | [To be completed] |
| **Prepared by** | [To be completed] |
| **Source documents** | Restaurant_Management_SRS_Single_Branch.md (SRS v1.0) and the requirements discussion that followed it |

---

## Table of Contents

1. Introduction
2. Scope
3. Users, Roles and Access
4. Global Rules and Definitions
5. Settings
6. Employees and User Accounts
7. Menu and Recipes
8. Tables
9. Orders
10. Kitchen
11. Billing, Payments and Invoices
12. Customers
13. Reservations
14. Cleaning
15. Inventory
16. Suppliers and Purchasing
17. Expenses
18. Maintenance
19. Security
20. Notifications
21. Dashboard and Home Screens
22. Reports and Business-Day Close
23. Non-Functional Requirements
24. Data Model
25. Delivery Stages, Acceptance and Change Control
26. Open Items and Required Decisions
27. Appendix A: Glossary

---

# Section 1. Introduction

## 1.1 Purpose

1.1.1 This PRD is the single source of truth for building the Single-Branch Restaurant Management System. It defines what the system does, what it does not do, who uses it, the rules it enforces, and how each delivery stage is accepted.

1.1.2 Every requirement has a numbered ID (for example, 9.4.2). Implementation tasks, tests and change requests must reference these IDs.

## 1.2 Product Definition

1.2.1 The system is a web application that helps one restaurant branch run daily operations: staff and access, menu and recipes, tables, dine-in and takeaway orders, kitchen tickets, billing with official tax invoices, customers, reservations, cleaning, inventory and recipe-based stock deduction, suppliers and purchasing, expenses, maintenance, security records, notifications, and reports.

1.2.2 The system serves one branch only. It has no online customer-facing side. All users are restaurant staff.

## 1.3 Source Documents and Precedence

1.3.1 The SRS provides the original module list, data ideas and business rules.

1.3.2 Where this PRD differs from the SRS, **this PRD takes precedence**. All differences are listed in Section 2.4.

1.3.3 Anything the SRS specifies that this PRD does not contradict remains in force and is tagged [S].

## 1.4 Document Conventions

1.4.1 Requirement tags:

| Tag | Meaning |
|---|---|
| **[C]** | Confirmed. A decision made explicitly during the requirements discussion. |
| **[D]** | Default. An assumption made while drafting because no decision was given. The client must review these before development starts. |
| **[S]** | Carried over from the SRS and not contradicted. |

1.4.2 "Shall" marks a mandatory requirement. "May" marks an optional capability.

1.4.3 **Out of scope items must not be built.** If a task appears to need something listed in Section 2.2, stop and raise it as a change request (Section 25.6).

1.4.4 If a behaviour is not specified anywhere in this PRD, do not invent it silently. Choose the simplest behaviour consistent with the rest of the document, note the assumption, and flag it for review.

## 1.5 Design Principles [S]

1.5.1 Simple, fast and usable by non-technical staff. Every screen shows only what the role needs.

1.5.2 Consistent patterns for lists, forms, filters, status badges, confirmations and error messages.

1.5.3 Touch-friendly controls on tablet and phone screens. Clear empty states, loading states and error messages.

1.5.4 Destructive or financially significant actions always ask for confirmation.

---

# Section 2. Scope

## 2.1 In Scope

2.1.1 Modules, each described in its own section:

| Module | Section | Delivery stage |
|---|---|---|
| Settings | 5 | 1 |
| Employees and user accounts | 6 | 1 |
| Menu and recipes | 7 | 1 (recipes mandatory from Stage 2) |
| Tables | 8 | 1 |
| Orders | 9 | 1 |
| Kitchen | 10 | 1 |
| Billing, payments and invoices | 11 | 1 |
| Customers | 12 | 1 (from takeaway), 3 (from reservations) |
| Cleaning | 14 | 1 (table tasks), 3 (routine tasks) |
| Inventory | 15 | 2 |
| Suppliers and purchasing | 16 | 2 |
| Reservations | 13 | 3 |
| Expenses | 17 | 3 |
| Maintenance | 18 | 3 |
| Security | 19 | 3 |
| Notifications | 20 | 1 (extended in 2 and 3) |
| Dashboard | 21 | 1 (extended in 2 and 3) |
| Reports and business-day close | 22 | 1 (sales), 2 (inventory), 3 (rest) |

## 2.2 Out of Scope

These are explicitly excluded. Nothing in this section may be built without an approved change request.

### 2.2.1 Platform and general

2.2.1.1 Multi-branch operation, multi-tenant operation, and inter-branch transfers.
2.2.1.2 Native mobile apps (the system is a responsive web application only).
2.2.1.3 Offline mode and data sync. Outages are handled by a paper fallback (Section 23.2).
2.2.1.4 Hardware integration: receipt printers, kitchen ticket printers, cash drawers, fiscal machines, scanners.
2.2.1.5 Online ordering, delivery management, customer login, QR-code menus, customer self-ordering, and public online reservations.
2.2.1.6 Loyalty programs, marketing tools, and CRM features.
2.2.1.7 Accounting ledger, payroll, attendance, shift scheduling and rosters.
2.2.1.8 Forecasting, AI features, and advanced analytics.
2.2.1.9 A complex approval-workflow engine. Only the approvals defined in this PRD exist.
2.2.1.10 A full record-level change history. Only the activity log in Section 4.8 exists.
2.2.1.11 Any interface language other than English, bilingual or Amharic menu names, and the Ethiopian calendar.
2.2.1.12 Email, SMS, WhatsApp and phone push notifications.
2.2.1.13 Two-factor authentication, single sign-on, self-service password reset, password complexity rules and password expiry.
2.2.1.14 Custom or configurable roles, multiple roles per user, an Owner role, a Cashier role.
2.2.1.15 Point-in-time database recovery.
2.2.1.16 Hosting management, ongoing support, and training material (these belong to a separate agreement).
2.2.1.17 Phone-optimised layouts for the Waiter, Kitchen and Manager screens.

### 2.2.2 Orders, billing and payments

2.2.2.1 Payment gateways, mobile money or bank APIs, and automatic payment verification.
2.2.2.2 Cash counting, till reconciliation and cashier shifts.
2.2.2.3 Split bills (separate invoices per guest), payment of one invoice by more than one method, and tips.
2.2.2.4 Waiter-applied discounts, fixed-amount discounts, per-item discounts, stacked discounts, promotions, coupons, combos and time-of-day pricing such as happy hour.
2.2.2.5 Waiving the service charge on a bill.
2.2.2.6 Tax-exempt items and multiple tax rates.
2.2.2.7 Voiding or reissuing invoices. Corrections use credit notes only.
2.2.2.8 A dedicated tax-filing report.
2.2.2.9 Prepayment for takeaway orders.
2.2.2.10 Merging tables outside group reservations.
2.2.2.11 Separate bar or coffee stations, and routing tickets by category.
2.2.2.12 Printing of kitchen tickets. Kitchen tickets exist on screen only.
2.2.2.13 Fixed waiter-to-table assignments.
2.2.2.14 Restoring stock when a credit note is issued.

### 2.2.3 Menu, inventory and purchasing

2.2.3.1 Variants that swap an ingredient, and add-ons that remove an ingredient. A swap must be modelled as a separate menu item.
2.2.3.2 Recipe costing, food-cost percentages and stock valuation.
2.2.3.3 Batch or expiry tracking (FEFO).
2.2.3.4 Reserving stock when an order is placed.
2.2.3.5 Scheduled cycle counts, blind counts and stock-count approval workflows.
2.2.3.6 A separate recipe unit of measure.
2.2.3.7 Backfilling stock for orders served before inventory tracking was switched on.
2.2.3.8 Supplier price comparison, price-history charts, supplier returns, invoice matching, supplier payments and supplier credit balances.
2.2.3.9 A stock-adjustment approval workflow.
2.2.3.10 Importing historical orders, sales, customers, suppliers or tables.

### 2.2.4 Operations modules

2.2.4.1 Editing the reservation duration per reservation, deposits, waiting lists, recurring reservations, and reservation reminders by SMS or email.
2.2.4.2 Cleaner rotation logic, mandatory photo proof, and inspection scoring.
2.2.4.3 A vendor directory with contracts, and spare-parts inventory.
2.2.4.4 Visitor ID numbers, visitor photos and vehicle plates. Lost-and-found disposal workflows.
2.2.4.5 Budgets, expense approval workflows, and mandatory receipts.
2.2.4.6 A profit, margin or "total spend" figure. Purchases, expenses and maintenance costs are reported side by side only.
2.2.4.7 Customer blocklists, customer merging, and customer deletion tools.

### 2.2.5 Reports and dashboards

2.2.5.1 Ingredient-consumption-versus-purchases, peak-hours, top/bottom-seller and profit-and-loss reports.
2.2.5.2 PDF export of data reports (only the documents in 22.1.3 export as PDF).
2.2.5.3 Scheduled or emailed reports.
2.2.5.4 Role-tailored dashboards for roles other than Manager.
2.2.5.5 Administrator access to orders, inventory, sales or reports.
2.2.5.6 Per-category kitchen delay thresholds.

## 2.3 Known Limitations

These are accepted consequences of the decisions in this PRD. They are not defects.

2.3.1 Waiters record payments, so there is no cash reconciliation or till count.
2.3.2 Every discount needs a Manager, so a waiter cannot offer one when no Manager is available.
2.3.3 A takeaway order goes to the kitchen before payment. Uncollected takeaway food is already made; the Manager can only cancel it with a reason and record waste.
2.3.4 Drinks and coffee share the single kitchen queue, so a drink cannot be marked ready separately from the other items on its ticket.
2.3.5 Kitchen tickets exist only on screen. If the kitchen screen or power fails, there are no tickets.
2.3.6 During an internet or power outage nothing works. A paper fallback procedure is required (Section 23.2).
2.3.7 Stock accuracy depends on recipe accuracy. Portion variation, spillage and unrecorded waste cause drift, so periodic stock counts remain necessary.
2.3.8 Stock is deducted when items are served, so stock can briefly go negative before the automatic unavailable flag appears.
2.3.9 Add-ons can only add ingredients, and variants can only scale the base recipe.
2.3.10 Purchases, expenses and maintenance costs are recorded separately. The system gives no single "total spend" or profit figure, and staff must avoid entering the same spend twice.
2.3.11 The Manager cannot block an emergency purchase, only review it afterwards.
2.3.12 Onboarding a staff member takes two steps (Manager creates the employee, Administrator creates the login).
2.3.13 The Administrator cannot see operational data, so troubleshooting an order needs the Manager.
2.3.14 If the only Administrator is unavailable, nobody can reset passwords. At least two Administrator accounts are recommended.
2.3.15 Every Manager account sees all sales, expense and staff data. There is no read-only owner view.
2.3.16 When a Manager takes an order, the Manager is recorded as the order's waiter and appears in waiter reports.
2.3.17 Blocking walk-ins from any table reserved that day can leave capacity unused.
2.3.18 A party that overstays the fixed reservation duration cannot be extended. The Manager only receives a conflict warning.
2.3.19 Table turnover depends on a cleaner being logged in and available.
2.3.20 If a cleaner is deactivated or absent, their recurring tasks become unassigned until the Manager reassigns them.
2.3.21 Everyone, including the Kitchen screen, is logged out after 30 minutes of inactivity. Tickets and sound alerts stop until someone signs in again.
2.3.22 Alerts reach only staff who have the application open.
2.3.23 Daily backups mean up to one day of data can be lost after a failure.
2.3.24 The Waiter and Kitchen screens are designed for tablets and may be cramped on a phone.
2.3.25 A closed business day's totals never change. Later corrections appear in a later day.
2.3.26 Until inventory tracking is switched on (Stage 1), stock levels, low-stock alerts and purchase suggestions do not work.
2.3.27 One invoice can be paid by one payment method only.
2.3.28 Expense receipts are optional, so entries cannot always be verified against a document.
2.3.29 Only the Manager can reassign an open order to another waiter.
2.3.30 Dine-in walk-ins without a phone number produce no customer record.
2.3.31 Staff see stock quantities in the base unit (for example "12,500 g").
2.3.32 A mistaken invoice cannot be voided. It can only be corrected with a credit note.

## 2.4 Deviations from the SRS

| # | SRS position | This PRD |
|---|---|---|
| 2.4.1 | Automated recipe deduction excluded (SRS 10.3) | Included. Stock is deducted automatically from recipes when items are served, once inventory tracking is on (Section 15.6). |
| 2.4.2 | Chef and Kitchen Staff as separate roles; Owner unspecified | One Kitchen role. No Owner or Cashier role. |
| 2.4.3 | Administrator and Manager overlap | Administrator manages users only. Manager owns all operations, employees, settings and reports (Section 3). |
| 2.4.4 | Waiter "assigned tables" | Removed. A waiter owns the orders they open (Section 8.5). |
| 2.4.5 | Single order lifecycle Draft to Completed | Tickets carry Submitted/Preparing/Ready/Served. The order status is derived from its tickets (Section 9.5). |
| 2.4.6 | Tax "if configured", no invoice format | Official tax invoice as PDF, credit notes, and a service charge (Section 11). |
| 2.4.7 | Payment methods Cash, Bank Transfer, Other | Cash, Bank Transfer, Mobile Money, Card (recorded only). Others may be added in Settings (Section 5.3). |
| 2.4.8 | "Emergency purchase" as an expense category | Removed. An emergency purchase is a purchase (Section 16.5). |
| 2.4.9 | Rule 13: every cleaning task has an assigned employee | Exception for table-clean tasks, which are queue-based (Section 14.3). |
| 2.4.10 | Rule 12: negative stock only with Manager permission | Automatic deduction may drive stock negative and raises an alert. Manual issues still cannot go negative without Manager permission (Section 15.6). |
| 2.4.11 | Reservation overlap prevention without a duration | Fixed duration from Settings, multi-table reservations, walk-in blocking, group table merging (Section 13). |
| 2.4.12 | Rule 11: paid orders are corrected by an "adjustment process" | Credit notes only (Section 11.7). |
| 2.4.13 | Menu without variants, add-ons, meal periods, scheduled prices | Added (Section 7). |
| 2.4.14 | No stock count screen | Added (Section 15.5). |
| 2.4.15 | Basic created-by fields only | Added a Manager-visible activity log (Section 4.8). |
| 2.4.16 | Inventory Staff without Expenses | Inventory Staff can record expenses (own entries only) (Section 17). |
| 2.4.17 | Incident and maintenance reporting limited to module roles | Every staff role can report an issue (Sections 18 and 19). |
| 2.4.18 | Table status handled by staff manually | Tables return to Available only after a cleaner completes the table-clean task (Section 8.2). |
| 2.4.19 | Reports without definitions, no day close | Defined net sales, business day, end-of-day summary (Section 22). |
| 2.4.20 | CSV/PDF "where practical" | CSV for data reports; PDF for invoices, credit notes and the end-of-day summary only (Section 22.1). |
| 2.4.21 | Purchase statuses Draft to Completed | Added Partially Received, Rejected, Cancelled, Closed (Section 16.2). |
| 2.4.22 | Six-phase delivery plan | Three delivery stages (Section 25). |

## 2.5 Assumptions and Dependencies

2.5.1 [D] Currency is Ethiopian Birr (ETB), taken from the SRS default. The timezone is Africa/Addis_Ababa.
2.5.2 The system is used on modern browsers and on tablet, desktop and phone screens (Section 23.4).
2.5.3 Staff have reliable devices and network access at their stations.
2.5.4 The hosting platform is undecided. This PRD states capabilities, not a vendor (Section 23.8).
2.5.5 Legal sufficiency of the system-generated tax invoice is not yet confirmed (Section 26.1).

---

# Section 3. Users, Roles and Access

## 3.1 Roles

3.1.1 [C] The system has exactly seven roles:

| Role | Purpose | Primary device |
|---|---|---|
| Administrator | Manages user accounts only | Desktop |
| Manager | Owns all operations, reports, settings and employees. The restaurant owner uses this role. | Desktop |
| Kitchen | Prepares tickets. Replaces the SRS Chef and Kitchen Staff roles. | Tablet |
| Waiter | Takes orders, serves, and records payments | Tablet |
| Inventory Staff | Handles stock, suppliers, purchases and own expenses | Desktop |
| Cleaner | Performs cleaning tasks | Phone |
| Security | Records visitors, incidents and lost items | Phone |

3.1.2 [C] A user has exactly one role. Multiple Manager accounts and multiple Administrator accounts are allowed.

3.1.3 [C] There is no separate Owner role and no Cashier role.

## 3.2 Access Summary by Role

3.2.1 **Administrator** [C]: create and edit user accounts, assign roles, activate and deactivate users, reset passwords, unlock accounts. No access to orders, inventory, sales, reports or employee records.

3.2.2 **Manager** [C]: everything operational, including employees, settings (including tax rate and service charge), menu, prices, tables, orders (may act as a waiter), discounts, credit notes, purchase approval, expenses, cleaning, incident resolution, maintenance, customers, reservations, reports, dashboard, activity log, day reopening, and back-entry permission.

3.2.3 **Kitchen** [C]: kitchen queue, ticket actions, menu availability toggle, recipe editing, and read-only inventory view [D].

3.2.4 **Waiter** [C]: sees all tables and orders but edits only the orders they opened. Creates orders and takeaway orders, adds items, cancels items before preparation starts, marks tickets Served, records payment and issues the invoice for their own orders, and marks tables Available. Views customers. Creates and edits reservations [D].

3.2.5 **Inventory Staff** [C]: inventory items, stock operations, stock counts, suppliers, purchase requests, receiving, emergency purchases, and their own expense entries.

3.2.6 **Cleaner** [S]: assigned tasks and the table-clean queue, start and complete tasks, notes, report an issue.

3.2.7 **Security** [C]: visitor register, incident recording and moving incidents to Under Review, lost and found.

3.2.8 [C] Every role can: report an issue (incident or maintenance), see notifications, view their own profile, and change their own password.

## 3.3 Permission Matrix

Legend: **F** full access, **O** own records only, **R** read-only, **L** limited (see note), **—** no access.

| Capability | Admin | Manager | Kitchen | Waiter | Inventory | Cleaner | Security |
|---|---|---|---|---|---|---|---|
| Users, roles, password reset, unlock | F | — | — | — | — | — | — |
| Own profile and password | F | F | F | F | F | F | F |
| Employees | — | F | — | — | — | — | — |
| Settings (general) | — | F | — | — | — | — | — |
| Tax rate and service charge | — | F | — | — | — | — | — |
| Inventory tracking switch | — | F | — | — | — | — | — |
| Menu categories, items, variants, add-ons | — | F | R | R | — | — | — |
| Menu prices and scheduled price changes | — | F | — | — | — | — | — |
| Menu availability toggle | — | F | F | — | — | — | — |
| Recipes | — | F | F | — | R | — | — |
| Tables setup | — | F | — | R | — | — | — |
| Orders: view all | — | F | L (tickets) | R | — | — | — |
| Orders: create, edit, send tickets | — | F | — | O | — | — | — |
| Cancel a sent item while ticket is Submitted | — | F | — | O | — | — | — |
| Cancel a sent item after preparation starts | — | F | — | — | — | — | — |
| Reject an item on a Submitted ticket (out of stock) | — | — | F | — | — | — | — |
| Kitchen ticket actions (Preparing, Ready) | — | R | F | — | — | — | — |
| Mark ticket Served | — | F | — | O | — | — | — |
| Apply discount | — | F | — | — | — | — | — |
| Record payment and issue invoice | — | F | — | O | — | — | — |
| Credit notes | — | F | — | — | — | — | — |
| Mark table Available | — | F (override) | — | F | — | — | — |
| Reassign an open order to another waiter | — | F | — | — | — | — | — |
| Customers | — | F | — | R | — | — | — |
| Reservations | — | F | — | F | — | — | — |
| Inventory items and stock operations | — | F | R | — | F | — | — |
| Suppliers | — | F | — | — | F | — | — |
| Purchase requests, receiving, emergency purchases | — | F | — | — | F | — | — |
| Purchase approval | — | F | — | — | — | — | — |
| Expenses | — | F | — | — | O (add, view own) | — | — |
| Cleaning: manage templates and tasks | — | F | — | — | — | O (assigned and queue) | — |
| Visitors | — | F | — | — | — | — | F |
| Incidents | — | F (resolve) | — | — | — | — | L (record, view all, Under Review) |
| Lost and found | — | F | — | — | — | — | F |
| Assets and maintenance management | — | F | — | — | — | — | — |
| Report an issue (incident or maintenance) | F | F | F | F | F | F | F |
| Reports and dashboard | — | F | — | — | — | — | — |
| Activity log | — | F | — | — | — | — | — |
| Day close reopen, back-entry permission | — | F | — | — | — | — | — |
| Notifications (own) | F | F | F | F | F | F | F |

3.3.1 [D] The matrix is enforced on the server, not only in the interface.

3.3.2 [D] Inventory read-only access for Kitchen and recipe read-only access for Inventory Staff are defaults.

## 3.4 Login Landing Screens [C]

3.4.1 Manager: the dashboard (Section 21.2). Administrator: a users and system page. Every other role: its main work screen (Waiter: Tables; Kitchen: kitchen queue; Inventory Staff: inventory list; Cleaner: My Tasks; Security: visitor register).

## 3.5 Navigation Menus [S]

3.5.1 Each role sees only its own navigation. The menus are:

| Role | Menu |
|---|---|
| Administrator | Users, Profile |
| Manager | Dashboard, Orders, Tables, Menu, Recipes, Customers, Reservations, Inventory, Suppliers, Purchases, Expenses, Cleaning, Maintenance, Security, Employees, Reports, Activity Log, Settings, Notifications, Profile |
| Kitchen | Kitchen Queue, Menu Availability, Recipes, Inventory (read-only), Notifications, Profile |
| Waiter | Tables, Orders, Customers, Reservations, Notifications, Profile |
| Inventory Staff | Inventory, Suppliers, Purchases, Expenses, Notifications, Profile |
| Cleaner | My Tasks, Table Queue, Notifications, Profile |
| Security | Visitors, Incidents, Lost and Found, Notifications, Profile |

3.5.2 [C] "Report an issue" is available to every role from the profile menu.

---

# Section 4. Global Rules and Definitions

## 4.1 Business Day [C]

4.1.1 The system uses a **business day**, not a calendar day. Each business day ends at a closing time set in Settings (default 04:00 [D]). Sales after midnight and before the closing time belong to the previous business day.

4.1.2 An invoice's **business date** is the business day in which its payment time falls. Sales, tax, service charge, credit-note and payment-method totals in reports use this business date.

4.1.3 An order's **order-number date** is the business day in which the order was created. Order numbers reset for each order-number date (Section 4.4).

4.1.4 Orders still open at the closing time stay open. Their payments belong to the business day in which they are paid.

4.1.5 The business day closes **automatically** at the closing time and its end-of-day summary is generated then (Section 22.6).

4.1.6 A closed business day is **locked**: no payment, invoice or credit note can be dated to it. Corrections made later, such as a credit note, are dated to the next open business day.

4.1.7 The Manager can **reopen** a closed day. [D] Only the most recently closed day can be reopened. Reopening is logged. A reopened day closes again at the next closing time or when the Manager closes it manually.

4.1.8 "Today" on the dashboard and in reports means the current business day.

## 4.2 Time, Date and Currency

4.2.1 [D] Timezone: Africa/Addis_Ababa. Dates use the Gregorian calendar only [C]. All stored timestamps are in UTC and displayed in the local timezone.

4.2.2 [S] Currency: ETB, shown with two decimals and a thousands separator.

4.2.3 [D] Rounding: amounts are rounded to two decimals, half up, at the order level. Tax is rounded once per invoice.

4.2.4 The interface language is English only [C].

## 4.3 Money Calculation

4.3.1 The billing calculation is defined once in Section 11.1 and applies everywhere in the system, including reports.

## 4.4 Numbering [C]

4.4.1 **Order numbers** reset at each business day (for example 0001, 0002, ...). An order is uniquely identified by its order-number date plus its number. The prefix and digit count are set in Settings.

4.4.2 **Invoice numbers** are continuous, are never reset, and are never reused. Gaps are not allowed. Invoices cannot be deleted.

4.4.3 **Credit note numbers** form their own continuous sequence with the same rules.

4.4.4 [D] Ticket numbers are shown as order number plus a round suffix (for example 0042-2).

4.4.5 Number generation must be safe when two users act at the same moment.

## 4.5 Timestamps and Back-Entry [C]

4.5.1 Every operational record that represents an event (order, ticket status change, payment, stock movement, cleaning completion, and similar) stores two times: **happened at** and **entered at**. Normally they are equal.

4.5.2 Only a user holding **back-entry permission** may set *happened at* earlier than *entered at*. A Manager always has it. [D] A Manager may grant it to another user for a limited period (default 12 hours). Every use is written to the activity log.

4.5.3 [D] A back-entered payment or invoice whose *happened at* falls inside a locked business day is not accepted until the Manager reopens that day (4.1.7). If that day cannot be reopened, the record is dated to the next open business day and the original time is kept in its notes.

4.5.4 Back-entry exists to support the paper fallback after outages (Section 23.2).

## 4.6 Deletion and Retention

4.6.1 [C] Nothing referenced by a financial or stock record is ever hard-deleted. It is deactivated or archived instead. This covers orders, tickets, invoices, credit notes, payments, stock movements, waste records, purchases, receipts, expenses, users, employees, customers, incidents, and menu items or recipes used in past orders.

4.6.2 [C] The Manager can delete **non-financial** records: visitors, lost and found items, and [D] cancelled or no-show reservations, cleaning tasks and templates, and maintenance requests without a cost.

4.6.3 [D] Incidents and customers are archive-only. Draft orders that were never sent are discarded at business-day close.

4.6.4 [C] Every deletion is written to the activity log.

4.6.5 [D] There is no automatic purging. Data is retained indefinitely.

## 4.7 Files and Attachments

4.7.1 [D] Images (menu, employee photo, logo, cleaning notes, incident photos, receipt photos): JPG, PNG or WEBP, up to 5 MB each. Purchase invoice attachments may also be PDF.

4.7.2 [D] Files are validated by type and size on the server. All uploads are optional unless a section says otherwise.

## 4.8 Activity Log [C]

4.8.1 The system keeps a log of sensitive actions, visible to the Manager only.

4.8.2 The log records at least: discounts; item and order cancellations; credit notes; price changes (including scheduled ones); stock adjustments and stock counts above the variance threshold; sign-ins (success, failure, lockout); use of back-entry; day close and reopen; deletions; user creation, role changes, deactivation and password resets; changes to tax rate, service charge and other settings; expense edits; emergency purchases; order reassignment; and Manager overrides of table availability.

4.8.3 Each entry stores who, when, what action, which record, the old and new value where relevant, and the reason where one was entered. Entries cannot be edited or deleted.

4.8.4 Basic creator and created-date fields are also stored on all important records [S].

## 4.9 Scheduled Jobs

4.9.1 The system shall run these jobs in the local timezone and shall catch up if it was briefly unavailable:

| Job | Section |
|---|---|
| Automatic business-day close and end-of-day summary | 4.1, 22.6 |
| Reservation no-show release | 13.4 |
| Reservation reminder notification | 13.7 |
| Recurring cleaning task generation | 14.2 |
| Overdue cleaning detection | 14.5 |
| Recurring expense entry generation | 17.3 |
| Warranty-expiry alerts | 18.4 |
| Preventive maintenance request generation | 18.5 |
| Delayed kitchen order detection | 10.3 |
| Discarding unsent draft orders at day close | 4.6.3 |

## 4.10 Real-Time Updates [C]

4.10.1 Kitchen tickets, ticket status changes and notifications shall appear on other users' screens without a manual refresh, normally within three seconds [D].

4.10.2 The mechanism is an implementation choice (Section 23.8).

## 4.11 Business Rules

These consolidate and update the SRS rules. Details are in the referenced sections.

| # | Rule | Ref |
|---|---|---|
| 4.11.1 | A table cannot have two active dine-in orders at the same time, except one merged group order across several tables. | 8.2, 13.5 |
| 4.11.2 | An order needs at least one item before it can be sent to the kitchen. | 9.3 |
| 4.11.3 | A table with an active dine-in order is Occupied. | 8.2 |
| 4.11.4 | An order becomes Completed only when every active ticket is Served and its invoice is paid. | 9.5 |
| 4.11.5 | A cancelled order cannot return to an active status. | 9.7 |
| 4.11.6 | Inactive menu items cannot be added to orders. | 7.7 |
| 4.11.7 | Unavailable menu items (any of the four availability checks failing) cannot be added to orders. | 7.7 |
| 4.11.8 | Every stock movement stores the user, date and reason. | 15.4 |
| 4.11.9 | A table cannot be assigned to overlapping reservations. | 13.2 |
| 4.11.10 | A deactivated user cannot sign in or create records. | 6.7 |
| 4.11.11 | A paid order cannot be edited. Corrections use credit notes. | 11.7 |
| 4.11.12 | Manual stock issues cannot make stock negative without Manager permission. Automatic deduction may, and raises an alert. | 15.6 |
| 4.11.13 | A cleaning task needs an assigned cleaner, except table-clean tasks, which start unassigned in a shared queue. | 14.3 |
| 4.11.14 | A maintenance request references an asset or is explicitly marked "no asset". | 18.2 |
| 4.11.15 | Important records store their creator and creation date. | 4.8.4 |

---

# Section 5. Settings

## 5.1 Access [C]

5.1.1 Only the Manager can view and change Settings. The Administrator has no Settings access. Every change to tax rate, service charge and other listed settings is written to the activity log.

## 5.2 Restaurant Profile [S]

5.2.1 Restaurant name, logo, address, phone, email, and **tax ID (TIN)**, which is required before an invoice can be issued. Invoice footer text.

## 5.3 Payment Methods [C]

5.3.1 Default methods: Cash, Bank Transfer, Mobile Money, Card (recorded only; no terminal integration).

5.3.2 Each method has a flag "reference number required". Bank Transfer and Mobile Money: required. Cash and Card: optional.

5.3.3 [D] The Manager may add or deactivate methods. A new method defaults to "reference optional".

## 5.4 Tax and Service Charge [C]

5.4.1 Tax rate (%) and service charge (%) are set by the Manager only.

5.4.2 Changes apply to new invoices only. Each invoice stores the rates used.

## 5.5 Business Day [C]

5.5.1 Closing time (default 04:00 [D]). Rules in Section 4.1.

## 5.6 Numbering Format [S]

5.6.1 Order number prefix and digit count. [D] Invoice and credit note prefixes. Numbering rules are in Section 4.4.

## 5.7 Operational Settings [D]

| Setting | Default | Used in |
|---|---|---|
| Reservation duration | 90 minutes | 13.2 |
| No-show grace period | 15 minutes | 13.4 |
| Reservation reminder lead time | 30 minutes | 13.7 |
| Delayed kitchen order threshold (one global value [C]) | 20 minutes | 10.3 |
| Warranty alert lead time | 30 days | 18.4 |
| Stock count variance threshold | 10% | 15.5 |
| Notification retention | 30 days | 20.1 |

## 5.8 Inventory Tracking Switch [C]

5.8.1 A single on/off setting, **off at first go-live**. Behaviour and readiness checklist are in Section 15.1.

## 5.9 Managed Lists [S]

5.9.1 The Manager maintains these lists: inventory categories, expense categories, employee positions and departments, cleaning areas, incident types, asset categories, waste reasons, meal periods, table sections.

5.9.2 [D] Starting expense categories: Rent, Utilities, Cleaning supplies, Transportation, Office, Maintenance, Other. "Emergency purchase" is **not** an expense category (Section 16.5).

5.9.3 [D] Starting waste reasons: Spoiled, Expired, Dropped or damaged, Overcooked or wrong order, Cancelled after preparation, Other.

## 5.10 Fixed Values (not configurable)

5.10.1 [C] Session timeout 30 minutes. Password minimum 8 characters. Lockout after 5 failed sign-ins for 15 minutes. Currency ETB. Language English. Calendar Gregorian.

---

# Section 6. Employees and User Accounts

## 6.1 Employee Records [S]

6.1.1 The Manager creates, edits, views, searches, filters (department, position, status) and deactivates employee records. [C] Only the Manager manages employees.

6.1.2 Fields: full name, employee number, phone, email (optional), address (optional), position, department, hire date, employment status (Active or Inactive), emergency contact name and phone (optional), notes, profile photo (optional).

## 6.2 Employees and Users [C]

6.2.1 An employee record can exist **without** a user account. Not every employee needs a login.

6.2.2 A user account may be linked to one employee. [D] Administrator accounts may be unlinked.

6.2.3 [D] Deactivating an employee automatically deactivates their linked user account.

6.2.4 [C] Onboarding takes two steps: the Manager creates the employee record; the Administrator creates the login and links it.

## 6.3 User Accounts [C]

6.3.1 The Administrator creates, edits, activates, deactivates and assigns a role to user accounts.

6.3.2 Fields: username (unique, required), email (optional), full name, role, status, linked employee (optional), last sign-in, must-change-password flag.

6.3.3 The Administrator sees and manages only this module and their own profile.

## 6.4 Authentication [C]

6.4.1 Users sign in with **username or email plus password**.

6.4.2 There is no self-service password reset. The Administrator resets a forgotten password by issuing a temporary password, shown once. [D] The user must change it at next sign-in. The same forced change applies at first sign-in.

6.4.3 Sign-in errors do not reveal whether the username exists.

## 6.5 Password and Lockout Policy [C]

6.5.1 Minimum 8 characters. No complexity rules and no expiry.

6.5.2 After 5 failed attempts the account locks for 15 minutes. The Administrator can unlock it earlier. Lock and unlock events are logged.

## 6.6 Sessions [C]

6.6.1 Every session ends after **30 minutes of inactivity**, for every role including Kitchen. There are no exemptions.

6.6.2 [D] To reduce the impact, a warning appears 2 minutes before expiry with a one-tap "Stay signed in" button, and signing back in returns the user to the screen they were on (for Kitchen, the live queue).

## 6.7 Guardrails

6.7.1 [D] The last active Administrator cannot be deactivated or have their role changed.
6.7.2 [D] A user cannot deactivate their own account.
6.7.3 [S] A deactivated user cannot sign in or create records, and their active sessions end.
6.7.4 [D] The Administrator cannot change a user's role to one that would leave no active Administrator.

## 6.8 Out of Scope

6.8.1 Payroll, attendance, shifts, rosters, and performance reviews (Section 2.2.1).

---

# Section 7. Menu and Recipes

## 7.1 Categories [S]

7.1.1 The Manager creates, edits, orders and deactivates menu categories (for example Breakfast, Main Dishes, Drinks, Desserts). There is no routing by category (Section 2.2.2.11).

## 7.2 Menu Items [S]

7.2.1 The Manager creates, edits, deactivates and searches menu items.

7.2.2 Fields: name (English only [C]), category, description (optional), image (optional), base selling price (**tax-inclusive** [C]), status (Active or Inactive), manual availability (Available or Unavailable), fasting tag, meal periods, variants, add-ons, recipe.

7.2.3 [D] All items are taxed at the single configured rate. There are no tax-exempt items.

## 7.3 Fasting Tag [C]

7.3.1 Every item is tagged **Fasting** or **Non-fasting** [D required]. The tag is shown in the menu and on order screens and can be used as a filter.

## 7.4 Variants [C]

7.4.1 An item may have variants (for example Small, Regular, Large). Each variant has a name, its own **selling price** [D], and a **recipe multiplier** (for example 0.75, 1.0, 1.5) applied to every line of the base recipe.

7.4.2 If an item has variants, one must be chosen when adding it to an order, and one is marked as the default.

7.4.3 A variant cannot swap an ingredient. Use a separate menu item (Section 2.2.3.1).

## 7.5 Add-ons [C]

7.5.1 An add-on has a name, a price added to the item, and its own ingredient lines (inventory item and quantity in the base unit).

7.5.2 Add-ons are attached to menu items. Several add-ons may be selected on one order line, each with a quantity [D].

7.5.3 Add-ons can only add ingredients, never remove them.

## 7.6 Meal Periods [C]

7.6.1 Meal periods (for example Breakfast 06:00 to 11:00) are defined once in Settings. An item may be tied to one or more meal periods or to "All day" (default).

7.6.2 Outside its meal period an item cannot be added to new orders. Tickets already sent are unaffected.

7.6.3 Meal periods limit **availability only**. They do not change prices (Section 2.2.2.4).

## 7.7 Availability Rule [C]

7.7.1 A menu item can be added to an order **only if all four checks pass**:
1. The item is Active.
2. Its manual availability is Available (the Manager or Kitchen can toggle it).
3. It is in stock (Section 7.7.3).
4. The current time is within its meal period.

7.7.2 The order screen shows the reason when an item is blocked (for example "Out of stock", "Breakfast only", "Marked unavailable").

7.7.3 In stock (only when inventory tracking is on): every ingredient the item needs has at least the quantity for **one portion** [D], including the selected variant multiplier. An add-on is unavailable if its own ingredients are short.

7.7.4 The manual toggle and the automatic stock flag are independent. Restocking never overrides a manual "Unavailable".

7.7.5 Availability changes affect new orders only. Existing tickets are unaffected.

## 7.8 Price Changes [C]

7.8.1 Only the Manager changes prices. A change takes effect immediately or on a **future effective date** chosen by the Manager.

7.8.2 Price history is kept. Every price change is logged.

7.8.3 An order line stores the price in force at the moment the item was added. Later price changes never alter existing orders or invoices.

7.8.4 The effective date needs no background job: the price in force is determined by date.

## 7.9 Recipes [C]

7.9.1 A recipe has ingredient lines (inventory item and quantity in that item's base unit) and optional preparation instructions.

7.9.2 Packaged items (for example bottled drinks) use a recipe with one line: one unit of the stock item.

7.9.3 Recipe quantities always use the item's base unit. There is no separate recipe unit (Section 2.2.3.6).

7.9.4 The **Manager and the Kitchen** can create and edit recipes. Inventory Staff can view them [D]. Recipe edits are logged [D].

7.9.5 A recipe change affects only future deductions. Stock already deducted is not recalculated.

7.9.6 **While inventory tracking is off**, recipes are optional and menu items can be activated without one. **When tracking is on**, a menu item cannot be activated without at least one ingredient line (Section 15.1).

## 7.10 Import [C]

7.10.1 Menu items can be loaded by CSV in Stage 1, and recipes in Stage 2 (Section 23.9).

## 7.11 Exclusions

7.11.1 Combos, promotions, time-varying prices, bilingual names, and ingredient substitution (Section 2.2).

---

# Section 8. Tables

## 8.1 Table Records [S]

8.1.1 The Manager creates, edits and deactivates tables. Fields: table number or name, seat count, section (from Settings), status.

## 8.2 Statuses and Transitions

8.2.1 Statuses: **Available, Occupied, Reserved, Cleaning, Out of Service** [S].

8.2.2 Transitions:

| From | To | Trigger |
|---|---|---|
| Available | Occupied | A dine-in order is opened on the table |
| Occupied | Cleaning | The order's invoice is paid [C] |
| Occupied | Available | [D] The whole order is cancelled and no item was prepared or served |
| Occupied | Cleaning | [D] The whole order is cancelled after any item was prepared or served |
| Cleaning | (ready to reopen) | A cleaner completes the table-clean task (Section 14.6) |
| Cleaning | Available | The waiter marks the table Available. This is allowed **only after** the cleaner completes the task; the Manager can override [C] |
| Available | Reserved | The table has an active reservation on the current business day (Section 13.3) |
| Reserved | Occupied | The reservation is marked Arrived and its order opens (Section 13.5) |
| Reserved | Available | The reservation is cancelled, marked No Show, or completed and no other active reservation exists that day |
| Any | Out of Service | The Manager sets it, and back to Available when restored |

8.2.3 [C] A table that has an active reservation on the current business day cannot be used for walk-in orders that day, and there is no Manager override.

8.2.4 [D] After cleaning, a table with a further active reservation that day returns to Reserved, not Available.

8.2.5 Until Stage 3 (reservations), no table enters the Reserved status.

## 8.3 Operations

8.3.1 Waiters and the Manager can view all tables and open a dine-in order on any table that is Available.

8.3.2 **Move an order to another table** [C]: the owning Waiter or the Manager can move an open order to a table that is Available and not blocked by a reservation. [D] The old table becomes Cleaning and the new one Occupied. Merging tables and splitting bills outside group reservations are out of scope [C].

8.3.3 The Manager can mark a table Out of Service and restore it.

## 8.4 Table Screen

8.4.1 [S][D] A simple visual grid grouped by section, with no drag-and-drop layout editor. Each card shows number, seats, status, the current order and its waiter, and any reservation for today.

## 8.5 Order Ownership [C]

8.5.1 There are **no fixed waiter-to-table assignments**. A waiter owns the orders they open.

8.5.2 All waiters see all tables and orders but can change only their own. Only the Manager can reassign an open order to another waiter (logged).

## 8.6 Group Merge

8.6.1 Merging is allowed **only** for group reservations and is defined in Section 13.5.

---

# Section 9. Orders

## 9.1 Order Types [C]

9.1.1 Two types: **Dine-in** (tied to a table) and **Takeaway** (no table). Delivery and online orders are out of scope.

## 9.2 Order Record

9.2.1 Fields: order number and order-number date (Section 4.4), type, table (or tables for a merged group order), owning waiter (the user who opened it, which may be a Manager), customer (Section 12), guest count (optional [D]), notes, tickets, status, totals, invoice link, created and entered times (Section 4.5).

## 9.3 Creating and Sending an Order

9.3.1 The waiter (or Manager) opens an order on an Available table, or starts a takeaway order.

9.3.2 The waiter adds menu items with variant, add-ons, quantity and an item note. Only items passing the four availability checks (Section 7.7) can be added. Each line stores the price in force at that moment.

9.3.3 A new order is a **Draft**. Unsent items can be edited freely.

9.3.4 Sending requires at least one item [S]. Sending creates a ticket (Section 9.4).

9.3.5 [D] A Draft that was never sent is discarded at business-day close.

## 9.4 Tickets (Rounds) [C]

9.4.1 The waiter can add more items to an order **at any time before payment**. Each batch sent to the kitchen becomes its own **ticket**.

9.4.2 A ticket holds the items of one batch and has its own status and status timestamps.

9.4.3 Adding items to an order that already has Served tickets is allowed. The order returns to Active (Section 9.5).

## 9.5 Statuses [D]

9.5.1 **Ticket statuses**: Submitted, Preparing, Ready, Served, Cancelled. The kitchen moves a ticket Submitted to Preparing to Ready (Section 10). The owning waiter (or Manager) moves it Ready to Served [C].

9.5.2 **Order statuses are derived** from tickets:

| Order status | When |
|---|---|
| Draft | No ticket has been sent |
| Active | At least one non-cancelled ticket is not yet Served |
| Served | Every non-cancelled ticket is Served and the invoice is not yet paid |
| Completed | Every non-cancelled ticket is Served and the invoice is paid |
| Cancelled | The whole order was cancelled (Section 9.7) |

9.5.3 An order cannot be Completed until all its tickets are Served and its invoice is paid [S]. Payment can be recorded only when every non-cancelled ticket is Served [D]. For takeaway, "Served" means handed to the customer.

9.5.4 Dashboard counts of orders "preparing" or "ready" count tickets.

9.5.5 Every status change stores who and when. These timestamps drive delay detection (Section 10.3).

## 9.6 Changing Items After Sending [C]

9.6.1 While a ticket is **Submitted** (the kitchen has not started), the owning waiter or the Manager can cancel an item or reduce its quantity. A **reason is required**. The kitchen is notified.

9.6.2 Once a ticket is **Preparing, Ready or Served**, only the **Manager** can cancel an item, with a reason.

9.6.3 If the Manager cancels an item that was already prepared, the cancellation is recorded and the Manager **enters a waste record** manually (Section 15.7). No stock is deducted for cancelled items automatically.

9.6.4 [D] The Kitchen can **reject** an item on a Submitted ticket because it is out of stock. The item is treated as cancelled with reason "Out of stock", the owning waiter is notified, and the Kitchen can toggle the menu item unavailable.

9.6.5 Prices on order lines cannot be edited manually. Price is determined by Section 7.8.

## 9.7 Cancelling a Whole Order [D]

9.7.1 The owning waiter can cancel the whole order while no ticket has left Submitted. After that, only the Manager can cancel it. A reason is required and the cancellation is logged.

9.7.2 An order with a paid invoice cannot be cancelled. It is corrected with a credit note (Section 11.7).

9.7.3 A cancelled order cannot return to an active status [S].

## 9.8 Takeaway Orders [C]

9.8.1 A takeaway order needs no table. The customer's **phone number is required** [D] so the customer record can be created or matched (Section 12). The name is optional [D].

9.8.2 The order is sent to the kitchen **before payment**. The customer **pays at pickup**. Prepayment is out of scope.

9.8.3 Lifecycle: tickets Submitted, Preparing, Ready; the waiter marks Served on handover; payment is recorded; the order is Completed.

9.8.4 The service charge applies to takeaway orders (Section 11.3).

9.8.5 If the customer never collects the order, the Manager cancels it with a reason and records waste (Section 9.6.3). This cannot be prevented, only recorded.

## 9.9 Order Views [S]

9.9.1 The order list is searchable by order number, date, table, waiter, type and status, and filterable by status.

9.9.2 The order detail page shows items by ticket, the status timeline with timestamps, totals, customer, and the invoice.

9.9.3 [C] All waiters can view all orders. A waiter can edit only orders they own. The Manager can edit any order and reassign its owner.

## 9.10 Concurrency and Integrity [D]

9.10.1 Two users editing the same order must not silently overwrite each other. The later save is rejected with a clear message and the current data is shown.

9.10.2 Double-tapping Send must not create duplicate tickets.

9.10.3 A paid order and its invoice cannot be edited (Section 11.7).

---

# Section 10. Kitchen

## 10.1 Kitchen Screen [S][C]

10.1.1 One kitchen queue serves all items, including drinks and coffee. There are no stations and no category routing [C].

10.1.2 The screen shows tickets grouped by status: New (Submitted), Preparing, Ready. Served tickets from today can be viewed in a collapsed list.

10.1.3 Each ticket shows: ticket number, order number, table or "Takeaway", waiter, elapsed time, each item with variant, add-ons, quantity and item notes, and any cancelled or rejected items clearly marked.

## 10.2 Ticket Actions [C][D]

10.2.1 **Start preparing** (this is the SRS "accept" action; there is no separate accepted status), **Mark ready**, and **Reject item** (Section 9.6.4).

10.2.2 The Kitchen cannot mark a ticket Served.

10.2.3 The Manager can view the queue but does not act on it.

## 10.3 Delayed Tickets [C][D]

10.3.1 A ticket is **delayed** when it has stayed Submitted or Preparing longer than one global threshold from Settings (default 20 minutes). Per-category thresholds are out of scope [C].

10.3.2 Delayed tickets are highlighted on the kitchen screen and reported to the Manager on the dashboard and in notifications.

## 10.4 Real-Time and Sound [C]

10.4.1 New tickets appear without refresh. A **sound alert** plays on the Kitchen screen for each new ticket. The owning waiter gets a sound alert when a ticket becomes Ready. All other notifications are silent (Section 20).

10.4.2 [D] Browsers block sound until the page is tapped, so the screen shows an "Enable sound" prompt after every load or sign-in. The kitchen screen should request that the device screen stay awake.

## 10.5 Menu and Recipe Access [C]

10.5.1 The Kitchen can toggle a menu item's availability and edit recipes (Sections 7.7 and 7.9). It has read-only inventory access [D].

## 10.6 Limits

10.6.1 Tickets are on screen only (no printing). The session logs out after 30 minutes of inactivity (Section 6.6). If the screen or power fails, use the paper fallback (Section 23.2).

---

# Section 11. Billing, Payments and Invoices

## 11.1 Calculation [C]

11.1.1 Menu prices are **tax-inclusive**. For an order:

1. **Item subtotal** = sum of (unit price x quantity) for all non-cancelled items, including variant and add-on prices.
2. **Service charge** = service charge % x item subtotal. Calculated on the **full item subtotal before any discount**. Not taxed.
3. **Discount** = discount % x item subtotal (manager-applied, Section 11.2). It does not reduce the service charge.
4. **Total payable** = item subtotal - discount + service charge.
5. **Taxable amount** = item subtotal - discount.
6. **Tax portion** = taxable amount x rate / (1 + rate). Tax is extracted from the tax-inclusive taxable amount. The service charge carries no tax.
7. **Net sales** = taxable amount - tax portion.

11.1.2 Illustration only (rates are examples, not legal rates): item subtotal 1,000.00; service charge 10% = 100.00; discount 10% = 100.00; total payable = 1,000.00 - 100.00 + 100.00 = 1,000.00; taxable amount 900.00; tax at 15% = 900.00 x 0.15 / 1.15 = 117.39; net sales = 782.61.

11.1.3 For item, category and waiter reports, an order-level discount is spread across the order's items in proportion to their value (Section 22.2).

## 11.2 Discounts [C]

11.2.1 **Only the Manager** can apply a discount, as a **percentage** of the item subtotal. Fixed-amount, per-item and stacked discounts, and waiver by a waiter, are out of scope.

11.2.2 [D] A reason is required. The discount percentage is capped at 100%. It can be applied only before payment. It is logged.

11.2.3 A Manager must be signed in and open the order to apply a discount. A waiter cannot offer one alone.

## 11.3 Service Charge [C]

11.3.1 An automatic service charge percentage from Settings applies to **every dine-in and takeaway bill**.

11.3.2 It cannot be waived per bill [D]. It is not taxed. The percentage in force is stored on the invoice.

## 11.4 Recording Payment [C]

11.4.1 The **waiter who owns the order** (or a Manager) records payment. Payment is allowed only when every non-cancelled ticket is Served (Section 9.5.3).

11.4.2 Methods: Cash, Bank Transfer, Mobile Money, Card (recorded only). **One method per invoice** in the interface [D]. Payments are stored as separate rows so mixed payment could be added later without redesign.

11.4.3 A reference number is required for Bank Transfer and Mobile Money, and optional for Cash and Card [D]. The system does not verify payments with any bank or provider.

11.4.4 The payment stores amount, method, reference, who recorded it, and happened-at and entered-at times.

11.4.5 [D] Before payment, the waiter can show a non-final bill preview on screen. It has no invoice number and no PDF.

## 11.5 Official Tax Invoice [C]

11.5.1 Recording payment issues an **official tax invoice** as a PDF that staff can download. There is no printer integration.

11.5.2 Invoices are **immutable** once issued. They cannot be edited, voided, reissued or deleted.

11.5.3 Optional **buyer name and tax ID** can be entered by the waiter at billing.

11.5.4 The invoice number is continuous and never reset (Section 4.4.2).

11.5.5 The invoice language is English and its dates are Gregorian [C]. Whether that satisfies the client's legal requirements is an open item (Section 26.1).

## 11.6 Invoice Contents [D]

11.6.1 Restaurant name, address, phone, tax ID (TIN); invoice number; issue date and time; order number; table or "Takeaway"; waiter; each item with variant, add-ons, quantity, unit price and line total; item subtotal; discount (percent and amount); service charge (percent and amount); tax breakdown (rate, taxable amount, tax portion); total payable; payment method and reference; optional buyer name and tax ID; footer text from Settings.

## 11.7 Credit Notes [C]

11.7.1 A mistake after payment is corrected **only** by a credit note, issued by the **Manager**. Invoices are never voided.

11.7.2 A credit note is linked to the original invoice, has its own continuous number sequence, and is a PDF.

11.7.3 It can be **partial** (selected item lines or an amount) or **full** [D]. The total credited can never exceed the invoice. Tax is reversed in proportion to the credited item amount. [D] A proportional part of the service charge may be credited when items are credited.

11.7.4 A reason and a refund method are mandatory. The refund is only a record; no money moves through the system.

11.7.5 A credit note reduces sales in the business day it is issued, not the day of the original invoice (Section 4.1.6).

11.7.6 Stock is **not** restored by a credit note (Section 2.2.2.14).

## 11.8 After Payment

11.8.1 When the invoice is paid and all tickets are Served, the order becomes Completed. For dine-in, the table becomes Cleaning and a table-clean task is created (Section 14.6). For a merged group order, every table does.

## 11.9 Exclusions

11.9.1 See Section 2.2.2: payment gateways, cash counting, split bills, mixed-method payment, tips, waiter discounts, service charge waiver, tax exemptions, invoice voiding, fiscal-machine integration, and prepayment.

---

# Section 12. Customers

## 12.1 Customer Record [S][D]

12.1.1 Fields: name, phone (required, the matching key), email (optional), notes, created date. A customer record shows order history and reservations.

## 12.2 Creation [C]

12.2.1 Customer records are created **automatically** from reservations and takeaway orders, matched by **phone number**.

12.2.2 [D] Phone numbers are normalised so `09...` and `+251...` forms of the same number match. A second entry with the same phone reuses the existing record. If the stored name is empty it is filled in. Later name changes are made by the Manager.

12.2.3 Phone is required on reservations and takeaway orders and optional on dine-in orders. A waiter may attach an existing customer to a dine-in order. A dine-in order without a customer creates no record [C].

## 12.3 Access

12.3.1 Waiters can search and view customers and attach one to an order. The Manager can view and edit. Customers never sign in.

## 12.4 Exclusions [C]

12.4.1 Loyalty, marketing, blocklists, merging and deletion tools (Section 2.2). Customers are **archive-only**, never deleted [D].

12.4.2 Customer personal data must be handled per Section 23.10.

---

# Section 13. Reservations

*Delivered in Stage 3. Until then the Reserved table status is not used.*

## 13.1 Reservation Record [S]

13.1.1 Fields: customer (name and phone required), date, time, guest count, one or more tables, notes, status, created by.

13.1.2 Statuses: Pending, Confirmed, Arrived, Completed, Cancelled, No Show.

13.1.3 [D] The Manager and Waiters create and edit reservations. The Manager overrides No Show.

## 13.2 Duration and Overlap [C]

13.2.1 Every reservation holds its tables for **one fixed duration** set in Settings (default 90 minutes [D]). The duration cannot be edited per reservation.

13.2.2 A table cannot be assigned to overlapping reservation windows (start time to start time plus duration). The check applies to **every** table on the reservation and must be safe against two people booking at once.

13.2.3 The combined seats of the assigned tables must be at least the guest count.

## 13.3 Walk-In Blocking [C]

13.3.1 Any table with an **active reservation** (Pending, Confirmed or Arrived) on the current business day cannot be used for walk-in orders that day. There is **no Manager override**. Cancelling the reservation, or its No Show, Completed or release, frees the table.

13.3.2 Such tables show as Reserved. This can leave capacity unused (Section 2.3.17).

## 13.4 No-Show Release [C]

13.4.1 If a reservation is not marked Arrived within a grace period after its time (default 15 minutes [D]), a scheduled job marks it **No Show** and releases its tables. The Manager can override and restore it.

## 13.5 Arrival, Seating and Group Merge [C]

13.5.1 Staff mark a reservation **Arrived** and open the order for the reserved table.

13.5.2 For a **group reservation with more than one table**, the reserved tables are **merged into one order** with one invoice. All its tables are Occupied. Merging is allowed for group reservations only.

13.5.3 After payment, each merged table goes to Cleaning with its own table-clean task [D], and each is marked Available separately.

13.5.4 When the order is paid, the reservation becomes Completed.

## 13.6 Overstay [C]

13.6.1 If a party stays past the fixed duration, the table stays Occupied. If the next reservation is affected, the Manager receives a conflict warning. The booking is not extended.

## 13.7 Reminder [D]

13.7.1 An in-app notification goes to the Manager and Waiters a set time before a reservation (default 30 minutes).

## 13.8 Customer Link

13.8.1 A reservation creates or matches a customer record by phone (Section 12.2).

## 13.9 Exclusions [C]

13.9.1 Public online booking, deposits, waiting list, recurring reservations, SMS or email reminders, and editable duration (Section 2.2.4.1).

---

# Section 14. Cleaning

## 14.1 Areas [S]

14.1.1 Cleaning areas (for example Dining area, Kitchen, Restrooms, Storage, Entrance) are a managed list in Settings.

## 14.2 Task Types [C]

14.2.1 **Recurring templates** (Stage 3): area, task name, instructions, assigned cleaner, frequency (daily, or weekly on chosen days), due time. A scheduled job creates a task instance each period.

14.2.2 **One-off tasks**: created by the Manager with an area, description, assigned cleaner and due date and time.

14.2.3 **Table-clean tasks** are created automatically by the system (Section 14.6). They are available from Stage 1.

## 14.3 Assignment [C]

14.3.1 Every template and one-off task is assigned to a specific cleaner.

14.3.2 **Exception to SRS Rule 13**: table-clean tasks start **unassigned** in a shared queue. The first cleaner to start one becomes its assignee.

14.3.3 If a cleaner is deactivated or absent, their recurring tasks become unassigned and the Manager reassigns them.

## 14.4 Cleaner Actions [S]

14.4.1 The Cleaner sees assigned tasks and the table queue, starts a task, completes it with optional notes and an optional photo, and reports an issue. The Cleaner screen is designed for phones [C].

14.4.2 Photo proof is never mandatory.

## 14.5 Statuses [D]

14.5.1 Pending, In Progress, Completed. A task past its due time and not Completed is flagged **Overdue**. Overdue tasks notify the Manager and the assigned cleaner.

## 14.6 Table-Clean Tasks [C]

14.6.1 When a table enters Cleaning (Section 8.2), the system creates a "clean table" task in the shared queue and notifies cleaners silently.

14.6.2 When a cleaner completes it, the waiter can mark the table Available. The waiter **cannot** do so before completion. The Manager can override, which closes the task, and the override is logged.

14.6.3 Table turnover therefore depends on a cleaner being signed in and available (Section 2.3.19).

## 14.7 Manager Views [S]

14.7.1 The Manager sees tasks by status and cleaner, overdue tasks, and completion history.

## 14.8 Exclusions [C]

14.8.1 Shift rosters, rotation logic, mandatory photos, and inspection scoring (Section 2.2.4.2).

---

# Section 15. Inventory

*Delivered in Stage 2.*

## 15.1 Inventory Tracking Switch [C]

15.1.1 A Settings switch turns recipe-based stock control on or off. It is **off** when the module first ships, matching the staged go-live.

15.1.2 **While off**: recipes are optional, sales deduct no stock, menu items never become unavailable because of stock, and low-stock alerts and purchase suggestions are not reliable.

15.1.3 **Turning on** requires a readiness checklist: an opening stock count has been confirmed, every Active menu item has a recipe with at least one line, and every recipe ingredient has a base unit. The screen lists items still missing.

15.1.4 Turning it on is logged. Orders served while it was off are **not** backfilled (Section 2.2.3.7). [D] The Manager can switch it off again; deduction then pauses with no backfill.

## 15.2 Inventory Items [S][D]

15.2.1 Fields: name, category, **base (stock) unit**, current quantity, minimum quantity, reorder quantity, default supplier, suppliers with last price (Section 16.1), purchase unit and conversion factor (optional), notes, status.

15.2.2 Categories (managed list): for example Vegetables, Meat, Dairy, Dry goods, Beverages, Spices, Cleaning supplies, Packaging.

15.2.3 Quantities support decimals (three places) [D].

## 15.3 Units of Measure [C][D]

15.3.1 Each item has one **base unit**, ideally small (g, ml, pieces) so recipes use whole numbers (150 g, not 0.15 kg).

15.3.2 An item may also have a **purchase unit with a conversion factor** (for example 1 sack = 50,000 g). Receiving 2 sacks adds 100,000 g.

15.3.3 There is no separate recipe unit. Recipes use the base unit (Section 7.9.3).

15.3.4 A display-only nicety may show large amounts in kg or L. It does not change storage.

## 15.4 Stock Movements [S][C]

15.4.1 Every change to stock is a **movement**: purchase receipt, emergency purchase, issue, adjustment, waste, sale deduction, stock-count adjustment.

15.4.2 Each movement stores item, signed quantity, type, date and time, user, reason and a reference (for example order, receipt or count). Movements are immutable and never deleted. Corrections are new movements.

15.4.3 **Add stock** (receipt) comes from purchases (Section 16.4). **Issue** removes stock for use in the kitchen or elsewhere, with a destination note. **Adjust** corrects stock and needs a reason.

15.4.4 [C] Inventory Staff record adjustments with a reason. There is **no approval step**. The Manager reviews the activity log.

## 15.5 Stock Count [C]

15.5.1 A stock count screen lets Inventory Staff or the Manager choose a category (or all items), enter the counted quantity per item, and see the variance against expected stock.

15.5.2 Confirming creates adjustment movements with the reason "stock count". Variances above the Settings threshold (default 10% [D]) are flagged in the activity log.

15.5.3 Scheduled counts, blind counts and count approval are out of scope (Section 2.2.3.5).

## 15.6 Automatic Deduction [C]

15.6.1 **When a ticket item is marked Served** and tracking is on, the system deducts: recipe quantity x variant multiplier x item quantity, plus each selected add-on's ingredient quantity x add-on quantity.

15.6.2 Cancelled and rejected items are never deducted. Credit notes do not restore stock. A prepared-then-cancelled item is handled by a manual waste record (Section 9.6.3).

15.6.3 The recipe used is captured at the time of deduction so later recipe edits do not change history.

15.6.4 Automatic deduction **may make stock negative**. When it does, the Manager and Inventory Staff are notified. [S] A **manual** issue cannot make stock negative unless the Manager performs it with explicit confirmation.

15.6.5 Stock is deducted at Served, not at order time, so stock is not reserved when an order is placed (Section 2.3.8).

## 15.7 Waste [S][D]

15.7.1 A waste record stores item, quantity, reason (from Settings), date, and who recorded it. It automatically creates the matching stock movement, so there is one source of truth.

15.7.2 Inventory Staff and the Manager record waste, including waste for prepared items cancelled by the Manager.

## 15.8 Low Stock and Automatic Unavailability [C]

15.8.1 When quantity reaches or falls below the minimum, a dashboard alert and an in-app notification go to the Manager and Inventory Staff, with a **one-click draft purchase request** (Section 16.7).

15.8.2 When any ingredient of a menu item or add-on falls below what one portion needs, that item is flagged unavailable automatically (Section 7.7.3) and the Manager and Kitchen are notified.

## 15.9 Views [S]

15.9.1 Inventory list with search and filters (category, low stock, status); item detail with movement history.

15.9.2 Kitchen has read-only access [D]. Inventory reports are in Section 22.3.

## 15.10 Import [C]

15.10.1 Inventory items and recipes can be loaded by CSV in Stage 2 (Section 23.9). Suppliers and tables are entered manually.

## 15.11 Exclusions [C]

15.11.1 Batch or expiry tracking, valuation, recipe costing, stock reservation at order time, scheduled counts, approval workflows for adjustments, and multi-warehouse (Section 2.2.3).

---

# Section 16. Suppliers and Purchasing

*Delivered in Stage 2.*

## 16.1 Suppliers [S][C]

16.1.1 Fields: name, contact person, phone, email (optional), address (optional), notes, status. Inventory Staff and the Manager manage suppliers.

16.1.2 An inventory item can have **several suppliers**, each with its own **last price**. One is marked the default (or, if none is marked, the one with the lowest last price [D]). The last price updates on each receipt.

16.1.3 Supplier views show their items and purchase history.

## 16.2 Purchase Requests and Statuses [C]

16.2.1 Inventory Staff or the Manager creates a request: supplier, lines (inventory item, quantity in purchase unit or base unit, estimated unit price), notes, date.

16.2.2 Statuses: **Draft, Requested, Approved, Partially Received, Received, Completed**, plus **Rejected, Cancelled, Closed**.

| Transition | Who |
|---|---|
| Draft to Requested | Creator |
| Requested to Approved or Rejected (reason required) | Manager only |
| Approved to Partially Received or Received | Set by receiving deliveries (16.4) |
| Received to Completed | Inventory Staff or Manager after the final receipt |
| Cancelled | Creator before approval; Manager any time before the first receipt |
| Closed (closed short, reason required) | Manager, when a partly delivered order will never be completed |

## 16.3 Approval [C]

16.3.1 The **Manager approves every purchase request**. There is no auto-approval threshold.

## 16.4 Receiving [C]

16.4.1 A purchase can be received in **several deliveries**. It stays open until Completed or Closed.

16.4.2 Each delivery records received quantities per line, actual unit price, date, notes, and optionally a supplier invoice number and attachment [D]. Each delivery increases stock (converted to the base unit) and updates the supplier's last price. Price differences are kept.

16.4.3 The purchase becomes Partially Received after the first short delivery and Received when every line is fully received.

## 16.5 Emergency Purchases [C]

16.5.1 Inventory Staff or the Manager can record an urgent purchase **afterwards**, without prior approval.

16.5.2 It is a **purchase**, not an expense, with status **Emergency - Received**. It adds stock immediately, and it is flagged for **Manager review** on the dashboard and in the activity log until marked Reviewed [D]. The supplier may be free text if not in the list [D].

16.5.3 The SRS expense category "Emergency purchase" is removed so the same spend is not entered twice (Section 5.9.2).

16.5.4 The Manager cannot block it, only review it. Who paid for it (petty cash) is not tracked.

## 16.6 Purchases and Expenses Stay Separate [C]

16.6.1 A purchase does **not** create an expense. Reports show purchases, expenses and maintenance costs side by side and give no combined total or profit figure (Section 22.4).

16.6.2 Staff must not enter the same spend as both a purchase and an expense.

## 16.7 Draft From Low Stock [C][D]

16.7.1 From a low-stock alert, one click creates a **Draft** purchase request pre-filled with the item's default supplier, reorder quantity and last price. It still has to be submitted and approved normally.

## 16.8 Exclusions [C]

16.8.1 Supplier returns, invoice matching, supplier payments and balances, price comparison, auto supplier selection beyond the default rule (Section 2.2.3.8).

---

# Section 17. Expenses

*Delivered in Stage 3.*

## 17.1 Expense Record [S]

17.1.1 Fields: category, amount, date, description, receipt photo (**optional** [C]), recorded by, status.

17.1.2 Status: **Confirmed**, or **Pending confirmation** for auto-generated recurring entries [D].

## 17.2 Recording and Editing [C][D]

17.2.1 The Manager and Inventory Staff record expenses. Inventory Staff see only their own entries.

17.2.2 [D] Only the Manager can edit an expense after saving, and every edit is logged. Expenses are never deleted (Section 4.6.1).

## 17.3 Recurring Expenses [C]

17.3.1 The Manager creates **recurring expense templates** (for example rent, utilities): category, description, amount, period (monthly or weekly [D]), day.

17.3.2 A scheduled job creates an entry each period as **Pending confirmation** with the template amount [D]. The Manager confirms or edits the actual amount. Only Confirmed entries appear in reports.

## 17.4 Categories [D]

17.4.1 Managed in Settings. "Emergency purchase" is not a category.

## 17.5 Views [S]

17.5.1 List with search and filters (date, category, status), totals by range and category.

## 17.6 Exclusions [C]

17.6.1 Budgets, approval workflows, mandatory receipts, payroll, and automatic bill payments (Section 2.2.4.5).

---

# Section 18. Maintenance

*Delivered in Stage 3.*

## 18.1 Assets [S]

18.1.1 Fields: name, category, serial number (optional), purchase date, **warranty expiry date** (optional), location, status (Active, Under Maintenance, Out of Service, Retired [D]), notes. The Manager manages assets. Assets are retired, not deleted.

## 18.2 Maintenance Requests [C]

18.2.1 **Any staff member** can report a maintenance issue through the "Report an issue" form: asset (or "no asset" [S]), problem, priority, description, optional photo.

18.2.2 Only the **Manager** manages requests afterwards: assign, update status, record cost and notes.

18.2.3 Statuses: Reported, Assigned, In Progress, Completed [D].

## 18.3 Who Does the Work [C]

18.3.1 A request is assigned to an internal employee **or** an external vendor, whose name and phone are recorded as text (no vendor directory).

## 18.4 Warranty Alerts [C]

18.4.1 A scheduled job notifies the Manager a set number of days before an asset's warranty expires (default 30 days [D]).

## 18.5 Preventive Maintenance [C]

18.5.1 The Manager creates **recurring maintenance templates** (for example a monthly generator service): asset, task, frequency, assignee (employee or vendor). A scheduled job creates a request each period.

## 18.6 Costs [C]

18.6.1 A request can record a cost. Maintenance costs are separate from purchases and expenses and are reported side by side (Section 22.4).

## 18.7 Deletion

18.7.1 The Manager can delete maintenance requests **without a cost** [D]. Requests with a cost are archive-only.

## 18.8 Exclusions [C]

18.8.1 Contracts, spare-parts inventory, and a vendor directory (Section 2.2.4.3).

---

# Section 19. Security

*Delivered in Stage 3.*

## 19.1 Visitor Register [C]

19.1.1 Security records visitors: name, phone, purpose, person visited (an employee, or free text [D]), check-in time, check-out time, notes.

19.1.2 **Basic details only.** No ID number, photo or vehicle plate is stored (Section 2.2.4.4).

19.1.3 The Manager can view and delete visitor records [C].

## 19.2 Incidents [C]

19.2.1 Any staff member can report an incident through the "Report an issue" form. Security records incidents directly.

19.2.2 Fields: type (Settings list), date and time, location, description, reported by, people involved, optional photo, status, resolution notes.

19.2.3 Status flow: **Reported to Under Review to Resolved**. Security or the Manager can move a record to **Under Review**. Only the **Manager** can set **Resolved**, with resolution notes.

19.2.4 Security can view all incidents. Incidents are archive-only and never deleted [D].

## 19.3 Lost and Found [C]

19.3.1 Fields: item, description, location found, date found, found by, status.

19.3.2 Statuses: **Found** and **Claimed**. Marking Claimed records the claimant's name, phone and date. Security or the Manager may do this.

19.3.3 The Manager can delete lost-and-found records [C]. There is no disposal workflow or photo.

## 19.4 Privacy

19.4.1 Visitor, incident and lost-and-found data is visible only to Security and the Manager (and, for incidents, the reporter's own submission confirmation). Section 23.10 applies.

---

# Section 20. Notifications

## 20.1 General [C]

20.1.1 Notifications are **in-app only**: a bell icon with an unread count, a list, and read or unread state. Retention is 30 days [D].

20.1.2 Email, SMS, WhatsApp and push notifications are out of scope (Section 2.2.1.12).

20.1.3 Notifications reach only staff who have the application open (Section 2.3.22).

## 20.2 Sound Alerts [C]

20.2.1 Only two events make a sound: a **new kitchen ticket** (Kitchen screen) and a **ticket becoming Ready** (the owning waiter). Everything else is silent. Browser sound rules are in Section 10.4.2.

## 20.3 Events and Recipients [D]

| Event | Recipients |
|---|---|
| New kitchen ticket (sound) | Kitchen |
| Ticket Ready (sound) | Owning waiter |
| Item cancelled after sending | Kitchen |
| Item rejected by Kitchen | Owning waiter |
| Delayed kitchen ticket | Manager |
| Item automatically unavailable (stock) | Manager, Kitchen |
| Low stock | Manager, Inventory Staff |
| Stock went negative | Manager, Inventory Staff |
| Purchase request submitted | Manager |
| Purchase approved or rejected | Requester |
| Emergency purchase recorded | Manager |
| Table-clean task created | Cleaners (queue) |
| Cleaning task overdue | Manager, assigned cleaner |
| New maintenance request | Manager |
| Warranty expiring | Manager |
| New incident | Manager, Security |
| Reservation approaching | Manager, Waiters |
| Reservation auto-marked No Show | Manager |
| Recurring expense pending confirmation | Manager |
| Business day auto-closed | Manager |

---

# Section 21. Dashboard and Home Screens

## 21.1 Landing Screens [C]

21.1.1 See Section 3.4. Only the Manager has a dashboard. The Administrator has a users and system page. Other roles land on their main work screen. Role-tailored dashboards are out of scope.

## 21.2 Manager Dashboard [S][D]

21.2.1 Summary cards for the current business day: orders today, net sales today, open orders, tickets preparing, tickets ready, tables reserved today, low-stock items, pending purchase requests, pending cleaning tasks, open maintenance requests.

21.2.2 Alerts: delayed kitchen tickets, low stock, negative stock, overdue cleaning tasks, pending purchase requests, emergency purchases awaiting review, pending recurring expenses, open maintenance requests, unresolved incidents, expiring warranties.

21.2.3 Quick actions link to the relevant module. Cards for modules not yet delivered are hidden until their stage (Section 25).

## 21.3 Administrator Page [C]

21.3.1 User list with status, role and last sign-in, and quick actions for creating a user, resetting a password and unlocking an account. No operational data.

---

# Section 22. Reports and Business-Day Close

## 22.1 General Rules [C]

22.1.1 Reports are visible to the **Manager only**. They filter by date range (business dates), and by other filters listed per report.

22.1.2 **CSV export** is available for every data report.

22.1.3 **PDF** export exists only for invoices, credit notes and the end-of-day summary.

## 22.2 Sales and Orders (Stage 1) [C]

22.2.1 Definitions:
- **Net sales** = item subtotal - discount - tax portion (Section 11.1).
- **Tax collected** = the tax portion.
- **Service charge** = shown separately.
- **Total collected** = amounts customers paid.
- **Credit notes** reduce net sales and tax in the business day they are **issued**.
- **Cancelled orders** are excluded.
- The business date of a sale is the payment day (Section 4.1.2).

22.2.2 Reports: orders by day and range (count, by type, by status); sales by day; sales by menu item; sales by category; sales by waiter (Manager-taken orders appear as that Manager); sales by payment method; discounts; cancellations with reasons.

22.2.3 An order-level discount is allocated to items in proportion to their value for item and category reports.

22.2.4 The sales reports show tax collected by day and range. There is no dedicated tax-filing report (Section 2.2.2.8).

## 22.3 Inventory Reports (Stage 2) [S]

22.3.1 Current stock, low stock, stock movements (filter by item, type, date), and waste.

## 22.4 Purchases, Expenses and Maintenance Costs (Stages 2 and 3) [C]

22.4.1 Expense reports by category and date (Confirmed entries only). Purchase reports by supplier and date. Maintenance costs by asset and date.

22.4.2 The three cost types are shown **side by side in separate sections**. The system does not add them together and shows no gross profit, margin or profit-and-loss figure.

## 22.5 Staff and Operations Reports (Stage 3) [S]

22.5.1 Employee list, orders handled by waiter, cleaning completion, maintenance activity, reservations.

## 22.6 End-of-Day Summary [C]

22.6.1 Generated **automatically** when a business day closes and available as a **PDF** for any closed day.

22.6.2 Contents: business date; count of completed and cancelled orders; net sales; tax collected; service charge; total collected; totals **by payment method**; credit notes issued (count and amount); cancellations (count with reasons); discounts total; orders still open and carried over [D].

22.6.3 There is no cash counting, till reconciliation or shift handover (Section 2.2.2.2).

## 22.7 Exclusions [C]

22.7.1 Tax-filing report, ingredient-consumption-versus-purchases, peak hours, top and bottom sellers, profit and loss, PDF versions of other reports, and scheduled or emailed reports (Section 2.2.5).

---

# Section 23. Non-Functional Requirements

## 23.1 Capacity and Performance

23.1.1 [C] Support **15 to 40 concurrent users** at peak; design and test for 40.

23.1.2 [D] Typical page loads within 2 seconds. Kitchen tickets and status changes appear on other screens within 3 seconds. Lists are paginated (25 or 50 rows) with search.

## 23.2 Outages and Paper Fallback [C]

23.2.1 There is no offline mode. During an internet or power outage the restaurant works on paper (order slips, an invoice book).

23.2.2 Afterwards, staff **back-enter** records with the actual time. Only a user holding back-entry permission can set a past time (Section 4.5). Each use is logged.

23.2.3 [D] A back-entered record dated into a locked day follows Section 4.5.3.

23.2.4 A written paper fallback procedure must be produced and rehearsed with the client before go-live. Whether paper invoices are legally acceptable, and how invoice numbering behaves when paper and system invoices coexist, is an open item (Section 26.1).

## 23.3 Security

23.3.1 Passwords are stored with a modern one-way hash. All traffic uses HTTPS.

23.3.2 Access rules (Section 3.3) are enforced on the server. Database access uses authenticated users only [S].

23.3.3 Input is validated on the server. Uploaded files are validated by type and size.

23.3.4 Sign-in lockout, session timeout and the activity log apply as defined in Sections 6.5, 6.6 and 4.8.

## 23.4 Devices and Browsers [C]

23.4.1 **Tablets**: Waiter and Kitchen. **Desktop**: Manager, Administrator, Inventory Staff. **Phones**: Cleaner and Security. The other screens work on all sizes but are not optimised (Section 2.2.1.17).

23.4.2 [D] Supported browsers are the latest two versions of Chrome, Edge, Safari and Firefox. Native apps are out of scope.

23.4.3 Touch targets are large enough for tablet use. Tablets may keep the screen awake and need a tap to enable sound (Section 10.4.2).

## 23.5 Data Integrity and Concurrency

23.5.1 Financial and stock records are immutable (Section 4.6.1). Order lines keep the price at the time of adding. Deduction movements keep the recipe used.

23.5.2 [D] Concurrent edits are detected (Section 9.10). Unique numbering and reservation overlap checks must hold under simultaneous requests. Two users adjusting the same stock item must not lose an update.

## 23.6 Backup and Recovery [C]

23.6.1 **Daily automated backups kept for 30 days.** Up to one day of data may be lost after a failure. Point-in-time recovery is out of scope.

23.6.2 [D] A documented restore procedure is required and restore tests should be run periodically.

23.6.3 Because invoices carry continuous numbers, losing a day of data would lose invoices and leave a numbering gap. The client is asked to confirm this risk (Section 26.2).

## 23.7 Retention

23.7.1 See Section 4.6.

## 23.8 Hosting-Agnostic Capabilities [C]

23.8.1 The hosting platform is undecided. Whatever is chosen must provide: live push updates (or equivalent fast polling), a job scheduler with catch-up and timezone support, file storage, HTTPS, daily backups with restore, and server-side access control.

23.8.2 The platform decision must be made before development (Section 26.1).

## 23.9 CSV Import [C]

23.9.1 Bulk import covers **menu items** and **employees** (Stage 1), and **inventory items** and **recipes** (Stage 2). It does not import users, customers, suppliers, tables or history.

23.9.2 Import runs in dependency order: inventory items, then menu items, then recipes. Employees are independent and never create user accounts.

23.9.3 Each import offers a downloadable template, a preview with validation, and an error report with row numbers. A file with errors is not partly applied silently: the Manager chooses to fix and re-upload or to import only valid rows [D].

## 23.10 Privacy

23.10.1 The system stores personal data about customers, visitors and employees. It must collect only what this PRD lists, limit access by role, and never expose it publicly. The client should confirm the personal data protection obligations that apply to them.

## 23.11 Localization [C]

23.11.1 English only; Gregorian dates; ETB; timezone Africa/Addis_Ababa [D].

## 23.12 Usability and Feedback [S]

23.12.1 Every list has search, filters and pagination where useful. Every form validates required fields with clear messages. Loading, empty and error states exist on every screen. Destructive actions confirm. Success actions give brief feedback.

---

# Section 24. Data Model

*This lists entities and key relationships so the build has a shared vocabulary. Exact columns are decided during design and must honour the requirements above.*

## 24.1 Core Entities

| Domain | Entity | Key attributes and notes |
|---|---|---|
| Access | users | username, email, role, status, linked employee, failed attempts, lockout time, must-change-password |
| Access | employees | fields in 6.1.2; optional link to a user |
| Access | back_entry_grants | user, granted by, start, end |
| Access | activity_log | who, when, action, target, old and new value, reason (immutable) |
| Config | settings | restaurant profile, TIN, tax rate, service %, closing time, thresholds, tracking switch |
| Config | payment_methods | name, reference-required flag, active |
| Config | meal_periods, lists | managed lists in 5.9 |
| Config | number_sequences | order (by date), invoice, credit note |
| Menu | menu_categories | name, order, status |
| Menu | menu_items | name, category, description, image, base price, status, manual availability, fasting tag |
| Menu | item_variants | menu item, name, price, recipe multiplier, default flag |
| Menu | addons and menu_item_addons | name, price, ingredient lines, links to items |
| Menu | menu_item_meal_periods | item to meal period |
| Menu | menu_item_prices | item or variant, price, effective date (history) |
| Menu | recipes and recipe_lines | menu item, inventory item, quantity in base unit |
| Tables | tables | number, seats, section, status |
| Orders | orders | number, order-number date, type, owner, customer, guests, status, totals, business date |
| Orders | order_tables | order to tables (one, or several for a merged group) |
| Orders | tickets | order, round number, status, status timestamps |
| Orders | ticket_items | ticket, menu item, variant, add-ons, quantity, note, unit price snapshot, cancellation reason |
| Billing | payments | order, amount, method, reference, recorded by, happened-at, entered-at |
| Billing | invoices and invoice_lines | number, order, amounts, rates used, buyer info, business date (immutable) |
| Billing | credit_notes and lines | number, invoice, amounts, reason, refund method, business date |
| Billing | day_closures | business date, closed at, reopened flags, summary |
| Customers | customers | name, phone (normalised, unique), email, notes |
| Reservations | reservations and reservation_tables | customer, date, time, guests, status, tables |
| Cleaning | cleaning_templates, cleaning_tasks | area, assignee, frequency, due time, status, source (template, one-off, table) |
| Inventory | inventory_items | name, category, base unit, quantity, minimum, reorder quantity, default supplier, purchase unit and factor |
| Inventory | stock_movements | item, signed quantity, type, user, reason, reference (immutable) |
| Inventory | stock_counts and lines | expected, counted, variance |
| Inventory | waste_records | item, quantity, reason, user |
| Suppliers | suppliers and supplier_items | contact data; item to supplier with last price |
| Purchasing | purchase_requests and lines | status, supplier, approver, emergency flag, reviewed flag |
| Purchasing | purchase_receipts and lines | delivery date, quantities, actual price, invoice number, attachment |
| Expenses | expenses and expense_templates | category, amount, date, status, recorded by; recurring definition |
| Maintenance | assets, maintenance_requests, maintenance_templates | warranty date, assignee (employee or vendor text), cost |
| Security | visitors, incidents, lost_found_items | fields in Section 19 |
| Common | notifications, attachments | recipient, event, read state; file metadata |

## 24.2 Key Relationships

24.2.1 A customer has many orders and reservations. An order has many tickets, a ticket has many items, and an order has at most one invoice, which can have many credit notes.

24.2.2 A reservation links to one or more tables. A merged group order links to the same tables.

24.2.3 A menu item has variants, add-ons, meal periods, price history and one recipe. A recipe has lines that point to inventory items.

24.2.4 An inventory item has many movements, suppliers and receipts. Every stock change is a movement.

---

# Section 25. Delivery Stages, Acceptance and Change Control

## 25.1 Stage 1: Core Service and Billing [C]

25.1.1 Includes: sign-in, users, employees, Settings; menu (categories, items, variants, add-ons, fasting tag, meal periods, scheduled prices, manual availability; recipes optional); tables; orders and tickets; kitchen screen with sound; billing (discounts, service charge, tax extraction, payment, invoice PDF, credit notes); cleaner **table-clean tasks**; customers (from takeaway); business-day close and end-of-day summary; **sales and orders reports**; activity log; notifications; Manager dashboard (available cards only); CSV import of menu items and employees; the scheduler for auto-close.

25.1.2 Dependencies that force these into Stage 1: table cleaning gates table availability; the business-day close needs sales reporting; takeaway orders need customer records.

25.1.3 Not in Stage 1: inventory, purchasing, reservations (the Reserved status is unused), routine cleaning, expenses, maintenance, security, the "Report an issue" form.

## 25.2 Stage 2: Inventory and Purchasing [C]

25.2.1 Includes: inventory items and units, stock operations, stock counts, waste, suppliers, purchasing (including partial receipts and emergency purchases), low-stock alerts with draft purchase requests, recipes required when tracking is on, the **inventory tracking switch**, automatic deduction, automatic unavailability, inventory reports, CSV import of inventory items and recipes.

## 25.3 Stage 3: Operations [D]

25.3.1 Includes: reservations (overlap rules, walk-in blocking, no-show job, group merge), routine cleaning templates, expenses with recurring templates, security, maintenance (assets, requests, warranty alerts, preventive schedules), the "Report an issue" form for every role, expense, staff and purchase reports, and the remaining notifications and dashboard cards.

25.3.2 Modules can be pulled forward on request; doing so is a change request (Section 25.6).

## 25.4 Acceptance Criteria

Each stage is accepted by the client, who tests it against these criteria and signs off before the next stage begins [D].

### 25.4.1 Stage 1

25.4.1.1 Users and access: a Manager creates an employee; an Administrator creates a linked user; sign-in works by username or email; five failed attempts lock the account for 15 minutes and an Administrator can unlock it; a session ends after 30 minutes of inactivity with a warning; each role sees only its own menu and the server refuses forbidden actions; an Administrator cannot open orders.
25.4.1.2 A waiter opens an order on an Available table, adds an item with a variant and add-ons, and sends it; the ticket appears on the kitchen screen within 3 seconds with a sound alert once sound is enabled.
25.4.1.3 A second batch on the same order creates a separate ticket.
25.4.1.4 A waiter can cancel an item on a Submitted ticket with a reason and cannot once it is Preparing; the Manager can; the kitchen is notified.
25.4.1.5 The Kitchen can Start preparing and Mark ready but not Served; the owning waiter is alerted and marks Served.
25.4.1.6 A ticket past the global threshold is flagged delayed and notifies the Manager.
25.4.1.7 An item is blocked with a visible reason when inactive, manually unavailable or outside its meal period.
25.4.1.8 A scheduled price change takes effect on its date and existing orders keep their price.
25.4.1.9 Billing matches Section 11.1, including the worked example: totals, service charge before discount, tax extracted from items only, rounding.
25.4.1.10 Only the Manager can apply a percentage discount; a waiter cannot.
25.4.1.11 A waiter records payment on their own order only after every ticket is Served; reference is required for bank transfer and mobile money; an invoice PDF with all fields in 11.6.1 is produced with a continuous number; the invoice cannot be edited or deleted.
25.4.1.12 A Manager issues full and partial credit notes that cannot exceed the invoice, with their own numbering; the reduction appears in the day the credit note is issued.
25.4.1.13 After payment the table is Cleaning and a table-clean task exists; the waiter cannot mark it Available before a cleaner completes the task; a Manager override works and is logged.
25.4.1.14 A takeaway order requires a phone number, creates or matches a customer, is sent before payment and paid at pickup.
25.4.1.15 An order can be moved to another Available table.
25.4.1.16 The business day auto-closes at the configured time; a closed day rejects new dated payments and credit notes; the Manager can reopen the most recent closed day; the end-of-day PDF matches the reports; order numbers reset per business day.
25.4.1.17 Sales reports use the definitions in Section 22.2 and export as CSV.
25.4.1.18 Every action listed in Section 4.8.2 appears in the activity log, visible only to the Manager.
25.4.1.19 Back-entry: only a permitted user can set a past time; each use is logged; the locked-day rule in 4.5.3 holds.
25.4.1.20 CSV import of menu items and employees shows a preview and an error report.

### 25.4.2 Stage 2

25.4.2.1 Items with base and purchase units convert correctly on receipt.
25.4.2.2 Every movement stores user, date and reason and cannot be edited or deleted.
25.4.2.3 A stock count creates adjustment movements and flags variances over the threshold.
25.4.2.4 The tracking switch stays off until the readiness checklist passes; once on, serving an item deducts recipe x variant multiplier x quantity plus add-on lines; cancelled and rejected items do not deduct; credit notes do not restore stock; negative stock raises an alert.
25.4.2.5 A menu item becomes unavailable when an ingredient is short of one portion; restocking clears only the automatic flag, never a manual Unavailable.
25.4.2.6 A low-stock alert offers a one-click draft purchase request pre-filled with default supplier, reorder quantity and last price.
25.4.2.7 Purchases move through the statuses in 16.2; only the Manager approves; partial deliveries work; a short order can be Closed with a reason.
25.4.2.8 An emergency purchase adds stock immediately, is flagged for review, and is not an expense.
25.4.2.9 A waste record creates its stock movement automatically.
25.4.2.10 A manual issue that would make stock negative is blocked unless the Manager confirms.
25.4.2.11 CSV import of inventory items and recipes works in dependency order.
25.4.2.12 Inventory reports export as CSV.

### 25.4.3 Stage 3

25.4.3.1 A reservation overlapping another on any assigned table is rejected; seats must cover the guest count.
25.4.3.2 A table with an active reservation cannot take a walk-in order that business day, with no override.
25.4.3.3 A reservation not marked Arrived within the grace period becomes No Show and releases its tables; the Manager can override.
25.4.3.4 A group reservation merges its tables into one order with one invoice; each table gets its own cleaning task after payment.
25.4.3.5 Recurring cleaning tasks are generated on schedule and overdue tasks are flagged.
25.4.3.6 Recurring expense entries arrive as Pending confirmation and only confirmed ones appear in reports.
25.4.3.7 Inventory Staff can add expenses and see only their own.
25.4.3.8 Any staff member can report a maintenance issue or incident; only the Manager manages maintenance and resolves incidents; Security can move incidents to Under Review; warranty alerts and preventive requests are generated on schedule.
25.4.3.9 The visitor register stores only the basic fields; lost-and-found claims record claimant name, phone and date.
25.4.3.10 Purchases, expenses and maintenance costs appear side by side with no combined total.

## 25.5 Go-Live Checklist [D]

25.5.1 Settings completed including tax ID. Users and employees created. Menu and (at Stage 2) inventory loaded by CSV. Backups verified and a restore tested. Paper fallback procedure written and rehearsed. Staff trained on their role screens. The Section 26.1 items resolved.

## 25.6 Change Control and Warranty [D]

25.6.1 Anything outside this PRD, including every item in Section 2.2, is a **change request**: it is described, estimated, approved by the client, and added to this document with a new version number before it is built.

25.6.2 A bug-fix warranty period is included after each go-live. Its length is to be agreed in the project agreement. Ongoing support and hosting management are outside this PRD (Section 2.2.1.16).

25.6.3 A bug is behaviour that contradicts a requirement in this document. A change in behaviour is not a bug.

---

# Section 26. Open Items and Required Decisions

## 26.1 Must Be Resolved Before Development

26.1.1 **Hosting platform.** It must offer the capabilities in Section 23.8.
26.1.2 **Tax invoice legal check.** Confirm with the client whether a system-generated invoice is legally sufficient; whether the required format needs Amharic text or Ethiopian dates (this would reverse Sections 4.2 and 23.11); and how invoice numbering must behave when paper invoices are used during outages (Section 23.2.4). If a certified fiscal device is required, this system's invoice becomes an internal document and Section 11.5 must be revised.

## 26.2 Client Review of Business-Risk Decisions

26.2.1 Daily backups only, with up to one day of data loss (Section 23.6).
26.2.2 Blocking walk-ins from any table reserved that day, with no override (Section 13.3).
26.2.3 The 30-minute logout on the Kitchen screen (Section 6.6).
26.2.4 No service charge waiver, no mixed-method payment, no invoice voiding (Sections 11.2 to 11.7).
26.2.5 Discounts only when a Manager is present (Section 11.2.3).
26.2.6 Cleaner completion gating table availability (Section 14.6).
26.2.7 Single kitchen queue for food and drinks (Section 10.1).

## 26.3 Defaults That Need Client Review

26.3.1 Every requirement tagged **[D]** was an assumption made while drafting. The client should review them before development starts. The most consequential are: numeric settings in Section 5.7; the requirement that a discount needs a reason (11.2.2); credit note details (11.7.3); Waiters creating reservations (13.1.3); the Reserved table lead behaviour (8.2.4); Kitchen item rejection (9.6.4); back-entry grants and locked-day handling (4.5); reopening only the most recent day (4.1.7); the notification recipient table (20.3); the Stage 3 grouping (25.3); and the deletion classification (4.6).

## 26.4 Pending Input

26.4.1 An "ideas" document was mentioned but was not received. Any content it holds that is not covered here must be raised and added through Section 25.6 before development starts.

## 26.5 Placeholders

26.5.1 Client name, prepared-by, and warranty period are to be completed.

---

# Section 27. Appendix A: Glossary

| Term | Meaning |
|---|---|
| Base unit | The smallest unit an inventory item is stocked and used in (for example g, ml, pieces) |
| Business day | A trading day ending at the closing time in Settings, not at midnight |
| Business date | The business day an invoice belongs to, set by payment time |
| Credit note | A document that corrects a paid invoice, issued by the Manager |
| Emergency purchase | An urgent purchase recorded after the fact, without prior approval |
| Happened at / Entered at | The time an event occurred versus the time it was recorded |
| Inventory tracking | The Settings switch that turns on recipe-based stock deduction |
| Item subtotal | The sum of item prices (tax-inclusive) before discount and service charge |
| Net sales | Item subtotal minus discount minus the tax portion |
| Round | A batch of items sent to the kitchen, which becomes one ticket |
| Table-clean task | A cleaning task created automatically when a table enters Cleaning |
| Ticket | The kitchen's unit of work, holding the items of one round |
| Walk-in | A dine-in customer without a reservation |

---

*End of document. Version 1.0.*
