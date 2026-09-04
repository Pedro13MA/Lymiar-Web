"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/", label: "Início", match: (p: string) => p === "/" },
  {
    href: "/categorias/",
    label: "Categorias",
    match: (p: string) => p.startsWith("/categoria"),
  },
  {
    href: "/search/",
    label: "Pesquisar",
    match: (p: string) => p.startsWith("/search"),
  },
  {
    href: "/notificacoes/",
    label: "Avisos",
    match: (p: string) =>
      p.startsWith("/notificacoes") || p.startsWith("/alertas"),
  },
  {
    href: "/minha-area/",
    label: "Perfil",
    match: (p: string) =>
      p.startsWith("/minha-area") ||
      p.startsWith("/perfil") ||
      p.startsWith("/entrar"),
  },
] as const;

export function BottomNavigation() {
  const pathname = usePathname() || "/";

  return (
    <nav
      aria-label="Navegação inferior"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-between px-1">
        {TABS.map((tab) => {
          const active = tab.match(pathname);
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                className={cn(
                  "flex min-h-11 flex-col items-center justify-center gap-0.5 px-1 py-2 text-[11px] touch-manipulation",
                  active
                    ? "font-semibold text-slate-900"
                    : "text-slate-500 hover:text-slate-800",
                )}
                aria-current={active ? "page" : undefined}
              >
                <span
                  className={cn(
                    "h-1 w-1 rounded-full",
                    active ? "bg-[var(--hm-brand,#ff6a1a)]" : "bg-transparent",
                  )}
                  aria-hidden
                />
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
