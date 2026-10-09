import React, { useMemo, useState, useEffect } from "react";
import { Phone, Mail, User, GitMerge, Receipt, Calendar, ChevronRight } from "lucide-react";
import { PageHeader, SearchInput, EmptyState, StatusBadge } from "@/components/ui/shared";
import Modal from "@/components/ui/Modal";
import { useData } from "@/lib/DataContext";
import { useRole } from "@/lib/RoleContext";
import { isPrivileged } from "@/lib/roles";
import { notifySuccess, notifyError } from "@/lib/notify";
import { etb } from "@/lib/format";
import { customersApi } from "@/api/client";

export default function Customers() {
  const { db } = useData();
  const { role } = useRole();
  const manager = isPrivileged(role);
  const [serverCustomers, setServerCustomers] = useState(null);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [archived, setArchived] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerDetail, setCustomerDetail] = useState(null);
  const [showMerge, setShowMerge] = useState(false);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const res = await customersApi.list({ includeArchived: archived, search: q });
      if (res?.customers) {
        setServerCustomers(res.customers);
      }
    } catch {
      // fallback to mock
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [archived, q]);

  const customerList = serverCustomers || db.customers || [];

  const filtered = useMemo(() => {
    if (serverCustomers) return serverCustomers;
    const needle = q.toLowerCase();
    return customerList
      .filter((c) => (archived ? c.isArchived || c.archived : !c.isArchived && !c.archived))
      .filter((c) => !needle || c.name.toLowerCase().includes(needle) || (c.phone || "").includes(q));
  }, [customerList, serverCustomers, archived, q]);

  const openCustomer = async (c) => {
    setSelectedCustomer(c);
    try {
      const res = await customersApi.get(c.id);
      if (res?.customer) {
        setCustomerDetail(res.customer);
      } else {
        setCustomerDetail(c);
      }
    } catch {
      setCustomerDetail(c);
    }
  };

  return (
    <div>
      <PageHeader
        title="ደንበኞች · Customers"
        subtitle="Created automatically from reservations and takeaway orders, matched by phone number. Archive-only — never deleted."
        actions={
          manager && (
            <button onClick={() => setShowMerge(true)} className="btn-outline">
              <GitMerge className="h-4 w-4" /> Merge customer
            </button>
          )
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="max-w-sm flex-1">
          <SearchInput value={q} onChange={setQ} placeholder="Search by name or phone…" />
        </div>
        <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
          <input
            type="checkbox"
            checked={archived}
            onChange={(e) => setArchived(e.target.checked)}
            className="h-4 w-4 rounded border-input"
          />
          Show archived
        </label>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title={q ? "No matches" : "No customers yet"}
          description={q ? "Try a different name or phone." : "Customers appear here once a reservation or takeaway order records a phone number."}
          icon={User}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => (
            <div
              key={c.id}
              onClick={() => openCustomer(c)}
              className="card-soft p-4 cursor-pointer hover:border-gold/50 transition-colors"
            >
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary">
                    <User className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-medium">{c.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {c.ordersCount ?? c.orders ?? 0} orders · {c.reservationsCount ?? 0} reservations
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </div>

              <div className="space-y-1 text-sm text-muted-foreground">
                <p className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5" /> {c.phone}
                </p>
                {c.email && (
                  <p className="flex items-center gap-2 truncate">
                    <Mail className="h-3.5 w-3.5" /> {c.email}
                  </p>
                )}
              </div>

              <div className="mt-3 flex items-center justify-between border-t border-border pt-2 text-xs">
                <span className="font-semibold text-primary">
                  {etb(c.totalSpend || 0)}
                </span>
                <span className="text-muted-foreground">
                  {c.lastVisit ? `Last: ${new Date(c.lastVisit).toLocaleDateString()}` : "No recent visit"}
                </span>
              </div>

              {c.notes && (
                <p className="mt-2 rounded-lg bg-secondary/60 px-2 py-1 text-xs line-clamp-2 text-muted-foreground">
                  {c.notes}
                </p>
              )}

              {(c.isArchived || c.archived) && (
                <p className="mt-2 text-xs font-semibold text-amber-600">Archived</p>
              )}
            </div>
          ))}
        </div>
      )}

      {selectedCustomer && (
        <CustomerDetailModal
          customer={customerDetail || selectedCustomer}
          onClose={() => {
            setSelectedCustomer(null);
            setCustomerDetail(null);
          }}
          onSaveNotes={async (newNotes) => {
            try {
              await customersApi.update(selectedCustomer.id, { notes: newNotes });
              notifySuccess("Customer notes updated");
              fetchCustomers();
              setSelectedCustomer({ ...selectedCustomer, notes: newNotes });
            } catch (err) {
              notifyError("Failed to update notes", err.message);
            }
          }}
        />
      )}

      {showMerge && (
        <MergeCustomerModal
          customers={filtered.filter((c) => !c.isArchived && !c.archived)}
          onClose={() => setShowMerge(false)}
          onMerge={async (sourceId, targetId) => {
            try {
              await customersApi.merge(sourceId, targetId);
              notifySuccess("Customer profiles merged successfully");
              setShowMerge(false);
              fetchCustomers();
            } catch (err) {
              notifyError("Failed to merge profiles", err.message);
            }
          }}
        />
      )}
    </div>
  );
}

function CustomerDetailModal({ customer, onClose, onSaveNotes }) {
  const [notes, setNotes] = useState(customer.notes || "");
  const [savingNotes, setSavingNotes] = useState(false);

  return (
    <Modal
      title={customer.name}
      description={`Customer phone: ${customer.phone}`}
      onClose={onClose}
      size="md"
      footer={
        <button type="button" onClick={onClose} className="btn-primary w-full">
          Close
        </button>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg bg-secondary/50 p-2.5">
            <p className="text-xs text-muted-foreground">Total Spend</p>
            <p className="font-semibold text-sm text-primary">{etb(customer.totalSpend || 0)}</p>
          </div>
          <div className="rounded-lg bg-secondary/50 p-2.5">
            <p className="text-xs text-muted-foreground">Orders</p>
            <p className="font-semibold text-sm">{customer.ordersCount ?? customer.orders?.length ?? 0}</p>
          </div>
          <div className="rounded-lg bg-secondary/50 p-2.5">
            <p className="text-xs text-muted-foreground">Reservations</p>
            <p className="font-semibold text-sm">{customer.reservationsCount ?? customer.reservations?.length ?? 0}</p>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Dietary & Customer Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="input-soft w-full text-sm"
            placeholder="e.g. Vegetarian, prefers quiet booth, fasting Wednesdays..."
          />
          <div className="mt-1 flex justify-end">
            <button
              type="button"
              disabled={savingNotes || notes === (customer.notes || "")}
              onClick={async () => {
                setSavingNotes(true);
                await onSaveNotes(notes);
                setSavingNotes(false);
              }}
              className="btn-outline text-xs"
            >
              Save notes
            </button>
          </div>
        </div>

        {customer.orders && customer.orders.length > 0 && (
          <div>
            <h4 className="mb-2 text-sm font-medium flex items-center gap-1.5">
              <Receipt className="h-4 w-4 text-muted-foreground" /> Order History
            </h4>
            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
              {customer.orders.map((o) => (
                <div key={o.id} className="flex items-center justify-between rounded-lg border border-border p-2 text-xs">
                  <div>
                    <span className="font-medium">{o.orderNumber || o.id}</span>
                    <span className="ml-2 text-muted-foreground">{o.orderDate || o.createdAt?.slice(0, 10)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{etb(o.total || o.totalAmount || 0)}</span>
                    <StatusBadge status={o.status} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {customer.reservations && customer.reservations.length > 0 && (
          <div>
            <h4 className="mb-2 text-sm font-medium flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-muted-foreground" /> Past Reservations
            </h4>
            <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
              {customer.reservations.map((r) => (
                <div key={r.id} className="flex items-center justify-between rounded-lg border border-border p-2 text-xs">
                  <div>
                    <span className="font-medium">{r.date} @ {r.time}</span>
                    <span className="ml-2 text-muted-foreground">{r.guests} guests</span>
                  </div>
                  <StatusBadge status={r.status} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

function MergeCustomerModal({ customers, onClose, onMerge }) {
  const [sourceId, setSourceId] = useState("");
  const [targetId, setTargetId] = useState("");
  const [busy, setBusy] = useState(false);

  const canMerge = sourceId && targetId && sourceId !== targetId;

  return (
    <Modal
      title="Merge Customer Profiles"
      description="Consolidate duplicate customer profiles. All orders and reservations will be moved to the primary profile."
      onClose={onClose}
      size="md"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!canMerge) return;
        setBusy(true);
        await onMerge(sourceId, targetId);
        setBusy(false);
      }}
      footer={
        <>
          <button type="button" onClick={onClose} className="btn-outline flex-1">
            Cancel
          </button>
          <button type="submit" disabled={!canMerge || busy} className="btn-primary flex-1">
            {busy ? "Merging…" : "Merge profiles"}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-amber-700 dark:text-amber-400">
            Duplicate Profile (Will be archived)
          </label>
          <select
            value={sourceId}
            onChange={(e) => setSourceId(e.target.value)}
            className="input-soft w-full text-sm"
          >
            <option value="">Select source customer…</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.phone})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-emerald-700 dark:text-emerald-400">
            Primary Profile (Will keep all history)
          </label>
          <select
            value={targetId}
            onChange={(e) => setTargetId(e.target.value)}
            className="input-soft w-full text-sm"
          >
            <option value="">Select target customer…</option>
            {customers
              .filter((c) => c.id !== sourceId)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.phone})
                </option>
              ))}
          </select>
        </div>

        <p className="rounded-lg bg-secondary/60 p-2.5 text-xs text-muted-foreground">
          Note: Notes from the duplicate customer will be appended to the primary customer profile.
          This action writes a permanent audit entry to the activity log.
        </p>
      </div>
    </Modal>
  );
}