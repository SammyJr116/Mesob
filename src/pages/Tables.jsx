import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Users, MapPin } from "lucide-react";
import { PageHeader, StatusBadge, SectionCard, EmptyState } from "@/components/ui/shared";
import { useData } from "@/lib/DataContext";
import { useRole } from "@/lib/RoleContext";
import { isPrivileged } from "@/lib/roles";
import { cn } from "@/lib/utils";
import { notifySuccess } from "@/lib/notify";
import { MesobIcon } from "@/components/HabeshaDecorations";

const STATUS_TONE = {
  Available: "border-sage-300 bg-sage-50",
  Occupied: "border-terracotta-300 bg-terracotta-100",
  Reserved: "border-gold-300 bg-gold-100",
  Cleaning: "border-sage-200 bg-sage-50",
  "Out of Service": "border-walnut-700 bg-walnut-800 text-cream-200",
};

const DOT = {
  Available: "bg-sage-500",
  Occupied: "bg-terracotta-500",
  Reserved: "bg-gold-500",
  Cleaning: "bg-sage-300",
  "Out of Service": "bg-walnut-700",
};

export default function Tables() {
  const navigate = useNavigate();
  const { db, updateItem } = useData();
  const { role } = useRole();
  const { tables, managedLists } = db;
  const manager = isPrivileged(role);
  const [section, setSection] = useState("All");
  const sections = ["All", ...managedLists.tableSections];
  const { filtered, counts } = useMemo(
    () => ({
      filtered: section === "All" ? tables : tables.filter((t) => t.section === section),
      counts: tables.reduce((acc, t) => {
        acc[t.status] = (acc[t.status] || 0) + 1;
        return acc;
      }, {}),
    }),
    [tables, section]
  );

  const open = (t) => {
    if (t.status === "Available") navigate(`/orders/new?table=${encodeURIComponent(t.number)}`);
    else if (t.order) navigate(`/orders/${t.order}`);
    else if (t.status === "Cleaning") navigate("/my-tasks");
  };

  const takeOutOfService = (t) => {
    updateItem("tables", t.id, { status: "Out of Service", order: null, reservation: null });
    notifySuccess(`${t.number} taken out of service`);
  };

  const returnToService = (t) => {
    updateItem("tables", t.id, { status: "Available" });
    notifySuccess(`${t.number} is back in service`);
  };

  const overrideCleaning = (t) => {
    updateItem("tables", t.id, { status: "Available", cleaner: null });
    notifySuccess(`${t.number} released without a cleaner sign-off`);
  };

  const getTableReadyTickets = (table) => {
    if (!table.order) return [];
    const ord = db.orders.find((o) => o.id === table.order);
    if (!ord) return [];
    return (ord.tickets || []).filter((tk) => tk.status === "Ready");
  };

  return (
    <div>
      <PageHeader
        title="ጠረጴዛዎች · Dining Tables"
        subtitle="Mesob communal dining layout grouped by floor section. Open an order on any Available table."
        actions={<button onClick={() => navigate("/orders/new")} className="btn-primary"><Plus className="h-4 w-4" /> New order</button>}
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {sections.map((s) => (
          <button key={s} onClick={() => setSection(s)} className={cn("rounded-full px-3 py-1.5 text-sm font-medium transition-colors", section === s ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground hover:bg-muted")}>
            {s}
          </button>
        ))}
      </div>

      <div className="mb-5 flex flex-wrap gap-3 text-sm">
        {["Available", "Occupied", "Reserved", "Cleaning", "Out of Service"].map((s) => (
          <span key={s} className="flex items-center gap-1.5">
            <span className={cn("h-2.5 w-2.5 rounded-full", DOT[s])} />
            {counts[s] || 0} {s}
          </span>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="No tables in this section" description="Pick another section, or add a table in Settings." icon={MapPin} />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {filtered.map((t) => {
            const readyTickets = getTableReadyTickets(t);
            const isFoodReady = readyTickets.length > 0;
            return (
              <div
                key={t.id}
                className={cn(
                  "card-soft flex flex-col gap-2 p-4 text-left transition-all",
                  isFoodReady ? "border-sage-500 ring-2 ring-sage-400 bg-sage-50/90 shadow-md" : STATUS_TONE[t.status]
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-1.5">
                    <MesobIcon className="h-4 w-4 text-gold-600/70 shrink-0" />
                    <span className="font-display text-2xl font-semibold">{t.number}</span>
                  </div>
                  <StatusBadge status={t.status} />
                </div>
                {isFoodReady && (
                  <div className="flex items-center gap-1.5 rounded-md bg-sage-600 px-2 py-1 text-xs font-semibold text-white shadow-sm animate-pulse">
                    <span>🍽️ Food Ready ({readyTickets.length})</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Users className="h-3.5 w-3.5" /> {t.seats} seats
                  <span className="text-border">·</span>
                  <MapPin className="h-3.5 w-3.5" /> {t.section}
                </div>
                {t.order && (
                  <div className="mt-1 rounded-lg bg-card/80 px-2 py-1.5 text-xs">
                    <p className="font-medium">{t.order}</p>
                    <p className="text-muted-foreground">Waiter: {t.waiter}</p>
                  </div>
                )}
                {t.reservation && (
                  <div className="mt-1 rounded-lg bg-card/80 px-2 py-1.5 text-xs">
                    <p className="font-medium">{t.reservation}</p>
                    <p className="text-muted-foreground">Reserved today</p>
                  </div>
                )}
                <div className="mt-auto flex flex-wrap gap-1.5 pt-1">
                  {isFoodReady && (
                    <button
                      onClick={() => navigate(`/orders/${t.order}`)}
                      className="btn-primary w-full text-xs bg-sage-600 hover:brightness-105"
                    >
                      Serve Food →
                    </button>
                  )}
                  {t.status === "Available" && (
                    <button onClick={() => open(t)} className="text-xs font-medium text-primary">Open order →</button>
                  )}
                  {t.order && !isFoodReady && (
                    <button onClick={() => open(t)} className="text-xs font-medium text-primary">View {t.order} →</button>
                  )}
                  {t.status === "Cleaning" && (
                    <button onClick={() => navigate("/my-tasks")} className="text-xs font-medium text-primary">Cleaning queue →</button>
                  )}
                  {manager && t.status === "Cleaning" && (
                    <button onClick={() => overrideCleaning(t)} className="text-xs text-muted-foreground hover:text-foreground">Override cleaning</button>
                  )}
                  {manager && t.status !== "Out of Service" && t.status !== "Cleaning" && (
                    <button onClick={() => takeOutOfService(t)} className="text-xs text-muted-foreground hover:text-foreground">Take out of service</button>
                  )}
                  {manager && t.status === "Out of Service" && (
                    <button onClick={() => returnToService(t)} className="text-xs text-muted-foreground hover:text-foreground">Return to service</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-6">
        <SectionCard title="Table status rules">
          <ul className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
            <li>• Available → Occupied when a dine-in order opens.</li>
            <li>• Occupied → Cleaning when the invoice is paid.</li>
            <li>• Cleaning → Available only after a cleaner completes the table-clean task (Manager can override).</li>
            <li>• A table with an active reservation today blocks walk-ins — no override.</li>
            <li>• Reserved → Occupied when the reservation is marked Arrived.</li>
            <li>• Any → Out of Service by the Manager only.</li>
          </ul>
        </SectionCard>
      </div>
    </div>
  );
}