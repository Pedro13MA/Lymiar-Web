"use client";

import { Check, X } from "lucide-react";
import { TierBadge } from "./IdentityTierBadge";
import { cn } from "@/lib/utils";
import type { IdentityProductProfile } from "@/services/admin/identity";

const ROWS: Array<{ key: keyof IdentityProductProfile; label: string; reasonKey: string }> = [
  { key: "title", label: "Título", reasonKey: "title" },
  { key: "brand", label: "Marca", reasonKey: "brand" },
  { key: "model", label: "Modelo", reasonKey: "model" },
  { key: "storage", label: "Capacidade", reasonKey: "storage" },
  { key: "color", label: "Cor", reasonKey: "color" },
  { key: "condition", label: "Condição", reasonKey: "condition" },
];

function cell(value: string | null | undefined): string {
  if (!value || !String(value).trim()) return "—";
  return String(value).trim();
}

function rowOk(reasons: string[], penalties: string[], reasonKey: string): boolean {
  const bad = penalties.some((p) => p.includes(reasonKey.split("_")[0]));
  if (bad) return false;
  return reasons.some((r) => r === reasonKey || r.startsWith(reasonKey));
}

export function IdentityDiffPanel({
  sourceLabel,
  candidateLabel,
  source,
  candidate,
  score,
  margin,
  tier,
  reasons = [],
  penalties = [],
}: {
  sourceLabel: string;
  candidateLabel: string;
  source: IdentityProductProfile;
  candidate: IdentityProductProfile;
  score?: number | null;
  margin?: number | null;
  tier?: string | null;
  reasons?: string[];
  penalties?: string[];
}) {
  return (
    <div className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)]">
      <div className="grid grid-cols-2 border-b border-[var(--admin-border)] text-xs font-semibold uppercase tracking-wide text-[var(--admin-faint)]">
        <div className="px-4 py-2">{sourceLabel}</div>
        <div className="px-4 py-2 border-l border-[var(--admin-border)]">{candidateLabel}</div>
      </div>
      <div className="divide-y divide-[var(--admin-border)]">
        {ROWS.map((row) => {
          const ok = rowOk(reasons, penalties, row.reasonKey);
          const bad = penalties.some((p) => p.includes(row.reasonKey.split("_")[0]));
          return (
            <div key={row.key} className="grid grid-cols-2 text-sm">
              <div className="px-4 py-2.5 text-[var(--admin-text)]">{cell(source[row.key])}</div>
              <div className="flex items-start justify-between gap-2 border-l border-[var(--admin-border)] px-4 py-2.5">
                <span className="text-[var(--admin-text)]">{cell(candidate[row.key])}</span>
                {row.reasonKey !== "title" && (
                  <span className="shrink-0">
                    {bad ? (
                      <X className="h-4 w-4 text-[var(--admin-critical)]" />
                    ) : ok ? (
                      <Check className="h-4 w-4 text-[var(--admin-ok)]" />
                    ) : (
                      <span className="inline-block h-4 w-4 rounded-full border border-[var(--admin-border)]" />
                    )}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-4 border-t border-[var(--admin-border)] px-4 py-3 text-sm">
        {score != null && (
          <span>
            Score: <strong className="tabular-nums">{score.toFixed(1)}</strong>
          </span>
        )}
        {margin != null && (
          <span>
            Margin: <strong className="tabular-nums">{margin.toFixed(1)}</strong>
          </span>
        )}
        {tier && <TierBadge tier={tier} />}
      </div>
    </div>
  );
}
