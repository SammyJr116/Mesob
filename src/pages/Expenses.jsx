import React, { useState } from "react";
import { Plus, Repeat, Receipt } from "lucide-react";
import { PageHeader, StatusBadge, SearchInput, StatCard, SectionCard } from "@/components/ui/shared";
import { expenses, managedLists, etb } from "@/lib/mockData";

export default function Expenses() {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All");
  const [showAdd, setShowAdd] = useState(false);
  const filtered = expenses.filter((e) => {
    const okQ = !q || e.description.toLowerCase().includes(q.toLowerCase()) || e.category.toLowerCase().includes(q.toLowerCase());
    const okCat = cat === "All" || e.category === cat;
    return okQ && okCat;
  });
  const confirmed = expenses.filter((e) => e.status === "Confirmed");
  const totalConfirmed = confirmed.reduce((s, e) => s + e.amount, 0);
  const pending = expenses.filter((e) => e.status === "Pending confirmation").length;

  return (
    <div>
      <PageHeader
        title="Expenses"
        subtitle="Manager and Inventory Staff record. Inventory Staff see only their own. Only Confirmed entries appear in reports."
        actions={<button onClick={() => setShowAdd(true)} className="btn-primary"><Plus className="h-4 w-4" /> New expense</button>}
      />
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Confirmed total" value={`${etb(totalConfirmed)}`} sub="ETB" tone="emerald" />
        <StatCard label="Pending confirmation" value={pending} tone="amber" />
        <StatCard label="Entries" value={expenses.length} />
        <StatCard label="Categories" value={managedLists.expenseCategories.length} />
      </div>

      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <div className="flex-1"><SearchInput value={q} onChange={setQ} placeholder="Search expenses…" /></div>
        <select value={cat} onChange={(e) => setCat(e.target.value)} className="input-soft w-auto">
          <option>All</option>
          {managedLists.expenseCategories.map((c) => <option key={c}>{c}</option>)}
        </select>
      </div>

      <div className="card-soft overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-secondary/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">Description</th>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium text-right">Amount</th>
              <th className="px-4 py-3 font-medium">Receipt</th>
              <th className="px-4 py-3 font-medium">By</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map((e) => (
              <tr key={e.id} className="hover:bg-secondary/40">
                <td className="px-4 py-3 font-medium">{e.category}</td>
                <td className="px-4 py-3">{e.description}</td>
                <td className="px-4 py-3 text-muted-foreground">{e.date}</td>
                <td className="px-4 py-3 text-right font-medium">{etb(e.amount)}</td>
                <td className="px-4 py-3">{e.receipt ? <Receipt className="h-4 w-4 text-emerald-600" /> : <span className="text-xs text-muted-foreground">—</span>}</td>
                <td className="px-4 py-3 text-muted-foreground">{e.by}</td>
                <td className="px-4 py-3"><StatusBadge status={e.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <SectionCard title="Recurring expense templates" className="mt-6" action={<button className="btn-outline text-sm"><Repeat className="h-4 w-4" /> New template</button>}>
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2">
            <span><strong>Rent</strong> · monthly · day 1</span>
            <span className="font-medium">{etb(60000)} ETB</span>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2">
            <span><strong>Utilities</strong> · monthly · day 15</span>
            <span className="font-medium">varies</span>
          </div>
          <p className="text-xs text-muted-foreground">A scheduled job creates a Pending-confirmation entry each period. The Manager confirms or edits the actual amount.</p>
        </div>
      </SectionCard>

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowAdd(false)}>
          <div className="w-full max-w-md rounded-2xl bg-card p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-4 font-display text-lg font-semibold">New expense</h3>
            <label className="mb-1 block text-sm font-medium">Category</label>
            <select className="input-soft mb-3">{managedLists.expenseCategories.map((c) => <option key={c}>{c}</option>)}</select>
            <label className="mb-1 block text-sm font-medium">Amount (ETB)</label>
            <input type="number" className="input-soft mb-3" />
            <label className="mb-1 block text-sm font-medium">Date</label>
            <input type="date" className="input-soft mb-3" />
            <label className="mb-1 block text-sm font-medium">Description</label>
            <input className="input-soft mb-3" />
            <label className="mb-1 block text-sm font-medium">Receipt photo (optional)</label>
            <div className="mb-4 rounded-lg border border-dashed border-border bg-secondary/40 p-4 text-center text-sm text-muted-foreground">Tap to upload (JPG/PNG/WEBP, max 5 MB)</div>
            <div className="flex gap-2">
              <button onClick={() => setShowAdd(false)} className="btn-outline flex-1">Cancel</button>
              <button onClick={() => setShowAdd(false)} className="btn-primary flex-1">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}