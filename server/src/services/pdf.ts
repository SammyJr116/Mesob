import PDFDocument from "pdfkit";
import { Readable } from "stream";

export interface InvoicePdfData {
  invoiceNumber: string;
  issuedAt: Date;
  businessDate: string;
  orderNumber: string;
  tableNumber?: string | null;
  orderType: string;
  waiterName?: string | null;
  buyerName?: string | null;
  buyerTin?: string | null;
  restaurant: {
    name: string;
    address: string;
    phone: string;
    tin: string;
    footer: string;
  };
  lines: {
    itemName: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
  }[];
  subtotal: number;
  discount: number;
  serviceCharge: number;
  tax: number;
  total: number;
  paymentMethod?: string;
  paymentReference?: string | null;
}

/**
 * Generates an official, legal PDF tax invoice stream (PRD 11.6.1, Task 3.3.3)
 */
export function generateInvoicePdf(data: InvoicePdfData): NodeJS.ReadableStream {
  const doc = new PDFDocument({ margin: 40, size: "A4" });

  // 1. Header
  doc
    .fontSize(20)
    .font("Helvetica-Bold")
    .text(data.restaurant.name, { align: "center" });

  doc
    .fontSize(9)
    .font("Helvetica")
    .text(data.restaurant.address, { align: "center" })
    .text(`Phone: ${data.restaurant.phone}  |  TIN: ${data.restaurant.tin}`, { align: "center" })
    .moveDown(0.5);

  doc
    .fontSize(14)
    .font("Helvetica-Bold")
    .text("OFFICIAL TAX INVOICE", { align: "center" })
    .moveDown(0.5);

  doc.strokeColor("#cccccc").lineWidth(1).moveTo(40, doc.y).lineTo(555, doc.y).stroke().moveDown(0.5);

  // 2. Metadata Columns
  const metaY = doc.y;
  doc
    .fontSize(9)
    .font("Helvetica-Bold")
    .text(`Invoice No: `, 40, metaY, { continued: true })
    .font("Helvetica")
    .text(data.invoiceNumber)
    .font("Helvetica-Bold")
    .text(`Date & Time: `, 40, doc.y, { continued: true })
    .font("Helvetica")
    .text(data.issuedAt.toLocaleString("en-GB", { timeZone: "Africa/Addis_Ababa" }))
    .font("Helvetica-Bold")
    .text(`Order: `, 40, doc.y, { continued: true })
    .font("Helvetica")
    .text(`${data.orderNumber} (${data.orderType})`);

  doc
    .fontSize(9)
    .font("Helvetica-Bold")
    .text(`Table: `, 320, metaY, { continued: true })
    .font("Helvetica")
    .text(data.tableNumber || "Takeaway")
    .font("Helvetica-Bold")
    .text(`Server: `, 320, doc.y, { continued: true })
    .font("Helvetica")
    .text(data.waiterName || "Staff");

  if (data.buyerName || data.buyerTin) {
    doc
      .font("Helvetica-Bold")
      .text(`Buyer: `, 320, doc.y, { continued: true })
      .font("Helvetica")
      .text(`${data.buyerName || "—"}${data.buyerTin ? ` (TIN: ${data.buyerTin})` : ""}`);
  }

  doc.moveDown(1);
  const tableTop = doc.y + 10;
  doc.strokeColor("#cccccc").lineWidth(1).moveTo(40, tableTop).lineTo(555, tableTop).stroke();

  // 3. Table Header
  doc
    .fontSize(9)
    .font("Helvetica-Bold")
    .text("Item", 45, tableTop + 5, { width: 250 })
    .text("Qty", 300, tableTop + 5, { width: 40, align: "center" })
    .text("Unit Price (ETB)", 350, tableTop + 5, { width: 90, align: "right" })
    .text("Total (ETB)", 450, tableTop + 5, { width: 100, align: "right" });

  doc.strokeColor("#cccccc").lineWidth(1).moveTo(40, tableTop + 20).lineTo(555, tableTop + 20).stroke();

  // 4. Line Items
  let currentY = tableTop + 25;
  doc.font("Helvetica");

  for (const line of data.lines) {
    doc
      .text(line.itemName, 45, currentY, { width: 250 })
      .text(String(line.quantity), 300, currentY, { width: 40, align: "center" })
      .text(line.unitPrice.toFixed(2), 350, currentY, { width: 90, align: "right" })
      .text(line.subtotal.toFixed(2), 450, currentY, { width: 100, align: "right" });

    currentY += 18;
  }

  doc.strokeColor("#cccccc").lineWidth(1).moveTo(40, currentY).lineTo(555, currentY).stroke();
  currentY += 10;

  // 5. Summary Section
  const summaryX = 350;
  doc.fontSize(9);

  doc
    .text("Item Subtotal (tax-inc):", summaryX, currentY, { width: 100, align: "left" })
    .text(`${data.subtotal.toFixed(2)} ETB`, 450, currentY, { width: 100, align: "right" });
  currentY += 15;

  if (data.discount > 0) {
    doc
      .text("Discount:", summaryX, currentY, { width: 100, align: "left" })
      .text(`-${data.discount.toFixed(2)} ETB`, 450, currentY, { width: 100, align: "right" });
    currentY += 15;
  }

  doc
    .text("Service Charge (10%):", summaryX, currentY, { width: 100, align: "left" })
    .text(`${data.serviceCharge.toFixed(2)} ETB`, 450, currentY, { width: 100, align: "right" });
  currentY += 15;

  doc
    .text("VAT (15% extracted):", summaryX, currentY, { width: 100, align: "left" })
    .text(`${data.tax.toFixed(2)} ETB`, 450, currentY, { width: 100, align: "right" });
  currentY += 18;

  doc.strokeColor("#333333").lineWidth(1.5).moveTo(summaryX, currentY).lineTo(555, currentY).stroke();
  currentY += 6;

  doc
    .fontSize(11)
    .font("Helvetica-Bold")
    .text("TOTAL PAYABLE:", summaryX, currentY, { width: 100, align: "left" })
    .text(`${data.total.toFixed(2)} ETB`, 450, currentY, { width: 100, align: "right" });
  currentY += 25;

  // 6. Payment Details
  doc.fontSize(9).font("Helvetica");
  if (data.paymentMethod) {
    doc.text(
      `Payment Method: ${data.paymentMethod}${data.paymentReference ? ` (Ref: ${data.paymentReference})` : ""}`,
      40,
      currentY
    );
    currentY += 15;
  }

  // 7. Footer
  doc.moveDown(2);
  doc
    .fontSize(8)
    .font("Helvetica-Oblique")
    .text(data.restaurant.footer, 40, doc.page.height - 60, {
      align: "center",
      width: 515,
    });

  doc.end();
  return doc;
}
