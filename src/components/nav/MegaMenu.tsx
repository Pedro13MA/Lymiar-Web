"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { MegaMenuModel, NavL1Column } from "@/lib/nav/types";
import {
  MegaMenuBrands,
  MegaMenuColumn,
} from "@/components/nav/MegaMenuParts";

type Props = {
  model: MegaMenuModel;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  triggerId: string;
};

export function MegaMenu({ model, open, onOpenChange, triggerId }: Props) {
  const panelId = useId();
  const [activeId, setActiveId] = useState(model.columns[0]?.id ?? "");
  const panelRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const active: NavL1Column | undefined =
    model.columns.find((c) => c.id === activeId) || model.columns[0];

  const close = useCallback(() => onOpenChange(false), [onOpenChange]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
        document.getElementById(triggerId)?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close, triggerId]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Reset scroll of subcategory panel when switching category.
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    if (typeof el.scrollTo === "function") el.scrollTo({ top: 0 });
    else el.scrollTop = 0;
  }, [activeId]);

  if (!model.columns.length) return null;
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60]" role="presentation">
      <button
        type="button"
        aria-label="Fechar categorias"
        className="absolute inset-0 bg-slate-900/35 backdrop-blur-[2px] transition-opacity"
        onClick={close}
      />

      <div
        ref={panelRef}
        id={panelId}
        role="dialog"
        aria-modal="true"
        aria-labelledby={triggerId}
        className="absolute left-0 top-0 flex h-full w-full max-w-[min(100vw,52rem)] flex-col bg-white shadow-[8px_0_40px_-12px_rgba(15,23,42,0.28)] sm:top-0"
      >
        <div className="flex h-12 shrink-0 items-center justify-between border-b border-slate-200/90 px-4">
          <p className="text-sm font-semibold text-slate-900">Categorias</p>
          <button
            type="button"
            onClick={close}
            className="rounded-lg px-2.5 py-1.5 text-sm text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-800"
          >
            Fechar
          </button>
        </div>

        <div className="flex min-h-0 flex-1">
          <div
            className="flex w-[9.5rem] shrink-0 flex-col gap-0.5 overflow-y-auto border-r border-slate-200/90 bg-slate-50/80 p-2 sm:w-52 sm:p-3"
            role="tablist"
            aria-label="Categorias principais"
          >
            {model.columns.map((col) => {
              const selected = col.id === active?.id;
              return (
                <button
                  key={col.id}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  className={`rounded-lg px-2.5 py-2.5 text-left text-sm transition-colors sm:px-3 ${
                    selected
                      ? "bg-white font-medium text-[var(--hm-ink,#0b1220)] shadow-sm ring-1 ring-[color-mix(in_srgb,var(--hm-brand,#ff6a1a)_40%,transparent)]"
                      : "text-slate-600 hover:bg-white/80 hover:text-slate-900"
                  }`}
                  onClick={() => setActiveId(col.id)}
                >
                  <span className="mr-1.5" aria-hidden>
                    {col.emoji}
                  </span>
                  {col.label}
                </button>
              );
            })}
          </div>

          <div
            ref={listRef}
            className="min-w-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6"
          >
            {active ? (
              <div className="flex flex-col gap-8 pb-10">
                <MegaMenuColumn column={active} onNavigate={close} />
                <MegaMenuBrands brands={active.brands} onNavigate={close} />
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

export function MegaMenuTrigger({
  id,
  open,
  onOpenChange,
  label = "Categorias",
}: {
  id: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  label?: string;
}) {
  return (
    <button
      id={id}
      type="button"
      aria-haspopup="dialog"
      aria-expanded={open}
      className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
      onClick={() => onOpenChange(!open)}
    >
      <span aria-hidden className="text-base leading-none">
        ⊞
      </span>
      {label}
      <svg
        width="12"
        height="12"
        viewBox="0 0 12 12"
        fill="none"
        className={`text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
        aria-hidden
      >
        <path
          d="M2.5 4.5L6 8L9.5 4.5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
