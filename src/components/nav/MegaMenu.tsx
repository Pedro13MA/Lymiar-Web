"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { DrillNavModel, DrillNavNode } from "@/lib/nav/types";
import { DrillNavHeader, DrillNavList } from "@/components/nav/MegaMenuParts";

type Props = {
  model: DrillNavModel;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  triggerId: string;
};

type DrillLevel = 0 | 1 | 2;

export function MegaMenu({ model, open, onOpenChange, triggerId }: Props) {
  const panelId = useId();
  const [mounted, setMounted] = useState(false);
  const [level, setLevel] = useState<DrillLevel>(0);
  const [selectedL1, setSelectedL1] = useState<DrillNavNode | null>(null);
  const [selectedL2, setSelectedL2] = useState<DrillNavNode | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => onOpenChange(false), [onOpenChange]);

  const reset = useCallback(() => {
    setLevel(0);
    setSelectedL1(null);
    setSelectedL2(null);
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      reset();
      return;
    }
  }, [open, reset]);

  const goBack = useCallback(() => {
    if (level === 2) {
      setSelectedL2(null);
      setLevel(1);
      return;
    }
    if (level === 1) {
      setSelectedL1(null);
      setSelectedL2(null);
      setLevel(0);
    }
  }, [level]);

  const onDrill = useCallback(
    (node: DrillNavNode) => {
      if (level === 0) {
        setSelectedL1(node);
        setSelectedL2(null);
        setLevel(1);
        return;
      }
      if (level === 1) {
        setSelectedL2(node);
        setLevel(2);
      }
    },
    [level],
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        if (level > 0) {
          goBack();
          return;
        }
        close();
        document.getElementById(triggerId)?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close, triggerId, level, goBack]);

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
  }, [level, selectedL1?.slug, selectedL2?.slug]);

  if (!model.roots.length || !open || !mounted) return null;

  const items: DrillNavNode[] =
    level === 0
      ? model.roots
      : level === 1
        ? selectedL1?.children ?? []
        : selectedL2?.children ?? [];

  const title =
    level === 0
      ? "Categorias"
      : level === 1
        ? selectedL1?.label ?? "Categorias"
        : selectedL2?.label ?? selectedL1?.label ?? "Categorias";

  const titleHref =
    level === 0
      ? null
      : level === 1
        ? selectedL1 && !selectedL1.isVirtual
          ? selectedL1.href
          : null
        : selectedL2 && !selectedL2.isVirtual
          ? selectedL2.href
          : null;

  const trail =
    level === 0
      ? [{ label: "Categorias" }]
      : level === 1
        ? [
            { label: "Categorias" },
            { label: selectedL1?.label ?? "" },
          ].filter((t) => t.label)
        : [
            { label: "Categorias" },
            { label: selectedL1?.label ?? "" },
            { label: selectedL2?.label ?? "" },
          ].filter((t) => t.label);

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
        className="absolute inset-y-0 left-0 flex w-full max-w-[22rem] flex-col bg-white text-slate-900 shadow-2xl sm:max-w-[26rem]"
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

        <div
          ref={listRef}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-10 pt-4 sm:px-5"
        >
          <DrillNavHeader
            title={title}
            titleHref={titleHref}
            onBack={level > 0 ? goBack : undefined}
            onNavigate={close}
            trail={trail}
          />
          <DrillNavList
            items={items}
            onDrill={onDrill}
            onNavigate={close}
          />
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
