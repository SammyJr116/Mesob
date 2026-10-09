import React, { useMemo, useState } from "react";
import { Plus, Repeat, Receipt, ImagePlus, CheckCircle2, Trash2, Pencil } from "lucide-react";
import { PageHeader, SearchInput, StatCard, SectionCard, EmptyState } from "@/components/ui/shared";
import Modal from "@/components/ui/Modal";
import DataTable from "@/components/ui/DataTable";
import { etb, round2 } from "@/lib/format";
import { useData } from "@/lib/DataContext";
import { useRole } from "@/lib/RoleContext";
import { isPrivileged } from "@/lib/roles";
import { notifySuccess, notifyError } from "@/lib/notify";
import { businessDate, isoDate, nextId, stamp } from "@/lib/datetime";
import { expensesApi } from "@/api/client";

export default function Expenses() {
  const { db, updateItem, insertItem, removeItem } = useData();
  const { role } = useRole();
  const { expenses, expenseTemplates, managedLists } = db;
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All");
  const [status, setStatus] = useState("All");
  const [showAdd, setShowAdd] = useState(false);
  const [showTemplate, setShowTemplate] = useState(null);

  const isManager = isPrivileged(role);
  const view = useMemo(() => {
    const visible = isManager ? expenses : expenses.filter((e) => e.by === "Inventory");
    const needle = q.toLowerCase();
    const filtered = visible.filter((e) => {
      const okQ = !needle || e.description.toLowerCase().includes(needle) || e.category.toLowerCase().includes(needle);
      const okCat = cat === "All" || e.category === cat;
      const okStatus = status === "All" || e.status === status;
      return okQ && okCat && okStatus;
    });
    const confirmed = visible.filter((e) => e.status === "Confirmed");
    return {
      visibleCount: visible.length,
      filtered,
      totalConfirmed: confirmed.reduce((s, e) => s + e.amount, 0),
      pending: visible.filter((e) => e.status === "Pending confirmation"),
    };
  }, [expenses, isManager, q, cat, status]);
  const { visibleCount, filtered, totalConfirmed, pending } = view;

  const confirm = async (e) => {
    try {
      await expensesApi.confirm(e.id, e.amount);
    } catch {
      // Offline fallback
    }
    updateItem("expenses", e.id, { status: "Confirmed", confirmedOn: stamp() });
    notifySuccess(`${e.id} confirmed`);
  };

  const saveTemplate = async (draft) => {
    if (!draft.category) return notifyError("A template needs a category");
    try {
      if (showTemplate?.original) {
        await expensesApi.updateTemplate(draft.id, draft);
      } else {
        await expensesApi.createTemplate(draft);
      }
    } catch {
      // Offline fallback
    }
    if (showTemplate?.original) {
      updateItem("expenseTemplates", draft.id, draft);
      notifySuccess(`${draft.category} template updated`);
    } else {
      insertItem("expenseTemplates", { ...draft, id: nextId(expenseTemplates, "TPL"), lastRun: "", active: true });
      notifySuccess(`${draft.category} template created`);
    }
    setShowTemplate(null);
  };

  return (
    <div>
      <PageHeader
        title="ወጪዎች · Expenses"
        subtitle="Manager and Inventory Staff record. Inventory Staff see only their own. Only Confirmed entries appear in reports."
        actions={<button onClick={() => setShowAdd(true)} className="btn-primary"><Plus className="h-4 w-4" /> New expense</button>}
      />
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Confirmed total" value={etb(totalConfirmed)} sub="ETB" tone="sage" />
        <StatCard label="Pending confirmation" value={pending.length} sub={isManager ? "needs the Manager" : "waiting on the Manager"} tone="gold" />
        <StatCard label="Entries" value={visibleCount} sub={isManager ? "all entries" : "your entries only"} />
        <StatCard label="Categories" value={managedLists.expenseCategories.length} />
      </div>

      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="flex-1"><SearchInput value={q} onChange={setQ} placeholder="Search expenses…" /></div>
        <label htmlFor="exp-cat" className="sr-only">Filter by category</label>
        <select id="exp-cat" value={cat} onChange={(e) => setCat(e.target.value)} className="input-soft w-auto">
          <option>All</option>
          {managedLists.expenseCategories.map((c) => <option key={c}>{c}</option>)}
        </select>
        <label htmlFor="exp-status" className="sr-only">Filter by status</label>
        <select id="exp-status" value={status} onChange={(e) => setStatus(e.target.value)} className="input-soft w-auto">
          {["All", "Confirmed", "Pending confirmation"].map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>

      {visibleCount === 0 ? (
        <EmptyState
          title="No expenses recorded"
          description={isManager ? "Rent, utilities and day-to-day spending are recorded here." : "Record the purchases you are responsible for."}
          icon={Receipt}
          action={<button onClick={() => setShowAdd(true)} className="btn-primary text-sm"><Plus className="h-4 w-4" /> New expense</button>}
        />
      ) : (
        <DataTable
          caption="Expense entries with category, description, date, amount, receipt, author and status"
          initialSort={{ key: "date", dir: "desc" }}
          columns={[
            { key: "id", header: "Ref", sortable: true, render: (e) => <span className="font-medium">{e.id}</span> },
            { key: "category", header: "Category", sortable: true, render: (e) => <span className="text-muted-foreground">{e.category}</span> },
            { key: "description", header: "Description", sortable: true, render: (e) => e.description },
            { key: "date", header: "Date", sortable: true, sortValue: (e) => e.date, render: (e) => <span className="text-muted-foreground">{e.date}</span> },
            { key: "amount", header: "Amount", align: "right", sortable: true, render: (e) => etb(e.amount) },
            { key: "receipt", header: "Receipt", sortable: true, sortValue: (e) => (e.receipt ? 1 : 0), render: (e) => e.receipt ? <Receipt aria-label="Receipt attached" className="h-4 w-4 text-sage-600" /> : <span className="text-xs text-muted-foreground">—</span> },
            { key: "by", header: "By", sortable: true, render: (e) => <span className="text-muted-foreground">{e.by}</span> },
            { key: "status", header: "Status", sortable: true, render: (e) => <span className={e.status === "Pending confirmation" ? "font-medium text-gold-600" : "text-sage-600"}>{e.status}</span> },
            { key: "actions", header: "Actions", align: "right", render: (e) => (
              e.status === "Pending confirmation" && isManager ? (
                <button onClick={() => confirm(e)} aria-label={`Confirm ${e.id}`} className="inline-flex items-center gap-1 rounded-md bg-sage-100 px-2 py-1 text-xs font-medium text-sage-700 hover:bg-sage-200">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Confirm
                </button>
              ) : null
            ) },
          ]}
          rows={filtered}
          rowKey={(e) => e.id}
          pageSize={10}
          empty="No expenses match these filters."
        />
      )}

      <SectionCard
        title="Recurring expense templates"
        className="mt-6"
        action={<button onClick={() => setShowTemplate({ draft: blankTemplate(managedLists.expenseCategories) })} className="btn-outline text-sm"><Repeat className="h-4 w-4" /> New template</button>}
      >
        {expenseTemplates.length === 0 ? (
          <EmptyState title="No templates" description="A template creates a Pending-confirmation entry each period." icon={Repeat} />
        ) : (
          <DataTable
            caption="Recurring expense templates"
            columns={[
              { key: "category", header: "Category", sortable: true, render: (t) => <span className="font-medium">{t.category}</span> },
              { key: "frequency", header: "Frequency", sortable: true, render: (t) => `${t.frequency} · day ${t.day}` },
              { key: "amount", header: "Expected", align: "right", sortable: true, render: (t) => (t.amount > 0 ? `${etb(t.amount)} ETB` : <span className="text-muted-foreground">varies</span>) },
              { key: "lastRun", header: "Last entry", sortable: true, sortValue: (t) => t.lastRun || "", render: (t) => <span className="text-muted-foreground">{t.lastRun || "never"}</span> },
              { key: "active", header: "State", sortable: true, render: (t) => (
                <button
                  onClick={() => updateItem("expenseTemplates", t.id, { active: !t.active })}
                  aria-pressed={t.active}
                  className={t.active ? "rounded-md bg-sage-100 px-2 py-1 text-xs font-medium text-sage-700" : "rounded-md bg-secondary px-2 py-1 text-xs text-muted-foreground"}
                >
                  {t.active ? "Active" : "Paused"}
                </button>
              ) },
              { key: "actions", header: "Actions", align: "right", render: (t) => (
                <div className="flex justify-end gap-1">
                  <button onClick={() => setShowTemplate({ draft: { ...t }, original: t })} aria-label={`Edit ${t.category} template`} className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"><Pencil className="h-4 w-4" /></button>
                  <button onClick={() => { removeItem("expenseTemplates", t.id); notifySuccess(`${t.category} template removed`); }} aria-label={`Remove ${t.category} template`} className="rounded-md p-1.5 text-muted-foreground hover:bg-berbere-100 hover:text-berbere-600"><Trash2 className="h-4 w-4" /></button>
                </div>
              ) },
            ]}
            rows={expenseTemplates}
            rowKey={(t) => t.id}
            empty="No templates."
          />
        )}
        <p className="mt-3 text-xs text-muted-foreground">A scheduled run creates a Pending-confirmation entry each period. The Manager confirms or edits the actual amount.</p>
      </SectionCard>

      {showAdd && (
        <AddExpenseModal
          categories={managedLists.expenseCategories}
          by={role === "inventory" ? "Inventory" : "Manager"}
          onClose={() => setShowAdd(false)}
          onCreate={async (draft) => {
            try {
              await expensesApi.create({
                category: draft.category,
                amount: draft.amount,
                description: draft.description,
                date: draft.date || businessDate(),
                receiptUrl: draft.receipt || null,
              });
            } catch {
              // Local fallback
            }
            const id = nextId(expenses, "EX", 3);
            insertItem("expenses", {
              id,
              status: role === "inventory" ? "Pending confirmation" : "Confirmed",
              by: role === "inventory" ? "Inventory" : "Manager",
              confirmedOn: role === "inventory" ? "" : businessDate(),
              ...draft,
            });
            setShowAdd(false);
            notifySuccess(role === "inventory" ? `Expense ${id} saved, waiting on the Manager` : `Expense ${id} saved`);
          }} />
      )}
      {showTemplate && (
        <TemplateModal draft={showTemplate.draft} categories={managedLists.expenseCategories} onClose={() => setShowTemplate(null)} onSave={saveTemplate} />
      )}
    </div>
  );
}

function blankTemplate(categories) {
  return { category: categories[0], frequency: "Monthly", day: 1, amount: 0 };
}

function AddExpenseModal({ categories, by, onClose, onCreate }) {
  const [category, setCategory] = useState(categories[0]);
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(isoDate());
  const [description, setDescription] = useState("");
  const [receipt, setReceipt] = useState("");
  const total = Number(amount);
  const valid = Number.isFinite(total) && total > 0 && description.trim();
  const needsApproval = by === "Inventory";

  return (
    <Modal
      title="New expense"
      description={needsApproval ? "Inventory entries wait for the Manager to confirm before they count in reports." : "Recorded as Confirmed."}
      onClose={onClose}
      size="sm"
      onSubmit={(e) => {
        e.preventDefault();
        if (!valid) return;
        onCreate({ category, amount: round2(total), date, description: description.trim(), receipt: Boolean(receipt) });
      }}
      footer={
        <>
          <button type="button" onClick={onClose} className="btn-outline flex-1">Back</button>
          <button type="submit" disabled={!valid} className="btn-primary flex-1">Save</button>
        </>
      }
    >
      <label htmlFor="ex-cat" className="mb-1 block text-sm font-medium">Category</label>
      <select id="ex-cat" value={category} onChange={(e) => setCategory(e.target.value)} className="input-soft mb-3">
        {categories.map((c) => <option key={c}>{c}</option>)}
      </select>
      <label htmlFor="ex-amount" className="mb-1 block text-sm font-medium">Amount (ETB)</label>
      <input id="ex-amount" type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className="input-soft mb-3" />
      <label htmlFor="ex-date" className="mb-1 block text-sm font-medium">Date</label>
      <input id="ex-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input-soft mb-3" />
      <label htmlFor="ex-desc" className="mb-1 block text-sm font-medium">Description</label>
      <input id="ex-desc" value={description} onChange={(e) => setDescription(e.target.value)} className="input-soft mb-3" />
      <span className="mb-1 block text-sm font-medium">Receipt photo (optional)</span>
      <label htmlFor="ex-receipt" className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-secondary/40 p-4 text-center text-sm text-muted-foreground hover:bg-secondary">
        <ImagePlus className="h-4 w-4" /> {receipt || "Tap to upload (JPG/PNG/WEBP, max 5 MB)"}
      </label>
      <input id="ex-receipt" type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => setReceipt(e.target.files?.[0]?.name || "")} />
      <p className="mt-3 rounded-lg bg-secondary/60 px-3 py-2 text-xs text-muted-foreground">
        Recorded by {by} on {businessDate()} as {needsApproval ? "Pending confirmation" : "Confirmed"}.
      </p>
    </Modal>
  );
}

function TemplateModal({ draft, categories, onClose, onSave }) {
  const [template, setTemplate] = useState(draft);
  const set = (patch) => setTemplate((prev) => ({ ...prev, ...patch }));
  const amount = Number(template.amount);
  const valid = template.category && Number.isFinite(amount) && amount >= 0 && template.day >= 1 && template.day <= 28;

  return (
    <Modal
      title={template.id ? `Edit ${template.category} template` : "New recurring template"}
      onClose={onClose}
      size="sm"
      onSubmit={(e) => {
        e.preventDefault();
        if (!valid) return;
        onSave({ ...template, amount: round2(amount), day: Number(template.day) });
      }}
      footer={
        <>
          <button type="button" onClick={onClose} className="btn-outline flex-1">Back</button>
          <button type="submit" disabled={!valid} className="btn-primary flex-1">Save template</button>
        </>
      }
    >
      <label htmlFor="tpl-cat" className="mb-1 block text-sm font-medium">Category</label>
      <select id="tpl-cat" value={template.category} onChange={(e) => set({ category: e.target.value })} className="input-soft mb-3">
        {categories.map((c) => <option key={c}>{c}</option>)}
      </select>
      <label htmlFor="tpl-amount" className="mb-1 block text-sm font-medium">Expected amount (ETB, 0 if it varies)</label>
      <input id="tpl-amount" type="number" min="0" step="0.01" value={template.amount} onChange={(e) => set({ amount: e.target.value })} className="input-soft mb-3" />
      <label htmlFor="tpl-freq" className="mb-1 block text-sm font-medium">Frequency</label>
      <select id="tpl-freq" value={template.frequency} onChange={(e) => set({ frequency: e.target.value })} className="input-soft mb-3">
        <option>Monthly</option>
        <option>Weekly</option>
      </select>
      <label htmlFor="tpl-day" className="mb-1 block text-sm font-medium">Day of period (1–28)</label>
      <input id="tpl-day" type="number" min="1" max="28" value={template.day} onChange={(e) => set({ day: e.target.value })} className="input-soft" />
    </Modal>
  );
}