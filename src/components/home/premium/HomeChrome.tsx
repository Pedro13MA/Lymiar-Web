"use client";

import Link from "next/link";
import { TELEGRAM_CHANNEL, BRAND_TAGLINE } from "@/lib/constants";
import { CATEGORY_MENU_L1 } from "@/lib/category-slugs";
import { LymiarLogo } from "@/components/ui/LymiarLogo";
import { HomeAccountMenu } from "@/components/home/premium/HomeAccountMenu";
import { SearchTypeahead } from "@/components/search/SearchTypeahead";
import { useHeaderSearchVisibility } from "@/hooks/useHeaderSearchVisibility";

export function HomeHeader() {
  const { showHeaderSearch } = useHeaderSearchVisibility();

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex h-12 max-w-6xl items-center gap-3 px-4 sm:px-6 lg:max-w-7xl lg:gap-4">
        <Link href="/" className="flex shrink-0 items-center" aria-label="Lymiar — início">
          <LymiarLogo size={32} variant="horizontal" alt="Lymiar" priority />
        </Link>
        <nav
          className="hidden items-center gap-4 text-sm text-slate-500 lg:flex"
          aria-label="Principal"
        >
          <Link href="/categorias/" className="text-slate-500 hover:text-slate-900">
            Categorias
          </Link>
        </nav>
        <div
          className={`header-search-slot ${
            showHeaderSearch
              ? "header-search-slot--in"
              : "header-search-slot--out"
          }`}
          role={showHeaderSearch ? "search" : undefined}
          aria-hidden={!showHeaderSearch}
        >
          <SearchTypeahead compact placeholder="Procurar produto…" />
        </div>
        {!showHeaderSearch ? <div className="min-w-0 flex-1" aria-hidden /> : null}
        <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
          <HomeAccountMenu />
        </div>
      </div>
    </header>
  );
}

export function HomeFooter() {
  const columns = [
    {
      title: "Produto",
      links: [
        { href: "/categorias/", label: "Categorias" },
        { href: "/mercado/", label: "Mercado" },
        { href: "/catalog/", label: "Explorar" },
      ],
    },
    {
      title: "Área",
      links: [
        { href: "/entrar/", label: "Entrar" },
        { href: "/minha-area/", label: "Resumo" },
        { href: "/favoritos/", label: "Favoritos" },
        { href: "/comparar/", label: "Comparador" },
      ],
    },
    {
      title: "Categorias",
      links: CATEGORY_MENU_L1.slice(0, 4).map((c) => ({
        href: `/categoria/${c.slug}/`,
        label: c.label,
      })),
    },
    {
      title: "Canal",
      links: [{ href: TELEGRAM_CHANNEL, label: "Telegram", external: true }],
    },
  ] as const;

  return (
    <footer className="border-t border-slate-200 bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:max-w-7xl">
        <div className="flex flex-col gap-12 lg:flex-row lg:justify-between">
          <div className="max-w-xs">
            <LymiarLogo size={48} variant="horizontal" alt="Lymiar" />
            <p className="mt-5 text-[15px] leading-relaxed text-slate-500">
              {BRAND_TAGLINE}
            </p>
            <p className="mt-3 text-sm text-slate-400">
              Preços observados em Portugal — sem previsões inventadas.
            </p>
          </div>
          <div className="grid flex-1 grid-cols-2 gap-8 sm:grid-cols-4">
            {columns.map((col) => (
              <div key={col.title}>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  {col.title}
                </p>
                <ul className="mt-4 space-y-2.5">
                  {col.links.map((link) => (
                    <li key={link.href}>
                      {"external" in link && link.external ? (
                        <a
                          href={link.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[15px] text-slate-600 hover:text-[var(--hm-brand)]"
                        >
                          {link.label}
                        </a>
                      ) : (
                        <Link
                          href={link.href}
                          className="text-[15px] text-slate-600 hover:text-[var(--hm-brand)]"
                        >
                          {link.label}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <p className="mt-14 border-t border-slate-200 pt-8 text-xs text-slate-400">
          © {new Date().getFullYear()} Lymiar · Preços observados · Sem previsões inventadas
        </p>
      </div>
    </footer>
  );
}
