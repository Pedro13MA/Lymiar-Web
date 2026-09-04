"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, ExternalLink, Loader2, RefreshCw, X } from "lucide-react";
import Link from "next/link";
import { PageHeader, LoadingState, EmptyState } from "@/components/admin/shared";
import { fetchAdminSystem, type SystemInfo } from "@/services/admin/ops";
import { getApiBaseUrl } from "@/lib/api-base-url";

type SmokeResult = { name: string; ok: boolean; detail: string };

export function SystemAdminView() {
  const [data, setData] = useState<SystemInfo | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [smoke, setSmoke] = useState<SmokeResult[] | null>(null);
  const [smokeBusy, setSmokeBusy] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      setData(await fetchAdminSystem());
    } catch (e) {
      setError(e instanceof Error ? e.message : "load_error");
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const runSmoke = async () => {
    setSmokeBusy(true);
    const base = getApiBaseUrl();
    const results: SmokeResult[] = [];
    try {
      const pub = await fetch(`${base}/api/v1/health`);
      results.push({
        name: "API pública",
        ok: pub.ok,
        detail: pub.ok ? "ok" : `HTTP ${pub.status}`,
      });
    } catch (e) {
      results.push({ name: "API pública", ok: false, detail: String(e) });
    }
    try {
      const admin = await fetch(`${base}/api/admin/health`, { credentials: "include" });
      results.push({
        name: "Admin health",
        ok: admin.ok,
        detail: admin.ok ? "sessão admin OK" : `HTTP ${admin.status}`,
      });
    } catch (e) {
      results.push({ name: "Admin health", ok: false, detail: String(e) });
    }
    try {
      const fe = await fetch("https://lymiar.com/", { method: "HEAD" });
      results.push({
        name: "Frontend",
        ok: fe.ok,
        detail: `HTTP ${fe.status}`,
      });
    } catch (e) {
      results.push({ name: "Frontend", ok: false, detail: String(e) });
    }
    setSmoke(results);
    setSmokeBusy(false);
  };

  const hubDeploy = data?.deploy?.hub;
  const webRelease = data?.deploy?.webRelease;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Sistema"
        description="Versões, deploy, backups e smoke tests."
        breadcrumb={["Control Center", "Sistema"]}
        actions={
          <button type="button" onClick={() => void load()} className="inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm">
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            Actualizar
          </button>
        }
      />
      {error ? <EmptyState title="Erro" description={error} /> : null}
      {busy && !data ? <LoadingState /> : null}
      {data && (
        <div className="space-y-4">
          <div className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-5">
            <p className="text-xs uppercase text-[var(--admin-faint)]">Versões</p>
            <ul className="mt-2 space-y-1 text-sm text-[var(--admin-muted)]">
              <li>Hub commit: {(hubDeploy as { commit?: string })?.commit || "—"}</li>
              <li>Hub built: {(hubDeploy as { built_at?: string })?.built_at || "—"}</li>
              <li>Web release: {webRelease || "—"}</li>
              <li>Python {data.runtime.python}</li>
              <li>{data.runtime.hostname}</li>
            </ul>
          </div>
          <div className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs uppercase text-[var(--admin-faint)]">Smoke tests</p>
              <button
                type="button"
                disabled={smokeBusy}
                onClick={() => void runSmoke()}
                className="rounded-lg border px-3 py-1 text-xs"
              >
                {smokeBusy ? "A testar…" : "Executar"}
              </button>
            </div>
            {smoke && (
              <ul className="mt-3 space-y-2 text-sm">
                {smoke.map((s) => (
                  <li key={s.name} className="flex items-center gap-2">
                    {s.ok ? (
                      <Check className="h-4 w-4 text-[var(--admin-ok)]" />
                    ) : (
                      <X className="h-4 w-4 text-[var(--admin-critical)]" />
                    )}
                    <span className="font-medium">{s.name}</span>
                    <span className="text-xs text-[var(--admin-muted)]">{s.detail}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {data.backups && data.backups.length > 0 && (
            <div className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-5">
              <p className="text-xs uppercase text-[var(--admin-faint)]">Backups hub</p>
              <ul className="mt-2 font-mono text-xs text-[var(--admin-muted)]">
                {data.backups.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            </div>
          )}
          <div className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-5">
            <p className="text-xs uppercase text-[var(--admin-faint)]">Links</p>
            <ul className="mt-2 space-y-2 text-sm">
              {Object.entries(data.links).map(([k, url]) => (
                <li key={k}>
                  <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[var(--admin-brand)] hover:underline">
                    {k} <ExternalLink className="h-3 w-3" />
                  </a>
                </li>
              ))}
              <li>
                <Link href="/" className="text-[var(--admin-brand)] hover:underline">Site público</Link>
              </li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
