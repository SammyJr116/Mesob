import { prisma } from "../../lib/prisma.js";
import { Role } from "@prisma/client";
import { calculateBill } from "./calculator.js";
import { emitTableCleaning, emitTableUpdated, emitOrderUpdated } from "../../ws/gateway.js";

export class BillingError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number = 400) {
    super(message);
    this.name = "BillingError";
    this.statusCode = statusCode;
  }
}

export interface RecordPaymentInput {
  paymentMethod: "Cash" | "Bank Transfer" | "Mobile Money" | "Card";
  reference?: string;
  buyerName?: string;
  buyerTin?: string;
  amount?: number;
}

export interface IssueCreditNoteInput {
  amount: number;
  reason: string;
  refundMethod: "Cash" | "Bank Transfer" | "Mobile Money" | "Card";
}

export class BillingService {
  /**
   * Generates next strictly continuous invoice number (PRD 4.4.2)
   */
  async getNextInvoiceNumber(): Promise<string> {
    const key = "INVOICE";
    const seq = await prisma.numberSequence.upsert({
      where: { key },
      update: { nextValue: { increment: 1 } },
      create: { key, nextValue: 2 },
    });

    const num = seq.nextValue === 2 ? 1 : seq.nextValue - 1;
    return `INV-${String(num).padStart(6, "0")}`;
  }

  /**
   * Generates next strictly continuous credit note number (PRD 4.4.3)
   */
  async getNextCreditNoteNumber(): Promise<string> {
    const key = "CREDIT_NOTE";
    const seq = await prisma.numberSequence.upsert({
      where: { key },
      update: { nextValue: { increment: 1 } },
      create: { key, nextValue: 2 },
    });

    const num = seq.nextValue === 2 ? 1 : seq.nextValue - 1;
    return `CN-${String(num).padStart(6, "0")}`;
  }

  /**
   * Records payment and atomically generates official tax invoice (PRD 11.4, 11.5, Task 3.3.2)
   */
  async recordPayment(
    orderId: string,
    input: RecordPaymentInput,
    caller: { id: string; role: Role; employeeId?: string | null }
  ) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        tickets: {
          include: { items: { include: { menuItem: true } } },
        },
        tables: { include: { table: true } },
        waiter: true,
        invoice: true,
      },
    });

    if (!order) throw new BillingError("Order not found", 404);
    if (order.invoice) throw new BillingError("Order already has an issued invoice and payment (PRD 11.5.2)", 400);

    const isManager = caller.role === Role.MANAGER || caller.role === Role.ADMIN;
    const isOwnerWaiter = caller.employeeId && caller.employeeId === order.waiterId;

    if (!isManager && !isOwnerWaiter) {
      throw new BillingError("Only the owning waiter or Manager can record payment (PRD 11.4.1)", 403);
    }

    // Reference required check dynamically from PaymentMethodConfig (PRD 5.3.2, 11.4.3)
    const config = await prisma.paymentMethodConfig.findFirst({
      where: { name: { equals: input.paymentMethod } },
    });
    const requiresRef = config
      ? config.referenceRequired
      : ["Bank Transfer", "Mobile Money", "Telebirr", "CBE Birr"].includes(input.paymentMethod);

    if (requiresRef && (!input.reference || !input.reference.trim())) {
      throw new BillingError(`Reference number is required for ${input.paymentMethod} (PRD 5.3.2, 11.4.3)`, 400);
    }

    // STRICT CHECK: All non-cancelled tickets must be Served before payment (PRD 9.5.3, 11.4.1)
    const activeTickets = order.tickets.filter((t) => t.status !== "Cancelled");
    if (activeTickets.length === 0) {
      throw new BillingError("Cannot pay an order with no active tickets", 400);
    }

    const unservedTicket = activeTickets.find((t) => t.status !== "Served");
    if (unservedTicket) {
      throw new BillingError(
        `Cannot record payment: Ticket #${unservedTicket.roundNumber} is still ${unservedTicket.status}. Every ticket must be Served before payment (PRD 9.5.3, 11.4.1).`,
        400
      );
    }

    const settings = await prisma.setting.findUnique({ where: { id: "singleton" } });
    const businessDate = settings?.currentBusinessDate || new Date().toISOString().slice(0, 10);
    const taxRate = settings ? Number(settings.vatRate) : 15;
    const serviceRate = settings ? Number(settings.serviceChargeRate) : 10;

    // Build line items for bill calculation
    const billItems = activeTickets.flatMap((t) =>
      t.items.map((i) => ({
        name: i.variantName ? `${i.menuItem.name} (${i.variantName})` : i.menuItem.name,
        quantity: i.quantity,
        unitPrice: Number(i.unitPrice),
        cancelled: i.status === "Cancelled",
      }))
    );

    const bill = calculateBill(billItems, {
      discountPercent: Number(order.discountValue || 0),
      taxRatePercent: taxRate,
      serviceChargePercent: serviceRate,
    });

    const invoiceNumber = await this.getNextInvoiceNumber();
    const now = new Date();

    // Atomic transaction
    const [invoice, payment, updatedOrder] = await prisma.$transaction(async (tx) => {
      // 1. Create Invoice Lines
      const invoiceLines = billItems
        .filter((i) => !i.cancelled)
        .map((item) => ({
          itemName: item.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          subtotal: item.quantity * item.unitPrice,
        }));

      // 2. Create Invoice
      const createdInvoice = await tx.invoice.create({
        data: {
          invoiceNumber,
          orderId: order.id,
          businessDate,
          buyerName: input.buyerName?.trim() || null,
          buyerTin: input.buyerTin?.trim() || null,
          subtotal: bill.subtotal,
          discount: bill.discountAmount,
          serviceCharge: bill.serviceChargeAmount,
          tax: bill.taxAmount,
          total: bill.total,
          issuedAt: now,
          lines: {
            create: invoiceLines,
          },
        },
        include: { lines: true },
      });

      // 3. Create Payment
      const createdPayment = await tx.payment.create({
        data: {
          orderId: order.id,
          amount: bill.total,
          paymentMethod: input.paymentMethod,
          reference: input.reference?.trim() || null,
          recordedById: caller.id,
          happenedAt: now,
          enteredAt: now,
        },
      });

      // 4. Update Order to Completed
      const completedOrder = await tx.order.update({
        where: { id: order.id },
        data: {
          status: "Completed",
          completedAt: now,
          subtotal: bill.subtotal,
          serviceCharge: bill.serviceChargeAmount,
          tax: bill.taxAmount,
          total: bill.total,
        },
        include: {
          tables: { include: { table: true } },
          waiter: true,
          customer: true,
          invoice: { include: { lines: true } },
          payments: true,
        },
      });

      // 5. If Dine-in: transition table to Cleaning and create table-clean task (PRD 11.8.1, 14.6)
      for (const ot of order.tables) {
        await tx.table.update({
          where: { id: ot.tableId },
          data: { status: "Cleaning" },
        });

        await tx.cleaningTask.create({
          data: {
            area: `Table ${ot.table.number}`,
            description: `Clean & reset Table ${ot.table.number}`,
            tableId: ot.tableId,
            status: "Pending",
            source: `Table ${ot.table.number} paid`,
          },
        });
      }

      return [createdInvoice, createdPayment, completedOrder];
    });

    // Real-time broadcasts
    for (const ot of order.tables) {
      emitTableCleaning(
        { id: ot.tableId, number: ot.table.number, status: "Cleaning" },
        { area: `Table ${ot.table.number}`, task: `Clean & reset Table ${ot.table.number}` }
      );
      emitTableUpdated({ id: ot.tableId, number: ot.table.number, status: "Cleaning" });
    }

    emitOrderUpdated(updatedOrder);

    return {
      order: updatedOrder,
      invoice,
      payment,
      calculation: bill,
    };
  }

  /**
   * Issues a credit note against a paid invoice (Manager only - PRD 11.7)
   */
  async issueCreditNote(
    invoiceId: string,
    input: IssueCreditNoteInput,
    manager: { id: string; role: Role }
  ) {
    if (manager.role !== Role.MANAGER && manager.role !== Role.ADMIN) {
      throw new BillingError("Only a Manager can issue credit notes (PRD 11.7.1)", 403);
    }

    if (!input.reason || !input.reason.trim()) {
      throw new BillingError("Credit note reason is mandatory (PRD 11.7.4)", 400);
    }

    if (!input.refundMethod) {
      throw new BillingError("Refund method is mandatory (PRD 11.7.4)", 400);
    }

    if (input.amount <= 0) {
      throw new BillingError("Credit note amount must be greater than 0", 400);
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        creditNotes: true,
        order: true,
      },
    });

    if (!invoice) throw new BillingError("Invoice not found", 404);

    // Sum previous credit notes on this invoice
    const previouslyCredited = invoice.creditNotes.reduce((sum, cn) => sum + Number(cn.amount), 0);
    const invoiceTotal = Number(invoice.total);
    const maxCreditable = invoiceTotal - previouslyCredited;

    if (input.amount > maxCreditable) {
      throw new BillingError(
        `Credit note amount (${input.amount} ETB) exceeds maximum remaining creditable amount (${maxCreditable} ETB) (PRD 11.7.3)`,
        400
      );
    }

    const settings = await prisma.setting.findUnique({ where: { id: "singleton" } });
    const businessDate = settings?.currentBusinessDate || new Date().toISOString().slice(0, 10);
    const taxRate = settings ? Number(settings.vatRate) / 100 : 0.15;

    // Proportional tax portion reversal
    const taxAmount = Number((input.amount * (taxRate / (1 + taxRate))).toFixed(2));
    const creditNoteNumber = await this.getNextCreditNoteNumber();

    const creditNote = await prisma.creditNote.create({
      data: {
        creditNoteNumber,
        invoiceId: invoice.id,
        businessDate,
        amount: input.amount,
        taxAmount,
        reason: input.reason.trim(),
        refundMethod: input.refundMethod,
        managerId: manager.id,
      },
    });

    // Audit log (PRD 4.8.2)
    await prisma.activityLog.create({
      data: {
        userId: manager.id,
        role: manager.role,
        action: "Credit Note Issued",
        target: `Invoice: ${invoice.invoiceNumber} (${creditNoteNumber})`,
        newValue: `${input.amount} ETB`,
        reason: input.reason.trim(),
      },
    });

    return creditNote;
  }

  async getInvoiceById(invoiceId: string) {
    return prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        lines: true,
        creditNotes: true,
        order: {
          include: {
            waiter: true,
            tables: { include: { table: true } },
            customer: true,
            payments: true,
          },
        },
      },
    });
  }
}

export const billingService = new BillingService();
