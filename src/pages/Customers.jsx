import React, { useState } from "react";
import { Phone, Mail, User } from "lucide-react";
import { PageHeader, SearchInput } from "@/components/ui/shared";
import { customers } from "@/lib/mockData";

export default function Customers() {
  const [q, setQ] = useState("");
  const filtered = customers.filter((c) => !q || c.name.toLowerCase().includes(q.toLowerCase()) || c.phone.includes(q));
  return (
    <div>
      <PageHeader title="Customers" subtitle="Created automatically from reservations and takeaway orders, matched by phone. Archive-only — never deleted." />
      <div className="mb-4 max-w-sm"><SearchInput value={q} onChange={setQ} placeholder="Search by name or phone…" /></div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((c) => (
          <div key={c.id} className="card-soft p-4">
            <div className="mb-2 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary font-medium"><User className="h-5 w-5" /></div>
              <div><p className="font-medium">{c.name}</p><p className="text-xs text-muted-foreground">{c.orders} orders · last {c.lastVisit}</p></div>
            </div>
            <div className="space-y-1 text-sm text-muted-foreground">
              <p className="flex items-center gap-2"><Phone className="h-3.5 w-3.5" /> {c.phone}</p>
              {c.email && <p className="flex items-center gap-2"><Mail className="h-3.5 w-3.5" /> {c.email}</p>}
            </div>
            {c.notes && <p className="mt-2 rounded-lg bg-secondary/50 px-2 py-1.5 text-xs">{c.notes}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}