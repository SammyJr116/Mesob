import React, { useState } from "react";
import { Plus, Pencil, Upload } from "lucide-react";
import { StatusBadge, SearchInput } from "@/components/ui/shared";
import { menuItems, menuCategories, etb } from "@/lib/mockData";
import { cn } from "@/lib/utils";

export default function Menu() {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All");
  const [showAdd, setShowAdd] = useState(false);

  const filtered = menuItems.filter((m) => {
    const okQ = !q || m.name.toLowerCase().includes(q.toLowerCase());
    const okCat = cat === "All" || m.category === cat;
    return okQ && okCat;
  });

  return (
    <div>
      {/* Dark elegant menu header — inspired by the printed menu reference */}
      <div className="relative mb-6 overflow-hidden rounded-2xl border border-walnut/40 bg-walnut text-cream shadow-warm">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 20% 20%, hsl(32 46% 56%) 0, transparent 40%), radial-gradient(circle at 80% 80%, hsl(27 34% 46%) 0, transparent 45%)" }} />
        <div className="relative flex flex-col gap-3 px-6 py-7 sm:flex-row sm:items-end sm:justify-between sm:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gold">À la carte</p>
            <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight text-cream sm:text-4xl">Menu</h1>
            <p className="mt-1 max-w-md text-sm text-cream/70">Tax-inclusive prices. Fasting tag on every item. Variants scale the recipe; add-ons only add ingredients.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="inline-flex items-center gap-2 rounded-lg border border-cream/20 px-4 py-2 text-sm font-semibold text-cream transition hover:bg-cream/10"><Upload className="h-4 w-4" /> Import CSV</button>
            <button onClick={() => setShowAdd(true)} className="inline-flex items-center gap-2 rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-walnut shadow-gold transition hover:brightness-105"><Plus className="h-4 w-4" /> New item</button>
          </div>
        </div>
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {menuCategories.map((c) => (
          <div key={c.id} className="card-soft flex items-center justify-between p-3">
            <div><p className="font-medium">{c.name}</p><p className="text-xs text-muted-foreground">{menuItems.filter((m) => m.category === c.name).length} items</p></div>
            <StatusBadge status={c.status} />
          </div>
        ))}
      </div>

      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="flex-1"><SearchInput value={q} onChange={setQ} placeholder="Search menu items…" /></div>
        <select value={cat} onChange={(e) => setCat(e.target.value)} className="input-soft w-auto">
          <option>All</option>
          {menuCategories.map((c) => <option key={c.id}>{c.name}</option>)}
        </select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((m) => (
          <div key={m.id} className="card-soft group overflow-hidden p-0 transition-all hover:-translate-y-1 hover:shadow-warm">
            <div className="relative h-32 w-full overflow-hidden rounded-t-2xl bg-secondary">
              {m.image ? (
                <img src={m.image} alt={m.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No image</div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-walnut/60 via-transparent to-transparent" />
              <span className={cn("absolute right-2 top-2 rounded-full px-2 py-0.5 text-[11px] font-semibold backdrop-blur", m.fasting === "Fasting" ? "bg-sage/85 text-cream" : "bg-berbere/85 text-cream")}>{m.fasting}</span>
              {m.availability === "Unavailable" && (
                <span className="absolute left-2 top-2 rounded-full bg-rose-600/90 px-2 py-0.5 text-[11px] font-semibold text-white backdrop-blur">Unavailable</span>
              )}
            </div>
            <div className="p-3">
              <div className="flex items-start justify-between gap-2">
                <p className="font-display text-base font-semibold leading-tight">{m.name}</p>
                <span className="shrink-0 font-display text-base font-semibold text-primary">{etb(m.price)} <span className="text-xs text-muted-foreground">ETB</span></span>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">{m.category} · {m.mealPeriod}</p>
              <div className="mt-2 flex flex-wrap gap-1 text-[11px] text-muted-foreground">
                {m.variants.length > 0 && <span className="rounded bg-secondary px-1.5 py-0.5">{m.variants.length} variants</span>}
                {m.addons.length > 0 && <span className="rounded bg-secondary px-1.5 py-0.5">{m.addons.length} add-ons</span>}
                {m.hasRecipe ? <span className="rounded bg-sage/15 px-1.5 py-0.5 text-sage">Recipe</span> : <span className="rounded bg-amber-100 px-1.5 py-0.5 text-amber-700">No recipe</span>}
              </div>
              <div className="mt-2 flex items-center justify-between">
                <StatusBadge status={m.status} />
                <button className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary"><Pencil className="h-4 w-4" /></button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showAdd && <AddItemModal onClose={() => setShowAdd(false)} />}
    </div>
  );
}

function AddItemModal({ onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-card p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="mb-4 font-display text-lg font-semibold">New menu item</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Name (English only)"><input className="input-soft" placeholder="e.g. Doro Wot" /></Field>
          <Field label="Category"><select className="input-soft">{menuCategories.map((c) => <option key={c.id}>{c.name}</option>)}</select></Field>
          <Field label="Base price (tax-inclusive, ETB)"><input type="number" className="input-soft" placeholder="0.00" /></Field>
          <Field label="Fasting tag"><select className="input-soft"><option>Fasting</option><option>Non-fasting</option></select></Field>
          <Field label="Meal period"><select className="input-soft"><option>All day</option>{menuCategories.length && <option>Breakfast</option>}</select></Field>
          <Field label="Manual availability"><select className="input-soft"><option>Available</option><option>Unavailable</option></select></Field>
        </div>
        <Field label="Description (optional)"><textarea className="input-soft min-h-[60px]" /></Field>
        <p className="mb-4 rounded-lg bg-secondary/60 px-3 py-2 text-xs text-muted-foreground">Variants, add-ons and recipe are added after creating the item. While inventory tracking is on, an item cannot be activated without a recipe.</p>
        <div className="flex gap-2">
          <button onClick={onClose} className="btn-outline flex-1">Cancel</button>
          <button onClick={onClose} className="btn-primary flex-1">Create item</button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium">{label}</span>
      {children}
    </label>
  );
}