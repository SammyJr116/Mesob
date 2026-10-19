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

  const getOrderNumber = (o) => String(o?.orderNumber || o?.number || o?.id || "");
  const getWaiterName = (o) => {
    if (!o) return "—";
    if (typeof o.waiter === "string") return o.waiter;
    if (o.waiter && typeof o.waiter === "object" && o.waiter.name) return o.waiter.name;
    return "—";
  };
  const getCustomerName = (o) => {
    if (!o) return "";
    if (typeof o.customer === "string") return o.customer;
    if (o.customer && typeof o.customer === "object" && o.customer.name) return o.customer.name;
    return "";
  };
  const getTableLabel = (o) => {
    if (!o) return "Takeaway";
    if (typeof o.table === "string" && o.table) return o.table;
    if (o.tables && Array.isArray(o.tables) && o.tables[0]?.table?.number) {
      return String(o.tables[0].table.number);
    }
    return o.type === "Takeaway" ? "Takeaway" : (o.table || "Takeaway");
  };

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (orders || []).filter((o) => {
      const idStr = getOrderNumber(o).toLowerCase();
      const waiterStr = getWaiterName(o).toLowerCase();
      const customerStr = getCustomerName(o).toLowerCase();
      const tableStr = getTableLabel(o).toLowerCase();

      const matchesQ =
        !needle ||
        idStr.includes(needle) ||
        waiterStr.includes(needle) ||
        customerStr.includes(needle) ||
        tableStr.includes(needle);
      const matchesS = status === "All" || o.status === status;
      const matchesT = type === "All" || o.type === type;
      return matchesQ && matchesS && matchesT;
    });
  }, [orders, q, status, type]);

  /** @type {import("@/components/ui/DataTable").DataTableColumn[]} */
  const columns = [
    {
      key: "id",
      header: "Order",
      sortable: true,
      render: (o) => <span className="font-medium">{getOrderNumber(o)}</span>,
    },
    { key: "type", header: "Type", sortable: true, render: (o) => o.type || "Dine-in" },
    {
      key: "table",
      header: "Table",
      sortable: true,
      sortValue: (o) => getTableLabel(o),
      render: (o) => getTableLabel(o),
    },
    {
      key: "waiter",
      header: "Waiter",
      sortable: true,
      render: (o) => (isManager ? getWaiterName(o) : "—"),
    },
    {
      key: "customer",
      header: "Customer",
      sortable: true,
      sortValue: (o) => getCustomerName(o) || "zz",
      render: (o) => <span className="text-muted-foreground">{getCustomerName(o) || "—"}</span>,
    },
    {
      key: "created",
      header: "Created",
      sortable: true,
      sortValue: (o) => o.created || o.createdAt || "",
      render: (o) => (
        <span className="text-muted-foreground">
          {o.created || (o.createdAt ? new Date(o.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—")}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (o) => {
        const hasReady = (o.tickets || []).some((t) => t.status === "Ready");
        return (
          <div className="flex items-center gap-1.5">
            <StatusBadge status={o.status} />
            {hasReady && (
              <span className="rounded-full bg-sage-100 border border-sage-300 px-2 py-0.5 text-2xs font-bold text-sage-800 animate-pulse">
                Food Ready
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: "tickets",
      header: "Tickets",
      align: "right",
      sortable: true,
      sortValue: (o) => (o.tickets || []).length,
      render: (o) => <span className="text-muted-foreground">{(o.tickets || []).length}</span>,
    },
  ];

  return (
    <div>
      <PageHeader
        title="ትዕዛዞች · Orders"
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