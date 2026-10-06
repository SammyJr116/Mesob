import React, { useMemo, useState } from "react";
import { PageHeader, SearchInput } from "@/components/ui/shared";
import { etb } from "@/lib/format";
import { useData } from "@/lib/DataContext";
import { useRole } from "@/lib/RoleContext";
import { stamp } from "@/lib/datetime";
import { cn } from "@/lib/utils";

export default function MenuAvailability() {
  const { db, updateItem, insertItem } = useData();
  const { role } = useRole();
  const [q, setQ] = useState("");

  const toggle = (m) => {
    const next = m.availability === "Available" ? "Unavailable" : "Available";
    updateItem("menuItems", m.id, { availability: next });
    insertItem("activityLog", {
      id: `L${Date.now()}`,
      who: role || "kitchen",
      when: stamp(),
      action: "Toggled menu item availability",
      target: m.name,
      old: m.availability,
      new: next,
      reason: "",
    });
  };

  const filtered = useMemo(() => {
    const needle = q.toLowerCase();
    return db.menuItems.filter((m) => m.status === "Active" && (!needle || m.name.toLowerCase().includes(needle)));
  }, [db.menuItems, q]);

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
            <button onClick={() => toggle(m)} aria-pressed={m.availability === "Unavailable"} className={cn("rounded-full px-3 py-1.5 text-xs font-semibold transition-colors", m.availability === "Available" ? "bg-sage-100 text-sage-700" : "bg-berbere-100 text-berbere-600")}>
              {m.availability === "Available" ? "Available" : "Unavailable"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}