import React, { useState } from "react";
import { User, KeyRound, AlertTriangle } from "lucide-react";
import { PageHeader, SectionCard } from "@/components/ui/shared";
import { useRole } from "@/lib/RoleContext";

export default function Profile() {
  const { current } = useRole();
  const [showIssue, setShowIssue] = useState(false);

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
          <div className="max-w-sm space-y-3">
            <label className="block"><span className="mb-1 block text-sm font-medium">Current password</span><input type="password" className="input-soft" /></label>
            <label className="block"><span className="mb-1 block text-sm font-medium">New password (min 8 chars)</span><input type="password" className="input-soft" /></label>
            <label className="block"><span className="mb-1 block text-sm font-medium">Confirm new password</span><input type="password" className="input-soft" /></label>
            <button className="btn-primary"><KeyRound className="h-4 w-4" /> Update password</button>
            <p className="text-xs text-muted-foreground">No complexity rules, no expiry. No self-service reset — an Administrator issues a temporary password if forgotten.</p>
          </div>
        </SectionCard>

        <SectionCard title="Report an issue" className="lg:col-span-3">
          <p className="mb-3 text-sm text-muted-foreground">Any staff member can report an incident or a maintenance issue. The Manager handles it afterwards.</p>
          <button onClick={() => setShowIssue(true)} className="btn-outline"><AlertTriangle className="h-4 w-4" /> Report an issue</button>
        </SectionCard>
      </div>

      {showIssue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowIssue(false)}>
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-card p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-4 font-display text-lg font-semibold">Report an issue</h3>
            <label className="mb-1 block text-sm font-medium">Type</label>
            <div className="mb-3 flex gap-2">
              <button className="btn-outline flex-1">Incident</button>
              <button className="btn-outline flex-1">Maintenance</button>
            </div>
            <label className="mb-1 block text-sm font-medium">Description</label>
            <textarea className="input-soft min-h-[80px] mb-3" />
            <label className="mb-1 block text-sm font-medium">Asset (or no asset)</label>
            <select className="input-soft mb-3"><option>No asset</option><option>Industrial Oven #1</option><option>Generator 25kVA</option></select>
            <label className="mb-1 block text-sm font-medium">Priority</label>
            <select className="input-soft mb-3"><option>Low</option><option>Medium</option><option>High</option></select>
            <label className="mb-1 block text-sm font-medium">Photo (optional)</label>
            <div className="mb-4 rounded-lg border border-dashed border-border bg-secondary/40 p-4 text-center text-sm text-muted-foreground">Tap to upload</div>
            <div className="flex gap-2">
              <button onClick={() => setShowIssue(false)} className="btn-outline flex-1">Cancel</button>
              <button onClick={() => setShowIssue(false)} className="btn-primary flex-1">Submit</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}