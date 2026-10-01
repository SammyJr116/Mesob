import React, { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, CreditCard, FileText, Ban, Tag, CheckCircle2 } from "lucide-react";
import { PageHeader, StatusBadge, SectionCard } from "@/components/ui/shared";
import { orders, restaurant, calcBill, etb } from "@/lib/mockData";

export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const order = orders.find((o) => o.id === id) || orders[0];
  const [showBill, setShowBill] = useState(false);
  const [showDiscount, setShowDiscount] = useState(false);
  const bill = calcBill(order);
  const isManager = true; // demo

  return (
    <div>
      <Link to="/orders" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to orders
      </Link>

      <PageHeader
        title={order.id}
        subtitle={`${order.type} · ${order.table ? `Table ${order.table}` : "Takeaway"} · Waiter: ${order.waiter} · Created ${order.created}`}
        actions={<StatusBadge status={order.status} />}
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          {order.tickets.map((t) => (
            <SectionCard
              key={t.round}
              title={`Ticket ${order.number}-${t.round}`}
              action={<StatusBadge status={t.status} />}
            >
              <div className="space-y-2">
                {t.items.map((it, i) => (
                  <div key={i} className="flex items-start justify-between rounded-lg border border-border bg-secondary/30 px-3 py-2.5">
                    <div>
                      <p className="font-medium">{it.qty}× {it.name} {it.variant && <span className="text-muted-foreground">· {it.variant}</span>}</p>
                      {it.addons?.length > 0 && <p className="text-xs text-muted-foreground">+ {it.addons.join(", ")}</p>}
                      {it.note && <p className="text-xs text-muted-foreground">Note: {it.note}</p>}
                    </div>
                    <span className="font-medium">{etb(it.price * it.qty)} ETB</span>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs text-muted-foreground">Sent at {t.submittedAt} · {t.status}</p>
            </SectionCard>
          ))}

          <SectionCard title="Status timeline">
            <ol className="space-y-3 text-sm">
              {[
                { label: "Order created", time: order.created, done: true },
                { label: "Ticket 1 submitted", time: order.tickets[0]?.submittedAt, done: true },
                { label: "Ticket 1 preparing", time: "19:20", done: order.tickets[0]?.status !== "Submitted" },
                { label: "Ticket 1 ready", time: "19:35", done: ["Ready", "Served"].includes(order.tickets[0]?.status) },
                { label: "Ticket 1 served", time: "19:40", done: order.tickets[0]?.status === "Served" },
                { label: "Payment recorded", time: "—", done: order.status === "Completed" },
              ].map((s, i) => (
                <li key={i} className="flex items-center gap-3">
                  <span className={`flex h-6 w-6 items-center justify-center rounded-full ${s.done ? "bg-emerald-100 text-emerald-600" : "bg-secondary text-muted-foreground"}`}>
                    {s.done ? <CheckCircle2 className="h-3.5 w-3.5" /> : <span className="h-2 w-2 rounded-full bg-current" />}
                  </span>
                  <span className={s.done ? "font-medium" : "text-muted-foreground"}>{s.label}</span>
                  <span className="ml-auto text-xs text-muted-foreground">{s.time}</span>
                </li>
              ))}
            </ol>
          </SectionCard>
        </div>

        <div className="space-y-5">
          <SectionCard title="Bill summary">
            <dl className="space-y-2 text-sm">
              <Row label="Item subtotal" value={`${etb(bill.itemSubtotal)} ETB`} />
              <Row label={`Service charge (${restaurant.serviceCharge}%)`} value={`${etb(bill.serviceCharge)} ETB`} muted />
              {bill.discount > 0 && <Row label={`Discount (${order.discount}%)`} value={`−${etb(bill.discount)} ETB`} tone="rose" />}
              <div className="border-t border-border pt-2">
                <Row label="Total payable" value={`${etb(bill.totalPayable)} ETB`} bold />
              </div>
              <Row label="Taxable amount" value={`${etb(bill.taxableAmount)} ETB`} muted />
              <Row label={`Tax (${restaurant.taxRate}%, extracted)`} value={`${etb(bill.taxPortion)} ETB`} muted />
              <Row label="Net sales" value={`${etb(bill.netSales)} ETB`} muted />
            </dl>
            <p className="mt-3 rounded-lg bg-secondary/60 px-3 py-2 text-xs text-muted-foreground">
              Prices are tax-inclusive. Service charge is on the full subtotal before discount and is not taxed.
            </p>
            <div className="mt-4 space-y-2">
              <button onClick={() => setShowBill(true)} className="btn-outline w-full"><FileText className="h-4 w-4" /> Bill preview</button>
              {isManager && <button onClick={() => setShowDiscount(true)} className="btn-ghost w-full"><Tag className="h-4 w-4" /> Apply discount (Manager)</button>}
              <button onClick={() => navigate(`/orders/${order.id}`)} className="btn-primary w-full"><CreditCard className="h-4 w-4" /> Record payment & invoice</button>
              <button className="btn-destructive w-full"><Ban className="h-4 w-4" /> Cancel order (reason required)</button>
            </div>
          </SectionCard>

          <SectionCard title="Order info">
            <dl className="space-y-2 text-sm">
              <Row label="Customer" value={order.customer || "Walk-in (no record)"} />
              <Row label="Guests" value={order.guests} />
              <Row label="Notes" value={order.notes || "—"} />
              <Row label="Invoice" value={order.invoice || "Not issued"} />
            </dl>
          </SectionCard>
        </div>
      </div>

      {showBill && <BillPreview order={order} bill={bill} onClose={() => setShowBill(false)} />}
      {showDiscount && <DiscountModal order={order} onClose={() => setShowDiscount(false)} />}
    </div>
  );
}

function Row({ label, value, bold, muted, tone }) {
  return (
    <div className="flex items-center justify-between">
      <dt className={muted ? "text-muted-foreground" : ""}>{label}</dt>
      <dd className={bold ? "font-display text-lg font-semibold" : tone === "rose" ? "font-medium text-rose-600" : "font-medium"}>{value}</dd>
    </div>
  );
}

function BillPreview({ order, bill, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-card p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 text-center">
          <p className="font-display text-xl font-semibold">{restaurant.name}</p>
          <p className="text-xs text-muted-foreground">{restaurant.address} · {restaurant.phone}</p>
          <p className="text-xs text-muted-foreground">TIN: {restaurant.tin}</p>
        </div>
        <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
          <span>Bill preview (no invoice no.)</span>
          <span>{order.id}</span>
        </div>
        <div className="space-y-1.5 border-y border-dashed border-border py-3 text-sm">
          {bill.lines.map((l, i) => (
            <div key={i} className="flex justify-between">
              <span>{l.qty}× {l.name} {l.variant && `(${l.variant})`}</span>
              <span>{etb(l.lineTotal)}</span>
            </div>
          ))}
        </div>
        <dl className="space-y-1 py-3 text-sm">
          <Row label="Item subtotal" value={`${etb(bill.itemSubtotal)}`} />
          <Row label="Service charge" value={`${etb(bill.serviceCharge)}`} muted />
          {bill.discount > 0 && <Row label="Discount" value={`−${etb(bill.discount)}`} tone="rose" />}
          <Row label="Total payable" value={`${etb(bill.totalPayable)}`} bold />
        </dl>
        <p className="text-center text-xs text-muted-foreground">{restaurant.footer}</p>
        <button onClick={onClose} className="btn-outline mt-4 w-full">Close</button>
      </div>
    </div>
  );
}

function DiscountModal({ order, onClose }) {
  const [pct, setPct] = useState(order.discount || 0);
  const [reason, setReason] = useState("");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl bg-card p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="mb-4 font-display text-lg font-semibold">Apply discount</h3>
        <label className="text-sm font-medium">Discount %</label>
        <input type="number" min={0} max={100} value={pct} onChange={(e) => setPct(e.target.value)} className="input-soft mt-1 mb-3" />
        <label className="text-sm font-medium">Reason (required)</label>
        <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Regular customer" className="input-soft mt-1 mb-4" />
        <p className="mb-4 rounded-lg bg-secondary/60 px-3 py-2 text-xs text-muted-foreground">Only a Manager can apply a percentage discount. It does not reduce the service charge. Capped at 100%.</p>
        <div className="flex gap-2">
          <button onClick={onClose} className="btn-outline flex-1">Cancel</button>
          <button onClick={onClose} className="btn-primary flex-1" disabled={!reason}>Apply</button>
        </div>
      </div>
    </div>
  );
}