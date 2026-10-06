import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Plus, Minus, Send, X, Search } from "lucide-react";
import { PageHeader } from "@/components/ui/shared";
import Modal from "@/components/ui/Modal";
import { calcBill, etb } from "@/lib/format";
import { useData } from "@/lib/DataContext";
import { useRole } from "@/lib/RoleContext";
import { ROLES } from "@/lib/roles";
import { nextNumber, nextId, clockTime } from "@/lib/datetime";
import { notifySuccess } from "@/lib/notify";
import { cn } from "@/lib/utils";

export default function NewOrder() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { db, insertItem, updateItem } = useData();
  const { role } = useRole();
  const { menuItems, menuCategories, tables, orders, notifications, restaurant } = db;
  const [type, setType] = useState("Dine-in");
  const [table, setTable] = useState(() => searchParams.get("table") || "");
  const [customer, setCustomer] = useState("");
  const [phone, setPhone] = useState("");
  const [cart, setCart] = useState([]);
  const [cat, setCat] = useState("All");
  const [q, setQ] = useState("");
  const [confirm, setConfirm] = useState(false);

  const availableTables = tables.filter((t) => t.status === "Available");
  const filtered = menuItems.filter((m) => {
    const okStatus = m.status === "Active";
    // Kitchen availability is shared state: an item marked Unavailable in
    // Menu Availability must not be orderable here.
    const okAvail = m.availability !== "Unavailable";
    const okCat = cat === "All" || m.category === cat;
    const okQ = !q || m.name.toLowerCase().includes(q.toLowerCase());
    return okStatus && okAvail && okCat && okQ;
  });

  const addItem = (m) => {
    const variant = m.variants.find((v) => v.default) || m.variants[0];
    const price = variant ? variant.price : m.price;
    setCart((c) => {
      const idx = c.findIndex((x) => x.id === m.id && x.variant === (variant?.name || ""));
      if (idx >= 0) {
        const next = [...c];
        next[idx] = { ...next[idx], qty: next[idx].qty + 1 };
        return next;
      }
      return [...c, { id: m.id, name: m.name, variant: variant?.name || "", price, qty: 1, addons: [], note: "" }];
    });
  };

  const changeQty = (i, d) => setCart((c) => c.map((x, idx) => idx === i ? { ...x, qty: Math.max(1, x.qty + d) } : x));
  const removeItem = (i) => setCart((c) => c.filter((_, idx) => idx !== i));

  const order = { tickets: [{ items: cart, status: "Submitted" }], discount: 0 };
  const bill = cart.length ? calcBill(order, restaurant) : null;
  const canSend = cart.length > 0 && (type === "Takeaway" ? phone.trim() : table);

  const sendOrder = () => {
    const number = nextNumber(orders, restaurant);
    const id = `${restaurant.orderPrefix}${number}`;
    const now = clockTime();
    const server = ROLES.find((r) => r.id === role)?.name || "Unassigned";
    insertItem("orders", {
      id,
      number,
      type,
      table: type === "Dine-in" ? table : null,
      waiter: server,
      customer: type === "Takeaway" ? customer.trim() || "Walk-in" : null,
      phone: type === "Takeaway" ? phone.trim() : "",
      guests: 1,
      status: "Active",
      created: now,
      notes: "",
      tickets: [{ round: 1, status: "Submitted", submittedAt: now, items: cart.map((c) => ({ ...c })) }],
      discount: 0,
      invoice: null,
    });
    if (type === "Dine-in") {
      const target = tables.find((t) => t.number === table);
      if (target) updateItem("tables", target.id, { status: "Occupied", order: id });
    }
    insertItem("notifications", {
      id: nextId(notifications, "N", 2),
      event: "New kitchen ticket",
      detail: `${id} round 1 — ${cart.length} item${cart.length === 1 ? "" : "s"}`,
      time: now,
      read: false,
      sound: true,
    });
    insertItem("activityLog", {
      id: nextId(db.activityLog, "L", 2),
      who: role || "manager",
      when: now,
      action: "Created order",
      target: id,
      old: "",
      new: `${cart.length} item(s)`,
      reason: "",
    });
    notifySuccess(`${id} sent to kitchen`);
    setConfirm(true);
  };

  return (
    <div>
      <button onClick={() => navigate("/orders")} className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>
      <PageHeader title="New order" subtitle="Add items, choose a variant, then send to the kitchen. Sending requires at least one item." />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex rounded-lg border border-input bg-card p-0.5">
          {["Dine-in", "Takeaway"].map((t) => (
            <button key={t} onClick={() => setType(t)} className={cn("rounded-md px-4 py-1.5 text-sm font-medium", type === t ? "bg-primary text-primary-foreground" : "text-foreground")}>{t}</button>
          ))}
        </div>
        {type === "Dine-in" ? (
          <select value={table} onChange={(e) => setTable(e.target.value)} className="input-soft w-auto">
            <option value="">Select available table…</option>
            {availableTables.map((t) => <option key={t.id} value={t.number}>Table {t.number} · {t.seats} seats · {t.section}</option>)}
          </select>
        ) : (
          <div className="flex gap-2">
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone (required)" className="input-soft w-40" />
            <input value={customer} onChange={(e) => setCustomer(e.target.value)} placeholder="Name (optional)" className="input-soft w-40" />
          </div>
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="mb-3 flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input type="search" aria-label="Search menu" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search menu…" className="input-soft pl-9" />
            </div>
          </div>
          <div className="mb-3 flex flex-wrap gap-2">
            {["All", ...menuCategories.map((c) => c.name)].map((c) => (
              <button key={c} onClick={() => setCat(c)} className={cn("rounded-full px-3 py-1.5 text-sm font-medium", cat === c ? "bg-primary text-primary-foreground" : "bg-secondary hover:bg-muted")}>{c}</button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {filtered.map((m) => {
              const blocked = m.availability !== "Available";
              return (
                <button key={m.id} onClick={() => !blocked && addItem(m)} disabled={blocked}
                  className={cn("card-soft flex flex-col gap-2 p-3 text-left transition-all", !blocked && "hover:-translate-y-0.5 hover:shadow-md", blocked && "opacity-50")}>
                  <div className="aspect-[4/3] overflow-hidden rounded-lg bg-secondary">
                    {m.image ? <img src={m.image} alt={m.name} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-muted-foreground text-xs">No image</div>}
                  </div>
                  <div className="flex items-start justify-between gap-1">
                    <p className="text-sm font-medium leading-tight">{m.name}</p>
                    <span className={cn("shrink-0 rounded-full px-1.5 py-0.5 text-2xs font-semibold", m.fasting === "Fasting" ? "bg-sage-100 text-sage-700" : "bg-berbere-100 text-berbere-600")}>{m.fasting}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-display text-sm font-semibold">{etb(m.price)} ETB</span>
                    {blocked ? <span className="text-xs text-berbere-600">Unavailable</span> : <span className="text-xs text-primary">+ Add</span>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <div className="card-soft sticky top-20 p-4">
            <h3 className="mb-3 font-display text-lg font-semibold">Current ticket</h3>
            {cart.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No items yet. Tap a menu item to add.</p>
            ) : (
              <div className="space-y-2">
                {cart.map((it, i) => (
                  <div key={i} className="flex items-center gap-2 rounded-lg border border-border bg-secondary/30 p-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{it.name} {it.variant && <span className="text-muted-foreground">· {it.variant}</span>}</p>
                      <p className="text-xs text-muted-foreground">{etb(it.price)} ETB</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button type="button" aria-label={`Decrease ${it.name} quantity`} onClick={() => changeQty(i, -1)} className="rounded-md bg-card p-1 hover:bg-muted"><Minus className="h-3.5 w-3.5" /></button>
                      <span className="w-6 text-center text-sm font-medium">{it.qty}</span>
                      <button type="button" aria-label={`Increase ${it.name} quantity`} onClick={() => changeQty(i, 1)} className="rounded-md bg-card p-1 hover:bg-muted"><Plus className="h-3.5 w-3.5" /></button>
                      <button type="button" aria-label={`Remove ${it.name}`} onClick={() => removeItem(i)} className="ml-1 rounded-md p-1 text-berbere-600 hover:bg-berbere-100"><X className="h-3.5 w-3.5" /></button>
                    </div>
                    <span className="w-16 text-right text-sm font-medium">{etb(it.price * it.qty)}</span>
                  </div>
                ))}
              </div>
            )}
            {bill && (
              <div className="mt-3 space-y-1 border-t border-border pt-3 text-sm">
                <div className="flex justify-between text-muted-foreground"><span>Item subtotal</span><span>{etb(bill.itemSubtotal)}</span></div>
                <div className="flex justify-between text-muted-foreground"><span>Service charge ({restaurant.serviceCharge}%)</span><span>{etb(bill.serviceCharge)}</span></div>
                <div className="flex justify-between font-display text-lg font-semibold"><span>Total</span><span>{etb(bill.totalPayable)}</span></div>
              </div>
            )}
            <button onClick={sendOrder} disabled={!canSend} className="btn-primary mt-4 w-full"><Send className="h-4 w-4" /> Send to kitchen</button>
            {!canSend && <p className="mt-2 text-center text-xs text-muted-foreground">{type === "Takeaway" ? "Phone number required" : "Select a table"}</p>}
          </div>
        </div>
      </div>

      {confirm && (
        <Modal
          title="Ticket sent to kitchen"
          onClose={() => navigate("/orders")}
          size="sm"
          footer={<button type="button" onClick={() => navigate("/orders")} className="btn-primary w-full">View orders</button>}>
          <div className="text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-sage-100 text-sage-600"><Send className="h-6 w-6" /></div>
            <p className="text-sm text-muted-foreground">{cart.length} item(s) · {type === "Dine-in" ? `Table ${table}` : "Takeaway"} · A sound alert will play on the kitchen screen.</p>
          </div>
        </Modal>
      )}
    </div>
  );
}