import React, { useState, useEffect, useRef } from "react";
import { Toaster } from "@/components/ui/toaster"
import { BrowserRouter as Router, Route, Routes, Navigate, Outlet } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import ScrollToTop from './components/ScrollToTop';
import { RoleProvider, useRole } from '@/lib/RoleContext';
import { homeFor } from '@/lib/roles';
import { DataProvider } from '@/lib/DataContext';
import Layout from '@/components/Layout';
import RoleSelect from '@/pages/RoleSelect';

// Pages
import Dashboard from '@/pages/Dashboard';
import Tables from '@/pages/Tables';
import Orders from '@/pages/Orders';
import OrderDetail from '@/pages/OrderDetail';
import NewOrder from '@/pages/NewOrder';
import KitchenQueue from '@/pages/KitchenQueue';
import Menu from '@/pages/Menu';
import MenuAvailability from '@/pages/MenuAvailability';
import Recipes from '@/pages/Recipes';
import Customers from '@/pages/Customers';
import Reservations from '@/pages/Reservations';
import Inventory from '@/pages/Inventory';
import Suppliers from '@/pages/Suppliers';
import Purchases from '@/pages/Purchases';
import Expenses from '@/pages/Expenses';
import Cleaning from '@/pages/Cleaning';
import MyTasks from '@/pages/MyTasks';
import TableQueue from '@/pages/TableQueue';
import Maintenance from '@/pages/Maintenance';
import Visitors from '@/pages/Visitors';
import Incidents from '@/pages/Incidents';
import LostFound from '@/pages/LostFound';
import Employees from '@/pages/Employees';
import Users from '@/pages/Users';
import Reports from '@/pages/Reports';
import ActivityLog from '@/pages/ActivityLog';
import Settings from '@/pages/Settings';
import Notifications from '@/pages/Notifications';
import Profile from '@/pages/Profile';

const IDLE_LIMIT_MS = 30 * 60 * 1000; // 30 minutes (PRD 6.6)
const WARNING_THRESHOLD_MS = 28 * 60 * 1000; // 28 minutes (shows 2 min warning)

function IdleSessionTracker() {
  const { role, setRole } = useRole();
  const [secondsRemaining, setSecondsRemaining] = useState(null);
  const lastActivityRef = useRef(Date.now());

  useEffect(() => {
    if (!role) {
      setSecondsRemaining(null);
      return;
    }

    lastActivityRef.current = Date.now();

    const resetTimer = () => {
      if (secondsRemaining === null) {
        lastActivityRef.current = Date.now();
      }
    };

    const events = ["mousemove", "keydown", "click", "touchstart", "scroll"];
    events.forEach((ev) => window.addEventListener(ev, resetTimer, { passive: true }));

    const interval = setInterval(() => {
      const elapsed = Date.now() - lastActivityRef.current;
      if (elapsed >= IDLE_LIMIT_MS) {
        setRole(null);
        setSecondsRemaining(null);
      } else if (elapsed >= WARNING_THRESHOLD_MS) {
        const left = Math.max(1, Math.ceil((IDLE_LIMIT_MS - elapsed) / 1000));
        setSecondsRemaining(left);
      } else {
        setSecondsRemaining(null);
      }
    }, 1000);

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, resetTimer));
      clearInterval(interval);
    };
  }, [role, setRole, secondsRemaining]);

  if (secondsRemaining === null || !role) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="card-soft w-full max-w-sm border-gold-300 p-6 text-center shadow-xl">
        <h3 className="font-display text-lg font-semibold text-foreground">
          Session Expiring Soon (PRD 6.6)
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">
          You have been inactive. Your session will expire in{" "}
          <span className="font-bold text-berbere-600">{secondsRemaining} seconds</span>.
        </p>
        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={() => setRole(null)}
            className="btn-outline flex-1 text-xs"
          >
            Sign out now
          </button>
          <button
            type="button"
            onClick={() => {
              lastActivityRef.current = Date.now();
              setSecondsRemaining(null);
            }}
            className="btn-primary flex-1 text-xs"
          >
            Stay signed in
          </button>
        </div>
      </div>
    </div>
  );
}

const Shell = () => {
  const { role } = useRole();
  if (!role) return <RoleSelect />;
  return (
    <>
      <IdleSessionTracker />
      <Layout>
      <Routes>
        {/* Shared across every role: no data of its own, just chrome. */}
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/profile" element={<Profile />} />

        {/* Operations */}
        <Route element={<Guarded roles={["manager", "admin", "waiter"]} />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/tables" element={<Tables />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/orders/:id" element={<OrderDetail />} />
          <Route path="/orders/new" element={<NewOrder />} />
          <Route path="/reservations" element={<Reservations />} />
          <Route path="/customers" element={<Customers />} />
        </Route>

        {/* Kitchen */}
        <Route element={<Guarded roles={["manager", "admin", "kitchen", "waiter"]} />}>
          <Route path="/kitchen" element={<KitchenQueue />} />
          <Route path="/menu-availability" element={<MenuAvailability />} />
          <Route path="/recipes" element={<Recipes />} />
        </Route>

        {/* Menu authoring is manager/admin only; kitchen only toggles availability. */}
        <Route element={<Guarded roles={["manager", "admin"]} />}>
          <Route path="/menu" element={<Menu />} />
        </Route>

        {/* Stock and purchasing. Kitchen sees inventory read-only, matching its nav. */}
        <Route element={<Guarded roles={["manager", "admin", "inventory", "kitchen"]} />}>
          <Route path="/inventory" element={<Inventory />} />
        </Route>
        <Route element={<Guarded roles={["manager", "admin", "inventory"]} />}>
          <Route path="/suppliers" element={<Suppliers />} />
          <Route path="/purchases" element={<Purchases />} />
        </Route>

        {/* Finance — visible to all three, but the page itself scopes by role. */}
        <Route element={<Guarded roles={["manager", "admin", "inventory"]} />}>
          <Route path="/expenses" element={<Expenses />} />
        </Route>

        {/* Cleaning */}
        <Route element={<Guarded roles={["manager", "admin", "cleaner"]} />}>
          <Route path="/cleaning" element={<Cleaning />} />
          <Route path="/my-tasks" element={<MyTasks />} />
          <Route path="/table-queue" element={<TableQueue />} />
        </Route>

        {/* Security */}
        <Route element={<Guarded roles={["manager", "admin", "security"]} />}>
          <Route path="/visitors" element={<Visitors />} />
          <Route path="/incidents" element={<Incidents />} />
          <Route path="/lost-found" element={<LostFound />} />
        </Route>

        {/* Maintenance is raised by anyone on the floor, resolved by a manager. */}
        <Route element={<Guarded roles={["manager", "admin", "kitchen", "waiter", "inventory", "cleaner", "security"]} />}>
          <Route path="/maintenance" element={<Maintenance />} />
        </Route>

        {/* Administration and reporting */}
        <Route element={<Guarded roles={["manager", "admin"]} />}>
          <Route path="/employees" element={<Employees />} />
          <Route path="/users" element={<Users />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/activity-log" element={<ActivityLog />} />
          <Route path="/settings" element={<Settings />} />
        </Route>

        <Route path="/" element={<HomeRedirect />} />
        <Route path="*" element={<PageNotFound />} />
      </Routes>
    </Layout>
    </>
  );
};

/* Nav is filtered per role, but a hand-typed URL was not. This turns any route
   the active role cannot reach into a redirect home rather than a data leak. */
function Guarded({ roles }) {
  const { role } = useRole();
  if (!roles.includes(role)) return <Navigate to={homeFor(role)} replace />;
  return <Outlet />;
}

function HomeRedirect() {
  const { role } = useRole();
  return <Navigate to={homeFor(role)} replace />;
}

function App() {
  return (
    <Router>
      <ScrollToTop />
      <RoleProvider>
        <DataProvider>
          <Shell />
        </DataProvider>
      </RoleProvider>
      <Toaster />
    </Router>
  )
}

export default App