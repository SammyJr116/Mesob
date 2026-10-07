import React, { useMemo, useState } from "react";
import { Volume2, VolumeX, Clock, AlertTriangle, Play, CheckCircle2, X } from "lucide-react";
import { PageHeader } from "@/components/ui/shared";
import Modal from "@/components/ui/Modal";
import { useData } from "@/lib/DataContext";
import { minutesSince } from "@/lib/datetime";
import { notifySuccess, playAlertChime } from "@/lib/notify";
import { cn } from "@/lib/utils";

const OPEN = ["Submitted", "Preparing", "Ready"];

const STATUS_LABELS = {
  Submitted: { amharic: "አዲስ ትዕዛዝ", label: "New Order", color: "border-primary/40 bg-primary/5 text-primary" },
  Preparing: { amharic: "በዝግጅት ላይ", label: "Preparing", color: "border-amber-300 bg-amber-50 text-amber-800" },
  Ready: { amharic: "ተዘጋጅቷል", label: "Ready to Serve", color: "border-forest-400 bg-forest-50 text-forest-800" },
};

export default function KitchenQueue() {
  const { db, updateItem, insertItem } = useData();
  const { restaurant } = db;
  const [soundOn, setSoundOn] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const [rejecting, setRejecting] = useState(null);

  React.useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  const groups = useMemo(() => {
    const tickets = [];
    db.orders.forEach((o) => {
      if (o.status === "Cancelled") return;
      o.tickets.forEach((t) => {
        if (OPEN.includes(t.status)) {
          tickets.push({ ...t, order: o.id, number: o.number, table: o.table, waiter: o.waiter, type: o.type });
        }
      });
    });
    return {
      Submitted: tickets.filter((t) => t.status === "Submitted"),
      Preparing: tickets.filter((t) => t.status === "Preparing"),
      Ready: tickets.filter((t) => t.status === "Ready"),
    };
  }, [db.orders]);

  const setTicketStatus = (orderId, round, from, to) => {
    const order = db.orders.find((o) => o.id === orderId);
    if (!order) return;
    updateItem("orders", orderId, (o) => ({
      tickets: o.tickets.map((t) => (t.round === round && t.status === from ? { ...t, status: to } : t)),
    }));
    if (to === "Ready") {
      const location = order.table ? `Table ${order.table}` : "Takeaway";
      insertItem("notifications", {
        id: `N${Date.now()}`,
        event: "Ticket Ready",
        detail: `${orderId} — ${order.number} (${location})`,
        time: new Date().toTimeString().slice(0, 5),
        read: false,
        sound: true,
      });
      notifySuccess(`Ticket Ready: ${order.number}-${round}`, `${location} is ready for waiter to serve!`);
      if (soundOn) {
        playAlertChime();
      }
    }
  };

  const rejectTicket = (orderId, round, reason) => {
    updateItem("orders", orderId, (o) => ({
      tickets: o.tickets.map((t) => (t.round === round ? { ...t, status: "Rejected", rejectReason: reason } : t)),
    }));
    insertItem("activityLog", {
      id: `L${Date.now()}`,
      who: "kitchen",
      when: new Date().toDateString(),
      action: "Rejected ticket",
      target: orderId,
      old: "",
      new: "Rejected",
      reason,
    });
    setRejecting(null);
  };

  const advance = (t, to) => setTicketStatus(t.order, t.round, t.status, to);

  return (
    <div>
      <PageHeader
        title="ማዕድ ቤት · Kitchen Queue"
        subtitle="Live orders for traditional wots, clay pot tibs, and Jebena Buna coffee. Fasting and fresh orders prioritized."
        actions={
          <button onClick={() => setSoundOn((s) => !s)} className={cn("btn-outline", soundOn && "bg-sage-50 text-sage-700 border-sage-200")}>
            {soundOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            {soundOn ? "Sound on" : "Enable sound"}
          </button>
        }
      />

      {!soundOn && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-gold-200 bg-gold-100 px-4 py-3 text-sm text-gold-600">
          <VolumeX className="h-4 w-4" /> Browsers block sound until you tap. Enable sound to hear new-ticket alerts.
        </div>
      )}

      <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
        <Clock className="h-4 w-4" /> Delayed ticket threshold: {restaurant.delayThreshold} min (global). Per-category thresholds are out of scope.
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {Object.entries(groups).map(([status, list]) => {
          const meta = STATUS_LABELS[status];
          return (
            <div key={status} className="card-soft p-4">
              <div className="mb-3 flex items-center justify-between border-b pb-2">
                <div className="flex items-center gap-2">
                  <span className="font-display text-lg font-semibold">{meta ? meta.label : status}</span>
                  {meta && (
                    <span className="text-xs text-muted-foreground font-medium">({meta.amharic})</span>
                  )}
                </div>
                <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold">{list.length}</span>
              </div>
              <div className="space-y-3">
              {list.map((t) => {
                const waited = minutesSince(t.submittedAt, now);
                const delayed = status !== "Ready" && waited !== null && waited >= restaurant.delayThreshold;
                return (
                  <div key={t.order + t.round} className={cn("rounded-xl border p-3", delayed ? "border-berbere-300 bg-berbere-100/50" : "border-border bg-card")}>
                    <div className="mb-2 flex items-center justify-between">
                      <div>
                        <p className="font-display text-base font-semibold">{t.number}-{t.round}</p>
                        <p className="text-xs text-muted-foreground">{t.order} · {t.table ? `Table ${t.table}` : "Takeaway"} · {t.waiter}</p>
                      </div>
                      {delayed && <span className="status-dot bg-berbere-100 text-berbere-600"><AlertTriangle className="h-3 w-3" /> {waited} min</span>}
                    </div>
                    <div className="space-y-1.5">
                      {t.items.map((it, i) => (
                        <div key={i} className="rounded-lg bg-secondary/40 px-2.5 py-1.5 text-sm">
                          <span className="font-medium">{it.qty}×</span> {it.name} {it.variant && <span className="text-muted-foreground">· {it.variant}</span>}
                          {it.addons?.length > 0 && <div className="text-xs text-muted-foreground pl-5">+ {it.addons.join(", ")}</div>}
                          {it.note && <div className="text-xs text-gold-600 pl-5">Note: {it.note}</div>}
                        </div>
                      ))}
                    </div>
                    <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                      <span>Sent {t.submittedAt}</span>
                    </div>
                    <div className="mt-2 flex gap-2">
                      {status === "Submitted" && (
                        <>
                          <button onClick={() => advance(t, "Preparing")} className="btn-primary flex-1 text-xs"><Play className="h-3.5 w-3.5" /> Start</button>
                          <button onClick={() => setRejecting(t)} className="btn-outline text-xs"><X className="h-3.5 w-3.5" /> Reject</button>
                        </>
                      )}
                      {status === "Preparing" && (
                        <button onClick={() => advance(t, "Ready")} className="btn-primary flex-1 text-xs bg-sage-600 hover:brightness-105"><CheckCircle2 className="h-3.5 w-3.5" /> Mark ready</button>
                      )}
                      {status === "Ready" && (
                        <span className="flex-1 rounded-lg bg-sage-50 px-3 py-1.5 text-center text-xs font-medium text-sage-700">Awaiting waiter to serve</span>
                      )}
                    </div>
                  </div>
                );
              })}
              {list.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No tickets.</p>}
            </div>
          </div>
        );
      })}
      </div>

      {rejecting && (
        <RejectModal ticket={rejecting} onClose={() => setRejecting(null)} onConfirm={(reason) => rejectTicket(rejecting.order, rejecting.round, reason)} />
      )}

      <div className="mt-6 rounded-2xl border border-border bg-secondary/30 p-4 text-sm text-muted-foreground">
        <p className="mb-1 font-medium text-foreground">Kitchen rules</p>
        <ul className="grid gap-1 sm:grid-cols-2">
          <li>• Kitchen can Start, Mark ready, and Reject items — never mark Served.</li>
          <li>• The owning waiter marks a Ready ticket Served and gets a sound alert.</li>
          <li>• Tickets exist on screen only — no printing.</li>
          <li>• Tickets are held in this browser; switching role clears the view.</li>
        </ul>
      </div>
    </div>
  );
}

function RejectModal({ ticket, onClose, onConfirm }) {
  const [reason, setReason] = useState("");
  return (
    <Modal
      title={`Reject ticket ${ticket.number}-${ticket.round}`}
      description="The waiter sees this reason on the order. Required."
      onClose={onClose}
      size="sm"
      onSubmit={(e) => {
        e.preventDefault();
        if (!reason.trim()) return;
        onConfirm(reason.trim());
      }}
      footer={
        <>
          <button type="button" onClick={onClose} className="btn-outline flex-1">Back</button>
          <button type="submit" disabled={!reason.trim()} className="btn-destructive flex-1">Reject</button>
        </>
      }>
      <label htmlFor="reject-reason" className="text-sm font-medium">Reason (required)</label>
      <input id="reject-reason" value={reason} onChange={(e) => setReason(e.target.value)} className="input-soft mt-1" />
    </Modal>
  );
}