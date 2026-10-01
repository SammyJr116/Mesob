import React, { useState } from "react";
import { Plus, Wrench, BatteryWarning, Repeat } from "lucide-react";
import { PageHeader, StatusBadge, SectionCard, StatCard } from "@/components/ui/shared";
import { assets, maintenanceRequests } from "@/lib/mockData";
import { cn } from "@/lib/utils";

export default function Maintenance() {
  const [tab, setTab] = useState("requests");
  const open = maintenanceRequests.filter((m) => m.status !== "Completed").length;
  const expiredWarranty = assets.filter((a) => a.warranty < "2025-09-30").length;

  return (
    <div>
      <PageHeader title="Maintenance" subtitle="Any staff member can report an issue. Only the Manager manages requests afterwards. Costs are separate from purchases and expenses." actions={<button className="btn-primary"><Plus className="h-4 w-4" /> Report issue</button>} />
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Open requests" value={open} tone="amber" icon={Wrench} />
        <StatCard label="Assets" value={assets.length} icon={Wrench} />
        <StatCard label="Warranty expired" value={expiredWarranty} tone="rose" icon={BatteryWarning} />
        <StatCard label="Preventive templates" value={2} icon={Repeat} />
      </div>

      <div className="mb-4 flex gap-2 border-b border-border">
        {["requests", "assets"].map((t) => (
          <button key={t} onClick={() => setTab(t)} className={cn("border-b-2 px-3 py-2 text-sm font-medium capitalize", tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground")}>{t}</button>
        ))}
      </div>

      {tab === "requests" ? (
        <div className="space-y-2">
          {maintenanceRequests.map((m) => (
            <div key={m.id} className="card-soft flex items-center gap-3 p-3">
              <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", m.priority === "High" ? "bg-rose-100 text-rose-600" : m.priority === "Medium" ? "bg-amber-100 text-amber-600" : "bg-secondary text-muted-foreground")}>
                <Wrench className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="font-medium">{m.asset} · {m.problem}</p>
                <p className="text-xs text-muted-foreground">{m.priority} priority · {m.assignee} · {m.date} · reported by {m.reported}{m.cost > 0 && ` · cost ${m.cost} ETB`}</p>
              </div>
              <StatusBadge status={m.status} />
            </div>
          ))}
        </div>
      ) : (
        <SectionCard title="Assets" action={<button className="btn-outline text-sm"><Plus className="h-4 w-4" /> New asset</button>}>
          <div className="space-y-2">
            {assets.map((a) => {
              const expired = a.warranty < "2025-09-30";
              return (
                <div key={a.id} className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2.5 text-sm">
                  <div><p className="font-medium">{a.name}</p><p className="text-xs text-muted-foreground">{a.category} · {a.serial} · {a.location}</p></div>
                  <div className="flex items-center gap-3">
                    <span className={cn("text-xs", expired ? "text-rose-600 font-medium" : "text-muted-foreground")}>Warranty: {a.warranty}{expired && " (expired)"}</span>
                    <StatusBadge status={a.status === "Under Maintenance" ? "Under Maintenance" : a.status} />
                  </div>
                </div>
              );
            })}
          </div>
        </SectionCard>
      )}
    </div>
  );
}