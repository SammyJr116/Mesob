import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import Modal from "@/components/ui/Modal";
import { useData } from "@/lib/DataContext";
import { useRole } from "@/lib/RoleContext";
import { isPrivileged } from "@/lib/roles";
import { visibleOrders } from "@/lib/scope";

/* One search box over pages and records. Every result is filtered by the same
   rule the route guard uses, so the palette can never surface a record the
   active role could not open by typing the URL. */
export default function CommandPalette({ onClose, nav }) {
  const navigate = useNavigate();
  const { role } = useRole();
  const { db } = useData();
  const [q, setQ] = useState("");

  const go = (to) => {
    onClose();
    setQ("");
    navigate(to);
  };

  const results = useMemo(() => buildResults({ db, role, nav, q }), [db, role, nav, q]);
  const nothing = !results.pages.length && !results.groups.length;

  return (
    <Modal title="Search" description="Jump to a page, or find a record by number or name." onClose={onClose} size="lg">
      <Command shouldFilter={false} loop className="overflow-hidden rounded-xl border border-border">
        <div className="border-b border-border px-3">
          <CommandInput
            value={q}
            onValueChange={setQ}
            placeholder="Orders, tables, menu items, customers…"
          />
        </div>
        <CommandList className="max-h-[22rem]">
          {nothing && <CommandEmpty>Nothing matches “{q}”.</CommandEmpty>}
          {!!results.pages.length && (
            <CommandGroup heading="Go to">
              {results.pages.map((p) => (
                <CommandItem key={p.to} value={`go ${p.label}`} onSelect={() => go(p.to)}>
                  <p.icon aria-hidden="true" className="h-4 w-4 text-muted-foreground" />
                  {p.label}
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          {results.groups.map((g) => (
            <CommandGroup key={g.heading} heading={g.heading}>
              {g.items.map((it) => (
                <CommandItem key={`${g.heading}-${it.id}`} value={`${g.heading} ${it.label}`} onSelect={() => go(it.to)}>
                  <span className="font-medium">{it.label}</span>
                  {it.meta && <span className="ml-2 text-xs text-muted-foreground">{it.meta}</span>}
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
        </CommandList>
      </Command>
    </Modal>
  );
}

const CAP = 5;

function buildResults({ db, role, nav, q }) {
  const needle = q.trim().toLowerCase();
  const pages = nav
    .filter((n) => n.to)
    .filter((n) => !needle || n.label.toLowerCase().includes(needle))
    .slice(0, 8)
    .map((n) => ({ label: n.label, to: n.to, icon: n.icon }));

  if (!needle) return { pages, groups: [] };

  const manager = isPrivileged(role);
  const groups = [];

  if (["manager", "admin", "waiter"].includes(role)) {
    const orders = visibleOrders(db.orders, role)
      .filter((o) => `${o.id} ${o.number} ${o.waiter} ${o.customer || ""} ${o.table || ""}`.toLowerCase().includes(needle))
      .slice(0, CAP);
    if (orders.length) {
      groups.push({
        heading: "Orders",
        items: orders.map((o) => ({ id: o.id, label: o.id, to: `/orders/${o.id}`, meta: `${o.status} · ${o.table || "Takeaway"}` })),
      });
    }

    const tables = db.tables
      .filter((t) => `table ${t.number} ${t.section} ${t.status}`.toLowerCase().includes(needle))
      .slice(0, CAP);
    if (tables.length) {
      groups.push({
        heading: "Tables",
        items: tables.map((t) => ({ id: t.id, label: `Table ${t.number}`, to: "/tables", meta: `${t.section} · ${t.status}` })),
      });
    }

    const customers = db.customers
      .filter((c) => !c.archived)
      .filter((c) => `${c.name} ${c.phone}`.toLowerCase().includes(needle))
      .slice(0, CAP);
    if (customers.length) {
      groups.push({
        heading: "Customers",
        items: customers.map((c) => ({ id: c.id, label: c.name, to: "/customers", meta: c.phone })),
      });
    }
  }

  if (["manager", "admin", "kitchen", "waiter"].includes(role)) {
    const items = db.menuItems.filter((m) => m.name.toLowerCase().includes(needle)).slice(0, CAP);
    if (items.length) {
      groups.push({
        heading: "Menu items",
        items: items.map((m) => ({ id: m.id, label: m.name, to: manager ? "/menu" : "/menu-availability", meta: `${m.category} · ${m.status}` })),
      });
    }
  }

  if (["manager", "admin", "inventory", "kitchen"].includes(role)) {
    const stock = db.inventoryItems.filter((i) => i.name.toLowerCase().includes(needle)).slice(0, CAP);
    if (stock.length) {
      groups.push({
        heading: "Inventory",
        items: stock.map((i) => ({ id: i.id, label: i.name, to: "/inventory", meta: `${i.qty} ${i.baseUnit} · ${i.status}` })),
      });
    }
  }

  if (["manager", "admin"].includes(role)) {
    const staff = db.employees.filter((e) => e.name.toLowerCase().includes(needle)).slice(0, CAP);
    if (staff.length) {
      groups.push({
        heading: "Employees",
        items: staff.map((e) => ({ id: e.id, label: e.name, to: "/employees", meta: `${e.role} · ${e.status}` })),
      });
    }
  }

  return { pages, groups };
}
