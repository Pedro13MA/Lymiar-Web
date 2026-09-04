import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { DecisionSemaphore } from "@/lib/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatEUR(value: number): string {
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

export function formatPct(value: number): string {
  const sign = value > 0 ? "−" : value < 0 ? "+" : "";
  return `${sign}${Math.abs(value).toFixed(1).replace(".", ",")}%`;
}

export const SEMAPHORE_LABEL: Record<
  DecisionSemaphore,
  { label: string; short: string; emoji: string; className: string }
> = {
  buy: {
    label: "Vale a pena comprar",
    short: "Comprar",
    emoji: "🟢",
    className:
      "border-[var(--verdict-buy-border)] bg-[var(--verdict-buy-soft)] text-[var(--verdict-buy-text)]",
  },
  fair: {
    label: "Ainda não sabemos",
    short: "Incerto",
    emoji: "🟡",
    className:
      "border-[var(--verdict-unknown-border)] bg-[var(--verdict-unknown-soft)] text-[var(--verdict-unknown-text)]",
  },
  wait: {
    label: "Melhor esperar",
    short: "Esperar",
    emoji: "🟠",
    className:
      "border-[var(--verdict-wait-border)] bg-[var(--verdict-wait-soft)] text-[var(--verdict-wait-text)]",
  },
};

/** Decisão com estado explícito de dados insuficientes (UI). */
export type DecisionUiKind = DecisionSemaphore | "unknown";

export const DECISION_UI_LABEL: Record<
  DecisionUiKind,
  { label: string; emoji: string; className: string }
> = {
  buy: SEMAPHORE_LABEL.buy,
  fair: SEMAPHORE_LABEL.fair,
  wait: SEMAPHORE_LABEL.wait,
  unknown: {
    label: "Ainda não sabemos",
    emoji: "🟡",
    className: "border-yellow-200 bg-yellow-50 text-yellow-800",
  },
};

export function lymiarIndexTone(value: number): {
  stroke: string;
  text: string;
  track: string;
} {
  if (value >= 85) {
    return { stroke: "#059669", text: "text-emerald-700", track: "#d1fae5" };
  }
  if (value >= 50) {
    return { stroke: "#d97706", text: "text-amber-700", track: "#fef3c7" };
  }
  return { stroke: "#e11d48", text: "text-rose-700", track: "#ffe4e6" };
}
