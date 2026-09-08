"use client";

import { memo, useCallback, useEffect, useMemo, useState } from "react";
import type { TaxonomyFacet, TaxonomyFacetValue } from "@/lib/api";
import {
  formatFacetValueLabel,
  isValueSelected,
  normalizeFacetType,
  readFacetExpanded,
  setBooleanFacet,
  toggleFacetValue,
  type TaxonomySelection,
  writeFacetExpanded,
} from "@/lib/taxonomy-facets";
import { cn } from "@/lib/utils";

const PREVIEW = 8;

type PanelProps = {
  facet: TaxonomyFacet;
  selection: TaxonomySelection;
  onChange: (next: TaxonomySelection) => void;
};

function ValueRow({
  selected,
  label,
  count,
  onToggle,
}: {
  selected: boolean;
  label: string;
  count: number;
  onToggle: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors",
          selected
            ? "bg-[var(--hm-brand-soft,#fff1e8)] font-medium text-[var(--hm-brand-deep,#e2550f)]"
            : "text-[var(--hm-ink,#0b1220)] hover:bg-[var(--hm-bg-soft,#eef2f6)]",
        )}
      >
        <span
          aria-hidden
          className={cn(
            "flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px]",
            selected
              ? "border-[var(--hm-brand,#ff6a1a)] bg-[var(--hm-brand,#ff6a1a)] text-white"
              : "border-[var(--hm-line,#dde3ea)] bg-white text-transparent",
          )}
        >
          ✓
        </span>
        <span className="min-w-0 flex-1 truncate">{label}</span>
        <span className="shrink-0 text-xs text-slate-400">({count})</span>
      </button>
    </li>
  );
}

function EnumOrNumberValues({
  facet,
  selection,
  onChange,
  expanded,
}: {
  facet: TaxonomyFacet;
  selection: TaxonomySelection;
  onChange: (next: TaxonomySelection) => void;
  expanded: boolean;
}) {
  const values = facet.values;
  const visible =
    !expanded && values.length > PREVIEW ? values.slice(0, PREVIEW) : values;
  const hiddenCount = Math.max(0, values.length - PREVIEW);

  return (
    <>
      <ul className="space-y-1">
        {visible.map((item: TaxonomyFacetValue) => {
          const selected = isValueSelected(selection, facet.id, item.value);
          return (
            <ValueRow
              key={`${facet.id}:${item.value}`}
              selected={selected}
              label={formatFacetValueLabel(facet.type, item)}
              count={item.count}
              onToggle={() =>
                onChange(toggleFacetValue(selection, facet.id, item.value))
              }
            />
          );
        })}
      </ul>
      {hiddenCount > 0 ? (
        <p className="text-[11px] text-slate-400">
          {expanded ? null : `+${hiddenCount} valores`}
        </p>
      ) : null}
    </>
  );
}

function BooleanSwitch({
  facet,
  selection,
  onChange,
}: {
  facet: TaxonomyFacet;
  selection: TaxonomySelection;
  onChange: (next: TaxonomySelection) => void;
}) {
  const trueValue =
    facet.values.find((v) => /^(true|1|yes)$/i.test(v.value))?.value ??
    facet.values[0]?.value ??
    "true";
  const on = isValueSelected(selection, facet.id, trueValue);
  const count = facet.values.find((v) => v.value === trueValue)?.count ?? facet.count;

  return (
    <label className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2.5">
      <span className="text-sm text-slate-700">
        {facet.label}
        <span className="ml-2 text-xs text-slate-400">({count})</span>
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        onClick={() => onChange(setBooleanFacet(selection, facet.id, !on, trueValue))}
        className={cn(
          "relative h-6 w-11 shrink-0 rounded-full transition-colors",
          on ? "bg-[var(--hm-brand,#ff6a1a)]" : "bg-slate-300",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
            on && "translate-x-5",
          )}
        />
      </button>
    </label>
  );
}

function RangePlaceholder({ facet }: { facet: TaxonomyFacet }) {
  const nums = facet.values
    .map((v) => Number(v.value))
    .filter((n) => Number.isFinite(n));
  const min = nums.length ? Math.min(...nums) : null;
  const max = nums.length ? Math.max(...nums) : null;

  return (
    <div className="space-y-2 rounded-lg border border-dashed border-slate-200 bg-slate-50/80 px-3 py-2.5">
      <p className="text-xs text-slate-500">
        Intervalo
        {min != null && max != null ? (
          <span className="ml-1 font-medium text-slate-700">
            {min} – {max}
          </span>
        ) : null}
      </p>
      <div className="relative h-2 rounded-full bg-slate-200">
        <div className="absolute inset-y-0 left-[10%] right-[15%] rounded-full bg-[var(--hm-brand,#ff6a1a)]/40" />
      </div>
      <p className="text-[11px] text-slate-400">
        Slider activo na próxima fase — valores abaixo para pré-selecção.
      </p>
      <ul className="flex flex-wrap gap-1.5">
        {facet.values.slice(0, 8).map((v) => (
          <li
            key={v.value}
            className="rounded-md bg-white px-2 py-0.5 text-[11px] text-slate-600 ring-1 ring-slate-200"
          >
            {v.label} ({v.count})
          </li>
        ))}
      </ul>
    </div>
  );
}

export const TaxonomyFacetPanel = memo(function TaxonomyFacetPanel({
  facet,
  selection,
  onChange,
}: PanelProps) {
  const type = normalizeFacetType(facet.type);
  const [expanded, setExpanded] = useState(true);
  const [valuesOpen, setValuesOpen] = useState(false);

  useEffect(() => {
    setExpanded(readFacetExpanded(facet.id, true));
  }, [facet.id]);

  const toggleExpanded = useCallback(() => {
    setExpanded((prev) => {
      const next = !prev;
      writeFacetExpanded(facet.id, next);
      return next;
    });
  }, [facet.id]);

  const selectedCount = selection[facet.id]?.length ?? 0;

  const header = useMemo(
    () => (
      <button
        type="button"
        onClick={toggleExpanded}
        className="flex w-full items-center justify-between gap-2 text-left"
        aria-expanded={expanded}
      >
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {facet.label}
          {selectedCount > 0 ? (
            <span className="ml-1.5 rounded-full bg-[var(--hm-brand-soft,#fff1e8)] px-1.5 py-0.5 text-[10px] font-bold normal-case tracking-normal text-[var(--hm-brand-deep,#e2550f)]">
              {selectedCount}
            </span>
          ) : null}
        </span>
        <span className="text-xs text-slate-400">{expanded ? "▾" : "▸"}</span>
      </button>
    ),
    [expanded, facet.label, selectedCount, toggleExpanded],
  );

  if (type === "boolean") {
    return (
      <div className="space-y-2" data-facet-id={facet.id} data-facet-type="boolean">
        {header}
        {expanded ? (
          <BooleanSwitch facet={facet} selection={selection} onChange={onChange} />
        ) : null}
      </div>
    );
  }

  if (type === "range") {
    return (
      <div className="space-y-2" data-facet-id={facet.id} data-facet-type="range">
        {header}
        {expanded ? (
          <>
            <RangePlaceholder facet={facet} />
            <EnumOrNumberValues
              facet={facet}
              selection={selection}
              onChange={onChange}
              expanded={valuesOpen}
            />
            {facet.values.length > PREVIEW ? (
              <button
                type="button"
                onClick={() => setValuesOpen((v) => !v)}
                className="text-xs font-medium text-[var(--hm-brand-deep,#e2550f)] hover:underline"
              >
                {valuesOpen ? "Ver menos" : `Ver mais (+${facet.values.length - PREVIEW})`}
              </button>
            ) : null}
          </>
        ) : null}
      </div>
    );
  }

  return (
    <div
      className="space-y-2"
      data-facet-id={facet.id}
      data-facet-type={type}
    >
      {header}
      {expanded ? (
        <>
          <EnumOrNumberValues
            facet={facet}
            selection={selection}
            onChange={onChange}
            expanded={valuesOpen}
          />
          {facet.values.length > PREVIEW ? (
            <button
              type="button"
              onClick={() => setValuesOpen((v) => !v)}
              className="text-xs font-medium text-[var(--hm-brand-deep,#e2550f)] hover:underline"
            >
              {valuesOpen ? "Ver menos" : `Ver mais (+${facet.values.length - PREVIEW})`}
            </button>
          ) : null}
        </>
      ) : null}
    </div>
  );
});
