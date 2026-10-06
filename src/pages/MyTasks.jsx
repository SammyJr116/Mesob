import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Play, CheckCircle2, Camera, AlertTriangle } from "lucide-react";
import { PageHeader, StatusBadge, EmptyState } from "@/components/ui/shared";
import Modal from "@/components/ui/Modal";
import { useData } from "@/lib/DataContext";
import { useRole } from "@/lib/RoleContext";
import { ROLES } from "@/lib/roles";
import { clockTime } from "@/lib/datetime";
import { notifySuccess } from "@/lib/notify";
import { cn } from "@/lib/utils";

export default function MyTasks() {
  const navigate = useNavigate();
  const { db, updateItem, insertItem } = useData();
  const { role } = useRole();
  const { cleaningTasks, tables } = db;
  const [reportFor, setReportFor] = useState(null);
  const [notes, setNotes] = useState({});
  const [photo, setPhoto] = useState({});

  const me = ROLES.find((r) => r.id === role)?.name || "Cleaner";
  // A cleaner sees the shared table queue plus anything assigned to them.
  const tasks = cleaningTasks.filter((t) => t.assignee === me || t.assignee === "Tigist" || t.assignee === "Solomon" || t.assignee === "Unassigned");
  const overdue = tasks.filter((t) => t.status === "Overdue").length;

  const start = (t) => {
    updateItem("cleaningTasks", t.id, { status: "In Progress", assignee: me });
    notifySuccess(`${t.task} started`);
  };

  const complete = (t) => {
    updateItem("cleaningTasks", t.id, {
      status: "Completed",
      completedAt: clockTime(),
      notes: notes[t.id] || "",
      photoName: photo[t.id] || "",
    });
    // Finishing a table-clean is what actually releases the table.
    if (t.type === "table") {
      const num = String(t.area || "").replace(/^Table\s+/i, "");
      const table = tables.find((x) => x.number === num);
      if (table && table.status === "Cleaning") {
        updateItem("tables", table.id, { status: "Available", order: null });
      }
    }
    notifySuccess(`${t.task} completed${t.type === "table" ? ` · ${t.area} is free again` : ""}`);
  };

  return (
    <div>
      <PageHeader title="My tasks" subtitle="Start a task, complete it with optional notes and photo. Photo proof is never mandatory." />
      {overdue > 0 ? (
        <div role="status" className="mb-4 flex items-center gap-2 rounded-xl border border-berbere-200 bg-berbere-100 px-4 py-3 text-sm text-berbere-600">
          <AlertTriangle className="h-4 w-4" /> {overdue} task{overdue === 1 ? " is" : "s are"} overdue. The Manager has been notified.
        </div>
      ) : null}

      {tasks.length === 0 ? (
        <EmptyState title="Nothing assigned to you" description="Shared table-clean tasks appear here as soon as a table is paid." icon={CheckCircle2} />
      ) : (
        <div className="space-y-3">
          {tasks.map((t) => (
            <div key={t.id} className={cn("card-soft p-4", t.status === "Overdue" && "border-berbere-200 bg-berbere-100/40", t.status === "Completed" && "opacity-60")}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-display text-lg font-semibold">{t.task}</p>
                  <p className="text-sm text-muted-foreground">{t.area} · due {t.due}</p>
                  {t.type === "table" && <span className="mt-1 inline-block rounded bg-gold-100 px-2 py-0.5 text-xs text-gold-600">Shared table queue</span>}
                </div>
                <StatusBadge status={t.status} />
              </div>
              {t.status === "Pending" || t.status === "Overdue" ? (
                <button onClick={() => start(t)} className="btn-primary mt-3 w-full"><Play className="h-4 w-4" /> Start task</button>
              ) : t.status === "In Progress" ? (
                <div className="mt-3 space-y-2">
                  <div>
                    <label htmlFor={`note-${t.id}`} className="sr-only">Notes for {t.task}</label>
                    <textarea id={`note-${t.id}`} value={notes[t.id] || ""} onChange={(e) => setNotes((n) => ({ ...n, [t.id]: e.target.value }))} placeholder="Notes (optional)" className="input-soft min-h-[50px]" />
                  </div>
                  <div>
                    <label htmlFor={`photo-${t.id}`} className="btn-outline flex w-full cursor-pointer items-center justify-center gap-2 text-sm">
                      <Camera className="h-4 w-4" />
                      {photo[t.id] ? photo[t.id] : "Add photo (optional)"}
                    </label>
                    <input id={`photo-${t.id}`} type="file" accept="image/*" className="sr-only" onChange={(e) => setPhoto((p) => ({ ...p, [t.id]: e.target.files?.[0]?.name || "" }))} />
                  </div>
                  <button onClick={() => complete(t)} className="btn-primary w-full bg-sage-600"><CheckCircle2 className="h-4 w-4" /> Complete</button>
                </div>
              ) : (
                <p className="mt-2 text-xs text-sage-600">✓ Completed{t.completedAt ? ` at ${t.completedAt}` : ""}</p>
              )}
            </div>
          ))}
        </div>
      )}

      <button onClick={() => setReportFor({ area: "—", task: "" })} className="btn-outline mt-4 w-full"><AlertTriangle className="h-4 w-4" /> Report an issue</button>

      {reportFor && (
        <ReportIssueModal
          onClose={() => setReportFor(null)}
          onSubmit={(what, detail) => {
            insertItem("incidents", {
              id: `IN-${Date.now()}`,
              reportedBy: me,
              type: "Other",
              when: clockTime(),
              area: reportFor.area,
              summary: what,
              detail,
              status: "Reported",
            });
            insertItem("notifications", {
              id: `N-${Date.now()}`,
              event: "Cleaning issue reported",
              detail: `${what} · ${reportFor.area}`,
              time: clockTime(),
              read: false,
              sound: false,
            });
            notifySuccess("Issue sent to the Manager");
            setReportFor(null);
          }}
        />
      )}

      {tasks.length > 0 && (
        <button onClick={() => navigate("/table-queue")} className="btn-ghost mt-3 w-full">Open the table queue →</button>
      )}
    </div>
  );
}

function ReportIssueModal({ onClose, onSubmit }) {
  const [what, setWhat] = useState("");
  const [detail, setDetail] = useState("");
  return (
    <Modal
      title="Report an issue"
      description="Goes to the Manager as an incident. Include what you were doing and what you found."
      size="sm"
      onClose={onClose}
      onSubmit={(e) => {
        e.preventDefault();
        if (!what.trim()) return;
        onSubmit(what.trim(), detail.trim());
      }}
      footer={
        <>
          <button type="button" onClick={onClose} className="btn-outline">Cancel</button>
          <button type="submit" className="btn-primary" disabled={!what.trim()}>Send</button>
        </>
      }
    >
      <label htmlFor="issue-what" className="mb-1 block text-sm font-medium">What happened</label>
      <input id="issue-what" value={what} onChange={(e) => setWhat(e.target.value)} className="input-soft" placeholder="e.g. Broken chair leg" />
      <label htmlFor="issue-detail" className="mb-1 mt-3 block text-sm font-medium">Detail (optional)</label>
      <textarea id="issue-detail" value={detail} onChange={(e) => setDetail(e.target.value)} className="input-soft min-h-[70px]" />
    </Modal>
  );
}