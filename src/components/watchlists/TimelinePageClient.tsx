"use client";

/**
 * FASE 7.19 — página /timeline
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/layout/SiteHeader";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { TimelineCard } from "@/components/watchlists/TimelineCard";
import { refreshWatchObservations } from "@/lib/watchlists/refresh";
import {
  filterTimelineEvents,
  groupEventsByPeriod,
  listEvents,
  listWatches,
  subscribeWatchlists,
  WATCH_KIND_LABEL,
  type TimelineEvent,
  type WatchKind,
} from "@/lib/watchlists";
import { cn } from "@/lib/utils";

const FILTERS: Array<{ id: "ALL" | WatchKind; label: string }> = [
  { id: "ALL", label: "Tudo" },
  { id: "PRODUCT", label: "Produtos" },
  { id: "CATEGORY", label: "Categorias" },
  { id: "PROJECT", label: "Projetos" },
  { id: "BRAND", label: "Marcas" },
  { id: "STORE", label: "Lojas" },
];

const DAY_FILTERS: Array<{ days: number | null; label: string }> = [
  { days: 1, label: "Hoje" },
  { days: 7, label: "7 dias" },
  { days: 30, label: "30 dias" },
  { days: 90, label: "90 dias" },
  { days: null, label: "Tudo" },
];

export function TimelinePageClient() {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [watchCount, setWatchCount] = useState(0);
  const [kindFilter, setKindFilter] = useState<"ALL" | WatchKind>("ALL");
  const [days, setDays] = useState<number | null>(30);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        await refreshWatchObservations();
      } catch {
        /* offline / API */
      }
      if (cancelled) return;
      const [ev, watches] = await Promise.all([
        listEvents(),
        listWatches(true),
      ]);
      if (cancelled) return;
      setEvents(ev);
      setWatchCount(watches.length);
      setLoading(false);
    })();
    const unsub = subscribeWatchlists(() => {
      void listEvents().then(setEvents);
      void listWatches(true).then((w) => setWatchCount(w.length));
    });
    return () => {
      cancelled = true;
      unsub();
    };
  }, []);

  const filtered = useMemo(
    () =>
      filterTimelineEvents(events, {
        kinds: kindFilter === "ALL" ? null : [kindFilter],
        query,
        days,
      }),
    [days, events, kindFilter, query],
  );

  const groups = useMemo(() => groupEventsByPeriod(filtered), [filtered]);

  return (
    <>
      <SiteHeader />
      <ProtectedRoute>
      <main className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6">
        <div>
          <p className="text-xs text-slate-400">
            <Link href="/minha-area/" className="hover:underline">
              Minha Área
            </Link>{" "}
            / Timeline
          </p>
          <h1 className="mt-1 font-display text-3xl font-bold text-slate-900">
            Timeline
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Alterações observadas nos itens que segue. Sem previsões — só o que
            foi visto.
            {watchCount ? (
              <span className="ml-1">
                · {watchCount} a seguir
              </span>
            ) : null}
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Pesquisar eventos (ex.: RTX)"
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm"
            aria-label="Pesquisar eventos"
          />
          <div className="flex flex-wrap gap-1.5">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setKindFilter(f.id)}
                className={cn(
                  "rounded-lg px-2.5 py-1 text-xs font-medium",
                  kindFilter === f.id
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {DAY_FILTERS.map((f) => (
              <button
                key={f.label}
                type="button"
                onClick={() => setDays(f.days)}
                className={cn(
                  "rounded-lg px-2.5 py-1 text-xs font-medium",
                  days === f.days
                    ? "border border-sky-300 bg-sky-50 text-sky-900"
                    : "border border-transparent bg-white text-slate-500 hover:bg-slate-50",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="h-40 animate-pulse rounded-2xl bg-slate-100" />
        ) : !filtered.length ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-5 py-10 text-center">
            <p className="font-display text-lg font-semibold text-slate-900">
              Ainda sem eventos
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Use{" "}
              <span className="font-medium text-slate-700">Seguir</span> em
              produtos, categorias, marcas, lojas ou projetos. Os
              eventos aparecem quando houver alterações observadas.
            </p>
            <Link
              href="/minha-area/"
              className="mt-4 inline-block text-sm font-medium text-sky-700 hover:underline"
            >
              Ir à Minha Área
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            {groups.map((g) => (
              <section key={g.period} className="space-y-3">
                <h2 className="font-display text-lg font-bold text-slate-800">
                  {g.label}
                </h2>
                <div className="space-y-2">
                  {g.events.map((e) => (
                    <TimelineCard key={e.id} event={e} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}

        {watchCount > 0 ? (
          <p className="text-xs text-slate-400">
            A seguir:{" "}
            {(Object.keys(WATCH_KIND_LABEL) as WatchKind[])
              .map((k) => WATCH_KIND_LABEL[k])
              .join(" · ")}
          </p>
        ) : null}
      </main>
      </ProtectedRoute>
      <SiteFooter />
    </>
  );
}
