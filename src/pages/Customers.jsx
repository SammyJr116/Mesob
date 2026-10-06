import React, { useMemo, useState } from "react";
import { Phone, Mail, User } from "lucide-react";
import { PageHeader, SearchInput, EmptyState } from "@/components/ui/shared";
import { useData } from "@/lib/DataContext";

export default function Customers() {
  const { db } = useData();
  const { customers } = db;
  const [q, setQ] = useState("");
  const [archived, setArchived] = useState(false);

  const filtered = useMemo(() => {
    const needle = q.toLowerCase();
    return customers
      .filter((c) => (archived ? c.archived : !c.archived))
      .filter((c) => !needle || c.name.toLowerCase().includes(needle) || c.phone.includes(q));
  }, [customers, archived, q]);

  return (
    <div>
      <PageHeader title="Customers" subtitle="Created automatically from reservations and takeaway orders, matched by phone. Archive-only — never deleted." />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="max-w-sm flex-1"><SearchInput value={q} onChange={setQ} placeholder="Search by name or phone…" /></div>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input type="checkbox" checked={archived} onChange={(e) => setArchived(e.target.checked)} className="h-4 w-4 rounded border-input" />
          Show archived
        </label>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title={q ? "No matches" : "No customers yet"} description={q ? "Try a different name or phone." : "Customers appear here once a reservation or takeaway order records a phone number."} icon={User} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => (
            <div key={c.id} className="card-soft p-4">
              <div className="mb-2 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary"><User className="h-5 w-5" /></div>
                <div className="min-w-0">
                  <p className="truncate font-medium">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{c.orders} orders · last {c.lastVisit}</p>
                </div>
              </div>
              <div className="space-y-1 text-sm text-muted-foreground">
                <p className="flex items-center gap-2"><Phone className="h-3.5 w-3.5" /> {c.phone}</p>
                {c.email && <p className="flex items-center gap-2"><Mail className="h-3.5 w-3.5" /> {c.email}</p>}
              </div>
              {c.notes && <p className="mt-2 rounded-lg bg-secondary/50 px-2 py-1.5 text-xs">{c.notes}</p>}
              {c.archived && <p className="mt-2 text-xs text-muted-foreground">Archived</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}