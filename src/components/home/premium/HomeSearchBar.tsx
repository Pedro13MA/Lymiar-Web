"use client";

import Link from "next/link";
import { SearchTypeahead } from "@/components/search/SearchTypeahead";
import {
  HOME_HERO_SEARCH_ID,
  useHeaderSearchVisibility,
} from "@/hooks/useHeaderSearchVisibility";

/** Pesquisa homepage — CTA principal; “engole” para o header ao fazer scroll. */
export function HomeSearchBar({ autoFocus }: { autoFocus?: boolean }) {
  const { isHeroSearchVisible, isHome } = useHeaderSearchVisibility();
  const swallowed = isHome && !isHeroSearchVisible;

  return (
    <div
      id={HOME_HERO_SEARCH_ID}
      className={`home-search-shell overflow-hidden rounded-[1.15rem] ${
        swallowed ? "home-search-shell--swallowed" : ""
      }`}
    >
      <SearchTypeahead
        autoFocus={autoFocus}
        placeholder="SSD, iPhone, Air Fryer, RTX…"
        className="min-w-0 flex-1"
        inputClassName="home-search-input h-12 rounded-xl border-0 bg-transparent pl-12 text-base text-[var(--hm-ink)] shadow-none placeholder:text-[var(--hm-faint,#94a3b8)] focus-visible:ring-0 sm:h-14 sm:text-lg"
      />
      <Link href="/search/" className="home-search-cta text-sm sm:text-base">
        Explorar
      </Link>
    </div>
  );
}
