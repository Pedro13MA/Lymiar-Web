"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  getLoja,
  type MarketplaceProductCard,
  type MarketplaceStoreDetail,
} from "@/lib/api";
import { MarketProductCard, MarketStat } from "@/components/mercado/MarketCards";
import { WatchButton } from "@/components/watchlists/WatchButton";
import { EntityActivityTimeline } from "@/components/watchlists/EntityActivityTimeline";
import { baselineFromStore } from "@/lib/watchlists";
import { formatEUR } from "@/lib/utils";
import { storeDisplayName, storeLogoUrl } from "@/lib/storeLogos";
import { WifiLoaderBlock } from "@/components/ui/WifiLoader";

const PAGE_SIZE = 24;

function StoreHeaderLogo({ slug, name }: { slug: string; name: string }) {
  const [failed, setFailed] = useState(false);
  const display = storeDisplayName(slug, name);
  if (failed) {
    return (
      <span
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-sm font-semibold text-slate-600"
        aria-hidden
      >
        {display.slice(0, 2).toUpperCase()}
      </span>
    );
  }
  return (
    <img
      src={storeLogoUrl(slug)}
      alt=""
      width={48}
      height={48}
      className="h-12 w-12 shrink-0 rounded-xl border border-slate-100 bg-white object-contain p-1"
      onError={() => setFailed(true)}
    />
  );
}

function StoreInner() {
  const params = useSearchParams();
  const id = (params.get("id") || "").trim();
  const [meta, setMeta] = useState<MarketplaceStoreDetail | null>(null);
  const [products, setProducts] = useState<MarketplaceProductCard[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const loadStore = useCallback(
    async (offset: number, append: boolean) => {
      if (!id) return;
      if (append) setLoadingMore(true);
      else setLoading(true);
      setError(null);
      try {
        const d = await getLoja(id, {
          productLimit: PAGE_SIZE,
          productOffset: offset,
        });
        setMeta(d);
        setProducts((prev) =>
          append ? [...prev, ...d.recentProducts] : d.recentProducts,
        );
      } catch {
        setError("Loja não encontrada.");
        if (!append) {
          setMeta(null);
          setProducts([]);
        }
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [id],
  );

  useEffect(() => {
    setMeta(null);
    setProducts([]);
    loadStore(0, false);
  }, [loadStore]);

  const totalProducts = meta?.products ?? 0;
  const canLoadMore = products.length < totalProducts;

  if (!id) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-16 text-center sm:px-6">
        <p className="text-slate-500">Indica uma loja (?id=…).</p>
        <Link href="/mercado/lojas/" className="mt-4 inline-block text-sky-700">
          Ver lojas
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6">
      <div>
        <p className="text-xs text-slate-400">
          <Link href="/mercado/" className="hover:underline">
            Mercado
          </Link>{" "}
          /{" "}
          <Link href="/mercado/lojas/" className="hover:underline">
            Lojas
          </Link>{" "}
          / {meta?.name || id}
        </p>
        <div className="mt-2 flex items-center gap-3">
          <StoreHeaderLogo slug={id} name={meta?.name || id} />
          <h1 className="font-display text-3xl font-bold text-slate-900">
            {storeDisplayName(
              id,
              meta?.name || (error ? "Loja" : loading ? "A carregar" : id),
            )}
          </h1>
        </div>
        {meta ? (
          <div className="mt-3">
            <WatchButton
              kind="STORE"
              target={{
                key: meta.slug,
                label: meta.name,
                href: `/mercado/loja/?id=${encodeURIComponent(meta.slug)}`,
              }}
              baseline={baselineFromStore(meta)}
            />
          </div>
        ) : null}
      </div>

      {error ? <p className="text-sm text-amber-800">{error}</p> : null}

      {meta ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <MarketStat label="Produtos" value={String(meta.products)} />
            <MarketStat
              label="Preço médio"
              value={meta.avgPrice != null ? formatEUR(meta.avgPrice) : "—"}
            />
            <MarketStat label="Promoções" value={String(meta.promotions)} />
            <MarketStat
              label="Última update"
              value={(meta.lastUpdate || "—").toString().slice(0, 16)}
            />
          </div>
          <EntityActivityTimeline kind="STORE" targetKey={meta.slug} />
          {meta.categories.length ? (
            <section>
              <h2 className="font-display text-lg font-bold">Categorias</h2>
              <ul className="mt-2 flex flex-wrap gap-2">
                {meta.categories.map((c) => (
                  <li
                    key={c.slug}
                    className="rounded-lg bg-slate-100 px-2 py-1 text-xs text-slate-700"
                  >
                    {c.label || c.slug} · {c.products}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          <section className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <h2 className="font-display text-lg font-bold">Produtos nesta loja</h2>
              {totalProducts > 0 ? (
                <p className="text-sm text-slate-500">
                  {products.length.toLocaleString("pt-PT")} de{" "}
                  {totalProducts.toLocaleString("pt-PT")} produtos observados
                </p>
              ) : null}
            </div>
            {products.length ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {products.map((p) => (
                  <MarketProductCard
                    key={p.ean || p.slug || p.name}
                    item={p}
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">
                Ainda não há produtos desta loja no radar.
              </p>
            )}
            {canLoadMore ? (
              <button
                type="button"
                disabled={loadingMore}
                onClick={() => loadStore(products.length, true)}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 hover:border-slate-300 disabled:opacity-60"
              >
                {loadingMore ? "A carregar…" : "Ver mais produtos"}
              </button>
            ) : null}
          </section>
        </>
      ) : loading ? (
        <WifiLoaderBlock text="A carregar" />
      ) : null}
    </main>
  );
}

export function LojaDetailClient() {
  return (
    <Suspense
      fallback={
        <div className="p-8">
          <WifiLoaderBlock text="A carregar" />
        </div>
      }
    >
      <StoreInner />
    </Suspense>
  );
}
