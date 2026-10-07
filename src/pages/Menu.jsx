import React, { useMemo, useState } from "react";
import { Plus, Pencil, Upload, Trash2, ChefHat, AlertTriangle, Download } from "lucide-react";
import { StatusBadge, SearchInput, EmptyState } from "@/components/ui/shared";
import Modal from "@/components/ui/Modal";
import DataTable from "@/components/ui/DataTable";
import { useData } from "@/lib/DataContext";
import { useRole } from "@/lib/RoleContext";
import { isPrivileged } from "@/lib/roles";
import { etb } from "@/lib/format";
import { nextId } from "@/lib/datetime";
import { notifySuccess, notifyError } from "@/lib/notify";
import { MesobIcon, JebenaIcon } from "@/components/HabeshaDecorations";
import { cn, downloadCsv } from "@/lib/utils";

const MEAL_PERIODS = ["All day", "Breakfast", "Lunch", "Dinner"];

export default function Menu() {
  const { db, insertItem, updateItem, removeItem } = useData();
  const { role } = useRole();
  const isManager = isPrivileged(role);
  const { menuItems, menuCategories, recipes } = db;
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All");
  const [editing, setEditing] = useState(null);
  const [showCsvImport, setShowCsvImport] = useState(false);
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
            <button
              type="button"
              onClick={() => setShowCsvImport(true)}
              className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-cream/20 px-4 py-2 text-sm font-semibold text-cream transition hover:bg-cream/10"
            >
              <Upload className="h-4 w-4" /> Import CSV
            </button>
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
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((m) => {
            const isFasting = m.fasting === "Fasting";
            const isSpicy = ["Doro Wot", "Tibs Special", "Kitfo"].some((name) => m.name.includes(name));
            const isCoffee = m.category === "Coffee" || m.name.toLowerCase().includes("buna") || m.name.toLowerCase().includes("macchiato");
            return (
              <div key={m.id} className="card-soft mesob-card-hover group overflow-hidden p-0 transition-all hover:border-gold-300/80 shadow-warm">
                <div className="relative h-44 w-full overflow-hidden bg-sand-200">
                  {m.image ? (
                    <img src={m.image} alt={m.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-muted-foreground flex-col gap-1">
                      <MesobIcon className="h-6 w-6 text-gold-500 opacity-60" />
                      <span>No image</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-walnut-950/80 via-walnut-900/20 to-transparent" />
                  
                  {/* Ethiopian cultural tags */}
                  <div className="absolute top-2.5 right-2.5 flex flex-col gap-1 items-end">
                    {isFasting && (
                      <span className="rounded-full bg-forest-700/90 border border-forest-500/50 px-2.5 py-0.5 text-2xs font-semibold text-cream shadow-sm backdrop-blur">
                        🌱 ጾም (Fasting)
                      </span>
                    )}
                    {isSpicy && (
                      <span className="rounded-full bg-berbere-700/90 border border-berbere-500/50 px-2.5 py-0.5 text-2xs font-semibold text-cream shadow-sm backdrop-blur">
                        🌶️ Berbere
                      </span>
                    )}
                    {isCoffee && (
                      <span className="rounded-full bg-gold-700/90 border border-gold-400/50 px-2.5 py-0.5 text-2xs font-semibold text-cream shadow-sm backdrop-blur flex items-center gap-1">
                        <JebenaIcon className="h-3 w-3" /> Buna
                      </span>
                    )}
                  </div>

                  {m.availability === "Unavailable" && (
                    <span className="absolute left-2.5 top-2.5 rounded-full bg-berbere-600/95 border border-berbere-400/50 px-2.5 py-0.5 text-2xs font-bold text-white shadow-sm backdrop-blur">
                      Unavailable
                    </span>
                  )}

                  {/* Card image bottom overlay info */}
                  <div className="absolute bottom-2.5 left-3 right-3 flex items-end justify-between text-cream">
                    <span className="text-2xs font-medium uppercase tracking-wider text-gold-300 bg-walnut-950/60 px-2 py-0.5 rounded backdrop-blur-sm">
                      {m.category}
                    </span>
                    <span className="font-display text-lg font-bold text-gold-200 drop-shadow">
                      {etb(m.price)} <span className="text-2xs font-sans text-cream/80">ETB</span>
                    </span>
                  </div>
                </div>

                <div className="p-4 flex flex-col flex-1">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="font-display text-lg font-bold text-foreground leading-snug group-hover:text-primary transition-colors">
                      {m.name}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">{m.mealPeriod} · Served fresh with authentic Habesha spices</p>
                  
                  <div className="mt-3 flex flex-wrap gap-1.5 text-2xs text-muted-foreground">
                    {m.variants.length > 0 && <span className="rounded-md bg-secondary/80 border border-border/60 px-2 py-0.5 font-medium">{m.variants.length} sizes</span>}
                    {m.addons.length > 0 && <span className="rounded-md bg-secondary/80 border border-border/60 px-2 py-0.5 font-medium">Extra Injera/Add-ons</span>}
                    {m.hasRecipe ? (
                      <span className="rounded-md bg-forest-50 border border-forest-200 px-2 py-0.5 font-medium text-forest-700">Heritage Recipe</span>
                    ) : (
                      <span className="rounded-md bg-gold-50 border border-gold-200 px-2 py-0.5 font-medium text-gold-700">No recipe</span>
                    )}
                    {m.scheduledPrices?.length > 0 && (
                      <span className="rounded-md bg-gold-100 dark:bg-gold-950/60 border border-gold-300 text-gold-800 dark:text-gold-300 px-2 py-0.5 font-medium">
                        Upcoming price ({m.scheduledPrices.length})
                      </span>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between">
                    <StatusBadge status={m.status} />
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(m)} aria-label={`Edit ${m.name}`} className="rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-foreground transition">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button onClick={() => remove(m)} aria-label={`Remove ${m.name}`} className="rounded-lg p-2 text-muted-foreground hover:bg-berbere-100 hover:text-berbere-600 transition">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editing && (
        <ItemModal
          draft={editing.draft}
          categories={menuCategories}
          hasRecipe={!!recipes[editing.draft.id]}
          isManager={isManager}
          onClose={() => setEditing(null)}
          onSave={save}
        />
      )}

      {showCsvImport && (
        <MenuCsvImportModal
          menuItems={menuItems}
          menuCategories={menuCategories}
          onClose={() => setShowCsvImport(false)}
          onImport={(itemsToImport) => {
            itemsToImport.forEach((it) => {
              insertItem("menuItems", {
                ...blankItem(menuCategories, menuItems, it.name),
                id: nextId(menuItems, "M"),
                name: it.name,
                category: it.category,
                price: it.price,
                fasting: it.fasting,
                mealPeriod: it.mealPeriod,
                availability: it.availability,
                status: "Draft",
              });
            });
            notifySuccess(`Imported ${itemsToImport.length} menu items as Draft`);
            setShowCsvImport(false);
          }}
        />
      )}
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
    scheduledPrices: [],
  };
}

function ItemModal({ draft, categories, hasRecipe, isManager, onClose, onSave }) {
  const [item, setItem] = useState(draft);
  const [newSchedPrice, setNewSchedPrice] = useState("");
  const [newSchedDate, setNewSchedDate] = useState("");
  const set = (patch) => setItem((prev) => ({ ...prev, ...patch }));
  const missingRecipe = item.status === "Active" && !item.hasRecipe && !hasRecipe;

  const tomorrowStr = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  };

  const handleAddScheduledPrice = () => {
    const p = Number(newSchedPrice);
    if (!Number.isFinite(p) || p <= 0 || !newSchedDate) return;
    const existing = item.scheduledPrices || [];
    set({
      scheduledPrices: [...existing, { price: p, effectiveDate: newSchedDate }],
    });
    setNewSchedPrice("");
    setNewSchedDate("");
  };

  const handleRemoveScheduledPrice = (idx) => {
    set({
      scheduledPrices: (item.scheduledPrices || []).filter((_, i) => i !== idx),
    });
  };

  return (
    <Modal
      title={hasRecipe || item.id ? `Edit ${item.name || "item"}` : "New menu item"}
      description="Tax-inclusive prices. Variants, add-ons and the recipe are managed on the Recipes screen."
      size="md"
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

        {isManager && (
          <div className="sm:col-span-2 mt-2 rounded-xl border border-border bg-secondary/30 p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-foreground">Scheduled Price Changes (PRD 7.8)</span>
              <span className="text-[11px] text-muted-foreground">Manager only</span>
            </div>
            {(item.scheduledPrices || []).length > 0 ? (
              <div className="space-y-1.5 mb-3">
                {item.scheduledPrices.map((sp, idx) => (
                  <div key={idx} className="flex items-center justify-between rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs">
                    <span>
                      <strong>{etb(sp.price)} ETB</strong> · Effective: <span className="font-medium text-foreground">{sp.effectiveDate}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveScheduledPrice(idx)}
                      className="text-berbere-600 hover:text-berbere-700 text-xs font-medium"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground mb-3">No future price changes scheduled.</p>
            )}
            <div className="flex flex-wrap items-end gap-2">
              <div className="flex-1 min-w-[120px]">
                <label className="text-[11px] text-muted-foreground block mb-1">New Price (ETB)</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="0.00"
                  value={newSchedPrice}
                  onChange={(e) => setNewSchedPrice(e.target.value)}
                  className="input-soft text-xs"
                />
              </div>
              <div className="flex-1 min-w-[130px]">
                <label className="text-[11px] text-muted-foreground block mb-1">Effective Date</label>
                <input
                  type="date"
                  min={tomorrowStr()}
                  value={newSchedDate}
                  onChange={(e) => setNewSchedDate(e.target.value)}
                  className="input-soft text-xs"
                />
              </div>
              <button
                type="button"
                disabled={!newSchedPrice || !newSchedDate}
                onClick={handleAddScheduledPrice}
                className="btn-outline text-xs h-9 px-3"
              >
                Schedule
              </button>
            </div>
          </div>
        )}
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

function MenuCsvImportModal({ menuItems, menuCategories, onClose, onImport }) {
  const [parsedRows, setParsedRows] = useState([]);
  const [errorHeader, setErrorHeader] = useState("");

  const downloadTemplate = () => {
    const csvContent =
      "name,category,price,fasting,meal_period,availability\n" +
      "Gomen Besiga,Main Dishes,420,Non-fasting,All day,Available\n" +
      "Atkilt Wot,Main Dishes,280,Fasting,All day,Available\n" +
      "Habesha Special Coffee,Coffee,75,Fasting,All day,Available\n";
    downloadCsv("menu_items_template.csv", csvContent);
  };

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setErrorHeader("");
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || "");
      const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      if (lines.length < 2) {
        setErrorHeader("CSV must contain a header row and at least one data row.");
        setParsedRows([]);
        return;
      }
      const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
      const nameIdx = headers.indexOf("name");
      const priceIdx = headers.indexOf("price");
      const catIdx = headers.indexOf("category");
      const fastingIdx = headers.indexOf("fasting");
      const mealIdx = headers.indexOf("meal_period");
      const availIdx = headers.indexOf("availability");

      if (nameIdx === -1 || priceIdx === -1) {
        setErrorHeader("Missing required header columns: 'name' and 'price' are required.");
        setParsedRows([]);
        return;
      }

      const rows = [];
      const seenNames = new Set(menuItems.map((m) => m.name.toLowerCase()));

      lines.slice(1).forEach((line, i) => {
        const lineNum = i + 2;
        const cells = line.split(",").map((c) => c.trim());
        const name = cells[nameIdx] || "";
        const priceStr = cells[priceIdx] || "";
        const price = Number(priceStr);
        const category = (catIdx >= 0 && cells[catIdx]) || menuCategories[0]?.name || "Main Dishes";
        const fasting = (fastingIdx >= 0 && cells[fastingIdx]) || "Non-fasting";
        const mealPeriod = (mealIdx >= 0 && cells[mealIdx]) || "All day";
        const availability = (availIdx >= 0 && cells[availIdx]) || "Available";

        let error = "";
        if (!name) error = "Missing name";
        else if (seenNames.has(name.toLowerCase())) error = "Duplicate item name";
        else if (!priceStr || !Number.isFinite(price) || price <= 0) error = `Invalid price (${priceStr || "empty"})`;

        if (!error) {
          seenNames.add(name.toLowerCase());
        }

        rows.push({
          lineNum,
          name,
          category,
          price: Number.isFinite(price) ? price : 0,
          fasting,
          mealPeriod,
          availability,
          error,
        });
      });

      setParsedRows(rows);
    };
    reader.readAsText(f);
  };

  const validRows = parsedRows.filter((r) => !r.error);

  return (
    <Modal
      title="Import Menu Items CSV"
      description="Upload a CSV file to add multiple items at once (PRD 23.9)."
      size="lg"
      onClose={onClose}
      onSubmit={(e) => {
        e.preventDefault();
        if (!validRows.length) return;
        onImport(validRows);
      }}
      footer={
        <>
          <button type="button" onClick={onClose} className="btn-outline">Cancel</button>
          <button type="submit" disabled={!validRows.length} className="btn-primary">
            Import {validRows.length} valid item{validRows.length === 1 ? "" : "s"}
          </button>
        </>
      }
    >
      <div className="space-y-4 text-xs">
        <div className="flex items-center justify-between rounded-xl border border-border bg-secondary/30 p-3">
          <div>
            <p className="font-semibold text-foreground text-sm">Need the CSV format?</p>
            <p className="text-muted-foreground text-xs">Download our standardized template with sample items.</p>
          </div>
          <button
            type="button"
            onClick={downloadTemplate}
            className="btn-outline text-xs whitespace-nowrap"
          >
            <Download className="h-3.5 w-3.5 mr-1 inline" /> Download template
          </button>
        </div>

        <div>
          <label className="mb-1 block font-medium text-foreground">Select CSV File</label>
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={handleFileChange}
            className="input-soft file:mr-3 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-primary-foreground hover:file:cursor-pointer"
          />
        </div>

        {errorHeader && (
          <div className="rounded-lg bg-berbere-100 p-2.5 text-berbere-700 font-medium">
            {errorHeader}
          </div>
        )}

        {parsedRows.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-foreground">
                Preview & Validation ({validRows.length} valid, {parsedRows.length - validRows.length} errors)
              </span>
            </div>
            <div className="max-h-60 overflow-auto rounded-lg border border-border">
              <table className="w-full text-left text-xs">
                <thead className="bg-secondary/60 text-muted-foreground sticky top-0">
                  <tr>
                    <th className="p-2">Line</th>
                    <th className="p-2">Name</th>
                    <th className="p-2">Category</th>
                    <th className="p-2">Price</th>
                    <th className="p-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {parsedRows.map((r) => (
                    <tr key={r.lineNum} className={r.error ? "bg-berbere-50/50" : ""}>
                      <td className="p-2 font-mono text-muted-foreground">#{r.lineNum}</td>
                      <td className="p-2 font-medium">{r.name || "—"}</td>
                      <td className="p-2 text-muted-foreground">{r.category}</td>
                      <td className="p-2">{r.price ? `${etb(r.price)} ETB` : "—"}</td>
                      <td className="p-2">
                        {r.error ? (
                          <span className="text-berbere-600 font-semibold">{r.error}</span>
                        ) : (
                          <span className="text-sage-600 font-semibold">Ready to import</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}