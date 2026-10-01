import React, { useState } from "react";
import { Plus, Upload, User } from "lucide-react";
import { PageHeader, StatusBadge, SearchInput } from "@/components/ui/shared";
import { employees, managedLists } from "@/lib/mockData";

export default function Employees() {
  const [q, setQ] = useState("");
  const [dept, setDept] = useState("All");
  const filtered = employees.filter((e) => {
    const okQ = !q || e.name.toLowerCase().includes(q.toLowerCase()) || e.number.toLowerCase().includes(q.toLowerCase());
    const okD = dept === "All" || e.department === dept;
    return okQ && okD;
  });

  return (
    <div>
      <PageHeader title="Employees" subtitle="Only the Manager manages employees. An employee can exist without a user account. Onboarding is two steps: Manager creates employee, Administrator creates the login." actions={
        <>
          <button className="btn-outline"><Upload className="h-4 w-4" /> Import CSV</button>
          <button className="btn-primary"><Plus className="h-4 w-4" /> New employee</button>
        </>
      } />
      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <div className="flex-1"><SearchInput value={q} onChange={setQ} placeholder="Search employees…" /></div>
        <select value={dept} onChange={(e) => setDept(e.target.value)} className="input-soft w-auto">
          <option>All</option>
          {managedLists.departments.map((d) => <option key={d}>{d}</option>)}
        </select>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((e) => (
          <div key={e.id} className="card-soft p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary"><User className="h-6 w-6 text-muted-foreground" /></div>
              <div className="flex-1">
                <p className="font-medium">{e.name}</p>
                <p className="text-xs text-muted-foreground">{e.position} · {e.department}</p>
              </div>
              <StatusBadge status={e.status} />
            </div>
            <div className="mt-3 space-y-1 text-xs text-muted-foreground">
              <p>{e.number} · {e.phone}</p>
              <p>Hired {e.hire} · System role: {e.role}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}