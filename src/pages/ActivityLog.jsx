import React, { useState } from "react";
import { ScrollText } from "lucide-react";
import { PageHeader, SearchInput } from "@/components/ui/shared";
import { activityLog } from "@/lib/mockData";

export default function ActivityLog() {
  const [q, setQ] = useState("");
  const filtered = activityLog.filter((l) => !q || l.action.toLowerCase().includes(q.toLowerCase()) || l.who.toLowerCase().includes(q.toLowerCase()) || l.target.toLowerCase().includes(q.toLowerCase()));
  return (
    <div>
      <PageHeader title="Activity log" subtitle="Visible to the Manager only. Immutable — entries cannot be edited or deleted. Records who, when, what, target, old/new value and reason." />
      <div className="mb-4 max-w-sm"><SearchInput value={q} onChange={setQ} placeholder="Search log…" /></div>
      <div className="card-soft p-4">
        <ol className="relative space-y-4 border-l border-border pl-6">
          {filtered.map((l) => (
            <li key={l.id} className="relative">
              <span className="absolute -left-[31px] flex h-5 w-5 items-center justify-center rounded-full bg-secondary"><ScrollText className="h-3 w-3 text-primary" /></span>
              <p className="text-sm"><span className="font-medium">{l.who}</span> · <span className="text-muted-foreground">{l.when}</span></p>
              <p className="text-sm">{l.action} — <span className="font-medium">{l.target}</span></p>
              {(l.old || l.new) && <p className="text-xs text-muted-foreground">{l.old || "—"} → {l.new || "—"}</p>}
              {l.reason && <p className="text-xs text-amber-700">Reason: {l.reason}</p>}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}