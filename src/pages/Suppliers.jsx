import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Phone, Mail, Truck } from "lucide-react";
import { PageHeader, StatusBadge, SearchInput, EmptyState } from "@/components/ui/shared";
import Modal from "@/components/ui/Modal";
import { useData } from "@/lib/DataContext";
import { nextId } from "@/lib/datetime";
import { notifySuccess, notifyError } from "@/lib/notify";

export default function Suppliers() {
  const navigate = useNavigate();
  const { db, insertItem, updateItem } = useData();
  const { suppliers, purchases } = db;
  const [q, setQ] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  const filtered = useMemo(() => {
    const needle = q.toLowerCase();
    return suppliers.filter(
      (s) => !needle || s.name.toLowerCase().includes(needle) || s.contact.toLowerCase().includes(needle)
    );
  }, [suppliers, q]);

  const historyBySupplier = useMemo(() => {
    const map = new Map();
    for (const p of purchases) {
      const list = map.get(p.supplier) || [];
      list.push(p);
      map.set(p.supplier, list);
    }
    return map;
  }, [purchases]);
  const historyFor = (name) => historyBySupplier.get(name) || [];

  return (
    <div>
      <PageHeader
        title="Suppliers"
        subtitle="An item can have several suppliers, each with a last price. One is the default."
        actions={<button onClick={() => setShowAdd(true)} className="btn-primary"><Plus className="h-4 w-4" /> New supplier</button>}
      />
      <div className="mb-4 max-w-sm"><SearchInput value={q} onChange={setQ} placeholder="Search suppliers…" /></div>

      {filtered.length === 0 ? (
        <EmptyState title={q ? "No suppliers match" : "No suppliers yet"} description={q ? "Try a different name or contact." : "Add a supplier before raising a purchase request."} icon={Truck} action={<button onClick={() => setShowAdd(true)} className="btn-primary">New supplier</button>} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((s) => {
            const history = historyFor(s.name);
            return (
              <div key={s.id} className="card-soft flex flex-col p-4">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="min-w-0 truncate font-display text-lg font-semibold">{s.name}</p>
                  <StatusBadge status={s.status} />
                </div>
                <p className="text-sm text-muted-foreground">Contact: {s.contact}</p>
                <div className="mt-2 space-y-1 text-sm">
                  <p className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-muted-foreground" /> {s.phone}</p>
                  {s.email && <p className="flex items-center gap-2"><Mail className="h-3.5 w-3.5 text-muted-foreground" /> {s.email}</p>}
                </div>
                <p className="mt-3 text-xs text-muted-foreground">{s.items} item(s) supplied</p>
                <div className="mt-auto flex flex-wrap gap-2 pt-3 text-xs">
                  <button
                    onClick={() => navigate(`/purchases?supplier=${encodeURIComponent(s.name)}`)}
                    className="text-primary"
                  >
                    View {history.length} purchase{history.length === 1 ? "" : "s"} →
                  </button>
                  <button
                    onClick={() => {
                      updateItem("suppliers", s.id, { status: s.status === "Active" ? "Inactive" : "Active" });
                      notifySuccess(`${s.name} ${s.status === "Active" ? "deactivated" : "activated"}`);
                    }}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    {s.status === "Active" ? "Deactivate" : "Activate"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showAdd && (
        <Modal
          title="New supplier"
          description="Suppliers are referenced by purchase requests, so the name must match what staff type."
          onClose={() => setShowAdd(false)}
        >
          <SupplierForm
            onSubmit={(draft) => {
              if (!draft.name.trim()) {
                notifyError("Supplier name is required");
                return;
              }
              if (suppliers.some((s) => s.name.toLowerCase() === draft.name.trim().toLowerCase())) {
                notifyError("That supplier already exists");
                return;
              }
              insertItem("suppliers", {
                id: nextId(suppliers, "S", 3),
                items: 0,
                status: "Active",
                ...draft,
                name: draft.name.trim(),
                contact: draft.contact.trim() || "—",
              });
              notifySuccess(`${draft.name.trim()} added`);
              setShowAdd(false);
            }}
          />
        </Modal>
      )}
    </div>
  );
}

export function SupplierForm({ onSubmit }) {
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ name, contact, phone: phone.trim(), email: email.trim() });
      }}
    >
      <div>
        <label htmlFor="sup-name" className="mb-1 block text-sm font-medium">Name</label>
        <input id="sup-name" value={name} onChange={(e) => setName(e.target.value)} className="input-soft" />
      </div>
      <div>
        <label htmlFor="sup-contact" className="mb-1 block text-sm font-medium">Contact person</label>
        <input id="sup-contact" value={contact} onChange={(e) => setContact(e.target.value)} className="input-soft" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="sup-phone" className="mb-1 block text-sm font-medium">Phone</label>
          <input id="sup-phone" value={phone} onChange={(e) => setPhone(e.target.value)} className="input-soft" />
        </div>
        <div>
          <label htmlFor="sup-email" className="mb-1 block text-sm font-medium">Email</label>
          <input id="sup-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input-soft" />
        </div>
      </div>
      <button type="submit" className="btn-primary w-full">Save supplier</button>
    </form>
  );
}