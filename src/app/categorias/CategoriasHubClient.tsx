"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getCategories, type CategorySummary } from "@/lib/api";
import { CATEGORY_MENU_L1 } from "@/lib/category-slugs";
import { isP32NavigationEnabled } from "@/lib/nav/flags";
import { useTaxonomyNavOptional } from "@/components/nav/TaxonomyTreeProvider";
import {
  MegaMenuBrands,
  MegaMenuColumn,
} from "@/components/nav/MegaMenuParts";
import { CategoryHero } from "@/components/nav/CategoryLayout";
import type { NavL1Column } from "@/lib/nav/types";

function LegacyHub() {
  const [categories, setCategories] = useState<CategorySummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getCategories()
      .then((res) => {
        if (!cancelled) setCategories(res.categories || []);
      })
      .catch(() => {
        if (!cancelled) {
          setCategories(
            CATEGORY_MENU_L1.map((c) => ({
              slug: c.slug,
              display_name: c.label,
              level: 1,
              children_count: 0,
              seo: {
                slug: c.slug,
                title: c.label,
                description: "",
                canonical_url: `/categoria/${c.slug}/`,
              },
            })),
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:max-w-7xl">
      <p className="catalog-kicker">Explorar</p>
      <h1 className="mt-2 font-display text-3xl font-bold text-[var(--hm-ink)]">
        Categorias
      </h1>
      <p className="mt-2 text-[var(--hm-muted)]">
        Navega o catálogo Lymiar sem escrever pesquisa.
      </p>
      {loading ? (
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-2xl bg-[var(--hm-bg-soft)]"
            />
          ))}
        </div>
      ) : (
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((c) => (
            <li key={c.slug}>
              <Link
                href={`/categoria/${c.slug}/`}
                className="catalog-card block p-5"
              >
                <p className="font-display text-lg font-semibold text-[var(--hm-ink)]">
                  {c.display_name}
                </p>
                <p className="mt-1 text-xs text-[var(--hm-faint)]">
                  {c.children_count} subcategorias
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

/** Página = o mesmo mapa do mega-menu (Categorias no header). */
function P32Hub() {
  const nav = useTaxonomyNavOptional();
  const model = nav?.megaMenu;
  const columns = model?.columns ?? [];
  const [activeId, setActiveId] = useState("");

  useEffect(() => {
    if (!activeId && columns[0]?.id) setActiveId(columns[0].id);
  }, [columns, activeId]);

  const active: NavL1Column | undefined = useMemo(
    () => columns.find((c) => c.id === activeId) || columns[0],
    [columns, activeId],
  );

  if (nav?.loading) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-10">
        <div className="h-56 animate-pulse rounded-2xl bg-slate-100" />
      </main>
    );
  }

  if (!columns.length) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <p className="text-sm text-amber-700">
          Não foi possível carregar as categorias. Tenta mais tarde.
        </p>
      </main>
    );
  }

  return (
    <>
      <CategoryHero
        title="Categorias"
        description="O mesmo mapa do menu — escolhe a área e aprofunda nas subcategorias."
        breadcrumbs={[
          { label: "Início", href: "/" },
          { label: "Categorias" },
        ]}
      />
      <main className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 lg:max-w-7xl">
        <div className="catalog-panel overflow-hidden">
          <div className="flex flex-col md:flex-row">
            <div
              className="flex shrink-0 flex-row gap-1 overflow-x-auto border-b border-[var(--hm-line)] p-3 md:w-52 md:flex-col md:overflow-visible md:border-b-0 md:border-r md:border-[var(--hm-line)] md:p-4"
              role="tablist"
              aria-label="Categorias principais"
            >
              {columns.map((col) => {
                const selected = col.id === active?.id;
                return (
                  <button
                    key={col.id}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    className={`shrink-0 rounded-lg px-3 py-2.5 text-left text-sm ${
                      selected
                        ? "bg-[var(--hm-brand-soft)] font-medium text-[var(--hm-brand-deep)]"
                        : "text-[var(--hm-muted)] hover:bg-[var(--hm-bg-soft)]"
                    }`}
                    onClick={() => setActiveId(col.id)}
                  >
                    <span className="mr-1.5" aria-hidden>
                      {col.emoji}
                    </span>
                    {col.label}
                  </button>
                );
              })}
            </div>

            <div className="min-h-[28rem] min-w-0 flex-1 overflow-y-auto p-5 sm:p-6">
              {active ? (
                <div className="flex flex-col gap-8">
                  <MegaMenuColumn column={active} />
                  <MegaMenuBrands brands={active.brands} />
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

export default function CategoriasHubPage() {
  if (isP32NavigationEnabled()) return <P32Hub />;
  return <LegacyHub />;
}
