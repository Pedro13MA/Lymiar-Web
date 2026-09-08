import { describe, it, expect } from "vitest";
import { isP32NavigationEnabled, P32_FLAG_NAME } from "@/lib/nav/flags";
import { buildMegaMenuFromTree, indexTree, relatedForSlug } from "@/lib/nav/build-menu";
import type { TaxonomyTreeNode } from "@/lib/nav/types";

describe("P32 flags", () => {
  it("exports flag name", () => {
    expect(P32_FLAG_NAME).toBe("P32_NAVIGATION");
  });

  it("defaults to off when env unset", () => {
    // Next inlines env at build; unit test reads process.env
    const prev = process.env.NEXT_PUBLIC_P32_NAVIGATION;
    delete process.env.NEXT_PUBLIC_P32_NAVIGATION;
    expect(isP32NavigationEnabled()).toBe(false);
    process.env.NEXT_PUBLIC_P32_NAVIGATION = prev;
  });
});

const sampleTree: TaxonomyTreeNode[] = [
  {
    slug: "informatica",
    display_name: "Informática",
    level: 1,
    children: [
      {
        slug: "componentes",
        display_name: "Componentes",
        parent: "informatica",
        level: 2,
        children: [
          {
            slug: "ssd",
            display_name: "SSD",
            parent: "componentes",
            level: 3,
            children: [],
          },
          {
            slug: "gpu",
            display_name: "Placas Gráficas",
            parent: "componentes",
            level: 3,
            children: [],
          },
        ],
      },
      {
        slug: "computadores",
        display_name: "Computadores",
        parent: "informatica",
        level: 2,
        children: [
          {
            slug: "laptop",
            display_name: "Portáteis",
            parent: "computadores",
            level: 3,
            children: [],
          },
        ],
      },
    ],
  },
  {
    slug: "telemoveis",
    display_name: "Telemóveis",
    level: 1,
    children: [
      {
        slug: "dispositivos",
        display_name: "Dispositivos",
        parent: "telemoveis",
        level: 2,
        children: [
          {
            slug: "smartphone",
            display_name: "Smartphones",
            parent: "dispositivos",
            level: 3,
            children: [],
          },
          {
            slug: "smartwatch",
            display_name: "Smartwatches",
            parent: "dispositivos",
            level: 3,
            children: [],
          },
        ],
      },
    ],
  },
];

describe("buildMegaMenuFromTree", () => {
  it("builds columns from live tree without inventing unknown leaves", () => {
    const menu = buildMegaMenuFromTree(sampleTree, "1.1");
    expect(menu.columns.length).toBeGreaterThan(0);
    const comp = menu.columns.find((c) => c.id === "componentes");
    expect(comp?.items.some((i) => i.slug === "ssd")).toBe(true);
    expect(comp?.emoji).toBe("🧩");
    const wear = menu.columns.find((c) => c.id === "wearables");
    // wearables L2 absent in sample, but smartwatch leaf exists → column via shortcuts
    expect(wear?.items.some((i) => i.slug === "smartwatch")).toBe(true);
  });

  it("exposes all L3 leaves in scrollable groups (no truncated see-all)", () => {
    const menu = buildMegaMenuFromTree(sampleTree, "1.1");
    const comp = menu.columns.find((c) => c.id === "componentes");
    expect(comp?.groups.length).toBeGreaterThan(0);
    const leafSlugs = comp?.groups.flatMap((g) => g.items.map((i) => i.slug)) ?? [];
    expect(leafSlugs).toEqual(expect.arrayContaining(["ssd", "gpu"]));
    expect(comp).not.toHaveProperty("seeAll");
  });

  it("indexes tree by slug", () => {
    const map = indexTree(sampleTree);
    expect(map.get("ssd")?.display_name).toBe("SSD");
  });

  it("relatedForSlug returns siblings", () => {
    const rel = relatedForSlug(sampleTree, "ssd");
    expect(rel.some((r) => r.slug === "gpu")).toBe(true);
    expect(rel.some((r) => r.slug === "componentes")).toBe(true);
  });
});
