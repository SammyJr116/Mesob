import React, { useState } from "react";
import { Plus, Sparkles, Repeat, AlertTriangle } from "lucide-react";
import { PageHeader, StatusBadge, SectionCard, StatCard } from "@/components/ui/shared";
import { cleaningTasks, cleaningTemplates } from "@/lib/mockData";
import { cn } from "@/lib/utils";

export default function Cleaning() {
  const [tab, setTab] = useState("tasks");
  const pending = cleaningTasks.filter((t) => t.status === "Pending");
  const overdue = cleaningTasks.filter((t) => t.status === "Overdue");
  const inProgress = cleaningTasks.filter((t) => t.status === "In Progress");

  return (
    <div>
      <PageHeader title="Cleaning" subtitle="Table-clean tasks start unassigned in a shared queue. Every other task is assigned to a specific cleaner." actions={<button className="btn-primary"><Plus className="h-4 w-4" /> New task</button>} />
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Pending" value={pending.length} tone="amber" icon={Sparkles} />
        <StatCard label="In progress" value={inProgress.length} tone="sky" icon={Sparkles} />
        <StatCard label="Overdue" value={overdue.length} tone="rose" icon={AlertTriangle} />
        <StatCard label="Templates" value={cleaningTemplates.length} icon={Repeat} />
      </div>

      <div className="mb-4 flex gap-2 border-b border-border">
        {["tasks", "templates"].map((t) => (
          <button key={t} onClick={() => setTab(t)} className={cn("border-b-2 px-3 py-2 text-sm font-medium capitalize", tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground")}>{t}</button>
        ))}
      </div>

      {tab === "tasks" ? (
        <div className="space-y-2">
          {cleaningTasks.map((t) => (
            <div key={t.id} className={cn("card-soft flex items-center gap-3 p-3", t.status === "Overdue" && "border-rose-200 bg-rose-50/40")}>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary"><Sparkles className="h-5 w-5 text-primary" /></div>
              <div className="flex-1">
                <p className="font-medium">{t.task} · <span className="text-muted-foreground">{t.area}</span></p>
                <p className="text-xs text-muted-foreground">{t.assignee} · due {t.due} · {t.source}{t.type === "table" && " · shared queue"}</p>
              </div>
              <StatusBadge status={t.status} />
            </div>
          ))}
        </div>
      ) : (
        <SectionCard title="Recurring templates" action={<button className="btn-outline text-sm"><Repeat className="h-4 w-4" /> New template</button>}>
          <div className="space-y-2">
            {cleaningTemplates.map((t) => (
              <div key={t.id} className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2.5 text-sm">
                <div><p className="font-medium">{t.task} · {t.area}</p><p className="text-xs text-muted-foreground">{t.frequency} · due {t.due} · {t.assignee}</p></div>
                <button className="text-xs text-primary">Edit</button>
              </div>
            ))}
          </div>
        </SectionCard>
      )}
    </div>
  );
}