import React, { useState } from "react";
import { Play, CheckCircle2, Sparkles } from "lucide-react";
import { PageHeader, StatusBadge, EmptyState } from "@/components/ui/shared";
import { tables } from "@/lib/mockData";

export default function TableQueue() {
  const cleaning = tables.filter((t) => t.status === "Cleaning");
  const [taken, setTaken] = useState({});

  return (
    <div>
      <PageHeader title="Table queue" subtitle="Tables waiting to be cleaned. The first cleaner to start one becomes its assignee. Completing it lets the waiter reopen the table." />
      {cleaning.length === 0 ? (
        <EmptyState icon={Sparkles} title="No tables waiting" description="When a table is paid, it enters Cleaning and a task appears here for the shared queue." />
      ) : (
        <div className="space-y-3">
          {cleaning.map((t) => {
            const mine = taken[t.id];
            return (
              <div key={t.id} className="card-soft p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-display text-xl font-semibold">Table {t.number}</p>
                    <p className="text-sm text-muted-foreground">{t.seats} seats · {t.section}</p>
                  </div>
                  <StatusBadge status={mine ? "In Progress" : "Pending"} />
                </div>
                {mine ? (
                  <button onClick={() => setTaken((s) => ({ ...s, [t.id]: false }))} className="btn-primary mt-3 w-full bg-emerald-600"><CheckCircle2 className="h-4 w-4" /> Complete & release</button>
                ) : (
                  <button onClick={() => setTaken((s) => ({ ...s, [t.id]: true }))} className="btn-primary mt-3 w-full"><Play className="h-4 w-4" /> Start cleaning</button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}