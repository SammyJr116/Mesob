import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  restaurant,
  tables,
  menuCategories,
  menuItems,
  recipes,
  orders,
  creditNotes,
  customers,
  reservations,
  inventoryItems,
  stockMovements,
  suppliers,
  purchases,
  expenses,
  expenseTemplates,
  cleaningTasks,
  cleaningTemplates,
  assets,
  maintenanceRequests,
  visitors,
  incidents,
  lostFound,
  employees,
  users,
  activityLog,
  notifications,
  paymentMethods,
  managedLists,
} from "./mockData";

const STORAGE_KEY = "rms_data_v1";

const clone = (v) => JSON.parse(JSON.stringify(v));

function seed() {
  return {
    restaurant: clone(restaurant),
    tables: clone(tables),
    menuCategories: clone(menuCategories),
    menuItems: clone(menuItems),
    recipes: clone(recipes),
    orders: clone(orders),
    creditNotes: clone(creditNotes),
    customers: clone(customers),
    reservations: clone(reservations),
    inventoryItems: clone(inventoryItems),
    stockMovements: clone(stockMovements),
    suppliers: clone(suppliers),
    purchases: clone(purchases),
    expenses: clone(expenses),
    expenseTemplates: clone(expenseTemplates),
    cleaningTasks: clone(cleaningTasks),
    cleaningTemplates: clone(cleaningTemplates),
    assets: clone(assets),
    maintenanceRequests: clone(maintenanceRequests),
    visitors: clone(visitors),
    incidents: clone(incidents),
    lostFound: clone(lostFound),
    employees: clone(employees),
    users: clone(users),
    activityLog: clone(activityLog),
    notifications: clone(notifications),
    paymentMethods: clone(paymentMethods),
    managedLists: clone(managedLists),
  };
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return seed();
    const parsed = JSON.parse(raw);
    const base = seed();
    // Merge so a store saved before a key was added still starts complete.
    return { ...base, ...parsed, restaurant: { ...base.restaurant, ...(parsed.restaurant || {}) } };
  } catch {
    return seed();
  }
}

const DataContext = createContext(null);

export function DataProvider({ children }) {
  const [db, setDb] = useState(load);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    } catch {
      /* storage full or unavailable — app keeps working in memory */
    }
  }, [db]);

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          setDb(parsed);
        } catch {
          // ignore invalid json
        }
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setCollection = useCallback((name, next) => {
    setDb((prev) => ({ ...prev, [name]: typeof next === "function" ? next(prev[name]) : next }));
  }, []);

  const updateItem = useCallback((name, id, changes) => {
    setDb((prev) => ({
      ...prev,
      [name]: (prev[name] || []).map((row) => {
        const key = row.id ?? row.number ?? row.name;
        return key === id ? { ...row, ...(typeof changes === "function" ? changes(row) : changes) } : row;
      }),
    }));
  }, []);

  const insertItem = useCallback((name, item, position = "top") => {
    setDb((prev) => {
      const rows = prev[name] || [];
      return { ...prev, [name]: position === "top" ? [item, ...rows] : [...rows, item] };
    });
  }, []);

  const removeItem = useCallback((name, id) => {
    setDb((prev) => ({
      ...prev,
      [name]: (prev[name] || []).filter((row) => (row.id ?? row.number ?? row.name) !== id),
    }));
  }, []);

  const reset = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setDb(seed());
  }, []);

  const value = useMemo(
    () => ({ db, setCollection, updateItem, insertItem, removeItem, reset }),
    [db, setCollection, updateItem, insertItem, removeItem, reset]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within DataProvider");
  return ctx;
}

export function useCollection(name) {
  const { db, updateItem, insertItem, removeItem } = useData();
  const items = db[name] || [];
  return useMemo(
    () => ({
      items,
      update: (id, changes) => updateItem(name, id, changes),
      insert: (item, position) => insertItem(name, item, position),
      remove: (id) => removeItem(name, id),
    }),
    [items, name, updateItem, insertItem, removeItem]
  );
}