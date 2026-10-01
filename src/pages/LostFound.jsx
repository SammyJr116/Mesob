import React, { useState } from "react";
import { Plus, Package } from "lucide-react";
import { PageHeader, StatusBadge } from "@/components/ui/shared";
import { lostFound } from "@/lib/mockData";

export default function LostFound() {
  const [list, setList] = useState(lostFound);
  const [claim, setClaim] = useState(null);

  return (
    <div>
      <PageHeader title="Lost & found" subtitle="Found and Claimed. Claiming records the claimant's name, phone and date. No disposal workflow or photo." actions={<button className="btn-primary"><Plus className="h-4 w-4" /> Add found item</button>} />
      <div className="space-y-2">
        {list.map((l) => (
          <div key={l.id} className="card-soft flex items-center gap-3 p-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary"><Package className="h-5 w-5 text-primary" /></div>
            <div className="flex-1">
              <p className="font-medium">{l.item} <span className="text-muted-foreground">· {l.description}</span></p>
              <p className="text-xs text-muted-foreground">Found at {l.location} on {l.date} by {l.foundBy}</p>
              {l.status === "Claimed" && <p className="text-xs text-emerald-700">Claimed by {l.claimant} ({l.claimPhone}) on {l.claimDate}</p>}
            </div>
            <StatusBadge status={l.status} />
            {l.status === "Found" && <button onClick={() => setClaim(l)} className="btn-outline text-xs">Mark claimed</button>}
          </div>
        ))}
      </div>

      {claim && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setClaim(null)}>
          <div className="w-full max-w-sm rounded-2xl bg-card p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-4 font-display text-lg font-semibold">Mark claimed — {claim.item}</h3>
            <label className="mb-1 block text-sm font-medium">Claimant name</label>
            <input className="input-soft mb-3" />
            <label className="mb-1 block text-sm font-medium">Phone</label>
            <input className="input-soft mb-3" />
            <label className="mb-1 block text-sm font-medium">Date</label>
            <input type="date" className="input-soft mb-4" />
            <div className="flex gap-2">
              <button onClick={() => setClaim(null)} className="btn-outline flex-1">Cancel</button>
              <button onClick={() => setClaim(null)} className="btn-primary flex-1">Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}