import fs from "fs";
import path from "path";
import PDFDocument from "pdfkit";

const OUTPUT_PDF_ROOT = path.resolve(process.cwd(), "..", "Mesob_Restaurant_User_Manual.pdf");
const OUTPUT_PDF_PUBLIC = path.resolve(process.cwd(), "..", "public", "Mesob_Restaurant_User_Manual.pdf");

export async function generateUserManualPdf(): Promise<string> {
  console.log("[Manual] Generating User Manual PDF...");

  const doc = new PDFDocument({
    size: "A4",
    margins: { top: 40, bottom: 40, left: 40, right: 40 },
    bufferPages: true,
    info: {
      Title: "Mesob Restaurant Management System - User Manual",
      Author: "Mesob RMS Engineering Team",
      Subject: "User & Operations Manual for Restaurant Staff & Management",
      Keywords: "Restaurant, POS, KDS, Inventory, Billing, Operations Manual",
    },
  });

  const writeStream = fs.createWriteStream(OUTPUT_PDF_ROOT);
  doc.pipe(writeStream);

  const colors = {
    walnut: "#3E2718",
    darkWalnut: "#2A180E",
    gold: "#B8860B",
    lightGold: "#F9F3E5",
    forest: "#264D23",
    lightForest: "#EBF3EA",
    berbere: "#A6341B",
    lightBerbere: "#FAECE9",
    charcoal: "#242424",
    muted: "#5A5A5A",
    cardBg: "#F7F4EF",
    border: "#E0D7C9",
    white: "#FFFFFF",
  };

  // Helper: Section Title
  const addSectionHeader = (title: string, subtitle?: string) => {
    doc.moveDown(0.7);
    const y = doc.y;
    doc.rect(40, y, 4, 20).fill(colors.gold);
    doc.fillColor(colors.walnut).fontSize(13).font("Helvetica-Bold").text(title, 52, y + 2);
    if (subtitle) {
      doc.fillColor(colors.muted).fontSize(8.5).font("Helvetica-Oblique").text(subtitle, 52, doc.y + 1);
    }
    doc.moveDown(0.5);
  };

  // Helper: Sub-heading
  const addSubHeader = (title: string) => {
    doc.moveDown(0.35);
    doc.fillColor(colors.forest).fontSize(10.5).font("Helvetica-Bold").text(title, 40);
    doc.moveDown(0.15);
  };

  // Helper: Paragraph
  const addParagraph = (text: string) => {
    doc.fillColor(colors.charcoal).fontSize(9).font("Helvetica").text(text, 40, doc.y, {
      lineGap: 2.5,
      align: "justify",
    });
    doc.moveDown(0.35);
  };

  // Helper: Callout Box
  const addCallout = (title: string, body: string, type: "tip" | "warn" | "info" = "info") => {
    const bg = type === "tip" ? colors.lightForest : type === "warn" ? colors.lightBerbere : colors.lightGold;
    const border = type === "tip" ? colors.forest : type === "warn" ? colors.berbere : colors.gold;
    const y = doc.y;
    const boxWidth = doc.page.width - 80;

    doc.fontSize(8.5).font("Helvetica");
    const textHeight = doc.heightOfString(body, { width: boxWidth - 24, lineGap: 2 });
    const totalHeight = textHeight + 22;

    doc.rect(40, y, boxWidth, totalHeight).fill(bg);
    doc.rect(40, y, 4, totalHeight).fill(border);

    doc.fillColor(border).fontSize(9).font("Helvetica-Bold").text(title.toUpperCase(), 52, y + 5);
    doc.fillColor(colors.charcoal).fontSize(8.5).font("Helvetica").text(body, 52, y + 17, {
      width: boxWidth - 24,
      lineGap: 2,
    });

    doc.y = y + totalHeight + 6;
  };

  // Helper: Table
  const drawTable = (headers: string[], rows: string[][], colWidths: number[]) => {
    const startX = 40;
    let currentY = doc.y;

    // Header row
    const rowHeight = 18;
    doc.rect(startX, currentY, doc.page.width - 80, rowHeight).fill(colors.walnut);
    let curX = startX;
    headers.forEach((h, i) => {
      doc.fillColor(colors.white).fontSize(8).font("Helvetica-Bold").text(h, curX + 6, currentY + 4, {
        width: colWidths[i] - 12,
        align: "left",
      });
      curX += colWidths[i];
    });

    currentY += rowHeight;

    // Data rows
    rows.forEach((row, rowIndex) => {
      const bg = rowIndex % 2 === 0 ? colors.white : colors.cardBg;
      doc.rect(startX, currentY, doc.page.width - 80, rowHeight).fill(bg);
      doc.rect(startX, currentY, doc.page.width - 80, rowHeight).stroke(colors.border);

      let x = startX;
      row.forEach((cell, cellIndex) => {
        doc.fillColor(colors.charcoal).fontSize(8).font("Helvetica").text(cell, x + 6, currentY + 4, {
          width: colWidths[cellIndex] - 12,
          align: "left",
        });
        x += colWidths[cellIndex];
      });
      currentY += rowHeight;
    });

    doc.y = currentY + 6;
  };

  // ==========================================
  // PAGE 1: TITLE & EXECUTIVE SUMMARY
  // ==========================================

  // Header Banner
  doc.rect(0, 0, doc.page.width, 120).fill(colors.walnut);
  doc.rect(0, 116, doc.page.width, 4).fill(colors.gold);

  doc.fillColor(colors.gold).fontSize(10).font("Helvetica-Bold").text("MESOB ETHIOPIAN RESTAURANT", 40, 26);
  doc.fillColor(colors.white).fontSize(20).font("Helvetica-Bold").text("Restaurant Management System (RMS)", 40, 42);
  doc.fillColor("#E2D5C5").fontSize(9.5).font("Helvetica").text("User & Operations Guide for Owners, Managers, Cashiers, Kitchen, and Staff", 40, 70);
  doc.fillColor(colors.gold).fontSize(8).font("Helvetica-Bold").text("VERSION 1.0  ·  OFFLINE-READY  ·  LOCAL RESTAURANT LAN DEPLOYMENT", 40, 92);

  doc.y = 138;

  addSectionHeader("1. Welcome to Mesob RMS", "The all-in-one system designed specifically for authentic dining operations");
  addParagraph(
    "Mesob Restaurant Management System is a specialized, all-in-one solution built from the ground up for Ethiopian dining hospitality. It unites floor table management, multiple kitchen ticket rounds, automatic ingredient recipe deduction, official Ethiopian VAT billing, facility cleaning gates, and security visitor tracking into one cohesive interface."
  );

  addCallout(
    "Offline-First Peace of Mind",
    "Mesob RMS runs completely inside your restaurant on your local Wi-Fi and Local Area Network (LAN). Even if external internet connections go down in the city, your waitstaff, kitchen, and cashier continue operating without interruption. All your sales records and financial data remain 100% private and user-owned.",
    "tip"
  );

  addSectionHeader("2. Morning Startup Routine (How to Launch)", "Simple 2-minute routine to start the system at opening time");
  addParagraph("Every morning when the restaurant opens, the central server computer performs two simple steps:");

  addParagraph("1. Start the Database: Open Laragon (or XAMPP) on the central computer and click 'Start All' (MySQL port 3306).");
  addParagraph("2. Launch the Application: Double-click the Mesob RMS shortcut or run the startup command in PowerShell. The backend connects and the web application opens at:");

  // URL summary box
  const yBox = doc.y;
  doc.rect(40, yBox, doc.page.width - 80, 42).fill(colors.cardBg);
  doc.rect(40, yBox, doc.page.width - 80, 42).stroke(colors.border);
  doc.fillColor(colors.walnut).fontSize(9).font("Helvetica-Bold").text("Local Server Workstation:", 50, yBox + 7);
  doc.fillColor(colors.forest).fontSize(9).font("Helvetica").text("http://localhost:5173", 210, yBox + 7);
  doc.fillColor(colors.walnut).fontSize(9).font("Helvetica-Bold").text("Waiter & Kitchen Tablets (Wi-Fi):", 50, yBox + 22);
  doc.fillColor(colors.forest).fontSize(9).font("Helvetica").text("http://[SERVER_LOCAL_IP]:5173  (e.g., http://192.168.1.6:5173)", 210, yBox + 22);
  doc.y = yBox + 50;

  addSectionHeader("3. Staff Roles & Default Login Accounts", "Pre-configured accounts ready for immediate operation");
  addParagraph("Each restaurant team member logs in with their dedicated role. The system gates their interface so staff only see what they need:");

  drawTable(
    ["Role", "Default Login", "Password", "Primary Devices", "Key Responsibilities"],
    [
      ["Manager / Owner", "owner", "mesob1234", "Desktop / Laptop", "Full floor supervision, discounts, reports, day close"],
      ["Administrator", "admin1", "mesob1234", "Desktop / Laptop", "Staff account creation, security unlocks, password resets"],
      ["Waiter", "selam / dawit", "mesob1234", "Tablet / Mobile", "Guest orders, table floor, sending tickets, serving"],
      ["Kitchen", "chef", "mesob1234", "Tablet / Screen", "KDS display, ticket preparation, recipe availability"],
      ["Inventory Staff", "yonas", "mesob1234", "Desktop / Tablet", "Raw spice & teff stock, purchase orders, waste logging"],
      ["Cleaner", "tigist", "mesob1234", "Phone / Mobile", "Table turnover cleaning tasks, routine facility checklist"],
      ["Security", "robel", "mesob1234", "Phone / Mobile", "Visitor log, incident reporting, lost & found register"],
    ],
    [95, 80, 65, 95, 180]
  );

  // ==========================================
  // PAGE 2: THE DAILY DINING CYCLE
  // ==========================================
  doc.addPage();
  doc.y = 48;

  addSectionHeader("4. The 6-Step Dining Lifecycle (From Order to Clean Table)", "How front-of-house, kitchen, and facility work together seamlessly");

  const steps = [
    {
      num: "Step 1",
      title: "Opening an Order (Waiter)",
      desc: "On the Floor Plan screen, the Waiter taps any green 'Available' table (e.g. Table 4). Taps 'Open Order', enters guest count, selects Dine-in or Takeaway, and taps 'Create Order'. The table instantly turns orange (Occupied).",
    },
    {
      num: "Step 2",
      title: "Adding Dishes & Modifiers (Waiter)",
      desc: "The Waiter taps dishes (e.g. Doro Wot, Special Tibs). Can pick portions (Regular / Large) and traditional add-ons (Extra Ayib, Awaze, Extra Injera). Taps 'Send to Kitchen'. A Round 1 Ticket is dispatched immediately.",
    },
    {
      num: "Step 3",
      title: "Preparing Tickets (Kitchen KDS)",
      desc: "The new ticket pops up in real-time on the Kitchen Display Screen with an audible chime alert. The chef taps 'Start Preparing', then taps 'Mark Ready' when cooking is complete. If delayed past 20 minutes, it turns orange.",
    },
    {
      num: "Step 4",
      title: "Serving the Table (Waiter)",
      desc: "A banner flashes on the Waiter's tablet announcing food is ready. The Waiter brings the hot mesob to guests and taps 'Mark Served'. Serving automatically deducts raw meat, teff, and spices from inventory in grams.",
    },
    {
      num: "Step 5",
      title: "Billing & Official Invoicing (Waiter / Cashier)",
      desc: "When guests request the check, the Waiter opens the order bill. The system extracts 10% Service Charge and 15% VAT automatically. The Waiter records payment (Cash, Telebirr, CBE Birr, Card). An official invoice (INV-XXXXXX) is printed or saved as PDF.",
    },
    {
      num: "Step 6",
      title: "Table Turnover Gate (Cleaner & Waiter)",
      desc: "The table automatically switches to purple (Cleaning), and an automatic cleaning task is queued for the Cleaner. The Waiter is strictly blocked from seating new guests until the Cleaner taps 'Complete Cleaning' on their phone.",
    },
  ];

  steps.forEach((s) => {
    const y = doc.y;
    doc.rect(40, y, 50, 16).fill(colors.forest);
    doc.fillColor(colors.white).fontSize(8).font("Helvetica-Bold").text(s.num, 40, y + 4, { align: "center", width: 50 });

    doc.fillColor(colors.walnut).fontSize(9.5).font("Helvetica-Bold").text(s.title, 100, y + 2);
    doc.fillColor(colors.charcoal).fontSize(8.5).font("Helvetica").text(s.desc, 100, y + 15, {
      width: doc.page.width - 145,
      lineGap: 2,
    });
    doc.y = y + 44;
  });

  addSectionHeader("5. Multi-Round Ordering (Habesha Communal Dining)", "Handling drinks, extra injera, and second rounds effortlessly");
  addParagraph(
    "In traditional Habesha dining, guests frequently request extra drinks or additional dishes mid-meal. With Mesob RMS, the Waiter does NOT need to open a separate order. Simply reopen the active table order and tap 'Add Round 2'. The kitchen receives a distinct Round 2 ticket without interfering with Round 1."
  );

  addCallout(
    "Table Merging & Relocation",
    "• Merging Tables: When a large family or party arrives, tap 'Merge Tables' and select Table 1 and Table 2. They will be linked under one single unified bill.\n• Moving Tables: If guests ask to move from the patio inside, use 'Move Order' to transfer their entire bill and ticket queue with one tap.",
    "info"
  );

  // ==========================================
  // PAGE 3: MANAGEMENT, SECURITY & AUDIT
  // ==========================================
  doc.addPage();
  doc.y = 48;

  addSectionHeader("6. Manager & Owner Guide", "Financial oversight, discounts, daily close, and analytics");

  addSubHeader("A. Authorizing Discounts (Manager Only)");
  addParagraph(
    "Waiters cannot apply arbitrary discounts. When a discount is needed (VIP, promotion, or guest remedy), the Manager enters their approval with a percentage or fixed amount and a mandatory reason (e.g. '10% Family Discount'). Every discount is recorded in the Activity Log for audit compliance."
  );

  addSubHeader("B. End-of-Day Closure (Closing the Shift)");
  addParagraph(
    "At closing time, the Manager goes to Day Close in the sidebar. The system checks that all tables are settled and paid. The Manager reviews total net sales, VAT collected, service charge, and payment breakdown, then taps 'Close Business Day'. The system seals the records and advances the business date to the next morning."
  );

  addSubHeader("C. Exporting Financial CSV Reports");
  addParagraph(
    "Need to send numbers to your accountant? Go to Reports, choose a date range (Today, This Week, or This Month), and tap 'Export CSV'. An Excel-compatible file downloads instantly containing line-by-line sales, tax breakdowns, and payment channels."
  );

  addSectionHeader("7. Administrator Guide (Staff Accounts & Security)", "Managing system logins, passwords, and user authorization");

  addSubHeader("A. Separation of Duties: Employees vs. Users");
  addParagraph(
    "• Step 1 (Manager): The Manager goes to Employees to create the real-world HR profile (name, phone, department, position).\n• Step 2 (Administrator): The Administrator goes to Users to create the digital login account (username, role, temporary password) and links it to the employee profile."
  );

  addSubHeader("B. Issuing Temporary Passwords & Resets");
  addParagraph(
    "When an Administrator creates an account or resets a forgotten password, the system generates a secure temporary password (e.g., Mesob7381!). The Administrator copies this and gives it to the staff member. When the employee logs in, they can change it to their own private password in My Profile."
  );

  addSubHeader("C. 5-Attempt Lockout Protection (PRD 6.5)");
  addParagraph(
    "If an employee types the wrong password 5 times in a row, the system automatically locks the account for 30 minutes to prevent unauthorized guessing. An Administrator can immediately unlock the staff member with one click in the Users screen."
  );

  // ==========================================
  // PAGE 4: BACKUPS, MAINTENANCE & FAQ
  // ==========================================
  doc.addPage();
  doc.y = 48;

  addSectionHeader("8. Data Safety: 1-Click Backups & Restore", "Protecting your restaurant records against hardware crashes");

  addParagraph(
    "Restaurant records must never be lost. Mesob RMS includes a built-in snapshot engine that captures all 47 database models (every menu item, order, invoice, customer, and stock level) in a single timestamped file."
  );

  addCallout(
    "Taking a Daily Backup (Takes 3 Seconds)",
    "In the server terminal, run:\n   npm run backup\nA complete snapshot is saved in the 'server/backups/' folder. Snapshots older than 30 days are automatically cleaned up to save disk space.",
    "tip"
  );

  addCallout(
    "Restoring Data (Emergency Disaster Recovery)",
    "If a computer hardware error occurs, install Laragon on a replacement computer, place your backup file in 'server/backups/', and run:\n   npm run restore\nThe system atomically restores every order, ticket, payment, and customer without missing a single record.",
    "warn"
  );

  addSectionHeader("9. Frequently Asked Questions & Quick Solutions", "Fast answers to common front-of-house questions");

  const faqs = [
    {
      q: "Q: A waiter tablet cannot connect to the server.",
      a: "Ensure the tablet is connected to the restaurant's local Wi-Fi router (not mobile cellular data). In the tablet's browser, make sure you typed the server's local network IP address (e.g., http://192.168.1.6:5173).",
    },
    {
      q: "Q: Why won't the system let a waiter seat guests at Table 3?",
      a: "The table is currently in 'Cleaning' status. The Cleaner must first mark their cleaning task as completed on their phone, which frees up the table to 'Available'. (Managers can also use Manager Override if urgent).",
    },
    {
      q: "Q: A dish is greyed out and showing 'Out of Stock' on the menu.",
      a: "Mesob RMS tracks ingredients in real time. If chicken or berbere runs below 1 portion in Inventory, the kitchen item turns unavailable automatically. Once the item is restocked in Inventory, it becomes available again.",
    },
    {
      q: "Q: Can we void or cancel an item after sending it to the kitchen?",
      a: "If the ticket is still 'Submitted' (chef hasn't started cooking), the waiter can cancel it with a reason. If the ticket is already 'Preparing', only the Manager can authorize a cancellation to prevent food waste.",
    },
    {
      q: "Q: Does the system work if our internet provider has an outage?",
      a: "YES! 100%. Mesob RMS communicates exclusively over your local Wi-Fi router. Internet outages in the city do not stop orders, kitchen tickets, or printing invoices.",
    },
  ];

  faqs.forEach((f) => {
    doc.fillColor(colors.walnut).fontSize(8.5).font("Helvetica-Bold").text(f.q, 40);
    doc.fillColor(colors.charcoal).fontSize(8).font("Helvetica").text(f.a, 40, doc.y, {
      lineGap: 2,
      align: "justify",
    });
    doc.moveDown(0.3);
  });

  // Final support footer box
  doc.moveDown(0.3);
  const footY = doc.y;
  doc.rect(40, footY, doc.page.width - 80, 42).fill(colors.cardBg);
  doc.rect(40, footY, doc.page.width - 80, 42).stroke(colors.gold);
  doc.fillColor(colors.walnut).fontSize(9.5).font("Helvetica-Bold").text("Need Technical Support or System Customization?", 52, footY + 7);
  doc.fillColor(colors.muted).fontSize(8).font("Helvetica").text("Mesob Restaurant Management System is user-owned standalone software. For questions or system upgrades, contact your deployment specialist or system administrator.", 52, footY + 20, { width: doc.page.width - 104 });

  // ==========================================
  // RUNNING HEADERS & FOOTERS (Strictly 4 Pages)
  // ==========================================
  const totalPages = doc.bufferedPageRange().count;
  for (let i = 0; i < totalPages; i++) {
    doc.switchToPage(i);
    // Temporarily bypass margins for absolute running header and footer placement
    doc.page.margins.top = 0;
    doc.page.margins.bottom = 0;

    // Running header (pages 2, 3, 4)
    if (i > 0) {
      doc.fillColor(colors.muted).fontSize(7.5).font("Helvetica").text("Mesob Restaurant Management System (RMS)  ·  User & Operations Manual", 40, 18, { lineBreak: false });
      doc.rect(40, 28, doc.page.width - 80, 0.5).fill(colors.border);
    }

    // Running footer (all pages)
    const pageY = 812;
    doc.rect(40, pageY - 6, doc.page.width - 80, 0.5).fill(colors.border);
    doc.fillColor(colors.muted).fontSize(7.5).font("Helvetica").text("Traditional Habesha Hospitality  ·  Bole Road, Addis Ababa  ·  Confidential & User-Owned", 40, pageY, { lineBreak: false });
    doc.fillColor(colors.walnut).fontSize(7.5).font("Helvetica-Bold").text(`Page ${i + 1} of ${totalPages}`, doc.page.width - 100, pageY, { align: "right", width: 60, lineBreak: false });
  }

  doc.end();

  await new Promise((resolve, reject) => {
    writeStream.on("finish", resolve);
    writeStream.on("error", reject);
  });

  // Also copy to public directory so it can be downloaded via browser
  fs.copyFileSync(OUTPUT_PDF_ROOT, OUTPUT_PDF_PUBLIC);

  const stats = fs.statSync(OUTPUT_PDF_ROOT);
  console.log(`[Manual] PDF generated successfully: ${OUTPUT_PDF_ROOT} (${(stats.size / 1024).toFixed(1)} KB)`);
  console.log(`[Manual] Copied to public web folder: ${OUTPUT_PDF_PUBLIC}`);

  return OUTPUT_PDF_ROOT;
}

// Run CLI
if (process.argv[1] && process.argv[1].includes("generate-manual-pdf")) {
  generateUserManualPdf()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("[Manual] Generation failed:", err);
      process.exit(1);
    });
}
