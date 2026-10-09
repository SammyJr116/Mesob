import React, { useMemo, useState } from "react";
import { Plus, LogIn, LogOut, Phone, Users, Trash2 } from "lucide-react";
import { PageHeader, SearchInput, EmptyState } from "@/components/ui/shared";
import Modal from "@/components/ui/Modal";
import { useData } from "@/lib/DataContext";
import { useRole } from "@/lib/RoleContext";
import { ROLES, isPrivileged } from "@/lib/roles";
import { nextId, clockTime } from "@/lib/datetime";
import { notifySuccess, notifyError } from "@/lib/notify";
import { securityApi } from "@/api/client";

export default function Visitors() {
  const { db, insertItem, updateItem, removeItem } = useData();
  const { role } = useRole();
  const { visitors } = db;
  const [q, setQ] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const isManager = isPrivileged(role);

  const filtered = useMemo(() => {
    const needle = q.toLowerCase();
    return visitors.filter(
      (v) => !needle || v.name.toLowerCase().includes(needle) || v.purpose.toLowerCase().includes(needle)
    );
  }, [visitors, q]);
  const checkedIn = visitors.filter((v) => !v.checkOut).length;
  const me = ROLES.find((r) => r.id === role)?.name || "Security";

  const checkOut = async (id) => {
    try {
      await securityApi.checkOutVisitor(id);
    } catch {
      // Local fallback
    }
    updateItem("visitors", id, { checkOut: clockTime() });
    const v = visitors.find((x) => x.id === id);
    notifySuccess(`${v?.name || "Visitor"} checked out`);
  };

  const deleteVisitor = async (id) => {
    try {
      await securityApi.deleteVisitor(id);
    } catch {
      // Local fallback
    }
    removeItem("visitors", id);
    notifySuccess("Visitor record deleted");
  };

  return (
    <div>
      <PageHeader
        title="Visitor register"
        subtitle={`Basic details only — no ID number, photo or vehicle plate. Currently checked in: ${checkedIn}`}
        actions={<button onClick={() => setShowAdd(true)} className="btn-primary"><Plus className="h-4 w-4" /> Check in</button>}
      />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="min-w-[16rem] flex-1"><SearchInput value={q} onChange={setQ} placeholder="Search visitors…" /></div>
        <span className="rounded-lg bg-secondary px-3 py-1.5 text-sm font-medium">{checkedIn} in building</span>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title={q ? "No visitors match" : "No visitors logged"} description={q ? "Try a different name or purpose." : "Check someone in to start the register."} icon={Users} action={<button onClick={() => setShowAdd(true)} className="btn-primary">Check in</button>} />
      ) : (
        <div className="space-y-2">
          {filtered.map((v) => (
            <div key={v.id} className="card-soft flex flex-wrap items-center gap-3 p-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary"><LogIn className="h-5 w-5 text-primary" /></div>
              <div className="min-w-0 flex-1">
                <p className="font-medium">{v.name} <span className="text-xs text-muted-foreground">· {v.purpose}</span></p>
                <p className="text-xs text-muted-foreground">Visiting: {v.visiting} · {v.notes}</p>
                <p className="flex items-center gap-1 text-xs text-muted-foreground"><Phone className="h-3 w-3" /> {v.phone}</p>
              </div>
              <div className="text-right text-xs text-muted-foreground">
                <p>In: {v.checkIn}</p>
                <p>Out: {v.checkOut || "—"}</p>
              </div>
              <div className="flex items-center gap-2">
                {!v.checkOut && <button onClick={() => checkOut(v.id)} className="btn-outline text-xs"><LogOut className="h-3.5 w-3.5" /> Check out</button>}
                {isManager && (
                  <button onClick={() => deleteVisitor(v.id)} aria-label={`Delete ${v.name}`} className="rounded p-1 text-muted-foreground hover:bg-berbere-100 hover:text-berbere-600">
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <Modal
          title="Check in a visitor"
          description="Basic details only. No ID number, photo or vehicle plate is collected."
          onClose={() => setShowAdd(false)}
          footer={null}
        >
          <VisitorForm
            onSubmit={async (draft) => {
              if (!draft.name.trim()) {
                notifyError("Visitor name is required");
                return;
              }
              try {
                await securityApi.checkInVisitor({
                  name: draft.name.trim(),
                  phone: draft.phone,
                  purpose: draft.purpose,
                  personVisited: draft.visiting,
                });
              } catch {
                // Local fallback
              }
              insertItem("visitors", {
                id: nextId(visitors, "VS", 3),
                checkIn: clockTime(),
                checkOut: null,
                loggedBy: me,
                ...draft,
                name: draft.name.trim(),
                notes: draft.notes?.trim() || "—",
              });
              notifySuccess(`${draft.name.trim()} checked in`);
              setShowAdd(false);
            }}
            onCancel={() => setShowAdd(false)}
          />
        </Modal>
      )}
    </div>
  );
}

export function VisitorForm({ onSubmit, onCancel }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [purpose, setPurpose] = useState("Delivery");
  const [visiting, setVisiting] = useState("");
  const [notes, setNotes] = useState("");

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ name, phone: phone.trim(), purpose, visiting: visiting.trim() || "—", notes });
      }}
    >
      <div>
        <label htmlFor="vs-name" className="mb-1 block text-sm font-medium">Name</label>
        <input id="vs-name" value={name} onChange={(e) => setName(e.target.value)} className="input-soft" />
      </div>
      <div>
        <label htmlFor="vs-phone" className="mb-1 block text-sm font-medium">Phone</label>
        <input id="vs-phone" value={phone} onChange={(e) => setPhone(e.target.value)} className="input-soft" />
      </div>
      <div>
        <label htmlFor="vs-purpose" className="mb-1 block text-sm font-medium">Purpose</label>
        <select id="vs-purpose" value={purpose} onChange={(e) => setPurpose(e.target.value)} className="input-soft">
          <option>Delivery</option><option>Supplier</option><option>Contractor</option><option>Guest</option><option>Other</option>
        </select>
      </div>
      <div>
        <label htmlFor="vs-visiting" className="mb-1 block text-sm font-medium">Visiting</label>
        <input id="vs-visiting" value={visiting} onChange={(e) => setVisiting(e.target.value)} className="input-soft" />
      </div>
      <div>
        <label htmlFor="vs-notes" className="mb-1 block text-sm font-medium">Notes</label>
        <input id="vs-notes" value={notes} onChange={(e) => setNotes(e.target.value)} className="input-soft" />
      </div>
      <div className="flex gap-2 pt-1">
        <button type="button" onClick={onCancel} className="btn-outline flex-1">Cancel</button>
        <button type="submit" className="btn-primary flex-1">Check in</button>
      </div>
    </form>
  );
}