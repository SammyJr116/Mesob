import React, { useState } from "react";
import { Bell, Volume2, CheckCheck } from "lucide-react";
import { PageHeader } from "@/components/ui/shared";
import { notifications } from "@/lib/mockData";
import { cn } from "@/lib/utils";

export default function Notifications() {
  const [list, setList] = useState(notifications);
  const markAll = () => setList((l) => l.map((n) => ({ ...n, read: true })));
  const toggle = (id) => setList((l) => l.map((n) => n.id === id ? { ...n, read: !n.read } : n));
  const unread = list.filter((n) => !n.read).length;

  return (
    <div>
      <PageHeader title="Notifications" subtitle="In-app only. Retention 30 days. Only two events make a sound: a new kitchen ticket and a ticket becoming Ready." actions={<button onClick={markAll} className="btn-outline"><CheckCheck className="h-4 w-4" /> Mark all read</button>} />
      <p className="mb-4 text-sm text-muted-foreground">{unread} unread · Alerts reach only staff who have the app open.</p>
      <div className="space-y-2">
        {list.map((n) => (
          <button key={n.id} onClick={() => toggle(n.id)} className={cn("card-soft flex w-full items-center gap-3 p-3 text-left", !n.read && "border-primary/40 bg-primary/5")}>
            <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", n.sound ? "bg-rose-100 text-rose-600" : "bg-secondary text-muted-foreground")}>
              {n.sound ? <Volume2 className="h-5 w-5" /> : <Bell className="h-5 w-5" />}
            </div>
            <div className="flex-1">
              <p className="font-medium">{n.event}{n.sound && <span className="ml-2 rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700">SOUND</span>}</p>
              <p className="text-sm text-muted-foreground">{n.detail}</p>
            </div>
            <span className="text-xs text-muted-foreground">{n.time}</span>
            {!n.read && <span className="h-2 w-2 rounded-full bg-primary" />}
          </button>
        ))}
      </div>
    </div>
  );
}