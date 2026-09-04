"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/layout/SiteHeader";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { AlertRuleModal } from "@/components/user-space/AlertRuleModal";
import { useSnackbar } from "@/components/user-space/Snackbar";
import {
  deleteAlert,
  getAlerts,
  setAlertActive,
  subscribeUserSpace,
  upsertAlert,
} from "@/lib/user-space";
import {
  ALERT_CONDITION_LABEL,
  ALERT_KIND_LABEL,
  type AlertRule,
} from "@/lib/user-space/types";
import { formatEUR } from "@/lib/utils";

export function AlertsPageClient() {
  const { push } = useSnackbar();
  const [alerts, setAlerts] = useState<AlertRule[]>([]);
  const [edit, setEdit] = useState<AlertRule | null>(null);

  const reload = async () => setAlerts(await getAlerts());

  useEffect(() => {
    void reload();
    return subscribeUserSpace(() => {
      void reload();
    });
  }, []);

  const remove = async (alert: AlertRule) => {
    await deleteAlert(alert.id);
    push("Alerta eliminado.", {
      action: {
        label: "Anular",
        onClick: () => {
          void upsertAlert({ ...alert, id: alert.id });
        },
      },
    });
  };

  return (
    <>
      <SiteHeader />
      <ProtectedRoute>
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="mb-6">
          <h1 className="font-display text-2xl font-bold text-slate-900">
            Alertas
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Só o que crias aqui (e no sino 🔔 do produto) gera email. Avaliação
            automática quando o preço observado atinge o teu alvo.
          </p>
        </div>

        {!alerts.length ? (
          <div className="rounded-2xl border border-slate-200 bg-white px-6 py-14 text-center">
            <p className="font-display text-lg font-semibold text-slate-900">
              Sem alertas
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Use 🔔 nas fichas de produto para criar um alerta.
            </p>
            <Link
              href="/catalog/"
              className="mt-6 inline-flex h-10 items-center rounded-xl bg-sky-700 px-4 text-sm font-medium text-white"
            >
              Ir ao catálogo
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full min-w-[48rem] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  <th className="px-4 py-3">Produto</th>
                  <th className="px-4 py-3">Condição</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Alvo</th>
                  <th className="px-4 py-3">Lojas</th>
                  <th className="px-4 py-3">Criado</th>
                  <th className="px-4 py-3">Último trigger</th>
                  <th className="px-4 py-3">Activo</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {alerts.map((a) => (
                  <tr key={a.id} className="border-t border-slate-100">
                    <td className="px-4 py-3">
                      <Link
                        href={`/p/?id=${encodeURIComponent(a.slug)}`}
                        className="font-medium text-slate-900 hover:text-sky-700"
                      >
                        {a.productName}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {ALERT_KIND_LABEL[a.kind]}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {a.conditions.map((c) => ALERT_CONDITION_LABEL[c]).join(", ") ||
                        "—"}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-slate-800">
                      {a.kind === "price_below" && a.priceTarget != null
                        ? formatEUR(a.priceTarget)
                        : a.kind === "percent_below" && a.percentBelow != null
                          ? `−${a.percentBelow}%`
                          : "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {a.stores === "all" ? "Todas" : a.stores.join(", ")}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {new Date(a.createdAt).toLocaleDateString("pt-PT")}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {a.lastTriggeredAt
                        ? new Date(a.lastTriggeredAt).toLocaleDateString("pt-PT")
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={a.active}
                        onClick={() => void setAlertActive(a.id, !a.active)}
                        className={
                          a.active
                            ? "text-xs font-semibold text-emerald-700"
                            : "text-xs font-semibold text-slate-400"
                        }
                      >
                        {a.active ? "Sim" : "Não"}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setEdit(a)}
                        >
                          Editar
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => void remove(a)}
                        >
                          Eliminar
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {edit ? (
        <AlertRuleModal
          open
          onClose={() => setEdit(null)}
          product={{
            slug: edit.slug,
            ean: edit.ean,
            name: edit.productName,
            imageUrl: edit.imageUrl,
            currentPrice: edit.referencePrice ?? 0,
            lymiarIndex: 0,
          }}
          onSaved={() => {
            push("Alerta actualizado.");
            void reload();
          }}
        />
      ) : null}
      </ProtectedRoute>
      <SiteFooter />
    </>
  );
}
