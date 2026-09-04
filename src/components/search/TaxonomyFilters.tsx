"use client";

import { memo, useMemo } from "react";
import type { TaxonomyFacet } from "@/lib/api";
import { TaxonomyFacetPanel } from "@/components/search/TaxonomyFacetPanel";
import {
  countSelected,
  prepareTaxonomyFacets,
  type TaxonomySelection,
} from "@/lib/taxonomy-facets";

type Props = {
  facets: TaxonomyFacet[];
  selection: TaxonomySelection;
  onChange: (next: TaxonomySelection) => void;
  onClearSelection: () => void;
  showHeader?: boolean;
};

/**
 * Painel dinâmico — taxonomyFacets da API.
 * FASE 7.4: selecção actualiza URL + pesquisa (deep-link).
 */
export const TaxonomyFilters = memo(function TaxonomyFilters({
  facets,
  selection,
  onChange,
  onClearSelection,
  showHeader = true,
}: Props) {
  const prepared = useMemo(() => prepareTaxonomyFacets(facets), [facets]);
  const selectedTotal = useMemo(() => countSelected(selection), [selection]);

  if (!prepared.length) return null;

  return (
    <div className="space-y-5" data-testid="taxonomy-filters">
      {showHeader ? (
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--hm-faint,#8b9aab)]">
            Atributos
            {selectedTotal > 0 ? (
              <span className="ml-1 text-[var(--hm-brand-deep,#e2550f)]">
                ({selectedTotal})
              </span>
            ) : null}
          </p>
          {selectedTotal > 0 ? (
            <button
              type="button"
              className="text-[11px] text-[var(--hm-brand-deep,#e2550f)] hover:underline"
              onClick={onClearSelection}
            >
              Limpar selecção
            </button>
          ) : null}
        </div>
      ) : null}
      {prepared.map((facet) => (
        <TaxonomyFacetPanel
          key={facet.id}
          facet={facet}
          selection={selection}
          onChange={onChange}
        />
      ))}
    </div>
  );
});
