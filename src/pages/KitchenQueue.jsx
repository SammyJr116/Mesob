import React, { useState } from "react";
import { Volume2, VolumeX, Clock, AlertTriangle, Play, CheckCircle2, X } from "lucide-react";
import { PageHeader } from "@/components/ui/shared";
import { orders, restaurant } from "@/lib/mockData";
import { cn } from "@/lib/utils";

export default function KitchenQueue() {
  const [soundOn, setSoundOn] = useState(false);
  const [tickets, setTickets] = useState(() => {
    const list = [];
    orders.forEach((o) => o.tickets.forEach((t) => {
      if (["Submitted", "Preparing", "Ready"].includes(t.status)) {
        list.push({ ...t, order: o.id, number: o.number, table: o.table, waiter: o.waiter, type: o.type });
      }
    }));
    return list;
  });

  const groups = {
    Submitted: tickets.filter((t) => t.status === "Submitted"),
    Preparing: tickets.filter((t) => t.status === "Preparing"),
    Ready: tickets.filter((t) => t.status === "Ready"),
  };

  const advance = (id, from, to) => {
    setTickets((ts) => ts.map((t) => t.order === id && t.status === from ? { ...t, status: to } : t));
  };

  return (
    <div>
      <PageHeader
        title="Kitchen queue"
        subtitle="One queue for all items — food, drinks and coffee. No station routing."
        actions={
          <button onClick={() => setSoundOn((s) => !s)} className={cn("btn-outline", soundOn && "bg-emerald-50 text-emerald-700 border-emerald-200")}>
            {soundOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            {soundOn ? "Sound on" : "Enable sound"}
          </button>
        }
      />

      {!soundOn && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <VolumeX className="h-4 w-4" /> Browsers block sound until you tap. Enable sound to hear new-ticket alerts.
        </div>
      )}

      <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
        <Clock className="h-4 w-4" /> Delayed ticket threshold: {restaurant.delayThreshold} min (global). Per-category thresholds are out of scope.
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {Object.entries(groups).map(([status, list]) => (
          <div key={status} className="card-soft p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold">{status === "Submitted" ? "New" : status}</h2>
              <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold">{list.length}</span>
            </div>
            <div className="space-y-3">
              {list.map((t) => {
                const delayed = status !== "Ready" && parseInt(t.submittedAt) >= 19; // demo flag
                return (
                  <div key={t.order + t.round} className={cn("rounded-xl border p-3", delayed ? "border-rose-300 bg-rose-50/50" : "border-border bg-card")}>
                    <div className="mb-2 flex items-center justify-between">
                      <div>
                        <p className="font-display text-base font-semibold">{t.number}-{t.round}</p>
                        <p className="text-xs text-muted-foreground">{t.order} · {t.table ? `Table ${t.table}` : "Takeaway"} · {t.waiter}</p>
                      </div>
                      {delayed && <span className="status-dot bg-rose-100 text-rose-700"><AlertTriangle className="h-3 w-3" /> Delayed</span>}
                    </div>
                    <div className="space-y-1.5">
                      {t.items.map((it, i) => (
                        <div key={i} className="rounded-lg bg-secondary/40 px-2.5 py-1.5 text-sm">
                          <span className="font-medium">{it.qty}×</span> {it.name} {it.variant && <span className="text-muted-foreground">· {it.variant}</span>}
                          {it.addons?.length > 0 && <div className="text-xs text-muted-foreground pl-5">+ {it.addons.join(", ")}</div>}
                          {it.note && <div className="text-xs text-amber-700 pl-5">Note: {it.note}</div>}
                        </div>
                      ))}
                    </div>
                    <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                      <span>Sent {t.submittedAt}</span>
                    </div>
                    <div className="mt-2 flex gap-2">
                      {status === "Submitted" && (
                        <>
                          <button onClick={() => advance(t.order, "Submitted", "Preparing")} className="btn-primary flex-1 text-xs"><Play className="h-3.5 w-3.5" /> Start</button>
                          <button className="btn-outline text-xs"><X className="h-3.5 w-3.5" /> Reject</button>
                        </>
                      )}
                      {status === "Preparing" && (
                        <button onClick={() => advance(t.order, "Preparing", "Ready")} className="btn-primary flex-1 text-xs bg-emerald-600 hover:brightness-105"><CheckCircle2 className="h-3.5 w-3.5" /> Mark ready</button>
                      )}
                      {status === "Ready" && (
                        <span className="flex-1 rounded-lg bg-emerald-50 px-3 py-1.5 text-center text-xs font-medium text-emerald-700">Awaiting waiter to serve</span>
                      )}
                    </div>
                  </div>
                );
              })}
              {list.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No tickets.</p>}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-secondary/30 p-4 text-sm text-muted-foreground">
        <p className="mb-1 font-medium text-foreground">Kitchen rules</p>
        <ul className="grid gap-1 sm:grid-cols-2">
          <li>• Kitchen can Start, Mark ready, and Reject items — never mark Served.</li>
          <li>• The owning waiter marks a Ready ticket Served and gets a sound alert.</li>
          <li>• Tickets exist on screen only — no printing.</li>
          <li>• Session logs out after 30 min inactivity; tickets pause until sign-in.</li>
        </ul>
      </div>
    </div>
  );
}