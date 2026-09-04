"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  archiveProject,
  computeProjectSummary,
  deleteProject,
  duplicateProject,
  listProjects,
  reinsertProject,
  restoreProject,
  subscribeProjects,
} from "@/lib/projects";
import type { Project } from "@/lib/projects/types";
import { formatEUR } from "@/lib/utils";
import { SiteFooter, SiteHeader } from "@/components/layout/SiteHeader";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { CloudSyncedBadge } from "@/components/sync/SyncUI";
import { Button } from "@/components/ui/button";
import { ProjectWizard } from "@/components/projects/ProjectWizard";
import { useSnackbar } from "@/components/user-space/Snackbar";

export function ProjectsPageClient() {
  const { push } = useSnackbar();
  const [projects, setProjects] = useState<Project[]>([]);
  const [archived, setArchived] = useState<Project[]>([]);
  const [wizard, setWizard] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  const reload = useCallback(async () => {
    setProjects(await listProjects(false));
    const all = await listProjects(true);
    setArchived(all.filter((p) => p.status === "archived"));
  }, []);

  useEffect(() => {
    void reload();
    return subscribeProjects(() => {
      void reload();
    });
  }, [reload]);

  const remove = async (project: Project) => {
    const snapshot = JSON.parse(JSON.stringify(project)) as Project;
    await deleteProject(project.id);
    await reload();
    push("Projeto eliminado.", {
      action: {
        label: "Anular",
        onClick: () => {
          void reinsertProject(snapshot).then(reload);
        },
      },
    });
  };

  return (
    <>
      <SiteHeader />
      <ProtectedRoute>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold text-slate-900">
              Projetos{" "}
              <CloudSyncedBadge label="Cloud" />
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Coleções organizadas por objectivo — PC, escritório, NAS, foto…
            </p>
          </div>
          <Button type="button" onClick={() => setWizard(true)}>
            Novo Projeto
          </Button>
        </div>

        {!projects.length ? (
          <div className="rounded-2xl border border-slate-200 px-6 py-14 text-center">
            <p className="font-display text-lg font-semibold text-slate-900">
              Ainda não tem projetos
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Crie um a partir de um template ou em branco.
            </p>
            <Button
              type="button"
              className="mt-6"
              onClick={() => setWizard(true)}
            >
              Criar projeto
            </Button>
          </div>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => {
              const sum = computeProjectSummary(p);
              return (
                <li key={p.id}>
                  <Link
                    href={`/projetos/p/?id=${encodeURIComponent(p.id)}`}
                    className="block rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
                  >
                    {p.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.imageUrl}
                        alt=""
                        className="mb-3 h-28 w-full rounded-xl object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="mb-3 flex h-28 items-center justify-center rounded-xl bg-slate-50 text-xs text-slate-400">
                        {p.name}
                      </div>
                    )}
                    <h2 className="font-display text-lg font-semibold text-slate-900">
                      {p.name}
                    </h2>
                    <p className="mt-1 line-clamp-2 text-xs text-slate-500">
                      {p.description || "Sem descrição"}
                    </p>
                    <p className="mt-3 font-display text-xl font-bold tabular-nums text-slate-900">
                      {formatEUR(sum.total)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {sum.filledSlots}/{sum.filledSlots + sum.emptySlots}{" "}
                      slots · {sum.storeCount} lojas
                      {sum.savingVsInitial > 0
                        ? ` · −${formatEUR(sum.savingVsInitial)}`
                        : ""}
                    </p>
                  </Link>
                  <div className="mt-2 flex flex-wrap gap-2 px-1">
                    <button
                      type="button"
                      className="text-xs text-sky-700 hover:underline"
                      onClick={() => {
                        void duplicateProject(p.id).then(reload);
                      }}
                    >
                      Duplicar
                    </button>
                    <button
                      type="button"
                      className="text-xs text-slate-500 hover:underline"
                      onClick={() => {
                        void archiveProject(p.id).then(reload);
                      }}
                    >
                      Arquivar
                    </button>
                    <button
                      type="button"
                      className="text-xs text-slate-500 hover:underline"
                      onClick={() => {
                        void remove(p);
                      }}
                    >
                      Eliminar
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {archived.length ? (
          <div className="mt-10">
            <button
              type="button"
              className="text-sm font-medium text-slate-600 hover:underline"
              onClick={() => setShowArchived((v) => !v)}
            >
              {showArchived ? "Ocultar" : "Mostrar"} arquivados (
              {archived.length})
            </button>
            {showArchived ? (
              <ul className="mt-3 space-y-2">
                {archived.map((p) => (
                  <li
                    key={p.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-100 px-3 py-2 text-sm"
                  >
                    <span className="text-slate-600">{p.name}</span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="text-sky-700 hover:underline"
                        onClick={() => {
                          void restoreProject(p.id).then(reload);
                        }}
                      >
                        Restaurar
                      </button>
                      <button
                        type="button"
                        className="text-slate-500 hover:underline"
                        onClick={() => {
                          void remove(p);
                        }}
                      >
                        Eliminar
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </main>
      <ProjectWizard open={wizard} onClose={() => setWizard(false)} />
      </ProtectedRoute>
      <SiteFooter />
    </>
  );
}
