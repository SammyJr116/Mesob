import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Users, UtensilsCrossed, ClipboardList, ChefHat, Soup,
  Boxes, Truck, ShoppingCart, Receipt, Sparkles, Wrench, ShieldCheck,
  UserCog, BarChart3, ScrollText, Settings, Bell, User, ClipboardCheck,
  Table2, BookOpen, LogOut, Menu, ChevronRight, AlertTriangle,
} from "lucide-react";
import { useRole } from "@/lib/RoleContext";
import { restaurant, notifications } from "@/lib/mockData";
import { cn } from "@/lib/utils";

const NAV_BY_ROLE = {
  manager: [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/orders", label: "Orders", icon: ClipboardList },
    { to: "/tables", label: "Tables", icon: Table2 },
    { to: "/menu", label: "Menu", icon: UtensilsCrossed },
    { to: "/recipes", label: "Recipes", icon: Soup },
    { to: "/customers", label: "Customers", icon: User },
    { to: "/reservations", label: "Reservations", icon: BookOpen },
    { to: "/inventory", label: "Inventory", icon: Boxes },
    { to: "/suppliers", label: "Suppliers", icon: Truck },
    { to: "/purchases", label: "Purchases", icon: ShoppingCart },
    { to: "/expenses", label: "Expenses", icon: Receipt },
    { to: "/cleaning", label: "Cleaning", icon: Sparkles },
    { to: "/maintenance", label: "Maintenance", icon: Wrench },
    { to: "/security", label: "Security", icon: ShieldCheck },
    { to: "/employees", label: "Employees", icon: UserCog },
    { to: "/reports", label: "Reports", icon: BarChart3 },
    { to: "/activity-log", label: "Activity Log", icon: ScrollText },
    { to: "/settings", label: "Settings", icon: Settings },
  ],
  admin: [
    { to: "/users", label: "Users", icon: Users },
  ],
  kitchen: [
    { to: "/kitchen", label: "Kitchen Queue", icon: ChefHat },
    { to: "/menu-availability", label: "Menu Availability", icon: UtensilsCrossed },
    { to: "/recipes", label: "Recipes", icon: Soup },
    { to: "/inventory", label: "Inventory (read-only)", icon: Boxes },
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
  const { role, setRole, current } = useRole();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const nav = NAV_BY_ROLE[role] || [];
  const unread = notifications.filter((n) => !n.read).length;
  const isPhoneRole = role === "cleaner" || role === "security";

  const handleSwitch = () => {
    setRole(null);
    navigate("/");
  };

  const SidebarContent = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="relative flex h-10 w-10 items-center justify-center rounded-t-full rounded-b-lg bg-gradient-to-b from-gold/25 to-sidebar-accent ring-1 ring-sidebar-border">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gold text-walnut-900 shadow-gold">
            <Soup className="h-4 w-4" />
          </div>
        </div>
        <div className="leading-tight">
          <p className="font-display text-base font-semibold text-sidebar-accent-foreground">{restaurant.name}</p>
          <p className="text-[11px] text-sidebar-foreground/55">{restaurant.tagline}</p>
        </div>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 pb-4">
        {nav.map((item) => {
          const active = location.pathname === item.to;
          return (
            <Link key={item.to} to={item.to} onClick={() => setMobileOpen(false)}
              className={cn("sidebar-link", active && "sidebar-link-active")}>
              <item.icon className="h-4 w-4 shrink-0" />
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
            <p className="truncate text-sm font-medium text-sidebar-accent-foreground">{ROLE_LABEL[role]}</p>
            <p className="truncate text-[11px] text-sidebar-foreground/50">{current?.device} view</p>
          </div>
          <button onClick={handleSwitch} title="Switch role" className="rounded-md p-1.5 text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
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
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-64 bg-sidebar text-sidebar-foreground">{SidebarContent}</aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border/70 bg-cream-50/80 px-4 backdrop-blur-md sm:px-6">
          {!isPhoneRole && (
            <button className="lg:hidden" onClick={() => setMobileOpen(true)}>
              <Menu className="h-5 w-5" />
            </button>
          )}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{restaurant.name}</span>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{nav.find((n) => n.to === location.pathname)?.label || "Page"}</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={() => navigate("/notifications")} className="relative rounded-lg p-2 hover:bg-secondary">
              <Bell className="h-5 w-5" />
              {unread > 0 && (
                <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">{unread}</span>
              )}
            </button>
            <button onClick={() => navigate("/profile")} className="rounded-lg p-2 hover:bg-secondary">
              <User className="h-5 w-5" />
            </button>
            {isPhoneRole && (
              <button onClick={handleSwitch} className="rounded-lg p-2 hover:bg-secondary">
                <LogOut className="h-5 w-5" />
              </button>
            )}
          </div>
        </header>

        <main className={cn("flex-1", isPhoneRole ? "pb-20" : "pb-12")}>
          <div className={cn("mx-auto w-full", isPhoneRole ? "max-w-md px-4 py-6" : "max-w-7xl px-5 py-8 sm:px-8 sm:py-10")}>
            {children}
          </div>
        </main>

        {/* Bottom nav for phone roles */}
        {isPhoneRole && (
          <nav className="fixed bottom-0 left-0 right-0 z-30 flex border-t border-border bg-card">
            {nav.map((item) => {
              const active = location.pathname === item.to;
              return (
                <Link key={item.to} to={item.to} className={cn("flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium", active ? "text-primary" : "text-muted-foreground")}>
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        )}
      </div>
    </div>
  );
}