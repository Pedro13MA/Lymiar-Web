import { describe, it, expect } from "vitest";
import { isP32NavigationEnabled, P32_FLAG_NAME } from "@/lib/nav/flags";
import {
  buildDrillNavFromTree,
  indexTree,
  isNavigableTaxonomyNode,
  relatedForSlug,
} from "@/lib/nav/build-menu";
import { NAV_MAIS_ID } from "@/lib/nav/elevation";
import type { TaxonomyTreeNode } from "@/lib/nav/types";

describe("P32 flags", () => {
  it("exports flag name", () => {
    expect(P32_FLAG_NAME).toBe("P32_NAVIGATION");
  });

  it("defaults to off when env unset", () => {
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
      {
        slug: "componentes",
        display_name: "Componentes",
        parent: "informatica",
        level: 2,
        children: [
          {
            slug: "cpu",
            display_name: "Processadores",
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
          {
            slug: "ram",
            display_name: "Memória RAM",
            parent: "componentes",
            level: 3,
            children: [],
          },
          {
            slug: "components_other",
            display_name: "Outros Componentes",
            parent: "componentes",
            level: 3,
            children: [],
          },
        ],
      },
      {
        slug: "monitores",
        display_name: "Monitores",
        parent: "informatica",
        level: 2,
        children: [
          {
            slug: "monitor",
            display_name: "Monitores",
            parent: "monitores",
            level: 3,
            children: [],
          },
        ],
      },
      {
        slug: "armazenamento",
        display_name: "Armazenamento",
        parent: "informatica",
        level: 2,
        children: [
          {
            slug: "external_ssd",
            display_name: "SSD Externos",
            parent: "armazenamento",
            level: 3,
            children: [],
          },
        ],
      },
      {
        slug: "redes",
        display_name: "Redes",
        parent: "informatica",
        level: 2,
        children: [
          {
            slug: "router",
            display_name: "Routers",
            parent: "redes",
            level: 3,
            children: [],
          },
        ],
      },
      {
        slug: "impressao",
        display_name: "Impressão",
        parent: "informatica",
        level: 2,
        children: [
          {
            slug: "printer",
            display_name: "Impressoras",
            parent: "impressao",
            level: 3,
            children: [],
          },
        ],
      },
      {
        slug: "perifericos",
        display_name: "Periféricos",
        parent: "informatica",
        level: 2,
        children: [
          {
            slug: "keyboard",
            display_name: "Teclados",
            parent: "perifericos",
            level: 3,
            children: [],
          },
        ],
      },
      {
        slug: "software",
        display_name: "Software",
        parent: "informatica",
        level: 2,
        children: [
          {
            slug: "os_license",
            display_name: "Sistemas Operativos",
            parent: "software",
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
        ],
      },
      {
        slug: "acessorios",
        display_name: "Acessórios",
        parent: "telemoveis",
        level: 2,
        children: [
          {
            slug: "power_bank",
            display_name: "Powerbanks",
            parent: "acessorios",
            level: 3,
            children: [],
          },
          {
            slug: "phone_accessory_other",
            display_name: "Outros Acessórios",
            parent: "acessorios",
            level: 3,
            children: [],
          },
        ],
      },
    ],
  },
  {
    slug: "gaming",
    display_name: "Gaming",
    level: 1,
    children: [
      {
        slug: "gaming_hardware",
        display_name: "Hardware",
        parent: "gaming",
        level: 2,
        children: [
          {
            slug: "console",
            display_name: "Consolas",
            parent: "gaming_hardware",
            level: 3,
            children: [],
          },
        ],
      },
    ],
  },
  {
    slug: "tv_audio",
    display_name: "TV e Áudio",
    level: 1,
    children: [
      {
        slug: "video",
        display_name: "Vídeo",
        parent: "tv_audio",
        level: 2,
        children: [
          {
            slug: "tv",
            display_name: "Televisores",
            parent: "video",
            level: 3,
            children: [],
          },
        ],
      },
    ],
  },
  {
    slug: "fotografia",
    display_name: "Fotografia",
    level: 1,
    children: [
      {
        slug: "cameras",
        display_name: "Câmaras",
        parent: "fotografia",
        level: 2,
        children: [
          {
            slug: "camera",
            display_name: "Câmaras",
            parent: "cameras",
            level: 3,
            children: [],
          },
        ],
      },
    ],
  },
  {
    slug: "casa",
    display_name: "Casa",
    level: 1,
    children: [
      {
        slug: "casa_geral",
        display_name: "Geral",
        parent: "casa",
        level: 2,
        children: [
          {
            slug: "consumer_batteries",
            display_name: "Pilhas / Baterias Consumo",
            parent: "casa_geral",
            level: 3,
            children: [],
          },
          {
            slug: "casa_other",
            display_name: "Outros Casa",
            parent: "casa_geral",
            level: 3,
            children: [],
          },
        ],
      },
    ],
  },
  {
    slug: "moda",
    display_name: "Moda",
    level: 1,
    children: [
      {
        slug: "vestuario",
        display_name: "Vestuário",
        parent: "moda",
        level: 2,
        children: [
          {
            slug: "apparel",
            display_name: "Vestuário Geral",
            parent: "vestuario",
            level: 3,
            children: [],
          },
        ],
      },
    ],
  },
  {
    slug: "servicos",
    display_name: "Serviços",
    level: 1,
    children: [
      {
        slug: "pos_venda",
        display_name: "Pós-venda",
        parent: "servicos",
        level: 2,
        children: [
          {
            slug: "warranty",
            display_name: "Garantias",
            parent: "pos_venda",
            level: 3,
            children: [],
          },
        ],
      },
    ],
  },
  {
    slug: "pecas",
    display_name: "Peças",
    level: 1,
    children: [
      {
        slug: "reparacao",
        display_name: "Reparação",
        parent: "pecas",
        level: 2,
        children: [
          {
            slug: "spare_part",
            display_name: "Peças Genéricas",
            parent: "reparacao",
            level: 3,
            children: [],
          },
        ],
      },
    ],
  },
  {
    slug: "outros",
    display_name: "Outros",
    level: 1,
    children: [
      {
        slug: "fila",
        display_name: "Fila",
        parent: "outros",
        level: 2,
        children: [
          {
            slug: "unclassified",
            display_name: "Não classificado",
            parent: "fila",
            level: 3,
            children: [],
          },
        ],
      },
    ],
  },
];

describe("buildDrillNavFromTree", () => {
  const nav = buildDrillNavFromTree(sampleTree, "1.1");

  it("nível 0: só L1 reais + Mais — sem Computadores/Componentes no topo", () => {
    const labels = nav.roots.map((r) => r.label);
    expect(labels).toEqual([
      "Informática",
      "Dispositivos móveis",
      "Gaming",
      "Imagem e Som",
      "Fotografia",
      "Casa",
      "Moda",
      "Mais",
    ]);
    const slugs = nav.roots.map((r) => r.slug);
    expect(slugs).not.toContain("computadores");
    expect(slugs).not.toContain("componentes");
    expect(slugs).not.toContain("outros");
  });

  it("nível 1 informatica: só L2, sem L3", () => {
    const info = nav.roots.find((r) => r.slug === "informatica");
    expect(info?.href).toBe("/categoria/informatica/");
    const l2 = info?.children.map((c) => c.slug) ?? [];
    expect(l2).toEqual([
      "computadores",
      "componentes",
      "monitores",
      "armazenamento",
      "redes",
      "impressao",
      "perifericos",
      "software",
    ]);
    for (const c of info?.children ?? []) {
      expect(c.level).toBe(2);
      expect(c.children.every((leaf) => leaf.level === 3)).toBe(true);
    }
  });

  it("nível 2 componentes: só L3 desse L2, paths correctos", () => {
    const info = nav.roots.find((r) => r.slug === "informatica");
    const comp = info?.children.find((c) => c.slug === "componentes");
    expect(comp?.href).toBe("/categoria/componentes/");
    const leaves = comp?.children.map((c) => c.slug) ?? [];
    expect(leaves).toEqual(["cpu", "gpu", "ram"]);
    expect(leaves).not.toContain("components_other");
    expect(leaves).not.toContain("keyboard");
    expect(leaves).not.toContain("router");
    expect(comp?.children.find((c) => c.slug === "cpu")?.href).toBe(
      "/categoria/cpu/",
    );
  });

  it("exclui dump leaves e *_other", () => {
    const flat: string[] = [];
    const walk = (nodes: typeof nav.roots) => {
      for (const n of nodes) {
        flat.push(n.slug);
        walk(n.children);
      }
    };
    walk(nav.roots);
    expect(flat.some((s) => s.endsWith("_other"))).toBe(false);
    expect(flat).not.toContain("unclassified");
    expect(flat).not.toContain("phone_accessory_other");
  });

  it("aplica labels UX e Mais virtual", () => {
    expect(nav.roots.find((r) => r.slug === "telemoveis")?.label).toBe(
      "Dispositivos móveis",
    );
    expect(nav.roots.find((r) => r.slug === "tv_audio")?.label).toBe(
      "Imagem e Som",
    );
    expect(
      nav.roots
        .find((r) => r.slug === "telemoveis")
        ?.children.find((c) => c.slug === "dispositivos")?.label,
    ).toBe("Telemóveis e tablets");
    const mais = nav.roots.find((r) => r.slug === NAV_MAIS_ID);
    expect(mais?.isVirtual).toBe(true);
    expect(mais?.children.map((c) => c.slug)).toEqual(["servicos", "pecas"]);
  });

  it("indexes tree by slug", () => {
    const map = indexTree(sampleTree);
    expect(map.get("cpu")?.display_name).toBe("Processadores");
  });

  it("relatedForSlug returns siblings", () => {
    const rel = relatedForSlug(sampleTree, "cpu");
    expect(rel.some((r) => r.slug === "gpu")).toBe(true);
    expect(rel.some((r) => r.slug === "componentes")).toBe(true);
  });

  it("isNavigableTaxonomyNode hides dump", () => {
    expect(
      isNavigableTaxonomyNode({
        slug: "unclassified",
        display_name: "X",
        level: 3,
        children: [],
      }),
    ).toBe(false);
    expect(
      isNavigableTaxonomyNode({
        slug: "components_other",
        display_name: "X",
        level: 3,
        children: [],
      }),
    ).toBe(false);
    expect(
      isNavigableTaxonomyNode({
        slug: "cpu",
        display_name: "Processadores",
        level: 3,
        children: [],
      }),
    ).toBe(true);
  });
});
