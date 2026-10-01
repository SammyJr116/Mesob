import React, { useState } from "react";
import { Plus, Soup } from "lucide-react";
import { PageHeader, SearchInput, SectionCard, EmptyState } from "@/components/ui/shared";
import { menuItems, recipes, inventoryItems } from "@/lib/mockData";

export default function Recipes() {
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState(menuItems.find((m) => m.hasRecipe) || menuItems[0]);

  const items = menuItems.filter((m) => (!q || m.name.toLowerCase().includes(q.toLowerCase())) && m.hasRecipe);
  const recipe = recipes[selected?.id];

  return (
    <div>
      <PageHeader
        title="Recipes"
        subtitle="Manager and Kitchen can edit. Inventory Staff view only. Quantities use the item's base unit. Edits affect future deductions only."
        actions={<button className="btn-primary"><Plus className="h-4 w-4" /> New recipe</button>}
      />
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <div className="mb-3"><SearchInput value={q} onChange={setQ} placeholder="Search items…" /></div>
          <div className="space-y-1.5">
            {items.map((m) => (
              <button key={m.id} onClick={() => setSelected(m)} className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition-colors ${selected?.id === m.id ? "border-primary bg-primary/5" : "border-border hover:bg-secondary"}`}>
                <span className="font-medium">{m.name}</span>
                {m.hasRecipe ? <span className="text-xs text-emerald-600">✓</span> : <span className="text-xs text-amber-600">missing</span>}
              </button>
            ))}
          </div>
        </div>
        <div className="lg:col-span-2">
          {recipe ? (
            <SectionCard title={`Recipe — ${selected.name}`} action={<button className="btn-outline text-sm">Edit</button>}>
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
            <EmptyState icon={Soup} title="No recipe yet" description="While inventory tracking is off, recipes are optional. When on, this item cannot be activated without one." action={<button className="btn-primary"><Plus className="h-4 w-4" /> Create recipe</button>} />
          )}
        </div>
      </div>
    </div>
  );
}