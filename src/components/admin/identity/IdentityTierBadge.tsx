"use client";

import { cn } from "@/lib/utils";

export function TierBadge({ tier }: { tier: string | null }) {
  const t = tier || "unknown";
  const tone =
    t === "safe_100"
      ? "bg-emerald-100 text-emerald-800"
      : t.startsWith("block")
        ? "bg-red-100 text-red-800"
        : t === "ambiguous_margin"
          ? "bg-amber-100 text-amber-900"
          : "bg-slate-100 text-slate-700";
  return (
    <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-medium uppercase", tone)}>
      {t}
    </span>
  );
}
