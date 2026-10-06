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
  waiter: ["Selam T."],
  cleaner: ["Tigist"],
  kitchen: [],
  inventory: [],
  security: [],
};

/** Role id → shorter labels the data uses for the same role. */
const LABELS = {
  inventory: ["Inventory"],
};

function roleName(role) {
  return ROLES.find((r) => r.id === role)?.name || "";
}

/** Every name a role may own records under: its role label plus its persona. */
function owners(role) {
  return [roleName(role), ...(LABELS[role] || []), ...(PERSONA[role] || [])].filter(Boolean);
}

/** True when `value` is one of the names this role owns. */
function ownedBy(value, role) {
  return owners(role).includes(value);
}

/** Matches an owner that carries extra detail, such as "Solomon (vendor: GenPro)". */
function ownedByDetail(value, role) {
  if (typeof value !== "string") return false;
  return owners(role).some((name) => value.startsWith(`${name} (`));
}

/** True when this role sees every record of a kind. */
function seesAll(role) {
  return isPrivileged(role) || role === "kitchen" || role === "inventory";
}

/** Orders: a waiter works the orders they own. Everyone else works the live queue. */
export function visibleOrders(orders, role) {
  if (seesAll(role)) return orders;
  return orders.filter((o) => ownedBy(o.waiter, role));
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
