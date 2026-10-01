import React, { useState } from "react";
import { Download, FileText, TrendingUp, BarChart3 } from "lucide-react";
import { PageHeader, SectionCard, StatCard } from "@/components/ui/shared";
import { etb } from "@/lib/mockData";
import { cn } from "@/lib/utils";

const SALES_BY_DAY = [
  { day: "Sep 24", net: 18200, tax: 2730, service: 1820, orders: 42 },
  { day: "Sep 25", net: 16400, tax: 2460, service: 1640, orders: 38 },
  { day: "Sep 26", net: 22100, tax: 3315, service: 2210, orders: 51 },
  { day: "Sep 27", net: 19800, tax: 2970, service: 1980, orders: 47 },
  { day: "Sep 28", net: 24500, tax: 3675, service: 2450, orders: 58 },
  { day: "Sep 29", net: 14820, tax: 2223, service: 1482, orders: 34 },
];
const SALES_BY_ITEM = [
  { name: "Doro Wot", qty: 48, total: 23040 },
  { name: "Tibs Special", qty: 36, total: 18720 },
  { name: "Macchiato", qty: 120, total: 8400 },
  { name: "Beyaynetu (Fasting)", qty: 22, total: 7920 },
  { name: "Fresh Mango Juice", qty: 54, total: 6480 },
];
const SALES_BY_METHOD = [
  { method: "Cash", total: 48200 },
  { method: "Bank Transfer", total: 18600 },
  { method: "Mobile Money", total: 32400 },
  { method: "Card", total: 9800 },
];

const TABS = [
  { id: "sales", label: "Sales & orders", stage: "Stage 1" },
  { id: "inventory", label: "Inventory", stage: "Stage 2" },
  { id: "costs", label: "Purchases, expenses & maintenance", stage: "Stage 2 & 3" },
  { id: "staff", label: "Staff & operations", stage: "Stage 3" },
  { id: "dayclose", label: "End-of-day summary", stage: "Stage 1" },
];

export default function Reports() {
  const [tab, setTab] = useState("sales");
  const [from, setFrom] = useState("2026-09-24");
  const [to, setTo] = useState("2026-09-30");
  const maxNet = Math.max(...SALES_BY_DAY.map((d) => d.net));

  return (
    <div>
      <PageHeader title="Reports" subtitle="Visible to the Manager only. Filter by business date range. CSV for data reports; PDF only for invoices, credit notes and the end-of-day summary." actions={<button className="btn-outline"><Download className="h-4 w-4" /> Export CSV</button>} />

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <label className="block"><span className="mb-1 block text-xs font-medium text-muted-foreground">From business date</span><input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="input-soft" /></label>
        <label className="block"><span className="mb-1 block text-xs font-medium text-muted-foreground">To business date</span><input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="input-soft" /></label>
      </div>

      <div className="mb-4 flex flex-wrap gap-2 border-b border-border">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className={cn("border-b-2 px-3 py-2 text-sm font-medium", tab === t.id ? "border-primary text-primary" : "border-transparent text-muted-foreground")}>
            {t.label} <span className="ml-1 text-[10px] text-muted-foreground">{t.stage}</span>
          </button>
        ))}
      </div>

      {tab === "sales" && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Net sales (range)" value={etb(115820)} sub="ETB" tone="emerald" icon={TrendingUp} />
            <StatCard label="Tax collected" value={etb(17373)} sub="ETB" tone="amber" />
            <StatCard label="Service charge" value={etb(11582)} sub="ETB" tone="sky" />
            <StatCard label="Orders" value={270} icon={BarChart3} />
          </div>
          <SectionCard title="Net sales by day">
            <div className="space-y-2">
              {SALES_BY_DAY.map((d) => (
                <div key={d.day} className="flex items-center gap-3">
                  <span className="w-16 text-sm text-muted-foreground">{d.day}</span>
                  <div className="flex-1"><div className="h-6 rounded-lg bg-secondary overflow-hidden"><div className="h-full bg-primary" style={{ width: `${(d.net / maxNet) * 100}%` }} /></div></div>
                  <span className="w-20 text-right text-sm font-medium">{etb(d.net)}</span>
                </div>
              ))}
            </div>
          </SectionCard>
          <div className="grid gap-5 lg:grid-cols-2">
            <SectionCard title="Sales by menu item"><ItemTable rows={SALES_BY_ITEM} /></SectionCard>
            <SectionCard title="Sales by payment method"><ItemTable rows={SALES_BY_METHOD.map((m) => ({ name: m.method, qty: "—", total: m.total }))} /></SectionCard>
          </div>
        </div>
      )}

      {tab === "inventory" && (
        <SectionCard title="Inventory reports (Stage 2)">
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>• Current stock by item and category</li>
            <li>• Low-stock items</li>
            <li>• Stock movements (filter by item, type, date)</li>
            <li>• Waste by reason and item</li>
          </ul>
          <p className="mt-3 text-xs">CSV export available. No valuation, recipe costing or consumption-vs-purchases report (out of scope).</p>
        </SectionCard>
      )}

      {tab === "costs" && (
        <SectionCard title="Purchases, expenses & maintenance costs (side by side)">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-border bg-card p-4"><p className="text-xs uppercase text-muted-foreground">Purchases</p><p className="font-display text-xl font-semibold">{etb(45100)} ETB</p><p className="text-xs text-muted-foreground">by supplier & date</p></div>
            <div className="rounded-xl border border-border bg-card p-4"><p className="text-xs uppercase text-muted-foreground">Expenses (confirmed)</p><p className="font-display text-xl font-semibold">{etb(70600)} ETB</p><p className="text-xs text-muted-foreground">by category & date</p></div>
            <div className="rounded-xl border border-border bg-card p-4"><p className="text-xs uppercase text-muted-foreground">Maintenance costs</p><p className="font-display text-xl font-semibold">{etb(1350)} ETB</p><p className="text-xs text-muted-foreground">by asset & date</p></div>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">The system shows these side by side and never adds them together. No gross profit, margin or P&L figure.</p>
        </SectionCard>
      )}

      {tab === "staff" && (
        <SectionCard title="Staff & operations reports (Stage 3)">
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>• Employee list</li>
            <li>• Orders handled by waiter (Manager-taken orders appear as that Manager)</li>
            <li>• Cleaning completion</li>
            <li>• Maintenance activity</li>
            <li>• Reservations</li>
          </ul>
        </SectionCard>
      )}

      {tab === "dayclose" && (
        <SectionCard title="End-of-day summary — Sep 29" action={<button className="btn-outline text-sm"><FileText className="h-4 w-4" /> Download PDF</button>}>
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            <SummaryRow label="Business date" value="Sep 29" />
            <SummaryRow label="Completed orders" value="32" />
            <SummaryRow label="Cancelled orders" value="2" />
            <SummaryRow label="Net sales" value={`${etb(14820)} ETB`} />
            <SummaryRow label="Tax collected" value={`${etb(2223)} ETB`} />
            <SummaryRow label="Service charge" value={`${etb(1482)} ETB`} />
            <SummaryRow label="Total collected" value={`${etb(18525)} ETB`} />
            <SummaryRow label="Credit notes" value="0" />
            <SummaryRow label="Discounts total" value={`${etb(1482)} ETB`} />
            <SummaryRow label="Orders carried over" value="3" />
          </dl>
          <div className="mt-3 rounded-lg bg-secondary/60 p-3 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">By payment method</p>
            <p>Cash 9,800 · Bank Transfer 3,200 · Mobile Money 4,525 · Card 1,000</p>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">Generated automatically when the business day closes. A closed day's totals never change; later corrections appear in a later day.</p>
        </SectionCard>
      )}
    </div>
  );
}

function ItemTable({ rows }) {
  return (
    <table className="w-full text-sm">
      <tbody className="divide-y divide-border">
        {rows.map((r, i) => (
          <tr key={i}><td className="py-2 font-medium">{r.name}</td><td className="py-2 text-muted-foreground">{r.qty}</td><td className="py-2 text-right font-medium">{etb(r.total)}</td></tr>
        ))}
      </tbody>
    </table>
  );
}
function SummaryRow({ label, value }) {
  return <div className="flex justify-between border-b border-border py-1"><span className="text-muted-foreground">{label}</span><span className="font-medium">{value}</span></div>;
}