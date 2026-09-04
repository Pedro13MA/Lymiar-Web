"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getLojas, type MarketplaceStoreListItem } from "@/lib/api";
import { formatEUR } from "@/lib/utils";
import { storeDisplayName, storeLogoUrl } from "@/lib/storeLogos";

function StoreListLogo({ slug, name }: { slug: string; name: string }) {
  const [failed, setFailed] = useState(false);
  const display = storeDisplayName(slug, name);
  if (failed) {
    return (
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-semibold text-slate-600"
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
      width={36}
      height={36}
      className="h-9 w-9 shrink-0 rounded-lg border border-slate-100 bg-white object-contain p-1"
      onError={() => setFailed(true)}
    />
  );
}

export function LojasListClient() {
  const [stores, setStores] = useState<MarketplaceStoreListItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let c = false;
    setLoading(true);
    getLojas(80)
      .then((r) => {
        if (!c) setStores(r.stores || []);
      })
      .catch(() => {
        if (!c) setError("Não foi possível carregar lojas.");
      })
      .finally(() => {
        if (!c) setLoading(false);
      });
    return () => {
      c = true;
    };
  }, []);

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
      <div>
        <p className="text-xs text-slate-400">
          <Link href="/mercado/" className="hover:underline">
            Mercado
          </Link>{" "}
          / Lojas
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold text-slate-900">
          Lojas
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Lojas com ofertas observadas no Lymiar.
        </p>
      </div>
      {error ? <p className="text-sm text-amber-800">{error}</p> : null}
      {loading ? (
        <div className="h-40 animate-pulse rounded-2xl bg-slate-100" />
      ) : stores.length ? (
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {stores.map((s) => (
            <li key={s.slug}>
              <Link
                href={`/mercado/loja/?id=${encodeURIComponent(s.slug)}`}
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 hover:border-slate-300"
              >
                <span className="flex min-w-0 items-center gap-3">
                  <StoreListLogo slug={s.slug} name={s.name} />
                  <span className="truncate font-medium text-slate-900">
                    {storeDisplayName(s.slug, s.name)}
                  </span>
                </span>
                <span className="text-xs text-slate-500">
                  {s.products} ·{" "}
                  {s.avgPrice != null ? formatEUR(s.avgPrice) : "—"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-slate-500">Sem lojas para listar.</p>
      )}
    </main>
  );
}
