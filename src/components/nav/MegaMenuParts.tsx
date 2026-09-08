"use client";

import Link from "next/link";
import type { DrillNavNode } from "@/lib/nav/types";

type ListProps = {
  items: DrillNavNode[];
  onDrill: (node: DrillNavNode) => void;
  onNavigate?: () => void;
};

/** Rows for the current drill level — children drill; leaves navigate. */
export function DrillNavList({ items, onDrill, onNavigate }: ListProps) {
  if (!items.length) {
    return (
      <p className="py-8 text-sm text-slate-500">
        Sem subcategorias nesta área.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-slate-100">
      {items.map((item) => {
        const showChevron = item.hasChildren;
        if (showChevron) {
          return (
            <li key={item.slug}>
              <button
                type="button"
                onClick={() => onDrill(item)}
                className="flex w-full items-center gap-3 px-1 py-3.5 text-left transition-colors hover:bg-orange-50/80"
              >
                {item.emoji ? (
                  <span className="w-7 shrink-0 text-center text-lg" aria-hidden>
                    {item.emoji}
                  </span>
                ) : null}
                <span className="min-w-0 flex-1 text-[15px] font-medium text-slate-800">
                  {item.label}
                </span>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  className="shrink-0 text-slate-400"
                  aria-hidden
                >
                  <path
                    d="M6 3.5L10.5 8L6 12.5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </li>
          );
        }

        return (
          <li key={item.slug}>
            <Link
              href={item.href}
              onClick={onNavigate}
              className="flex items-center gap-3 px-1 py-3.5 text-[15px] text-slate-700 transition-colors hover:bg-orange-50/80 hover:text-[var(--hm-brand-deep,#e2550f)]"
            >
              {item.emoji ? (
                <span className="w-7 shrink-0 text-center text-lg" aria-hidden>
                  {item.emoji}
                </span>
              ) : null}
              <span className="min-w-0 flex-1 font-medium">{item.label}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

type HeaderProps = {
  title: string;
  titleHref?: string | null;
  onBack?: () => void;
  onNavigate?: () => void;
  trail?: { label: string }[];
};

export function DrillNavHeader({
  title,
  titleHref,
  onBack,
  onNavigate,
  trail,
}: HeaderProps) {
  return (
    <div className="mb-3 space-y-2">
      {trail && trail.length > 0 ? (
        <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-slate-400">
          {trail.map((t) => t.label).join(" · ")}
        </p>
      ) : null}
      <div className="flex items-center gap-2">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
            aria-label="Voltar"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              aria-hidden
            >
              <path
                d="M10 3.5L5.5 8L10 12.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Voltar
          </button>
        ) : null}
        {titleHref && !titleHref.startsWith("/categorias") ? (
          <Link
            href={titleHref}
            onClick={onNavigate}
            className="min-w-0 flex-1 font-display text-lg font-semibold tracking-tight text-slate-900 transition-colors hover:text-[var(--hm-brand-deep,#e2550f)]"
          >
            {title}
          </Link>
        ) : (
          <p className="min-w-0 flex-1 font-display text-lg font-semibold tracking-tight text-slate-900">
            {title}
          </p>
        )}
      </div>
    </div>
  );
}
