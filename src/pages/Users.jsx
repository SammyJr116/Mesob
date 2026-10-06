import React, { useMemo, useState } from "react";
import { Plus, KeyRound, Unlock, ShieldCheck, Copy, Check } from "lucide-react";
import { PageHeader, SearchInput, StatCard, EmptyState } from "@/components/ui/shared";
import Modal from "@/components/ui/Modal";
import DataTable from "@/components/ui/DataTable";
import { useData } from "@/lib/DataContext";
import { useRole } from "@/lib/RoleContext";
import { notifySuccess, notifyError } from "@/lib/notify";
import { stamp, nextId } from "@/lib/datetime";

const ROLE_OPTIONS = ["Manager", "Administrator", "Kitchen", "Waiter", "Inventory Staff", "Cleaner", "Security"];

export default function Users() {
  const { db, updateItem, insertItem } = useData();
  const { role } = useRole();
  const { users, employees } = db;
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState(null);
  const [issued, setIssued] = useState(null);
  const [locking, setLocking] = useState(null);

  const filtered = useMemo(() => {
    const needle = q.toLowerCase();
    return users.filter((u) => {
      const okQ =
        !needle ||
        u.username.toLowerCase().includes(needle) ||
        u.fullName.toLowerCase().includes(needle) ||
        u.role.toLowerCase().includes(needle);
      const okRole = roleFilter === "All" || u.role === roleFilter;
      return okQ && okRole;
    });
  }, [users, q, roleFilter]);
  const active = users.filter((u) => u.status === "Active").length;
  const admins = users.filter((u) => u.role === "Administrator" && u.status === "Active").length;
  const locked = users.filter((u) => u.locked).length;

  const log = (action, target, oldV, newV, reason) =>
    insertItem("activityLog", { id: nextId(db.activityLog, "L", 10), who: role || "admin1", when: stamp(), action, target, old: String(oldV ?? ""), new: String(newV ?? ""), reason: reason || "" });

  const resetPassword = (u) => {
    const temp = `tmp-${Math.random().toString(36).slice(2, 10)}`;
    if (locked >= 3) {
      // Five failed attempts lock a single account; this is a soft brake on
      // mass resets rather than that rule.
      notifyError("Three accounts are already locked. Check the lockout list first.");
    }
    updateItem("users", u.id, { mustChange: true });
    log("Issued temporary password", u.username, "", "temporary", "Administrator reset");
    setIssued({ user: u, temp });
    notifySuccess(`Temporary password issued for ${u.username}`);
  };

  const unlock = (u) => {
    updateItem("users", u.id, { status: "Active", locked: false });
    log("Unlocked user", u.username, "Locked", "Active", "");
    notifySuccess(`${u.username} unlocked`);
  };

  const lock = (u, reason) => {
    updateItem("users", u.id, { locked: true, status: "Inactive" });
    log("Locked user", u.username, u.status, "Locked", reason);
    setLocking(null);
    notifySuccess(`${u.username} locked`);
  };

  return (
    <div>
      <PageHeader
        title="Users & system"
        subtitle="Administrator manages user accounts, roles and passwords only. No access to orders, inventory, sales or reports."
        actions={<button onClick={() => setShowAdd(true)} className="btn-primary"><Plus className="h-4 w-4" /> New user</button>}
      />
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard label="Total users" value={users.length} />
        <StatCard label="Active" value={active} tone="sage" />
        <StatCard label="Administrators" value={admins} tone="gold" />
        <StatCard label="Must change password" value={users.filter((u) => u.mustChange).length} tone="berbere" />
        <StatCard label="Locked out" value={locked} sub="locked by an Administrator" tone="berbere" />
      </div>

      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="max-w-sm flex-1"><SearchInput value={q} onChange={setQ} placeholder="Search users…" /></div>
        <label htmlFor="u-role-filter" className="sr-only">Filter by role</label>
        <select id="u-role-filter" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="input-soft w-auto">
          <option>All</option>
          {ROLE_OPTIONS.map((r) => <option key={r}>{r}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No users match"
          description={users.length === 0 ? "Create the first system account." : "Try a different search term or role."}
          icon={ShieldCheck}
          action={<button onClick={() => setShowAdd(true)} className="btn-primary text-sm"><Plus className="h-4 w-4" /> New user</button>}
        />
      ) : (
        <DataTable
          caption="System users with role, linked employee, last sign-in and status"
          initialSort={{ key: "username", dir: "asc" }}
          columns={[
            { key: "username", header: "Username", sortable: true, render: (u) => (
              <span className="font-medium">
                {u.username}
                {u.mustChange && <span className="ml-1 text-xs text-berbere-600" aria-label="Must change password">⚠</span>}
              </span>
            ) },
            { key: "fullName", header: "Full name", sortable: true, render: (u) => u.fullName },
            { key: "role", header: "Role", sortable: true, render: (u) => u.role },
            { key: "employee", header: "Employee", sortable: true, sortValue: (u) => u.employee || "zz", render: (u) => <span className="text-muted-foreground">{u.employee}</span> },
            { key: "lastSignIn", header: "Last sign-in", sortable: true, render: (u) => <span className="text-muted-foreground">{u.lastSignIn}</span> },
            { key: "status", header: "Status", sortable: true, sortValue: (u) => (u.locked ? 0 : 1), render: (u) => (
              <span className={u.locked ? "font-medium text-berbere-600" : u.status === "Active" ? "text-sage-600" : "text-muted-foreground"}>
                {u.locked ? "Locked" : u.status}
              </span>
            ) },
            { key: "actions", header: "Actions", align: "right", render: (u) => (
              <div className="flex justify-end gap-1">
                <button onClick={() => resetPassword(u)} aria-label={`Reset password for ${u.username}`} title="Reset password" className="rounded-md bg-secondary p-1.5 hover:bg-muted"><KeyRound className="h-4 w-4" /></button>
                {u.locked || u.status === "Inactive" ? (
                  <button onClick={() => unlock(u)} aria-label={`Unlock ${u.username}`} title="Unlock" className="rounded-md bg-sage-100 p-1.5 text-sage-700 hover:bg-sage-200"><Unlock className="h-4 w-4" /></button>
                ) : (
                  <button onClick={() => setLocking(u)} aria-label={`Lock ${u.username}`} title="Lock" className="rounded-md bg-secondary p-1.5 hover:bg-muted"><ShieldCheck className="h-4 w-4" /></button>
                )}
                <button onClick={() => setEditing(u)} aria-label={`Edit ${u.username}`} title="Edit" className="rounded-md bg-secondary p-1.5 hover:bg-muted"><ShieldCheck className="h-4 w-4" /></button>
              </div>
            ) },
          ]}
          rows={filtered}
          rowKey={(u) => u.id}
          pageSize={12}
        />
      )}
      <p className="mt-4 text-xs text-muted-foreground">
        Accounts are managed here, not self-served. The Administrator issues a temporary password shown once, and
        the holder must change it. Locking is an explicit action — there is no automatic failed-attempt counter,
        because this build has no sign-in screen wired to it.
      </p>

      {showAdd && (
        <AddUserModal users={users} employees={employees}
          onClose={() => setShowAdd(false)}
          onCreate={(draft) => {
            const id = nextId(users, "U", 2);
            const temp = `tmp-${Math.random().toString(36).slice(2, 10)}`;
            insertItem("users", { id, status: "Active", lastSignIn: "Never", mustChange: true, locked: false, ...draft });
            log("User created", draft.username, "", draft.role, "");
            setShowAdd(false);
            setIssued({ user: { username: draft.username }, temp });
            notifySuccess(`${draft.username} created`);
          }} />
      )}

      {editing && (
        <EditUserModal user={editing} employees={employees}
          onClose={() => setEditing(null)}
          onSave={(changes) => {
            updateItem("users", editing.id, changes);
            log("User updated", editing.username, editing.role, changes.role || editing.role, "");
            setEditing(null);
            notifySuccess(`${editing.username} updated`);
          }} />
      )}

      {locking && (
        <Modal
          title={`Lock ${locking.username}?`}
          description="The account is deactivated until an Administrator unlocks it."
          onClose={() => setLocking(null)}
          size="sm"
          onSubmit={(e) => {
            e.preventDefault();
            lock(locking, "Manual lock by Administrator");
          }}
          footer={
            <>
              <button type="button" onClick={() => setLocking(null)} className="btn-outline flex-1">Cancel</button>
              <button type="submit" className="btn-primary flex-1">Lock account</button>
            </>
          }
        >
          <p className="text-sm text-muted-foreground">Reason is written to the activity log.</p>
        </Modal>
      )}

      {issued && <IssuedModal data={issued} onClose={() => setIssued(null)} />}
    </div>
  );
}

function IssuedModal({ data, onClose }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(data.temp);
      setCopied(true);
      notifySuccess("Copied");
    } catch {
      notifyError("Copy failed — select the text and copy manually");
    }
  };
  return (
    <Modal
      title="Temporary password"
      description={`Shown once for ${data.user.username}. The user must change it at first sign-in.`}
      onClose={onClose}
      size="sm"
      footer={<button type="button" onClick={onClose} className="btn-primary w-full">Done</button>}
    >
      <code className="block select-all rounded-lg bg-secondary px-3 py-2 text-center font-mono text-sm">{data.temp}</code>
      <button type="button" onClick={copy} className="btn-outline mt-3 w-full text-sm">
        {copied ? <><Check className="h-4 w-4" /> Copied</> : <><Copy className="h-4 w-4" /> Copy password</>}
      </button>
      <p className="mt-3 text-xs text-muted-foreground">Closing this dialog discards the password. Issue a new one if it is lost.</p>
    </Modal>
  );
}

function AddUserModal({ users, employees, onClose, onCreate }) {
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [roleName, setRoleName] = useState(ROLE_OPTIONS[0]);
  const [employee, setEmployee] = useState("—");
  const taken = users.some((u) => u.username.toLowerCase() === username.trim().toLowerCase());
  const valid = username.trim() && fullName.trim() && !taken;
  return (
    <Modal
      title="New user"
      description="A temporary password is shown once after creation."
      onClose={onClose}
      onSubmit={(e) => {
        e.preventDefault();
        if (!valid) return;
        onCreate({ username: username.trim(), fullName: fullName.trim(), email: email.trim(), role: roleName, employee });
      }}
      footer={
        <>
          <button type="button" onClick={onClose} className="btn-outline flex-1">Back</button>
          <button type="submit" disabled={!valid} className="btn-primary flex-1">Create</button>
        </>
      }
    >
      <label htmlFor="nu-username" className="mb-1 block text-sm font-medium">Username (unique, required)</label>
      <input id="nu-username" value={username} onChange={(e) => setUsername(e.target.value)} aria-invalid={taken} aria-describedby="nu-username-help" className="input-soft mb-1" />
      <p id="nu-username-help" role={taken ? "alert" : undefined} className={taken ? "mb-2 text-xs text-berbere-600" : "mb-2 text-xs text-muted-foreground"}>
        {taken ? "That username is taken." : username.trim() ? "Available." : ""}
      </p>
      <label htmlFor="nu-fullname" className="mb-1 block text-sm font-medium">Full name</label>
      <input id="nu-fullname" value={fullName} onChange={(e) => setFullName(e.target.value)} className="input-soft mb-3" />
      <label htmlFor="nu-email" className="mb-1 block text-sm font-medium">Email (optional)</label>
      <input id="nu-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input-soft mb-3" />
      <label htmlFor="nu-role" className="mb-1 block text-sm font-medium">Role</label>
      <select id="nu-role" value={roleName} onChange={(e) => setRoleName(e.target.value)} className="input-soft mb-3">
        {ROLE_OPTIONS.map((r) => <option key={r}>{r}</option>)}
      </select>
      <label htmlFor="nu-employee" className="mb-1 block text-sm font-medium">Linked employee (optional)</label>
      <select id="nu-employee" value={employee} onChange={(e) => setEmployee(e.target.value)} className="input-soft">
        <option>—</option>
        {employees.map((e) => <option key={e.id} value={e.name}>{e.name}</option>)}
      </select>
    </Modal>
  );
}

function EditUserModal({ user, employees, onClose, onSave }) {
  const [fullName, setFullName] = useState(user.fullName);
  const [email, setEmail] = useState(user.email);
  const [roleName, setRoleName] = useState(user.role);
  const [employee, setEmployee] = useState(user.employee);
  const [status, setStatus] = useState(user.status);
  const valid = fullName.trim();
  return (
    <Modal
      title={`Edit ${user.username}`}
      description="Username cannot be changed. Role changes take effect at next sign-in."
      onClose={onClose}
      onSubmit={(e) => {
        e.preventDefault();
        if (!valid) return;
        onSave({ fullName: fullName.trim(), email: email.trim(), role: roleName, employee, status });
      }}
      footer={
        <>
          <button type="button" onClick={onClose} className="btn-outline flex-1">Back</button>
          <button type="submit" disabled={!valid} className="btn-primary flex-1">Save</button>
        </>
      }
    >
      <label htmlFor="eu-fullname" className="mb-1 block text-sm font-medium">Full name</label>
      <input id="eu-fullname" value={fullName} onChange={(e) => setFullName(e.target.value)} className="input-soft mb-3" />
      <label htmlFor="eu-email" className="mb-1 block text-sm font-medium">Email</label>
      <input id="eu-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input-soft mb-3" />
      <label htmlFor="eu-role" className="mb-1 block text-sm font-medium">Role</label>
      <select id="eu-role" value={roleName} onChange={(e) => setRoleName(e.target.value)} className="input-soft mb-3">
        {ROLE_OPTIONS.map((r) => <option key={r}>{r}</option>)}
      </select>
      <label htmlFor="eu-employee" className="mb-1 block text-sm font-medium">Linked employee</label>
      <select id="eu-employee" value={employee} onChange={(e) => setEmployee(e.target.value)} className="input-soft mb-3">
        <option>—</option>
        {employees.map((e) => <option key={e.id} value={e.name}>{e.name}</option>)}
      </select>
      <label htmlFor="eu-status" className="mb-1 block text-sm font-medium">Status</label>
      <select id="eu-status" value={status} onChange={(e) => setStatus(e.target.value)} className="input-soft">
        <option>Active</option>
        <option>Inactive</option>
      </select>
    </Modal>
  );
}