"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { ReferenceProvider, type CurrentUser, type ReferenceData } from "./reference-context";
import { cn } from "@/lib/utils";

export function AppShell({ user, reference, children }: { user: CurrentUser; reference: ReferenceData; children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem("leto:sidebar") === "collapsed");
    } catch {}
  }, []);
  function toggle() {
    setCollapsed((c) => {
      try {
        localStorage.setItem("leto:sidebar", c ? "expanded" : "collapsed");
      } catch {}
      return !c;
    });
  }
  return (
    <ReferenceProvider reference={reference} user={user}>
      <div className="min-h-screen flex">
        <Sidebar collapsed={collapsed} onToggle={toggle} isAdmin={user.role === "ADMIN"} mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />
        <div className={cn("flex-1 min-w-0 flex flex-col transition-[margin] duration-200", collapsed ? "lg:ml-[64px]" : "lg:ml-[232px]")}>
          <Topbar onMenu={() => setMobileOpen(true)} />
          <main className="flex-1 px-4 py-4 lg:px-6 lg:py-5 animate-fade-in">{children}</main>
        </div>
      </div>
    </ReferenceProvider>
  );
}
