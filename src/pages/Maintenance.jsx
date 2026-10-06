import React, { useMemo, useState } from "react";
import { Plus, Wrench, BatteryWarning, Repeat, CheckCircle2, UserPlus, Trash2, Pencil } from "lucide-react";
import { PageHeader, StatusBadge, SectionCard, StatCard, EmptyState, SearchInput } from "@/components/ui/shared";
import Modal from "@/components/ui/Modal";
import DataTable from "@/components/ui/DataTable";
import { useData } from "@/lib/DataContext";
import { useRole } from "@/lib/RoleContext";
import { isPrivileged } from "@/lib/roles";
import { visibleMaintenanceRequests } from "@/lib/scope";
import { etb } from "@/lib/format";
import { notifySuccess, notifyError } from "@/lib/notify";
import { isoDate, stamp, nextId, toDate, daysBetween } from "@/lib/datetime";
import { cn } from "@/lib/utils";

const PRIORITIES = ["Low", "Medium", "High"];
const FLOW = ["Reported", "Assigned", "In Progress", "Completed"];

export default function Maintenance() {
  const { db, insertItem, updateItem, removeItem } = useData();
  const { role } = useRole();
  const { assets } = db;
  const manager = isPrivileged(role);

  const [tab, setTab] = useState("requests");
  const [q, setQ] = useState("");
  const [reporting, setReporting] = useState(false);
  const [assigning, setAssigning] = useState(null);
  const [editingAsset, setEditingAsset] = useState(null);

  /* The Manager assigns the work, so they see the whole board. Everyone else
     sees only what they reported or what is assigned to them. */
  const maintenanceRequests = useMemo(
    () => visibleMaintenanceRequests(db.maintenanceRequests, role),
    [db.maintenanceRequests, role]
  );

  const today = isoDate();
  const openRequests = maintenanceRequests.filter((m) => m.status !== "Completed");
  const expired = assets.filter((a) => {
    const w = toDate(a.warranty);
    return w && w.getTime() < new Date(today).getTime();
  });

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return maintenanceRequests.filter((m) => {
      if (!needle) return true;
      return [m.asset, m.problem, m.assignee, m.reported].some((v) => String(v || "").toLowerCase().includes(needle));
    });
  }, [maintenanceRequests, q]);

  const assetActionsColumn = manager
    ? {
        key: "actions",
        header: "Actions",
        align: /** @type {"right"} */ ("right"),
        render: (a) => (
          <div className="flex justify-end gap-1">
            <button onClick={() => setEditingAsset({ draft: { ...a }, original: a })} aria-label={`Edit ${a.name}`} className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground">
              <Pencil className="h-4 w-4" />
            </button>
            <button
              onClick={() => {
                const open = maintenanceRequests.filter((m) => m.asset === a.name && m.status !== "Completed");
                if (open.length) return notifyError(`${a.name} has ${open.length} open request${open.length === 1 ? "" : "s"}`);
                removeItem("assets", a.id);
                notifySuccess(`${a.name} removed`);
              }}
              aria-label={`Remove ${a.name}`}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-berbere-100 hover:text-berbere-600"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ),
      }
    : null;

  /** @type {import("@/components/ui/DataTable").DataTableColumn[]} */
  const assetColumns = [
    { key: "name", header: "Asset", sortable: true, render: (a) => <span className="font-medium">{a.name}</span> },
    { key: "category", header: "Category", sortable: true, render: (a) => <span className="text-muted-foreground">{a.category}</span> },
    { key: "serial", header: "Serial", sortable: true, render: (a) => <span className="text-muted-foreground">{a.serial}</span> },
    { key: "location", header: "Location", sortable: true, render: (a) => <span className="text-muted-foreground">{a.location}</span> },
    { key: "warranty", header: "Warranty", sortable: true, sortValue: (a) => a.warranty, render: (a) => {
      const left = daysBetween(today, a.warranty);
      return (
        <span className={left !== null && left < 0 ? "font-medium text-berbere-600" : "text-muted-foreground"}>
          {a.warranty}
          {left !== null && left < 0 ? ` (${Math.abs(left)}d ago)` : left !== null ? ` (${left}d left)` : ""}
        </span>
      );
    } },
    { key: "status", header: "Status", sortable: true, render: (a) => <StatusBadge status={a.status} /> },
    ...(manager ? [assetActionsColumn] : []),
  ].filter(Boolean);

  const report = (draft) => {
    const problem = draft.problem.trim();
    if (!problem) return notifyError("Describe the problem");
    if (draft.asset && !assets.some((a) => a.name === draft.asset)) return notifyError(`"${draft.asset}" is not on the asset list`);
    const id = nextId(maintenanceRequests, "MR");
    insertItem("maintenanceRequests", {
      id,
      date: stamp(),
      status: "Reported",
      cost: 0,
      assignee: "Unassigned",
      reported: role || "staff",
      priority: draft.priority,
      ...draft,
      problem,
    });
    // Reporting something broken puts the asset into maintenance state so the
    // asset list does not keep claiming it is fine.
    if (draft.asset) {
      const asset = assets.find((a) => a.name === draft.asset);
      if (asset && asset.status === "Active") updateItem("assets", asset.id, { status: "Under Maintenance" });
    }
    notifySuccess(`Maintenance request ${id} reported`);
    setReporting(false);
  };

  const advance = (m) => {
    const next = FLOW[FLOW.indexOf(m.status) + 1];
    if (!next) return;
    updateItem("maintenanceRequests", m.id, { status: next, completedOn: next === "Completed" ? stamp() : m.completedOn || "" });
    if (next === "Completed" && m.asset !== "No asset") {
      const asset = assets.find((a) => a.name === m.asset);
      if (asset) updateItem("assets", asset.id, { status: "Active" });
    }
    notifySuccess(`${m.id} moved to ${next}`);
  };

  const saveAsset = (draft) => {
    if (!draft.name.trim()) return notifyError("An asset needs a name");
    if (editingAsset?.original) {
      updateItem("assets", draft.id, draft);
      notifySuccess(`${draft.name} updated`);
    } else {
      insertItem("assets", draft);
      notifySuccess(`${draft.name} added`);
    }
    setEditingAsset(null);
  };

  return (
    <div>
      <PageHeader
        title="Maintenance"
        subtitle={manager ? "Any staff member can report an issue. Only the Manager manages requests afterwards. Costs are separate from purchases and expenses." : "You see the issues you reported and the ones assigned to you. Only the Manager manages requests afterwards."}
        actions={<button onClick={() => setReporting(true)} className="btn-primary"><Plus className="h-4 w-4" /> Report issue</button>}
      />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Open requests" value={openRequests.length} sub="needs a decision" tone="gold" icon={Wrench} onClick={() => setTab("requests")} />
        <StatCard label="Assets" value={assets.length} sub={`${assets.filter((a) => a.status === "Under Maintenance").length} under maintenance`} icon={Wrench} onClick={() => setTab("assets")} />
        <StatCard label="Warranty expired" value={expired.length} sub="past the warranty date" tone="berbere" icon={BatteryWarning} onClick={() => setTab("assets")} />
        <StatCard label="Spent on repairs" value={etb(maintenanceRequests.filter((m) => m.cost > 0).reduce((s, m) => s + m.cost, 0))} sub="ETB, separate from purchases" tone="sage" icon={Repeat} />
      </div>

      <div className="mb-4 flex gap-2 border-b border-border" role="tablist" aria-label="Maintenance views">
        {[["requests", "Requests"], ["assets", "Assets"]].map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={cn("border-b-2 px-3 py-2 text-sm font-medium capitalize", tab === id ? "border-primary text-primary" : "border-transparent text-muted-foreground")}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "requests" && (
        <>
          <div className="mb-4"><SearchInput value={q} onChange={setQ} placeholder="Search requests, assets, assignees…" /></div>
          {filtered.length === 0 ? (
            <EmptyState
              title={maintenanceRequests.length === 0 ? "No maintenance requests" : "No requests match"}
              description={maintenanceRequests.length === 0 ? "Anything reported from any screen lands here." : "Try a different search."}
              icon={Wrench}
              action={<button onClick={() => setReporting(true)} className="btn-primary text-sm"><Plus className="h-4 w-4" /> Report issue</button>}
            />
          ) : (
            <div className="space-y-2">
              {filtered.map((m) => (
                <div key={m.id} className="card-soft flex flex-wrap items-center gap-3 p-3">
                  <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", m.priority === "High" ? "bg-berbere-100 text-berbere-600" : m.priority === "Medium" ? "bg-gold-100 text-gold-600" : "bg-secondary text-muted-foreground")}>
                    <Wrench className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{m.asset} · {m.problem}</p>
                    <p className="text-xs text-muted-foreground">
                      {m.priority} priority · {m.assignee} · {m.date} · reported by {m.reported}
                      {m.cost > 0 && ` · cost ${etb(m.cost)} ETB`}
                      {m.completedOn && ` · completed ${m.completedOn}`}
                    </p>
                  </div>
                  <StatusBadge status={m.status} />
                  {manager ? (
                    <div className="flex w-full justify-end gap-2 border-t border-border pt-2 sm:w-auto sm:border-0 sm:pt-0">
                      <button onClick={() => advance(m)} disabled={m.status === "Completed"} className="btn-outline text-xs disabled:opacity-40">
                        <CheckCircle2 className="h-3.5 w-3.5" /> {m.status === "In Progress" ? "Complete" : `Move to ${FLOW[FLOW.indexOf(m.status) + 1] || "Completed"}`}
                      </button>
                      <button onClick={() => setAssigning(m)} className="btn-outline text-xs">
                        <UserPlus className="h-3.5 w-3.5" /> {m.assignee === "Unassigned" ? "Assign" : "Reassign"}
                      </button>
                    </div>
                  ) : (
                    <p className="w-full text-right text-xs text-muted-foreground sm:w-auto">Only the Manager moves these along</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === "assets" && (
        <SectionCard
          title="Assets"
          action={manager ? <button onClick={() => setEditingAsset({ draft: blankAsset(assets) })} className="btn-outline text-sm"><Plus className="h-4 w-4" /> New asset</button> : null}
        >
          <DataTable
            caption="Assets with category, serial, location and warranty"
            initialSort={{ key: "name", dir: "asc" }}
            columns={assetColumns}
            rows={assets}
            rowKey={(a) => a.id}
            pageSize={10}
            empty="No assets recorded yet."
          />
        </SectionCard>
      )}

      {reporting && (
        <ReportModal assets={assets} onClose={() => setReporting(false)} onSubmit={report} />
      )}

      {assigning && (
        <AssignModal request={assigning} onClose={() => setAssigning(null)} onSave={(assignee, cost) => {
          updateItem("maintenanceRequests", assigning.id, {
            assignee,
            cost: Number(cost) || 0,
            status: assigning.status === "Reported" ? "Assigned" : assigning.status,
          });
          notifySuccess(`${assigning.id} assigned to ${assignee}`);
          setAssigning(null);
        }} />
      )}

      {editingAsset && <AssetModal draft={editingAsset.draft} onClose={() => setEditingAsset(null)} onSave={saveAsset} />}
    </div>
  );
}

function blankAsset(assets) {
  return {
    id: nextId(assets, "A"),
    name: "",
    category: "Kitchen Equipment",
    serial: "",
    purchase: isoDate(),
    warranty: isoDate(),
    location: "Kitchen",
    status: "Active",
  };
}

function ReportModal({ assets, onClose, onSubmit }) {
  const [draft, setDraft] = useState({ asset: assets[0]?.name || "No asset", problem: "", priority: "Medium", notes: "" });
  const set = (patch) => setDraft((prev) => ({ ...prev, ...patch }));

  return (
    <Modal
      title="Report a maintenance issue"
      description="Available to every role. The Manager decides who handles it afterwards."
      onClose={onClose}
      onSubmit={(e) => {
        e.preventDefault();
        if (!draft.problem.trim()) return;
        onSubmit(draft);
      }}
      footer={
        <>
          <button type="button" onClick={onClose} className="btn-outline flex-1">Cancel</button>
          <button type="submit" disabled={!draft.problem.trim()} className="btn-primary flex-1">Submit report</button>
        </>
      }
    >
      <div className="space-y-3">
        <label htmlFor="mr-asset" className="block">
          <span className="mb-1 block text-sm font-medium">Asset</span>
          <select id="mr-asset" value={draft.asset} onChange={(e) => set({ asset: e.target.value })} className="input-soft">
            <option>No asset</option>
            {assets.map((a) => <option key={a.id}>{a.name}</option>)}
          </select>
        </label>
        <label htmlFor="mr-problem" className="block">
          <span className="mb-1 block text-sm font-medium">What is wrong</span>
          <textarea id="mr-problem" value={draft.problem} onChange={(e) => set({ problem: e.target.value })} rows={3} placeholder="e.g. Cold room temperature rising above 8°C" className="input-soft" />
        </label>
        <label htmlFor="mr-priority" className="block">
          <span className="mb-1 block text-sm font-medium">Priority</span>
          <select id="mr-priority" value={draft.priority} onChange={(e) => set({ priority: e.target.value })} className="input-soft">
            {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
          </select>
        </label>
        {draft.asset !== "No asset" && (
          <p className="rounded-lg bg-secondary/60 px-3 py-2 text-xs text-muted-foreground">
            Reporting marks {draft.asset} as under maintenance until the request is completed.
          </p>
        )}
      </div>
    </Modal>
  );
}

function AssignModal({ request, onClose, onSave }) {
  const [assignee, setAssignee] = useState(request.assignee === "Unassigned" ? "" : request.assignee);
  const [cost, setCost] = useState(request.cost || "");
  const valid = assignee.trim();

  return (
    <Modal
      title={`Assign ${request.id}`}
      description="Vendor visits are recorded here as a name so the cost stays traceable."
      onClose={onClose}
      size="sm"
      onSubmit={(e) => {
        e.preventDefault();
        if (!valid) return;
        onSave(assignee.trim(), cost);
      }}
      footer={
        <>
          <button type="button" onClick={onClose} className="btn-outline flex-1">Cancel</button>
          <button type="submit" disabled={!valid} className="btn-primary flex-1">Assign</button>
        </>
      }
    >
      <label htmlFor="as-name" className="mb-3 block">
        <span className="mb-1 block text-sm font-medium">Assignee</span>
        <input id="as-name" value={assignee} onChange={(e) => setAssignee(e.target.value)} placeholder="e.g. Solomon (vendor: GenPro)" className="input-soft" />
      </label>
      <label htmlFor="as-cost" className="block">
        <span className="mb-1 block text-sm font-medium">Cost (ETB, optional)</span>
        <input id="as-cost" type="number" min="0" step="0.01" value={cost} onChange={(e) => setCost(e.target.value)} className="input-soft" />
      </label>
    </Modal>
  );
}

function AssetModal({ draft, onClose, onSave }) {
  const [asset, setAsset] = useState(draft);
  const set = (patch) => setAsset((prev) => ({ ...prev, ...patch }));

  return (
    <Modal
      title={asset.name ? `Edit ${asset.name}` : "New asset"}
      onClose={onClose}
      onSubmit={(e) => {
        e.preventDefault();
        if (!asset.name.trim()) return;
        onSave(asset);
      }}
      footer={
        <>
          <button type="button" onClick={onClose} className="btn-outline flex-1">Cancel</button>
          <button type="submit" disabled={!asset.name.trim()} className="btn-primary flex-1">Save asset</button>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <AssetField label="Name" value={asset.name} onChange={(v) => set({ name: v })} placeholder="Industrial Oven #1" />
        <AssetField label="Serial" value={asset.serial} onChange={(v) => set({ serial: v })} placeholder="OV-2022-01" />
        <AssetField label="Category" value={asset.category} onChange={(v) => set({ category: v })} />
        <AssetField label="Location" value={asset.location} onChange={(v) => set({ location: v })} />
        <AssetField label="Purchase date" value={asset.purchase} onChange={(v) => set({ purchase: v })} type="date" />
        <AssetField label="Warranty until" value={asset.warranty} onChange={(v) => set({ warranty: v })} type="date" />
        <label htmlFor="a-status" className="block">
          <span className="mb-1 block text-sm font-medium">Status</span>
          <select id="a-status" value={asset.status} onChange={(e) => set({ status: e.target.value })} className="input-soft">
            <option>Active</option>
            <option>Under Maintenance</option>
            <option>Retired</option>
          </select>
        </label>
      </div>
    </Modal>
  );
}

/** @param {{ label: string, value: string, onChange: (v: string) => void, placeholder?: string, type?: string }} props */
function AssetField({ label, value, onChange, placeholder, type = "text" }) {
  const id = `asset-${label.toLowerCase().replace(/[^a-z]+/g, "-")}`;
  return (
    <label htmlFor={id} className="block">
      <span className="mb-1 block text-sm font-medium">{label}</span>
      <input id={id} type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="input-soft" />
    </label>
  );
}