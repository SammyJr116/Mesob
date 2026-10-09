import React, { useMemo, useState } from "react";
import { Plus, AlertTriangle, ArrowRight, CheckCircle2 } from "lucide-react";
import { PageHeader, StatusBadge, EmptyState, SearchInput, StatCard } from "@/components/ui/shared";
import Modal from "@/components/ui/Modal";
import { useData } from "@/lib/DataContext";
import { useRole } from "@/lib/RoleContext";
import { isPrivileged } from "@/lib/roles";
import { visibleIncidents } from "@/lib/scope";
import { notifySuccess } from "@/lib/notify";
import { stamp, nextId } from "@/lib/datetime";
import { cn } from "@/lib/utils";
import { securityApi } from "@/api/client";

export default function Incidents() {
  const { db, updateItem, insertItem } = useData();
  const { role } = useRole();
  const { managedLists } = db;
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("All");
  const [resolving, setResolving] = useState(null);
  const [creating, setCreating] = useState(false);
  const isManager = isPrivileged(role);
  const isSecurity = role === "security";
  const triage = isManager || isSecurity;

  /* Security starts the review and the Manager resolves, so both see the whole
     register. Every other role only sees the incidents they filed. */
  const incidents = useMemo(() => visibleIncidents(db.incidents, role), [db.incidents, role]);

  const list = useMemo(() => {
    const needle = q.toLowerCase();
    return incidents.filter((i) => {
      const okQ =
        !needle ||
        i.description.toLowerCase().includes(needle) ||
        i.type.toLowerCase().includes(needle) ||
        String(i.reported || "").toLowerCase().includes(needle);
      const okStatus = status === "All" || i.status === status;
      return okQ && okStatus;
    });
  }, [incidents, q, status]);

  const advance = async (i) => {
    try {
      await securityApi.reviewIncident(i.id);
    } catch {
      // Local fallback
    }
    updateItem("incidents", i.id, { status: "Under Review", reviewedOn: stamp() });
    notifySuccess(`${i.id} moved to review`);
  };

  const resolve = async (i, resolution) => {
    try {
      await securityApi.resolveIncident(i.id, resolution);
    } catch {
      // Local fallback
    }
    updateItem("incidents", i.id, { status: "Resolved", resolution, resolvedOn: stamp() });
    insertItem("activityLog", { id: `L${Date.now()}`, who: role || "manager", when: stamp(), action: "Resolved incident", target: i.id, old: i.status, new: "Resolved", reason: resolution });
    setResolving(null);
    notifySuccess(`${i.id} resolved`);
  };

  return (
    <div>
      <PageHeader
        title="Incidents"
        subtitle="Any staff member can report. Security can move to Under Review. Only the Manager can set Resolved. Archive-only — never deleted."
        actions={<button onClick={() => setCreating(true)} className="btn-primary"><Plus className="h-4 w-4" /> Report incident</button>}
      />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Reported" value={incidents.filter((i) => i.status === "Reported").length} tone="berbere" icon={AlertTriangle} />
        <StatCard label="Under review" value={incidents.filter((i) => i.status === "Under Review").length} tone="gold" icon={ArrowRight} />
        <StatCard label="Resolved" value={incidents.filter((i) => i.status === "Resolved").length} tone="sage" icon={CheckCircle2} />
        <StatCard label="All incidents" value={incidents.length} sub={triage ? "never deleted" : "filed by you"} />
      </div>

      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="max-w-sm flex-1"><SearchInput value={q} onChange={setQ} placeholder="Search incidents…" /></div>
        <label htmlFor="inc-status" className="sr-only">Filter by status</label>
        <select id="inc-status" value={status} onChange={(e) => setStatus(e.target.value)} className="input-soft w-auto">
          {["All", "Reported", "Under Review", "Resolved"].map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>

      {list.length === 0 ? (
        <EmptyState
          title={incidents.length === 0 ? "No incidents recorded" : "No incidents match"}
          description={incidents.length === 0 ? "Reports appear here and are never deleted." : "Try a different search or status."}
          icon={AlertTriangle}
          action={<button onClick={() => setCreating(true)} className="btn-primary text-sm"><Plus className="h-4 w-4" /> Report incident</button>}
        />
      ) : (
        <div className="space-y-3">
          {list.map((i) => (
            <div key={i.id} className={cn("card-soft p-4", i.status === "Resolved" && "opacity-70")}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-berbere-100 text-berbere-600"><AlertTriangle className="h-5 w-5" /></div>
                  <div className="min-w-0">
                    <p className="font-medium">{i.id} · {i.type} · <span className="text-muted-foreground">{i.location}</span></p>
                    <p className="text-sm text-muted-foreground">{i.description}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{i.date} · reported by {i.reported}</p>
                    {i.resolution && <p className="mt-2 rounded-lg bg-sage-100 px-3 py-2 text-sm text-sage-700">Resolution: {i.resolution}</p>}
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <StatusBadge status={i.status} />
                  {i.status === "Reported" && triage && <button onClick={() => advance(i)} className="btn-outline text-xs"><ArrowRight className="h-3.5 w-3.5" /> Move to review</button>}
                  {i.status === "Under Review" && isManager && <button onClick={() => setResolving(i)} className="btn-primary text-xs"><CheckCircle2 className="h-3.5 w-3.5" /> Resolve</button>}
                  {i.status === "Under Review" && !isManager && <span className="text-xs text-muted-foreground">Awaiting Manager</span>}
                  {i.status === "Reported" && !triage && <span className="text-xs text-muted-foreground">Security starts the review</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {resolving && (
        <ResolutionModal incident={resolving} onClose={() => setResolving(null)} onConfirm={(r) => resolve(resolving, r)} />
      )}
      {creating && (
        <NewIncidentModal types={managedLists.incidentTypes} existing={incidents} reporter={role || "staff"}
          onClose={() => setCreating(false)}
          onCreate={(draft) => {
            const id = nextId(incidents, "IN", 2);
            insertItem("incidents", { id, date: stamp(), status: "Reported", resolution: "", ...draft });
            setCreating(false);
            notifySuccess(`${id} reported`);
          }} />
      )}
    </div>
  );
}

function ResolutionModal({ incident, onClose, onConfirm }) {
  const [text, setText] = useState("");
  return (
    <Modal
      title={`Resolve ${incident.id}`}
      description="The resolution stays on the incident permanently. Required."
      onClose={onClose}
      size="sm"
      onSubmit={(e) => {
        e.preventDefault();
        if (!text.trim()) return;
        onConfirm(text.trim());
      }}
      footer={
        <>
          <button type="button" onClick={onClose} className="btn-outline flex-1">Back</button>
          <button type="submit" disabled={!text.trim()} className="btn-primary flex-1">Resolve</button>
        </>
      }
    >
      <label htmlFor="resolution" className="text-sm font-medium">Resolution (required)</label>
      <textarea id="resolution" rows={3} value={text} onChange={(e) => setText(e.target.value)} className="input-soft mt-1" />
    </Modal>
  );
}

function NewIncidentModal({ types, existing, reporter, onClose, onCreate }) {
  const [type, setType] = useState(types[0] || "Other");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const valid = location.trim() && description.trim();
  return (
    <Modal
      title="Report incident"
      description="Filed as Reported. Security picks it up, the Manager resolves it."
      onClose={onClose}
      size="sm"
      onSubmit={(e) => {
        e.preventDefault();
        if (!valid) return;
        onCreate({ type, location: location.trim(), description: description.trim(), reported: reporter });
      }}
      footer={
        <>
          <button type="button" onClick={onClose} className="btn-outline flex-1">Back</button>
          <button type="submit" disabled={!valid} className="btn-primary flex-1">Submit</button>
        </>
      }
    >
      <label htmlFor="inc-type" className="text-sm font-medium">Type</label>
      <select id="inc-type" value={type} onChange={(e) => setType(e.target.value)} className="input-soft mt-1 mb-3">
        {types.map((t) => <option key={t}>{t}</option>)}
      </select>
      <label htmlFor="inc-location" className="text-sm font-medium">Location</label>
      <input id="inc-location" value={location} onChange={(e) => setLocation(e.target.value)} className="input-soft mt-1 mb-3" />
      <label htmlFor="inc-desc" className="text-sm font-medium">Description</label>
      <textarea id="inc-desc" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} className="input-soft mt-1" />
      <p className="mt-3 rounded-lg bg-secondary/60 px-3 py-2 text-xs text-muted-foreground">
        Filed as Reported by {reporter}. Next number: {nextId(existing, "IN", 2)}.
      </p>
    </Modal>
  );
}