"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import type { MegaMenuModel, NavL1Column } from "@/lib/nav/types";
import {
  MegaMenuBrands,
  MegaMenuColumn,
  MegaMenuQuickLinks,
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
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const active: NavL1Column | undefined =
    model.columns.find((c) => c.id === activeId) || model.columns[0];

  const clearClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  };

  const scheduleClose = () => {
    clearClose();
    closeTimer.current = setTimeout(() => onOpenChange(false), 180);
  };

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
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (panelRef.current?.contains(t)) return;
      if (document.getElementById(triggerId)?.contains(t)) return;
      close();
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open, close, triggerId]);

  if (!model.columns.length) return null;

  return (
    <div
      className="absolute left-0 right-0 top-full z-50 hidden lg:block"
      onMouseEnter={() => {
        clearClose();
        onOpenChange(true);
      }}
      onMouseLeave={scheduleClose}
    >
      <div
        ref={panelRef}
        id={panelId}
        role="menu"
        aria-labelledby={triggerId}
        hidden={!open}
        className={`border-b border-slate-200/90 bg-white/98 shadow-[0_16px_40px_-12px_rgba(15,23,42,0.12)] backdrop-blur-sm ${
          open ? "block" : "hidden"
        }`}
      >
        <div className="mx-auto flex max-w-6xl gap-1 px-4 py-4 sm:px-6 lg:max-w-7xl">
          <div
            className="flex shrink-0 flex-col gap-0.5 pr-3"
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
                  className={`rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                    selected
                      ? "bg-sky-50 font-medium text-sky-900 ring-1 ring-sky-100"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                  onMouseEnter={() => setActiveId(col.id)}
                  onFocus={() => setActiveId(col.id)}
                >
                  {col.label}
                </button>
              );
            })}
          </div>

          <div className="flex min-w-0 flex-1 gap-5 overflow-x-auto border-l border-slate-200/80 py-1 pl-5">
            {active ? (
              <>
                <MegaMenuColumn column={active} onNavigate={close} />
                <MegaMenuQuickLinks
                  links={model.quickLinks}
                  onNavigate={close}
                />
                <MegaMenuBrands brands={active.brands} onNavigate={close} />
              </>
            ) : null}
          </div>
        </div>
        <div className="border-t border-slate-100 bg-gradient-to-b from-slate-50/90 to-slate-50/40">
          <div className="mx-auto max-w-6xl px-4 py-2.5 sm:px-6 lg:max-w-7xl">
            <Link
              href={model.allCategoriesHref}
              onClick={close}
              className="text-sm font-medium text-sky-700 transition-colors hover:text-sky-800"
            >
              Ver todas as categorias →
            </Link>
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
      aria-haspopup="menu"
      aria-expanded={open}
      className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
      onClick={() => onOpenChange(!open)}
      onMouseEnter={() => onOpenChange(true)}
    >
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
