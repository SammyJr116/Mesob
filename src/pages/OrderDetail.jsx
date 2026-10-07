import React, { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, CreditCard, FileText, Ban, Tag, CheckCircle2, RotateCcw, Printer, MapPin, UserCheck, XCircle } from "lucide-react";
import { PageHeader, StatusBadge, SectionCard, EmptyState } from "@/components/ui/shared";
import Modal from "@/components/ui/Modal";
import { calcBill, calcCreditNote, etb } from "@/lib/format";
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
  const [showCreditNote, setShowCreditNote] = useState(false);
  const [showMoveTable, setShowMoveTable] = useState(false);
  const [showReassignWaiter, setShowReassignWaiter] = useState(false);
  const [itemToCancel, setItemToCancel] = useState(null);
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
  const orderCreditNotes = (db.creditNotes || []).filter(
    (cn) => cn.orderId === order.id || (order.invoice && cn.invoiceId === order.invoice)
  );
  const totalCreditedRefund = orderCreditNotes.reduce((s, cn) => s + (cn.totalRefund || 0), 0);

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

  const handleMoveTable = (newTableNum) => {
    const oldTableNum = order.table;
    updateItem("orders", order.id, { table: newTableNum });
    if (oldTableNum) {
      const oldT = db.tables.find((t) => String(t.number) === String(oldTableNum));
      if (oldT) updateItem("tables", oldT.id, { status: "Cleaning", order: null, waiter: null });
    }
    const newT = db.tables.find((t) => String(t.number) === String(newTableNum));
    if (newT) updateItem("tables", newT.id, { status: "Occupied", order: order.id, waiter: order.waiter });

    insertItem("cleaningTasks", {
      id: nextId(db.cleaningTasks, "CL", 2),
      area: `Table ${oldTableNum} (Moved)`,
      task: `Sanitize & reset Table ${oldTableNum}`,
      assignee: "Unassigned",
      due: "Now",
      status: "Pending",
      type: "table",
      source: `Order ${order.id} moved to Table ${newTableNum}`,
    });
    logAction("Moved table", order.id, `Table ${oldTableNum}`, `Table ${newTableNum}`, "Customer requested table change");
    notifySuccess(`Order moved to Table ${newTableNum}`);
    setShowMoveTable(false);
  };

  const handleReassignWaiter = (newWaiter, reason) => {
    const oldWaiter = order.waiter;
    updateItem("orders", order.id, { waiter: newWaiter });
    if (order.table) {
      const tbl = db.tables.find((t) => String(t.number) === String(order.table));
      if (tbl) updateItem("tables", tbl.id, { waiter: newWaiter });
    }
    logAction("Reassigned waiter", order.id, oldWaiter, newWaiter, reason || "Manager reassignment");
    notifySuccess(`Order reassigned to ${newWaiter}`);
    setShowReassignWaiter(false);
  };

  const handleCancelItem = (reason, recordWaste) => {
    if (!itemToCancel) return;
    const { item, itemIndex, ticketRound, ticketStatus } = itemToCancel;
    updateItem("orders", order.id, (o) => ({
      ...o,
      tickets: o.tickets.map((tk) => {
        if (tk.round !== ticketRound) return tk;
        return {
          ...tk,
          items: tk.items.map((it, idx) => {
            if (idx !== itemIndex) return it;
            return { ...it, cancelled: true, cancelReason: reason };
          }),
        };
      }),
    }));

    if (recordWaste) {
      insertItem("stockMovements", {
        id: nextId(db.stockMovements, "SM", 2),
        item: item.name,
        qty: -Number(item.qty || 1),
        type: "Waste",
        date: stamp(),
        user: role || "Manager",
        reason: `Cancelled item on ${order.id} (${ticketStatus}): ${reason}`,
      });
    }

    logAction("Cancelled line item", order.id, `${item.qty}× ${item.name}`, "Cancelled", reason);
    notifySuccess(`Cancelled ${item.qty}× ${item.name}`);
    setItemToCancel(null);
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
                {t.items.map((it, i) => {
                  const canCancelItem =
                    !it.cancelled &&
                    order.status !== "Completed" &&
                    order.status !== "Cancelled" &&
                    (t.status === "Submitted"
                      ? (role?.toLowerCase() === "waiter" || isManager || order.waiter === role)
                      : isManager);

                  if (it.cancelled) {
                    return (
                      <div key={i} className="flex items-start justify-between rounded-lg border border-dashed border-border bg-secondary/20 px-3 py-2.5 opacity-60">
                        <div>
                          <p className="font-medium line-through">{it.qty}× {it.name} {it.variant && <span>· {it.variant}</span>}</p>
                          <span className="inline-block mt-0.5 rounded bg-berbere-100 dark:bg-berbere-950/50 px-1.5 py-0.5 text-[10px] font-semibold text-berbere-700">
                            Cancelled: {it.cancelReason || "Cancelled"}
                          </span>
                        </div>
                        <span className="text-xs line-through text-muted-foreground">{etb(it.price * it.qty)} ETB</span>
                      </div>
                    );
                  }

                  return (
                    <div key={i} className="flex items-start justify-between rounded-lg border border-border bg-secondary/30 px-3 py-2.5">
                      <div>
                        <p className="font-medium">{it.qty}× {it.name} {it.variant && <span className="text-muted-foreground">· {it.variant}</span>}</p>
                        {it.addons?.length > 0 && <p className="text-xs text-muted-foreground">+ {it.addons.join(", ")}</p>}
                        {it.note && <p className="text-xs text-muted-foreground">Note: {it.note}</p>}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-medium">{etb(it.price * it.qty)} ETB</span>
                        {canCancelItem && (
                          <button
                            type="button"
                            onClick={() => setItemToCancel({ item: it, itemIndex: i, ticketRound: t.round, ticketStatus: t.status })}
                            className="rounded p-1 text-muted-foreground hover:text-berbere-600 hover:bg-berbere-50 transition-colors"
                            title="Cancel line item"
                          >
                            <XCircle className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
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
            {orderCreditNotes.length > 0 && (
              <div className="mt-3 rounded-xl border border-berbere-200 bg-berbere-50/70 p-3 text-xs space-y-1.5">
                <div className="flex items-center justify-between font-semibold text-berbere-800">
                  <span>Credit Notes Issued ({orderCreditNotes.length})</span>
                  <span>−{etb(totalCreditedRefund)} ETB</span>
                </div>
                {orderCreditNotes.map((cn) => (
                  <div key={cn.id} className="flex items-center justify-between text-muted-foreground border-t border-berbere-200/50 pt-1">
                    <span>{cn.id} · {cn.refundMethod} ({cn.reason})</span>
                    <span className="font-medium text-berbere-700">−{etb(cn.totalRefund)} ETB</span>
                  </div>
                ))}
              </div>
            )}

            <p className="mt-3 rounded-lg bg-secondary/60 px-3 py-2 text-xs text-muted-foreground">
              Prices are tax-inclusive. Service charge is on the full subtotal before discount and is not taxed.
            </p>

            <div className="mt-4 space-y-2">
              <button onClick={() => setShowBill(true)} className="btn-outline w-full">
                <FileText className="h-4 w-4" /> {order.invoice ? "View tax invoice" : "Bill preview"}
              </button>
              {order.table && order.status !== "Completed" && order.status !== "Cancelled" && (
                <button onClick={() => setShowMoveTable(true)} className="btn-outline w-full text-xs">
                  <MapPin className="h-4 w-4" /> Move table
                </button>
              )}
              {isManager && order.status !== "Completed" && (
                <button onClick={() => setShowDiscount(true)} className="btn-ghost w-full">
                  <Tag className="h-4 w-4" /> Apply discount (Manager)
                </button>
              )}
              {order.status !== "Completed" && order.status !== "Cancelled" && (
                <button onClick={() => setShowPayment(true)} className="btn-primary w-full">
                  <CreditCard className="h-4 w-4" /> Record payment & invoice
                </button>
              )}
              {isManager && order.invoice && order.status === "Completed" && (
                <button onClick={() => setShowCreditNote(true)} className="btn-outline w-full text-xs text-berbere-700 hover:bg-berbere-50 border-berbere-300">
                  <RotateCcw className="h-4 w-4" /> Issue credit note (Manager)
                </button>
              )}
              {order.status !== "Cancelled" && order.status !== "Completed" && (
                <button onClick={() => setShowCancel(true)} className="btn-destructive w-full">
                  <Ban className="h-4 w-4" /> Cancel order (reason required)
                </button>
              )}
            </div>
          </SectionCard>

          <SectionCard title="Order info">
            <dl className="space-y-2 text-sm">
              <Row label="Customer" value={order.customer || "Walk-in (no record)"} />
              <Row label="Guests" value={order.guests} />
              <Row
                label="Table"
                value={
                  order.table ? (
                    <span className="inline-flex items-center gap-2">
                      <span>Table {order.table}</span>
                      {order.status !== "Completed" && order.status !== "Cancelled" && (
                        <button
                          type="button"
                          onClick={() => setShowMoveTable(true)}
                          className="text-xs text-primary font-medium hover:underline inline-flex items-center gap-0.5"
                        >
                          <MapPin className="h-3 w-3" /> Move
                        </button>
                      )}
                    </span>
                  ) : "Takeaway"
                }
              />
              <Row
                label="Waiter"
                value={
                  <span className="inline-flex items-center gap-2">
                    <span>{order.waiter}</span>
                    {isManager && order.status !== "Completed" && order.status !== "Cancelled" && (
                      <button
                        type="button"
                        onClick={() => setShowReassignWaiter(true)}
                        className="text-xs text-primary font-medium hover:underline inline-flex items-center gap-0.5"
                      >
                        <UserCheck className="h-3 w-3" /> Reassign
                      </button>
                    )}
                  </span>
                }
              />
              <Row label="Notes" value={order.notes || "—"} />
              <Row label="Invoice" value={order.invoice || "Not issued"} />
              {order.buyerName && <Row label="Buyer" value={order.buyerName} />}
              {order.buyerTin && <Row label="Buyer TIN" value={order.buyerTin} />}
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
          onConfirm={(method, ref, amount, buyerInfo) => {
            const issued = db.orders.map((o) => o.invoice).filter(Boolean).map((id) => ({ id }));
            const invoice = `${restaurant.invoicePrefix}${nextId(issued, restaurant.invoicePrefix, 6).replace(restaurant.invoicePrefix, "")}`;
            const change = Math.max(0, round2Safe(amount - bill.totalPayable));
            updateItem("orders", order.id, {
              status: "Completed",
              invoice,
              buyerName: buyerInfo?.buyerName || null,
              buyerTin: buyerInfo?.buyerTin || null,
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
      {showCreditNote && (
        <CreditNoteModal
          order={order}
          bill={bill}
          restaurant={restaurant}
          existingCreditNotes={orderCreditNotes}
          onClose={() => setShowCreditNote(false)}
          onConfirm={(creditData) => {
            const id = nextId(db.creditNotes || [], "CN", 6);
            const cnRecord = {
              id,
              orderId: order.id,
              invoiceId: order.invoice,
              businessDate: db.restaurant?.currentBusinessDate || new Date().toISOString().slice(0, 10),
              issuedAt: stamp(),
              issuedBy: role || "manager",
              ...creditData,
            };
            insertItem("creditNotes", cnRecord);
            logAction("Issued credit note", order.id, order.invoice, `${id} · Refund ${etb(creditData.totalRefund)} ETB`, creditData.reason);
            notifySuccess(`Credit note ${id} issued for ${etb(creditData.totalRefund)} ETB`);
            setShowCreditNote(false);
          }}
        />
      )}
      {showMoveTable && (
        <MoveTableModal
          order={order}
          tables={db.tables || []}
          onClose={() => setShowMoveTable(false)}
          onConfirm={handleMoveTable}
        />
      )}
      {showReassignWaiter && (
        <ReassignWaiterModal
          order={order}
          users={db.users || []}
          employees={db.employees || []}
          onClose={() => setShowReassignWaiter(false)}
          onConfirm={handleReassignWaiter}
        />
      )}
      {itemToCancel && (
        <CancelItemModal
          target={itemToCancel}
          onClose={() => setItemToCancel(null)}
          onConfirm={handleCancelItem}
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
  const [buyerName, setBuyerName] = useState("");
  const [buyerTin, setBuyerTin] = useState("");
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
        onConfirm(method, ref.trim(), numeric, { buyerName: buyerName.trim(), buyerTin: buyerTin.trim() });
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
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div>
          <label htmlFor="buyer-name" className="mb-1 block text-xs font-medium text-muted-foreground">Buyer name (optional)</label>
          <input id="buyer-name" value={buyerName} onChange={(e) => setBuyerName(e.target.value)} placeholder="Company / Individual" className="input-soft text-xs" />
        </div>
        <div>
          <label htmlFor="buyer-tin" className="mb-1 block text-xs font-medium text-muted-foreground">Buyer TIN (optional)</label>
          <input id="buyer-tin" value={buyerTin} onChange={(e) => setBuyerTin(e.target.value)} placeholder="TIN Number" className="input-soft text-xs" />
        </div>
      </div>
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
  const isInvoiced = Boolean(order.invoice);
  return (
    <Modal
      title={isInvoiced ? "ይፋዊ የታክስ ደረሰኝ · Official Tax Invoice" : "ደረሰኝ · Bill Preview"}
      description={isInvoiced ? `Invoice ${order.invoice} · ${order.id}` : `${order.id} · no invoice number until payment`}
      size="md"
      onClose={onClose}
      footer={
        <div className="flex w-full items-center justify-between">
          <button type="button" onClick={() => window.print()} className="btn-primary flex items-center gap-1.5 text-xs">
            <Printer className="h-4 w-4" /> Print / Save PDF
          </button>
          <button type="button" onClick={onClose} className="btn-outline">Close</button>
        </div>
      }
    >
      <div className="tibeb-border-top -mt-2 mb-3" />
      <div className="mb-3 text-center">
        <p className="font-display text-xl font-semibold text-primary">{restaurant.name}</p>
        <p className="text-xs text-muted-foreground">{restaurant.address} · {restaurant.phone}</p>
        <p className="text-xs text-muted-foreground font-medium">TIN: {restaurant.tin}</p>
        {isInvoiced && <p className="mt-1 text-xs font-bold text-forest-800">TAX INVOICE: {order.invoice}</p>}
      </div>

      {(order.buyerName || order.buyerTin) && (
        <div className="mb-3 rounded-lg bg-secondary/50 p-2 text-xs">
          {order.buyerName && <p><span className="font-semibold">Buyer:</span> {order.buyerName}</p>}
          {order.buyerTin && <p><span className="font-semibold">Buyer TIN:</span> {order.buyerTin}</p>}
        </div>
      )}

      <div className="space-y-1.5 border-y border-dashed border-border py-3 text-sm">
        {bill.lines.map((l, i) => (
          <div key={i} className="flex justify-between">
            <span>{l.qty}× {l.name} {l.variant && `(${l.variant})`}</span>
            <span>{etb(l.lineTotal)} ETB</span>
          </div>
        ))}
      </div>
      <dl className="space-y-1 py-3 text-sm">
        <Row label="Item subtotal" value={`${etb(bill.itemSubtotal)} ETB`} />
        <Row label={`Service charge (${restaurant.serviceCharge}%)`} value={`${etb(bill.serviceCharge)} ETB`} muted />
        {bill.discount > 0 && <Row label={`Discount (${order.discount}%)`} value={`−${etb(bill.discount)} ETB`} tone="berbere" />}
        <Row label="Total payable" value={`${etb(bill.totalPayable)} ETB`} bold />
        <div className="border-t border-border/60 pt-1 mt-1 text-xs text-muted-foreground">
          <Row label="Taxable amount (excl. service)" value={`${etb(bill.taxableAmount)} ETB`} muted />
          <Row label={`Tax portion (${restaurant.taxRate}% extracted)`} value={`${etb(bill.taxPortion)} ETB`} muted />
          <Row label="Net sales" value={`${etb(bill.netSales)} ETB`} muted />
        </div>
      </dl>
      <p className="text-center text-xs text-muted-foreground pt-2">{restaurant.footer}</p>
    </Modal>
  );
}

function CreditNoteModal({ order, bill, restaurant, existingCreditNotes, onClose, onConfirm }) {
  const totalAlreadyCredited = existingCreditNotes.reduce((sum, cn) => sum + (cn.creditedItemAmount || 0), 0);
  const maxCreditable = Math.max(0, round2Safe(bill.itemSubtotal - totalAlreadyCredited));
  const [type, setType] = useState("Full");
  const [amount, setAmount] = useState(String(maxCreditable));
  const [creditService, setCreditService] = useState(true);
  const [method, setMethod] = useState("Cash");
  const [reason, setReason] = useState("");

  const numAmount = type === "Full" ? maxCreditable : Number(amount);
  const preview = calcCreditNote(bill, numAmount, creditService, restaurant.taxRate);
  const valid = Number.isFinite(numAmount) && numAmount > 0 && numAmount <= maxCreditable && reason.trim();

  return (
    <Modal
      title="የክሬዲት ማስታወሻ · Issue Credit Note"
      description={`Invoice ${order.invoice} · Max item credit ${etb(maxCreditable)} ETB`}
      size="md"
      onClose={onClose}
      onSubmit={(e) => {
        e.preventDefault();
        if (!valid) return;
        onConfirm({
          type,
          creditedItemAmount: preview.creditedItemAmount,
          taxReversed: preview.taxReversed,
          netSalesDeduction: preview.netSalesDeduction,
          serviceDeduction: preview.serviceDeduction,
          totalRefund: preview.totalRefund,
          refundMethod: method,
          reason: reason.trim(),
        });
      }}
      footer={
        <>
          <button type="button" onClick={onClose} className="btn-outline">Back</button>
          <button type="submit" disabled={!valid} className="btn-destructive">Issue Credit Note</button>
        </>
      }
    >
      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-sm font-medium">Credit Type</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="radio" name="cn-type" checked={type === "Full"} onChange={() => setType("Full")} />
              Full Remaining ({etb(maxCreditable)} ETB)
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="radio" name="cn-type" checked={type === "Partial"} onChange={() => setType("Partial")} />
              Partial Amount
            </label>
          </div>
        </div>

        {type === "Partial" && (
          <div>
            <label htmlFor="cn-amount" className="mb-1 block text-sm font-medium">Credited Item Amount (ETB)</label>
            <input
              id="cn-amount"
              type="number"
              min="0.01"
              max={maxCreditable}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="input-soft"
            />
            {numAmount > maxCreditable && (
              <p className="mt-1 text-xs text-berbere-600">Cannot exceed remaining subtotal {etb(maxCreditable)} ETB</p>
            )}
          </div>
        )}

        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={creditService}
            onChange={(e) => setCreditService(e.target.checked)}
            className="rounded"
          />
          Reverse proportional service charge ({restaurant.serviceCharge}%)
        </label>

        <div>
          <label htmlFor="cn-method" className="mb-1 block text-sm font-medium">Refund Method</label>
          <select id="cn-method" value={method} onChange={(e) => setMethod(e.target.value)} className="input-soft">
            <option value="Cash">Cash</option>
            <option value="Bank Transfer">Bank Transfer</option>
            <option value="Mobile Money">Mobile Money</option>
            <option value="Card">Card</option>
          </select>
        </div>

        <div>
          <label htmlFor="cn-reason" className="mb-1 block text-sm font-medium">Reason for correction (required)</label>
          <input
            id="cn-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Billed wrong item, returned cold tea"
            className="input-soft"
          />
          {!reason.trim() && <p className="mt-1 text-xs text-muted-foreground">Reason is required by PRD 11.7.4.</p>}
        </div>

        <div className="rounded-xl border border-border bg-secondary/40 p-3 text-xs space-y-1">
          <div className="flex justify-between font-medium">
            <span>Item credit amount:</span>
            <span>{etb(preview.creditedItemAmount)} ETB</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Extracted tax reversed ({restaurant.taxRate}%):</span>
            <span>−{etb(preview.taxReversed)} ETB</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Net sales reduction:</span>
            <span>−{etb(preview.netSalesDeduction)} ETB</span>
          </div>
          {preview.serviceDeduction > 0 && (
            <div className="flex justify-between text-muted-foreground">
              <span>Service charge refund:</span>
              <span>{etb(preview.serviceDeduction)} ETB</span>
            </div>
          )}
          <div className="border-t border-border pt-1 flex justify-between font-semibold text-sm text-foreground">
            <span>Total customer refund:</span>
            <span className="text-berbere-600">{etb(preview.totalRefund)} ETB</span>
          </div>
        </div>
      </div>
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

function MoveTableModal({ order, tables, onClose, onConfirm }) {
  const candidateTables = (tables || []).filter(
    (t) => t.status === "Available" && !t.reservation && String(t.number) !== String(order.table)
  );
  const [selectedTable, setSelectedTable] = useState(candidateTables[0]?.number || "");

  return (
    <Modal
      title="Move order to another table"
      description={`Transfer active order ${order.id} from Table ${order.table} to an available table.`}
      size="sm"
      onClose={onClose}
      onSubmit={(e) => {
        e.preventDefault();
        if (!selectedTable) return;
        onConfirm(selectedTable);
      }}
      footer={
        <>
          <button type="button" onClick={onClose} className="btn-outline">Cancel</button>
          <button type="submit" className="btn-primary" disabled={!selectedTable}>Move table</button>
        </>
      }
    >
      <div className="space-y-3">
        {candidateTables.length === 0 ? (
          <p className="text-sm text-berbere-600">No tables are currently available without reservations.</p>
        ) : (
          <div>
            <label htmlFor="move-table-select" className="mb-1 block text-sm font-medium">Select destination table</label>
            <select
              id="move-table-select"
              value={selectedTable}
              onChange={(e) => setSelectedTable(e.target.value)}
              className="input-soft"
            >
              {candidateTables.map((t) => (
                <option key={t.id} value={t.number}>
                  Table {t.number} ({t.seats} seats · {t.section})
                </option>
              ))}
            </select>
            <p className="mt-2 text-xs text-muted-foreground">
              Moving will mark Table {order.table} as "Cleaning" and create a sanitize task. Table {selectedTable} will become "Occupied".
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
}

function ReassignWaiterModal({ order, users, employees, onClose, onConfirm }) {
  const waiterOptions = Array.from(
    new Set([
      ...(users || [])
        .filter((u) => u.status === "Active" && ["waiter", "manager"].includes(u.role?.toLowerCase()))
        .map((u) => u.fullName || u.username),
      ...(employees || [])
        .filter((e) => e.status === "Active" && e.role?.toLowerCase() === "waiter")
        .map((e) => e.name),
    ])
  ).filter(Boolean);

  const [waiter, setWaiter] = useState(waiterOptions[0] || order.waiter);
  const [reason, setReason] = useState("");

  return (
    <Modal
      title="Reassign order waiter"
      description={`Change assigned staff for order ${order.id}. Currently assigned: ${order.waiter}.`}
      size="sm"
      onClose={onClose}
      onSubmit={(e) => {
        e.preventDefault();
        if (!waiter || waiter === order.waiter) return;
        onConfirm(waiter, reason.trim());
      }}
      footer={
        <>
          <button type="button" onClick={onClose} className="btn-outline">Cancel</button>
          <button type="submit" className="btn-primary" disabled={!waiter || waiter === order.waiter}>Reassign</button>
        </>
      }
    >
      <div className="space-y-3">
        <div>
          <label htmlFor="reassign-waiter-select" className="mb-1 block text-sm font-medium">New assigned waiter</label>
          <select
            id="reassign-waiter-select"
            value={waiter}
            onChange={(e) => setWaiter(e.target.value)}
            className="input-soft"
          >
            {waiterOptions.map((w) => (
              <option key={w} value={w}>
                {w} {w === order.waiter ? "(Current)" : ""}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="reassign-reason" className="mb-1 block text-sm font-medium">Reason (optional)</label>
          <input
            id="reassign-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Shift change, section handover"
            className="input-soft"
          />
        </div>
      </div>
    </Modal>
  );
}

function CancelItemModal({ target, onClose, onConfirm }) {
  const [reason, setReason] = useState("");
  const inPrepOrReady = ["Preparing", "Ready", "Served"].includes(target.ticketStatus);
  const [recordWaste, setRecordWaste] = useState(inPrepOrReady);
  const valid = reason.trim().length > 0;

  return (
    <Modal
      title="Cancel line item"
      description={`Cancel ${target.item.qty}× ${target.item.name} from Ticket round ${target.ticketRound} (${target.ticketStatus}).`}
      size="sm"
      onClose={onClose}
      onSubmit={(e) => {
        e.preventDefault();
        if (!valid) return;
        onConfirm(reason.trim(), recordWaste);
      }}
      footer={
        <>
          <button type="button" onClick={onClose} className="btn-outline">Back</button>
          <button type="submit" className="btn-destructive" disabled={!valid}>Cancel item</button>
        </>
      }
    >
      <div className="space-y-3">
        <div>
          <label htmlFor="cancel-item-reason" className="mb-1 block text-sm font-medium">Reason for cancellation (required)</label>
          <input
            id="cancel-item-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Customer changed mind, incorrect entry"
            className="input-soft"
            autoFocus
          />
        </div>
        {inPrepOrReady && (
          <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-2.5 text-xs space-y-1.5">
            <p className="font-medium text-amber-900 dark:text-amber-200">
              Item was already in preparation ({target.ticketStatus})
            </p>
            <label className="flex items-center gap-2 cursor-pointer text-amber-950 dark:text-amber-300">
              <input
                type="checkbox"
                checked={recordWaste}
                onChange={(e) => setRecordWaste(e.target.checked)}
                className="rounded"
              />
              Record as kitchen waste in stock movements
            </label>
          </div>
        )}
      </div>
    </Modal>
  );
}