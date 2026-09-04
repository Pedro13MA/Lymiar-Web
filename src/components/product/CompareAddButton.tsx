"use client";

import { useCallback, useEffect, useState } from "react";
import { GitCompareArrows } from "lucide-react";
import {
  addToCompare,
  isInCompare,
  productToCompareItem,
  type CompareItem,
} from "@/lib/compare";
import type { Product } from "@/lib/types";
import { cn } from "@/lib/utils";

type Props = {
  product: Product;
  className?: string;
  /** Compact icon-only label for legacy layouts */
  compact?: boolean;
  /** Card row action — full label «Comparar» */
  variant?: "default" | "card";
  onAdded?: (list: CompareItem[]) => void;
  onFull?: () => void;
};

/**
 * Botão «Adicionar ao comparador» — pesquisa, categorias, cards.
 */
export function CompareAddButton({
  product,
  className,
  compact,
  variant = "default",
  onAdded,
  onFull,
}: Props) {
  const [active, setActive] = useState(false);

  useEffect(() => {
    setActive(isInCompare(product.slug));
    const sync = () => setActive(isInCompare(product.slug));
    window.addEventListener("lymiar:compare-changed", sync);
    return () => window.removeEventListener("lymiar:compare-changed", sync);
  }, [product.slug]);

  const onClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (active) return;
      const res = addToCompare(productToCompareItem(product));
      if (!res.ok && res.reason === "full") {
        onFull?.();
        return;
      }
      if (res.ok) {
        setActive(true);
        onAdded?.(res.list);
      }
    },
    [active, onAdded, onFull, product],
  );

  const isCard = variant === "card";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={active}
      aria-pressed={active}
      aria-label={
        active ? "Já no comparador" : `Adicionar ${product.name} ao comparador`
      }
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-lg border text-xs font-semibold transition-colors",
        active
          ? "border-sky-200 bg-sky-50 text-sky-800"
          : "border-slate-200 bg-white text-slate-700 hover:border-sky-300 hover:bg-sky-50 hover:text-sky-900",
        isCard
          ? "h-10 flex-1 rounded-xl border-[var(--hm-line,#dde3ea)] px-3 text-sm font-semibold text-[var(--hm-ink,#0b1220)]"
          : compact
            ? "h-8 px-2"
            : "h-9 px-3",
        className,
      )}
    >
      <GitCompareArrows className="h-4 w-4 shrink-0" aria-hidden />
      {active
        ? isCard
          ? "No comparador"
          : compact
            ? "No VS"
            : "No comparador"
        : isCard
          ? "Comparar"
          : compact
            ? "VS"
            : "Adicionar ao comparador"}
    </button>
  );
}
