import React, { useMemo, useState } from "react";
import { Plus, Check, X, Eye, AlertTriangle } from "lucide-react";
import { PageHeader, StatusBadge, SearchInput, StatCard, EmptyState } from "@/components/ui/shared";
import Modal from "@/components/ui/Modal";
import { etb, round2 } from "@/lib/format";
import { useData } from "@/lib/DataContext";
import { useRole } from "@/lib/RoleContext";
import { isPrivileged } from "@/lib/roles";
import { notifySaved, notifySuccess } from "@/lib/notify";
import { stamp, nextId, businessDate } from "@/lib/datetime";

const STATUSES = ["All", "Draft", "Requested", "Approved", "Partially Received", "Received", "Completed", "Rejected", "Cancelled", "Closed", "Emergency - Received"];

export default function Purchases() {
  const { db, updateItem, insertItem } = useData();
  const { role } = useRole();
  const { purchases, suppliers, inventoryItems } = db;
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("All");
  const [rejecting, setRejecting] = useState(null);
  const [creating, setCreating] = useState(false);
  const [receiving, setReceiving] = useState(null);
  const isManager = isPrivileged(role);

  const view = useMemo(() => {
    const needle = q.toLowerCase();
    return {
      filtered: purchases.filter((p) => {
        const okQ = !needle || p.id.toLowerCase().includes(needle) || p.supplier.toLowerCase().includes(needle) || (p.item || "").toLowerCase().includes(needle);
        const okS = status === "All" || p.status === status;
        return okQ && okS;
      }),
      pending: purchases.filter((p) => p.status === "Requested").length,
      emergency: purchases.filter((p) => p.emergency && !p.reviewed).length,
      partial: purchases.filter((p) => p.status === "Partially Received").length,
    };
  }, [purchases, q, status]);
  const { filtered, pending, emergency, partial } = view;

  const log = (action, target, oldV, newV, reason) =>
    insertItem("activityLog", { id: `L${Date.now()}`, who: role || "manager", when: stamp(), action, target, old: String(oldV ?? ""), new: String(newV ?? ""), reason: reason || "" });

  const applyStockRestock = (itemToUpdate, qtyToAdd, poId) => {
    if (!itemToUpdate || !qtyToAdd || qtyToAdd <= 0) return "Unknown";
    const currentQty = Number(itemToUpdate.qty ?? itemToUpdate.currentStock ?? 0);
    const minQty = Number(itemToUpdate.min ?? itemToUpdate.minimumStock ?? 0);
    const nextQty = currentQty + qtyToAdd;
    const nextStatus = nextQty <= minQty ? "Low" : "OK";

    updateItem("inventoryItems", itemToUpdate.id, {
      qty: nextQty,
      status: nextStatus,
    });

    insertItem("stockMovements", {
      id: `SM${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      item: itemToUpdate.name,
      qty: qtyToAdd,
      type: "Purchase receipt",
      date: businessDate(),
      user: role === "inventory" ? "Inventory" : "Manager",
      reason: `Receipt ${poId || ""}`.trim(),
    });

    return nextStatus;
  };

  const approve = (p) => {
    updateItem("purchases", p.id, { status: "Approved" });
    log("Approved purchase", p.id, p.status, "Approved", "");
    notifySaved(`${p.id} approved`);
  };

  const reject = (p, reason) => {
    updateItem("purchases", p.id, { status: "Rejected", reason, total: 0 });
    log("Rejected purchase", p.id, p.status, "Rejected", reason);
    setRejecting(null);
    notifySuccess(`${p.id} rejected`);
  };

  const markReviewed = (p) => {
    updateItem("purchases", p.id, { reviewed: true });
    log("Reviewed emergency purchase", p.id, "Unreviewed", "Reviewed", "");
    notifySuccess(`${p.id} marked reviewed`);
  };

  const receive = (p) => {
    const lines = p.lineItems && p.lineItems.length > 0
      ? p.lineItems
      : (p.item ? [{ item: p.item, qty: p.qty, inventoryItemId: p.itemId }] : []);

    if (lines.length > 0) {
      let restockedItemName = "";
      let finalStatus = "";
      lines.forEach((l) => {
        const it = (inventoryItems || []).find(
          (i) => i.id === l.inventoryItemId || (i.name && l.item && i.name.toLowerCase() === l.item.toLowerCase())
        );
        if (it) {
          const qtyToAdd = Number(l.qty || l.orderedQuantity || p.qty || 0);
          finalStatus = applyStockRestock(it, qtyToAdd, p.id);
          restockedItemName = it.name;
        }
      });
      updateItem("purchases", p.id, { status: "Received", receivedDate: businessDate() });
      log("Received purchase", p.id, p.status, "Received", "");
      if (restockedItemName) {
        notifySuccess(`${p.id} received — ${restockedItemName} stock replenished (status: ${finalStatus})`);
      } else {
        notifySuccess(`${p.id} received`);
      }
    } else {
      const supplierItems = (inventoryItems || []).filter((i) => i.supplier === p.supplier);
      if (supplierItems.length === 1) {
        const it = supplierItems[0];
        const qtyToAdd = Number(p.qty || it.reorder || it.min || 10);
        const finalStatus = applyStockRestock(it, qtyToAdd, p.id);
        updateItem("purchases", p.id, { status: "Received", receivedDate: businessDate(), item: it.name, qty: qtyToAdd });
        log("Received purchase", p.id, p.status, "Received", "");
        notifySuccess(`${p.id} received — ${it.name} stock replenished (status: ${finalStatus})`);
      } else {
        setReceiving(p);
      }
    }
  };

  return (
    <div>
      <PageHeader
        title="ግዢዎች · Purchases & Sourcing"
        subtitle="Manager approves every request — no auto-approval. Emergency purchases add stock immediately and are flagged for review."
        actions={<button onClick={() => setCreating(true)} className="btn-primary"><Plus className="h-4 w-4" /> New request</button>}
      />
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total" value={purchases.length} />
        <StatCard label="Awaiting approval" value={pending} tone="terracotta" />
        <StatCard label="Emergency review" value={emergency} tone="berbere" />
        <StatCard label="Partially received" value={partial} tone="gold" />
      </div>
      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <div className="flex-1"><SearchInput value={q} onChange={setQ} placeholder="Search PO no., supplier, or item…" /></div>
        <select aria-label="Filter by status" value={status} onChange={(e) => setStatus(e.target.value)} className="input-soft w-auto">{STATUSES.map((s) => <option key={s}>{s}</option>)}</select>
      </div>
      <div className="card-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <caption className="sr-only">Purchase orders</caption>
            <thead className="bg-secondary/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th scope="col" className="px-4 py-3 font-medium">PO</th>
                <th scope="col" className="px-4 py-3 font-medium">Supplier</th>
                <th scope="col" className="px-4 py-3 font-medium">Item / Lines</th>
                <th scope="col" className="px-4 py-3 font-medium">Date</th>
                <th scope="col" className="px-4 py-3 text-right font-medium">Total (ETB)</th>
                <th scope="col" className="px-4 py-3 font-medium">Status</th>
                <th scope="col" className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((p) => (
                <tr key={p.id} className="hover:bg-secondary/40">
                  <td className="px-4 py-3 font-medium">
                    {p.id}
                    {p.emergency && <AlertTriangle aria-label="Emergency purchase" className="ml-1 inline h-3.5 w-3.5 text-berbere-500" />}
                  </td>
                  <td className="px-4 py-3">{p.supplier}</td>
                  <td className="px-4 py-3">
                    {p.item ? (
                      <span className="font-medium text-foreground">
                        {p.item} <span className="text-xs text-muted-foreground font-normal">({Number(p.qty || 0).toLocaleString()})</span>
                      </span>
                    ) : (
                      <span className="text-muted-foreground">{Array.isArray(p.lines) ? p.lines.length : (p.lines ?? 1)} line(s)</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{p.date}</td>
                  <td className="px-4 py-3 text-right font-medium">{etb(p.total)}</td>
                  <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {p.status === "Requested" && isManager && <>
                        <button onClick={() => approve(p)} aria-label={`Approve ${p.id}`} className="rounded-md bg-sage-100 p-1.5 text-sage-700 hover:bg-sage-200"><Check className="h-4 w-4" /></button>
                        <button onClick={() => setRejecting(p)} aria-label={`Reject ${p.id}`} className="rounded-md bg-berbere-100 p-1.5 text-berbere-600 hover:bg-berbere-200"><X className="h-4 w-4" /></button>
                      </>}
                      {p.emergency && !p.reviewed && isManager && <button onClick={() => markReviewed(p)} aria-label={`Mark ${p.id} reviewed`} className="rounded-md bg-gold-100 p-1.5 text-gold-600 hover:bg-gold-200"><Eye className="h-4 w-4" /></button>}
                      {p.status === "Approved" && <button onClick={() => receive(p)} className="btn-outline px-2 py-1 text-xs">Receive</button>}
                      {!isManager && p.status === "Requested" && <span className="text-xs text-muted-foreground">Awaiting Manager</span>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="p-6">
            <EmptyState title="No purchase orders match" description="Try a different search term or status filter." icon={AlertTriangle} />
          </div>
        )}
      </div>
      <p className="mt-4 text-xs text-muted-foreground">A purchase does not create an expense. Reports show purchases, expenses and maintenance costs side by side — never combined.</p>

      {rejecting && (
        <ReasonModal po={rejecting} onClose={() => setRejecting(null)} onConfirm={(reason) => reject(rejecting, reason)} />
      )}
      {creating && (
        <NewRequestModal
          suppliers={suppliers}
          inventoryItems={inventoryItems}
          existing={purchases}
          onClose={() => setCreating(false)}
          onCreate={(draft) => {
            const id = nextId(purchases, "PO-", 4);
            const status = draft.emergency ? "Emergency - Received" : "Requested";
            insertItem("purchases", {
              id,
              date: businessDate(),
              status,
              emergency: draft.emergency,
              reviewed: false,
              ...draft,
              lines: 1,
              lineItems: draft.item ? [{ item: draft.item, inventoryItemId: draft.itemId, qty: draft.qty, unitPrice: round2(draft.total / (draft.qty || 1)), lineTotal: draft.total }] : [],
            });

            if (draft.emergency && draft.itemId) {
              const it = (inventoryItems || []).find((i) => i.id === draft.itemId || i.name === draft.item);
              if (it) {
                applyStockRestock(it, draft.qty, id);
              }
            }

            log("Created purchase request", id, "", status, draft.emergency ? "Emergency restock" : "");
            setCreating(false);
            if (draft.emergency) {
              notifySuccess(`${id} recorded — ${draft.item} restocked immediately!`);
            } else {
              notifySuccess(`${id} submitted for approval`);
            }
          }}
        />
      )}
      {receiving && (
        <ReceiveModal
          po={receiving}
          inventoryItems={inventoryItems}
          onClose={() => setReceiving(null)}
          onConfirm={(it, qtyDelivered) => {
            const finalStatus = applyStockRestock(it, qtyDelivered, receiving.id);
            updateItem("purchases", receiving.id, {
              status: "Received",
              receivedDate: businessDate(),
              item: it.name,
              qty: qtyDelivered,
            });
            log("Received purchase", receiving.id, receiving.status, "Received", "");
            setReceiving(null);
            notifySuccess(`${receiving.id} received — ${it.name} stock updated (status: ${finalStatus})`);
          }}
        />
      )}
    </div>
  );
}

function ReasonModal({ po, onClose, onConfirm }) {
  const [reason, setReason] = useState("");
  return (
    <Modal
      title={`Reject ${po.id}`}
      description="A rejected order keeps its record and cannot be reopened. Reason required."
      onClose={onClose}
      size="sm"
      onSubmit={(e) => {
        e.preventDefault();
        if (!reason.trim()) return;
        onConfirm(reason.trim());
      }}
      footer={
        <>
          <button type="button" onClick={onClose} className="btn-outline flex-1">Back</button>
          <button type="submit" disabled={!reason.trim()} className="btn-destructive flex-1">Reject</button>
        </>
      }>
      <label htmlFor="po-reject-reason" className="text-sm font-medium">Reason (required)</label>
      <input id="po-reject-reason" value={reason} onChange={(e) => setReason(e.target.value)} className="input-soft mt-1" />
    </Modal>
  );
}

function ReceiveModal({ po, inventoryItems, onClose, onConfirm }) {
  const [selectedItemId, setSelectedItemId] = useState(() => {
    const matching = (inventoryItems || []).find((i) => i.supplier === po.supplier);
    return matching?.id || inventoryItems?.[0]?.id || "";
  });
  const selectedItem = (inventoryItems || []).find((i) => i.id === selectedItemId);
  const [qty, setQty] = useState(() => selectedItem?.reorder || selectedItem?.min || 10);
  const qtyN = Number(qty);
  const valid = selectedItem && Number.isFinite(qtyN) && qtyN > 0;

  const current = Number(selectedItem?.qty || 0);
  const min = Number(selectedItem?.min || 0);
  const nextStock = current + qtyN;
  const willBeOk = nextStock > min;

  return (
    <Modal
      title={`Receive Delivery for ${po.id}`}
      description="Select the item delivered to restock warehouse inventory and update its status."
      onClose={onClose}
      size="sm"
      onSubmit={(e) => {
        e.preventDefault();
        if (!valid) return;
        onConfirm(selectedItem, qtyN);
      }}
      footer={
        <>
          <button type="button" onClick={onClose} className="btn-outline flex-1">Back</button>
          <button type="submit" disabled={!valid} className="btn-primary flex-1">Receive & Update Stock</button>
        </>
      }
    >
      <div className="space-y-3">
        <div>
          <label htmlFor="rec-item" className="mb-1 block text-sm font-medium">Delivered item</label>
          <select
            id="rec-item"
            value={selectedItemId}
            onChange={(e) => {
              setSelectedItemId(e.target.value);
              const it = (inventoryItems || []).find((i) => i.id === e.target.value);
              if (it) setQty(it.reorder || it.min || 10);
            }}
            className="input-soft"
          >
            {(inventoryItems || []).map((it) => (
              <option key={it.id} value={it.id}>
                {it.name} ({it.status === "Low" ? "Low Stock: " : ""}{it.qty} / Min: {it.min} {it.baseUnit})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="rec-qty" className="mb-1 block text-sm font-medium">Quantity received ({selectedItem?.baseUnit || "unit"})</label>
          <input
            id="rec-qty"
            type="number"
            min="1"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            className="input-soft"
          />
        </div>

        {selectedItem && (
          <div className="rounded-lg bg-secondary/60 p-3 text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Current Stock:</span>
              <span>{current.toLocaleString()} {selectedItem.baseUnit}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">New Stock after receipt:</span>
              <span className="font-semibold">{nextStock.toLocaleString()} {selectedItem.baseUnit}</span>
            </div>
            <div className="flex justify-between border-t border-border pt-1 font-medium">
              <span>Status after receipt:</span>
              <span className={willBeOk ? "text-sage-600 font-bold" : "text-berbere-600 font-bold"}>
                {willBeOk ? "OK (Healthy)" : "Still Low (below min)"}
              </span>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

function NewRequestModal({ suppliers, inventoryItems, existing, onClose, onCreate }) {
  const lowItems = (inventoryItems || []).filter((i) => i.status === "Low");
  const defaultItem = lowItems[0] || inventoryItems?.[0];

  const [selectedItemId, setSelectedItemId] = useState(defaultItem?.id || "");
  const selectedItem = (inventoryItems || []).find((i) => i.id === selectedItemId);

  const [supplier, setSupplier] = useState(() => selectedItem?.supplier || suppliers[0]?.name || "");
  const [qty, setQty] = useState(() => selectedItem?.reorder || selectedItem?.min || 10);
  const [amount, setAmount] = useState(() => {
    const qN = selectedItem?.reorder || selectedItem?.min || 10;
    return String(round2(qN * (selectedItem?.cost || 50)));
  });
  const [isEmergency, setIsEmergency] = useState(false);

  const qtyN = Number(qty);
  const total = Number(amount);
  const valid = supplier && Number.isFinite(total) && total > 0 && Number.isFinite(qtyN) && qtyN > 0;

  const handleItemChange = (itemId) => {
    setSelectedItemId(itemId);
    const it = (inventoryItems || []).find((i) => i.id === itemId);
    if (it) {
      if (it.supplier) setSupplier(it.supplier);
      const recommendedQty = it.reorder || it.min || 10;
      setQty(recommendedQty);
      setAmount(String(round2(recommendedQty * (it.cost || 50))));
    }
  };

  const current = Number(selectedItem?.qty || 0);
  const min = Number(selectedItem?.min || 0);
  const nextStock = current + qtyN;
  const willBeOk = nextStock > min;

  return (
    <Modal
      title="New purchase request"
      description="Create a purchase request for an inventory item. Emergency restock adds stock immediately."
      onClose={onClose}
      size="sm"
      onSubmit={(e) => {
        e.preventDefault();
        if (!valid) return;
        onCreate({
          supplier,
          total: round2(total),
          lines: 1,
          item: selectedItem?.name || "General Goods",
          itemId: selectedItem?.id || null,
          qty: qtyN,
          emergency: isEmergency,
        });
      }}
      footer={
        <>
          <button type="button" onClick={onClose} className="btn-outline flex-1">Back</button>
          <button type="submit" disabled={!valid} className="btn-primary flex-1">
            {isEmergency ? "Emergency Restock Now" : "Submit Request"}
          </button>
        </>
      }>
      <div className="space-y-3">
        <div>
          <label htmlFor="po-item" className="mb-1 block text-sm font-medium">Inventory item to purchase</label>
          <select
            id="po-item"
            value={selectedItemId}
            onChange={(e) => handleItemChange(e.target.value)}
            className="input-soft"
          >
            {(inventoryItems || []).map((it) => (
              <option key={it.id} value={it.id}>
                {it.name} {it.status === "Low" ? "⚠ [LOW STOCK]" : ""} ({it.qty} / Min: {it.min} {it.baseUnit})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="po-supplier" className="mb-1 block text-sm font-medium">Supplier</label>
          <select id="po-supplier" value={supplier} onChange={(e) => setSupplier(e.target.value)} className="input-soft">
            {suppliers.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="po-qty" className="mb-1 block text-sm font-medium">Quantity ({selectedItem?.baseUnit || "unit"})</label>
            <input
              id="po-qty"
              type="number"
              min="1"
              value={qty}
              onChange={(e) => {
                setQty(e.target.value);
                const qNum = Number(e.target.value) || 0;
                setAmount(String(round2(qNum * (selectedItem?.cost || 50))));
              }}
              className="input-soft"
            />
          </div>
          <div>
            <label htmlFor="po-total" className="mb-1 block text-sm font-medium">Total (ETB)</label>
            <input
              id="po-total"
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="input-soft"
            />
          </div>
        </div>

        {selectedItem && (
          <div className="rounded-lg bg-secondary/60 p-3 text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Current Stock:</span>
              <span className={selectedItem.status === "Low" ? "text-berbere-600 font-semibold" : ""}>
                {current.toLocaleString()} {selectedItem.baseUnit} ({selectedItem.status})
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">After receiving:</span>
              <span className="font-semibold">{nextStock.toLocaleString()} {selectedItem.baseUnit}</span>
            </div>
            <div className="flex justify-between border-t border-border pt-1">
              <span>Status after receiving:</span>
              <span className={willBeOk ? "text-sage-600 font-bold" : "text-berbere-600 font-bold"}>
                {willBeOk ? "OK (Healthy)" : "Still Low (need at least " + Math.max(0, min - current + 1) + " " + selectedItem.baseUnit + ")"}
              </span>
            </div>
          </div>
        )}

        <label className="flex items-start gap-2.5 rounded-lg border border-border p-2.5 text-xs cursor-pointer hover:bg-secondary/40">
          <input
            type="checkbox"
            checked={isEmergency}
            onChange={(e) => setIsEmergency(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-border text-berbere-600 focus:ring-berbere-500"
          />
          <div>
            <span className="font-semibold text-foreground">Emergency Restock</span>
            <p className="text-muted-foreground">
              Immediately adds stock to warehouse inventory and marks status as "Emergency - Received" without waiting for Manager pre-approval.
            </p>
          </div>
        </label>

        <p className="rounded-lg bg-secondary/60 px-3 py-1.5 text-2xs text-muted-foreground">Next number: {nextId(existing, "PO-", 4)}.</p>
      </div>
    </Modal>
  );
}
