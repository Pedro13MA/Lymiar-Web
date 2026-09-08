"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { LymiarLogo } from "@/components/ui/LymiarLogo";
import { UserMenu } from "@/components/auth/UserMenu";
import { NotificationBell } from "@/components/notifications/NotificationBell";

import { MegaMenu, MegaMenuTrigger } from "@/components/nav/MegaMenu";
import { useTaxonomyNav } from "@/components/nav/TaxonomyTreeProvider";
import { SearchTypeahead } from "@/components/search/SearchTypeahead";
import { useHeaderSearchVisibility } from "@/hooks/useHeaderSearchVisibility";

export function SiteHeaderP32() {
  const { megaMenu, loading } = useTaxonomyNav();
  const [menuOpen, setMenuOpen] = useState(false);
  const triggerId = useId();
  const { showHeaderSearch } = useHeaderSearchVisibility();

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur-md">
      <div className="relative mx-auto flex h-12 max-w-6xl items-center gap-3 px-4 sm:px-6 lg:max-w-7xl lg:gap-4">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 font-display text-lg font-semibold tracking-tight text-slate-900"
          aria-label="Lymiar — início"
        >
          <LymiarLogo size={32} variant="horizontal" alt="Lymiar" priority />
        </Link>

        <nav
          className="flex shrink-0 items-center gap-3"
          aria-label="Principal"
        >
          <MegaMenuTrigger
            id={triggerId}
            open={menuOpen}
            onOpenChange={setMenuOpen}
          />
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
          <SearchTypeahead compact placeholder="Pesquisar produto…" />
        </div>

        {!showHeaderSearch ? <div className="min-w-0 flex-1" aria-hidden /> : null}

        <div className="ml-auto flex shrink-0 items-center gap-2">
          <NotificationBell />
          <UserMenu />
        </div>

        {!loading && megaMenu ? (
          <MegaMenu
            model={megaMenu}
            open={menuOpen}
            onOpenChange={setMenuOpen}
            triggerId={triggerId}
          />
        ) : null}
      </div>
    </header>
  );
}
