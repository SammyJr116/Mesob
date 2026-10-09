import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Save, Building2, Percent, Clock, Hash, Boxes, List, Bell, ImagePlus } from "lucide-react";
import { PageHeader, SectionCard } from "@/components/ui/shared";
import { useData } from "@/lib/DataContext";
import { useRole } from "@/lib/RoleContext";
import { notifySaved, notifyError } from "@/lib/notify";
import { stamp } from "@/lib/datetime";
import { cn } from "@/lib/utils";
import { settingsApi } from "@/api/client";

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

const NUMERIC = [
  "taxRate", "serviceCharge", "orderDigits", "reservationDuration", "noShowGrace",
  "reminderLead", "delayThreshold", "warrantyLead", "varianceThreshold", "notificationRetention",
];

export default function Settings() {
  const { db, setCollection, insertItem } = useData();
  const { role } = useRole();
  const { restaurant, paymentMethods, managedLists } = db;
  const [params, setParams] = useSearchParams();
  const section = params.get("section") || "profile";
  const [draft, setDraft] = useState(restaurant);
  const [methods, setMethods] = useState(paymentMethods);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadServerSettings() {
      try {
        const res = await settingsApi.get();
        if (res?.settings) {
          const s = res.settings;
          setDraft((prev) => ({
            ...prev,
            name: s.restaurantName || prev.name,
            tin: s.tin || prev.tin,
            taxRate: Number(s.vatRate) ?? prev.taxRate,
            serviceCharge: Number(s.serviceChargeRate) ?? prev.serviceCharge,
            closeHour: s.closingTime || prev.closeHour,
            delayThreshold: s.delayedTicketMinutes ?? prev.delayThreshold,
            lowStockThreshold: s.lowStockThreshold ?? prev.lowStockThreshold,
            inventoryTracking: s.inventoryTracking ?? prev.inventoryTracking,
            address: s.address || prev.address,
            phone: s.phone || prev.phone,
            email: s.email || prev.email,
            invoiceFooter: s.invoiceFooter || prev.invoiceFooter,
          }));
        }
      } catch {
        // fallback
      }
    }
    loadServerSettings();
  }, [restaurant]);

  useEffect(() => {
    setMethods(paymentMethods);
  }, [paymentMethods]);

  const setField = (key, value) => setDraft((d) => ({ ...d, [key]: value }));

  const selectSection = (id) => {
    const next = new URLSearchParams(params);
    next.set("section", id);
    setParams(next, { replace: true });
  };

  const save = async () => {
    const bad = NUMERIC.find((k) => !Number.isFinite(Number(draft[k])) || Number(draft[k]) < 0);
    if (bad) {
      notifyError("Could not save", `"${bad}" must be a number of 0 or more.`);
      return;
    }
    if (!String(draft.name).trim()) {
      notifyError("Could not save", "Restaurant name cannot be empty.");
      return;
    }
    setSaving(true);
    try {
      await settingsApi.update({
        restaurantName: draft.name,
        tin: draft.tin,
        vatRate: Number(draft.taxRate),
        serviceChargeRate: Number(draft.serviceCharge),
        closingTime: draft.closeHour || "04:00",
        delayedTicketMinutes: Number(draft.delayThreshold) || 20,
        lowStockThreshold: Number(draft.lowStockThreshold) || 5,
        inventoryTracking: !!draft.inventoryTracking,
        address: draft.address,
        phone: draft.phone,
        email: draft.email,
        invoiceFooter: draft.invoiceFooter,
      });
    } catch {
      // fallback
    }
    setCollection("restaurant", draft);
    setCollection("paymentMethods", methods);
    insertItem("activityLog", {
      id: `L${Date.now()}`,
      who: role || "manager",
      when: stamp(),
      action: "Changed settings",
      target: `Settings · ${section}`,
      old: "",
      new: section,
      reason: "",
    });
    setSaving(false);
    notifySaved("Settings");
  };

  const toggleMethod = (name, key) => {
    setMethods((ms) => ms.map((m) => (m.name === name ? { ...m, [key]: !m[key] } : m)));
  };

  return (
    <div>
      <PageHeader
        title="ማስተካከያ · Settings"
        subtitle="Only the Manager can view and change Settings. Every change to tax rate, service charge and listed settings is written to the activity log."
        actions={
          <button onClick={save} disabled={saving} className="btn-primary">
            <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save changes"}
          </button>
        }
      />
      <div className="grid gap-5 lg:grid-cols-4">
        <nav aria-label="Settings sections" className="space-y-1">
          {SECTIONS.map((s) => (
            <button key={s.id} onClick={() => selectSection(s.id)} aria-current={section === s.id ? "page" : undefined}
              className={cn("flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium", section === s.id ? "bg-primary/10 text-primary" : "hover:bg-secondary")}>
              <s.icon className="h-4 w-4" /> {s.label}
            </button>
          ))}
        </nav>
        <div className="lg:col-span-3">
          {section === "profile" && (
            <SectionCard title="Restaurant profile">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Restaurant name" id="set-name"><input id="set-name" className="input-soft" value={draft.name} onChange={(e) => setField("name", e.target.value)} /></Field>
                <Field label="Tax ID (TIN) — required before invoicing" id="set-tin"><input id="set-tin" className="input-soft" value={draft.tin} onChange={(e) => setField("tin", e.target.value)} /></Field>
                <Field label="Phone" id="set-phone"><input id="set-phone" className="input-soft" value={draft.phone} onChange={(e) => setField("phone", e.target.value)} /></Field>
                <Field label="Email" id="set-email"><input id="set-email" className="input-soft" value={draft.email} onChange={(e) => setField("email", e.target.value)} /></Field>
                <Field label="Address" id="set-address" full><input id="set-address" className="input-soft" value={draft.address} onChange={(e) => setField("address", e.target.value)} /></Field>
                <Field label="Invoice footer text" id="set-footer" full><input id="set-footer" className="input-soft" value={draft.footer} onChange={(e) => setField("footer", e.target.value)} /></Field>
              </div>
              <Field label="Logo (JPG/PNG/WEBP, max 5 MB)" id="set-logo" full>
                <label htmlFor="set-logo" className="mt-1 flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-secondary/40 p-6 text-center text-sm text-muted-foreground hover:bg-secondary">
                  <ImagePlus className="h-4 w-4" />
                  {draft.logoName || "Tap to upload logo"}
                </label>
                <input id="set-logo" type="file" accept="image/jpeg,image/png,image/webp" className="sr-only"
                  onChange={(e) => setField("logoName", e.target.files?.[0]?.name || "")} />
              </Field>
            </SectionCard>
          )}
          {section === "payments" && (
            <SectionCard title="Payment methods">
              <div className="space-y-2">
                {methods.map((m) => (
                  <div key={m.name} className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2.5 text-sm">
                    <span className="font-medium">{m.name}</span>
                    <div className="flex items-center gap-3">
                      <label htmlFor={`ref-${m.name}`} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <input id={`ref-${m.name}`} type="checkbox" checked={m.referenceRequired} onChange={() => toggleMethod(m.name, "referenceRequired")} /> Reference required
                      </label>
                      <label htmlFor={`act-${m.name}`} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <input id={`act-${m.name}`} type="checkbox" checked={m.active} onChange={() => toggleMethod(m.name, "active")} /> Active
                      </label>
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs text-muted-foreground">Card is recorded only — no terminal integration. New methods default to reference optional.</p>
            </SectionCard>
          )}
          {section === "tax" && (
            <SectionCard title="Tax & service charge">
              <Field label="Tax rate (%)" id="set-tax"><input id="set-tax" type="number" min="0" max="100" className="input-soft" value={draft.taxRate} onChange={(e) => setField("taxRate", e.target.value)} /></Field>
              <Field label="Service charge (%) — applies to every dine-in & takeaway bill, cannot be waived" id="set-service"><input id="set-service" type="number" min="0" max="100" className="input-soft" value={draft.serviceCharge} onChange={(e) => setField("serviceCharge", e.target.value)} /></Field>
              <p className="mt-2 text-xs text-muted-foreground">Changes apply to new invoices only. Each invoice stores the rates used. All items taxed at the single rate — no exemptions.</p>
            </SectionCard>
          )}
          {section === "day" && (
            <SectionCard title="Business day">
              <Field label="Closing time (default 04:00)" id="set-closing"><input id="set-closing" type="time" className="input-soft" value={draft.closingTime} onChange={(e) => setField("closingTime", e.target.value)} /></Field>
              <p className="mt-2 text-xs text-muted-foreground">Sales after midnight and before closing belong to the previous business day. The day closes automatically; the Manager can reopen the most recent closed day.</p>
            </SectionCard>
          )}
          {section === "numbering" && (
            <SectionCard title="Numbering format">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Order number prefix" id="set-oprefix"><input id="set-oprefix" className="input-soft" value={draft.orderPrefix} onChange={(e) => setField("orderPrefix", e.target.value)} /></Field>
                <Field label="Order number digits" id="set-odigits"><input id="set-odigits" type="number" min="1" max="8" className="input-soft" value={draft.orderDigits} onChange={(e) => setField("orderDigits", e.target.value)} /></Field>
                <Field label="Invoice prefix" id="set-iprefix"><input id="set-iprefix" className="input-soft" value={draft.invoicePrefix} onChange={(e) => setField("invoicePrefix", e.target.value)} /></Field>
                <Field label="Credit note prefix" id="set-cnprefix"><input id="set-cnprefix" className="input-soft" value={draft.creditNotePrefix} onChange={(e) => setField("creditNotePrefix", e.target.value)} /></Field>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Order numbers reset per business day. Invoice & credit note numbers are continuous, never reset, never reused, no gaps.</p>
            </SectionCard>
          )}
          {section === "ops" && (
            <SectionCard title="Operational settings">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Reservation duration (min)" id="set-resdur"><input id="set-resdur" type="number" min="0" className="input-soft" value={draft.reservationDuration} onChange={(e) => setField("reservationDuration", e.target.value)} /></Field>
                <Field label="No-show grace (min)" id="set-grace"><input id="set-grace" type="number" min="0" className="input-soft" value={draft.noShowGrace} onChange={(e) => setField("noShowGrace", e.target.value)} /></Field>
                <Field label="Reservation reminder lead (min)" id="set-lead"><input id="set-lead" type="number" min="0" className="input-soft" value={draft.reminderLead} onChange={(e) => setField("reminderLead", e.target.value)} /></Field>
                <Field label="Delayed kitchen threshold (min, global)" id="set-delay"><input id="set-delay" type="number" min="0" className="input-soft" value={draft.delayThreshold} onChange={(e) => setField("delayThreshold", e.target.value)} /></Field>
                <Field label="Warranty alert lead (days)" id="set-warranty"><input id="set-warranty" type="number" min="0" className="input-soft" value={draft.warrantyLead} onChange={(e) => setField("warrantyLead", e.target.value)} /></Field>
                <Field label="Stock count variance threshold (%)" id="set-variance"><input id="set-variance" type="number" min="0" className="input-soft" value={draft.varianceThreshold} onChange={(e) => setField("varianceThreshold", e.target.value)} /></Field>
                <Field label="Notification retention (days)" id="set-retention"><input id="set-retention" type="number" min="0" className="input-soft" value={draft.notificationRetention} onChange={(e) => setField("notificationRetention", e.target.value)} /></Field>
              </div>
            </SectionCard>
          )}
          {section === "tracking" && (
            <SectionCard title="Inventory tracking switch">
              <div className="flex items-center justify-between rounded-xl border border-border p-4">
                <div>
                  <p className="font-medium">Recipe-based stock deduction</p>
                  <p className="text-sm text-muted-foreground">{draft.inventoryTracking ? "ON — serving deducts recipe × variant × qty" : "OFF — recipes optional, no auto deduction"}</p>
                </div>
                <button
                  role="switch"
                  aria-checked={draft.inventoryTracking}
                  aria-label="Recipe-based stock deduction"
                  onClick={() => setField("inventoryTracking", !draft.inventoryTracking)}
                  className={cn("relative h-7 w-12 rounded-full transition-colors", draft.inventoryTracking ? "bg-sage-500" : "bg-secondary")}
                >
                  <span className={cn("absolute top-1 h-5 w-5 rounded-full bg-white transition-all", draft.inventoryTracking ? "left-6" : "left-1")} />
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

function Field({ label, id, children, full = false }) {
  return (
    <div className={cn("block", full && "sm:col-span-2")}>
      <label htmlFor={id} className="mb-1 block text-sm font-medium">{label}</label>
      {children}
    </div>
  );
}