import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { ROLES } from "./roles";
import { authApi } from "@/api/client";

const RoleContext = createContext(null);

export function RoleProvider({ children }) {
  const [role, setRoleState] = useState(() => localStorage.getItem("rms_role") || null);
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem("rms_user");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const setRole = useCallback((newRole) => {
    setRoleState(newRole);
    if (newRole) {
      localStorage.setItem("rms_role", newRole);
    } else {
      localStorage.removeItem("rms_role");
      localStorage.removeItem("rms_user");
      setUser(null);
    }
  }, []);

  const login = useCallback(async (credentials) => {
    const res = await authApi.login(credentials);
    const serverUser = res?.user;
    if (serverUser) {
      const clientRole = (serverUser.role || "waiter").toLowerCase();
      setUser(serverUser);
      localStorage.setItem("rms_user", JSON.stringify(serverUser));
      setRoleState(clientRole);
      localStorage.setItem("rms_role", clientRole);
      return serverUser;
    }
    throw new Error("Invalid response from server");
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // ignore network errors on logout
    } finally {
      setRole(null);
    }
  }, [setRole]);

  // Try to restore user profile from server session on mount if role exists
  useEffect(() => {
    let mounted = true;
    if (role && !user) {
      authApi.me()
        .then((res) => {
          if (mounted && res?.user) {
            setUser(res.user);
            localStorage.setItem("rms_user", JSON.stringify(res.user));
            const clientRole = (res.user.role || "").toLowerCase();
            if (clientRole && clientRole !== role) {
              setRoleState(clientRole);
              localStorage.setItem("rms_role", clientRole);
            }
          }
        })
        .catch(() => {
          // Keep offline state
        });
    }
    return () => {
      mounted = false;
    };
  }, [role, user]);

  const current = ROLES.find((r) => r.id === role) || null;

  return (
    <RoleContext.Provider value={{ role, setRole, user, setUser, login, logout, current }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error("useRole must be used within RoleProvider");
  return ctx;
}