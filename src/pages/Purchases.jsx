import React, { useMemo, useState } from "react";
import { Plus, Check, X, Eye, AlertTriangle } from "lucide-react";
import { PageHeader, StatusBadge, SearchInput, StatCard, EmptyState } from "@/components/ui/shared";
import Modal from "@/components/ui/Modal";
import { etb, round2 } from "@/lib/format";
import { useData } from "@/lib/DataContext";
import { useRole } from "@/lib/RoleContext";
import { isPrivileged } from "@/lib/roles";
import { notifySaved, notifySuccess } from "@/lib/notify";
import { stamp, nextId, businessDate } from "@/lib/datetime";

const STATUSES = ["All", "Draft", "Requested", "Approved", "Partially Received", "Received", "Completed", "Rejected", "Cancelled", "Closed", "Emergency - Received"];

export default function Purchases() {
  const { db, updateItem, insertItem } = useData();
  const { role } = useRole();
  const { purchases, suppliers } = db;
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("All");
  const [rejecting, setRejecting] = useState(null);
  const [creating, setCreating] = useState(false);
  const isManager = isPrivileged(role);

  const view = useMemo(() => {
    const needle = q.toLowerCase();
    return {
      filtered: purchases.filter((p) => {
        const okQ = !needle || p.id.toLowerCase().includes(needle) || p.supplier.toLowerCase().includes(needle);
        const okS = status === "All" || p.status === status;
        return okQ && okS;
      }),
      pending: purchases.filter((p) => p.status === "Requested").length,
      emergency: purchases.filter((p) => p.emergency && !p.reviewed).length,
      partial: purchases.filter((p) => p.status === "Partially Received").length,
    };
  }, [purchases, q, status]);
  const { filtered, pending, emergency, partial } = view;

  const log = (action, target, oldV, newV, reason) =>
    insertItem("activityLog", { id: `L${Date.now()}`, who: role || "manager", when: stamp(), action, target, old: String(oldV ?? ""), new: String(newV ?? ""), reason: reason || "" });

  const approve = (p) => {
    updateItem("purchases", p.id, { status: "Approved" });
    log("Approved purchase", p.id, p.status, "Approved", "");
    notifySaved(`${p.id} approved`);
  };

  const reject = (p, reason) => {
    updateItem("purchases", p.id, { status: "Rejected", reason, total: 0 });
    log("Rejected purchase", p.id, p.status, "Rejected", reason);
    setRejecting(null);
    notifySuccess(`${p.id} rejected`);
  };

  const markReviewed = (p) => {
    updateItem("purchases", p.id, { reviewed: true });
    log("Reviewed emergency purchase", p.id, "Unreviewed", "Reviewed", "");
    notifySuccess(`${p.id} marked reviewed`);
  };

  const receive = (p) => {
    updateItem("purchases", p.id, { status: "Received", receivedDate: businessDate() });
    log("Received purchase", p.id, p.status, "Received", "");
    notifySuccess(`${p.id} received`);
  };

  return (
    <div>
      <PageHeader
        title="ግዢዎች · Purchases & Sourcing"
        subtitle="Manager approves every request — no auto-approval. Emergency purchases add stock immediately and are flagged for review."
        actions={<button onClick={() => setCreating(true)} className="btn-primary"><Plus className="h-4 w-4" /> New request</button>}
      />
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total" value={purchases.length} />
        <StatCard label="Awaiting approval" value={pending} tone="terracotta" />
        <StatCard label="Emergency review" value={emergency} tone="berbere" />
        <StatCard label="Partially received" value={partial} tone="gold" />
      </div>
      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <div className="flex-1"><SearchInput value={q} onChange={setQ} placeholder="Search PO no. or supplier…" /></div>
        <select aria-label="Filter by status" value={status} onChange={(e) => setStatus(e.target.value)} className="input-soft w-auto">{STATUSES.map((s) => <option key={s}>{s}</option>)}</select>
      </div>
      <div className="card-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <caption className="sr-only">Purchase orders</caption>
            <thead className="bg-secondary/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th scope="col" className="px-4 py-3 font-medium">PO</th>
                <th scope="col" className="px-4 py-3 font-medium">Supplier</th>
                <th scope="col" className="px-4 py-3 font-medium">Date</th>
                <th scope="col" className="px-4 py-3 text-right font-medium">Lines</th>
                <th scope="col" className="px-4 py-3 text-right font-medium">Total (ETB)</th>
                <th scope="col" className="px-4 py-3 font-medium">Status</th>
                <th scope="col" className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((p) => (
                <tr key={p.id} className="hover:bg-secondary/40">
                  <td className="px-4 py-3 font-medium">{p.id}{p.emergency && <AlertTriangle aria-label="Emergency purchase" className="ml-1 inline h-3.5 w-3.5 text-berbere-500" />}</td>
                  <td className="px-4 py-3">{p.supplier}</td>
                  <td className="px-4 py-3 text-muted-foreground">{p.date}</td>
                  <td className="px-4 py-3 text-right">{p.lines}</td>
                  <td className="px-4 py-3 text-right font-medium">{etb(p.total)}</td>
                  <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {p.status === "Requested" && isManager && <>
                        <button onClick={() => approve(p)} aria-label={`Approve ${p.id}`} className="rounded-md bg-sage-100 p-1.5 text-sage-700 hover:bg-sage-200"><Check className="h-4 w-4" /></button>
                        <button onClick={() => setRejecting(p)} aria-label={`Reject ${p.id}`} className="rounded-md bg-berbere-100 p-1.5 text-berbere-600 hover:bg-berbere-200"><X className="h-4 w-4" /></button>
                      </>}
                      {p.emergency && !p.reviewed && isManager && <button onClick={() => markReviewed(p)} aria-label={`Mark ${p.id} reviewed`} className="rounded-md bg-gold-100 p-1.5 text-gold-600 hover:bg-gold-200"><Eye className="h-4 w-4" /></button>}
                      {p.status === "Approved" && <button onClick={() => receive(p)} className="btn-outline px-2 py-1 text-xs">Receive</button>}
                      {!isManager && p.status === "Requested" && <span className="text-xs text-muted-foreground">Awaiting Manager</span>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="p-6">
            <EmptyState title="No purchase orders match" description="Try a different search term or status filter." icon={AlertTriangle} />
          </div>
        )}
      </div>
      <p className="mt-4 text-xs text-muted-foreground">A purchase does not create an expense. Reports show purchases, expenses and maintenance costs side by side — never combined.</p>

      {rejecting && (
        <ReasonModal po={rejecting} onClose={() => setRejecting(null)} onConfirm={(reason) => reject(rejecting, reason)} />
      )}
      {creating && (
        <NewRequestModal suppliers={suppliers} existing={purchases} onClose={() => setCreating(false)}
          onCreate={(draft) => {
            const id = nextId(purchases, "PO-", 4);
            insertItem("purchases", { id, date: businessDate(), status: "Requested", emergency: false, ...draft });
            log("Created purchase request", id, "", "Requested", "");
            setCreating(false);
            notifySuccess(`${id} submitted for approval`);
          }} />
      )}
    </div>
  );
}

function ReasonModal({ po, onClose, onConfirm }) {
  const [reason, setReason] = useState("");
  return (
    <Modal
      title={`Reject ${po.id}`}
      description="A rejected order keeps its record and cannot be reopened. Reason required."
      onClose={onClose}
      size="sm"
      onSubmit={(e) => {
        e.preventDefault();
        if (!reason.trim()) return;
        onConfirm(reason.trim());
      }}
      footer={
        <>
          <button type="button" onClick={onClose} className="btn-outline flex-1">Back</button>
          <button type="submit" disabled={!reason.trim()} className="btn-destructive flex-1">Reject</button>
        </>
      }>
      <label htmlFor="po-reject-reason" className="text-sm font-medium">Reason (required)</label>
      <input id="po-reject-reason" value={reason} onChange={(e) => setReason(e.target.value)} className="input-soft mt-1" />
    </Modal>
  );
}

function NewRequestModal({ suppliers, existing, onClose, onCreate }) {
  const [supplier, setSupplier] = useState(suppliers[0]?.name || "");
  const [amount, setAmount] = useState("");
  const [lines, setLines] = useState(1);
  const total = Number(amount);
  const valid = supplier && Number.isFinite(total) && total > 0 && lines > 0;
  return (
    <Modal
      title="New purchase request"
      description="Submits as Requested. Only a Manager can approve it."
      onClose={onClose}
      size="sm"
      onSubmit={(e) => {
        e.preventDefault();
        if (!valid) return;
        onCreate({ supplier, total: round2(total), lines });
      }}
      footer={
        <>
          <button type="button" onClick={onClose} className="btn-outline flex-1">Back</button>
          <button type="submit" disabled={!valid} className="btn-primary flex-1">Submit</button>
        </>
      }>
      <label htmlFor="po-supplier" className="text-sm font-medium">Supplier</label>
      <select id="po-supplier" value={supplier} onChange={(e) => setSupplier(e.target.value)} className="input-soft mt-1 mb-3">
        {suppliers.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
      </select>
      <label htmlFor="po-lines" className="text-sm font-medium">Line items</label>
      <input id="po-lines" type="number" min="1" value={lines} onChange={(e) => setLines(Number(e.target.value))} className="input-soft mt-1 mb-3" />
      <label htmlFor="po-total" className="text-sm font-medium">Total (ETB)</label>
      <input id="po-total" type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className="input-soft" />
      <p className="mt-3 rounded-lg bg-secondary/60 px-3 py-2 text-xs text-muted-foreground">Next number: {nextId(existing, "PO-", 4)}.</p>
    </Modal>
  );
}