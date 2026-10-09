import React, { useState, useEffect, useMemo } from "react";
import { ScrollText, Download, Key } from "lucide-react";
import { PageHeader, SearchInput, EmptyState } from "@/components/ui/shared";
import DataTable from "@/components/ui/DataTable";
import Modal from "@/components/ui/Modal";
import { useData } from "@/lib/DataContext";
import { useRole } from "@/lib/RoleContext";
import { isPrivileged } from "@/lib/roles";
import { notifySuccess, notifyError } from "@/lib/notify";
import { auditApi, employeesApi } from "@/api/client";

export default function ActivityLog() {
  const { db } = useData();
  const { role } = useRole();
  const manager = isPrivileged(role);
  const [serverLogs, setServerLogs] = useState(null);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [actionFilter, setActionFilter] = useState("All");
  const [roleFilter, setRoleFilter] = useState("All");
  const [showGrantModal, setShowGrantModal] = useState(false);
  const [staffList, setStaffList] = useState([]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = {
        search: q,
        action: actionFilter !== "All" ? actionFilter : undefined,
        role: roleFilter !== "All" ? roleFilter : undefined,
      };
      const res = await auditApi.list(params);
      if (res?.logs) {
        setServerLogs(
          res.logs.map((l) => ({
            id: l.id,
            who: l.user?.username || l.role || "System",
            role: l.role,
            when: new Date(l.createdAt).toLocaleString(),
            action: l.action,
            target: l.target,
            old: l.oldValue || "",
            new: l.newValue || "",
            reason: l.reason || "",
          }))
        );
      }
    } catch {
      // fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [q, actionFilter, roleFilter]);

  useEffect(() => {
    async function loadStaff() {
      try {
        const res = await employeesApi.list();
        if (res?.employees) {
          setStaffList(res.employees);
        }
      } catch {
        // fallback
      }
    }
    if (manager) loadStaff();
  }, [manager]);

  const logs = serverLogs || db.activityLog || [];

  const filtered = useMemo(() => {
    if (serverLogs) return serverLogs;
    return logs.filter(
      (l) =>
        (!q ||
          l.action.toLowerCase().includes(q.toLowerCase()) ||
          l.who.toLowerCase().includes(q.toLowerCase()) ||
          String(l.target).toLowerCase().includes(q.toLowerCase())) &&
        (actionFilter === "All" || l.action === actionFilter) &&
        (roleFilter === "All" || l.role === roleFilter)
    );
  }, [logs, serverLogs, q, actionFilter, roleFilter]);

  const columns = [
    {
      key: "who",
      header: "Who",
      sortable: true,
      render: (l) => (
        <span className="font-medium text-xs sm:text-sm">
          {l.who} {l.role && <span className="ml-1 text-[11px] text-muted-foreground">({l.role})</span>}
        </span>
      ),
    },
    {
      key: "when",
      header: "When",
      sortable: true,
      sortValue: (l) => l.when,
      render: (l) => <span className="text-xs text-muted-foreground">{l.when}</span>,
    },
    {
      key: "action",
      header: "Action",
      sortable: true,
      render: (l) => <span className="font-mono text-xs font-semibold">{l.action}</span>,
    },
    {
      key: "target",
      header: "Target",
      sortable: true,
      render: (l) => <span className="text-xs font-medium">{l.target}</span>,
    },
    {
      key: "change",
      header: "Change",
      sortValue: (l) => `${l.old} ${l.new}`,
      render: (l) =>
        l.old || l.new ? (
          <span className="text-xs text-muted-foreground truncate max-w-xs block">
            {l.old || "—"} → {l.new || "—"}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        ),
    },
    {
      key: "reason",
      header: "Reason",
      render: (l) =>
        l.reason ? (
          <span className="text-xs text-gold-600 dark:text-gold-400">{l.reason}</span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        ),
    },
  ];

  const handleExportCsv = () => {
    const url = auditApi.getExportUrl({
      search: q,
      action: actionFilter !== "All" ? actionFilter : undefined,
      role: roleFilter !== "All" ? roleFilter : undefined,
    });
    window.open(url, "_blank");
  };

  return (
    <div>
      <PageHeader
        title="የእንቅስቃሴ መዝገብ · Activity Log"
        subtitle="Visible to the Manager only. Immutable audit trail — entries cannot be edited or deleted (PRD 4.8.3)."
        actions={
          manager && (
            <div className="flex items-center gap-2">
              <button onClick={() => setShowGrantModal(true)} className="btn-outline">
                <Key className="h-4 w-4" /> Grant back-entry
              </button>
              <button onClick={handleExportCsv} className="btn-primary">
                <Download className="h-4 w-4" /> Export CSV
              </button>
            </div>
          )
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="max-w-xs flex-1">
          <SearchInput value={q} onChange={setQ} placeholder="Search audit trail…" />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="input-soft w-auto text-xs"
        >
          <option value="All">All Roles</option>
          <option value="MANAGER">Manager</option>
          <option value="ADMIN">Admin</option>
          <option value="WAITER">Waiter</option>
          <option value="KITCHEN">Kitchen</option>
          <option value="INVENTORY">Inventory</option>
          <option value="CLEANER">Cleaner</option>
          <option value="SECURITY">Security</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No log entries match"
          description="Every sensitive mutation appears here with who executed it and why."
          icon={ScrollText}
        />
      ) : (
        <DataTable
          caption="Immutable activity log"
          columns={columns}
          rows={filtered}
          pageSize={15}
          initialSort={{ key: "when", dir: "desc" }}
        />
      )}

      {showGrantModal && (
        <GrantBackEntryModal
          staff={staffList}
          onClose={() => setShowGrantModal(false)}
          onGrant={async (data) => {
            try {
              await auditApi.grantBackEntry(data);
              notifySuccess("Back-entry permission granted successfully");
              setShowGrantModal(false);
              fetchLogs();
            } catch (err) {
              notifyError("Failed to grant back-entry", err.message);
            }
          }}
        />
      )}
    </div>
  );
}

function GrantBackEntryModal({ staff, onClose, onGrant }) {
  const [userId, setUserId] = useState("");
  const [hours, setHours] = useState(12);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const staffWithLogin = staff.filter((s) => s.user || s.hasLogin || s.userId);

  return (
    <Modal
      title="Grant Temporary Back-Entry Permission"
      description="Allows an authorized staff member to back-enter outage paper orders with historical event timestamps (PRD 4.5.2)."
      onClose={onClose}
      size="md"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!userId || !reason.trim()) return;
        setBusy(true);
        await onGrant({ userId, durationHours: Number(hours), reason });
        setBusy(false);
      }}
      footer={
        <>
          <button type="button" onClick={onClose} className="btn-outline flex-1">
            Cancel
          </button>
          <button
            type="submit"
            disabled={!userId || !reason.trim() || busy}
            className="btn-primary flex-1"
          >
            {busy ? "Granting…" : "Grant permission"}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium">Select Staff Member</label>
          <select
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            className="input-soft w-full text-sm"
            required
          >
            <option value="">Select staff user…</option>
            {staff.map((s) => (
              <option key={s.id} value={s.user?.id || s.userId || s.id}>
                {s.name} ({s.role || s.position})
              </option>
            ))}
          </select>
        </div>

        <div>
          <div className="flex justify-between text-sm font-medium mb-1">
            <span>Duration</span>
            <span className="text-primary font-bold">{hours} hours</span>
          </div>
          <input
            type="range"
            min={1}
            max={24}
            value={hours}
            onChange={(e) => setHours(Number(e.target.value))}
            className="w-full accent-primary"
          />
          <div className="flex justify-between text-[11px] text-muted-foreground">
            <span>1 hour</span>
            <span>12 hours (Standard)</span>
            <span>24 hours</span>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Outage Justification / Reason</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            className="input-soft w-full text-sm"
            placeholder="e.g. Back-entering lunch rush paper tickets after power outage..."
            required
          />
        </div>

        <p className="rounded-lg bg-secondary/60 p-2.5 text-xs text-muted-foreground">
          Note: All operations entered using this grant are permanently stamped and logged to the activity log.
        </p>
      </div>
    </Modal>
  );
}