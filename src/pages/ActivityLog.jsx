import React, { useState } from "react";
import { ScrollText } from "lucide-react";
import { PageHeader, SearchInput, EmptyState } from "@/components/ui/shared";
import DataTable from "@/components/ui/DataTable";
import { useData } from "@/lib/DataContext";

export default function ActivityLog() {
  const { db } = useData();
  const { activityLog } = db;
  const [q, setQ] = useState("");

  const filtered = activityLog.filter(
    (l) => !q || l.action.toLowerCase().includes(q.toLowerCase()) || l.who.toLowerCase().includes(q.toLowerCase()) || String(l.target).toLowerCase().includes(q.toLowerCase())
  );

  const columns = [
    { key: "who", header: "Who", sortable: true, render: (l) => <span className="font-medium">{l.who}</span> },
    { key: "when", header: "When", sortable: true, sortValue: (l) => l.when, render: (l) => <span className="text-muted-foreground">{l.when}</span> },
    { key: "action", header: "Action", sortable: true, render: (l) => l.action },
    { key: "target", header: "Target", sortable: true, render: (l) => <span className="font-medium">{l.target}</span> },
    {
      key: "change",
      header: "Change",
      sortValue: (l) => `${l.old} ${l.new}`,
      render: (l) => (l.old || l.new ? <span className="text-muted-foreground">{l.old || "—"} → {l.new || "—"}</span> : <span className="text-muted-foreground">—</span>),
    },
    { key: "reason", header: "Reason", render: (l) => (l.reason ? <span className="text-gold-600">{l.reason}</span> : <span className="text-muted-foreground">—</span>) },
  ];

  return (
    <div>
      <PageHeader title="Activity log" subtitle="Visible to the Manager only. Immutable — entries cannot be edited or deleted. Records who, when, what, target, old/new value and reason." />
      <div className="mb-4 max-w-sm"><SearchInput value={q} onChange={setQ} placeholder="Search log…" /></div>
      {filtered.length === 0 ? (
        <EmptyState title="No log entries match" description="Every recorded mutation appears here with who did it and why." icon={ScrollText} />
      ) : (
        <DataTable
          caption="Immutable activity log"
          columns={columns}
          rows={filtered}
          pageSize={12}
          initialSort={{ key: "when", dir: "desc" }}
        />
      )}
    </div>
  );
}