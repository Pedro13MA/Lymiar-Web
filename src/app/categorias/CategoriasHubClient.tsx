"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getCategories, type CategorySummary } from "@/lib/api";
import { CATEGORY_MENU_L1 } from "@/lib/category-slugs";
import { isP32NavigationEnabled } from "@/lib/nav/flags";
import { useTaxonomyNavOptional } from "@/components/nav/TaxonomyTreeProvider";
import { DrillNavHeader, DrillNavList } from "@/components/nav/MegaMenuParts";
import { CategoryHero } from "@/components/nav/CategoryLayout";
import type { DrillNavNode } from "@/lib/nav/types";

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

/** Página = o mesmo drill-down L1→L2→L3 do mega-menu. */
function P32Hub() {
  const nav = useTaxonomyNavOptional();
  const model = nav?.megaMenu;
  const roots = model?.roots ?? [];

  const [level, setLevel] = useState<0 | 1 | 2>(0);
  const [selectedL1, setSelectedL1] = useState<DrillNavNode | null>(null);
  const [selectedL2, setSelectedL2] = useState<DrillNavNode | null>(null);

  useEffect(() => {
    setLevel(0);
    setSelectedL1(null);
    setSelectedL2(null);
  }, [roots]);

  const goBack = useCallback(() => {
    if (level === 2) {
      setSelectedL2(null);
      setLevel(1);
      return;
    }
    if (level === 1) {
      setSelectedL1(null);
      setSelectedL2(null);
      setLevel(0);
    }
  }, [level]);

  const onDrill = useCallback(
    (node: DrillNavNode) => {
      if (level === 0) {
        setSelectedL1(node);
        setSelectedL2(null);
        setLevel(1);
        return;
      }
      if (level === 1) {
        setSelectedL2(node);
        setLevel(2);
      }
    },
    [level],
  );

  const items = useMemo(() => {
    if (level === 0) return roots;
    if (level === 1) return selectedL1?.children ?? [];
    return selectedL2?.children ?? [];
  }, [level, roots, selectedL1, selectedL2]);

  const title =
    level === 0
      ? "Categorias"
      : level === 1
        ? selectedL1?.label ?? "Categorias"
        : selectedL2?.label ?? selectedL1?.label ?? "Categorias";

  const titleHref =
    level === 0
      ? null
      : level === 1
        ? selectedL1 && !selectedL1.isVirtual
          ? selectedL1.href
          : null
        : selectedL2 && !selectedL2.isVirtual
          ? selectedL2.href
          : null;

  const trail =
    level === 0
      ? [{ label: "Categorias" }]
      : level === 1
        ? [
            { label: "Categorias" },
            { label: selectedL1?.label ?? "" },
          ].filter((t) => t.label)
        : [
            { label: "Categorias" },
            { label: selectedL1?.label ?? "" },
            { label: selectedL2?.label ?? "" },
          ].filter((t) => t.label);

  if (nav?.loading) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-10">
        <div className="h-56 animate-pulse rounded-2xl bg-slate-100" />
      </main>
    );
  }

  if (!roots.length) {
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
        description="Navega L1 → L2 → L3 — o mesmo mapa do menu do header."
        breadcrumbs={[
          { label: "Início", href: "/" },
          { label: "Categorias" },
        ]}
      />
      <main className="mx-auto max-w-3xl px-4 pb-16 sm:px-6 lg:max-w-4xl">
        <div className="catalog-panel overflow-hidden p-5 sm:p-6">
          <DrillNavHeader
            title={title}
            titleHref={titleHref}
            onBack={level > 0 ? goBack : undefined}
            trail={trail}
          />
          <DrillNavList items={items} onDrill={onDrill} />
        </div>
      </main>
    </>
  );
}

export default function CategoriasHubPage() {
  if (isP32NavigationEnabled()) return <P32Hub />;
  return <LegacyHub />;
}
