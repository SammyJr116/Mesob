# Mesob Restaurant Management System (RMS)
## User & Operations Manual

> **A Friendly, Step-by-Step Guide for Restaurant Owners, Managers, Cashiers, Kitchen, and Staff**  
> *Offline-Ready · Local Restaurant LAN Deployment · Version 1.0*

A PDF version of this manual is available at [`Mesob_Restaurant_User_Manual.pdf`](./Mesob_Restaurant_User_Manual.pdf) or directly via browser at `http://[SERVER_IP]:5173/Mesob_Restaurant_User_Manual.pdf`.

---

## 1. Welcome to Mesob RMS

Mesob Restaurant Management System is a specialized, all-in-one platform designed specifically for authentic Ethiopian dining hospitality. It unites front-of-house table management, multiple kitchen ticket rounds, automatic ingredient recipe deduction, official Ethiopian VAT billing, facility cleaning gates, and security visitor tracking into one cohesive interface.

> [!TIP]
> **Offline-First Peace of Mind**: Mesob RMS runs completely inside your restaurant on your local Wi-Fi router and Local Area Network (LAN). Even if external internet connections go down in the city, your waitstaff, kitchen, and cashier continue operating without interruption. All your sales records and financial data remain 100% private and user-owned.

---

## 2. Morning Startup Routine (How to Launch)

Every morning when the restaurant opens, perform two simple steps on the central server computer:

1. **Start the Database**:
   - Open **Laragon** (or XAMPP) on the central computer.
   - Click **"Start All"** to ensure MySQL is running on port 3306.

2. **Launch the Application**:
   - Start the backend server and frontend application.
   - The system is accessible immediately at:
     - **Local Server Computer**: `http://localhost:5173`
     - **Waiter & Kitchen Tablets (Wi-Fi)**: `http://[SERVER_LOCAL_IP]:5173` *(e.g., `http://192.168.1.6:5173`)*

---

## 3. Staff Roles & Default Login Accounts

Each restaurant team member logs in with their dedicated role. The system gates their interface so staff only see what they need:

| Role | Default Login | Password | Primary Devices | Key Responsibilities |
| :--- | :--- | :--- | :--- | :--- |
| **Manager / Owner** | `owner` | `mesob1234` | Desktop / Laptop | Full floor supervision, discounts, reports, day close |
| **Administrator** | `admin1` | `mesob1234` | Desktop / Laptop | Staff account creation, security unlocks, password resets |
| **Waiter** | `selam` *(or `dawit`)* | `mesob1234` | Tablet / Mobile | Guest orders, table floor, sending tickets, serving |
| **Kitchen** | `chef` | `mesob1234` | Tablet / Screen | KDS display, ticket preparation, recipe availability |
| **Inventory Staff** | `yonas` | `mesob1234` | Desktop / Tablet | Raw spice & teff stock, purchase orders, waste logging |
| **Cleaner** | `tigist` | `mesob1234` | Phone / Mobile | Table turnover cleaning tasks, routine facility checklist |
| **Security** | `robel` | `mesob1234` | Phone / Mobile | Visitor log, incident reporting, lost & found register |

---

## 4. The 6-Step Dining Lifecycle (From Order to Clean Table)

```
[Available Table] ──> [Open Order] ──> [Kitchen Prepares] ──> [Waiter Serves] ──> [Payment & Invoice] ──> [Cleaning Gate] ──> [Available]
```

### Step 1: Opening an Order (Waiter)
On the **Floor Plan** screen, the Waiter taps any green **Available** table (e.g. Table 4). Taps **"Open Order"**, enters the guest count, selects *Dine-in* or *Takeaway*, and taps **"Create Order"**. The table instantly turns orange (*Occupied*).

### Step 2: Adding Dishes & Modifiers (Waiter)
The Waiter taps dishes (e.g. *Doro Wot*, *Special Tibs*). Can pick portions (*Regular* / *Large*) and traditional add-ons (*Extra Ayib*, *Awaze*, *Extra Injera*). Taps **"Send to Kitchen"**. A Round 1 Ticket is dispatched immediately.

### Step 3: Preparing Tickets (Kitchen KDS)
The new ticket pops up in real-time on the **Kitchen Display Screen** with an audible chime alert. The chef taps **"Start Preparing"**, then taps **"Mark Ready"** when cooking is complete. If delayed past 20 minutes, the ticket highlights in orange.

### Step 4: Serving the Table (Waiter)
A banner flashes on the Waiter's tablet announcing food is ready. The Waiter brings the hot mesob to guests and taps **"Mark Served"**. Serving automatically deducts raw meat, teff, and spices from inventory in grams.

### Step 5: Billing & Official Invoicing (Waiter / Cashier)
When guests request the check, the Waiter opens the order bill. The system extracts **10% Service Charge** and **15% VAT** automatically. The Waiter records payment (*Cash*, *Telebirr*, *CBE Birr*, *Card*). An official continuous invoice (`INV-XXXXXX`) is printed or saved as PDF.

### Step 6: Table Turnover Gate (Cleaner & Waiter)
The table automatically switches to purple (*Cleaning*), and an automatic cleaning task is queued for the Cleaner. The Waiter is **strictly blocked** from seating new guests until the Cleaner taps **"Complete Cleaning"** on their phone.

---

## 5. Multi-Round Ordering (Habesha Communal Dining)

In traditional Habesha dining, guests frequently request extra drinks or additional dishes mid-meal. With Mesob RMS, the Waiter does **NOT** need to open a separate order:
- Reopen the active table order and tap **"Add Round 2"**.
- The kitchen receives a distinct Round 2 ticket without interfering with Round 1.

### Table Merging & Relocation
- **Merging Tables**: When a large family or party arrives, tap **"Merge Tables"** and select Table 1 and Table 2. They will be linked under one single unified bill.
- **Moving Tables**: If guests ask to move from the patio inside, use **"Move Order"** to transfer their entire bill and ticket queue with one tap.

---

## 6. Manager & Owner Guide

### A. Authorizing Discounts (Manager Only)
Waiters cannot apply arbitrary discounts. When a discount is needed (VIP, promotion, or guest remedy), the Manager enters their approval with a percentage or fixed amount and a mandatory reason (e.g. `'10% Family Discount'`). Every discount is recorded in the **Activity Log** for audit compliance.

### B. End-of-Day Closure (Closing the Shift)
At closing time, the Manager goes to **Day Close** in the sidebar. The system checks that all tables are settled and paid. The Manager reviews total net sales, VAT collected, service charge, and payment breakdown, then taps **"Close Business Day"**. The system seals the records and advances the business date to the next morning.

### C. Exporting Financial CSV Reports
Need to send numbers to your accountant? Go to **Reports**, choose a date range (*Today*, *This Week*, or *This Month*), and tap **"Export CSV"**. An Excel-compatible file downloads instantly containing line-by-line sales, tax breakdowns, and payment channels.

---

## 7. Administrator Guide (Staff Accounts & Security)

### A. Separation of Duties: Employees vs. Users
- **Step 1 (Manager)**: The Manager goes to **Employees** to create the real-world HR profile (name, phone, department, position).
- **Step 2 (Administrator)**: The Administrator goes to **Users** to create the digital login account (username, role, temporary password) and links it to the employee profile.

### B. Issuing Temporary Passwords & Resets
When an Administrator creates an account or resets a forgotten password, the system generates a secure temporary password (e.g., `Mesob7381!`). The Administrator copies this and gives it to the staff member. When the employee logs in, they can change it to their own private password in **My Profile**.

### C. 5-Attempt Lockout Protection (PRD 6.5)
If an employee types the wrong password 5 times in a row, the system automatically locks the account for 30 minutes to prevent unauthorized guessing. An Administrator can immediately unlock the staff member with one click in the **Users** screen.

---

## 8. Data Safety: 1-Click Backups & Restore

Restaurant records must never be lost. Mesob RMS includes a built-in snapshot engine that captures all 47 database models in a single timestamped file:

### Taking a Daily Backup (Takes 3 Seconds)
In the server terminal, run:
```powershell
npm run backup
```
A complete snapshot is saved in `server/backups/`. Snapshots older than 30 days are automatically cleaned up to save disk space.

### Restoring Data (Emergency Disaster Recovery)
If a computer hardware error occurs, install Laragon on a replacement computer, place your backup file in `server/backups/`, and run:
```powershell
npm run restore
```
The system atomically restores every order, ticket, payment, and customer without missing a single record.

---

## 9. Frequently Asked Questions & Quick Solutions

**Q: A waiter tablet cannot connect to the server.**  
**A:** Ensure the tablet is connected to the restaurant's local Wi-Fi router (not mobile cellular data). In the tablet's browser, make sure you typed the server's local network IP address (e.g., `http://192.168.1.6:5173`).

**Q: Why won't the system let a waiter seat guests at Table 3?**  
**A:** The table is currently in *Cleaning* status. The Cleaner must first mark their cleaning task as completed on their phone, which frees up the table to *Available*. (Managers can also use *Manager Override* if urgent).

**Q: A dish is greyed out and showing 'Out of Stock' on the menu.**  
**A:** Mesob RMS tracks ingredients in real time. If chicken or berbere runs below 1 portion in Inventory, the kitchen item turns unavailable automatically. Once the item is restocked in Inventory, it becomes available again.

**Q: Can we void or cancel an item after sending it to the kitchen?**  
**A:** If the ticket is still *Submitted* (chef hasn't started cooking), the waiter can cancel it with a reason. If the ticket is already *Preparing*, only the Manager can authorize a cancellation to prevent food waste.

**Q: Does the system work if our internet provider has an outage?**  
**A:** **YES! 100%.** Mesob RMS communicates exclusively over your local Wi-Fi router. Internet outages in the city do not stop orders, kitchen tickets, or printing invoices.

---

*Mesob Restaurant Management System · Bole Road, Addis Ababa · User-Owned Standalone Software*
