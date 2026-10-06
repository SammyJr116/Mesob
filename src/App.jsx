import { Toaster } from "@/components/ui/toaster"
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
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

const Shell = () => {
  const { role } = useRole();
  if (!role) return <RoleSelect />;
  return (
    <Layout>
      <Routes>
        {/* Shared across every role: no data of its own, just chrome. */}
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/profile" element={<Profile />} />

        {/* Operations */}
        <Guarded roles={["manager", "admin", "waiter"]}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/tables" element={<Tables />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/orders/:id" element={<OrderDetail />} />
          <Route path="/orders/new" element={<NewOrder />} />
          <Route path="/reservations" element={<Reservations />} />
          <Route path="/customers" element={<Customers />} />
        </Guarded>

        {/* Kitchen */}
        <Guarded roles={["manager", "admin", "kitchen", "waiter"]}>
          <Route path="/kitchen" element={<KitchenQueue />} />
          <Route path="/menu-availability" element={<MenuAvailability />} />
          <Route path="/recipes" element={<Recipes />} />
        </Guarded>

        {/* Menu authoring is manager/admin only; kitchen only toggles availability. */}
        <Guarded roles={["manager", "admin"]}>
          <Route path="/menu" element={<Menu />} />
        </Guarded>

        {/* Stock and purchasing. Kitchen sees inventory read-only, matching its nav. */}
        <Guarded roles={["manager", "admin", "inventory", "kitchen"]}>
          <Route path="/inventory" element={<Inventory />} />
        </Guarded>
        <Guarded roles={["manager", "admin", "inventory"]}>
          <Route path="/suppliers" element={<Suppliers />} />
          <Route path="/purchases" element={<Purchases />} />
        </Guarded>

        {/* Finance — visible to all three, but the page itself scopes by role. */}
        <Guarded roles={["manager", "admin", "inventory"]}>
          <Route path="/expenses" element={<Expenses />} />
        </Guarded>

        {/* Cleaning */}
        <Guarded roles={["manager", "admin", "cleaner"]}>
          <Route path="/cleaning" element={<Cleaning />} />
          <Route path="/my-tasks" element={<MyTasks />} />
          <Route path="/table-queue" element={<TableQueue />} />
        </Guarded>

        {/* Security */}
        <Guarded roles={["manager", "admin", "security"]}>
          <Route path="/visitors" element={<Visitors />} />
          <Route path="/incidents" element={<Incidents />} />
          <Route path="/lost-found" element={<LostFound />} />
        </Guarded>

        {/* Maintenance is raised by anyone on the floor, resolved by a manager. */}
        <Guarded roles={["manager", "admin", "kitchen", "waiter", "inventory", "cleaner", "security"]}>
          <Route path="/maintenance" element={<Maintenance />} />
        </Guarded>

        {/* Administration and reporting */}
        <Guarded roles={["manager", "admin"]}>
          <Route path="/employees" element={<Employees />} />
          <Route path="/users" element={<Users />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/activity-log" element={<ActivityLog />} />
          <Route path="/settings" element={<Settings />} />
        </Guarded>

        <Route path="/" element={<HomeRedirect />} />
        <Route path="*" element={<PageNotFound />} />
      </Routes>
    </Layout>
  );
};

/* Nav is filtered per role, but a hand-typed URL was not. This turns any route
   the active role cannot reach into a redirect home rather than a data leak. */
function Guarded({ roles, children }) {
  const { role } = useRole();
  if (!roles.includes(role)) return <Navigate to={homeFor(role)} replace />;
  return children;
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