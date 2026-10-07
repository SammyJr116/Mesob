import React, { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, CreditCard, FileText, Ban, Tag, CheckCircle2 } from "lucide-react";
import { PageHeader, StatusBadge, SectionCard, EmptyState } from "@/components/ui/shared";
import Modal from "@/components/ui/Modal";
import { calcBill, etb } from "@/lib/format";
import { useData } from "@/lib/DataContext";
import { useRole } from "@/lib/RoleContext";
import { isPrivileged } from "@/lib/roles";
import { visibleOrders } from "@/lib/scope";
import { nextId, stamp } from "@/lib/datetime";
import { notifySuccess } from "@/lib/notify";

export default function OrderDetail() {
  const { id } = useParams();
  const { db, updateItem, insertItem } = useData();
  const { role } = useRole();
  const { restaurant } = db;
  /* Same scoping as the orders list, so a hand-typed URL cannot leak another
     waiter's order. */
  const found = visibleOrders(db.orders, role).find((o) => o.id === id);
  const [showBill, setShowBill] = useState(false);
  const [showDiscount, setShowDiscount] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const isManager = isPrivileged(role);

  if (!found) {
    return (
      <div>
        <Link to="/orders" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to orders
        </Link>
        <EmptyState
          title={`Order ${id} not found`}
          description="It may have been cancelled or the link is stale."
          icon={FileText}
          action={<Link to="/orders" className="btn-primary">Back to orders</Link>}
        />
      </div>
    );
  }

  const order = found;
  const bill = calcBill(order, restaurant);

  const logAction = (action, target, oldV, newV, reason) => {
    insertItem("activityLog", {
      id: nextId(db.activityLog, "L", 2),
      who: role || "system",
      when: stamp(),
      action,
      target,
      old: String(oldV ?? ""),
      new: String(newV ?? ""),
      reason: reason || "",
    });
  };

  const markTicketServed = (round) => {
    updateItem("orders", order.id, (o) => {
      const nextTickets = o.tickets.map((t) => (t.round === round ? { ...t, status: "Served" } : t));
      const allServed = nextTickets.every((t) => t.status === "Served" || t.status === "Rejected");
      return {
        ...o,
        tickets: nextTickets,
        status: allServed ? "Served" : o.status,
      };
    });
    logAction("Served ticket", order.id, "Ready", "Served", `Round ${round} served`);
    notifySuccess(`Ticket ${order.number}-${round} served`, `Delivered to ${order.table ? `Table ${order.table}` : "customer"}`);
  };

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
              action={
                <div className="flex items-center gap-2">
                  <StatusBadge status={t.status} />
                  {t.status === "Ready" && (
                    <button
                      onClick={() => markTicketServed(t.round)}
                      className="btn-primary text-xs bg-sage-600 hover:brightness-105"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Mark served
                    </button>
                  )}
                </div>
              }
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
                { label: "Ticket 1 preparing", time: order.tickets[0]?.status !== "Submitted" ? order.tickets[0]?.submittedAt : "—", done: order.tickets[0]?.status !== "Submitted" },
                { label: "Ticket 1 ready", time: ["Ready", "Served"].includes(order.tickets[0]?.status) ? order.tickets[0]?.submittedAt : "—", done: ["Ready", "Served"].includes(order.tickets[0]?.status) },
                { label: "Ticket 1 served", time: order.tickets[0]?.status === "Served" ? order.tickets[0]?.submittedAt : "—", done: order.tickets[0]?.status === "Served" },
                { label: "Payment recorded", time: order.status === "Completed" ? order.created : "—", done: order.status === "Completed" },
              ].map((s, i) => (
                <li key={i} className="flex items-center gap-3">
                  <span className={`flex h-6 w-6 items-center justify-center rounded-full ${s.done ? "bg-sage-100 text-sage-600" : "bg-secondary text-muted-foreground"}`}>
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
              {bill.discount > 0 && <Row label={`Discount (${order.discount}%)`} value={`−${etb(bill.discount)} ETB`} tone="berbere" />}
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
              <button onClick={() => setShowPayment(true)} className="btn-primary w-full"><CreditCard className="h-4 w-4" /> Record payment & invoice</button>
              {order.status !== "Cancelled" && order.status !== "Completed" && (
                <button onClick={() => setShowCancel(true)} className="btn-destructive w-full"><Ban className="h-4 w-4" /> Cancel order (reason required)</button>
              )}
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

      {showBill && <BillPreview order={order} bill={bill} restaurant={restaurant} onClose={() => setShowBill(false)} />}
      {showDiscount && (
        <DiscountModal
          order={order}
          onClose={() => setShowDiscount(false)}
          onApply={(pct, reason) => {
            updateItem("orders", order.id, { discount: Number(pct) });
            logAction("Applied discount", order.id, `${order.discount || 0}%`, `${pct}%`, reason);
            notifySuccess(`${pct}% discount applied to ${order.id}`);
            setShowDiscount(false);
          }}
        />
      )}
      {showCancel && (
        <ReasonModal
          title="Cancel order"
          description="Cancelling releases the table and stops all open tickets. This is recorded in the activity log."
          confirmLabel="Cancel order"
          destructive
          onClose={() => setShowCancel(false)}
          onConfirm={(reason) => {
            updateItem("orders", order.id, { status: "Cancelled", cancelReason: reason });
            if (order.table) {
              const t = db.tables.find((x) => x.number === order.table);
              if (t) updateItem("tables", t.id, { status: "Cleaning", order: null });
              insertItem("cleaningTasks", {
                id: nextId(db.cleaningTasks, "CL", 2),
                area: `Table ${order.table}`,
                task: "Reset cancelled table",
                assignee: "Unassigned",
                due: "Now",
                status: "Pending",
                type: "table",
                source: `Table ${order.table} cancelled`,
              });
            }
            logAction("Cancelled order", order.id, order.status, "Cancelled", reason);
            notifySuccess(`${order.id} cancelled`);
            setShowCancel(false);
          }}
        />
      )}
      {showPayment && (
        <PaymentModal
          bill={bill}
          methods={db.paymentMethods}
          onClose={() => setShowPayment(false)}
          onConfirm={(method, ref, amount) => {
            const issued = db.orders.map((o) => o.invoice).filter(Boolean).map((id) => ({ id }));
            const invoice = `${restaurant.invoicePrefix}${nextId(issued, restaurant.invoicePrefix, 6).replace(restaurant.invoicePrefix, "")}`;
            const change = Math.max(0, round2Safe(amount - bill.totalPayable));
            updateItem("orders", order.id, {
              status: "Completed",
              invoice,
              payments: [...(order.payments || []), { method, reference: ref, amount, change, at: stamp() }],
            });
            if (order.table) {
              const t = db.tables.find((x) => x.number === order.table);
              if (t) updateItem("tables", t.id, { status: "Cleaning", order: null });
              insertItem("cleaningTasks", {
                id: nextId(db.cleaningTasks, "CL", 2),
                area: `Table ${order.table}`,
                task: "Clean & reset table",
                assignee: "Unassigned",
                due: "Now",
                status: "Pending",
                type: "table",
                source: `Table ${order.table} paid`,
              });
            }
            logAction("Recorded payment", order.id, "", `${method} ${etb(amount)}${ref ? ` · ${ref}` : ""}`, "");
            notifySuccess(`Invoice ${invoice} issued`);
            setShowPayment(false);
          }}
        />
      )}
    </div>
  );
}

function round2Safe(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

function Row({ label, value, bold = false, muted = false, tone = "" }) {
  return (
    <div className="flex items-center justify-between">
      <dt className={muted ? "text-muted-foreground" : ""}>{label}</dt>
      <dd className={bold ? "font-display text-lg font-semibold" : tone === "berbere" ? "font-medium text-berbere-600" : "font-medium"}>{value}</dd>
    </div>
  );
}

function ReasonModal({ title, description, confirmLabel, destructive, onClose, onConfirm }) {
  const [reason, setReason] = useState("");
  return (
    <Modal
      title={title}
      description={description}
      size="sm"
      onClose={onClose}
      onSubmit={(e) => {
        e.preventDefault();
        if (!reason.trim()) return;
        onConfirm(reason.trim());
      }}
      footer={
        <>
          <button type="button" onClick={onClose} className="btn-outline">Back</button>
          <button type="submit" disabled={!reason.trim()} className={destructive ? "btn-destructive" : "btn-primary"}>{confirmLabel}</button>
        </>
      }
    >
      <label htmlFor="reason-input" className="mb-1 block text-sm font-medium">Reason (required)</label>
      <input id="reason-input" value={reason} onChange={(e) => setReason(e.target.value)} className="input-soft" aria-invalid={reason.length === 0 && undefined} />
      {!reason.trim() && <p role="status" className="mt-1 text-xs text-muted-foreground">Required before this action can run.</p>}
    </Modal>
  );
}

function PaymentModal({ bill, methods, onClose, onConfirm }) {
  const active = methods.filter((m) => m.active);
  const [method, setMethod] = useState(active[0]?.name || "Cash");
  const [ref, setRef] = useState("");
  const [amount, setAmount] = useState(String(bill.totalPayable));
  const needsRef = active.find((m) => m.name === method)?.referenceRequired;
  const numeric = Number(amount);
  const valid = Number.isFinite(numeric) && numeric >= bill.totalPayable && (!needsRef || ref.trim());
  return (
    <Modal
      title="Record payment"
      description={`Total payable ${etb(bill.totalPayable)} ETB · prices are tax-inclusive.`}
      size="sm"
      onClose={onClose}
      onSubmit={(e) => {
        e.preventDefault();
        if (!valid) return;
        onConfirm(method, ref.trim(), numeric);
      }}
      footer={
        <>
          <button type="button" onClick={onClose} className="btn-outline">Back</button>
          <button type="submit" disabled={!valid} className="btn-primary">Confirm</button>
        </>
      }
    >
      <label htmlFor="pay-method" className="mb-1 block text-sm font-medium">Method</label>
      <select id="pay-method" value={method} onChange={(e) => setMethod(e.target.value)} className="input-soft mb-3">
        {active.map((m) => <option key={m.name} value={m.name}>{m.name}</option>)}
      </select>
      {needsRef && (
        <>
          <label htmlFor="pay-ref" className="mb-1 block text-sm font-medium">Reference (required)</label>
          <input id="pay-ref" value={ref} onChange={(e) => setRef(e.target.value)} className="input-soft mb-3" />
        </>
      )}
      <label htmlFor="pay-amount" className="mb-1 block text-sm font-medium">Amount received</label>
      <input id="pay-amount" type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className="input-soft" />
      {numeric < bill.totalPayable && <p role="alert" className="mt-1 text-xs text-berbere-600">Below the total payable</p>}
      <p className="mt-3 rounded-lg bg-secondary/60 px-3 py-2 text-xs text-muted-foreground">
        A tax invoice is issued on confirmation. Change {numeric >= bill.totalPayable ? etb(numeric - bill.totalPayable) : "0.00"} ETB.
      </p>
    </Modal>
  );
}

function BillPreview({ order, bill, restaurant, onClose }) {
  return (
    <Modal title="ደረሰኝ · Bill Preview" description={`${order.id} · no invoice number until payment`} size="md" onClose={onClose} footer={<button type="button" onClick={onClose} className="btn-outline">Close</button>}>
      <div className="tibeb-border-top -mt-2 mb-3" />
      <div className="mb-3 text-center">
        <p className="font-display text-xl font-semibold text-primary">{restaurant.name}</p>
        <p className="text-xs text-muted-foreground">{restaurant.address} · {restaurant.phone}</p>
        <p className="text-xs text-muted-foreground">TIN: {restaurant.tin}</p>
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
        <Row label="Item subtotal" value={etb(bill.itemSubtotal)} />
        <Row label="Service charge" value={etb(bill.serviceCharge)} muted />
        {bill.discount > 0 && <Row label="Discount" value={`−${etb(bill.discount)}`} tone="berbere" />}
        <Row label="Total payable" value={etb(bill.totalPayable)} bold />
      </dl>
      <p className="text-center text-xs text-muted-foreground">{restaurant.footer}</p>
    </Modal>
  );
}

function DiscountModal({ order, onClose, onApply }) {
  const [pct, setPct] = useState(order.discount || 0);
  const [reason, setReason] = useState("");
  const n = Number(pct);
  const valid = Number.isFinite(n) && n >= 0 && n <= 100 && reason.trim();
  return (
    <Modal
      title="Apply discount"
      description="Only a Manager can apply a percentage discount. It does not reduce the service charge. Capped at 100%."
      size="sm"
      onClose={onClose}
      onSubmit={(e) => {
        e.preventDefault();
        if (!valid) return;
        onApply(n, reason.trim());
      }}
      footer={
        <>
          <button type="button" onClick={onClose} className="btn-outline">Cancel</button>
          <button type="submit" className="btn-primary" disabled={!valid}>Apply</button>
        </>
      }
    >
      <label htmlFor="discount-pct" className="mb-1 block text-sm font-medium">Discount %</label>
      <input id="discount-pct" type="number" min={0} max={100} value={pct} onChange={(e) => setPct(e.target.value)} className="input-soft mb-3" />
      <label htmlFor="discount-reason" className="mb-1 block text-sm font-medium">Reason (required)</label>
      <input id="discount-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Regular customer" className="input-soft" />
    </Modal>
  );
}