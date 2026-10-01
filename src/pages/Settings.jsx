import React, { useState } from "react";
import { Save, Building2, Percent, Clock, Hash, Boxes, List, Bell } from "lucide-react";
import { PageHeader, SectionCard } from "@/components/ui/shared";
import { restaurant, paymentMethods, managedLists } from "@/lib/mockData";
import { cn } from "@/lib/utils";

const SECTIONS = [
  { id: "profile", label: "Restaurant profile", icon: Building2 },
  { id: "payments", label: "Payment methods", icon: List },
  { id: "tax", label: "Tax & service charge", icon: Percent },
  { id: "day", label: "Business day", icon: Clock },
  { id: "numbering", label: "Numbering", icon: Hash },
  { id: "ops", label: "Operational settings", icon: Bell },
  { id: "tracking", label: "Inventory tracking", icon: Boxes },
  { id: "lists", label: "Managed lists", icon: List },
];

export default function Settings() {
  const [section, setSection] = useState("profile");
  const [tracking, setTracking] = useState(restaurant.inventoryTracking);

  return (
    <div>
      <PageHeader title="Settings" subtitle="Only the Manager can view and change Settings. Every change to tax rate, service charge and listed settings is written to the activity log." actions={<button className="btn-primary"><Save className="h-4 w-4" /> Save changes</button>} />
      <div className="grid gap-5 lg:grid-cols-4">
        <nav className="space-y-1">
          {SECTIONS.map((s) => (
            <button key={s.id} onClick={() => setSection(s.id)} className={cn("flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium", section === s.id ? "bg-primary/10 text-primary" : "hover:bg-secondary")}>
              <s.icon className="h-4 w-4" /> {s.label}
            </button>
          ))}
        </nav>
        <div className="lg:col-span-3">
          {section === "profile" && (
            <SectionCard title="Restaurant profile">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Restaurant name"><input className="input-soft" defaultValue={restaurant.name} /></Field>
                <Field label="Tax ID (TIN) — required before invoicing"><input className="input-soft" defaultValue={restaurant.tin} /></Field>
                <Field label="Phone"><input className="input-soft" defaultValue={restaurant.phone} /></Field>
                <Field label="Email"><input className="input-soft" defaultValue={restaurant.email} /></Field>
                <Field label="Address" full><input className="input-soft" defaultValue={restaurant.address} /></Field>
                <Field label="Invoice footer text" full><input className="input-soft" defaultValue={restaurant.footer} /></Field>
              </div>
              <Field label="Logo (JPG/PNG/WEBP, max 5 MB)" full><div className="rounded-lg border border-dashed border-border bg-secondary/40 p-6 text-center text-sm text-muted-foreground">Tap to upload logo</div></Field>
            </SectionCard>
          )}
          {section === "payments" && (
            <SectionCard title="Payment methods">
              <div className="space-y-2">
                {paymentMethods.map((m) => (
                  <div key={m.name} className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2.5 text-sm">
                    <span className="font-medium">{m.name}</span>
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-1.5 text-xs text-muted-foreground"><input type="checkbox" defaultChecked={m.referenceRequired} /> Reference required</label>
                      <label className="flex items-center gap-1.5 text-xs text-muted-foreground"><input type="checkbox" defaultChecked={m.active} /> Active</label>
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs text-muted-foreground">Card is recorded only — no terminal integration. New methods default to reference optional.</p>
            </SectionCard>
          )}
          {section === "tax" && (
            <SectionCard title="Tax & service charge">
              <Field label="Tax rate (%)"><input type="number" className="input-soft" defaultValue={restaurant.taxRate} /></Field>
              <Field label="Service charge (%) — applies to every dine-in & takeaway bill, cannot be waived"><input type="number" className="input-soft" defaultValue={restaurant.serviceCharge} /></Field>
              <p className="mt-2 text-xs text-muted-foreground">Changes apply to new invoices only. Each invoice stores the rates used. All items taxed at the single rate — no exemptions.</p>
            </SectionCard>
          )}
          {section === "day" && (
            <SectionCard title="Business day">
              <Field label="Closing time (default 04:00)"><input type="time" className="input-soft" defaultValue={restaurant.closingTime} /></Field>
              <p className="mt-2 text-xs text-muted-foreground">Sales after midnight and before closing belong to the previous business day. The day closes automatically; the Manager can reopen the most recent closed day.</p>
            </SectionCard>
          )}
          {section === "numbering" && (
            <SectionCard title="Numbering format">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Order number prefix"><input className="input-soft" defaultValue={restaurant.orderPrefix} /></Field>
                <Field label="Order number digits"><input type="number" className="input-soft" defaultValue={restaurant.orderDigits} /></Field>
                <Field label="Invoice prefix"><input className="input-soft" defaultValue={restaurant.invoicePrefix} /></Field>
                <Field label="Credit note prefix"><input className="input-soft" defaultValue={restaurant.creditNotePrefix} /></Field>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Order numbers reset per business day. Invoice & credit note numbers are continuous, never reset, never reused, no gaps.</p>
            </SectionCard>
          )}
          {section === "ops" && (
            <SectionCard title="Operational settings">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Reservation duration (min)"><input type="number" className="input-soft" defaultValue={restaurant.reservationDuration} /></Field>
                <Field label="No-show grace (min)"><input type="number" className="input-soft" defaultValue={restaurant.noShowGrace} /></Field>
                <Field label="Reservation reminder lead (min)"><input type="number" className="input-soft" defaultValue={restaurant.reminderLead} /></Field>
                <Field label="Delayed kitchen threshold (min, global)"><input type="number" className="input-soft" defaultValue={restaurant.delayThreshold} /></Field>
                <Field label="Warranty alert lead (days)"><input type="number" className="input-soft" defaultValue={restaurant.warrantyLead} /></Field>
                <Field label="Stock count variance threshold (%)"><input type="number" className="input-soft" defaultValue={restaurant.varianceThreshold} /></Field>
                <Field label="Notification retention (days)"><input type="number" className="input-soft" defaultValue={restaurant.notificationRetention} /></Field>
              </div>
            </SectionCard>
          )}
          {section === "tracking" && (
            <SectionCard title="Inventory tracking switch">
              <div className="flex items-center justify-between rounded-xl border border-border p-4">
                <div><p className="font-medium">Recipe-based stock deduction</p><p className="text-sm text-muted-foreground">{tracking ? "ON — serving deducts recipe × variant × qty" : "OFF — recipes optional, no auto deduction"}</p></div>
                <button onClick={() => setTracking((t) => !t)} className={cn("relative h-7 w-12 rounded-full transition-colors", tracking ? "bg-emerald-500" : "bg-secondary")}>
                  <span className={cn("absolute top-1 h-5 w-5 rounded-full bg-white transition-all", tracking ? "left-6" : "left-1")} />
                </button>
              </div>
              <div className="mt-3 rounded-lg bg-secondary/60 p-3 text-sm">
                <p className="font-medium">Readiness checklist to turn ON:</p>
                <ul className="mt-1 space-y-1 text-muted-foreground">
                  <li>✓ Opening stock count confirmed</li>
                  <li>✓ Every Active menu item has a recipe with ≥1 line</li>
                  <li>✓ Every recipe ingredient has a base unit</li>
                </ul>
                <p className="mt-2 text-xs">Turning on is logged. Orders served while off are not backfilled.</p>
              </div>
            </SectionCard>
          )}
          {section === "lists" && (
            <SectionCard title="Managed lists">
              <div className="grid gap-3 sm:grid-cols-2">
                {Object.entries(managedLists).map(([k, v]) => (
                  <div key={k} className="rounded-lg border border-border bg-card p-3">
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{k.replace(/([A-Z])/g, " $1")}</p>
                    <div className="flex flex-wrap gap-1">
                      {v.map((item) => <span key={item.name || item} className="rounded bg-secondary px-2 py-0.5 text-xs">{item.name || item}</span>)}
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children, full }) {
  return (
    <label className={cn("block", full && "sm:col-span-2")}>
      <span className="mb-1 block text-sm font-medium">{label}</span>
      {children}
    </label>
  );
}