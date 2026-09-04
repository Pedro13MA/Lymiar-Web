"use client";

import {
  AlertCard,
  HealthCard,
  HealthIndicator,
  MetricCard,
  MiniChart,
  PageHeader,
  SectionHeader,
  StatGrid,
  StatusBadge,
  Tooltip,
} from "@/components/admin/shared";
import type { DashboardFixture, DashboardLiveMeta } from "@/types/admin";

type Props = {
  data: DashboardFixture;
  liveMeta?: DashboardLiveMeta;
};

export function DashboardView({ data, liveMeta }: Props) {
  const { overview, quickMetrics, infrastructure, charts, alerts } = data;

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Dashboard"
        description="Vista rápida do estado da plataforma. Detalhe nas páginas laterais."
        breadcrumb={["Control Center", "Dashboard"]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {liveMeta ? (
              <span
                className={
                  liveMeta.live
                    ? "inline-flex items-center gap-1.5 rounded-full border border-[var(--admin-ok)]/30 bg-[var(--admin-ok-soft)] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--admin-ok)]"
                    : "inline-flex items-center gap-1.5 rounded-full border border-[var(--admin-warn)]/30 bg-[var(--admin-warn-soft)] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--admin-warn)]"
                }
              >
                <span
                  className={
                    liveMeta.live
                      ? "h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--admin-ok)]"
                      : "h-1.5 w-1.5 rounded-full bg-[var(--admin-warn)]"
                  }
                />
                {liveMeta.live ? "LIVE" : "STALE"}
                <span className="font-normal normal-case tracking-normal opacity-80">
                  {liveMeta.lastUpdateLabel}
                </span>
              </span>
            ) : null}
            <StatusBadge tone={overview.healthTone}>{overview.healthLabel}</StatusBadge>
            <span className="text-xs text-[var(--admin-faint)]">
              Auditoria {overview.lastAuditLabel}
            </span>
          </div>
        }
      />

      {/* 1. Platform score (daily catalog audit) */}
      <section className="mb-8">
        <SectionHeader
          title="Catálogo · auditoria diária"
          description="Platform score e alertas agregados (job 03:00 UTC)"
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-5 shadow-sm sm:col-span-2">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.06em] text-[var(--admin-muted)]">
                  Platform Score
                </p>
                <p className="mt-2 font-display text-4xl font-semibold tracking-tight text-[var(--admin-text)]">
                  {overview.score}
                </p>
              </div>
              <HealthIndicator tone={overview.healthTone} size="md" label={overview.healthLabel} />
            </div>
            <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-[var(--admin-track)]">
              <div
                className="h-full rounded-full bg-[var(--admin-ok)]"
                style={{ width: `${Math.min(100, overview.score)}%` }}
              />
            </div>
          </div>
          <MetricCard
            label="Health"
            value={overview.healthLabel}
            hint="Agregado de módulos"
            tone={overview.healthTone}
          />
          <MetricCard
            label="Alertas"
            value={String(overview.alertCount)}
            hint="Requer atenção"
            tone={overview.alertCount > 0 ? "warn" : "ok"}
          />
        </div>
      </section>

      {/* 2. Live operational */}
      <section className="mb-8">
        <SectionHeader
          title="Operacional · tempo real"
          description="Catálogo, tráfego e presença (poll 1s)"
        />
        <StatGrid cols={6}>
          {quickMetrics.map((m) => (
            <MetricCard key={m.id} {...m} />
          ))}
        </StatGrid>
      </section>

      {/* 3. Infrastructure */}
      <section className="mb-8">
        <SectionHeader
          title="Infraestrutura"
          description="CPU, memória, disco e serviços"
          action={
            <Tooltip content="Detalhe completo em Infraestrutura">
              <a
                href="/control-center/infraestrutura"
                className="text-xs text-[var(--admin-muted)] hover:text-[var(--admin-brand)]"
              >
                Ver tudo →
              </a>
            </Tooltip>
          }
        />
        <StatGrid cols={7}>
          {infrastructure.map((item) => (
            <HealthCard key={item.id} {...item} />
          ))}
        </StatGrid>
      </section>

      {/* 4. Charts — só quando houver série (history) */}
      {charts.products.length ||
      charts.offers.length ||
      charts.visits.length ||
      charts.accounts.length ? (
        <section className="mb-8">
          <SectionHeader
            title="Crescimento"
            description="Séries de system_metrics_history"
          />
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            {charts.products.length ? (
              <MiniChart title="Produtos" data={charts.products} />
            ) : null}
            {charts.offers.length ? (
              <MiniChart title="Ofertas" data={charts.offers} color="#12b76a" />
            ) : null}
            {charts.visits.length ? (
              <MiniChart title="Requests/s" data={charts.visits} color="#0284c7" />
            ) : null}
            {charts.accounts.length ? (
              <MiniChart title="Visitantes / logados" data={charts.accounts} color="#f5a524" />
            ) : null}
          </div>
        </section>
      ) : (
        <section className="mb-8">
          <SectionHeader
            title="Crescimento"
            description="Séries de system_metrics_history"
          />
          <p className="text-xs text-[var(--admin-faint)]">
            Histórico ainda sem pontos suficientes — aguarda alguns minutos de coleta.
          </p>
        </section>
      )}

      {/* 5. Alerts only */}
      <section>
        <SectionHeader
          title="Alertas"
          description="Apenas problemas importantes — sem tabelas"
        />
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {alerts.length ? (
            alerts.map((alert) => (
              <AlertCard key={alert.id} alert={alert} />
            ))
          ) : (
            <p className="text-sm text-[var(--admin-muted)]">Sem alertas activos no cache.</p>
          )}
        </div>
      </section>
    </div>
  );
}
