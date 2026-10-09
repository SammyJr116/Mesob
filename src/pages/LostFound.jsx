import React, { useState } from "react";
import { Plus, Package, Trash2 } from "lucide-react";
import { PageHeader, StatusBadge, EmptyState } from "@/components/ui/shared";
import Modal from "@/components/ui/Modal";
import { useData } from "@/lib/DataContext";
import { useRole } from "@/lib/RoleContext";
import { isPrivileged } from "@/lib/roles";
import { notifySuccess } from "@/lib/notify";
import { businessDate, nextId, isoDate } from "@/lib/datetime";
import { securityApi } from "@/api/client";

export default function LostFound() {
  const { db, updateItem, insertItem, removeItem } = useData();
  const { role } = useRole();
  const { lostFound, managedLists } = db;
  const [claim, setClaim] = useState(null);
  const [adding, setAdding] = useState(false);
  const finder = role || "security";
  const isManager = isPrivileged(role);

  const deleteItem = async (id) => {
    try {
      await securityApi.deleteLostItem(id);
    } catch {
      // Local fallback
    }
    removeItem("lostFound", id);
    notifySuccess("Lost item record deleted");
  };

  return (
    <div>
      <PageHeader
        title="Lost & found"
        subtitle="Found and Claimed. Claiming records the claimant's name, phone and date. No disposal workflow or photo."
        actions={<button onClick={() => setAdding(true)} className="btn-primary"><Plus className="h-4 w-4" /> Add found item</button>}
      />
      {lostFound.length === 0 ? (
        <EmptyState title="Nothing logged" description="Items left in the restaurant are recorded here." icon={Package} />
      ) : (
        <div className="space-y-2">
          {lostFound.map((l) => (
            <div key={l.id} className="card-soft flex items-center gap-3 p-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary"><Package className="h-5 w-5 text-primary" /></div>
              <div className="min-w-0 flex-1">
                <p className="font-medium">{l.item} <span className="text-muted-foreground">· {l.description}</span></p>
                <p className="text-xs text-muted-foreground">Found at {l.location} on {l.date} by {l.foundBy}</p>
                {l.status === "Claimed" && <p className="text-xs text-sage-700">Claimed by {l.claimant} ({l.claimPhone}) on {l.claimDate}</p>}
              </div>
              <StatusBadge status={l.status} />
              {l.status === "Found" && <button onClick={() => setClaim(l)} className="btn-outline text-xs">Mark claimed</button>}
              {isManager && (
                <button onClick={() => deleteItem(l.id)} aria-label={`Delete ${l.item}`} className="rounded p-1 text-muted-foreground hover:bg-berbere-100 hover:text-berbere-600">
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {claim && (
        <ClaimModal item={claim} onClose={() => setClaim(null)}
          onConfirm={async (claimant, phone, date) => {
            try {
              await securityApi.claimLostItem(claim.id, { claimantName: claimant, claimantPhone: phone });
            } catch {
              // Local fallback
            }
            updateItem("lostFound", claim.id, { status: "Claimed", claimant, claimPhone: phone, claimDate: date });
            setClaim(null);
            notifySuccess(`${claim.item} claimed`);
          }} />
      )}
      {adding && (
        <AddItemModal areas={managedLists.cleaningAreas} existing={lostFound} finder={finder}
          onClose={() => setAdding(false)}
          onCreate={async (draft) => {
            try {
              await securityApi.recordLostItem({
                itemDescription: draft.item || "Unknown item",
                locationFound: draft.location || "Dining room",
              });
            } catch {
              // Local fallback
            }
            const id = nextId(lostFound, "LF", 2);
            insertItem("lostFound", { id, date: businessDate(), status: "Found", claimant: "", claimPhone: "", claimDate: "", foundBy: finder, ...draft });
            setAdding(false);
            notifySuccess(`${id} logged`);
          }} />
      )}
    </div>
  );
}

function ClaimModal({ item, onClose, onConfirm }) {
  const [claimant, setClaimant] = useState("");
  const [phone, setPhone] = useState("");
  const [date, setDate] = useState(isoDate());
  const valid = claimant.trim() && phone.trim() && date;
  return (
    <Modal title={`Mark claimed — ${item.item}`} onClose={onClose} size="sm"
      onSubmit={(e) => {
        e.preventDefault();
        if (!valid) return;
        onConfirm(claimant.trim(), phone.trim(), date);
      }}
      footer={
        <>
          <button type="button" onClick={onClose} className="btn-outline flex-1">Back</button>
          <button type="submit" disabled={!valid} className="btn-primary flex-1">Confirm</button>
        </>
      }>
      <label htmlFor="claim-name" className="mb-1 block text-sm font-medium">Claimant name</label>
      <input id="claim-name" value={claimant} onChange={(e) => setClaimant(e.target.value)} className="input-soft mb-3" />
      <label htmlFor="claim-phone" className="mb-1 block text-sm font-medium">Phone</label>
      <input id="claim-phone" value={phone} onChange={(e) => setPhone(e.target.value)} className="input-soft mb-3" />
      <label htmlFor="claim-date" className="mb-1 block text-sm font-medium">Date</label>
      <input id="claim-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input-soft" />
    </Modal>
  );
}

function AddItemModal({ areas, existing, finder, onClose, onCreate }) {
  const [item, setItem] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState(areas[0] || "");
  const valid = item.trim() && description.trim();
  return (
    <Modal title="Add found item" description="Recorded as Found until someone claims it." onClose={onClose} size="sm"
      onSubmit={(e) => {
        e.preventDefault();
        if (!valid) return;
        onCreate({ item: item.trim(), description: description.trim(), location });
      }}
      footer={
        <>
          <button type="button" onClick={onClose} className="btn-outline flex-1">Back</button>
          <button type="submit" disabled={!valid} className="btn-primary flex-1">Add</button>
        </>
      }>
      <label htmlFor="lf-item" className="mb-1 block text-sm font-medium">Item</label>
      <input id="lf-item" value={item} onChange={(e) => setItem(e.target.value)} placeholder="e.g. Black umbrella" className="input-soft mb-3" />
      <label htmlFor="lf-desc" className="mb-1 block text-sm font-medium">Description</label>
      <input id="lf-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Left at entrance" className="input-soft mb-3" />
      <label htmlFor="lf-loc" className="mb-1 block text-sm font-medium">Location</label>
      <select id="lf-loc" value={location} onChange={(e) => setLocation(e.target.value)} className="input-soft mb-3">
        {areas.map((a) => <option key={a}>{a}</option>)}
      </select>
      <p className="rounded-lg bg-secondary/60 px-3 py-2 text-xs text-muted-foreground">
        Logged as found by {finder} on {businessDate()}. Next number: {nextId(existing, "LF", 2)}.
      </p>
    </Modal>
  );
}