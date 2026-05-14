import { createContext, useContext, useState, type ReactNode } from "react";

export type Role = "assistant" | "admin";

// Simple shared admin password. Change here to update.
export const ADMIN_PASSWORD = "fsadmin2024";

interface RoleContextType {
  role: Role;
  setRole: (role: Role) => void;
  isAdmin: boolean;
  /** Attempt to switch to admin with a password. Returns true if granted. */
  requestAdmin: (password: string) => boolean;
  /** Switch back to assistant view (no password required). */
  exitAdmin: () => void;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role>("assistant");

  const requestAdmin = (password: string) => {
    if (password === ADMIN_PASSWORD) {
      setRole("admin");
      return true;
    }
    return false;
  };

  const exitAdmin = () => setRole("assistant");

  return (
    <RoleContext.Provider value={{ role, setRole, isAdmin: role === "admin", requestAdmin, exitAdmin }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error("useRole must be used within RoleProvider");
  return ctx;
}
