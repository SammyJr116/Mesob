import React, { useMemo, useState } from "react";
import { Plus, Upload, User, Users, Pencil, Trash2, ShieldCheck, UserX } from "lucide-react";
import { PageHeader, StatusBadge, SearchInput, EmptyState, SectionCard } from "@/components/ui/shared";
import Modal from "@/components/ui/Modal";
import DataTable from "@/components/ui/DataTable";
import { useData } from "@/lib/DataContext";
import { useRole } from "@/lib/RoleContext";
import { isPrivileged } from "@/lib/roles";
import { notifySuccess, notifyError } from "@/lib/notify";
import { isoDate, nextId } from "@/lib/datetime";

export default function Employees() {
  const { db, insertItem, updateItem, removeItem } = useData();
  const { role } = useRole();
  const { employees, managedLists, users } = db;
  const manager = isPrivileged(role);

  const [q, setQ] = useState("");
  const [dept, setDept] = useState("All");
  const [editing, setEditing] = useState(null);
  const [confirmRemove, setConfirmRemove] = useState(null);

  const filtered = useMemo(
    () =>
      employees.filter((e) => {
        const okQ =
          !q ||
          e.name.toLowerCase().includes(q.toLowerCase()) ||
          e.number.toLowerCase().includes(q.toLowerCase()) ||
          (e.email || "").toLowerCase().includes(q.toLowerCase());
        const okD = dept === "All" || e.department === dept;
        return okQ && okD;
      }),
    [employees, q, dept]
  );

  const save = (draft) => {
    const name = draft.name.trim();
    if (!name) return notifyError("An employee needs a name");
    const clash = employees.some(
      (e) => e.id !== draft.id && (e.name.toLowerCase() === name.toLowerCase() || (draft.email && e.email === draft.email))
    );
    if (clash) return notifyError(draft.email ? "That name or email is already on the roster" : "That name is already on the roster");

    if (editing?.original) {
      updateItem("employees", draft.id, draft);
      notifySuccess(`${name} updated`);
    } else {
      insertItem("employees", draft);
      notifySuccess(`${name} added — an Administrator still needs to create the login`);
    }
    setEditing(null);
  };

  const importCsv = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const lines = String(reader.result || "").split(/\r?\n/).filter(Boolean);
      if (lines.length < 2) return notifyError("The CSV needs a header row and at least one employee");
      const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
      const idx = (n) => headers.indexOf(n);
      const added = [];
      const skipped = [];
      let pool = [...employees];
      lines.slice(1).forEach((line) => {
        const cells = line.split(",").map((c) => c.trim());
        const name = cells[idx("name")] || "";
        if (!name || pool.some((e) => e.name.toLowerCase() === name.toLowerCase())) {
          skipped.push(name || line);
          return;
        }
        const employee = {
          id: nextId(pool, "E"),
          name,
          number: cells[idx("number")] || `EMP-${String(pool.length + 1).padStart(2, "0")}`,
          phone: cells[idx("phone")] || "",
          email: cells[idx("email")] || "",
          position: cells[idx("position")] || "Staff",
          department: cells[idx("department")] || managedLists.departments[0],
          hire: cells[idx("hire")] || isoDate(),
          status: "Active",
          role: cells[idx("role")] || "Staff",
        };
        pool = [...pool, employee];
        added.push(employee);
      });
      if (!added.length) return notifyError(`Nothing imported. Skipped: ${skipped.join(", ") || "no valid rows"}`);
      added.forEach((e) => insertItem("employees", e));
      notifySuccess(
        `Imported ${added.length} employee${added.length === 1 ? "" : "s"}${skipped.length ? `; skipped ${skipped.join(", ")}` : ""}`
      );
    };
    reader.onerror = () => notifyError("Could not read that file");
    reader.readAsText(file);
  };

  const withLogin = new Set(users.map((u) => u.employee).filter((n) => n && n !== "—"));

  return (
    <div>
      <PageHeader
        title="Employees"
        subtitle="Only the Manager manages employees. An employee can exist without a user account. Onboarding is two steps: Manager creates employee, Administrator creates the login."
        actions={
          <>
            <label className="btn-outline cursor-pointer">
              <Upload className="h-4 w-4" /> Import CSV
              <input type="file" accept=".csv,text/csv" onChange={importCsv} className="sr-only" />
            </label>
            <button onClick={() => setEditing({ draft: blankEmployee(employees, managedLists) })} className="btn-primary">
              <Plus className="h-4 w-4" /> New employee
            </button>
          </>
        }
      />

      {!manager && (
        <p className="mb-4 rounded-xl border border-gold/40 bg-gold-100/50 px-4 py-2.5 text-sm text-gold-600">
          You are viewing the roster as {role || "staff"}. Only the Manager can add, edit or remove employees.
        </p>
      )}

      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="flex-1"><SearchInput value={q} onChange={setQ} placeholder="Search employees…" /></div>
        <label htmlFor="emp-dept" className="sr-only">Filter by department</label>
        <select id="emp-dept" value={dept} onChange={(e) => setDept(e.target.value)} className="input-soft w-auto">
          <option>All</option>
          {managedLists.departments.map((d) => <option key={d}>{d}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No employees match"
          description={q || dept !== "All" ? "Try a different search or department." : "Add the first employee to the roster."}
          icon={Users}
          action={manager ? <button onClick={() => setEditing({ draft: blankEmployee(employees, managedLists) })} className="btn-primary text-sm"><Plus className="h-4 w-4" /> New employee</button> : null}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((e) => (
            <div key={e.id} className="card-soft p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary"><User className="h-6 w-6 text-muted-foreground" /></div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{e.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{e.position} · {e.department}</p>
                </div>
                <StatusBadge status={e.status} />
              </div>
              <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                <p>{e.number} · {e.phone || "no phone"}</p>
                <p>Hired {e.hire} · System role: {e.role}</p>
                <p className={withLogin.has(e.name) ? "text-sage-600" : "text-gold-600"}>
                  {withLogin.has(e.name) ? "Has a login" : "No login yet — Administrator creates it"}
                </p>
              </div>
              {manager && (
                <div className="mt-3 flex items-center gap-2 border-t border-border pt-2">
                  <button onClick={() => setEditing({ draft: { ...e }, original: e })} className="btn-outline flex-1 text-xs">
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </button>
                  <button
                    onClick={() => updateItem("employees", e.id, { status: e.status === "Active" ? "Inactive" : "Active" })}
                    className="btn-outline flex-1 text-xs"
                  >
                    {e.status === "Active" ? <><UserX className="h-3.5 w-3.5" /> Deactivate</> : <><ShieldCheck className="h-3.5 w-3.5" /> Reactivate</>}
                  </button>
                  <button onClick={() => setConfirmRemove(e)} aria-label={`Remove ${e.name}`} className="btn-outline px-2 text-berbere-600 hover:bg-berbere-100">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="mt-6">
        <SectionCard title="Accounts waiting on an Administrator">
          <DataTable
            caption="Active employees without a user account"
            columns={[
              { key: "name", header: "Employee", sortable: true, render: (e) => <span className="font-medium">{e.name}</span> },
              { key: "position", header: "Position", sortable: true, render: (e) => <span className="text-muted-foreground">{e.position}</span> },
              { key: "department", header: "Department", sortable: true, render: (e) => <span className="text-muted-foreground">{e.department}</span> },
              { key: "suggest", header: "Suggested role", sortable: true, render: (e) => <span className="text-muted-foreground">{e.role}</span> },
            ]}
            rows={employees.filter((e) => e.status === "Active" && !withLogin.has(e.name))}
            rowKey={(e) => e.id}
            empty="Every active employee has a login."
          />
        </SectionCard>
      </div>

      {editing && (
        <EmployeeModal draft={editing.draft} departments={managedLists.departments} onClose={() => setEditing(null)} onSave={save} />
      )}

      {confirmRemove && (
        <Modal
          title={`Remove ${confirmRemove.name}?`}
          description="The employee record is deleted. Orders and activity log entries that name this person are left untouched."
          onClose={() => setConfirmRemove(null)}
          size="sm"
          onSubmit={(e) => {
            e.preventDefault();
            removeItem("employees", confirmRemove.id);
            notifySuccess(`${confirmRemove.name} removed from the roster`);
            setConfirmRemove(null);
          }}
          footer={
            <>
              <button type="button" onClick={() => setConfirmRemove(null)} className="btn-outline flex-1">Keep employee</button>
              <button type="submit" className="btn-primary flex-1">
                Remove
              </button>
            </>
          }
        >
          <p className="text-sm text-muted-foreground">
            {withLogin.has(confirmRemove.name)
              ? "This employee still has a user account. Remove the account on Users first, or the login will outlive the record."
              : "This employee has no user account."}
          </p>
        </Modal>
      )}
    </div>
  );
}

function blankEmployee(employees, managedLists) {
  return {
    id: nextId(employees, "E"),
    name: "",
    number: `EMP-${String(employees.length + 1).padStart(2, "0")}`,
    phone: "",
    email: "",
    position: "",
    department: managedLists.departments[0] || "Front of House",
    hire: isoDate(),
    status: "Active",
    role: "Staff",
  };
}

function EmployeeModal({ draft, departments, onClose, onSave }) {
  const [employee, setEmployee] = useState(draft);
  const set = (patch) => setEmployee((prev) => ({ ...prev, ...patch }));
  const valid = employee.name.trim() && employee.position.trim();

  return (
    <Modal
      title={employee.name ? `Edit ${employee.name}` : "New employee"}
      description="Creating the employee does not create a login. An Administrator does that separately on Users."
      onClose={onClose}
      onSubmit={(e) => {
        e.preventDefault();
        if (!valid) return;
        onSave(employee);
      }}
      footer={
        <>
          <button type="button" onClick={onClose} className="btn-outline flex-1">Cancel</button>
          <button type="submit" disabled={!valid} className="btn-primary flex-1">Save employee</button>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField label="Full name" value={employee.name} onChange={(v) => set({ name: v })} placeholder="Selam T." />
        <TextField label="Employee number" value={employee.number} onChange={(v) => set({ number: v })} />
        <TextField label="Phone" value={employee.phone} onChange={(v) => set({ phone: v })} placeholder="+251911000000" />
        <TextField label="Email (optional)" value={employee.email} onChange={(v) => set({ email: v })} placeholder="name@mesob.et" type="email" />
        <TextField label="Position" value={employee.position} onChange={(v) => set({ position: v })} placeholder="Waiter" />
        <SelectField label="Department" value={employee.department} options={departments} onChange={(v) => set({ department: v })} />
        <TextField label="Hire date" value={employee.hire} onChange={(v) => set({ hire: v })} type="date" />
        <SelectField
          label="System role"
          value={employee.role}
          options={["Waiter", "Kitchen", "Cleaner", "Inventory", "Security", "Manager", "Staff"]}
          onChange={(v) => set({ role: v })}
        />
        <SelectField label="Status" value={employee.status} options={["Active", "Inactive"]} onChange={(v) => set({ status: v })} />
      </div>
    </Modal>
  );
}

/** @param {{ label: string, value: string, onChange: (v: string) => void, placeholder?: string, type?: string }} props */
function TextField({ label, value, onChange, placeholder, type = "text" }) {
  const id = `emp-${label.toLowerCase().replace(/[^a-z]+/g, "-")}`;
  return (
    <label htmlFor={id} className="block">
      <span className="mb-1 block text-sm font-medium">{label}</span>
      <input id={id} type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="input-soft" />
    </label>
  );
}

function SelectField({ label, value, options, onChange }) {
  const id = `emp-${label.toLowerCase().replace(/[^a-z]+/g, "-")}`;
  return (
    <label htmlFor={id} className="block">
      <span className="mb-1 block text-sm font-medium">{label}</span>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className="input-soft">
        {options.map((o) => <option key={o}>{o}</option>)}
      </select>
    </label>
  );
}