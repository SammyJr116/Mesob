import React from "react";
import { Bell, Volume2, CheckCheck } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/ui/shared";
import { useData } from "@/lib/DataContext";
import { notifySuccess } from "@/lib/notify";
import { cn } from "@/lib/utils";

export default function Notifications() {
  const { db, setCollection } = useData();
  const { notifications, restaurant } = db;
  const list = notifications;
  const unread = list.filter((n) => !n.read).length;

  const markAll = () => {
    setCollection("notifications", (rows) => rows.map((n) => ({ ...n, read: true })));
    notifySuccess("All notifications marked read");
  };

  const toggle = (id) =>
    setCollection("notifications", (rows) => rows.map((n) => (n.id === id ? { ...n, read: !n.read } : n)));

  return (
    <div>
      <PageHeader
        title="Notifications"
        subtitle={`In-app only. Retention ${restaurant.notificationRetention} days. Only two events make a sound: a new kitchen ticket and a ticket becoming Ready.`}
        actions={<button onClick={markAll} disabled={unread === 0} className="btn-outline"><CheckCheck className="h-4 w-4" /> Mark all read</button>}
      />
      <p className="mb-4 text-sm text-muted-foreground">{unread} unread · Alerts reach only staff who have the app open.</p>
      {list.length === 0 ? (
        <EmptyState title="No notifications" description="Kitchen tickets, low stock and overdue tasks raise alerts here." icon={Bell} />
      ) : (
        <div className="space-y-2">
          {list.map((n) => (
            <button key={n.id} onClick={() => toggle(n.id)} className={cn("card-soft flex w-full items-center gap-3 p-3 text-left", !n.read && "border-primary/40 bg-primary/5")}>
              <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", n.sound ? "bg-berbere-100 text-berbere-600" : "bg-secondary text-muted-foreground")}>
                {n.sound ? <Volume2 className="h-5 w-5" /> : <Bell className="h-5 w-5" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium">
                  {n.event}
                  {n.sound && <span className="ml-2 rounded bg-berbere-100 px-1.5 py-0.5 text-xs font-semibold text-berbere-600">SOUND</span>}
                </p>
                <p className="truncate text-sm text-muted-foreground">{n.detail}</p>
              </div>
              <span className="shrink-0 text-xs text-muted-foreground">{n.time}</span>
              {!n.read && <span className="h-2 w-2 shrink-0 rounded-full bg-primary" aria-hidden="true" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}