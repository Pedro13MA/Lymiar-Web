"use client";

/**
 * Minha Área — dashboard da conta (favoritos, alertas email, projetos, notificações).
 * Sem carrinho: o Lymiar não vende; acompanha preços e avisa.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/layout/SiteHeader";
import {
  getWatchStats,
  listWatches,
  subscribeWatchlists,
  unfollow,
  WATCH_KIND_LABEL,
  type WatchItem,
  type WatchStats,
} from "@/lib/watchlists";
import { getAlerts, getFavorites } from "@/lib/user-space";
import { listProjects } from "@/lib/projects";
import { useSession } from "@/components/auth/SessionProvider";
import { LoadingAuth } from "@/components/auth/LoadingAuth";
import { isAdminRole } from "@/lib/auth/roles";
import { fetchUnreadCount } from "@/lib/notifications/api";
import "@/components/home/premium/home-premium.css";
import "@/components/catalogo/catalog-premium.css";
import "@/components/auth/account.css";

type Counts = {
  favorites: number;
  alerts: number;
  projects: number;
  unread: number;
};

function accountAgeLabel(createdAt: string | null | undefined): string {
  if (!createdAt) return "—";
  const created = new Date(createdAt).getTime();
  if (Number.isNaN(created)) return "—";
  const days = Math.max(0, Math.floor((Date.now() - created) / 86_400_000));
  if (days < 1) return "Desde hoje";
  if (days === 1) return "Há 1 dia";
  if (days < 30) return `Há ${days} dias`;
  const months = Math.floor(days / 30);
  if (months < 12) return months === 1 ? "Há 1 mês" : `Há ${months} meses`;
  const years = Math.floor(months / 12);
  return years === 1 ? "Há 1 ano" : `Há ${years} anos`;
}

function StatCard({
  href,
  label,
  value,
  hint,
}: {
  href: string;
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <Link href={href} className="account-stat catalog-card">
      <p className="account-stat-label">{label}</p>
      <p className="account-stat-value font-display">{value}</p>
      {hint ? <p className="account-stat-hint">{hint}</p> : null}
    </Link>
  );
}

function GuestMinhaArea() {
  return (
    <main className="mx-auto max-w-lg space-y-6 px-4 py-16 text-center sm:px-6">
      <h1 className="font-display text-3xl font-bold text-[var(--hm-ink)]">
        Minha Área
      </h1>
      <p className="text-sm leading-relaxed text-[var(--hm-muted)]">
        Entra com Google para guardar favoritos, criar alertas de preço por
        email e organizar projetos — sincronizado entre dispositivos.
      </p>
      <ul className="space-y-2 text-left text-sm text-[var(--hm-muted)]">
        <li>· Favoritos — produtos que queres acompanhar</li>
        <li>· Alertas — email quando o preço chega ao teu alvo</li>
        <li>· Projetos — builds e listas de compra</li>
        <li>· Notificações — o que mudou desde a última visita</li>
      </ul>
      <Link
        href="/entrar/"
        className="catalog-cta inline-flex min-h-12 w-full items-center justify-center rounded-xl px-6 text-base font-medium sm:w-auto"
      >
        Continuar com Google
      </Link>
    </main>
  );
}

function AuthenticatedMinhaArea() {
  const { user } = useSession();
  const showControlCenter = isAdminRole(user?.role);
  const [counts, setCounts] = useState<Counts>({
    favorites: 0,
    alerts: 0,
    projects: 0,
    unread: 0,
  });
  const [stats, setStats] = useState<WatchStats | null>(null);
  const [watches, setWatches] = useState<WatchItem[]>([]);

  const reload = async () => {
    const [favs, alerts, projects, unread, wstats, wlist] = await Promise.all([
      getFavorites(),
      getAlerts(),
      listProjects(),
      fetchUnreadCount().catch(() => 0),
      getWatchStats(),
      listWatches(true),
    ]);
    setCounts({
      favorites: favs.length,
      alerts: alerts.filter((a) => a.active !== false).length,
      projects: projects.length,
      unread,
    });
    setStats(wstats);
    setWatches(wlist);
  };

  useEffect(() => {
    void reload();
    const u1 = subscribeWatchlists(() => {
      void reload();
    });
    return () => {
      u1();
    };
  }, []);

  const initial = (user?.name || user?.email || "?").slice(0, 1).toUpperCase();

  return (
    <main className="account-shell mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-6">
      <header className="account-hero catalog-panel">
        <div className="flex flex-wrap items-center gap-4">
          {user?.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.image}
              alt=""
              className="h-16 w-16 rounded-2xl object-cover ring-1 ring-[var(--hm-line)]"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div
              className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--hm-bg-soft)] text-xl font-semibold text-[var(--hm-ink)]"
              aria-hidden
            >
              {initial}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="catalog-kicker">A tua conta</p>
            <h1 className="font-display text-2xl font-bold tracking-tight text-[var(--hm-ink)] sm:text-3xl">
              {user?.name || "Conta Lymiar"}
            </h1>
            <p className="mt-1 truncate text-sm text-[var(--hm-muted)]">
              {user?.email}
              {" · "}
              {accountAgeLabel(user?.createdAt)}
            </p>
          </div>
          <Link
            href="/perfil/"
            className="inline-flex min-h-11 items-center rounded-xl border border-[var(--hm-line)] bg-white px-4 text-sm font-medium text-[var(--hm-ink)] hover:border-[var(--hm-brand)]"
          >
            Gerir perfil
          </Link>
        </div>
      </header>

      {counts.unread > 0 ? (
        <Link
          href="/notificacoes/"
          className="account-inbox catalog-panel flex items-center justify-between gap-3"
        >
          <div>
            <p className="font-display text-lg font-semibold text-[var(--hm-ink)]">
              {counts.unread === 1
                ? "1 novidade desde a última visita"
                : `${counts.unread} novidades desde a última visita`}
            </p>
            <p className="mt-1 text-sm text-[var(--hm-muted)]">
              Abre as notificações para ver o que mudou nos produtos que segues.
            </p>
          </div>
          <span className="account-inbox-badge">{counts.unread}</span>
        </Link>
      ) : null}

      <section aria-labelledby="account-stats-title">
        <h2
          id="account-stats-title"
          className="mb-3 font-display text-lg font-bold text-[var(--hm-ink)]"
        >
          Resumo
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            href="/favoritos/"
            label="Favoritos"
            value={counts.favorites}
            hint="Produtos que segues"
          />
          <StatCard
            href="/alertas/"
            label="Alertas"
            value={counts.alerts}
            hint="Email quando o preço cai"
          />
          <StatCard
            href="/projetos/"
            label="Projetos"
            value={counts.projects}
            hint="Builds e listas"
          />
          <StatCard
            href="/notificacoes/"
            label="Por ler"
            value={counts.unread}
            hint="Notificações"
          />
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <div className="catalog-panel space-y-2 p-5">
          <h2 className="font-display text-base font-bold text-[var(--hm-ink)]">
            Favoritos
          </h2>
          <p className="text-sm leading-relaxed text-[var(--hm-muted)]">
            Guarda produtos no perfil para os acompanhar. Não é uma compra —
            é o que te interessa no catálogo.
          </p>
          <Link
            href="/favoritos/"
            className="inline-flex text-sm font-medium text-[var(--hm-brand-deep)] hover:underline"
          >
            Ver favoritos →
          </Link>
        </div>
        <div className="catalog-panel space-y-2 p-5">
          <h2 className="font-display text-base font-bold text-[var(--hm-ink)]">
            Alertas por email
          </h2>
          <p className="text-sm leading-relaxed text-[var(--hm-muted)]">
            Define um preço-alvo ou um desconto que valha a pena. Quando o
            catálogo observar essa condição, avisamos no teu email Google.
          </p>
          <Link
            href="/alertas/"
            className="inline-flex text-sm font-medium text-[var(--hm-brand-deep)] hover:underline"
          >
            Gerir alertas →
          </Link>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-display text-lg font-bold text-[var(--hm-ink)]">
            A seguir
          </h2>
          <Link
            href="/timeline/"
            className="text-sm font-medium text-[var(--hm-brand-deep)] hover:underline"
          >
            Timeline
          </Link>
        </div>
        {!watches.length ? (
          <p className="rounded-xl border border-dashed border-[var(--hm-line)] px-4 py-6 text-sm text-[var(--hm-muted)]">
            Ainda não segues nada. Usa «Seguir» nas páginas de produto, marca ou
            loja.
          </p>
        ) : (
          <ul className="divide-y divide-[var(--hm-line)] overflow-hidden rounded-xl border border-[var(--hm-line)] bg-white">
            {watches.slice(0, 8).map((w) => (
              <li
                key={`${w.kind}:${w.target.key}`}
                className="flex items-center justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-[var(--hm-ink)]">
                    {w.target.label || w.target.key}
                  </p>
                  <p className="text-xs text-[var(--hm-faint)]">
                    {WATCH_KIND_LABEL[w.kind] || w.kind}
                  </p>
                </div>
                <button
                  type="button"
                  className="shrink-0 text-xs font-medium text-[var(--hm-muted)] hover:text-[var(--hm-ink)]"
                  onClick={() => void unfollow(w.kind, w.target.key).then(reload)}
                >
                  Deixar
                </button>
              </li>
            ))}
          </ul>
        )}
        {stats ? (
          <p className="text-xs text-[var(--hm-faint)]">
            Eventos esta semana: {stats.eventsThisWeek}
          </p>
        ) : null}
      </section>

      {showControlCenter ? (
        <Link
          href="/control-center/"
          className="inline-flex text-sm font-medium text-[var(--hm-ink)] hover:underline"
        >
          Control Center →
        </Link>
      ) : null}
    </main>
  );
}

export function MinhaAreaPageClient() {
  const { status } = useSession();

  return (
    <div className="home-premium min-h-screen">
      <SiteHeader />
      {status === "loading" ? (
        <LoadingAuth />
      ) : status !== "authenticated" ? (
        <GuestMinhaArea />
      ) : (
        <AuthenticatedMinhaArea />
      )}
      <SiteFooter />
    </div>
  );
}
