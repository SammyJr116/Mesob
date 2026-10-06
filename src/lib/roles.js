export const ROLES = [
  { id: "manager", name: "Manager", device: "Desktop", home: "/dashboard" },
  { id: "admin", name: "Administrator", device: "Desktop", home: "/users" },
  { id: "kitchen", name: "Kitchen", device: "Tablet", home: "/kitchen" },
  { id: "waiter", name: "Waiter", device: "Tablet", home: "/tables" },
  { id: "inventory", name: "Inventory Staff", device: "Desktop", home: "/inventory" },
  { id: "cleaner", name: "Cleaner", device: "Phone", home: "/my-tasks" },
  { id: "security", name: "Security", device: "Phone", home: "/visitors" },
];

/* Privileged roles: admin gets the same operational reach as the manager
   because in this deployment the two are the same trust boundary. */
export const PRIVILEGED_ROLES = ["manager", "admin"];

export function isPrivileged(role) {
  return PRIVILEGED_ROLES.includes(role);
}

/** Where `/` should land for a role, so a cleaner never sees the manager dashboard. */
export function homeFor(role) {
  return ROLES.find((r) => r.id === role)?.home || "/dashboard";
}