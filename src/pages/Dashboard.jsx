import React from "react";
import { useNavigate } from "react-router-dom";
import {
  ClipboardList, TrendingUp, ChefHat, Bell, Table2, Boxes, ShoppingCart,
  Sparkles, Wrench, AlertTriangle, Receipt, ArrowRight, Clock, ShieldAlert,
  BatteryWarning, CalendarClock,
} from "lucide-react";
import { StatCard, SectionCard, StatusBadge } from "@/components/ui/shared";
import { orders, tables, inventoryItems, purchases, cleaningTasks, maintenanceRequests, incidents, assets, expenses, reservations } from "@/lib/mockData";

const HERO = "/images/dashboard-hero.png";

export default function Dashboard() {
  const navigate = useNavigate();
  const openOrders = orders.filter((o) => o.status === "Active" || o.status === "Served");
  const preparing = orders.flatMap((o) => o.tickets).filter((t) => t.status === "Preparing").length;
  const ready = orders.flatMap((o) => o.tickets).filter((t) => t.status === "Ready").length;
  const reservedToday = tables.filter((t) => t.status === "Reserved").length;
  const lowStock = inventoryItems.filter((i) => i.status === "Low");
  const pendingPurchases = purchases.filter((p) => p.status === "Requested").length;
  const pendingCleaning = cleaningTasks.filter((c) => c.status === "Pending" || c.status === "Overdue").length;
  const openMaintenance = maintenanceRequests.filter((m) => m.status !== "Completed").length;
  const emergencyReview = purchases.filter((p) => p.emergency && !p.reviewed);
  const pendingExpenses = expenses.filter((e) => e.status === "Pending confirmation");
  const unresolvedIncidents = incidents.filter((i) => i.status !== "Resolved");
  const expiredWarranty = assets.filter((a) => a.warranty < "2025-09-30");

  const ALERT_TONES = {
    rose: "bg-rose-100 text-rose-600",
    amber: "bg-amber-100 text-amber-600",
    sky: "bg-sky-100 text-sky-600",
    indigo: "bg-indigo-100 text-indigo-600",
  };
  const alerts = [
    { icon: Clock, tone: "rose", title: "Delayed kitchen ticket", detail: "ORD-0042 round 2 — 23 min (threshold 20)", to: "/kitchen" },
    { icon: Boxes, tone: "amber", title: "Low stock", detail: `${lowStock.length} items below minimum`, to: "/inventory" },
    { icon: AlertTriangle, tone: "rose", title: "Negative stock", detail: "Bottled Water 500ml went to -16 briefly", to: "/inventory" },
    { icon: Sparkles, tone: "rose", title: "Overdue cleaning", detail: "Entrance — Wipe glass & mats", to: "/cleaning" },
    { icon: ShoppingCart, tone: "sky", title: "Pending purchase requests", detail: `${pendingPurchases} awaiting approval`, to: "/purchases" },
    { icon: ShoppingCart, tone: "rose", title: "Emergency purchase awaiting review", detail: "PO-0034 — Aqua Addis", to: "/purchases" },
    { icon: Receipt, tone: "amber", title: "Pending recurring expense", detail: `${pendingExpenses.length} entry needs confirmation`, to: "/expenses" },
    { icon: Wrench, tone: "amber", title: "Open maintenance requests", detail: `${openMaintenance} unresolved`, to: "/maintenance" },
    { icon: ShieldAlert, tone: "rose", title: "Unresolved incidents", detail: `${unresolvedIncidents.length} open`, to: "/incidents" },
    { icon: BatteryWarning, tone: "rose", title: "Warranty expired", detail: `${expiredWarranty.length} asset(s) past warranty`, to: "/maintenance" },
  ];

  return (
    <div>
      {/* Warm hero banner with food photography */}
      <div className="relative mb-6 overflow-hidden rounded-2xl border border-border shadow-warm">
        <div className="absolute inset-0">
          <img src={HERO} alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-walnut/90 via-walnut/70 to-walnut/30" />
        </div>
        <div className="relative flex flex-col gap-1 px-6 py-7 sm:px-8 sm:py-9">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gold">Mesob House · Today</p>
          <h1 className="font-display text-2xl font-semibold text-cream sm:text-3xl">Today at a glance</h1>
          <p className="text-sm text-cream/80">Business day: Sep 30 · Open until 04:00 · All figures for the current business day</p>
          <button onClick={() => navigate("/reports")} className="mt-3 inline-flex w-fit items-center gap-2 rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-walnut shadow-gold transition hover:brightness-105">
            <TrendingUp className="h-4 w-4" /> End-of-day summary
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
        <StatCard label="Orders today" value={orders.length} sub={`${openOrders.length} open`} icon={ClipboardList} tone="amber" onClick={() => navigate("/orders")} />
        <StatCard label="Net sales" value="14,820" sub="ETB today" icon={TrendingUp} tone="emerald" onClick={() => navigate("/reports")} />
        <StatCard label="Tickets preparing" value={preparing} sub={`${ready} ready`} icon={ChefHat} tone="rose" onClick={() => navigate("/kitchen")} />
        <StatCard label="Tables reserved" value={reservedToday} sub="today" icon={Table2} tone="sky" onClick={() => navigate("/tables")} />
        <StatCard label="Low stock" value={lowStock.length} sub="items" icon={Boxes} tone="amber" onClick={() => navigate("/inventory")} />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Pending purchases" value={pendingPurchases} icon={ShoppingCart} tone="sky" onClick={() => navigate("/purchases")} />
        <StatCard label="Pending cleaning" value={pendingCleaning} icon={Sparkles} tone="amber" onClick={() => navigate("/cleaning")} />
        <StatCard label="Open maintenance" value={openMaintenance} icon={Wrench} tone="rose" onClick={() => navigate("/maintenance")} />
        <StatCard label="Unread alerts" value={alerts.length} icon={Bell} tone="indigo" onClick={() => navigate("/notifications")} />
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-3">
        <SectionCard title="Alerts needing attention" className="lg:col-span-2">
          <div className="space-y-2">
            {alerts.map((a, i) => (
              <button key={i} onClick={() => navigate(a.to)} className="flex w-full items-center gap-3 rounded-xl border border-border bg-secondary/40 px-3 py-2.5 text-left transition-colors hover:bg-secondary">
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${ALERT_TONES[a.tone]}`}>
                  <a.icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{a.title}</p>
                  <p className="truncate text-xs text-muted-foreground">{a.detail}</p>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </button>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Quick actions">
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "New order", to: "/orders/new", icon: ClipboardList },
              { label: "Kitchen", to: "/kitchen", icon: ChefHat },
              { label: "Tables", to: "/tables", icon: Table2 },
              { label: "Reservations", to: "/reservations", icon: CalendarClock },
              { label: "Add expense", to: "/expenses", icon: Receipt },
              { label: "Report issue", to: "/maintenance", icon: Wrench },
            ].map((q) => (
              <button key={q.label} onClick={() => navigate(q.to)} className="flex flex-col items-start gap-2 rounded-xl border border-border bg-card p-3 text-left transition-all hover:-translate-y-0.5 hover:shadow-md">
                <q.icon className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium">{q.label}</span>
              </button>
            ))}
          </div>
          <div className="mt-4 rounded-xl bg-secondary/60 p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Reservations today</p>
            <div className="space-y-1.5">
              {reservations.filter((r) => r.date === "Today" && (r.status === "Confirmed" || r.status === "Pending")).map((r) => (
                <div key={r.id} className="flex items-center justify-between text-sm">
                  <span>{r.time} · {r.customer}</span>
                  <StatusBadge status={r.status} />
                </div>
              ))}
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}