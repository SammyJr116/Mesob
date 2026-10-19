import { ROLES, isPrivileged } from "./roles.js";

/* Role scoping.
 *
 * The Manager and Administrator see the whole floor, as do Kitchen and
 * Inventory Staff — they work off the live queue. The remaining roles only see
 * the records they are actually responsible for, so the shared pages (orders,
 * cleaning, incidents, maintenance) return different rows depending on who is
 * signed in rather than byte-identical data.
 *
 * Signing in here picks a *role*, not a named person, so "my records" cannot be
 * keyed off a real user id. Ownership in the data is recorded two different
 * ways, and a record counts as yours if it matches either one:
 *
 *   - by role name — `reported: "Waiter"` on incidents and maintenance
 *   - by person name — `waiter: "Selam T."` on orders, `assignee: "Tigist"`
 *     on cleaning
 *
 * LABELS covers records that shorten a role's display name, such as the
 * "Inventory Staff" role being recorded as "Inventory".
 *
 * PERSONA bridges the two: the seeded colleague whose records a role owns. It is
 * a stand-in for a real signed-in user, so treat it as demo wiring rather than
 * an identity system. Add an entry here when a role needs to own records. */

/** Role id → the seeded person whose records that role is responsible for. */
const PERSONA = {
  waiter: ["Selam T.", "Dawit M.", "Hanna L.", "Waiter"],
  cleaner: ["Tigist", "Tigist A.", "Solomon", "Solomon G."],
  kitchen: ["Chef Abebe", "Abebe"],
  inventory: ["Yonas", "Yonas K."],
  security: ["Robel", "Robel S."],
};

/** Role id → shorter labels the data uses for the same role. */
const LABELS = {
  inventory: ["Inventory"],
};

function roleName(role) {
  return ROLES.find((r) => r.id === role)?.name || "";
}

/** Every name a role may own records under: its role label plus its persona. */
export function owners(role) {
  return [roleName(role), ...(LABELS[role] || []), ...(PERSONA[role] || [])].filter(Boolean);
}

/** True when `value` is one of the names this role owns. */
export function ownedBy(value, role) {
  if (!value) return false;
  return owners(role).some((o) => o.toLowerCase() === String(value).toLowerCase());
}

/** Matches an owner that carries extra detail, such as "Solomon (vendor: GenPro)". */
export function ownedByDetail(value, role) {
  if (typeof value !== "string") return false;
  return owners(role).some((name) => value.startsWith(`${name} (`));
}

/** True when this role sees every record of a kind.
 * Per PRD 3.2.4 & 9.9.3: All waiters see all tables and orders. */
export function seesAll(role) {
  return isPrivileged(role) || role === "kitchen" || role === "inventory" || role === "waiter";
}

/** Orders: all waiters, managers, kitchen and inventory see all orders (PRD 9.9.3). */
export function visibleOrders(orders, role) {
  if (!orders || !Array.isArray(orders)) return [];
  if (seesAll(role)) return orders;
  return orders.filter((o) => {
    const waiter = typeof o.waiter === "string" ? o.waiter : (o.waiter?.name || "");
    return ownedBy(waiter, role);
  });
}

/** True when user has edit authority on an order (Manager or the owning Waiter, PRD 9.9.3). */
export function canEditOrder(order, role, currentUserName = "") {
  if (isPrivileged(role)) return true;
  if (role !== "waiter") return false;
  const waiterStr = typeof order?.waiter === "string" ? order.waiter : (order?.waiter?.name || "");
  if (!waiterStr) return true;
  if (currentUserName && waiterStr.toLowerCase().includes(currentUserName.toLowerCase())) return true;
  return ownedBy(waiterStr, role);
}

/** Cleaning: a cleaner sees their own assignments plus the shared queue. */
export function visibleCleaningTasks(tasks, role) {
  if (isPrivileged(role)) return tasks;
  return tasks.filter((t) => t.assignee === "Unassigned" || ownedBy(t.assignee, role));
}

/** Incidents: Security starts the review and the Manager resolves, so both see all. */
export function visibleIncidents(incidents, role) {
  if (isPrivileged(role) || role === "security") return incidents;
  return incidents.filter((i) => ownedBy(i.reported, role));
}

/** Maintenance: the Manager assigns the work, others see what they reported or own. */
export function visibleMaintenanceRequests(requests, role) {
  if (isPrivileged(role)) return requests;
  return requests.filter(
    (m) => ownedBy(m.reported, role) || ownedBy(m.assignee, role) || ownedByDetail(m.assignee, role)
  );
}
