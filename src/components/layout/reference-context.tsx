"use client";

import { createContext, useContext } from "react";

export interface ReferenceData {
  types: { id: string; name: string; category: string; color: string | null }[];
  statuses: { id: string; key: string; name: string; group: string; color: string | null }[];
  users: { id: string; name: string; initials: string | null; color: string | null }[];
}

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "USER";
  initials: string;
  color: string | null;
}

const RefCtx = createContext<{ reference: ReferenceData; user: CurrentUser } | null>(null);

export function ReferenceProvider({ reference, user, children }: { reference: ReferenceData; user: CurrentUser; children: React.ReactNode }) {
  return <RefCtx.Provider value={{ reference, user }}>{children}</RefCtx.Provider>;
}

export function useReference(): ReferenceData {
  const ctx = useContext(RefCtx);
  if (!ctx) throw new Error("useReference must be used within ReferenceProvider");
  return ctx.reference;
}

export function useCurrentUser(): CurrentUser {
  const ctx = useContext(RefCtx);
  if (!ctx) throw new Error("useCurrentUser must be used within ReferenceProvider");
  return ctx.user;
}
