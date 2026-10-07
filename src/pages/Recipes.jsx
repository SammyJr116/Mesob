import React, { useMemo, useState } from "react";
import { Plus, Soup } from "lucide-react";
import { PageHeader, SearchInput, SectionCard, EmptyState } from "@/components/ui/shared";
import Modal from "@/components/ui/Modal";
import { useData } from "@/lib/DataContext";
import { useRole } from "@/lib/RoleContext";
import { isPrivileged } from "@/lib/roles";
import { notifySuccess, notifyError } from "@/lib/notify";
import { cn } from "@/lib/utils";

export default function Recipes() {
  const { db, setCollection, updateItem } = useData();
  const { role } = useRole();
  const { menuItems, recipes, inventoryItems, restaurant } = db;
  const [q, setQ] = useState("");
  const [selectedId, setSelectedId] = useState(() => menuItems.find((m) => recipes[m.id])?.id || menuItems[0]?.id);
  const [showNew, setShowNew] = useState(false);

  const canEdit = isPrivileged(role) || role === "kitchen";
  const selected = menuItems.find((m) => m.id === selectedId);
  const recipe = recipes[selectedId];
  const items = useMemo(() => {
    const needle = q.toLowerCase();
    return menuItems.filter((m) => !needle || m.name.toLowerCase().includes(needle));
  }, [menuItems, q]);

  const saveRecipe = (instructions, lines) => {
    setCollection("recipes", (all) => ({ ...all, [selectedId]: { instructions, lines } }));
    // Keep the flag honest — the Recipes list reads hasRecipe directly.
    if (selected && !selected.hasRecipe) updateItem("menuItems", selected.id, { hasRecipe: true });
    notifySuccess(`Recipe saved for ${selected?.name || "item"}`);
  };

  return (
    <div>
      <PageHeader
        title="የምግብ አዘገጃጀት · Traditional Recipes"
        subtitle={`${restaurant.inventoryTracking ? "Inventory tracking is on: an item cannot be activated without a recipe." : "Inventory tracking is off: recipes are optional."} Quantities use the item's base unit. Edits affect future deductions only.`}
        actions={<button onClick={() => setShowNew(true)} className="btn-primary" disabled={!canEdit}><Plus className="h-4 w-4" /> New recipe</button>}
      />
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <div className="mb-3"><SearchInput value={q} onChange={setQ} placeholder="Search items…" /></div>
          <div className="space-y-1.5">
            {items.map((m) => (
              <button
                key={m.id}
                onClick={() => setSelectedId(m.id)}
                className={cn("flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition-colors", selectedId === m.id ? "border-primary bg-primary/5" : "border-border hover:bg-secondary")}
              >
                <span className="min-w-0 truncate font-medium">{m.name}</span>
                {recipes[m.id] ? (
                  <span className="ml-2 shrink-0 text-xs text-sage-600">has recipe</span>
                ) : (
                  <span className="ml-2 shrink-0 text-xs text-gold-600">missing</span>
                )}
              </button>
            ))}
          </div>
        </div>
        <div className="lg:col-span-2">
          {recipe ? (
            <SectionCard title={`Recipe — ${selected?.name}`} action={canEdit ? <button onClick={() => saveRecipe(recipe.instructions, recipe.lines)} className="btn-outline text-sm">Save</button> : <span className="text-xs text-muted-foreground">View only</span>}>
              {recipe.instructions && (
                <div className="mb-4 rounded-lg bg-secondary/50 p-3 text-sm">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Instructions</p>
                  <p>{recipe.instructions}</p>
                </div>
              )}
              <p className="mb-2 text-sm font-medium">Ingredient lines (base unit)</p>
              <div className="space-y-2">
                {recipe.lines.map((l, i) => {
                  const inv = inventoryItems.find((it) => it.name === l.item);
                  return (
                    <div key={i} className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2 text-sm">
                      <span className="font-medium">{l.item}</span>
                      <span className="text-muted-foreground">{l.qty.toLocaleString()} {inv?.baseUnit || "g"}</span>
                    </div>
                  );
                })}
              </div>
              <p className="mt-3 text-xs text-muted-foreground">Variants multiply every line by their recipe multiplier. Add-ons add their own ingredient lines.</p>
            </SectionCard>
          ) : (
            <EmptyState
              icon={Soup}
              title={`No recipe for ${selected?.name || "this item"}`}
              description={restaurant.inventoryTracking ? "Inventory tracking is on, so this item cannot be activated without a recipe." : "Recipes are optional while tracking is off."}
              action={canEdit ? <button onClick={() => setShowNew(true)} className="btn-primary"><Plus className="h-4 w-4" /> Create recipe</button> : null}
            />
          )}
        </div>
      </div>

      {showNew && (
        <Modal
          title={`Recipe for ${selected?.name || "item"}`}
          description="Ingredient lines pull their base unit from inventory. Quantity is per one serving of the base variant."
          onClose={() => setShowNew(false)}
          footer={null}
        >
          <RecipeForm
            stock={inventoryItems}
            onSubmit={(instructions, lines) => {
              if (!lines.length) {
                notifyError("Add at least one ingredient line");
                return;
              }
              saveRecipe(instructions, lines);
              setShowNew(false);
            }}
          />
        </Modal>
      )}
    </div>
  );
}

function RecipeForm({ stock, onSubmit }) {
  const [instructions, setInstructions] = useState("");
  const [lines, setLines] = useState([{ item: "", qty: "" }]);

  const setLine = (i, patch) => setLines((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        const clean = lines.filter((l) => l.item && Number(l.qty) > 0).map((l) => ({ item: l.item, qty: Number(l.qty) }));
        onSubmit(instructions.trim(), clean);
      }}
    >
      <div>
        <label htmlFor="rc-instructions" className="mb-1 block text-sm font-medium">Instructions</label>
        <textarea id="rc-instructions" value={instructions} onChange={(e) => setInstructions(e.target.value)} className="input-soft min-h-[70px]" />
      </div>

      <fieldset>
        <legend className="mb-1 text-sm font-medium">Ingredient lines</legend>
        <div className="space-y-2">
          {lines.map((l, i) => (
            <div key={i} className="flex items-center gap-2">
              <label htmlFor={`rc-item-${i}`} className="sr-only">Ingredient {i + 1}</label>
              <select id={`rc-item-${i}`} value={l.item} onChange={(e) => setLine(i, { item: e.target.value })} className="input-soft flex-1">
                <option value="">Select ingredient…</option>
                {stock.map((s) => <option key={s.id} value={s.name}>{s.name} ({s.baseUnit})</option>)}
              </select>
              <label htmlFor={`rc-qty-${i}`} className="sr-only">Quantity {i + 1}</label>
              <input id={`rc-qty-${i}`} type="number" min="0" value={l.qty} onChange={(e) => setLine(i, { qty: e.target.value })} className="input-soft w-24" placeholder="Qty" />
              <button type="button" onClick={() => setLines((ls) => ls.filter((_, idx) => idx !== i))} className="btn-ghost px-2 py-1 text-xs">Remove</button>
            </div>
          ))}
        </div>
        <button type="button" onClick={() => setLines((ls) => [...ls, { item: "", qty: "" }])} className="btn-outline mt-2 text-xs"><Plus className="h-3.5 w-3.5" /> Add line</button>
      </fieldset>

      <button type="submit" className="btn-primary w-full">Save recipe</button>
    </form>
  );
}