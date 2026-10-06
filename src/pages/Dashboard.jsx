import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  ClipboardList, TrendingUp, ChefHat, Bell, Table2, Boxes, ShoppingCart,
  Sparkles, Wrench, AlertTriangle, Receipt, ArrowRight, Clock, ShieldAlert,
  BatteryWarning, CalendarClock,
} from "lucide-react";
import { StatCard, SectionCard, StatusBadge, EmptyState } from "@/components/ui/shared";
import { useData } from "@/lib/DataContext";
import { etb, calcBill } from "@/lib/format";
import { businessDate, minutesSince } from "@/lib/datetime";
import { cn } from "@/lib/utils";

const HERO = "/images/dashboard-hero.png";

const ALERT_TONES = {
  berbere: "bg-berbere-100 text-berbere-600",
  gold: "bg-gold-100 text-gold-600",
  terracotta: "bg-terracotta-100 text-terracotta-600",
  wood: "bg-sand-200 text-walnut-600",
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { db } = useData();
  const {
    orders, tables, inventoryItems, purchases, cleaningTasks,
    maintenanceRequests, incidents, assets, expenses, reservations, restaurant,
  } = db;

  const today = businessDate();

  const figures = useMemo(() => {
    const openOrders = orders.filter((o) => o.status === "Active" || o.status === "Served");
    const tickets = orders.flatMap((o) => o.tickets);
    const preparing = tickets.filter((t) => t.status === "Preparing").length;
    const ready = tickets.filter((t) => t.status === "Ready").length;

    // Sales come from what the store actually holds, not a typed-in literal,
    // and use the same billing maths and live rates as OrderDetail.
    const paid = orders.filter((o) => o.status === "Completed");
    const bills = paid.map((o) => calcBill(o, restaurant));
    const sum = (pick) => bills.reduce((total, b) => total + pick(b), 0);
    const netSales = sum((b) => b.netSales);
    const tax = sum((b) => b.taxPortion);
    const service = sum((b) => b.serviceCharge);

    return {
      openOrders,
      preparing,
      ready,
      lowStock: inventoryItems.filter((i) => i.status === "Low"),
      pendingPurchases: purchases.filter((p) => p.status === "Requested"),
      pendingCleaning: cleaningTasks.filter((c) => c.status === "Pending" || c.status === "Overdue"),
      openMaintenance: maintenanceRequests.filter((m) => m.status !== "Completed"),
      emergencyReview: purchases.filter((p) => p.emergency && !p.reviewed),
      pendingExpenses: expenses.filter((e) => e.status === "Pending confirmation"),
      unresolvedIncidents: incidents.filter((i) => i.status !== "Resolved"),
      expiredWarranty: assets.filter((a) => toComparable(a.warranty) < toComparable(today)),
      netSales,
      tax,
      service,
      paidCount: paid.length,
    };
  }, [orders, inventoryItems, purchases, cleaningTasks, maintenanceRequests, incidents, assets, expenses, today, restaurant]);

  const delayedTickets = orders
    .flatMap((o) => o.tickets.map((t) => ({ order: o, ticket: t })))
    .filter(({ ticket }) => ticket.status !== "Ready" && ticket.status !== "Served")
    .map(({ order, ticket }) => ({ order, ticket, waited: minutesSince(ticket.submittedAt) }))
    .filter((x) => x.waited !== null && x.waited >= restaurant.delayThreshold);

  const alerts = [
    ...delayedTickets.map((d) => ({
      icon: Clock,
      tone: "berbere",
      title: "Delayed kitchen ticket",
      detail: `${d.order.id} round ${d.ticket.round} — ${d.waited} min (threshold ${restaurant.delayThreshold})`,
      to: "/kitchen",
    })),
    ...(figures.lowStock.length
      ? [{ icon: Boxes, tone: "gold", title: "Low stock", detail: `${figures.lowStock.length} items below minimum`, to: "/inventory" }]
      : []),
    ...(figures.emergencyReview.length
      ? [{
          icon: ShoppingCart,
          tone: "berbere",
          title: "Emergency purchase awaiting review",
          detail: figures.emergencyReview.map((p) => p.id).join(", "),
          to: "/purchases",
        }]
      : []),
    ...(figures.pendingPurchases.length
      ? [{ icon: ShoppingCart, tone: "terracotta", title: "Pending purchase requests", detail: `${figures.pendingPurchases.length} awaiting approval`, to: "/purchases" }]
      : []),
    ...(figures.pendingExpenses.length
      ? [{ icon: Receipt, tone: "gold", title: "Pending recurring expense", detail: `${figures.pendingExpenses.length} entry needs confirmation`, to: "/expenses" }]
      : []),
    ...(figures.pendingCleaning.some((c) => c.status === "Overdue")
      ? [{
          icon: Sparkles,
          tone: "berbere",
          title: "Overdue cleaning",
          detail: figures.pendingCleaning.filter((c) => c.status === "Overdue").map((c) => `${c.area} — ${c.task}`).join(" · "),
          to: "/cleaning",
        }]
      : []),
    ...(figures.openMaintenance.length
      ? [{ icon: Wrench, tone: "gold", title: "Open maintenance requests", detail: `${figures.openMaintenance.length} unresolved`, to: "/maintenance" }]
      : []),
    ...(figures.unresolvedIncidents.length
      ? [{ icon: ShieldAlert, tone: "berbere", title: "Unresolved incidents", detail: `${figures.unresolvedIncidents.length} open`, to: "/incidents" }]
      : []),
    ...(figures.expiredWarranty.length
      ? [{
          icon: BatteryWarning,
          tone: "berbere",
          title: "Warranty expired",
          detail: `${figures.expiredWarranty.length} asset(s) past warranty`,
          to: "/maintenance",
        }]
      : []),
    ...(alertsFromNotifications(db.notifications)),
  ];

  const todayReservations = reservations.filter(
    (r) => r.date === "Today" && (r.status === "Confirmed" || r.status === "Pending")
  );

  return (
    <div>
      <div className="relative mb-6 overflow-hidden rounded-2xl border border-border shadow-warm">
        <div className="absolute inset-0">
          <img src={HERO} alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-walnut/90 via-walnut/70 to-walnut/30" />
        </div>
        <div className="relative flex flex-col gap-1 px-6 py-7 sm:px-8 sm:py-9">
          <p className="text-xs font-semibold uppercase tracking-brand text-gold">{restaurant.name} · Today</p>
          <h1 className="font-display text-2xl font-semibold text-cream sm:text-3xl">Today at a glance</h1>
          <p className="text-sm text-cream/80">
            Business day {today} · Open until {restaurant.closingTime} · All figures for the current business day
          </p>
          <button onClick={() => navigate("/reports")} className="mt-3 inline-flex w-fit items-center gap-2 rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-walnut shadow-gold transition hover:brightness-105">
            <TrendingUp className="h-4 w-4" /> End-of-day summary
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
        <StatCard label="Orders today" value={orders.length} sub={`${figures.openOrders.length} open`} icon={ClipboardList} tone="gold" onClick={() => navigate("/orders")} />
        <StatCard
          label="Net sales (paid)"
          value={etb(figures.netSales)}
          sub={`${figures.paidCount} paid order${figures.paidCount === 1 ? "" : "s"} · tax ${etb(figures.tax)}`}
          icon={TrendingUp}
          tone="sage"
          onClick={() => navigate("/reports")}
        />
        <StatCard label="Tickets preparing" value={figures.preparing} sub={`${figures.ready} ready`} icon={ChefHat} tone="berbere" onClick={() => navigate("/kitchen")} />
        <StatCard label="Tables reserved" value={tables.filter((t) => t.status === "Reserved").length} sub="today" icon={Table2} tone="terracotta" onClick={() => navigate("/tables")} />
        <StatCard label="Low stock" value={figures.lowStock.length} sub="items" icon={Boxes} tone="gold" onClick={() => navigate("/inventory")} />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Pending purchases" value={figures.pendingPurchases.length} icon={ShoppingCart} tone="terracotta" onClick={() => navigate("/purchases")} />
        <StatCard label="Pending cleaning" value={figures.pendingCleaning.length} icon={Sparkles} tone="gold" onClick={() => navigate("/cleaning")} />
        <StatCard label="Open maintenance" value={figures.openMaintenance.length} icon={Wrench} tone="berbere" onClick={() => navigate("/maintenance")} />
        <StatCard label="Unread alerts" value={db.notifications.filter((n) => !n.read).length} icon={Bell} tone="wood" onClick={() => navigate("/notifications")} />
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-3">
        <SectionCard title="Alerts needing attention" className="lg:col-span-2">
          {alerts.length === 0 ? (
            <EmptyState title="Nothing needs attention" description="Delays, low stock and approvals show here as they happen." icon={Bell} />
          ) : (
            <div className="space-y-2">
              {alerts.map((a, i) => (
                <button key={`${a.title}-${i}`} onClick={() => navigate(a.to)} className="flex w-full items-center gap-3 rounded-xl border border-border bg-secondary/40 px-3 py-2.5 text-left transition-colors hover:bg-secondary">
                  <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", ALERT_TONES[a.tone])}>
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
          )}
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
            {todayReservations.length === 0 ? (
              <p className="text-sm text-muted-foreground">None booked for today.</p>
            ) : (
              <div className="space-y-1.5">
                {todayReservations.map((r) => (
                  <div key={r.id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="min-w-0 truncate">{r.time} · {r.customer}</span>
                    <StatusBadge status={r.status} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

function alertsFromNotifications(list) {
  const loud = list.filter((n) => !n.read && n.sound);
  return loud.map((n) => ({ icon: AlertTriangle, tone: "berbere", title: n.event, detail: n.detail, to: "/notifications" }));
}

function toComparable(value) {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? Number.MAX_SAFE_INTEGER : d.getTime();
}