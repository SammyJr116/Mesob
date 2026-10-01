import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import ScrollToTop from './components/ScrollToTop';
import { RoleProvider, useRole } from '@/lib/RoleContext';
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
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/tables" element={<Tables />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/orders/:id" element={<OrderDetail />} />
        <Route path="/orders/new" element={<NewOrder />} />
        <Route path="/kitchen" element={<KitchenQueue />} />
        <Route path="/menu" element={<Menu />} />
        <Route path="/menu-availability" element={<MenuAvailability />} />
        <Route path="/recipes" element={<Recipes />} />
        <Route path="/customers" element={<Customers />} />
        <Route path="/reservations" element={<Reservations />} />
        <Route path="/inventory" element={<Inventory />} />
        <Route path="/suppliers" element={<Suppliers />} />
        <Route path="/purchases" element={<Purchases />} />
        <Route path="/expenses" element={<Expenses />} />
        <Route path="/cleaning" element={<Cleaning />} />
        <Route path="/my-tasks" element={<MyTasks />} />
        <Route path="/table-queue" element={<TableQueue />} />
        <Route path="/maintenance" element={<Maintenance />} />
        <Route path="/visitors" element={<Visitors />} />
        <Route path="/incidents" element={<Incidents />} />
        <Route path="/lost-found" element={<LostFound />} />
        <Route path="/employees" element={<Employees />} />
        <Route path="/users" element={<Users />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/activity-log" element={<ActivityLog />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<PageNotFound />} />
      </Routes>
    </Layout>
  );
};

function App() {
  return (
    <QueryClientProvider client={queryClientInstance}>
      <Router>
        <ScrollToTop />
        <RoleProvider>
          <Shell />
        </RoleProvider>
      </Router>
      <Toaster />
    </QueryClientProvider>
  )
}

export default App