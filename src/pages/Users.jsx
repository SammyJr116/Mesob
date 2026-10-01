import React, { useState } from "react";
import { Plus, KeyRound, Unlock, ShieldCheck } from "lucide-react";
import { PageHeader, StatusBadge, SearchInput, StatCard } from "@/components/ui/shared";
import { users } from "@/lib/mockData";

export default function Users() {
  const [q, setQ] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const filtered = users.filter((u) => !q || u.username.toLowerCase().includes(q.toLowerCase()) || u.fullName.toLowerCase().includes(q.toLowerCase()) || u.role.toLowerCase().includes(q.toLowerCase()));
  const active = users.filter((u) => u.status === "Active").length;
  const admins = users.filter((u) => u.role === "Administrator" && u.status === "Active").length;

  return (
    <div>
      <PageHeader title="Users & system" subtitle="Administrator manages user accounts, roles and passwords only. No access to orders, inventory, sales or reports." actions={<button onClick={() => setShowAdd(true)} className="btn-primary"><Plus className="h-4 w-4" /> New user</button>} />
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total users" value={users.length} />
        <StatCard label="Active" value={active} tone="emerald" />
        <StatCard label="Administrators" value={admins} tone="amber" />
        <StatCard label="Must change password" value={users.filter((u) => u.mustChange).length} tone="rose" />
      </div>
      <div className="mb-4 max-w-sm"><SearchInput value={q} onChange={setQ} placeholder="Search users…" /></div>
      <div className="card-soft overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-secondary/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Username</th>
              <th className="px-4 py-3 font-medium">Full name</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Employee</th>
              <th className="px-4 py-3 font-medium">Last sign-in</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map((u) => (
              <tr key={u.id} className="hover:bg-secondary/40">
                <td className="px-4 py-3 font-medium">{u.username}{u.mustChange && <span className="ml-1 text-xs text-rose-600">⚠</span>}</td>
                <td className="px-4 py-3">{u.fullName}</td>
                <td className="px-4 py-3">{u.role}</td>
                <td className="px-4 py-3 text-muted-foreground">{u.employee}</td>
                <td className="px-4 py-3 text-muted-foreground">{u.lastSignIn}</td>
                <td className="px-4 py-3"><StatusBadge status={u.status} /></td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <button className="rounded-md bg-secondary p-1.5 hover:bg-muted" title="Reset password"><KeyRound className="h-4 w-4" /></button>
                    {u.status === "Inactive" && <button className="rounded-md bg-emerald-100 p-1.5 text-emerald-700 hover:bg-emerald-200" title="Unlock"><Unlock className="h-4 w-4" /></button>}
                    <button className="rounded-md bg-secondary p-1.5 hover:bg-muted" title="Edit"><ShieldCheck className="h-4 w-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-xs text-muted-foreground">Sign-in: username or email + password. 5 failed attempts → 15-min lockout. No self-service reset — the Administrator issues a temporary password shown once. Sessions end after 30 min inactivity.</p>

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowAdd(false)}>
          <div className="w-full max-w-md rounded-2xl bg-card p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-4 font-display text-lg font-semibold">New user</h3>
            <label className="mb-1 block text-sm font-medium">Username (unique, required)</label>
            <input className="input-soft mb-3" />
            <label className="mb-1 block text-sm font-medium">Full name</label>
            <input className="input-soft mb-3" />
            <label className="mb-1 block text-sm font-medium">Email (optional)</label>
            <input className="input-soft mb-3" />
            <label className="mb-1 block text-sm font-medium">Role</label>
            <select className="input-soft mb-3"><option>Manager</option><option>Administrator</option><option>Kitchen</option><option>Waiter</option><option>Inventory Staff</option><option>Cleaner</option><option>Security</option></select>
            <label className="mb-1 block text-sm font-medium">Linked employee (optional)</label>
            <select className="input-soft mb-4"><option>—</option></select>
            <p className="mb-4 rounded-lg bg-secondary/60 px-3 py-2 text-xs text-muted-foreground">A temporary password will be shown once. The user must change it at first sign-in.</p>
            <div className="flex gap-2">
              <button onClick={() => setShowAdd(false)} className="btn-outline flex-1">Cancel</button>
              <button onClick={() => setShowAdd(false)} className="btn-primary flex-1">Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}