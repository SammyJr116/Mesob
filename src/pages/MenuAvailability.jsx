import React, { useState } from "react";
import { PageHeader, SearchInput } from "@/components/ui/shared";
import { menuItems, etb } from "@/lib/mockData";
import { cn } from "@/lib/utils";

export default function MenuAvailability() {
  const [q, setQ] = useState("");
  const [items, setItems] = useState(menuItems.filter((m) => m.status === "Active").map((m) => ({ ...m })));

  const toggle = (id) => setItems((it) => it.map((m) => m.id === id ? { ...m, availability: m.availability === "Available" ? "Unavailable" : "Available" } : m));

  const filtered = items.filter((m) => !q || m.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <div>
      <PageHeader
        title="Menu availability"
        subtitle="Kitchen can toggle manual availability. The automatic stock flag is separate — restocking never overrides a manual Unavailable."
      />
      <div className="mb-4 max-w-sm"><SearchInput value={q} onChange={setQ} placeholder="Search items…" /></div>
      <div className="grid gap-2 sm:grid-cols-2">
        {filtered.map((m) => (
          <div key={m.id} className="card-soft flex items-center gap-3 p-3">
            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-secondary">
              {m.image ? <img src={m.image} alt={m.name} className="h-full w-full object-cover" /> : null}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{m.name}</p>
              <p className="text-xs text-muted-foreground">{etb(m.price)} ETB · {m.fasting}</p>
            </div>
            <button onClick={() => toggle(m.id)} className={cn("rounded-full px-3 py-1.5 text-xs font-semibold transition-colors", m.availability === "Available" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700")}>
              {m.availability === "Available" ? "Available" : "Unavailable"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}