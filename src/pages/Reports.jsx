import React, { useMemo, useState } from "react";
import { Download, FileText, TrendingUp, BarChart3, Boxes, ShoppingCart, Receipt, Wrench, Users, Sparkles, ClipboardList } from "lucide-react";
import { PageHeader, SectionCard, StatCard, EmptyState } from "@/components/ui/shared";
import DataTable from "@/components/ui/DataTable";
import { useData } from "@/lib/DataContext";
import { etb, calcBill, round2 } from "@/lib/format";
import { businessDate, businessDayOfStamp, toDate, daysAgo, isoDate } from "@/lib/datetime";
import { notifySuccess, notifyError } from "@/lib/notify";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "sales", label: "Sales & orders" },
  { id: "inventory", label: "Inventory" },
  { id: "costs", label: "Purchases, expenses & maintenance" },
  { id: "staff", label: "Staff & operations" },
  { id: "dayclose", label: "End-of-day summary" },
];

export default function Reports() {
  const { db } = useData();
  const { restaurant } = db;
  const [tab, setTab] = useState("sales");
  const [from, setFrom] = useState(daysAgo(6));
  const [to, setTo] = useState(isoDate());

  const report = useMemo(() => buildReport(db), [db]);

  const inRange = (value) => {
    const d = toDate(value);
    if (!d) return false;
    const start = toDate(from);
    const end = toDate(to);
    if (!start || !end) return false;
    return d >= start && d <= end;
  };

  const rangeValid = toDate(from) && toDate(to) && toDate(from) <= toDate(to);
  const rows = rangeValid ? report.orders.filter((o) => inRange(o.created)) : [];
  const days = groupByDay(rows);
  const maxDay = Math.max(1, ...days.map((d) => d.net));
  const items = groupByItem(rows);
  const methods = groupByMethod(rows);
  const rangeTotals = rows.reduce(
    (acc, o) => {
      acc.net += o.net;
      acc.tax += o.tax;
      acc.service += o.service;
      acc.discount += o.discount;
      acc.total += o.total;
      return acc;
    },
    { net: 0, tax: 0, service: 0, discount: 0, total: 0 }
  );

  const todayRows = report.orders.filter((o) => businessDayOfStamp(o.created) === businessDate());

  const exportCsv = () => {
    if (!rows.length) {
      notifyError("Nothing to export in this range");
      return;
    }
    const lines = [
      "Order,Type,Table,Waiter,Status,Created,Net,Tax,Service,Discount,Total",
      ...rows.map((o) =>
        [o.id, o.type, o.table || "Takeaway", o.waiter, o.status, o.created, o.net, o.tax, o.service, o.discount, o.total]
          .map(csvCell)
          .join(",")
      ),
    ];
    downloadCsv(`sales-${from}-to-${to}.csv`, lines.join("\n"));
    notifySuccess(`Exported ${rows.length} order rows`);
  };

  const downloadDayClose = () => {
    const rowsCsv = todayRows.map((o) => [o.id, o.status, o.net, o.tax, o.service, o.total].join(","));
    const text = [
      `${restaurant.name} — End-of-day summary`,
      `Business date: ${businessDate()}`,
      `Orders: ${todayRows.length}`,
      `Net sales: ${etb(todayRows.reduce((s, o) => s + o.net, 0))} ETB`,
      `Tax: ${etb(todayRows.reduce((s, o) => s + o.tax, 0))} ETB`,
      `Service charge: ${etb(todayRows.reduce((s, o) => s + o.service, 0))} ETB`,
      `Total collected: ${etb(todayRows.reduce((s, o) => s + o.total, 0))} ETB`,
      "",
      "Order,Status,Net,Tax,Service,Total",
      ...rowsCsv,
    ].join("\n");
    // A text file keeps this dependency-free; the label says what it is.
    downloadCsv(`end-of-day-${isoDate()}.txt`, text);
    notifySuccess("End-of-day summary downloaded");
  };

  return (
    <div>
      <PageHeader
        title="ሪፖርቶች · Reports & Analytics"
        subtitle="Visible to the Manager only. Figures are derived from the same orders the kitchen and billing screens use. CSV for data reports; a printable summary for the end-of-day close."
        actions={<button onClick={exportCsv} className="btn-outline"><Download className="h-4 w-4" /> Export CSV</button>}
      />

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="rep-from" className="mb-1 block text-xs font-medium text-muted-foreground">From business date</label>
          <input id="rep-from" type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} className="input-soft" />
        </div>
        <div>
          <label htmlFor="rep-to" className="mb-1 block text-xs font-medium text-muted-foreground">To business date</label>
          <input id="rep-to" type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} className="input-soft" />
        </div>
        {!rangeValid && <p role="alert" className="pb-2 text-xs text-berbere-600">The start date must be on or before the end date.</p>}
      </div>

      <div className="mb-4 flex flex-wrap gap-2 border-b border-border" role="tablist" aria-label="Report views">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={cn("border-b-2 px-3 py-2 text-sm font-medium", tab === t.id ? "border-primary text-primary" : "border-transparent text-muted-foreground")}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "sales" && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Net sales (range)" value={etb(rangeTotals.net)} sub="ETB" tone="sage" icon={TrendingUp} />
            <StatCard label="Tax collected" value={etb(rangeTotals.tax)} sub="ETB" tone="gold" />
            <StatCard label="Service charge" value={etb(rangeTotals.service)} sub="ETB" icon={Receipt} tone="terracotta" />
            <StatCard label="Orders" value={rows.length} sub={`${items.length} distinct items`} icon={BarChart3} />
          </div>

          <SectionCard title="Net sales by day">
            {days.length === 0 ? (
              <EmptyState title="No orders in this range" description="Widen the date range to see sales." icon={TrendingUp} />
            ) : (
              <div className="space-y-2">
                {days.map((d) => (
                  <div key={d.day} className="flex items-center gap-3">
                    <span className="w-20 shrink-0 text-sm text-muted-foreground">{d.day}</span>
                    <div className="h-6 flex-1 overflow-hidden rounded-lg bg-secondary">
                      <div className="h-full rounded-lg bg-primary" style={{ width: `${(d.net / maxDay) * 100}%` }} />
                    </div>
                    <span className="w-24 shrink-0 text-right text-sm font-medium">{etb(d.net)}</span>
                    <span className="w-12 shrink-0 text-right text-xs text-muted-foreground">{d.orders} ord</span>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          <div className="grid gap-5 lg:grid-cols-2">
            <SectionCard title="Sales by menu item">
              <DataTable
                caption="Quantity and value sold per menu item"
                columns={[
                  { key: "name", header: "Item", sortable: true, render: (r) => <span className="font-medium">{r.name}</span> },
                  { key: "qty", header: "Qty", align: "right", sortable: true, render: (r) => r.qty },
                  { key: "total", header: "Value", align: "right", sortable: true, render: (r) => etb(r.total) },
                ]}
                rows={items}
                pageSize={8}
                empty="No items sold in this range."
              />
            </SectionCard>
            <SectionCard title="Sales by payment method">
              <DataTable
                caption="Collected value per payment method"
                columns={[
                  { key: "method", header: "Method", sortable: true, render: (r) => <span className="font-medium">{r.method}</span> },
                  { key: "count", header: "Payments", align: "right", sortable: true, render: (r) => r.count },
                  { key: "total", header: "Value", align: "right", sortable: true, render: (r) => etb(r.total) },
                ]}
                rows={methods}
                empty="No payments recorded in this range."
              />
            </SectionCard>
          </div>
        </div>
      )}

      {tab === "inventory" && <InventoryTab db={db} />}

      {tab === "costs" && (
        <CostsTab db={db} />
      )}

      {tab === "staff" && <StaffTab db={db} rows={rows} />}

      {tab === "dayclose" && (
        <SectionCard
          title={`End-of-day summary — ${businessDate()}`}
          action={<button onClick={downloadDayClose} className="btn-outline text-sm"><FileText className="h-4 w-4" /> Download summary</button>}
        >
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            <SummaryRow label="Business date" value={businessDate()} />
            <SummaryRow label="Orders" value={todayRows.length} />
            <SummaryRow label="Completed orders" value={todayRows.filter((o) => o.status === "Completed").length} />
            <SummaryRow label="Cancelled orders" value={todayRows.filter((o) => o.status === "Cancelled").length} />
            <SummaryRow label="Net sales" value={`${etb(sumOf(todayRows, "net"))} ETB`} />
            <SummaryRow label="Tax collected" value={`${etb(sumOf(todayRows, "tax"))} ETB`} />
            <SummaryRow label="Service charge" value={`${etb(sumOf(todayRows, "service"))} ETB`} />
            <SummaryRow label="Total collected" value={`${etb(sumOf(todayRows, "total"))} ETB`} />
            <SummaryRow label="Discounts total" value={`${etb(sumOf(todayRows, "discount"))} ETB`} />
            <SummaryRow label="Open orders carried over" value={todayRows.filter((o) => o.status === "Active" || o.status === "Served").length} />
          </dl>
          <div className="mt-3 rounded-lg bg-secondary/60 p-3 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">By payment method</p>
            {methods.length === 0 ? (
              <p>No payments recorded yet.</p>
            ) : (
              <p>{methods.map((m) => `${m.method} ${etb(m.total)}`).join(" · ")}</p>
            )}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">Regenerating this summary reflects later corrections; it is not a frozen ledger.</p>
        </SectionCard>
      )}
    </div>
  );
}

function sumOf(rows, key) {
  return round2(rows.reduce((s, r) => s + r[key], 0));
}

function buildReport(db) {
  const { orders, restaurant } = db;
  const orderRows = orders.map((o) => {
    const bill = calcBill(o, restaurant);
    const payments = o.payments || [];
    return {
      id: o.id,
      type: o.type,
      table: o.table,
      waiter: o.waiter,
      status: o.status,
      created: o.created,
      createdAt: toDate(o.created),
      net: round2(bill.netSales),
      tax: round2(bill.taxPortion),
      service: round2(bill.serviceCharge),
      discount: round2(bill.discount),
      total: round2(bill.totalPayable),
      items: bill.lines.filter((l) => !l.cancelled),
      payments: o.status === "Completed" ? payments : [],
      tickets: o.tickets,
    };
  });
  return { orders: orderRows };
}

function groupByDay(orders) {
  const map = new Map();
  orders.forEach((o) => {
    const key = o.createdAt ? isoDate(o.createdAt) : o.created;
    const entry = map.get(key) || { day: key, net: 0, orders: 0 };
    entry.net = round2(entry.net + o.net);
    entry.orders += 1;
    map.set(key, entry);
  });
  return [...map.values()].sort((a, b) => a.day.localeCompare(b.day));
}

function groupByItem(orders) {
  const map = new Map();
  orders.forEach((o) => {
    o.items.forEach((l) => {
      const entry = map.get(l.name) || { name: l.name, qty: 0, total: 0 };
      entry.qty += l.qty;
      entry.total = round2(entry.total + l.lineTotal);
      map.set(l.name, entry);
    });
  });
  return [...map.values()].sort((a, b) => b.total - a.total);
}

function groupByMethod(orders) {
  const map = new Map();
  orders.forEach((o) => {
    o.payments.forEach((p) => {
      const entry = map.get(p.method) || { method: p.method, count: 0, total: 0 };
      entry.count += 1;
      entry.total = round2(entry.total + Number(p.amount || 0));
      map.set(p.method, entry);
    });
  });
  return [...map.values()].sort((a, b) => b.total - a.total);
}

function InventoryTab({ db }) {
  const { inventoryItems, stockMovements } = db;
  const [movementType, setMovementType] = useState("All");

  const types = ["All", ...new Set(stockMovements.map((m) => m.type))];
  const movements = movementType === "All" ? stockMovements : stockMovements.filter((m) => m.type === movementType);
  const waste = stockMovements.filter((m) => m.type === "Waste");

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Tracked items" value={inventoryItems.length} icon={Boxes} tone="gold" />
        <StatCard label="Low stock" value={inventoryItems.filter((i) => i.status === "Low").length} icon={Boxes} tone="berbere" />
        <StatCard label="Movements logged" value={stockMovements.length} icon={ShoppingCart} tone="terracotta" />
        <StatCard label="Waste events" value={waste.length} icon={Receipt} tone="berbere" />
      </div>

      <SectionCard title="Current stock by item">
        <DataTable
          caption="Stock on hand per inventory item"
          columns={[
            { key: "name", header: "Item", sortable: true, render: (r) => <span className="font-medium">{r.name}</span> },
            { key: "category", header: "Category", sortable: true, render: (r) => <span className="text-muted-foreground">{r.category}</span> },
            { key: "qty", header: "On hand", align: "right", sortable: true, render: (r) => `${r.qty.toLocaleString()} ${r.baseUnit}` },
            { key: "min", header: "Minimum", align: "right", sortable: true, render: (r) => r.min.toLocaleString() },
            { key: "status", header: "Status", sortable: true, render: (r) => <span className={r.status === "Low" ? "font-medium text-berbere-600" : "text-sage-600"}>{r.status}</span> },
            { key: "supplier", header: "Supplier", sortable: true, render: (r) => <span className="text-muted-foreground">{r.supplier || "—"}</span> },
          ]}
          rows={inventoryItems}
          pageSize={10}
        />
      </SectionCard>

      <SectionCard
        title="Stock movements"
        action={
          <>
            <label htmlFor="mv-type" className="sr-only">Filter by movement type</label>
            <select id="mv-type" value={movementType} onChange={(e) => setMovementType(e.target.value)} className="input-soft w-auto text-sm">
              {types.map((t) => <option key={t}>{t}</option>)}
            </select>
          </>
        }
      >
        <DataTable
          caption="Stock movements by item, type and date"
          columns={[
            { key: "date", header: "When", sortable: true, sortValue: (r) => r.date, render: (r) => <span className="text-muted-foreground">{r.date}</span> },
            { key: "item", header: "Item", sortable: true, render: (r) => <span className="font-medium">{r.item}</span> },
            { key: "type", header: "Type", sortable: true, render: (r) => r.type },
            { key: "qty", header: "Change", align: "right", sortable: true, render: (r) => <span className={r.qty < 0 ? "text-berbere-600" : "text-sage-600"}>{r.qty > 0 ? "+" : ""}{r.qty.toLocaleString()}</span> },
            { key: "reason", header: "Reason", render: (r) => <span className="text-muted-foreground">{r.reason}</span> },
          ]}
          rows={movements}
          pageSize={10}
          empty="No movements of this type."
        />
      </SectionCard>

      <SectionCard title="Waste by reason">
        {waste.length === 0 ? (
          <EmptyState title="No waste recorded" description="Waste movements appear here with their reason." icon={Receipt} />
        ) : (
          <DataTable
            caption="Waste movements by item and reason"
            columns={[
              { key: "item", header: "Item", sortable: true, render: (r) => <span className="font-medium">{r.item}</span> },
              { key: "qty", header: "Wasted", align: "right", sortable: true, render: (r) => r.qty.toLocaleString() },
              { key: "reason", header: "Reason", sortable: true, render: (r) => r.reason },
              { key: "date", header: "When", sortable: true, sortValue: (r) => r.date, render: (r) => <span className="text-muted-foreground">{r.date}</span> },
            ]}
            rows={waste}
          />
        )}
      </SectionCard>
    </div>
  );
}

function CostsTab({ db }) {
  const { purchases, expenses, maintenanceRequests, suppliers } = db;

  const purchasesReceived = purchases.filter((p) => p.status === "Received" || p.status === "Partially Received");
  const expensesConfirmed = expenses.filter((e) => e.status === "Confirmed");
  const maintenanceSpent = maintenanceRequests.filter((m) => m.cost > 0);

  const bySupplier = groupSum(purchasesReceived, "supplier", "total");
  const byExpenseCategory = groupSum(expensesConfirmed, "category", "amount");
  const byAsset = groupSum(maintenanceSpent, "asset", "cost");
  const knownSuppliers = new Set(suppliers.map((s) => s.name));

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs uppercase text-muted-foreground">Purchases received</p>
          <p className="font-display text-xl font-semibold">{etb(sumOf(purchasesReceived, "total"))} ETB</p>
          <p className="text-xs text-muted-foreground">by supplier &amp; date</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs uppercase text-muted-foreground">Expenses (confirmed)</p>
          <p className="font-display text-xl font-semibold">{etb(sumOf(expensesConfirmed, "amount"))} ETB</p>
          <p className="text-xs text-muted-foreground">by category &amp; date</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs uppercase text-muted-foreground">Maintenance costs</p>
          <p className="font-display text-xl font-semibold">{etb(sumOf(maintenanceSpent, "cost"))} ETB</p>
          <p className="text-xs text-muted-foreground">by asset &amp; date</p>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">These three are shown side by side and never added together. No gross profit, margin or P&amp;L figure is produced.</p>

      <div className="grid gap-5 lg:grid-cols-2">
        <SectionCard title="Purchases by supplier">
          <DataTable
            caption="Received purchase value by supplier"
            columns={[
              { key: "key", header: "Supplier", sortable: true, render: (r) => <span className="font-medium">{r.key}</span> },
              { key: "count", header: "POs", align: "right", sortable: true, render: (r) => r.count },
              { key: "total", header: "Value", align: "right", sortable: true, render: (r) => etb(r.total) },
            ]}
            rows={bySupplier.map((r) => ({ ...r, known: knownSuppliers.has(r.key) }))}
            empty="No received purchases."
          />
          {bySupplier.some((r) => !knownSuppliers.has(r.key)) && (
            <p role="status" className="mt-2 text-xs text-berbere-600">
              Some purchase references a supplier that is not in the supplier list:{" "}
              {bySupplier.filter((r) => !knownSuppliers.has(r.key)).map((r) => r.key).join(", ")}.
            </p>
          )}
        </SectionCard>

        <SectionCard title="Confirmed expenses by category">
          <DataTable
            caption="Confirmed expense value by category"
            columns={[
              { key: "key", header: "Category", sortable: true, render: (r) => <span className="font-medium">{r.key}</span> },
              { key: "count", header: "Entries", align: "right", sortable: true, render: (r) => r.count },
              { key: "total", header: "Value", align: "right", sortable: true, render: (r) => etb(r.total) },
            ]}
            rows={byExpenseCategory}
            empty="No confirmed expenses."
          />
        </SectionCard>

        <SectionCard title="Maintenance cost by asset">
          <DataTable
            caption="Maintenance cost by asset"
            columns={[
              { key: "key", header: "Asset", sortable: true, render: (r) => <span className="font-medium">{r.key}</span> },
              { key: "count", header: "Requests", align: "right", sortable: true, render: (r) => r.count },
              { key: "total", header: "Cost", align: "right", sortable: true, render: (r) => etb(r.total) },
            ]}
            rows={byAsset}
            empty="No maintenance cost recorded."
          />
        </SectionCard>
      </div>
    </div>
  );
}

function groupSum(rows, field, amount) {
  const map = new Map();
  rows.forEach((r) => {
    const key = r[field] || "Unspecified";
    const entry = map.get(key) || { key, count: 0, total: 0 };
    entry.count += 1;
    entry.total = round2(entry.total + Number(r[amount] || 0));
    map.set(key, entry);
  });
  return [...map.values()].sort((a, b) => b.total - a.total);
}

function StaffTab({ db, rows }) {
  const { employees, cleaningTasks, maintenanceRequests, reservations, orders } = db;

  const handled = new Map();
  orders.forEach((o) => handled.set(o.waiter, (handled.get(o.waiter) || 0) + 1));

  const cleaningDone = cleaningTasks.filter((t) => t.status === "Completed").length;
  const maintenanceDone = maintenanceRequests.filter((m) => m.status === "Completed").length;
  const confirmedReservations = reservations.filter((r) => r.status === "Confirmed" || r.status === "Completed").length;
  const noShows = reservations.filter((r) => r.status === "No Show").length;

  const perEmployee = employees.map((e) => ({
    ...e,
    orders: handled.get(e.name) || 0,
  }));

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Employees" value={employees.length} icon={Users} tone="gold" />
        <StatCard label="Orders in range" value={rows.length} icon={ClipboardList} tone="terracotta" />
        <StatCard label="Cleaning completed" value={cleaningDone} icon={Sparkles} tone="sage" />
        <StatCard label="Maintenance completed" value={maintenanceDone} icon={Wrench} tone="sage" />
      </div>

      <SectionCard title="Orders handled by waiter">
        <DataTable
          caption="Orders handled per employee"
          columns={[
            { key: "name", header: "Employee", sortable: true, render: (r) => <span className="font-medium">{r.name}</span> },
            { key: "position", header: "Position", sortable: true, render: (r) => <span className="text-muted-foreground">{r.position}</span> },
            { key: "department", header: "Department", sortable: true, render: (r) => <span className="text-muted-foreground">{r.department}</span> },
            { key: "orders", header: "Orders", align: "right", sortable: true, render: (r) => r.orders },
            { key: "status", header: "Status", sortable: true, render: (r) => r.status },
          ]}
          rows={perEmployee}
          pageSize={10}
        />
      </SectionCard>

      <SectionCard title="Reservations">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MiniFigure label="Total" value={reservations.length} />
          <MiniFigure label="Confirmed" value={confirmedReservations} />
          <MiniFigure label="Pending" value={reservations.filter((r) => r.status === "Pending").length} />
          <MiniFigure label="No-shows" value={noShows} />
        </div>
      </SectionCard>
    </div>
  );
}

function MiniFigure({ label, value }) {
  return (
    <div className="rounded-xl bg-secondary/50 p-3">
      <p className="text-xs uppercase text-muted-foreground">{label}</p>
      <p className="font-display text-xl font-semibold">{value}</p>
    </div>
  );
}

function SummaryRow({ label, value }) {
  return (
    <div className="flex justify-between border-b border-border py-1">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function csvCell(value) {
  const s = String(value ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function downloadCsv(filename, text) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}