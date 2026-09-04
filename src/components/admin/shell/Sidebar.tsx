"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Brain,
  ChevronLeft,
  ChevronRight,
  Database,
  ExternalLink,
  LayoutDashboard,
  Link2,
  Package,
  ScrollText,
  Server,
  Settings,
  Store,
  Users,
  X,
} from "lucide-react";
import { LymiarLogo } from "@/components/ui/LymiarLogo";
import { ADMIN_NAV } from "@/services/admin/navigation";
import { cn } from "@/lib/utils";

const ICONS = {
  LayoutDashboard,
  Package,
  Link2,
  Brain,
  Users,
  BarChart3,
  Store,
  Database,
  Server,
  ScrollText,
  Settings,
} as const;

type Props = {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
};

export function Sidebar({
  collapsed,
  onToggleCollapsed,
  mobileOpen,
  onCloseMobile,
}: Props) {
  const pathname = usePathname();

  const nav = (
    <nav className="flex flex-1 flex-col gap-0.5 px-2 py-3">
      {ADMIN_NAV.map((item) => {
        const Icon = ICONS[item.icon as keyof typeof ICONS] ?? LayoutDashboard;
        const p = (pathname || "").replace(/\/$/, "") || "/";
        const active =
          item.href === "/control-center"
            ? p === "/control-center"
            : p === item.href || p.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.id}
            href={item.href}
            onClick={onCloseMobile}
            title={item.label}
            className={cn(
              "group flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm transition",
              active
                ? "bg-[var(--admin-brand-soft)] font-medium text-[var(--admin-brand-deep)]"
                : "text-[var(--admin-muted)] hover:bg-[var(--admin-hover)] hover:text-[var(--admin-text)]",
              collapsed && "justify-center px-0",
            )}
          >
            <Icon
              className={cn(
                "h-4 w-4 shrink-0",
                active
                  ? "text-[var(--admin-brand)]"
                  : "text-[var(--admin-faint)] group-hover:text-[var(--admin-muted)]",
              )}
            />
            {!collapsed ? <span className="truncate">{item.label}</span> : null}
          </Link>
        );
      })}
    </nav>
  );

  const panel = (
    <div className="flex h-full flex-col">
      <div
        className={cn(
          "flex h-[var(--admin-topbar)] items-center border-b border-[var(--admin-border)] px-3",
          collapsed ? "justify-center" : "justify-between",
        )}
      >
        <Link href="/control-center" className="flex items-center gap-2" onClick={onCloseMobile}>
          {collapsed ? (
            <LymiarLogo variant="mark" size={28} alt="LYMIAR" />
          ) : (
            <LymiarLogo variant="horizontal" size={28} alt="LYMIAR" />
          )}
        </Link>
        {!collapsed ? (
          <button
            type="button"
            onClick={onToggleCollapsed}
            className="hidden rounded-md p-1.5 text-[var(--admin-faint)] hover:bg-[var(--admin-hover)] hover:text-[var(--admin-text)] lg:inline-flex"
            aria-label="Colapsar sidebar"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={onToggleCollapsed}
            className="absolute -right-3 top-4 hidden h-6 w-6 items-center justify-center rounded-full border border-[var(--admin-border)] bg-[var(--admin-surface)] text-[var(--admin-muted)] lg:flex"
            aria-label="Expandir sidebar"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        )}
        <button
          type="button"
          onClick={onCloseMobile}
          className="rounded-md p-1.5 text-[var(--admin-muted)] hover:bg-[var(--admin-hover)] lg:hidden"
          aria-label="Fechar menu"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      {nav}
      <div className="border-t border-[var(--admin-border)] px-2 py-2">
        <Link
          href="/"
          onClick={onCloseMobile}
          className={cn(
            "flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm text-[var(--admin-muted)] hover:bg-[var(--admin-hover)] hover:text-[var(--admin-text)]",
            collapsed && "justify-center px-0",
          )}
        >
          <ExternalLink className="h-4 w-4 shrink-0" />
          {!collapsed ? <span>Voltar ao site</span> : null}
        </Link>
      </div>
      <div className="border-t border-[var(--admin-border)] px-3 py-3">
        <p
          className={cn(
            "text-[10px] uppercase tracking-[0.08em] text-[var(--admin-faint)]",
            collapsed && "text-center",
          )}
        >
          {collapsed ? "CC" : "Control Center"}
        </p>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop */}
      <aside
        className={cn(
          "relative hidden h-screen shrink-0 border-r border-slate-200/80 bg-white transition-[width] duration-200 lg:sticky lg:top-0 lg:block",
          collapsed ? "w-[var(--admin-sidebar-collapsed)]" : "w-[var(--admin-sidebar)]",
        )}
      >
        {panel}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen ? (
        <div className="fixed inset-0 z-[70] lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/40"
            aria-label="Fechar"
            onClick={onCloseMobile}
          />
          <aside className="absolute left-0 top-0 h-full w-[var(--admin-sidebar)] border-r border-slate-200/80 bg-white shadow-xl">
            {panel}
          </aside>
        </div>
      ) : null}
    </>
  );
}
