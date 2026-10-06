import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { PageHeader, StatusBadge, SearchInput } from "@/components/ui/shared";
import DataTable from "@/components/ui/DataTable";
import { useData } from "@/lib/DataContext";
import { useRole } from "@/lib/RoleContext";
import { isPrivileged } from "@/lib/roles";
import { visibleOrders } from "@/lib/scope";

const STATUSES = ["All", "Draft", "Active", "Served", "Completed", "Cancelled"];

export default function Orders() {
  const navigate = useNavigate();
  const { db } = useData();
  const { role } = useRole();
  const isManager = isPrivileged(role);
  /* A waiter sees the orders they own, not the whole floor's. */
  const orders = useMemo(() => visibleOrders(db.orders, role), [db.orders, role]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("All");
  const [type, setType] = useState("All");

  const filtered = useMemo(() => {
    const needle = q.toLowerCase();
    return orders.filter((o) => {
      const matchesQ =
        !needle ||
        o.id.toLowerCase().includes(needle) ||
        o.waiter.toLowerCase().includes(needle) ||
        (o.customer || "").toLowerCase().includes(needle) ||
        (o.table || "takeaway").toLowerCase().includes(needle);
      const matchesS = status === "All" || o.status === status;
      const matchesT = type === "All" || o.type === type;
      return matchesQ && matchesS && matchesT;
    });
  }, [orders, q, status, type]);

  /** @type {import("@/components/ui/DataTable").DataTableColumn[]} */
  const columns = [
    { key: "id", header: "Order", sortable: true, render: (o) => <span className="font-medium">{o.id}</span> },
    { key: "type", header: "Type", sortable: true, render: (o) => o.type },
    { key: "table", header: "Table", sortable: true, sortValue: (o) => o.table || "zz", render: (o) => o.table || "Takeaway" },
    { key: "waiter", header: "Waiter", sortable: true, render: (o) => (isManager ? o.waiter : "—") },
    { key: "customer", header: "Customer", sortable: true, sortValue: (o) => o.customer || "zz", render: (o) => <span className="text-muted-foreground">{o.customer || "—"}</span> },
    { key: "created", header: "Created", sortable: true, sortValue: (o) => o.created, render: (o) => <span className="text-muted-foreground">{o.created}</span> },
    { key: "status", header: "Status", sortable: true, render: (o) => <StatusBadge status={o.status} /> },
    { key: "tickets", header: "Tickets", align: "right", sortable: true, sortValue: (o) => o.tickets.length, render: (o) => <span className="text-muted-foreground">{o.tickets.length}</span> },
  ];

  return (
    <div>
      <PageHeader
        title="Orders"
        subtitle={isManager ? "All orders are visible. A waiter edits only the orders they own." : "You see the orders you own. Ask a Manager for anything else."}
        actions={<button onClick={() => navigate("/orders/new")} className="btn-primary"><Plus className="h-4 w-4" /> New order</button>}
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex-1"><SearchInput value={q} onChange={setQ} placeholder="Search order no., table, waiter, customer…" /></div>
        <select aria-label="Filter by order type" value={type} onChange={(e) => setType(e.target.value)} className="input-soft w-auto">
          <option>All</option><option>Dine-in</option><option>Takeaway</option>
        </select>
        <select aria-label="Filter by status" value={status} onChange={(e) => setStatus(e.target.value)} className="input-soft w-auto">
          {STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>

      <DataTable
        caption="Orders with type, table, waiter and status"
        columns={columns}
        rows={filtered}
        onRowClick={(o) => navigate(`/orders/${o.id}`)}
        empty="No orders match your filters."
      />
    </div>
  );
}