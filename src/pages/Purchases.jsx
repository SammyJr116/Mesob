import React, { useState } from "react";
import { Plus, Check, X, Eye, AlertTriangle } from "lucide-react";
import { PageHeader, StatusBadge, SearchInput, StatCard } from "@/components/ui/shared";
import { purchases, etb } from "@/lib/mockData";

const STATUSES = ["All", "Draft", "Requested", "Approved", "Partially Received", "Received", "Completed", "Rejected", "Cancelled", "Closed", "Emergency - Received"];

export default function Purchases() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("All");
  const filtered = purchases.filter((p) => {
    const okQ = !q || p.id.toLowerCase().includes(q.toLowerCase()) || p.supplier.toLowerCase().includes(q.toLowerCase());
    const okS = status === "All" || p.status === status;
    return okQ && okS;
  });
  const pending = purchases.filter((p) => p.status === "Requested").length;
  const emergency = purchases.filter((p) => p.emergency && !p.reviewed).length;

  return (
    <div>
      <PageHeader
        title="Purchases"
        subtitle="Manager approves every request — no auto-approval. Emergency purchases add stock immediately and are flagged for review."
        actions={<button className="btn-primary"><Plus className="h-4 w-4" /> New request</button>}
      />
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total" value={purchases.length} />
        <StatCard label="Awaiting approval" value={pending} tone="sky" />
        <StatCard label="Emergency review" value={emergency} tone="rose" />
        <StatCard label="Partially received" value={purchases.filter((p) => p.status === "Partially Received").length} tone="amber" />
      </div>
      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <div className="flex-1"><SearchInput value={q} onChange={setQ} placeholder="Search PO no. or supplier…" /></div>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="input-soft w-auto">{STATUSES.map((s) => <option key={s}>{s}</option>)}</select>
      </div>
      <div className="card-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">PO</th>
                <th className="px-4 py-3 font-medium">Supplier</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium text-right">Lines</th>
                <th className="px-4 py-3 font-medium text-right">Total (ETB)</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((p) => (
                <tr key={p.id} className="hover:bg-secondary/40">
                  <td className="px-4 py-3 font-medium">{p.id}{p.emergency && <AlertTriangle className="ml-1 inline h-3.5 w-3.5 text-rose-500" />}</td>
                  <td className="px-4 py-3">{p.supplier}</td>
                  <td className="px-4 py-3 text-muted-foreground">{p.date}</td>
                  <td className="px-4 py-3 text-right">{p.lines}</td>
                  <td className="px-4 py-3 text-right font-medium">{etb(p.total)}</td>
                  <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {p.status === "Requested" && <>
                        <button className="rounded-md bg-emerald-100 p-1.5 text-emerald-700 hover:bg-emerald-200" title="Approve"><Check className="h-4 w-4" /></button>
                        <button className="rounded-md bg-rose-100 p-1.5 text-rose-700 hover:bg-rose-200" title="Reject"><X className="h-4 w-4" /></button>
                      </>}
                      {p.emergency && !p.reviewed && <button className="rounded-md bg-amber-100 p-1.5 text-amber-700 hover:bg-amber-200" title="Mark reviewed"><Eye className="h-4 w-4" /></button>}
                      {p.status === "Approved" && <button className="btn-outline px-2 py-1 text-xs">Receive</button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <p className="mt-4 text-xs text-muted-foreground">A purchase does not create an expense. Reports show purchases, expenses and maintenance costs side by side — never combined.</p>
    </div>
  );
}