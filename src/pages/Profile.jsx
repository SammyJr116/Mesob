import React, { useState } from "react";
import { User, KeyRound, AlertTriangle, ImagePlus } from "lucide-react";
import { PageHeader, SectionCard } from "@/components/ui/shared";
import Modal from "@/components/ui/Modal";
import { useRole } from "@/lib/RoleContext";
import { useData } from "@/lib/DataContext";
import { notifySuccess } from "@/lib/notify";
import { stamp, nextId } from "@/lib/datetime";

const PRIORITIES = ["Low", "Medium", "High"];

export default function Profile() {
  const { current, role } = useRole();
  const { db, insertItem } = useData();
  const { assets, managedLists } = db;
  const [showIssue, setShowIssue] = useState(false);
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwError, setPwError] = useState("");
  const [pwBusy, setPwBusy] = useState(false);
  const reporter = current?.name || role || "staff";

  const changePassword = (e) => {
    e.preventDefault();
    setPwError("");
    if (!currentPw) return setPwError("Enter your current password.");
    if (newPw.length < 8) return setPwError("New password must be at least 8 characters.");
    if (newPw !== confirmPw) return setPwError("New password and confirmation do not match.");
    if (newPw === currentPw) return setPwError("New password must differ from the current one.");
    setPwBusy(true);
    insertItem("activityLog", {
      id: `L${Date.now()}`,
      who: role || "user",
      when: stamp(),
      action: "Changed own password",
      target: current?.name || "self",
      old: "",
      new: "",
      reason: "",
    });
    setPwBusy(false);
    setCurrentPw(""); setNewPw(""); setConfirmPw("");
    notifySuccess("Password updated");
  };

  return (
    <div>
      <PageHeader title="My profile" subtitle="Every role can view their profile, change their own password, and report an issue." />
      <div className="grid gap-5 lg:grid-cols-3">
        <SectionCard title="Account" className="lg:col-span-1">
          <div className="flex flex-col items-center text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary"><User className="h-8 w-8" /></div>
            <p className="mt-3 font-display text-lg font-semibold">{current?.name || "Staff"} </p>
            <p className="text-sm text-muted-foreground">{current?.device} view</p>
          </div>
        </SectionCard>

        <SectionCard title="Change password" className="lg:col-span-2">
          <form onSubmit={changePassword} className="max-w-sm space-y-3">
            <label htmlFor="pw-current" className="block"><span className="mb-1 block text-sm font-medium">Current password</span>
              <input id="pw-current" type="password" autoComplete="current-password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} className="input-soft" /></label>
            <label htmlFor="pw-new" className="block"><span className="mb-1 block text-sm font-medium">New password (min 8 chars)</span>
              <input id="pw-new" type="password" autoComplete="new-password" value={newPw} onChange={(e) => setNewPw(e.target.value)} className="input-soft" /></label>
            <label htmlFor="pw-confirm" className="block"><span className="mb-1 block text-sm font-medium">Confirm new password</span>
              <input id="pw-confirm" type="password" autoComplete="new-password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} className="input-soft" /></label>
            {pwError && <p role="alert" className="rounded-lg bg-berbere-50 px-3 py-2 text-sm text-berbere-700">{pwError}</p>}
            <button type="submit" disabled={pwBusy} className="btn-primary"><KeyRound className="h-4 w-4" /> {pwBusy ? "Updating…" : "Update password"}</button>
            <p className="text-xs text-muted-foreground">No complexity rules, no expiry. No self-service reset — an Administrator issues a temporary password if forgotten.</p>
          </form>
        </SectionCard>

        <SectionCard title="Report an issue" className="lg:col-span-3">
          <p className="mb-3 text-sm text-muted-foreground">Any staff member can report an incident or a maintenance issue. The Manager handles it afterwards.</p>
          <button onClick={() => setShowIssue(true)} className="btn-outline"><AlertTriangle className="h-4 w-4" /> Report an issue</button>
        </SectionCard>
      </div>

      {showIssue && (
        <IssueModal assets={assets} priorities={PRIORITIES} areas={managedLists.cleaningAreas}
          reporter={current?.name || role || "staff"}
          incidentTypes={managedLists.incidentTypes}
          onClose={() => setShowIssue(false)}
          onSubmit={(kind, payload) => {
            if (kind === "Incident") {
              const id = nextId(db.incidents, "IN", 2);
              insertItem("incidents", { id, date: stamp(), status: "Reported", resolution: "", reported: reporter, ...payload });
              notifySuccess(`Incident ${id} reported`);
            } else {
              const id = nextId(db.maintenanceRequests, "MR", 2);
              insertItem("maintenanceRequests", { id, date: stamp(), status: "Reported", cost: 0, assignee: "Unassigned", reported: reporter, ...payload });
              notifySuccess(`Maintenance request ${id} reported`);
            }
            setShowIssue(false);
          }} />
      )}
    </div>
  );
}

/** @param {{ assets: any[], priorities: string[], areas: string[], reporter: string, incidentTypes: string[], onClose: () => void, onSubmit: (kind: string, payload: any) => void }} props */
function IssueModal({ assets, priorities, areas, incidentTypes, onClose, onSubmit }) {
  const [kind, setKind] = useState("Incident");
  const [type, setType] = useState(incidentTypes[0] || "Other");
  const [location, setLocation] = useState(areas[0] || "");
  const [description, setDescription] = useState("");
  const [asset, setAsset] = useState("No asset");
  const [priority, setPriority] = useState(priorities[0]);
  const [photo, setPhoto] = useState("");
  const valid = description.trim();

  const submit = () => {
    if (!valid) return;
    if (kind === "Incident") {
      onSubmit(kind, { type, location, description: description.trim() });
    } else {
      onSubmit(kind, { asset, problem: description.trim(), priority });
    }
  };

  return (
    <Modal
      title="Report an issue"
      description="Either an incident that happened, or a maintenance request for a specific asset."
      onClose={onClose}
      onSubmit={(e) => {
        e.preventDefault();
        if (!valid) return;
        submit();
      }}
      footer={
        <>
          <button type="button" onClick={onClose} className="btn-outline flex-1">Back</button>
          <button type="submit" disabled={!valid} className="btn-primary flex-1">Submit</button>
        </>
      }>
      <fieldset className="mb-3">
        <legend className="mb-1 text-sm font-medium">Type</legend>
        <div className="flex gap-2">
          {["Incident", "Maintenance"].map((k) => (
            <button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind(k)}
              className={`btn-outline flex-1 ${kind === k ? "border-primary text-primary" : ""}`}>{k}</button>
          ))}
        </div>
      </fieldset>

      {kind === "Incident" ? (
        <>
          <label htmlFor="iss-type" className="mb-1 block text-sm font-medium">Incident type</label>
          <select id="iss-type" value={type} onChange={(e) => setType(e.target.value)} className="input-soft mb-3">
            {incidentTypes.map((t) => <option key={t}>{t}</option>)}
          </select>
          <label htmlFor="iss-loc" className="mb-1 block text-sm font-medium">Location</label>
          <select id="iss-loc" value={location} onChange={(e) => setLocation(e.target.value)} className="input-soft mb-3">
            {areas.map((a) => <option key={a}>{a}</option>)}
          </select>
        </>
      ) : (
        <>
          <label htmlFor="iss-asset" className="mb-1 block text-sm font-medium">Asset (or no asset)</label>
          <select id="iss-asset" value={asset} onChange={(e) => setAsset(e.target.value)} className="input-soft mb-3">
            <option>No asset</option>
            {assets.map((a) => <option key={a.id}>{a.name}</option>)}
          </select>
          <label htmlFor="iss-priority" className="mb-1 block text-sm font-medium">Priority</label>
          <select id="iss-priority" value={priority} onChange={(e) => setPriority(e.target.value)} className="input-soft mb-3">
            {priorities.map((p) => <option key={p}>{p}</option>)}
          </select>
        </>
      )}

      <label htmlFor="iss-desc" className="mb-1 block text-sm font-medium">Description</label>
      <textarea id="iss-desc" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} className="input-soft mb-3 min-h-[80px]" />

      <label htmlFor="iss-photo" className="mb-1 block text-sm font-medium">Photo (optional)</label>
      <label htmlFor="iss-photo" className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-secondary/40 p-4 text-center text-sm text-muted-foreground hover:bg-secondary">
        <ImagePlus className="h-4 w-4" /> {photo || "Tap to upload"}
      </label>
      <input id="iss-photo" type="file" accept="image/*" className="sr-only" onChange={(e) => setPhoto(e.target.files?.[0]?.name || "")} />
    </Modal>
  );
}