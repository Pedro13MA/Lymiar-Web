/**
 * FASE 7.3 — taxonomy facets helpers + render smoke.
 */

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import type { TaxonomyFacet } from "@/lib/api";
import {
  clearTaxonomySelection,
  countSelected,
  hasTaxonomyFacets,
  prepareTaxonomyFacets,
  selectionFromSearchParams,
  selectionFromSearchParamsWithLegacy,
  selectionToSearchParams,
  setBooleanFacet,
  sortFacetValues,
  toggleFacetValue,
} from "@/lib/taxonomy-facets";
import { TaxonomyFacetPanel } from "@/components/search/TaxonomyFacetPanel";
import { TaxonomyFilters } from "@/components/search/TaxonomyFilters";
import { FilterSidebar, type FilterValues } from "@/components/search/FilterSidebar";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const EMPTY_FILTERS: FilterValues = {
  category: "",
  subcategory: "",
  brand: "",
  store: "",
  type: "",
  model: "",
  vram: "",
  series: "",
  socket: "",
  capacity: "",
  format: "",
  minPrice: "",
  maxPrice: "",
  inStockOnly: false,
};

function facet(
  id: string,
  label: string,
  type: string,
  values: { value: string; label: string; count: number }[],
): TaxonomyFacet {
  return {
    id,
    label,
    type,
    count: values.reduce((n, v) => n + v.count, 0),
    selected: false,
    values: values.map((v) => ({ ...v, selected: false })),
  };
}

describe("taxonomy-facets helpers", () => {
  it("hasTaxonomyFacets — missing / empty / filled", () => {
    expect(hasTaxonomyFacets(undefined)).toBe(false);
    expect(hasTaxonomyFacets([])).toBe(false);
    expect(hasTaxonomyFacets([facet("brand", "Marca", "enum", [])])).toBe(false);
    expect(
      hasTaxonomyFacets([
        facet("brand", "Marca", "enum", [
          { value: "asus", label: "asus", count: 2 },
          { value: "msi", label: "msi", count: 1 },
        ]),
      ]),
    ).toBe(true);
  });

  it("prepareTaxonomyFacets — preserves API order + hide empty", () => {
    const prepared = prepareTaxonomyFacets([
      facet("vram_gb", "VRAM", "number", [
        { value: "16", label: "16", count: 3 },
        { value: "8", label: "8", count: 5 },
      ]),
      facet("brand", "Marca", "enum", [
        { value: "b", label: "b", count: 1 },
        { value: "a", label: "a", count: 2 },
      ]),
      facet("empty", "Empty", "enum", []),
    ]);
    expect(prepared.map((f) => f.id)).toEqual(["vram_gb", "brand"]);
    expect(prepared[0].values.map((v) => v.value)).toEqual(["8", "16"]);
    // enum por frequência
    expect(prepared[1].values.map((v) => v.value)).toEqual(["a", "b"]);
  });

  it("sortFacetValues — number numeric, enum by frequency", () => {
    const nums = sortFacetValues("number", [
      { value: "16", label: "16", count: 9 },
      { value: "8", label: "8", count: 2 },
      { value: "12", label: "12", count: 4 },
    ]);
    expect(nums.map((v) => v.value)).toEqual(["8", "12", "16"]);

    const enums = sortFacetValues("enum", [
      { value: "z", label: "z", count: 1 },
      { value: "a", label: "a", count: 5 },
      { value: "m", label: "m", count: 5 },
    ]);
    expect(enums.map((v) => v.value)).toEqual(["a", "m", "z"]);
  });

  it("toggle / boolean / clear / count", () => {
    let sel = clearTaxonomySelection();
    sel = toggleFacetValue(sel, "brand", "asus");
    sel = toggleFacetValue(sel, "brand", "msi");
    expect(countSelected(sel)).toBe(2);
    sel = toggleFacetValue(sel, "brand", "asus");
    expect(sel.brand).toEqual(["msi"]);
    sel = setBooleanFacet(sel, "rgb", true);
    expect(sel.rgb).toEqual(["true"]);
    sel = setBooleanFacet(sel, "rgb", false);
    expect(sel.rgb).toBeUndefined();
    expect(clearTaxonomySelection()).toEqual({});
  });

  it("deep-link prep — selectionTo/FromSearchParams (FASE 7.4 ready)", () => {
    const params = selectionToSearchParams({
      brand: ["asus"],
      vram_gb: ["16"],
      store: ["worten"],
    });
    expect(params.get("brand")).toBe("asus");
    expect(params.get("vram_gb")).toBe("16");
    expect(params.get("store")).toBe("worten");
    const back = selectionFromSearchParams(params, [
      "brand",
      "vram_gb",
      "store",
      "condition",
    ]);
    expect(back).toEqual({
      brand: ["asus"],
      vram_gb: ["16"],
      store: ["worten"],
    });
  });

  it("legacy min_price/max_price map to price_min/price_max", () => {
    const params = new URLSearchParams("min_price=100&max_price=500");
    const sel = selectionFromSearchParamsWithLegacy(params);
    expect(sel.price_min).toEqual(["100"]);
    expect(sel.price_max).toEqual(["500"]);
  });
});

describe("TaxonomyFacetPanel render", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", {
      getItem: () => null,
      setItem: () => undefined,
      removeItem: () => undefined,
    });
  });

  it("renders enum checkboxes with counts", () => {
    const f = facet("brand", "Marca", "enum", [
      { value: "asus", label: "ASUS", count: 12 },
      { value: "msi", label: "MSI", count: 9 },
    ]);
    const onChange = vi.fn();
    render(
      <TaxonomyFacetPanel facet={f} selection={{}} onChange={onChange} />,
    );
    expect(screen.getByText("Marca")).toBeTruthy();
    expect(screen.getByText("ASUS")).toBeTruthy();
    expect(screen.getByText("(12)")).toBeTruthy();
    fireEvent.click(screen.getByText("ASUS"));
    expect(onChange).toHaveBeenCalled();
    expect(onChange.mock.calls[0][0]).toEqual({ brand: ["asus"] });
  });

  it("renders number values", () => {
    const f = facet("vram_gb", "VRAM", "number", [
      { value: "8", label: "8 GB", count: 4 },
      { value: "16", label: "16 GB", count: 7 },
    ]);
    render(<TaxonomyFacetPanel facet={f} selection={{}} onChange={vi.fn()} />);
    expect(screen.getByText("8 GB")).toBeTruthy();
    expect(screen.getByText("16 GB")).toBeTruthy();
  });

  it("renders boolean switch", () => {
    const f = facet("rgb", "RGB", "boolean", [
      { value: "true", label: "true", count: 3 },
      { value: "false", label: "false", count: 2 },
    ]);
    render(<TaxonomyFacetPanel facet={f} selection={{}} onChange={vi.fn()} />);
    expect(screen.getByRole("switch")).toBeTruthy();
  });

  it("renders range placeholder", () => {
    const f = facet("tdp_w", "TDP", "range", [
      { value: "150", label: "150", count: 2 },
      { value: "320", label: "320", count: 1 },
    ]);
    const { container } = render(
      <TaxonomyFacetPanel facet={f} selection={{}} onChange={vi.fn()} />,
    );
    expect(container.querySelector('[data-facet-type="range"]')).toBeTruthy();
    expect(screen.getByText(/Intervalo/)).toBeTruthy();
  });
});

describe("TaxonomyFilters + FilterSidebar fallback", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", {
      getItem: () => null,
      setItem: () => undefined,
      removeItem: () => undefined,
    });
  });

  it("TaxonomyFilters hides empty and shows selection", () => {
    const facets = [
      facet("brand", "Marca", "enum", [
        { value: "asus", label: "ASUS", count: 2 },
        { value: "msi", label: "MSI", count: 1 },
      ]),
    ];
    const onChange = vi.fn();
    render(
      <TaxonomyFilters
        facets={facets}
        selection={{ brand: ["asus"] }}
        onChange={onChange}
        onClearSelection={vi.fn()}
      />,
    );
    expect(screen.getByTestId("taxonomy-filters")).toBeTruthy();
    expect(screen.getByText("ASUS")).toBeTruthy();
  });

  it("deep-link restore URL → selection", () => {
    const params = new URLSearchParams(
      "q=rtx&brand=asus&brand=msi&vram_gb=16&store=worten",
    );
    const sel = selectionFromSearchParams(params);
    expect(sel.brand).toEqual(["asus", "msi"]);
    expect(sel.vram_gb).toEqual(["16"]);
    expect(sel.store).toEqual(["worten"]);
    const roundtrip = selectionToSearchParams(sel);
    expect(roundtrip.getAll("brand")).toEqual(["asus", "msi"]);
    expect(roundtrip.get("vram_gb")).toBe("16");
  });

  it("FilterSidebar — sem taxonomyFacets usa UI legado", () => {
    render(
      <FilterSidebar
        facets={{
          categories: [],
          brands: [{ value: "asus", label: "ASUS", count: 3 }],
          stores: [{ value: "worten", label: "Worten", count: 2 }],
          types: [],
          models: [{ value: "rtx-4070", label: "RTX 4070", count: 1 }],
          vram: [{ value: "12-gb", label: "12 GB", count: 1 }],
        }}
        filters={{ ...EMPTY_FILTERS, subcategory: "Placas Gráficas" }}
        inferredCategory="gpu"
        minDraft=""
        maxDraft=""
        onMinDraft={vi.fn()}
        onMaxDraft={vi.fn()}
        onSelect={vi.fn()}
        onClear={vi.fn()}
        onApplyPrice={vi.fn()}
      />,
    );
    expect(screen.getByText("Modelo / Chipset")).toBeTruthy();
    expect(screen.getByText("Marca")).toBeTruthy();
    expect(screen.queryByTestId("taxonomy-filters")).toBeNull();
  });

  it("FilterSidebar — com taxonomyFacets renderiza dinâmico (sem hardcoded GPU)", () => {
    render(
      <FilterSidebar
        facets={{
          categories: [],
          brands: [],
          stores: [],
          types: [],
        }}
        taxonomyFacets={[
          facet("brand", "Marca", "enum", [
            { value: "asus", label: "ASUS", count: 12 },
            { value: "msi", label: "MSI", count: 9 },
          ]),
          facet("vram_gb", "VRAM", "number", [
            { value: "8", label: "8 GB", count: 4 },
            { value: "16", label: "16 GB", count: 7 },
          ]),
        ]}
        taxonomySelection={{}}
        onTaxonomySelectionChange={vi.fn()}
        filters={EMPTY_FILTERS}
        inferredCategory="gpu"
        minDraft=""
        maxDraft=""
        onMinDraft={vi.fn()}
        onMaxDraft={vi.fn()}
        onSelect={vi.fn()}
        onClear={vi.fn()}
        onApplyPrice={vi.fn()}
      />,
    );
    expect(screen.getByTestId("taxonomy-filters")).toBeTruthy();
    expect(screen.queryByText("Modelo / Chipset")).toBeNull();
    expect(screen.getByText("ASUS")).toBeTruthy();
    expect(screen.getByText("(12)")).toBeTruthy();
  });

  it("snapshot — taxonomy filters panel structure", () => {
    const { container } = render(
      <TaxonomyFilters
        facets={[
          facet("brand", "Marca", "enum", [
            { value: "asus", label: "ASUS", count: 12 },
            { value: "msi", label: "MSI", count: 9 },
          ]),
          facet("store", "Loja", "enum", [
            { value: "worten", label: "Worten", count: 5 },
            { value: "pcdiga", label: "PCDIGA", count: 3 },
          ]),
        ]}
        selection={{ brand: ["asus"] }}
        onChange={vi.fn()}
        onClearSelection={vi.fn()}
      />,
    );
    const root = container.firstChild as HTMLElement;
    expect(root?.getAttribute("data-testid")).toBe("taxonomy-filters");
    expect(container.querySelectorAll("[data-facet-id]").length).toBe(2);
    expect(screen.getByText("ASUS")).toBeTruthy();
    expect(screen.getByText("Worten")).toBeTruthy();
  });
});
