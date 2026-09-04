"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ChevronRight,
  ExternalLink,
  Loader2,
  Play,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import {
  PageHeader,
  LoadingState,
  EmptyState,
  MetricCard,
  StatGrid,
  HealthIndicator,
  Drawer,
} from "@/components/admin/shared";
import {
  fetchAdminFeeds,
  fetchAdminFeedRuns,
  type FeedsInfo,
  type FeedMerchant,
  type FeedRun,
} from "@/services/admin/ops";
import { cn } from "@/lib/utils";
import type { HealthTone } from "@/types/admin";

function healthTone(health: string): HealthTone {
  if (health === "healthy") return "ok";
  if (health === "warning") return "warn";
  if (health === "stopped") return "critical";
  return "neutral";
}

function healthLabel(health: string, hoursSince: number | null | undefined): string {
  if (health === "healthy") return "Online / saudável";
  if (health === "warning") {
    const h = hoursSince ?? 0;
    if (h < 1) return `Último sync há ${Math.round(h * 60)} min`;
    return `Último sync há ${h.toFixed(1)}h`;
  }
  if (health === "stopped") {
    if (hoursSince == null) return "Feed parado";
    return `Feed parado (${hoursSince.toFixed(1)}h)`;
  }
  return health;
}

function formatTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleString("pt-PT", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function formatDuration(ms: number | null | undefined): string {
  if (!ms) return "—";
  if (ms < 1000) return `${ms} ms`;
  const sec = ms / 1000;
  if (sec < 60) return `${sec.toFixed(1)} s`;
  return `${(sec / 60).toFixed(1)} min`;
}

function MerchantCard({
  merchant,
  onDetails,
}: {
  merchant: FeedMerchant;
  onDetails: () => void;
}) {
  const tone = healthTone(merchant.health);
  const lastRun = merchant.lastRun;

  return (
    <div className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <HealthIndicator tone={tone} size="md" />
            <h3 className="font-semibold text-[var(--admin-text)]">{merchant.displayName}</h3>
            <span className="text-xs text-[var(--admin-faint)]">{merchant.slug}</span>
          </div>
          <p className="mt-1 text-sm text-[var(--admin-muted)]">
            {healthLabel(merchant.health, merchant.hoursSinceSync)}
          </p>
        </div>
        <div className="text-right text-xs text-[var(--admin-faint)]">
          <p>{merchant.catalog.offers.toLocaleString("pt-PT")} ofertas</p>
          <p>{merchant.catalog.products.toLocaleString("pt-PT")} produtos</p>
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:grid-cols-3">
        <div>
          <dt className="text-[var(--admin-faint)]">Último sync</dt>
          <dd className="font-medium tabular-nums">{formatTime(merchant.lastSyncAt)}</dd>
        </div>
        <div>
          <dt className="text-[var(--admin-faint)]">Duração</dt>
          <dd className="font-medium tabular-nums">{formatDuration(lastRun?.durationMs)}</dd>
        </div>
        <div>
          <dt className="text-[var(--admin-faint)]">Processados</dt>
          <dd className="font-medium tabular-nums">
            {(lastRun?.productsProcessed ?? 0).toLocaleString("pt-PT")}
          </dd>
        </div>
        <div>
          <dt className="text-[var(--admin-faint)]">Novos</dt>
          <dd className="font-medium tabular-nums text-emerald-700">
            +{(lastRun?.inserted ?? 0).toLocaleString("pt-PT")}
          </dd>
        </div>
        <div>
          <dt className="text-[var(--admin-faint)]">Atualizados</dt>
          <dd className="font-medium tabular-nums">
            {(lastRun?.updated ?? 0).toLocaleString("pt-PT")}
          </dd>
        </div>
        <div>
          <dt className="text-[var(--admin-faint)]">Removidos (OOS)</dt>
          <dd className="font-medium tabular-nums text-amber-700">
            {(lastRun?.oosMarked ?? 0).toLocaleString("pt-PT")}
          </dd>
        </div>
        <div>
          <dt className="text-[var(--admin-faint)]">Erros</dt>
          <dd
            className={cn(
              "font-medium tabular-nums",
              (lastRun?.errors ?? 0) > 0 && "text-red-600",
            )}
          >
            {(lastRun?.errors ?? 0).toLocaleString("pt-PT")}
          </dd>
        </div>
        <div>
          <dt className="text-[var(--admin-faint)]">Próximo sync</dt>
          <dd className="font-medium tabular-nums">{formatTime(merchant.nextExpectedSyncAt)}</dd>
        </div>
        {merchant.catalog.qualityScore != null && (
          <div>
            <dt className="text-[var(--admin-faint)]">Qualidade feed</dt>
            <dd className="font-medium tabular-nums">{merchant.catalog.qualityScore}%</dd>
          </div>
        )}
      </dl>

      {merchant.lastErrorAt && (
        <p className="mt-3 text-xs text-red-600">
          Último erro: {formatTime(merchant.lastErrorAt)}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onDetails}
          className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-[var(--admin-surface-2)]"
        >
          Ver detalhes <ChevronRight className="h-3.5 w-3.5" />
        </button>
        <Link
          href={`/mercado/${merchant.slug}/`}
          target="_blank"
          className="inline-flex items-center gap-1 text-xs text-[var(--admin-brand)] hover:underline"
        >
          Ver loja <ExternalLink className="h-3 w-3" />
        </Link>
        <button
          type="button"
          disabled
          title="Sync manual — próxima iteração"
          className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs opacity-50"
        >
          <Play className="h-3.5 w-3.5" />
          Executar sync
        </button>
      </div>
    </div>
  );
}

function FeedDetailDrawer({
  merchant,
  open,
  onClose,
}: {
  merchant: FeedMerchant | null;
  open: boolean;
  onClose: () => void;
}) {
  const [runs, setRuns] = useState<FeedRun[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !merchant) return;
    setLoading(true);
    fetchAdminFeedRuns(merchant.slug, 15)
      .then((r) => setRuns(r.runs ?? []))
      .catch(() => setRuns([]))
      .finally(() => setLoading(false));
  }, [open, merchant]);

  if (!merchant) return null;

  return (
    <Drawer open={open} onClose={onClose} title={`Feed — ${merchant.displayName}`}>
      <div className="space-y-6 p-4">
        <section>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-faint)]">
            Estado actual
          </h4>
          <div className="mt-2 space-y-1 text-sm">
            <p>
              <HealthIndicator tone={healthTone(merchant.health)} label={healthLabel(merchant.health, merchant.hoursSinceSync)} />
            </p>
            <p className="text-[var(--admin-muted)]">
              Último sync: {formatTime(merchant.lastSyncAt)}
            </p>
            <p className="text-[var(--admin-muted)]">
              Próximo esperado: {formatTime(merchant.nextExpectedSyncAt)}
            </p>
          </div>
        </section>

        {merchant.catalog.fields && (
          <section>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-faint)]">
              Cobertura de campos
            </h4>
            <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
              {Object.entries(merchant.catalog.fields).map(([k, v]) => (
                <div key={k} className="flex justify-between rounded border px-2 py-1">
                  <span>{k}</span>
                  <span className="tabular-nums font-medium">{v}%</span>
                </div>
              ))}
            </div>
          </section>
        )}

        <section>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-faint)]">
            Histórico de syncs
          </h4>
          {loading ? (
            <p className="mt-2 text-sm text-[var(--admin-muted)]">Carregando…</p>
          ) : runs.length === 0 ? (
            <p className="mt-2 text-sm text-[var(--admin-muted)]">
              Sem histórico persistido ainda — aparece após o próximo ciclo de sync.
            </p>
          ) : (
            <div className="mt-2 overflow-hidden rounded-lg border">
              <table className="w-full text-xs">
                <thead className="bg-[var(--admin-surface-2)] text-[var(--admin-faint)]">
                  <tr>
                    <th className="px-2 py-2 text-left">Quando</th>
                    <th className="px-2 py-2 text-right">Dur.</th>
                    <th className="px-2 py-2 text-right">+</th>
                    <th className="px-2 py-2 text-right">~</th>
                    <th className="px-2 py-2 text-right">OOS</th>
                    <th className="px-2 py-2 text-right">Err</th>
                  </tr>
                </thead>
                <tbody>
                  {runs.map((r) => (
                    <tr key={r.id} className="border-t">
                      <td className="px-2 py-2">{formatTime(r.completedAt)}</td>
                      <td className="px-2 py-2 text-right tabular-nums">
                        {formatDuration(r.durationMs)}
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums text-emerald-700">
                        {r.storeInserted ?? r.inserted}
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums">
                        {r.storeUpdated ?? r.updated}
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums">
                        {r.storeOosMarked ?? r.oosMarked}
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums">
                        {r.storeErrors ?? r.errors}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </Drawer>
  );
}

export function FeedsAdminView() {
  const [data, setData] = useState<FeedsInfo | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detailMerchant, setDetailMerchant] = useState<FeedMerchant | null>(null);

  const load = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const feeds = await fetchAdminFeeds();
      setData(feeds);
    } catch (e) {
      setError(e instanceof Error ? e.message : "load_error");
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const summary = data?.summary;
  const merchants = data?.merchants ?? [];

  const alertText = useMemo(() => {
    if (!summary?.alerts?.length) return null;
    const top = summary.alerts[0];
    return `${top.displayName} — último sync há ${top.hoursSinceSync?.toFixed(1) ?? "?"}h`;
  }, [summary]);

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Feeds & lojas"
        description="Observabilidade de syncs — avisa antes de o catálogo ficar desactualizado."
        breadcrumb={["Control Center", "Feeds"]}
        actions={
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm"
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            Actualizar
          </button>
        }
      />

      {error ? <EmptyState title="Erro" description={error} /> : null}
      {busy && !data ? <LoadingState /> : null}

      {summary && (
        <StatGrid cols={3} className="mb-4">
          <MetricCard
            label="Feeds saudáveis"
            value={`${summary.healthy}/${summary.total}`}
            tone={summary.healthy === summary.total ? "ok" : "warn"}
            hint="Lojas com sync recente (< 30 min)"
          />
          <MetricCard
            label="Último sync global"
            value={formatTime(summary.lastGlobalSync)}
            hint={
              data?.globalLastRun
                ? `Duração ${formatDuration(data.globalLastRun.durationMs)}`
                : undefined
            }
            tone="ok"
          />
          <MetricCard
            label="Intervalo configurado"
            value={`${Math.round((data?.intervalSeconds ?? 300) / 60)} min`}
            hint="SCRAPE_INTERVAL_SECONDS"
            tone="neutral"
          />
        </StatGrid>
      )}

      {alertText && (
        <div className="mb-6 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{alertText}</span>
        </div>
      )}

      {merchants.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {merchants.map((m) => (
            <MerchantCard
              key={m.slug}
              merchant={m}
              onDetails={() => setDetailMerchant(m)}
            />
          ))}
        </div>
      )}

      {!busy && merchants.length === 0 && !error && (
        <EmptyState
          title="Sem merchants"
          description="Nenhuma loja AWIN activa encontrada no registry."
        />
      )}

      <FeedDetailDrawer
        merchant={detailMerchant}
        open={detailMerchant != null}
        onClose={() => setDetailMerchant(null)}
      />
    </div>
  );
}
