import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { billingService, BillingError } from "./billing.service.js";
import { authenticate, requireRole } from "../../middleware/rbac.js";
import { Role } from "@prisma/client";
import { generateInvoicePdf } from "../../services/pdf.js";
import { prisma } from "../../lib/prisma.js";

const paymentSchema = z.object({
  paymentMethod: z.enum(["Cash", "Bank Transfer", "Mobile Money", "Card"]),
  reference: z.string().optional(),
  buyerName: z.string().optional(),
  buyerTin: z.string().optional(),
});

const creditNoteSchema = z.object({
  amount: z.number().positive("Amount must be greater than zero"),
  reason: z.string().min(1, "Reason is mandatory"),
  refundMethod: z.enum(["Cash", "Bank Transfer", "Mobile Money", "Card"]),
});

export async function billingRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authenticate);

  /**
   * POST /api/v1/orders/:id/payment
   * Records payment on served order, creates continuous invoice, sets table to cleaning (PRD 11.4, 11.5)
   */
  app.post("/orders/:id/payment", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      const parsed = paymentSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: "Validation Error",
          message: parsed.error.issues[0]?.message || "Invalid payment data",
        });
      }

      const result = await billingService.recordPayment(id, parsed.data, request.user!);
      return reply.status(200).send({ status: "ok", ...result });
    } catch (err: any) {
      if (err instanceof BillingError) {
        return reply.status(err.statusCode).send({ error: err.name, message: err.message });
      }
      return reply.status(500).send({ error: "Internal Error", message: err.message });
    }
  });

  /**
   * POST /api/v1/invoices/:id/credit-note
   * Manager issues credit note against paid invoice (PRD 11.7)
   */
  app.post(
    "/invoices/:id/credit-note",
    { preHandler: [requireRole(Role.MANAGER, Role.ADMIN)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id } = request.params as { id: string };
        const parsed = creditNoteSchema.safeParse(request.body);
        if (!parsed.success) {
          return reply.status(400).send({
            error: "Validation Error",
            message: parsed.error.issues[0]?.message || "Invalid credit note input",
          });
        }

        const creditNote = await billingService.issueCreditNote(id, parsed.data, request.user!);
        return reply.status(201).send({ status: "ok", creditNote });
      } catch (err: any) {
        if (err instanceof BillingError) {
          return reply.status(err.statusCode).send({ error: err.name, message: err.message });
        }
        return reply.status(500).send({ error: "Internal Error", message: err.message });
      }
    }
  );

  /**
   * GET /api/v1/invoices/:id
   * Invoice detail with lines and credit notes
   */
  app.get("/invoices/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const invoice = await billingService.getInvoiceById(id);
    if (!invoice) {
      return reply.status(404).send({ error: "NotFound", message: "Invoice not found" });
    }
    return reply.status(200).send({ status: "ok", invoice });
  });

  /**
   * GET /api/v1/invoices/:id/pdf
   * Streams legal tax invoice PDF (PRD 11.6.1, Task 3.3.3)
   */
  app.get("/invoices/:id/pdf", async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const invoice = await billingService.getInvoiceById(id);
    if (!invoice) {
      return reply.status(404).send({ error: "NotFound", message: "Invoice not found" });
    }

    const settings = await prisma.setting.findUnique({ where: { id: "singleton" } });
    const payment = invoice.order.payments[0];

    const pdfStream = generateInvoicePdf({
      invoiceNumber: invoice.invoiceNumber,
      issuedAt: invoice.issuedAt,
      businessDate: invoice.businessDate,
      orderNumber: invoice.order.orderNumber,
      orderType: invoice.order.type,
      tableNumber: invoice.order.tables[0]?.table.number || null,
      waiterName: invoice.order.waiter?.name || null,
      buyerName: invoice.buyerName,
      buyerTin: invoice.buyerTin,
      restaurant: {
        name: settings?.restaurantName || "Mesob Ethiopian Restaurant",
        address: "Bole Road, Addis Ababa, Ethiopia",
        phone: "+251 11 552 0099",
        tin: settings?.tin || "0012345678",
        footer: "Thank you for dining with us. This is a system-generated official tax invoice.",
      },
      lines: invoice.lines.map((l) => ({
        itemName: l.itemName,
        quantity: l.quantity,
        unitPrice: Number(l.unitPrice),
        subtotal: Number(l.subtotal),
      })),
      subtotal: Number(invoice.subtotal),
      discount: Number(invoice.discount),
      serviceCharge: Number(invoice.serviceCharge),
      tax: Number(invoice.tax),
      total: Number(invoice.total),
      paymentMethod: payment?.paymentMethod,
      paymentReference: payment?.reference,
    });

    reply.header("Content-Type", "application/pdf");
    reply.header("Content-Disposition", `inline; filename="${invoice.invoiceNumber}.pdf"`);
    return reply.send(pdfStream);
  });
}
