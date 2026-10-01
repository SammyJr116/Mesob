import React, { useState } from "react";
import { Plus, AlertTriangle, ArrowRight } from "lucide-react";
import { PageHeader, StatusBadge } from "@/components/ui/shared";
import { incidents } from "@/lib/mockData";
import { cn } from "@/lib/utils";

export default function Incidents() {
  const [list, setList] = useState(incidents);
  const advance = (id) => setList((l) => l.map((i) => i.id === id && i.status === "Reported" ? { ...i, status: "Under Review" } : i));

  return (
    <div>
      <PageHeader title="Incidents" subtitle="Any staff member can report. Security can move to Under Review. Only the Manager can set Resolved. Archive-only — never deleted." actions={<button className="btn-primary"><Plus className="h-4 w-4" /> Report incident</button>} />
      <div className="space-y-3">
        {list.map((i) => (
          <div key={i.id} className={cn("card-soft p-4", i.status === "Resolved" && "opacity-70")}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-100 text-rose-600"><AlertTriangle className="h-5 w-5" /></div>
                <div>
                  <p className="font-medium">{i.type} · <span className="text-muted-foreground">{i.location}</span></p>
                  <p className="text-sm text-muted-foreground">{i.description}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{i.date} · reported by {i.reported}</p>
                  {i.resolution && <p className="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">Resolution: {i.resolution}</p>}
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <StatusBadge status={i.status} />
                {i.status === "Reported" && <button onClick={() => advance(i.id)} className="btn-outline text-xs"><ArrowRight className="h-3.5 w-3.5" /> Move to review</button>}
                {i.status === "Under Review" && <button className="btn-primary text-xs">Resolve (Manager)</button>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}