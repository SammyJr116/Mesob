import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Volume2, CheckCheck, RefreshCw } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/ui/shared";
import { useData } from "@/lib/DataContext";
import { notificationsApi } from "@/api/client";
import { notifySuccess } from "@/lib/notify";
import { cn } from "@/lib/utils";

export default function Notifications() {
  const navigate = useNavigate();
  const { db, setCollection } = useData();
  const { notifications: localNotifications, restaurant } = db;
  const [serverNotifications, setServerNotifications] = useState(null);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await notificationsApi.list({ unreadOnly: unreadOnly ? "true" : "false" });
      if (res && Array.isArray(res.notifications)) {
        setServerNotifications(res.notifications);
      }
    } catch {
      // Offline fallback: use local DataContext
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [unreadOnly]);

  const rawList = serverNotifications !== null ? serverNotifications : localNotifications;
  const list = rawList.map((n) => ({
    id: n.id,
    event: n.title || n.event || "Alert",
    detail: n.message || n.detail || "",
    sound: n.playSound !== undefined ? n.playSound : !!n.sound,
    read: n.isRead !== undefined ? n.isRead : !!n.read,
    time: n.createdAt ? new Date(n.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : n.time || "Recently",
    link: n.link || null,
  }));

  const unread = list.filter((n) => !n.read).length;

  const markAll = async () => {
    try {
      await notificationsApi.markAllRead();
    } catch {
      // Fallback
    }
    setServerNotifications((prev) => (prev ? prev.map((n) => ({ ...n, isRead: true })) : null));
    setCollection("notifications", (rows) => rows.map((n) => ({ ...n, read: true })));
    notifySuccess("All notifications marked read");
  };

  const handleNotificationClick = async (n) => {
    if (!n.read) {
      try {
        await notificationsApi.markRead(n.id);
      } catch {
        // Fallback
      }
      setServerNotifications((prev) =>
        prev ? prev.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)) : null
      );
      setCollection("notifications", (rows) =>
        rows.map((x) => (x.id === n.id ? { ...x, read: true } : x))
      );
    }

    if (n.link) {
      navigate(n.link);
    }
  };

  return (
    <div>
      <PageHeader
        title="Notifications"
        subtitle={`In-app only. Retention ${restaurant?.notificationRetention || 30} days. Only two events make a sound: a new kitchen ticket and a ticket becoming Ready.`}
        actions={
          <div className="flex gap-2">
            <button
              onClick={fetchNotifications}
              disabled={loading}
              className="btn-outline"
              title="Refresh notifications"
            >
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            </button>
            <button
              onClick={markAll}
              disabled={unread === 0}
              className="btn-outline"
            >
              <CheckCheck className="h-4 w-4" /> Mark all read
            </button>
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {unread} unread · Alerts reach only staff who have the app open.
        </p>

        <div className="flex rounded-lg border border-border bg-card p-0.5 text-xs">
          <button
            type="button"
            onClick={() => setUnreadOnly(false)}
            className={cn(
              "rounded-md px-3 py-1 font-medium transition",
              !unreadOnly ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground"
            )}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setUnreadOnly(true)}
            className={cn(
              "rounded-md px-3 py-1 font-medium transition",
              unreadOnly ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground"
            )}
          >
            Unread Only
          </button>
        </div>
      </div>

      {list.length === 0 ? (
        <EmptyState
          title="No notifications"
          description="Kitchen tickets, low stock, and overdue tasks raise alerts here."
          icon={Bell}
        />
      ) : (
        <div className="space-y-2">
          {list.map((n) => (
            <button
              key={n.id}
              onClick={() => handleNotificationClick(n)}
              className={cn(
                "card-soft flex w-full items-center gap-3 p-3 text-left transition hover:bg-secondary/40",
                !n.read && "border-primary/40 bg-primary/5"
              )}
            >
              <div
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                  n.sound
                    ? "bg-berbere-100 text-berbere-600"
                    : "bg-secondary text-muted-foreground"
                )}
              >
                {n.sound ? <Volume2 className="h-5 w-5" /> : <Bell className="h-5 w-5" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium">
                  {n.event}
                  {n.sound && (
                    <span className="ml-2 rounded bg-berbere-100 px-1.5 py-0.5 text-xs font-semibold text-berbere-600">
                      SOUND
                    </span>
                  )}
                </p>
                <p className="truncate text-sm text-muted-foreground">{n.detail}</p>
              </div>
              <span className="shrink-0 text-xs text-muted-foreground">{n.time}</span>
              {!n.read && (
                <span className="h-2 w-2 shrink-0 rounded-full bg-primary" aria-hidden="true" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}