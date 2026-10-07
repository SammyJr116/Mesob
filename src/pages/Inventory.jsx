import React, { useMemo, useState } from "react";
import { Plus, Boxes, ArrowDownUp, ClipboardCheck, Trash2, AlertTriangle, Upload, Download } from "lucide-react";
import { PageHeader, SearchInput, StatCard, EmptyState } from "@/components/ui/shared";
import Modal from "@/components/ui/Modal";
import DataTable from "@/components/ui/DataTable";
import { useData } from "@/lib/DataContext";
import { useRole } from "@/lib/RoleContext";
import { notifySuccess } from "@/lib/notify";
import { businessDate, nextId, stamp } from "@/lib/datetime";
import { cn, downloadCsv } from "@/lib/utils";

export default function Inventory() {
  const { db, updateItem, insertItem } = useData();
  const { role } = useRole();
  const { inventoryItems, stockMovements, restaurant, managedLists } = db;
  /* Kitchen reaches this screen to see what is in stock, but only Inventory
     Staff and the Manager change quantities. */
  const canEdit = role !== "kitchen";
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All");
  const [tab, setTab] = useState("items");
  const [showOp, setShowOp] = useState(null);
  const [adding, setAdding] = useState(false);
  const [showCsvImport, setShowCsvImport] = useState(false);

  const filtered = useMemo(() => {
    const needle = q.toLowerCase();
    return inventoryItems.filter((i) => {
      const okQ = !needle || i.name.toLowerCase().includes(needle);
      const okCat = cat === "All" || i.category === cat;
      return okQ && okCat;
    });
  }, [inventoryItems, q, cat]);
  const lowCount = inventoryItems.filter((i) => i.status === "Low").length;

  const statusFor = (qty, min) => (qty <= min ? "Low" : "OK");

  const recordMovement = (item, delta, type, reason) => {
    const next = item.qty + delta;
    updateItem("inventoryItems", item.id, { qty: next, status: statusFor(next, item.min) });
    insertItem("stockMovements", {
      id: `SM${Date.now()}`,
      item: item.name,
      qty: delta,
      type,
      date: businessDate(),
      user: role === "inventory" ? "Inventory" : "Manager",
      reason,
    });
    if (statusFor(next, item.min) === "Low" && item.status !== "Low") {
      insertItem("notifications", {
        id: `N${Date.now()}`,
        event: "Low stock",
        detail: `${item.name} below minimum (${next.toLocaleString()} ${item.baseUnit})`,
        time: new Date().toTimeString().slice(0, 5),
        read: false,
        sound: false,
      });
    }
  };

  const count = (item, counted) => {
    const delta = counted - item.qty;
    const variance = item.qty === 0 ? 0 : Math.abs((delta / item.qty) * 100);
    recordMovement(item, delta, "Adjustment", "Stock count");
    insertItem("activityLog", {
      id: nextId(db.activityLog, "L", 10),
      who: role || "inventory",
      when: stamp(),
      action: "Stock count",
      target: item.name,
      old: `${item.qty} ${item.baseUnit}`,
      new: `${counted} ${item.baseUnit}`,
      reason: variance > restaurant.varianceThreshold ? `Variance ${variance.toFixed(1)}%` : "",
    });
  };

  /** @type {import("@/components/ui/DataTable").DataTableColumn[]} */
  const itemColumns = [
    { key: "name", header: "Item", sortable: true, render: (i) => <span className="font-medium">{i.name}</span> },
    { key: "category", header: "Category", sortable: true, render: (i) => <span className="text-muted-foreground">{i.category}</span> },
    { key: "baseUnit", header: "Unit", sortable: true, render: (i) => <span className="text-muted-foreground">{i.baseUnit}</span> },
    { key: "qty", header: "In stock", align: "right", sortable: true, render: (i) => i.qty.toLocaleString() },
    { key: "min", header: "Minimum", align: "right", sortable: true, render: (i) => <span className="text-muted-foreground">{i.min.toLocaleString()}</span> },
    { key: "reorder", header: "Reorder at", align: "right", sortable: true, render: (i) => <span className="text-muted-foreground">{(i.reorder || 0).toLocaleString()}</span> },
    { key: "supplier", header: "Supplier", sortable: true, render: (i) => <span className="text-muted-foreground">{i.supplier}</span> },
    { key: "status", header: "Status", sortable: true, render: (i) => (
      <span className={i.status === "Low" ? "font-medium text-berbere-600" : "text-sage-600"}>{i.status}</span>
    ) },
  ];

  const movementColumns = [
    { key: "item", header: "Item", sortable: true, render: (m) => <span className="font-medium">{m.item}</span> },
    { key: "type", header: "Type", sortable: true, render: (m) => <span className="text-muted-foreground">{m.type}</span> },
    { key: "qty", header: "Change", align: /** @type {"right"} */ ("right"), sortable: true, render: (m) => (
      <span className={cn("font-semibold", m.qty > 0 ? "text-sage-600" : "text-berbere-600")}>{m.qty > 0 ? "+" : ""}{m.qty.toLocaleString()}</span>
    ) },
    { key: "reason", header: "Reason", sortable: true, render: (m) => <span className="text-muted-foreground">{m.reason}</span> },
    { key: "user", header: "By", sortable: true, render: (m) => <span className="text-muted-foreground">{m.user}</span> },
    { key: "date", header: "When", sortable: true, render: (m) => <span className="text-muted-foreground">{m.date}</span> },
  ];

  return (
    <div>
      <PageHeader
        title="ዕቃ ግምጃ ቤት · Inventory"
        subtitle={
          canEdit
            ? `Tracking is ${restaurant.inventoryTracking ? "ON — recipe-based deduction active" : "OFF — recipes optional, no auto deduction"}. Quantities in base unit.`
            : "Read-only. You can see what is in stock and every movement, but Inventory Staff record the counts."
        }
        actions={
          canEdit ? (
            <>
              <button onClick={() => setShowCsvImport(true)} className="btn-outline"><Upload className="h-4 w-4" /> Import CSV</button>
              <button onClick={() => setShowOp("count")} className="btn-outline"><ClipboardCheck className="h-4 w-4" /> Stock count</button>
              <button onClick={() => setShowOp("adjust")} className="btn-outline"><ArrowDownUp className="h-4 w-4" /> Adjust</button>
              <button onClick={() => setShowOp("waste")} className="btn-outline"><Trash2 className="h-4 w-4" /> Waste</button>
              <button onClick={() => setAdding(true)} className="btn-primary"><Plus className="h-4 w-4" /> New item</button>
            </>
          ) : null
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total items" value={inventoryItems.length} icon={Boxes} tone="gold" />
        <StatCard label="Low stock" value={lowCount} icon={AlertTriangle} tone="berbere" />
        <StatCard label="Movements (today)" value={stockMovements.length} icon={ArrowDownUp} tone="terracotta" />
        <StatCard label="Tracking" value={restaurant.inventoryTracking ? "On" : "Off"} icon={Boxes} tone="sage" />
      </div>

      <div className="mb-4 flex gap-2 border-b border-border" role="tablist" aria-label="Inventory views">
        {["items", "movements"].map((t) => (
          <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={cn("border-b-2 px-3 py-2 text-sm font-medium capitalize transition-colors", tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground")}>{t}</button>
        ))}
      </div>

      {tab === "items" ? (
        <>
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="flex-1"><SearchInput value={q} onChange={setQ} placeholder="Search items..." /></div>
            <label htmlFor="inv-cat" className="sr-only">Filter by category</label>
            <select id="inv-cat" value={cat} onChange={(e) => setCat(e.target.value)} className="input-soft w-auto">
              <option>All</option>
              {managedLists.inventoryCategories.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          {inventoryItems.length === 0 ? (
            <EmptyState
              title="No inventory items yet"
              description={canEdit ? "Add the ingredients the kitchen actually buys and uses." : "Nothing has been stocked yet. Inventory Staff add the items."}
              icon={Boxes}
              action={canEdit ? <button onClick={() => setAdding(true)} className="btn-primary text-sm"><Plus className="h-4 w-4" /> New item</button> : null}
            />
          ) : (
            <DataTable
              caption="Inventory items with category, base unit, stock, minimum and status"
              initialSort={{ key: "name", dir: "asc" }}
              columns={itemColumns}
              rows={filtered}
              rowKey={(i) => i.id}
              pageSize={12}
              empty="No items match this search or category."
            />
          )}
        </>
      ) : (
        <div>
          <p className="mb-3 text-xs text-muted-foreground">Movements are immutable: nothing here is edited or deleted, and each one explains itself.</p>
          <DataTable
            caption="Stock movements by item, type, change and reason"
            initialSort={{ key: "id", dir: "desc" }}
            columns={movementColumns}
            rows={stockMovements}
            rowKey={(m) => m.id}
            pageSize={12}
            empty="No movements yet. Counts, adjustments and waste are logged here."
          />
        </div>
      )}

      {canEdit && showOp && (
        <OpModal op={showOp} items={inventoryItems} wasteReasons={managedLists.wasteReasons} varianceThreshold={restaurant.varianceThreshold}
          onClose={() => setShowOp(null)}
          onSubmit={(item, payload) => {
            if (showOp === "count") count(item, payload.counted);
            else if (showOp === "adjust") recordMovement(item, payload.delta, "Adjustment", payload.reason);
            else recordMovement(item, -payload.qty, "Waste", payload.reason);
            setShowOp(null);
            notifySuccess(`${titles(showOp)} recorded for ${item.name}`);
          }} />
      )}

      {canEdit && adding && (
        <NewItemModal categories={managedLists.inventoryCategories} suppliers={db.suppliers} existing={inventoryItems}
          onClose={() => setAdding(false)}
          onCreate={(draft) => {
            const id = nextId(inventoryItems, "I", 2);
            insertItem("inventoryItems", { id, status: "OK", ...draft });
            setAdding(false);
            notifySuccess(`${draft.name} added`);
          }} />
      )}
      {showCsvImport && (
        <InventoryCsvImportModal
          inventoryItems={inventoryItems}
          categories={managedLists.inventoryCategories}
          suppliers={db.suppliers}
          onClose={() => setShowCsvImport(false)}
          onImport={(itemsToImport) => {
            itemsToImport.forEach((it) => {
              const id = nextId(inventoryItems, "I", 2);
              insertItem("inventoryItems", {
                id,
                name: it.name,
                category: it.category,
                baseUnit: it.baseUnit,
                qty: it.qty,
                min: it.min,
                reorder: it.reorder,
                supplier: it.supplier,
                status: statusFor(it.qty, it.min),
              });
            });
            notifySuccess(`Imported ${itemsToImport.length} inventory items`);
            setShowCsvImport(false);
          }}
        />
      )}
    </div>
  );
}

function titles(op) {
  return { count: "Stock count", adjust: "Adjust stock", waste: "Record waste" }[op];
}

function OpModal({ op, items, wasteReasons, varianceThreshold, onClose, onSubmit }) {
  const [itemId, setItemId] = useState(items[0]?.id || "");
  const item = items.find((i) => i.id === itemId);
  const [counted, setCounted] = useState("");
  const [adjustQty, setAdjustQty] = useState("");
  const [wasteQty, setWasteQty] = useState("");
  const [reason, setReason] = useState("");
  const [wasteReason, setWasteReason] = useState(wasteReasons[0]);

  const countedN = Number(counted);
  const adjustN = Number(adjustQty);
  const wasteN = Number(wasteQty);
  const variance = item && countedN > 0 ? (Math.abs((countedN - item.qty) / (item.qty || 1)) * 100) : 0;

  const valid = item && (
    op === "count" ? Number.isFinite(countedN) && countedN >= 0 :
      op === "adjust" ? Number.isFinite(adjustN) && adjustN >= 0 && reason.trim() :
        Number.isFinite(wasteN) && wasteN > 0 && wasteN <= item.qty
  );

  return (
    <Modal
      title={titles(op)}
      description={op === "count" ? "Enter the counted quantity. Variances over the threshold are flagged in the activity log." : op === "adjust" ? "A reason is required so the movement is explainable later." : "Waste is always a deduction and always keeps its reason."}
      onClose={onClose}
      onSubmit={(e) => {
        e.preventDefault();
        if (!valid) return;
        onSubmit(
          item,
          op === "count"
            ? { counted: countedN }
            : op === "adjust"
              ? { delta: adjustN - item.qty, reason: reason.trim() }
              : { qty: wasteN, reason: wasteReason }
        );
      }}
      footer={
        <>
          <button type="button" onClick={onClose} className="btn-outline flex-1">Back</button>
          <button
            type="submit"
            disabled={!valid}
            className="btn-primary flex-1"
          >Confirm</button>
        </>
      }>
      <label htmlFor="op-item" className="mb-1 block text-sm font-medium">Item</label>
      <select id="op-item" value={itemId} onChange={(e) => setItemId(e.target.value)} className="input-soft mb-3">
        {items.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
      </select>

      {op === "count" && <>
        <label htmlFor="op-counted" className="mb-1 block text-sm font-medium">Counted quantity ({item?.baseUnit})</label>
        <input id="op-counted" type="number" min="0" value={counted} onChange={(e) => setCounted(e.target.value)} className="input-soft mb-1" />
        <p className="text-xs text-muted-foreground">
          Expected {item ? item.qty.toLocaleString() : 0} {item?.baseUnit}
          {variance > 0 && <> · Variance {variance.toFixed(1)}%{variance > varianceThreshold ? " (flagged)" : ""}</>}
        </p>
      </>}
      {op === "adjust" && <>
        <label htmlFor="op-adjust" className="mb-1 block text-sm font-medium">New quantity ({item?.baseUnit})</label>
        <input id="op-adjust" type="number" min="0" value={adjustQty} onChange={(e) => setAdjustQty(e.target.value)} className="input-soft mb-3" />
        <label htmlFor="op-reason" className="mb-1 block text-sm font-medium">Reason (required)</label>
        <input id="op-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Spillage" className="input-soft" />
      </>}
      {op === "waste" && <>
        <label htmlFor="op-waste" className="mb-1 block text-sm font-medium">Quantity ({item?.baseUnit})</label>
        <input id="op-waste" type="number" min="0" max={item?.qty} value={wasteQty} onChange={(e) => setWasteQty(e.target.value)} className="input-soft mb-1" />
        {wasteN > (item?.qty || 0) && <p role="alert" className="mb-1 text-xs text-berbere-600">More than is in stock.</p>}
        <label htmlFor="op-wastereason" className="mb-1 block text-sm font-medium">Reason</label>
        <select id="op-wastereason" value={wasteReason} onChange={(e) => setWasteReason(e.target.value)} className="input-soft">
          {wasteReasons.map((r) => <option key={r}>{r}</option>)}
        </select>
      </>}
    </Modal>
  );
}

function NewItemModal({ categories, suppliers, existing, onClose, onCreate }) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState(categories[0]);
  const [baseUnit, setBaseUnit] = useState("g");
  const [qty, setQty] = useState("");
  const [min, setMin] = useState("");
  const [reorder, setReorder] = useState("");
  const [supplier, setSupplier] = useState(suppliers[0]?.name || "");
  const dup = existing.some((i) => i.name.toLowerCase() === name.trim().toLowerCase());
  const q = Number(qty), m = Number(min), r = Number(reorder);
  const valid = name.trim() && !dup && q >= 0 && m >= 0 && r > m;
  return (
    <Modal
      title="New inventory item"
      description="Tracked items need a minimum and a reorder point so low stock can be raised."
      onClose={onClose}
      onSubmit={(e) => {
        e.preventDefault();
        if (!valid) return;
        onCreate({ name: name.trim(), category, baseUnit, qty: q, min: m, reorder: r, supplier });
      }}
      footer={
        <>
          <button type="button" onClick={onClose} className="btn-outline flex-1">Back</button>
          <button type="submit" disabled={!valid} className="btn-primary flex-1">Add</button>
        </>
      }>
      <label htmlFor="ni-name" className="mb-1 block text-sm font-medium">Item name</label>
      <input id="ni-name" value={name} onChange={(e) => setName(e.target.value)} aria-invalid={dup} className="input-soft mb-1" />
      <p role={dup ? "alert" : undefined} className="mb-3 min-h-[1rem] text-xs text-berbere-600">{dup ? "That item already exists." : ""}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label htmlFor="ni-cat" className="block">
          <span className="mb-1 block text-sm font-medium">Category</span>
          <select id="ni-cat" value={category} onChange={(e) => setCategory(e.target.value)} className="input-soft">
            {categories.map((c) => <option key={c}>{c}</option>)}
          </select>
        </label>
        <label htmlFor="ni-unit" className="block">
          <span className="mb-1 block text-sm font-medium">Base unit</span>
          <select id="ni-unit" value={baseUnit} onChange={(e) => setBaseUnit(e.target.value)} className="input-soft">
            <option>g</option><option>ml</option><option>pieces</option><option>kg</option><option>l</option>
          </select>
        </label>
        <label htmlFor="ni-qty" className="block">
          <span className="mb-1 block text-sm font-medium">Opening qty</span>
          <input id="ni-qty" type="number" min="0" value={qty} onChange={(e) => setQty(e.target.value)} className="input-soft" />
        </label>
        <label htmlFor="ni-min" className="block">
          <span className="mb-1 block text-sm font-medium">Minimum</span>
          <input id="ni-min" type="number" min="0" value={min} onChange={(e) => setMin(e.target.value)} className="input-soft" />
        </label>
        <label htmlFor="ni-reorder" className="block">
          <span className="mb-1 block text-sm font-medium">Reorder at</span>
          <input id="ni-reorder" type="number" min="0" value={reorder} onChange={(e) => setReorder(e.target.value)} className="input-soft" />
        </label>
        <label htmlFor="ni-supplier" className="block">
          <span className="mb-1 block text-sm font-medium">Supplier</span>
          <select id="ni-supplier" value={supplier} onChange={(e) => setSupplier(e.target.value)} className="input-soft">
            {suppliers.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
          </select>
        </label>
      </div>
      <p className="mt-3 rounded-lg bg-secondary/60 px-3 py-2 text-xs text-muted-foreground">Reorder must be above Minimum.</p>
    </Modal>
  );
}

function InventoryCsvImportModal({ inventoryItems, categories, suppliers, onClose, onImport }) {
  const [parsedRows, setParsedRows] = useState([]);
  const [errorHeader, setErrorHeader] = useState("");

  const downloadTemplate = () => {
    const csvContent =
      "name,category,base_unit,qty,min,reorder,supplier\n" +
      "Teff Flour,Dry goods,kg,150,50,200,Merkato Veg\n" +
      "Cardamom,Spices,g,800,200,1000,Spice House\n" +
      "Refined Oil,Dry goods,l,60,20,80,Shola Dairy\n";
    downloadCsv("inventory_items_template.csv", csvContent);
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
      const catIdx = headers.indexOf("category");
      const unitIdx = headers.indexOf("base_unit");
      const qtyIdx = headers.indexOf("qty");
      const minIdx = headers.indexOf("min");
      const reorderIdx = headers.indexOf("reorder");
      const supIdx = headers.indexOf("supplier");

      if (nameIdx === -1 || qtyIdx === -1 || minIdx === -1) {
        setErrorHeader("Missing required header columns: 'name', 'qty', and 'min' are required.");
        setParsedRows([]);
        return;
      }

      const rows = [];
      const seenNames = new Set(inventoryItems.map((i) => i.name.toLowerCase()));

      lines.slice(1).forEach((line, i) => {
        const lineNum = i + 2;
        const cells = line.split(",").map((c) => c.trim());
        const name = cells[nameIdx] || "";
        const category = (catIdx >= 0 && cells[catIdx]) || categories[0] || "Dry goods";
        const baseUnit = (unitIdx >= 0 && cells[unitIdx]) || "g";
        const qtyStr = cells[qtyIdx] || "";
        const minStr = cells[minIdx] || "";
        const reorderStr = reorderIdx >= 0 ? cells[reorderIdx] : "";
        const supplier = (supIdx >= 0 && cells[supIdx]) || suppliers[0]?.name || "Unassigned";

        const qty = Number(qtyStr);
        const min = Number(minStr);
        const reorder = Number(reorderStr || min * 2);

        let error = "";
        if (!name) error = "Missing item name";
        else if (seenNames.has(name.toLowerCase())) error = "Duplicate item in inventory";
        else if (!qtyStr || !Number.isFinite(qty) || qty < 0) error = `Invalid qty (${qtyStr})`;
        else if (!minStr || !Number.isFinite(min) || min < 0) error = `Invalid min (${minStr})`;

        if (!error) {
          seenNames.add(name.toLowerCase());
        }

        rows.push({
          lineNum,
          name,
          category,
          baseUnit,
          qty: Number.isFinite(qty) ? qty : 0,
          min: Number.isFinite(min) ? min : 0,
          reorder: Number.isFinite(reorder) ? reorder : 0,
          supplier,
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
      title="Import Inventory Items CSV"
      description="Upload a CSV file to add inventory items and stock levels (PRD 23.9)."
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
            <p className="font-semibold text-foreground text-sm">Need the CSV template?</p>
            <p className="text-muted-foreground text-xs">Download our standardized template with columns &amp; sample entries.</p>
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
                    <th className="p-2">Unit</th>
                    <th className="p-2">Qty</th>
                    <th className="p-2">Min</th>
                    <th className="p-2">Supplier</th>
                    <th className="p-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {parsedRows.map((r) => (
                    <tr key={r.lineNum} className={r.error ? "bg-berbere-50/50" : ""}>
                      <td className="p-2 font-mono text-muted-foreground">#{r.lineNum}</td>
                      <td className="p-2 font-medium">{r.name || "—"}</td>
                      <td className="p-2 text-muted-foreground">{r.category}</td>
                      <td className="p-2">{r.baseUnit}</td>
                      <td className="p-2">{r.qty.toLocaleString()}</td>
                      <td className="p-2">{r.min.toLocaleString()}</td>
                      <td className="p-2 text-muted-foreground">{r.supplier}</td>
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
