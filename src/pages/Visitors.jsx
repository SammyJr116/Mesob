import React, { useState } from "react";
import { Plus, LogIn, LogOut, Phone } from "lucide-react";
import { PageHeader, SearchInput } from "@/components/ui/shared";
import { visitors } from "@/lib/mockData";

export default function Visitors() {
  const [q, setQ] = useState("");
  const [list, setList] = useState(visitors);
  const filtered = list.filter((v) => !q || v.name.toLowerCase().includes(q.toLowerCase()) || v.purpose.toLowerCase().includes(q.toLowerCase()));
  const checkedIn = list.filter((v) => !v.checkOut).length;

  const checkOut = (id) => setList((l) => l.map((v) => v.id === id ? { ...v, checkOut: new Date().toTimeString().slice(0, 5) } : v));

  return (
    <div>
      <PageHeader title="Visitor register" subtitle="Basic details only — no ID number, photo or vehicle plate. Currently checked in: " actions={<button className="btn-primary"><Plus className="h-4 w-4" /> Check in</button>} />
      <div className="mb-4 flex items-center gap-3">
        <div className="flex-1"><SearchInput value={q} onChange={setQ} placeholder="Search visitors…" /></div>
        <span className="rounded-lg bg-secondary px-3 py-1.5 text-sm font-medium">{checkedIn} in building</span>
      </div>
      <div className="space-y-2">
        {filtered.map((v) => (
          <div key={v.id} className="card-soft flex items-center gap-3 p-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary"><LogIn className="h-5 w-5 text-primary" /></div>
            <div className="flex-1">
              <p className="font-medium">{v.name} <span className="text-xs text-muted-foreground">· {v.purpose}</span></p>
              <p className="text-xs text-muted-foreground">Visiting: {v.visiting} · {v.notes}</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3" /> {v.phone}</p>
            </div>
            <div className="text-right text-xs text-muted-foreground">
              <p>In: {v.checkIn}</p>
              <p>Out: {v.checkOut || "—"}</p>
            </div>
            {!v.checkOut && <button onClick={() => checkOut(v.id)} className="btn-outline text-xs"><LogOut className="h-3.5 w-3.5" /> Check out</button>}
          </div>
        ))}
      </div>
    </div>
  );
}