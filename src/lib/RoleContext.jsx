import { createContext, useContext, useState, useEffect } from "react";
import { ROLES } from "./mockData";

const RoleContext = createContext(null);

export function RoleProvider({ children }) {
  const [role, setRole] = useState(() => localStorage.getItem("rms_role") || null);

  useEffect(() => {
    if (role) localStorage.setItem("rms_role", role);
    else localStorage.removeItem("rms_role");
  }, [role]);

  const current = ROLES.find((r) => r.id === role) || null;
  return (
    <RoleContext.Provider value={{ role, setRole, current }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error("useRole must be used within RoleProvider");
  return ctx;
}