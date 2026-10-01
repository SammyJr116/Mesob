import React, { useState } from "react";
import { Plus, Boxes, ArrowDownUp, ClipboardCheck, Trash2, AlertTriangle } from "lucide-react";
import { PageHeader, StatusBadge, SearchInput, SectionCard, StatCard } from "@/components/ui/shared";
import { inventoryItems, stockMovements, restaurant, managedLists } from "@/lib/mockData";
import { cn } from "@/lib/utils";

export default function Inventory() {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All");
  const [tab, setTab] = useState("items");
  const [showOp, setShowOp] = useState(null);

  const filtered = inventoryItems.filter((i) => {
    const okQ = !q || i.name.toLowerCase().includes(q.toLowerCase());
    const okCat = cat === "All" || i.category === cat;
    return okQ && okCat;
  });
  const lowCount = inventoryItems.filter((i) => i.status === "Low").length;
  const totalValue = inventoryItems.reduce((s, i) => s + i.qty, 0); // demo

  return (
    <div>
      <PageHeader
        title="Inventory"
        subtitle={`Tracking is ${restaurant.inventoryTracking ? "ON — recipe-based deduction active" : "OFF — recipes optional, no auto deduction"}. Quantities in base unit.`}
        actions={
          <>
            <button onClick={() => setShowOp("count")} className="btn-outline"><ClipboardCheck className="h-4 w-4" /> Stock count</button>
            <button onClick={() => setShowOp("adjust")} className="btn-outline"><ArrowDownUp className="h-4 w-4" /> Adjust</button>
            <button onClick={() => setShowOp("waste")} className="btn-outline"><Trash2 className="h-4 w-4" /> Waste</button>
            <button className="btn-primary"><Plus className="h-4 w-4" /> New item</button>
          </>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total items" value={inventoryItems.length} icon={Boxes} tone="amber" />
        <StatCard label="Low stock" value={lowCount} icon={AlertTriangle} tone="rose" />
        <StatCard label="Movements (today)" value={stockMovements.length} icon={ArrowDownUp} tone="sky" />
        <StatCard label="Tracking" value={restaurant.inventoryTracking ? "On" : "Off"} icon={Boxes} tone="emerald" />
      </div>

      <div className="mb-4 flex gap-2 border-b border-border">
        {["items", "movements"].map((t) => (
          <button key={t} onClick={() => setTab(t)} className={cn("border-b-2 px-3 py-2 text-sm font-medium capitalize transition-colors", tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground")}>{t}</button>
        ))}
      </div>

      {tab === "items" ? (
        <>
          <div className="mb-3 flex flex-col gap-2 sm:flex-row">
            <div className="flex-1"><SearchInput value={q} onChange={setQ} placeholder="Search items…" /></div>
            <select value={cat} onChange={(e) => setCat(e.target.value)} className="input-soft w-auto">
              <option>All</option>
              {managedLists.inventoryCategories.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="card-soft overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-secondary/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Item</th>
                    <th className="px-4 py-3 font-medium">Category</th>
                    <th className="px-4 py-3 font-medium">Base unit</th>
                    <th className="px-4 py-3 font-medium text-right">In stock</th>
                    <th className="px-4 py-3 font-medium text-right">Minimum</th>
                    <th className="px-4 py-3 font-medium">Supplier</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((i) => (
                    <tr key={i.id} className="hover:bg-secondary/40">
                      <td className="px-4 py-3 font-medium">{i.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{i.category}</td>
                      <td className="px-4 py-3 text-muted-foreground">{i.baseUnit}</td>
                      <td className="px-4 py-3 text-right font-medium">{i.qty.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right text-muted-foreground">{i.min.toLocaleString()}</td>
                      <td className="px-4 py-3 text-muted-foreground">{i.supplier}</td>
                      <td className="px-4 py-3"><StatusBadge status={i.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <SectionCard title="Stock movements (immutable)">
          <div className="space-y-2">
            {stockMovements.map((m) => (
              <div key={m.id} className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5 text-sm">
                <span className={cn("flex h-8 w-8 items-center justify-center rounded-lg", m.qty > 0 ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600")}>
                  {m.qty > 0 ? <ArrowDownUp className="h-4 w-4 rotate-180" /> : <ArrowDownUp className="h-4 w-4" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{m.item} · <span className="text-muted-foreground">{m.type}</span></p>
                  <p className="text-xs text-muted-foreground">{m.date} · {m.user} · {m.reason}</p>
                </div>
                <span className={cn("font-semibold", m.qty > 0 ? "text-emerald-600" : "text-rose-600")}>{m.qty > 0 ? "+" : ""}{m.qty.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {showOp && <OpModal op={showOp} onClose={() => setShowOp(null)} />}
    </div>
  );
}

function OpModal({ op, onClose }) {
  const titles = { count: "Stock count", adjust: "Adjust stock", waste: "Record waste" };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-card p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="mb-4 font-display text-lg font-semibold">{titles[op]}</h3>
        {op === "count" && <p className="mb-3 text-sm text-muted-foreground">Choose a category, enter counted quantities, and confirm. Variances over {restaurant.varianceThreshold}% are flagged in the activity log.</p>}
        <label className="mb-1 block text-sm font-medium">Item</label>
        <select className="input-soft mb-3">{inventoryItems.map((i) => <option key={i.id}>{i.name}</option>)}</select>
        {op === "count" && <>
          <label className="mb-1 block text-sm font-medium">Counted quantity</label>
          <input type="number" className="input-soft mb-1" />
          <p className="mb-4 text-xs text-muted-foreground">Expected: 12,500 g · Variance will be calculated on confirm.</p>
        </>}
        {op === "adjust" && <>
          <label className="mb-1 block text-sm font-medium">New quantity</label>
          <input type="number" className="input-soft mb-3" />
          <label className="mb-1 block text-sm font-medium">Reason (required)</label>
          <input className="input-soft mb-4" placeholder="e.g. Spillage" />
        </>}
        {op === "waste" && <>
          <label className="mb-1 block text-sm font-medium">Quantity</label>
          <input type="number" className="input-soft mb-3" />
          <label className="mb-1 block text-sm font-medium">Reason</label>
          <select className="input-soft mb-4">{managedLists.wasteReasons.map((r) => <option key={r}>{r}</option>)}</select>
        </>}
        <div className="flex gap-2">
          <button onClick={onClose} className="btn-outline flex-1">Cancel</button>
          <button onClick={onClose} className="btn-primary flex-1">Confirm</button>
        </div>
      </div>
    </div>
  );
}