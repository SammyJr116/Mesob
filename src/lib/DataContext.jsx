import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  restaurant,
  tables,
  menuCategories,
  menuItems,
  recipes,
  orders,
  creditNotes,
  dayClosures,
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
import {
  api,
  ordersApi,
  tablesApi,
  cleaningApi,
  reservationsApi,
  inventoryApi,
  purchasingApi,
} from "@/api/client";
import { initSocket, subscribeToEvent } from "@/api/socket";

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
    dayClosures: clone(dayClosures),
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
    return { ...base, ...parsed, restaurant: { ...base.restaurant, ...(parsed.restaurant || {}) } };
  } catch {
    return seed();
  }
}

const DataContext = createContext(null);

export function DataProvider({ children }) {
  const [db, setDb] = useState(load);
  const [isServerConnected, setIsServerConnected] = useState(false);

  // Sync to localStorage as optimistic fallback
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    } catch {
      /* storage full or private browsing — keep in memory */
    }
  }, [db]);

  // Handle multi-tab storage sync
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          setDb(parsed);
        } catch {
          // ignore
        }
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // Fetch initial data from server if backend is running (Task 6.1.2)
  useEffect(() => {
    let isMounted = true;

    async function syncFromServer() {
      try {
        const health = await api.get("/health").catch(() => null);
        if (!health || health.status !== "ok") {
          return;
        }

        if (isMounted) setIsServerConnected(true);

        // Fetch primary collections concurrently
        const [
          tablesRes,
          ordersRes,
          reservationsRes,
          cleaningRes,
          invRes,
          purchasesRes,
        ] = await Promise.allSettled([
          tablesApi.list(),
          ordersApi.list(),
          reservationsApi.list(),
          cleaningApi.listTasks(),
          inventoryApi.list(),
          purchasingApi.list(),
        ]);

        if (!isMounted) return;

        setDb((prev) => {
          const updated = { ...prev };

          if (tablesRes.status === "fulfilled" && tablesRes.value?.tables) {
            updated.tables = tablesRes.value.tables;
          }
          if (ordersRes.status === "fulfilled" && ordersRes.value?.orders) {
            updated.orders = ordersRes.value.orders;
          }
          if (reservationsRes.status === "fulfilled" && reservationsRes.value?.reservations) {
            updated.reservations = reservationsRes.value.reservations;
          }
          if (cleaningRes.status === "fulfilled" && cleaningRes.value?.tasks) {
            updated.cleaningTasks = cleaningRes.value.tasks;
          }
          if (invRes.status === "fulfilled" && invRes.value?.items) {
            updated.inventoryItems = invRes.value.items;
          }
          if (purchasesRes.status === "fulfilled" && purchasesRes.value?.purchases) {
            updated.purchases = purchasesRes.value.purchases;
          }

          return updated;
        });
      } catch (err) {
        // Server might be booting or offline; local storage fallback active
        console.debug("Backend server synchronization deferred:", err);
      }
    }

    syncFromServer();

    return () => {
      isMounted = false;
    };
  }, []);

  // Wire Socket.io real-time inbound events (Task 6.1.3)
  useEffect(() => {
    try {
      initSocket();
    } catch {
      // socket init graceful error
    }

    // 1. Table status updates
    const unsubTable = subscribeToEvent("table:updated", ({ table }) => {
      if (!table) return;
      setDb((prev) => {
        const existing = prev.tables || [];
        const index = existing.findIndex((t) => t.id === table.id || t.number === table.number);
        if (index !== -1) {
          const next = [...existing];
          next[index] = { ...next[index], ...table };
          return { ...prev, tables: next };
        }
        return { ...prev, tables: [...existing, table] };
      });
    });

    // 2. Table cleaning task assigned
    const unsubCleaning = subscribeToEvent("table:cleaning", ({ table, task }) => {
      setDb((prev) => {
        const nextTables = (prev.tables || []).map((t) =>
          t.id === table?.id || t.number === table?.number ? { ...t, status: "Cleaning" } : t
        );
        const nextTasks = task ? [task, ...(prev.cleaningTasks || [])] : prev.cleaningTasks;
        return { ...prev, tables: nextTables, cleaningTasks: nextTasks };
      });
    });

    // 3. Order status updates
    const unsubOrder = subscribeToEvent("order:updated", ({ order }) => {
      if (!order) return;
      setDb((prev) => {
        const existing = prev.orders || [];
        const index = existing.findIndex((o) => o.id === order.id || o.orderNumber === order.orderNumber);
        if (index !== -1) {
          const next = [...existing];
          next[index] = { ...next[index], ...order };
          return { ...prev, orders: next };
        }
        return { ...prev, orders: [order, ...existing] };
      });
    });

    // 4. Ticket ready / status changes
    const unsubTicketReady = subscribeToEvent("ticket:ready", ({ ticket }) => {
      if (!ticket) return;
      setDb((prev) => {
        const nextOrders = (prev.orders || []).map((ord) => {
          if (ord.id === ticket.orderId || ord.orderNumber === ticket.orderNumber) {
            const nextTickets = (ord.tickets || []).map((t) =>
              t.id === ticket.id || t.roundNumber === ticket.roundNumber ? { ...t, ...ticket, status: "Ready" } : t
            );
            return { ...ord, tickets: nextTickets };
          }
          return ord;
        });
        return { ...prev, orders: nextOrders };
      });
    });

    const unsubTicketStatus = subscribeToEvent("ticket:status_changed", ({ ticket }) => {
      if (!ticket) return;
      setDb((prev) => {
        const nextOrders = (prev.orders || []).map((ord) => {
          if (ord.id === ticket.orderId) {
            const nextTickets = (ord.tickets || []).map((t) =>
              t.id === ticket.id ? { ...t, ...ticket } : t
            );
            return { ...ord, tickets: nextTickets };
          }
          return ord;
        });
        return { ...prev, orders: nextOrders };
      });
    });

    // 5. Reservation no-show releases
    const unsubNoShow = subscribeToEvent("reservation:no_show", ({ reservation }) => {
      if (!reservation) return;
      setDb((prev) => {
        const nextRes = (prev.reservations || []).map((r) =>
          r.id === reservation.id ? { ...r, status: "No Show" } : r
        );
        return { ...prev, reservations: nextRes };
      });
    });

    // 6. Menu item availability toggle
    const unsubMenuUnavail = subscribeToEvent("menu:item_unavailable", ({ item }) => {
      if (!item) return;
      setDb((prev) => ({
        ...prev,
        menuItems: (prev.menuItems || []).map((m) =>
          m.id === item.id ? { ...m, ...item, manualAvailable: false, isAutoUnavailable: true } : m
        ),
      }));
    });

    const unsubMenuAvail = subscribeToEvent("menu:item_available", ({ item }) => {
      if (!item) return;
      setDb((prev) => ({
        ...prev,
        menuItems: (prev.menuItems || []).map((m) =>
          m.id === item.id ? { ...m, ...item, manualAvailable: true, isAutoUnavailable: false } : m
        ),
      }));
    });

    return () => {
      unsubTable();
      unsubCleaning();
      unsubOrder();
      unsubTicketReady();
      unsubTicketStatus();
      unsubNoShow();
      unsubMenuUnavail();
      unsubMenuAvail();
    };
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

    // Async server syncing (best effort optimistic sync)
    if (name === "tables" && typeof changes === "object" && changes.status) {
      tablesApi.updateStatus(id, changes.status).catch(() => {});
    } else if (name === "cleaningTasks" && typeof changes === "object" && changes.status === "Completed") {
      cleaningApi.completeTask(id, changes.notes).catch(() => {});
    } else if (name === "reservations" && typeof changes === "object" && changes.status) {
      reservationsApi.updateStatus(id, changes.status, changes.notes).catch(() => {});
    }
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
    () => ({ db, setCollection, updateItem, insertItem, removeItem, reset, isServerConnected }),
    [db, setCollection, updateItem, insertItem, removeItem, reset, isServerConnected]
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