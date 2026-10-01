import React, { useState } from "react";
import { Plus, Clock, Users, Calendar } from "lucide-react";
import { PageHeader, StatusBadge, SectionCard } from "@/components/ui/shared";
import { reservations, restaurant, tables } from "@/lib/mockData";
import { cn } from "@/lib/utils";

export default function Reservations() {
  const [showAdd, setShowAdd] = useState(false);
  const today = reservations.filter((r) => r.date === "Today");
  const upcoming = reservations.filter((r) => r.date !== "Today");

  return (
    <div>
      <PageHeader
        title="Reservations"
        subtitle={`Fixed duration ${restaurant.reservationDuration} min · no-show grace ${restaurant.noShowGrace} min · reminder ${restaurant.reminderLead} min before. Tables with an active reservation block walk-ins.`}
        actions={<button onClick={() => setShowAdd(true)} className="btn-primary"><Plus className="h-4 w-4" /> New reservation</button>}
      />

      <div className="mb-4 flex flex-wrap gap-3 text-sm">
        <span className="rounded-lg bg-secondary px-3 py-1.5">Today: {today.length}</span>
        <span className="rounded-lg bg-secondary px-3 py-1.5">Confirmed: {today.filter((r) => r.status === "Confirmed").length}</span>
        <span className="rounded-lg bg-secondary px-3 py-1.5">Pending: {today.filter((r) => r.status === "Pending").length}</span>
        <span className="rounded-lg bg-secondary px-3 py-1.5">No-show today: {today.filter((r) => r.status === "No Show").length}</span>
      </div>

      <SectionCard title="Today" className="mb-5">
        <div className="space-y-2">
          {today.map((r) => (
            <div key={r.id} className={cn("flex flex-col gap-2 rounded-xl border p-3 sm:flex-row sm:items-center", r.status === "No Show" ? "border-rose-200 bg-rose-50/40" : "border-border")}>
              <div className="flex items-center gap-2 font-display text-lg font-semibold">
                <Clock className="h-4 w-4 text-muted-foreground" /> {r.time}
              </div>
              <div className="flex-1">
                <p className="font-medium">{r.customer} · <span className="text-muted-foreground">{r.phone}</span></p>
                <p className="text-xs text-muted-foreground"><Users className="inline h-3.5 w-3.5" /> {r.guests} guests · Table(s) {r.tables.join(", ")} {r.notes && `· ${r.notes}`}</p>
              </div>
              <div className="flex items-center gap-2">
                {r.status === "Confirmed" && <button className="btn-outline text-xs">Mark arrived</button>}
                {r.status === "Pending" && <button className="btn-outline text-xs">Confirm</button>}
                {r.status === "Arrived" && <button className="btn-outline text-xs">Open order</button>}
                <StatusBadge status={r.status} />
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Upcoming">
        <div className="space-y-2">
          {upcoming.map((r) => (
            <div key={r.id} className="flex items-center gap-3 rounded-xl border border-border p-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground"><Calendar className="h-4 w-4" /> {r.date}</div>
              <div className="flex-1">
                <p className="font-medium">{r.time} · {r.customer}</p>
                <p className="text-xs text-muted-foreground">{r.guests} guests · Table(s) {r.tables.join(", ")}</p>
              </div>
              <StatusBadge status={r.status} />
            </div>
          ))}
        </div>
      </SectionCard>

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowAdd(false)}>
          <div className="w-full max-w-md rounded-2xl bg-card p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-4 font-display text-lg font-semibold">New reservation</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block"><span className="mb-1 block text-sm font-medium">Customer name</span><input className="input-soft" /></label>
              <label className="block"><span className="mb-1 block text-sm font-medium">Phone (required)</span><input className="input-soft" /></label>
              <label className="block"><span className="mb-1 block text-sm font-medium">Date</span><input type="date" className="input-soft" /></label>
              <label className="block"><span className="mb-1 block text-sm font-medium">Time</span><input type="time" className="input-soft" /></label>
              <label className="block"><span className="mb-1 block text-sm font-medium">Guests</span><input type="number" min={1} className="input-soft" /></label>
              <label className="block"><span className="mb-1 block text-sm font-medium">Tables</span>
                <select multiple className="input-soft min-h-[80px]">{tables.map((t) => <option key={t.id}>Table {t.number} ({t.seats})</option>)}</select>
              </label>
            </div>
            <p className="mb-4 mt-2 rounded-lg bg-secondary/60 px-3 py-2 text-xs text-muted-foreground">Duration is fixed at {restaurant.reservationDuration} min. Combined seats must cover the guest count. Overlapping tables are rejected.</p>
            <div className="flex gap-2">
              <button onClick={() => setShowAdd(false)} className="btn-outline flex-1">Cancel</button>
              <button onClick={() => setShowAdd(false)} className="btn-primary flex-1">Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}