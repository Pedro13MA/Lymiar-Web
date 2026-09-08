"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
  const [mounted, setMounted] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const active: NavL1Column | undefined =
    model.columns.find((c) => c.id === activeId) || model.columns[0];

  const close = useCallback(() => onOpenChange(false), [onOpenChange]);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    if (typeof el.scrollTo === "function") el.scrollTo({ top: 0 });
    else el.scrollTop = 0;
  }, [activeId]);

  if (!model.columns.length || !open || !mounted) return null;

  // Portal to body — header uses backdrop-filter, which traps position:fixed.
  return createPortal(
    <div className="fixed inset-0 z-[80]" role="presentation">
      <button
        type="button"
        aria-label="Fechar categorias"
        className="absolute inset-0 bg-slate-950/50"
        onClick={close}
      />

      <div
        id={panelId}
        role="dialog"
        aria-modal="true"
        aria-labelledby={triggerId}
        className="absolute inset-y-0 left-0 flex w-full max-w-[42rem] flex-col bg-white text-slate-900 shadow-2xl sm:max-w-[52rem] lg:max-w-[58rem]"
      >
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 px-4">
          <p className="text-sm font-semibold tracking-tight text-slate-900">
            Categorias
          </p>
          <button
            type="button"
            onClick={close}
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
          >
            Fechar
          </button>
        </div>

        <div className="flex min-h-0 flex-1">
          <div
            className="flex w-[11.5rem] shrink-0 flex-col gap-1 overflow-y-auto border-r border-slate-200 bg-slate-50 p-2.5 sm:w-56 sm:p-3"
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
                  className={`flex w-full items-center gap-2 rounded-xl px-2.5 py-2.5 text-left text-sm leading-snug transition-colors ${
                    selected
                      ? "bg-white font-semibold text-slate-900 shadow-sm ring-1 ring-orange-200"
                      : "font-medium text-slate-600 hover:bg-white/90 hover:text-slate-900"
                  }`}
                  onClick={() => setActiveId(col.id)}
                >
                  <span className="w-6 shrink-0 text-center text-base" aria-hidden>
                    {col.emoji}
                  </span>
                  <span className="min-w-0 flex-1">{col.label}</span>
                </button>
              );
            })}
          </div>

          <div
            ref={listRef}
            className="min-w-0 flex-1 overflow-y-auto overscroll-contain bg-white px-4 pb-10 pt-4 sm:px-6 sm:pb-12 sm:pt-5"
          >
            {active ? (
              <div className="flex flex-col gap-6 pb-8">
                <MegaMenuColumn column={active} onNavigate={close} />
                <MegaMenuBrands brands={active.brands} onNavigate={close} />
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>,
    document.body,
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
      className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-950"
      onClick={() => onOpenChange(!open)}
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 14 14"
        fill="none"
        className="text-slate-500"
        aria-hidden
      >
        <rect x="1" y="1" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.4" />
        <rect x="8" y="1" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.4" />
        <rect x="1" y="8" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.4" />
        <rect x="8" y="8" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.4" />
      </svg>
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
