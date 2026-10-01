import React, { useState } from "react";
import { Play, CheckCircle2, Camera, AlertTriangle } from "lucide-react";
import { PageHeader, StatusBadge } from "@/components/ui/shared";
import { cleaningTasks } from "@/lib/mockData";
import { cn } from "@/lib/utils";

export default function MyTasks() {
  const [tasks, setTasks] = useState(cleaningTasks.filter((t) => t.assignee === "Tigist" || t.assignee === "Solomon" || t.assignee === "Unassigned"));
  const start = (id) => setTasks((ts) => ts.map((t) => t.id === id ? { ...t, status: "In Progress" } : t));
  const complete = (id) => setTasks((ts) => ts.map((t) => t.id === id ? { ...t, status: "Completed" } : t));

  return (
    <div>
      <PageHeader title="My tasks" subtitle="Start a task, complete it with optional notes and photo. Photo proof is never mandatory." />
      <div className="mb-4 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800 flex items-center gap-2">
        <AlertTriangle className="h-4 w-4" /> 1 task is overdue. The Manager has been notified.
      </div>
      <div className="space-y-3">
        {tasks.map((t) => (
          <div key={t.id} className={cn("card-soft p-4", t.status === "Overdue" && "border-rose-200 bg-rose-50/40", t.status === "Completed" && "opacity-60")}>
            <div className="flex items-start justify-between">
              <div>
                <p className="font-display text-lg font-semibold">{t.task}</p>
                <p className="text-sm text-muted-foreground">{t.area} · due {t.due}</p>
                {t.type === "table" && <span className="mt-1 inline-block rounded bg-sky-100 px-2 py-0.5 text-xs text-sky-700">Shared table queue</span>}
              </div>
              <StatusBadge status={t.status} />
            </div>
            {t.status === "Pending" || t.status === "Overdue" ? (
              <button onClick={() => start(t.id)} className="btn-primary mt-3 w-full"><Play className="h-4 w-4" /> Start task</button>
            ) : t.status === "In Progress" ? (
              <div className="mt-3 space-y-2">
                <textarea placeholder="Notes (optional)" className="input-soft min-h-[50px]" />
                <button className="btn-outline w-full text-sm"><Camera className="h-4 w-4" /> Add photo (optional)</button>
                <button onClick={() => complete(t.id)} className="btn-primary w-full bg-emerald-600"><CheckCircle2 className="h-4 w-4" /> Complete</button>
              </div>
            ) : (
              <p className="mt-2 text-xs text-emerald-600">✓ Completed</p>
            )}
          </div>
        ))}
      </div>
      <button className="btn-outline mt-4 w-full"><AlertTriangle className="h-4 w-4" /> Report an issue</button>
    </div>
  );
}