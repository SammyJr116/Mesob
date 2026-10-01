import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Users, MapPin } from "lucide-react";
import { PageHeader, StatusBadge, SectionCard } from "@/components/ui/shared";
import { tables, managedLists } from "@/lib/mockData";
import { cn } from "@/lib/utils";

const STATUS_TONE = {
  Available: "border-emerald-200 bg-emerald-50/60",
  Occupied: "border-rose-200 bg-rose-50/60",
  Reserved: "border-sky-200 bg-sky-50/60",
  Cleaning: "border-amber-200 bg-amber-50/60",
  "Out of Service": "border-slate-200 bg-slate-50/60",
};

export default function Tables() {
  const navigate = useNavigate();
  const [section, setSection] = useState("All");
  const sections = ["All", ...managedLists.tableSections];
  const filtered = section === "All" ? tables : tables.filter((t) => t.section === section);

  const counts = {
    Available: tables.filter((t) => t.status === "Available").length,
    Occupied: tables.filter((t) => t.status === "Occupied").length,
    Reserved: tables.filter((t) => t.status === "Reserved").length,
    Cleaning: tables.filter((t) => t.status === "Cleaning").length,
  };

  return (
    <div>
      <PageHeader
        title="Tables"
        subtitle="Grid grouped by section. Open an order on any Available table."
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
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> {counts.Available} Available</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-rose-500" /> {counts.Occupied} Occupied</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-sky-500" /> {counts.Reserved} Reserved</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> {counts.Cleaning} Cleaning</span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {filtered.map((t) => (
          <button
            key={t.id}
            onClick={() => t.status === "Available" ? navigate("/orders/new") : t.order ? navigate(`/orders/${t.order}`) : null}
            className={cn("card-soft flex flex-col gap-2 p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-md", STATUS_TONE[t.status])}
          >
            <div className="flex items-start justify-between">
              <span className="font-display text-2xl font-semibold">{t.number}</span>
              <StatusBadge status={t.status} />
            </div>
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
            {t.status === "Available" && (
              <span className="mt-1 text-xs font-medium text-primary">Tap to open order →</span>
            )}
          </button>
        ))}
      </div>

      <div className="mt-6">
        <SectionCard title="Table status rules (PRD §8.2)">
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