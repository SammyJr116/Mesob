import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Users, UtensilsCrossed, ClipboardList, ChefHat, Soup,
  Boxes, Truck, ShoppingCart, Receipt, Sparkles, Wrench, ShieldCheck,
  UserCog, BarChart3, ScrollText, Settings, Bell, User, ClipboardCheck,
  Table2, BookOpen, LogOut, Menu, ChevronRight, AlertTriangle, Search,
} from "lucide-react";
import { useRole } from "@/lib/RoleContext";
import { useData } from "@/lib/DataContext";
import { notificationsApi } from "@/api/client";
import CommandPalette from "@/components/CommandPalette";
import { MesobIcon } from "@/components/HabeshaDecorations";
import { cn } from "@/lib/utils";

const NAV_BY_ROLE = {
  manager: [
    { group: "Operations" },
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/orders", label: "Orders", icon: ClipboardList },
    { to: "/tables", label: "Tables", icon: Table2 },
    { to: "/reservations", label: "Reservations", icon: BookOpen },
    { to: "/customers", label: "Customers", icon: User },
    { to: "/cleaning", label: "Cleaning", icon: Sparkles },
    { to: "/kitchen", label: "Kitchen Queue", icon: ChefHat },
    { to: "/maintenance", label: "Maintenance", icon: Wrench },
    { group: "Menu" },
    { to: "/menu", label: "Menu", icon: UtensilsCrossed },
    { to: "/recipes", label: "Recipes", icon: Soup },
    { group: "Stock and finance" },
    { to: "/inventory", label: "Inventory", icon: Boxes },
    { to: "/suppliers", label: "Suppliers", icon: Truck },
    { to: "/purchases", label: "Purchases", icon: ShoppingCart },
    { to: "/expenses", label: "Expenses", icon: Receipt },
    { group: "Admin" },
    { to: "/employees", label: "Employees", icon: UserCog },
    { to: "/users", label: "Users", icon: Users },
    { to: "/reports", label: "Reports", icon: BarChart3 },
    { to: "/activity-log", label: "Activity Log", icon: ScrollText },
    { to: "/settings", label: "Settings", icon: Settings },
    { group: "Security" },
    { to: "/visitors", label: "Visitors", icon: ShieldCheck },
    { to: "/incidents", label: "Incidents", icon: AlertTriangle },
    { to: "/lost-found", label: "Lost & Found", icon: ScrollText },
  ],
  admin: [
    { to: "/users", label: "Users", icon: Users },
    { to: "/employees", label: "Employees", icon: UserCog },
    { to: "/activity-log", label: "Activity Log", icon: ScrollText },
  ],
  kitchen: [
    { to: "/kitchen", label: "Kitchen Queue", icon: ChefHat },
    { to: "/menu-availability", label: "Menu Availability", icon: UtensilsCrossed },
    { to: "/recipes", label: "Recipes", icon: Soup },
    { to: "/inventory", label: "Inventory (read-only)", icon: Boxes },
    { to: "/maintenance", label: "Maintenance", icon: Wrench },
  ],
  waiter: [
    { to: "/tables", label: "Tables", icon: Table2 },
    { to: "/orders", label: "Orders", icon: ClipboardList },
    { to: "/customers", label: "Customers", icon: User },
    { to: "/reservations", label: "Reservations", icon: BookOpen },
  ],
  inventory: [
    { to: "/inventory", label: "Inventory", icon: Boxes },
    { to: "/suppliers", label: "Suppliers", icon: Truck },
    { to: "/purchases", label: "Purchases", icon: ShoppingCart },
    { to: "/expenses", label: "Expenses", icon: Receipt },
  ],
  cleaner: [
    { to: "/my-tasks", label: "My Tasks", icon: ClipboardCheck },
    { to: "/table-queue", label: "Table Queue", icon: Table2 },
  ],
  security: [
    { to: "/visitors", label: "Visitors", icon: Users },
    { to: "/incidents", label: "Incidents", icon: AlertTriangle },
    { to: "/lost-found", label: "Lost & Found", icon: ScrollText },
  ],
};

const ROLE_LABEL = {
  manager: "Manager", admin: "Administrator", kitchen: "Kitchen", waiter: "Waiter",
  inventory: "Inventory Staff", cleaner: "Cleaner", security: "Security",
};

export default function Layout({ children }) {
  const { role, setRole, logout, user, current } = useRole();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [serverUnread, setServerUnread] = useState(null);
  const { db } = useData();
  const { restaurant, notifications } = db;
  const nav = NAV_BY_ROLE[role] || [];

  useEffect(() => {
    let mounted = true;
    const fetchUnread = async () => {
      try {
        const res = await notificationsApi.list({ unreadOnly: "true" });
        if (mounted && res && typeof res.unreadCount === "number") {
          setServerUnread(res.unreadCount);
        }
      } catch {
        // Fallback to local DataContext
      }
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 15000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);
  const unread = serverUnread !== null ? serverUnread : notifications.filter((n) => !n.read).length;
  const isActive = (to) => location.pathname === to || (to !== "/dashboard" && location.pathname.startsWith(`${to}/`));
  const isPhoneRole = role === "cleaner" || role === "security";

  const handleSwitch = () => {
    logout();
    navigate("/");
  };

  /* A detail screen like /orders/ORD-0042 should read "Orders · ORD-0042",
     not the literal word "Page". Fall back to the segment itself so an
     unlisted-but-valid route still shows something meaningful. */
  const crumbLabel = () => {
    const flat = nav.filter((n) => n.to);
    const exact = flat.find((n) => n.to === location.pathname);
    if (exact) return exact.label;
    const parent = flat.filter((n) => location.pathname.startsWith(`${n.to}/`)).sort((a, b) => b.to.length - a.to.length)[0];
    if (parent) return parent.label;
    const segments = location.pathname.split("/").filter(Boolean);
    return segments.length ? segments[segments.length - 1].replace(/-/g, " ") : ROLE_LABEL[role];
  };

  const SidebarContent = (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-3 px-5 py-5 border-b border-sidebar-border/80">
        <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-b from-gold/30 via-forest/40 to-walnut-900 ring-1 ring-gold/40 shadow-sm">
          <MesobIcon className="h-5 w-5 text-gold-400" />
        </div>
        <div className="leading-tight min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="font-display text-base font-bold text-sidebar-accent-foreground tracking-tight truncate">{restaurant.name}</p>
            <span className="text-2xs font-semibold text-gold-400 font-display">መሶብ</span>
          </div>
          <p className="text-2xs text-sidebar-foreground/60 truncate">Authentic Ethiopian Dining</p>
        </div>
      </div>
      <div className="tibeb-strip opacity-70" />
      <nav aria-label="Primary" className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
        {nav.map((item, i) => {
          if (item.group) {
            return (
              <p key={`g-${item.group}`}
                className={cn(
                  "px-3 pb-1 pt-4 text-2xs font-semibold uppercase tracking-group text-sidebar-foreground/40",
                  i === 0 && "pt-0"
                )}
              >
                {item.group}
              </p>
            );
          }
          const active = isActive(item.to);
          return (
            <Link key={item.to} to={item.to} aria-current={active ? "page" : undefined} onClick={() => setMobileOpen(false)}
              className={cn("sidebar-link", active && "sidebar-link-active")}>
              <item.icon aria-hidden="true" className="h-4 w-4 shrink-0" />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-sidebar-border px-3 py-3">
        <div className="flex items-center gap-3 rounded-lg px-2 py-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sidebar-accent text-xs font-semibold text-sidebar-accent-foreground">
            {ROLE_LABEL[role]?.[0] || "U"}
          </div>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-sm font-medium text-sidebar-accent-foreground">
              {user?.username ? `${user.username} · ${ROLE_LABEL[role]}` : ROLE_LABEL[role]}
            </p>
            <p className="truncate text-2xs text-sidebar-foreground/50">{current?.device} view</p>
          </div>
          <button onClick={handleSwitch} aria-label="Switch role" title="Switch role" className="rounded-md p-1.5 text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );

  const readyTickets = (db.orders || []).flatMap((o) =>
    (o.tickets || []).filter((t) => t.status === "Ready").map((t) => ({ order: o, ticket: t }))
  );

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      {!isPhoneRole && (
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 overflow-hidden bg-sidebar text-sidebar-foreground lg:block">
          {/* Warm light pooling from the top, a faint green note near the base. */}
          <div className="pointer-events-none absolute inset-0">
            <div className="bloom-gold absolute -top-24 left-1/2 h-64 w-64 -translate-x-1/2 blur-2xl" />
            <div className="bloom-sage absolute -bottom-16 -left-16 h-56 w-56 blur-2xl" />
          </div>
          <div className="relative h-full">{SidebarContent}</div>
        </aside>
      )}

      {/* Mobile drawer (non-phone roles) */}
      {mobileOpen && !isPhoneRole && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button aria-label="Close navigation" className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <aside role="dialog" aria-modal="true" aria-label="Navigation" className="absolute left-0 top-0 h-full w-64 bg-sidebar text-sidebar-foreground">{SidebarContent}</aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border/70 bg-cream-50/80 px-4 backdrop-blur-md sm:px-6">
          {!isPhoneRole && (
            <button aria-label="Open navigation" aria-expanded={mobileOpen} className="rounded-lg p-2 hover:bg-secondary lg:hidden" onClick={() => setMobileOpen(true)}>
              <Menu className="h-5 w-5" />
            </button>
          )}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="font-semibold text-foreground flex items-center gap-1.5">
              <MesobIcon className="h-4 w-4 text-gold-600" />
              <span>{restaurant.name}</span>
            </span>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60" />
            <span className="hidden sm:inline font-medium text-foreground/85">{crumbLabel()}</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button
              aria-label="Search (Ctrl+K)"
              aria-keyshortcuts="Control+K"
              onClick={() => setPaletteOpen(true)}
              className="hidden items-center gap-2 rounded-lg border border-border/80 bg-card px-2.5 py-1.5 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground shadow-sm transition sm:flex"
            >
              <Search aria-hidden="true" className="h-4 w-4 text-gold-600" />
              <span>Search menu, orders…</span>
              <kbd className="rounded border border-border bg-secondary px-1.5 py-0.5 text-2xs font-medium">Ctrl K</kbd>
            </button>
            <button aria-label="Search" onClick={() => setPaletteOpen(true)} className="rounded-lg p-2 hover:bg-secondary sm:hidden">
              <Search className="h-5 w-5" />
            </button>
            <button aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"} onClick={() => navigate("/notifications")} className="relative rounded-lg p-2 hover:bg-secondary">
              <Bell className="h-5 w-5" />
              {unread > 0 && (
                <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-berbere-500 px-1 text-2xs font-bold text-white shadow-sm">{unread}</span>
              )}
            </button>
            <button aria-label="Your profile" onClick={() => navigate("/profile")} className="rounded-lg p-2 hover:bg-secondary">
              <User className="h-5 w-5" />
            </button>
            {isPhoneRole && (
              <button aria-label="Switch role" onClick={handleSwitch} className="rounded-lg p-2 hover:bg-secondary">
                <LogOut className="h-5 w-5" />
              </button>
            )}
          </div>
        </header>

        {readyTickets.length > 0 && (role === "waiter" || role === "manager") && (
          <div className="bg-forest-700 text-cream px-4 py-2.5 sm:px-6 shadow-md border-b border-gold-400/30 flex flex-wrap items-center justify-between gap-3 animate-in fade-in duration-300">
            <div className="flex items-center gap-2.5 text-sm font-medium">
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gold-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-gold-400"></span>
              </span>
              <span>
                <strong className="text-gold-300 font-semibold font-display">ማዕድ ዝግጁ ነው · {readyTickets.length} {readyTickets.length === 1 ? "order is" : "orders are"} ready to serve:</strong>{" "}
                <span className="text-cream/90">{readyTickets.map((r) => `${r.order.table ? `Table ${r.order.table}` : "Takeaway"} (${r.order.number}-${r.ticket.round})`).join(", ")}</span>
              </span>
            </div>
            <button
              onClick={() => navigate(readyTickets[0].order.table ? "/tables" : `/orders/${readyTickets[0].order.id}`)}
              className="rounded-lg bg-gold text-walnut-950 px-3.5 py-1 text-xs font-bold shadow hover:brightness-110 transition flex items-center gap-1"
            >
              <span>View & Serve</span> →
            </button>
          </div>
        )}

        <main className={cn("flex-1", isPhoneRole ? "pb-20" : "pb-12")}>
          {/* Phone-role layouts stay narrow only on small screens; the cap is a
              viewport decision, not a role one, so tablets and desktops get room. */}
          <div
            className={cn(
              "mx-auto w-full px-4 py-6 sm:px-6",
              isPhoneRole ? "max-w-md sm:max-w-3xl xl:max-w-5xl" : "max-w-7xl sm:px-8 sm:py-10"
            )}
          >
            {children}
          </div>
        </main>

        {/* Bottom nav for phone roles */}
        {isPhoneRole && (
          <nav aria-label="Quick navigation" className="fixed bottom-0 left-0 right-0 z-30 flex border-t border-border bg-card pb-[env(safe-area-inset-bottom)]">
            {nav.filter((item) => item.to).map((item) => {
              const active = isActive(item.to);
              return (
                <Link key={item.to} to={item.to} aria-current={active ? "page" : undefined} className={cn("flex flex-1 flex-col items-center gap-1 py-2.5 text-2xs font-medium", active ? "text-primary" : "text-muted-foreground")}>
                  <item.icon aria-hidden="true" className="h-5 w-5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        )}

        {paletteOpen && <CommandPalette nav={nav} onClose={() => setPaletteOpen(false)} />}
      </div>
    </div>
  );
}