import React from "react";
import { Play, CheckCircle2, Sparkles } from "lucide-react";
import { PageHeader, StatusBadge, EmptyState } from "@/components/ui/shared";
import { useData } from "@/lib/DataContext";
import { useRole } from "@/lib/RoleContext";
import { ROLES } from "@/lib/roles";
import { nextId, clockTime } from "@/lib/datetime";
import { notifySuccess } from "@/lib/notify";

export default function TableQueue() {
  const { db, updateItem, insertItem } = useData();
  const { role } = useRole();
  const { tables, cleaningTasks } = db;
  const me = ROLES.find((r) => r.id === role)?.name || "Cleaner";
  const cleaning = tables.filter((t) => t.status === "Cleaning");

  const taskFor = (tableNumber) =>
    cleaningTasks.find((t) => t.type === "table" && t.area === `Table ${tableNumber}` && t.status !== "Completed");

  const start = (t) => {
    const task = taskFor(t.number);
    if (task) {
      updateItem("cleaningTasks", task.id, { status: "In Progress", assignee: me });
    } else {
      insertItem("cleaningTasks", {
        id: nextId(cleaningTasks, "CL", 2),
        area: `Table ${t.number}`,
        task: "Clean & reset table",
        assignee: me,
        due: "Now",
        status: "In Progress",
        type: "table",
        source: "Table queue",
      });
    }
    updateItem("tables", t.id, { cleaner: me });
    notifySuccess(`Table ${t.number} started`);
  };

  const release = (t) => {
    const task = taskFor(t.number);
    if (task) updateItem("cleaningTasks", task.id, { status: "Completed", assignee: task.assignee === "Unassigned" ? me : task.assignee, completedAt: clockTime() });
    updateItem("tables", t.id, { status: "Available", order: null, cleaner: null });
    notifySuccess(`Table ${t.number} released`);
  };

  return (
    <div>
      <PageHeader title="Table queue" subtitle="Tables waiting to be cleaned. The first cleaner to start one becomes its assignee. Completing it lets the waiter reopen the table." />
      {cleaning.length === 0 ? (
        <EmptyState icon={Sparkles} title="No tables waiting" description="When a table is paid, it enters Cleaning and a task appears here for the shared queue." />
      ) : (
        <div className="space-y-3">
          {cleaning.map((t) => {
            const task = taskFor(t.number);
            const mine = task?.assignee === me;
            const startedByOther = task && task.status === "In Progress" && !mine;
            return (
              <div key={t.id} className="card-soft p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-display text-xl font-semibold">Table {t.number}</p>
                    <p className="text-sm text-muted-foreground">{t.seats} seats · {t.section}</p>
                    {task && <p className="mt-1 text-xs text-muted-foreground">{task.status === "In Progress" ? `Being cleaned by ${task.assignee}` : `Waiting · due ${task.due}`}</p>}
                  </div>
                  <StatusBadge status={startedByOther ? "In Progress" : task?.status === "In Progress" ? "In Progress" : "Pending"} />
                </div>
                {mine ? (
                  <button onClick={() => release(t)} className="btn-primary mt-3 w-full bg-sage-600"><CheckCircle2 className="h-4 w-4" /> Complete & release</button>
                ) : startedByOther ? (
                  <p className="mt-3 rounded-lg bg-secondary/60 px-3 py-2 text-xs text-muted-foreground">Another cleaner has this table.</p>
                ) : (
                  <button onClick={() => start(t)} className="btn-primary mt-3 w-full"><Play className="h-4 w-4" /> Start cleaning</button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}