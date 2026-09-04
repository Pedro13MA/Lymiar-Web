"use client";

import Link from "next/link";
import { ExternalLink, Menu, User } from "lucide-react";
import { SearchBox } from "@/components/admin/shared/SearchBox";
import { NotificationDropdown } from "@/components/admin/shared/NotificationDropdown";
import type { AlertItem } from "@/types/admin";
import { cn } from "@/lib/utils";

type Props = {
  breadcrumb: string[];
  onOpenMobile: () => void;
  onOpenCommand: () => void;
  notifications?: AlertItem[];
  className?: string;
};

export function Topbar({
  breadcrumb,
  onOpenMobile,
  onOpenCommand,
  notifications = [],
  className,
}: Props) {
  return (
    <header
      className={cn(
        "sticky top-0 z-40 flex h-[var(--admin-topbar)] items-center gap-3 border-b border-slate-200/80 bg-white/95 px-4 backdrop-blur-md sm:px-6",
        className,
      )}
    >
      <button
        type="button"
        onClick={onOpenMobile}
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface-2)] text-[var(--admin-muted)] lg:hidden"
        aria-label="Abrir menu"
      >
        <Menu className="h-4 w-4" />
      </button>

      <nav className="hidden min-w-0 flex-1 items-center gap-1.5 text-xs text-[var(--admin-faint)] sm:flex">
        <Link href="/control-center" className="hover:text-[var(--admin-muted)]">
          Control Center
        </Link>
        {breadcrumb.map((crumb) => (
          <span key={crumb} className="flex items-center gap-1.5">
            <span>/</span>
            <span className="truncate text-[var(--admin-muted)]">{crumb}</span>
          </span>
        ))}
      </nav>

      <div className="ml-auto flex flex-1 items-center justify-end gap-2 sm:flex-none">
        <Link
          href="/"
          className="hidden items-center gap-1.5 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface-2)] px-3 py-1.5 text-xs text-[var(--admin-muted)] hover:text-[var(--admin-brand)] sm:inline-flex"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Site público
        </Link>
        <SearchBox
          className="hidden md:flex"
          placeholder="Pesquisar no Control Center…"
          onFocus={onOpenCommand}
        />
        <button
          type="button"
          onClick={onOpenCommand}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface-2)] text-[var(--admin-muted)] md:hidden"
          aria-label="Pesquisar"
        >
          <span className="text-xs">⌘K</span>
        </button>
        <NotificationDropdown items={notifications} />
        <Link
          href="/entrar/"
          className="flex h-9 items-center gap-2 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface-2)] px-2.5 text-xs text-[var(--admin-muted)]"
        >
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--admin-brand-soft)] text-[var(--admin-brand)]">
            <User className="h-3.5 w-3.5" />
          </span>
          <span className="hidden sm:inline">Conta</span>
        </Link>
      </div>
    </header>
  );
}
