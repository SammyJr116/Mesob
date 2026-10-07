import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Clock, Users, Calendar } from "lucide-react";
import { PageHeader, StatusBadge, SectionCard, EmptyState } from "@/components/ui/shared";
import Modal from "@/components/ui/Modal";
import { useData } from "@/lib/DataContext";
import { notifySuccess } from "@/lib/notify";
import { nextId, isoDate, clockTime, toDate } from "@/lib/datetime";
import { MesobIcon } from "@/components/HabeshaDecorations";
import { cn } from "@/lib/utils";

export default function Reservations() {
  const navigate = useNavigate();
  const { db, updateItem, insertItem } = useData();
  const { reservations, restaurant, tables } = db;
  const [showAdd, setShowAdd] = useState(false);
  const { today, upcoming } = useMemo(
    () => ({
      today: reservations.filter((r) => r.date === "Today"),
      upcoming: reservations.filter((r) => r.date !== "Today"),
    }),
    [reservations]
  );

  const setStatus = (r, status) => {
    updateItem("reservations", r.id, { status });
    if (status === "Confirmed" || status === "Arrived") {
      const t = tables.find((x) => r.tables.includes(x.number));
      if (t && status === "Arrived") updateItem("tables", t.id, { status: "Occupied", reservation: r.customer });
    }
    notifySuccess(`${r.customer} — ${status}`);
  };

  return (
    <div>
      <PageHeader
        title="Reservations"
        subtitle={`Fixed duration ${restaurant.reservationDuration} min · no-show grace ${restaurant.noShowGrace} min · reminder ${restaurant.reminderLead} min before. Tables with an active reservation block walk-ins.`}
        actions={<button onClick={() => setShowAdd(true)} className="btn-primary"><Plus className="h-4 w-4" /> New reservation</button>}
      />

      {/* Habesha Hospitality Banner */}
      <div className="relative mb-5 overflow-hidden rounded-2xl border border-gold-200/70 bg-gradient-to-r from-cream-100 via-white to-gold-50/60 p-4 shadow-sm">
        <div className="tibeb-border-top" />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold-100 text-gold-700 ring-1 ring-gold-300">
              <MesobIcon className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display text-base font-bold text-foreground">
                  እንኳን ደህና መጡ · Habesha Hospitality
                </h3>
                <span className="rounded-full bg-forest-100 px-2 py-0.5 text-[11px] font-semibold text-forest-800">
                  ማዕድ ማጋራት
                </span>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                "Come as a guest, leave as family." Traditional woven Mesob tables accommodate shared Beyaynetu platters and cultural celebrations.
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2 text-xs font-medium text-gold-800 bg-gold-100/70 px-3 py-1.5 rounded-lg border border-gold-200">
            <span>☕ Buna Ceremony Ready</span>
          </div>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-3 text-sm">
        <span className="rounded-lg bg-secondary px-3 py-1.5">Today: {today.length}</span>
        <span className="rounded-lg bg-secondary px-3 py-1.5">Confirmed: {today.filter((r) => r.status === "Confirmed").length}</span>
        <span className="rounded-lg bg-secondary px-3 py-1.5">Pending: {today.filter((r) => r.status === "Pending").length}</span>
        <span className="rounded-lg bg-secondary px-3 py-1.5">No-show today: {today.filter((r) => r.status === "No Show").length}</span>
      </div>

      <SectionCard title="Today" className="mb-5">
        {today.length === 0 ? (
          <EmptyState title="No reservations today" description="Add one to hold a table." icon={Calendar} />
        ) : (
          <div className="space-y-2">
            {today.map((r) => (
              <div key={r.id} className={cn("flex flex-col gap-2 rounded-xl border p-3 sm:flex-row sm:items-center", r.status === "No Show" ? "border-berbere-200 bg-berbere-100/40" : "border-border")}>
                <div className="flex items-center gap-2 font-display text-lg font-semibold">
                  <Clock className="h-4 w-4 text-muted-foreground" /> {r.time}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{r.customer} · <span className="text-muted-foreground">{r.phone}</span></p>
                  <p className="text-xs text-muted-foreground"><Users className="inline h-3.5 w-3.5" /> {r.guests} guests · Table(s) {r.tables.join(", ")} {r.notes && `· ${r.notes}`}</p>
                </div>
                <div className="flex items-center gap-2">
                  {r.status === "Confirmed" && <button onClick={() => setStatus(r, "Arrived")} className="btn-outline text-xs">Mark arrived</button>}
                  {r.status === "Pending" && <button onClick={() => setStatus(r, "Confirmed")} className="btn-outline text-xs">Confirm</button>}
                  {r.status === "Arrived" && <button onClick={() => navigate(`/orders/new?table=${encodeURIComponent(r.tables[0] || "")}`)} className="btn-outline text-xs">Open order</button>}
                  {r.status === "No Show" && <button onClick={() => setStatus(r, "Confirmed")} className="btn-outline text-xs">Reinstate</button>}
                  <StatusBadge status={r.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard title="Upcoming">
        {upcoming.length === 0 ? (
          <EmptyState title="Nothing upcoming" description="Future reservations appear here." icon={Calendar} />
        ) : (
          <div className="space-y-2">
            {upcoming.map((r) => (
              <div key={r.id} className="flex items-center gap-3 rounded-xl border border-border p-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground"><Calendar className="h-4 w-4" /> {r.date}</div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{r.time} · {r.customer}</p>
                  <p className="text-xs text-muted-foreground">{r.guests} guests · Table(s) {r.tables.join(", ")}</p>
                </div>
                <StatusBadge status={r.status} />
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {showAdd && (
        <NewReservationModal tables={tables} duration={restaurant.reservationDuration} existing={reservations}
          onClose={() => setShowAdd(false)}
          onCreate={(draft) => {
            const id = nextId(reservations, "R", 2);
            insertItem("reservations", { id, status: "Pending", ...draft });
            draft.tables.forEach((num) => {
              const t = tables.find((x) => x.number === num);
              if (t) updateItem("tables", t.id, { status: "Reserved", reservation: draft.customer });
            });
            setShowAdd(false);
            notifySuccess(`Reservation ${id} created`);
          }} />
      )}
    </div>
  );
}

function NewReservationModal({ tables, duration, existing, onClose, onCreate }) {
  const [customer, setCustomer] = useState("");
  const [phone, setPhone] = useState("");
  const [date, setDate] = useState(isoDate());
  const [time, setTime] = useState(clockTime());
  const [guests, setGuests] = useState("2");
  const [notes, setNotes] = useState("");
  const [picked, setPicked] = useState([]);

  const selected = tables.filter((t) => picked.includes(t.number));
  const seats = selected.reduce((s, t) => s + t.seats, 0);
  const guestN = Number(guests);
  const clash = selected.some((t) =>
    existing.some((r) => r.status !== "No Show" && isoDate(toDate(r.date)) === date && r.tables.includes(t.number)));
  const valid = customer.trim() && phone.trim() && guestN > 0 && picked.length > 0 && seats >= guestN && !clash;

  const toggle = (num) => setPicked((p) => (p.includes(num) ? p.filter((x) => x !== num) : [...p, num]));

  return (
    <Modal
      title="New reservation"
      description="Pick the tables together so combined seats can be checked against the guest count."
      onClose={onClose}
      onSubmit={(e) => {
        e.preventDefault();
        if (!valid) return;
        onCreate({
          customer: customer.trim(), phone: phone.trim(),
          date: date === isoDate() ? "Today" : date === isoDate(new Date(Date.now() + 86400000)) ? "Tomorrow" : date,
          time, guests: guestN, tables: picked, notes: notes.trim(),
        });
      }}
      footer={
        <>
          <button type="button" onClick={onClose} className="btn-outline flex-1">Back</button>
          <button
            type="submit"
            disabled={!valid}
            className="btn-primary flex-1"
          >Create</button>
        </>
      }>
      <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="res-customer" className="mb-1 block text-sm font-medium">Customer name</label>
            <input id="res-customer" value={customer} onChange={(e) => setCustomer(e.target.value)} className="input-soft" />
          </div>
          <div>
            <label htmlFor="res-phone" className="mb-1 block text-sm font-medium">Phone (required)</label>
            <input id="res-phone" value={phone} onChange={(e) => setPhone(e.target.value)} className="input-soft" />
          </div>
          <div>
            <label htmlFor="res-date" className="mb-1 block text-sm font-medium">Date</label>
            <input id="res-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input-soft" />
          </div>
          <div>
            <label htmlFor="res-time" className="mb-1 block text-sm font-medium">Time</label>
            <input id="res-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} className="input-soft" />
          </div>
          <div>
            <label htmlFor="res-guests" className="mb-1 block text-sm font-medium">Guests</label>
            <input id="res-guests" type="number" min="1" value={guests} onChange={(e) => setGuests(e.target.value)} className="input-soft" />
          </div>
          <div>
            <label htmlFor="res-notes" className="mb-1 block text-sm font-medium">Notes (optional)</label>
            <input id="res-notes" value={notes} onChange={(e) => setNotes(e.target.value)} className="input-soft" />
          </div>
        </div>
        <fieldset className="mt-3">
          <legend className="mb-1 text-sm font-medium">Tables</legend>
          <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-border p-2">
            {tables.map((t) => (
              <label key={t.id} htmlFor={`res-t-${t.id}`} className="flex items-center gap-2 rounded px-1 py-0.5 text-sm hover:bg-secondary">
                <input id={`res-t-${t.id}`} type="checkbox" checked={picked.includes(t.number)} onChange={() => toggle(t.number)} />
                Table {t.number} · {t.seats} seats · {t.section}
                {t.status !== "Available" && <span className="ml-auto text-xs text-muted-foreground">{t.status}</span>}
              </label>
            ))}
          </div>
        </fieldset>
        {clash && <p role="alert" className="mt-2 text-xs text-berbere-600">A selected table already has a reservation on that date.</p>}
        <p className="mt-2 rounded-lg bg-secondary/60 px-3 py-2 text-xs text-muted-foreground">
          Duration is fixed at {duration} min. Combined seats must cover the guest count — currently {seats} for {guestN || 0}.
        </p>
    </Modal>
  );
}