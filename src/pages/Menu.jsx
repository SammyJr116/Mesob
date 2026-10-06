import React, { useMemo, useState } from "react";
import { Plus, Pencil, Upload, Trash2, ChefHat, AlertTriangle } from "lucide-react";
import { StatusBadge, SearchInput, EmptyState } from "@/components/ui/shared";
import Modal from "@/components/ui/Modal";
import DataTable from "@/components/ui/DataTable";
import { useData } from "@/lib/DataContext";
import { etb } from "@/lib/format";
import { nextId } from "@/lib/datetime";
import { notifySuccess, notifyError } from "@/lib/notify";
import { cn } from "@/lib/utils";

const MEAL_PERIODS = ["All day", "Breakfast", "Lunch", "Dinner"];

export default function Menu() {
  const { db, insertItem, updateItem, removeItem } = useData();
  const { menuItems, menuCategories, recipes } = db;
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All");
  const [editing, setEditing] = useState(null);
  const [view, setView] = useState("cards");

  const filtered = useMemo(
    () =>
      menuItems.filter((m) => {
        const okQ = !q || m.name.toLowerCase().includes(q.toLowerCase());
        const okCat = cat === "All" || m.category === cat;
        return okQ && okCat;
      }),
    [menuItems, q, cat]
  );

  const openNew = () => setEditing({ draft: blankItem(menuCategories, menuItems) });
  const openEdit = (m) => setEditing({ draft: { ...m }, original: m });

  const save = (draft) => {
    const name = draft.name.trim();
    if (!name) {
      notifyError("An item needs a name");
      return;
    }
    const clash = menuItems.some((m) => m.name.toLowerCase() === name.toLowerCase() && m.id !== draft.id);
    if (clash) {
      notifyError(`"${name}" already exists`);
      return;
    }
    // Tracking is on whenever at least one ingredient is in stock; an item with
    // no recipe cannot be activated, per the inventory rule.
    if (draft.status === "Active" && !draft.hasRecipe && !recipes[draft.id]) {
      notifyError("Add a recipe before activating this item");
      return;
    }
    if (editing.original) {
      updateItem("menuItems", draft.id, draft);
      notifySuccess(`${name} updated`);
    } else {
      insertItem("menuItems", draft);
      notifySuccess(`${name} added as ${draft.status}`);
    }
    setEditing(null);
  };

  const remove = (m) => {
    removeItem("menuItems", m.id);
    notifySuccess(`${m.name} removed`);
  };

  const importCsv = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const lines = String(reader.result || "").split(/\r?\n/).filter(Boolean);
      if (lines.length < 2) {
        notifyError("The CSV needs a header row and at least one item");
        return;
      }
      const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
      const idx = (n) => headers.indexOf(n);
      const added = [];
      const skipped = [];
      lines.slice(1).forEach((line) => {
        const cells = line.split(",").map((c) => c.trim());
        const name = cells[idx("name")] || "";
        const price = Number(cells[idx("price")]);
        if (!name || !Number.isFinite(price) || price <= 0) {
          skipped.push(name || line);
          return;
        }
        if (menuItems.some((m) => m.name.toLowerCase() === name.toLowerCase()) || added.some((m) => m.name === name)) {
          skipped.push(name);
          return;
        }
        const category = cells[idx("category")] || menuCategories[0]?.name || "Main Dishes";
        added.push({
          ...blankItem(menuCategories, menuItems, name),
          id: nextId([...menuItems, ...added], "M"),
          name,
          category,
          price,
          fasting: cells[idx("fasting")] || "Non-fasting",
          mealPeriod: cells[idx("meal_period")] || "All day",
          availability: cells[idx("availability")] || "Available",
          status: "Draft",
        });
      });
      if (!added.length) {
        notifyError(`Nothing imported. Skipped: ${skipped.join(", ") || "no valid rows"}`);
        return;
      }
      added.forEach((item) => insertItem("menuItems", item));
      notifySuccess(
        `Imported ${added.length} item${added.length === 1 ? "" : "s"} as Draft${skipped.length ? `; skipped ${skipped.join(", ")}` : ""}`
      );
    };
    reader.onerror = () => notifyError("Could not read that file");
    reader.readAsText(file);
  };

  return (
    <div>
      {/* Dark elegant menu header — inspired by the printed menu reference */}
      <div className="relative mb-6 overflow-hidden rounded-2xl border border-walnut/40 bg-walnut text-cream shadow-warm">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 20% 20%, hsl(32 46% 56%) 0, transparent 40%), radial-gradient(circle at 80% 80%, hsl(27 34% 46%) 0, transparent 45%)" }} />
        <div className="relative flex flex-col gap-3 px-6 py-7 sm:flex-row sm:items-end sm:justify-between sm:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-brand text-gold">À la carte</p>
            <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight text-cream sm:text-4xl">Menu</h1>
            <p className="mt-1 max-w-md text-sm text-cream/70">Tax-inclusive prices. Fasting tag on every item. Variants scale the recipe; add-ons only add ingredients.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-cream/20 px-4 py-2 text-sm font-semibold text-cream transition hover:bg-cream/10">
              <Upload className="h-4 w-4" /> Import CSV
              <input type="file" accept=".csv,text/csv" onChange={importCsv} className="sr-only" />
            </label>
            <button onClick={openNew} className="inline-flex items-center gap-2 rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-walnut shadow-gold transition hover:brightness-105">
              <Plus className="h-4 w-4" /> New item
            </button>
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
        <label htmlFor="menu-cat" className="sr-only">Filter by category</label>
        <select id="menu-cat" value={cat} onChange={(e) => setCat(e.target.value)} className="input-soft w-auto">
          <option>All</option>
          {menuCategories.map((c) => <option key={c.id}>{c.name}</option>)}
        </select>
        <div role="group" aria-label="Layout" className="flex rounded-lg border border-border p-0.5">
          {[["cards", "Cards"], ["table", "Table"]].map(([id, label]) => (
            <button
              key={id}
              onClick={() => setView(id)}
              aria-pressed={view === id}
              className={cn("rounded-md px-3 py-1.5 text-sm font-medium transition", view === id ? "bg-primary text-primary-foreground" : "text-muted-foreground")}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No items match"
          description={q || cat !== "All" ? "Try a different search or category." : "Add your first menu item to get started."}
          icon={ChefHat}
          action={<button onClick={openNew} className="btn-primary text-sm"><Plus className="h-4 w-4" /> New item</button>}
        />
      ) : view === "table" ? (
        <DataTable
          caption="Menu items with price, category, status and actions"
          initialSort={{ key: "name", dir: "asc" }}
          columns={[
            { key: "name", header: "Item", sortable: true, render: (m) => (
              <div className="flex items-center gap-2">
                {m.image ? <img src={m.image} alt="" className="h-8 w-8 rounded-md object-cover" /> : null}
                <span className="font-medium">{m.name}</span>
              </div>
            ) },
            { key: "category", header: "Category", sortable: true, render: (m) => <span className="text-muted-foreground">{m.category}</span> },
            { key: "price", header: "Price", align: "right", sortable: true, render: (m) => `${etb(m.price)} ETB` },
            { key: "mealPeriod", header: "Meal period", sortable: true, render: (m) => <span className="text-muted-foreground">{m.mealPeriod}</span> },
            { key: "fasting", header: "Fasting", sortable: true, render: (m) => <span className="text-muted-foreground">{m.fasting}</span> },
            { key: "availability", header: "Availability", sortable: true, render: (m) => <span className={m.availability === "Unavailable" ? "font-medium text-berbere-600" : ""}>{m.availability}</span> },
            { key: "status", header: "Status", sortable: true, render: (m) => <StatusBadge status={m.status} /> },
            { key: "actions", header: "Actions", align: "right", render: (m) => (
              <div className="flex justify-end gap-1">
                <button onClick={() => openEdit(m)} aria-label={`Edit ${m.name}`} className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground">
                  <Pencil className="h-4 w-4" />
                </button>
                <button onClick={() => remove(m)} aria-label={`Remove ${m.name}`} className="rounded-md p-1.5 text-muted-foreground hover:bg-berbere-100 hover:text-berbere-600">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ) },
          ]}
          rows={filtered}
          rowKey={(m) => m.id}
          pageSize={10}
        />
      ) : (
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
                <span className={cn("absolute right-2 top-2 rounded-full px-2 py-0.5 text-2xs font-semibold backdrop-blur", m.fasting === "Fasting" ? "bg-sage/85 text-cream" : "bg-berbere/85 text-cream")}>{m.fasting}</span>
                {m.availability === "Unavailable" && (
                  <span className="absolute left-2 top-2 rounded-full bg-berbere-600/90 px-2 py-0.5 text-2xs font-semibold text-white backdrop-blur">Unavailable</span>
                )}
              </div>
              <div className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-display text-base font-semibold leading-tight">{m.name}</p>
                  <span className="shrink-0 font-display text-base font-semibold text-primary">{etb(m.price)} <span className="text-xs text-muted-foreground">ETB</span></span>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">{m.category} · {m.mealPeriod}</p>
                <div className="mt-2 flex flex-wrap gap-1 text-2xs text-muted-foreground">
                  {m.variants.length > 0 && <span className="rounded bg-secondary px-1.5 py-0.5">{m.variants.length} variants</span>}
                  {m.addons.length > 0 && <span className="rounded bg-secondary px-1.5 py-0.5">{m.addons.length} add-ons</span>}
                  {m.hasRecipe ? <span className="rounded bg-sage-100 px-1.5 py-0.5 text-sage-700">Recipe</span> : <span className="rounded bg-gold-100 px-1.5 py-0.5 text-gold-600">No recipe</span>}
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <StatusBadge status={m.status} />
                  <div className="flex gap-0.5">
                    <button onClick={() => openEdit(m)} aria-label={`Edit ${m.name}`} className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"><Pencil className="h-4 w-4" /></button>
                    <button onClick={() => remove(m)} aria-label={`Remove ${m.name}`} className="rounded-md p-1.5 text-muted-foreground hover:bg-berbere-100 hover:text-berbere-600"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && <ItemModal draft={editing.draft} categories={menuCategories} hasRecipe={!!recipes[editing.draft.id]} onClose={() => setEditing(null)} onSave={save} />}
    </div>
  );
}

function blankItem(categories, items, name = "") {
  return {
    id: nextId(items, "M"),
    name,
    category: categories[0]?.name || "Main Dishes",
    price: 0,
    status: "Draft",
    availability: "Available",
    fasting: "Non-fasting",
    mealPeriod: "All day",
    image: "",
    variants: [],
    addons: [],
    hasRecipe: false,
  };
}

function ItemModal({ draft, categories, hasRecipe, onClose, onSave }) {
  const [item, setItem] = useState(draft);
  const set = (patch) => setItem((prev) => ({ ...prev, ...patch }));
  const missingRecipe = item.status === "Active" && !item.hasRecipe && !hasRecipe;

  return (
    <Modal
      title={hasRecipe || item.id ? `Edit ${item.name || "item"}` : "New menu item"}
      description="Tax-inclusive prices. Variants, add-ons and the recipe are managed on the Recipes screen."
      onClose={onClose}
      onSubmit={(e) => {
        e.preventDefault();
        if (!item.name.trim() || missingRecipe) return;
        onSave(item);
      }}
      footer={
        <>
          <button type="button" onClick={onClose} className="btn-outline flex-1">Cancel</button>
          <button type="submit" disabled={!item.name.trim() || missingRecipe} className="btn-primary flex-1">Save item</button>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Name (English only)">
          <input value={item.name} onChange={(e) => set({ name: e.target.value })} placeholder="e.g. Doro Wot" />
        </Field>
        <Field label="Category">
          <select value={item.category} onChange={(e) => set({ category: e.target.value })}>
            {categories.map((c) => <option key={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="Base price (tax-inclusive, ETB)">
          <input type="number" min="0" step="0.01" value={item.price} onChange={(e) => set({ price: Number(e.target.value) })} placeholder="0.00" />
        </Field>
        <Field label="Fasting tag">
          <select value={item.fasting} onChange={(e) => set({ fasting: e.target.value })}>
            <option>Fasting</option>
            <option>Non-fasting</option>
          </select>
        </Field>
        <Field label="Meal period">
          <select value={item.mealPeriod} onChange={(e) => set({ mealPeriod: e.target.value })}>
            {MEAL_PERIODS.map((p) => <option key={p}>{p}</option>)}
          </select>
        </Field>
        <Field label="Manual availability">
          <select value={item.availability} onChange={(e) => set({ availability: e.target.value })}>
            <option>Available</option>
            <option>Unavailable</option>
          </select>
        </Field>
        <Field label="Status">
          <select value={item.status} onChange={(e) => set({ status: e.target.value })}>
            <option>Draft</option>
            <option>Active</option>
            <option>Inactive</option>
            <option>Retired</option>
          </select>
        </Field>
        <Field label="Image path (local file)">
          <input value={item.image || ""} onChange={(e) => set({ image: e.target.value })} placeholder="/images/menu/doro-wot.svg" />
        </Field>
      </div>
      {missingRecipe && (
        <p role="status" className="mt-3 flex items-start gap-2 rounded-lg bg-berbere-100 px-3 py-2 text-xs text-berbere-600">
          <AlertTriangle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
          Inventory tracking is on, so this item cannot be activated without a recipe. Save it as Draft and add the recipe first.
        </p>
      )}
      <p className="mt-3 rounded-lg bg-secondary/60 px-3 py-2 text-xs text-muted-foreground">
        New items start as {item.id} · {item.hasRecipe || hasRecipe ? "a recipe is linked" : "no recipe"}.
      </p>
    </Modal>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium">{label}</span>
      {React.cloneElement(children, { className: "input-soft" })}
    </label>
  );
}