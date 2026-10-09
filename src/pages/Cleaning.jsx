import React, { useMemo, useState } from "react";
import { Plus, Sparkles, Repeat, AlertTriangle } from "lucide-react";
import { PageHeader, StatusBadge, SectionCard, StatCard, EmptyState } from "@/components/ui/shared";
import Modal from "@/components/ui/Modal";
import { useData } from "@/lib/DataContext";
import { useRole } from "@/lib/RoleContext";
import { isPrivileged } from "@/lib/roles";
import { visibleCleaningTasks } from "@/lib/scope";
import { nextId, clockTime } from "@/lib/datetime";
import { notifySuccess, notifyError } from "@/lib/notify";
import { cn } from "@/lib/utils";
import { cleaningApi } from "@/api/client";

export default function Cleaning() {
  const { db, insertItem, updateItem } = useData();
  const { role } = useRole();
  const manager = isPrivileged(role);
  const { cleaningTemplates, managedLists, tables } = db;
  const [tab, setTab] = useState("tasks");
  const [showTask, setShowTask] = useState(false);
  const [showTemplate, setShowTemplate] = useState(false);

  /* A cleaner sees their own assignments plus the shared queue; the Manager
     sees the whole board. */
  const cleaningTasks = useMemo(() => visibleCleaningTasks(db.cleaningTasks, role), [db.cleaningTasks, role]);

  const buckets = useMemo(
    () => ({
      pending: cleaningTasks.filter((t) => t.status === "Pending"),
      overdue: cleaningTasks.filter((t) => t.status === "Overdue"),
      inProgress: cleaningTasks.filter((t) => t.status === "In Progress"),
    }),
    [cleaningTasks]
  );
  const { pending, overdue, inProgress } = buckets;

  const complete = async (t) => {
    try {
      await cleaningApi.completeTask(t.id);
    } catch {
      // Offline fallback
    }
    updateItem("cleaningTasks", t.id, { status: "Completed", completedAt: clockTime() });
    // Completing a table-clean is what actually frees the table.
    if (t.type === "table") {
      const num = String(t.area || "").replace(/^Table\s+/i, "");
      const table = tables.find((x) => x.number === num);
      if (table && table.status === "Cleaning") {
        updateItem("tables", table.id, { status: "Available", order: null });
      }
    }
    notifySuccess(`${t.task} completed`);
  };

  const start = async (t) => {
    try {
      await cleaningApi.startTask(t.id);
    } catch {
      // Offline fallback
    }
    updateItem("cleaningTasks", t.id, { status: "In Progress" });
    notifySuccess(`${t.task} started`);
  };

  return (
    <div>
      <PageHeader
        title="ጽዳት · Cleaning & Hygiene"
        subtitle={manager ? "Table-clean tasks start unassigned in a shared queue. Every other task is assigned to a specific cleaner." : "Your assignments plus the shared table-clean queue."}
        actions={manager ? <button onClick={() => setShowTask(true)} className="btn-primary"><Plus className="h-4 w-4" /> New task</button> : null}
      />
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Pending" value={pending.length} tone="gold" icon={Sparkles} />
        <StatCard label="In progress" value={inProgress.length} tone="terracotta" icon={Sparkles} />
        <StatCard label="Overdue" value={overdue.length} tone="berbere" icon={AlertTriangle} />
        <StatCard label="Templates" value={cleaningTemplates.length} icon={Repeat} />
      </div>

      <div className="mb-4 flex gap-2 border-b border-border" role="tablist" aria-label="Cleaning views">
        {(manager ? ["tasks", "templates"] : ["tasks"]).map((t) => (
          <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={cn("border-b-2 px-3 py-2 text-sm font-medium capitalize", tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground")}>{t}</button>
        ))}
      </div>

      {tab === "tasks" ? (
        cleaningTasks.length === 0 ? (
          <EmptyState title="No cleaning tasks" description="Tasks created on payment, or manually here, appear in this queue." icon={Sparkles} action={manager ? <button onClick={() => setShowTask(true)} className="btn-primary">New task</button> : null} />
        ) : (
          <div className="space-y-2">
            {cleaningTasks.map((t) => (
              <div key={t.id} className={cn("card-soft flex flex-wrap items-center gap-3 p-3", t.status === "Overdue" && "border-berbere-200 bg-berbere-100/40")}>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary"><Sparkles className="h-5 w-5 text-primary" /></div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{t.task} · <span className="text-muted-foreground">{t.area}</span></p>
                  <p className="text-xs text-muted-foreground">{t.assignee} · due {t.due} · {t.source}{t.type === "table" && " · shared queue"}</p>
                </div>
                <StatusBadge status={t.status} />
                <div className="flex gap-1.5">
                  {t.status === "Pending" && <button onClick={() => start(t)} className="btn-outline text-xs">Start</button>}
                  {t.status !== "Completed" && <button onClick={() => complete(t)} className="btn-primary text-xs">Mark done</button>}
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        <SectionCard title="Recurring templates" action={<button onClick={() => setShowTemplate(true)} className="btn-outline text-sm"><Repeat className="h-4 w-4" /> New template</button>}>
          {cleaningTemplates.length === 0 ? (
            <EmptyState title="No templates" description="Templates spawn recurring tasks." icon={Repeat} />
          ) : (
            <div className="space-y-2">
              {cleaningTemplates.map((t) => (
                <div key={t.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-card px-3 py-2.5 text-sm">
                  <div>
                    <p className="font-medium">{t.task} · {t.area}</p>
                    <p className="text-xs text-muted-foreground">{t.frequency} · due {t.due} · {t.assignee}</p>
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      onClick={async () => {
                        try {
                          await cleaningApi.runTemplate(t.id);
                        } catch {
                          // Offline fallback
                        }
                        insertItem("cleaningTasks", {
                          id: nextId(cleaningTasks, "CL", 2),
                          area: t.area,
                          task: t.task,
                          assignee: t.assignee,
                          due: t.due,
                          status: "Pending",
                          type: "area",
                          source: `Template · ${t.frequency}`,
                        });
                        notifySuccess(`Task created from “${t.task}”`);
                      }}
                      className="btn-outline text-xs"
                    >Run now</button>
                    <button
                      onClick={async () => {
                        const newFreq = t.frequency === "Daily" ? "Weekly" : "Daily";
                        try {
                          await cleaningApi.updateTemplate(t.id, { frequency: newFreq });
                        } catch {
                          // Offline fallback
                        }
                        updateItem("cleaningTemplates", t.id, { frequency: newFreq });
                      }}
                      className="btn-ghost text-xs"
                    >Toggle frequency</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      )}

      {showTask && manager && (
        <NewTaskModal
          areas={managedLists.cleaningAreas}
          tables={tables.map((t) => t.number)}
          onClose={() => setShowTask(false)}
          onCreate={async (draft) => {
            if (!draft.task.trim() || !draft.area) {
              notifyError("Task needs a name and an area");
              return;
            }
            try {
              await cleaningApi.createTask({
                area: draft.area,
                description: draft.task.trim(),
                assignedToId: draft.assignee.trim() || undefined,
              });
            } catch {
              // Offline fallback
            }
            insertItem("cleaningTasks", {
              id: nextId(cleaningTasks, "CL", 2),
              status: "Pending",
              type: "area",
              source: "Added manually",
              ...draft,
              task: draft.task.trim(),
              assignee: draft.assignee.trim() || "Unassigned",
            });
            notifySuccess("Cleaning task added");
            setShowTask(false);
          }}
        />
      )}

      {showTemplate && (
        <NewTemplateModal
          areas={managedLists.cleaningAreas}
          onClose={() => setShowTemplate(false)}
          onCreate={async (draft) => {
            try {
              await cleaningApi.createTemplate({
                area: draft.area,
                taskName: draft.task,
                frequency: draft.frequency,
                preferredTime: draft.due,
              });
            } catch {
              // Offline fallback
            }
            insertItem("cleaningTemplates", { id: nextId(cleaningTemplates, "CT", 2), ...draft });
            notifySuccess("Template saved");
            setShowTemplate(false);
          }}
        />
      )}
    </div>
  );
}

function NewTaskModal({ areas, tables, onClose, onCreate }) {
  const [task, setTask] = useState("");
  const [area, setArea] = useState("");
  const [assignee, setAssignee] = useState("");
  const [due, setDue] = useState("Now");

  return (
    <Modal
      title="New cleaning task"
      description="Table areas are the shared queue; other areas go to a named cleaner."
      onClose={onClose}
      onSubmit={(e) => {
        e.preventDefault();
        onCreate({ task, area, assignee, due });
      }}
      footer={
        <>
          <button type="button" onClick={onClose} className="btn-outline">Cancel</button>
          <button type="submit" className="btn-primary">Create task</button>
        </>
      }
    >
      <div className="space-y-3">
        <div>
          <label htmlFor="cl-task" className="mb-1 block text-sm font-medium">Task</label>
          <input id="cl-task" value={task} onChange={(e) => setTask(e.target.value)} placeholder="e.g. Wipe glass & mats" className="input-soft" />
        </div>
        <div>
          <label htmlFor="cl-area" className="mb-1 block text-sm font-medium">Area</label>
          <select id="cl-area" value={area} onChange={(e) => setArea(e.target.value)} className="input-soft">
            <option value="">Select area…</option>
            <optgroup label="Tables">
              {tables.map((n) => <option key={n} value={`Table ${n}`}>Table {n}</option>)}
            </optgroup>
            <optgroup label="Areas">
              {areas.map((a) => <option key={a} value={a}>{a}</option>)}
            </optgroup>
          </select>
        </div>
        <div>
          <label htmlFor="cl-assignee" className="mb-1 block text-sm font-medium">Assignee</label>
          <input id="cl-assignee" value={assignee} onChange={(e) => setAssignee(e.target.value)} placeholder="Leave blank for the shared queue" className="input-soft" />
        </div>
        <div>
          <label htmlFor="cl-due" className="mb-1 block text-sm font-medium">Due</label>
          <input id="cl-due" value={due} onChange={(e) => setDue(e.target.value)} className="input-soft" />
        </div>
      </div>
    </Modal>
  );
}

function NewTemplateModal({ areas, onClose, onCreate }) {
  const [task, setTask] = useState("");
  const [area, setArea] = useState(areas[0] || "");
  const [assignee, setAssignee] = useState("");
  const [frequency, setFrequency] = useState("Daily");
  const [due, setDue] = useState("Now");

  return (
    <Modal
      title="New recurring template"
      description="Templates can be run on demand and repeat on the chosen frequency."
      onClose={onClose}
      onSubmit={(e) => {
        e.preventDefault();
        if (!task.trim()) return;
        onCreate({ task: task.trim(), area, assignee: assignee.trim() || "Unassigned", frequency, due });
      }}
      footer={
        <>
          <button type="button" onClick={onClose} className="btn-outline">Cancel</button>
          <button type="submit" className="btn-primary" disabled={!task.trim()}>Save template</button>
        </>
      }
    >
      <div className="space-y-3">
        <div>
          <label htmlFor="ct-task" className="mb-1 block text-sm font-medium">Task</label>
          <input id="ct-task" value={task} onChange={(e) => setTask(e.target.value)} className="input-soft" />
        </div>
        <div>
          <label htmlFor="ct-area" className="mb-1 block text-sm font-medium">Area</label>
          <select id="ct-area" value={area} onChange={(e) => setArea(e.target.value)} className="input-soft">
            {areas.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="ct-freq" className="mb-1 block text-sm font-medium">Frequency</label>
            <select id="ct-freq" value={frequency} onChange={(e) => setFrequency(e.target.value)} className="input-soft">
              <option>Daily</option><option>Weekly</option><option>Monthly</option>
            </select>
          </div>
          <div>
            <label htmlFor="ct-due" className="mb-1 block text-sm font-medium">Due</label>
            <input id="ct-due" value={due} onChange={(e) => setDue(e.target.value)} className="input-soft" />
          </div>
        </div>
        <div>
          <label htmlFor="ct-assignee" className="mb-1 block text-sm font-medium">Assignee</label>
          <input id="ct-assignee" value={assignee} onChange={(e) => setAssignee(e.target.value)} placeholder="Unassigned" className="input-soft" />
        </div>
      </div>
    </Modal>
  );
}