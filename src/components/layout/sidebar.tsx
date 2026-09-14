"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Kanban, UserCircle2, PauseCircle, Layers, Users, Building2, BarChart3, Settings, ChevronLeft, ChevronRight, X, ShieldCheck, ListChecks, FileSpreadsheet, History, Tags } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const NAV = [
  { href: "/pipeline", label: "Pipe Ativo", icon: Kanban },
  { href: "/minha-mesa", label: "Minha mesa", icon: UserCircle2 },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/on-hold", label: "On Hold / Inativo", icon: PauseCircle },
  { href: "/opportunities", label: "Todas as Oportunidades", icon: Layers },
  { href: "/originators", label: "Originadores", icon: Users },
  { href: "/companies", label: "Empresas", icon: Building2 },
  { href: "/reports", label: "Relatórios", icon: BarChart3 },
];

const ADMIN = [
  { href: "/admin/users", label: "Usuários", icon: ShieldCheck },
  { href: "/admin/operation-types", label: "Tipos de operação", icon: Tags },
  { href: "/admin/data-quality", label: "Data Quality", icon: ListChecks },
  { href: "/admin/imports", label: "Importações", icon: FileSpreadsheet },
  { href: "/admin/audit", label: "Auditoria", icon: History },
];

export function Sidebar({ collapsed, onToggle, isAdmin, mobileOpen, onMobileClose }: { collapsed: boolean; onToggle: () => void; isAdmin: boolean; mobileOpen: boolean; onMobileClose: () => void }) {
  const pathname = usePathname();
  const Item = ({ href, label, icon: Icon }: { href: string; label: string; icon: React.ComponentType<{ className?: string }> }) => {
    const active = pathname === href || pathname.startsWith(href + "/");
    const link = (
      <Link
        href={href}
        onClick={onMobileClose}
        className={cn(
          "group flex items-center gap-3 rounded-md px-2.5 py-2 text-[13px] font-medium transition-colors",
          active ? "bg-white/[0.08] text-white" : "text-sidebar-muted hover:bg-white/[0.05] hover:text-white",
          collapsed && "justify-center px-0",
        )}
      >
        <span className={cn("h-4 w-0.5 rounded-full -ml-2.5 transition-colors", active ? "bg-leto-green" : "bg-transparent", collapsed && "hidden")} />
        <Icon className={cn("h-4 w-4 shrink-0", active ? "text-leto-green" : "text-sidebar-muted group-hover:text-white")} />
        {!collapsed && <span className="truncate">{label}</span>}
      </Link>
    );
    if (!collapsed) return link;
    return (
      <Tooltip>
        <TooltipTrigger asChild>{link}</TooltipTrigger>
        <TooltipContent side="right">{label}</TooltipContent>
      </Tooltip>
    );
  };

  const content = (
    <div className="flex h-full flex-col">
      <div className={cn("flex items-center h-14 px-4 border-b border-sidebar-border", collapsed && "justify-center px-0")}>
        <Link href="/pipeline" className="flex items-center gap-2">
          {collapsed ? <Image src="/brand/leto-mark.svg" alt="Leto" width={28} height={28} /> : <Image src="/brand/leto-logo.svg" alt="Leto Capital" width={116} height={37} priority />}
        </Link>
        <button onClick={onMobileClose} className="ml-auto lg:hidden text-sidebar-muted hover:text-white">
          <X className="h-4 w-4" />
        </button>
      </div>
      {!collapsed && (
        <div className="px-4 pt-4 pb-1">
          <p className="text-[13px] font-bold uppercase tracking-[0.18em] text-leto-green">Special Situations</p>
          <p className="text-[10px] text-sidebar-muted mt-0.5">Pipeline de originação &amp; oportunidades</p>
        </div>
      )}
      <nav className={cn("flex-1 overflow-y-auto px-3 py-3 space-y-0.5", collapsed && "px-2")}>
        {NAV.map((n) => (
          <Item key={n.href} {...n} />
        ))}
        {isAdmin && (
          <>
            <div className={cn("pt-4 pb-1 px-2.5 text-[10px] font-semibold uppercase tracking-wider text-sidebar-muted/70", collapsed && "px-0 text-center")}>{collapsed ? "·" : "Administração"}</div>
            {collapsed ? <Item href="/admin/users" label="Administração" icon={Settings} /> : ADMIN.map((n) => <Item key={n.href} {...n} />)}
          </>
        )}
      </nav>
      <div className="border-t border-sidebar-border p-2 hidden lg:block">
        <button onClick={onToggle} className="w-full flex items-center justify-center gap-2 rounded-md py-1.5 text-xs text-sidebar-muted hover:bg-white/[0.05] hover:text-white">
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          {!collapsed && "Recolher"}
        </button>
      </div>
    </div>
  );

  return (
    <>
      <aside className={cn("hidden lg:block fixed inset-y-0 left-0 z-30 bg-sidebar text-sidebar-foreground transition-[width] duration-200", collapsed ? "w-[64px]" : "w-[232px]")}>{content}</aside>
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-leto-ink/60" onClick={onMobileClose} />
          <aside className="absolute inset-y-0 left-0 w-[260px] bg-sidebar text-sidebar-foreground shadow-pop">{content}</aside>
        </div>
      )}
    </>
  );
}
