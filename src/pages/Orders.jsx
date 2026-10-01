import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { PageHeader, StatusBadge, SearchInput } from "@/components/ui/shared";
import { orders } from "@/lib/mockData";

const STATUSES = ["All", "Draft", "Active", "Served", "Completed", "Cancelled"];

export default function Orders() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("All");
  const [type, setType] = useState("All");

  const filtered = orders.filter((o) => {
    const matchesQ = !q || o.id.toLowerCase().includes(q.toLowerCase()) || o.waiter.toLowerCase().includes(q.toLowerCase()) || (o.customer || "").toLowerCase().includes(q.toLowerCase()) || (o.table || "takeaway").toLowerCase().includes(q.toLowerCase());
    const matchesS = status === "All" || o.status === status;
    const matchesT = type === "All" || o.type === type;
    return matchesQ && matchesS && matchesT;
  });

  return (
    <div>
      <PageHeader
        title="Orders"
        subtitle="All orders are visible. A waiter edits only the orders they own."
        actions={<button onClick={() => navigate("/orders/new")} className="btn-primary"><Plus className="h-4 w-4" /> New order</button>}
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex-1"><SearchInput value={q} onChange={setQ} placeholder="Search order no., table, waiter, customer…" /></div>
        <select value={type} onChange={(e) => setType(e.target.value)} className="input-soft w-auto">
          <option>All</option><option>Dine-in</option><option>Takeaway</option>
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="input-soft w-auto">
          {STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>

      <div className="card-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Order</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Table</th>
                <th className="px-4 py-3 font-medium">Waiter</th>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Created</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Tickets</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((o) => (
                <tr key={o.id} className="cursor-pointer hover:bg-secondary/40" onClick={() => navigate(`/orders/${o.id}`)}>
                  <td className="px-4 py-3 font-medium">{o.id}</td>
                  <td className="px-4 py-3">{o.type}</td>
                  <td className="px-4 py-3">{o.table || "Takeaway"}</td>
                  <td className="px-4 py-3">{o.waiter}</td>
                  <td className="px-4 py-3 text-muted-foreground">{o.customer || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{o.created}</td>
                  <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                  <td className="px-4 py-3 text-muted-foreground">{o.tickets.length}</td>
                  <td className="px-4 py-3 text-right text-primary">View →</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={9} className="px-4 py-10 text-center text-muted-foreground">No orders match your filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}