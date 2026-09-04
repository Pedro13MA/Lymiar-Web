"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/layout/SiteHeader";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { useSnackbar } from "@/components/user-space/Snackbar";
import {
  deleteNotifications,
  fetchNotifications,
  groupNotificationsByPeriod,
  markNotificationsRead,
  sendTestNotification,
  type AppNotification,
} from "@/lib/notifications/api";

type Tab = "all" | "unread" | "read";

function matchesQuery(n: AppNotification, q: string): boolean {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  return (
    n.title.toLowerCase().includes(needle) ||
    n.body.toLowerCase().includes(needle)
  );
}

function NotificationsBody() {
  const { push } = useSnackbar();
  const [tab, setTab] = useState<Tab>("all");
  const [q, setQ] = useState("");
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const params =
        tab === "unread"
          ? { status: "unread" as const }
          : tab === "read"
            ? { status: "read" as const }
            : { archived: false };
      const list = await fetchNotifications(params);
      setItems(list.filter((n) => !n.archived));
    } catch {
      setItems([]);
      push("Não foi possível carregar as notificações.");
    } finally {
      setLoading(false);
    }
  }, [tab, push]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const filtered = useMemo(
    () => items.filter((n) => matchesQuery(n, q)),
    [items, q],
  );
  const groups = useMemo(
    () => groupNotificationsByPeriod(filtered),
    [filtered],
  );

  const removeOne = async (n: AppNotification) => {
    if (busy) return;
    setBusy(true);
    try {
      await deleteNotifications([n.id]);
      setItems((prev) => prev.filter((x) => x.id !== n.id));
      push("Notificação apagada.");
    } catch {
      push("Não foi possível apagar. Tenta outra vez.");
    } finally {
      setBusy(false);
    }
  };

  const removeAll = async () => {
    if (!items.length || busy) return;
    setBusy(true);
    try {
      await deleteNotifications([], { all: true });
      setItems([]);
      push("Todas as notificações foram apagadas.");
    } catch {
      push("Não foi possível apagar. Tenta outra vez.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold text-slate-900">
            Notificações
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Avisos sobre mudanças que o Lymiar observou — preços, stock, alertas.
            Sem previsões.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => void sendTestNotification().then(reload)}
          >
            Testar
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["all", "Recebidas"],
              ["unread", "Não lidas"],
              ["read", "Lidas"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={
                tab === id
                  ? "rounded-xl bg-slate-900 px-3 py-1.5 text-sm text-white"
                  : "rounded-xl border border-slate-200 px-3 py-1.5 text-sm text-slate-600"
              }
            >
              {label}
            </button>
          ))}
        </div>
        {items.length ? (
          <button
            type="button"
            disabled={busy}
            className="text-sm text-slate-500 underline-offset-2 hover:text-rose-700 hover:underline disabled:opacity-50"
            onClick={() => void removeAll()}
          >
            Apagar todas
          </button>
        ) : null}
      </div>

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Pesquisar…"
        aria-label="Pesquisar notificações"
        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
      />

      {loading ? (
        <div className="h-40 animate-pulse rounded-2xl bg-slate-100" />
      ) : !filtered.length ? (
        <p className="rounded-xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500">
          {q.trim()
            ? "Nenhuma notificação corresponde à pesquisa."
            : "Ainda não há notificações."}
        </p>
      ) : (
        <div className="space-y-6">
          {groups.map((g) => (
            <section key={g.period} className="space-y-2">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                {g.label}
              </h2>
              <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white">
                {g.items.map((n) => (
                  <li key={n.id} className="px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <Link
                          href={n.href || "#"}
                          className="font-medium text-slate-900 hover:text-sky-800"
                          onClick={() =>
                            n.status === "unread"
                              ? void markNotificationsRead([n.id]).then(reload)
                              : undefined
                          }
                        >
                          {n.title}
                        </Link>
                        <p className="mt-1 text-sm text-slate-500">{n.body}</p>
                        <p className="mt-1 text-xs text-slate-400">
                          {new Date(n.createdAt).toLocaleString("pt-PT")}
                          {n.status === "unread" ? " · não lida" : ""}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        {n.status === "unread" ? (
                          <button
                            type="button"
                            className="text-xs text-sky-700"
                            onClick={() =>
                              void markNotificationsRead([n.id]).then(reload)
                            }
                          >
                            Lida
                          </button>
                        ) : null}
                        <button
                          type="button"
                          disabled={busy}
                          className="text-xs text-slate-500 hover:text-rose-700 disabled:opacity-50"
                          onClick={() => void removeOne(n)}
                        >
                          Apagar
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}

export function NotificationsPageClient() {
  return (
    <>
      <SiteHeader />
      <ProtectedRoute>
        <NotificationsBody />
      </ProtectedRoute>
      <SiteFooter />
    </>
  );
}
