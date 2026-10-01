import React, { useState } from "react";
import { Plus, Phone, Mail } from "lucide-react";
import { PageHeader, StatusBadge, SearchInput } from "@/components/ui/shared";
import { suppliers } from "@/lib/mockData";

export default function Suppliers() {
  const [q, setQ] = useState("");
  const filtered = suppliers.filter((s) => !q || s.name.toLowerCase().includes(q.toLowerCase()) || s.contact.toLowerCase().includes(q.toLowerCase()));
  return (
    <div>
      <PageHeader title="Suppliers" subtitle="An item can have several suppliers, each with a last price. One is the default." actions={<button className="btn-primary"><Plus className="h-4 w-4" /> New supplier</button>} />
      <div className="mb-4 max-w-sm"><SearchInput value={q} onChange={setQ} placeholder="Search suppliers…" /></div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((s) => (
          <div key={s.id} className="card-soft p-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="font-display text-lg font-semibold">{s.name}</p>
              <StatusBadge status={s.status} />
            </div>
            <p className="text-sm text-muted-foreground">Contact: {s.contact}</p>
            <div className="mt-2 space-y-1 text-sm">
              <p className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-muted-foreground" /> {s.phone}</p>
              {s.email && <p className="flex items-center gap-2"><Mail className="h-3.5 w-3.5 text-muted-foreground" /> {s.email}</p>}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">{s.items} item(s) supplied · view purchase history →</p>
          </div>
        ))}
      </div>
    </div>
  );
}