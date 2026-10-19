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

export function normalizeServerOrder(o) {
  if (!o) return o;
  const tableNum = o.table || o.tables?.[0]?.table?.number || (o.type === "Dine-in" ? "1" : null);
  const waiterName = typeof o.waiter === "string" ? o.waiter : (o.waiter?.name || "Selam T.");
  const customerName = typeof o.customer === "string" ? o.customer : (o.customer?.name || null);
  const orderNum = o.number || (o.orderNumber ? String(o.orderNumber).replace(/^ORD-/, "") : String(o.id));
  const createdStr = o.created || (o.createdAt ? new Date(o.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "12:00");
  const ticketsArr = (o.tickets || []).map((t, idx) => ({
    ...t,
    round: t.round ?? t.roundNumber ?? (idx + 1),
    status: t.status || "Submitted",
    submittedAt: t.submittedAt || (t.createdAt ? new Date(t.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "12:00"),
    items: (t.items || []).map((ti) => ({
      ...ti,
      name: ti.name || ti.menuItem?.name || "Item",
      variant: ti.variant || ti.variantName || "Regular",
      qty: ti.qty ?? ti.quantity ?? 1,
      price: ti.price ?? (ti.unitPrice !== undefined ? Number(ti.unitPrice) : 0),
      cancelled: !!ti.cancelled || ti.status === "Cancelled",
      cancelReason: ti.cancelReason || ti.reason || "",
      addons: Array.isArray(ti.addons)
        ? ti.addons
        : (ti.addonsJson ? JSON.parse(ti.addonsJson) : []),
      note: ti.note || ti.notes || "",
    })),
  }));

  const invoiceStr = o.invoice?.invoiceNumber || (typeof o.invoice === "string" ? o.invoice : null);

  return {
    ...o,
    id: o.orderNumber || o.id,
    orderId: o.id,
    number: orderNum,
    table: tableNum,
    waiter: waiterName,
    customer: customerName,
    created: createdStr,
    guests: o.guests ?? o.guestCount ?? 1,
    status: o.status || "Active",
    type: o.type || (tableNum ? "Dine-in" : "Takeaway"),
    notes: o.notes || "",
    discount: Number(o.discountValue ?? o.discount ?? 0),
    invoice: invoiceStr,
    payments: o.payments || [],
    tickets: ticketsArr,
  };
}

export function normalizeServerTable(t, allOrders = []) {
  if (!t) return t;
  const activeOrd = t.activeOrder || null;
  let orderId = t.order || activeOrd?.orderNumber || (activeOrd?.id ? String(activeOrd.id) : null);
  let waiterName = t.waiter || activeOrd?.waiter?.name || (typeof activeOrd?.waiter === "string" ? activeOrd.waiter : null);

  // If table is Occupied but order link is missing, match from active orders
  if (!orderId && t.status === "Occupied" && Array.isArray(allOrders)) {
    const match = allOrders.find(
      (o) => String(o.table) === String(t.number) && o.status !== "Completed" && o.status !== "Cancelled"
    );
    if (match) {
      orderId = match.id || match.orderNumber;
      if (!waiterName) {
        waiterName = typeof match.waiter === "string" ? match.waiter : (match.waiter?.name || null);
      }
    }
  }

  return {
    ...t,
    id: t.id,
    number: String(t.number),
    seats: Number(t.seats || 2),
    section: t.section || "Main Hall",
    status: t.status || "Available",
    order: orderId || null,
    waiter: waiterName || null,
    reservation: t.reservation || null,
  };
}

export function normalizeServerReservation(r) {
  if (!r) return r;
  const customerName = typeof r.customer === "string" ? r.customer : (r.customer?.name || "Guest");
  const phoneStr = typeof r.phone === "string" ? r.phone : (r.customer?.phone || "");
  const tablesArr = Array.isArray(r.tables)
    ? r.tables.map((t) => (typeof t === "string" ? t : String(t.table?.number || t.number || t.tableId || t)))
    : ["1"];
  const resId = r.reservationNumber || r.id;
  const dateStr = r.date === "Today" || r.date === new Date().toISOString().slice(0, 10) ? "Today" : (r.date || "Today");

  return {
    ...r,
    id: resId,
    customer: customerName,
    phone: phoneStr,
    date: dateStr,
    time: r.time || "19:00",
    guests: Number(r.guests ?? r.guestCount ?? 2),
    tables: tablesArr,
    status: r.status || "Confirmed",
    notes: r.notes || "",
  };
}

export function normalizeServerCleaningTask(t) {
  if (!t) return t;
  const areaName = t.area || (t.table?.number ? `Table ${t.table.number}` : "Dining Room");
  const taskDesc = t.task || t.description || "Clean & reset table";
  const assigneeName = typeof t.assignee === "string" ? t.assignee : (t.assignedTo?.name || "Unassigned");
  const dueStr = t.due || (t.dueTime ? new Date(t.dueTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Now");
  const isTable = t.tableId || (areaName && areaName.toLowerCase().startsWith("table"));

  return {
    ...t,
    id: t.taskNumber || t.id,
    area: areaName,
    task: taskDesc,
    assignee: assigneeName,
    due: dueStr,
    status: t.isOverdue && t.status !== "Completed" ? "Overdue" : (t.status || "Pending"),
    type: isTable ? "table" : "area",
    source: t.source || (isTable ? "Table paid" : "Cleaning schedule"),
  };
}

export function normalizeServerInventoryItem(i) {
  if (!i) return i;
  const currentStock = Number(i.qty ?? i.currentStock ?? 0);
  const minStock = Number(i.min ?? i.minimumStock ?? 0);
  const reorderStock = Number(i.reorder ?? i.reorderQuantity ?? 0);
  const unitCost = Number(i.cost ?? i.costPerUnit ?? 0);
  const supplierName = typeof i.supplier === "string" ? i.supplier : (i.defaultSupplier?.name || "Default Supplier");
  const statusStr = i.status || (currentStock <= minStock ? "Low" : "OK");

  return {
    ...i,
    id: i.id || i.code,
    code: i.code || i.id,
    name: i.name,
    category: i.category || "General",
    baseUnit: i.baseUnit || "pieces",
    qty: currentStock,
    min: minStock,
    reorder: reorderStock,
    cost: unitCost,
    supplier: supplierName,
    status: statusStr,
  };
}

export function normalizeServerPurchase(p) {
  if (!p) return p;
  const supplierName = typeof p.supplier === "string" ? p.supplier : (p.supplier?.name || "Supplier");
  const dateStr = p.date || (p.requestedDate ? new Date(p.requestedDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10));
  const lineCount = Array.isArray(p.lines) ? p.lines.length : (typeof p.lines === "number" ? p.lines : 0);

  return {
    ...p,
    id: p.poNumber || p.id,
    supplier: supplierName,
    supplierId: p.supplierId || p.supplier?.id,
    date: dateStr,
    total: Number(p.totalAmount ?? p.total ?? 0),
    status: p.status || "Requested",
    emergency: !!p.emergency || !!p.isEmergency,
    reviewed: p.reviewed !== undefined ? p.reviewed : !!p.reviewedById,
    lines: lineCount,
    lineItems: Array.isArray(p.lines) ? p.lines : [],
  };
}


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

          let nextOrders = prev.orders;
          if (ordersRes.status === "fulfilled" && ordersRes.value?.orders && ordersRes.value.orders.length > 0) {
            nextOrders = ordersRes.value.orders.map(normalizeServerOrder);
            updated.orders = nextOrders;
          }
          if (tablesRes.status === "fulfilled" && tablesRes.value?.tables) {
            updated.tables = tablesRes.value.tables.map((t) => normalizeServerTable(t, nextOrders));
          }
          if (reservationsRes.status === "fulfilled" && reservationsRes.value?.reservations) {
            updated.reservations = reservationsRes.value.reservations.map(normalizeServerReservation);
          }
          if (cleaningRes.status === "fulfilled" && cleaningRes.value?.tasks) {
            updated.cleaningTasks = cleaningRes.value.tasks.map(normalizeServerCleaningTask);
          }
          if (invRes.status === "fulfilled" && (invRes.value?.items || Array.isArray(invRes.value))) {
            const rawItems = invRes.value.items || invRes.value;
            updated.inventoryItems = rawItems.map(normalizeServerInventoryItem);
          }
          if (purchasesRes.status === "fulfilled" && purchasesRes.value?.purchases) {
            updated.purchases = purchasesRes.value.purchases.map(normalizeServerPurchase);
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
        const normTable = normalizeServerTable(table, prev.orders);
        const existing = prev.tables || [];
        const index = existing.findIndex((t) => t.id === normTable.id || t.number === normTable.number);
        if (index !== -1) {
          const next = [...existing];
          next[index] = { ...next[index], ...normTable };
          return { ...prev, tables: next };
        }
        return { ...prev, tables: [...existing, normTable] };
      });
    });

    // 2. Table cleaning task assigned
    const unsubCleaning = subscribeToEvent("table:cleaning", ({ table, task }) => {
      setDb((prev) => {
        const normTable = table ? normalizeServerTable({ ...table, status: "Cleaning" }, prev.orders) : null;
        const normTask = task ? normalizeServerCleaningTask(task) : null;
        const nextTables = (prev.tables || []).map((t) =>
          t.id === normTable?.id || t.number === normTable?.number ? { ...t, ...normTable, status: "Cleaning" } : t
        );
        const nextTasks = normTask ? [normTask, ...(prev.cleaningTasks || [])] : prev.cleaningTasks;
        return { ...prev, tables: nextTables, cleaningTasks: nextTasks };
      });
    });

    // 3. Order status updates
    const unsubOrder = subscribeToEvent("order:updated", ({ order }) => {
      if (!order) return;
      setDb((prev) => {
        const normOrder = normalizeServerOrder(order);
        const existing = prev.orders || [];
        const index = existing.findIndex((o) => o.id === normOrder.id || o.orderNumber === normOrder.orderNumber);
        if (index !== -1) {
          const next = [...existing];
          next[index] = { ...next[index], ...normOrder };
          return { ...prev, orders: next };
        }
        return { ...prev, orders: [normOrder, ...existing] };
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