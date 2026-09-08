import {
  NAV_ELEVATION,
  POPULAR_LEAF_FALLBACK,
  type NavElevationSpec,
} from "@/lib/nav/elevation";
import type {
  MegaMenuModel,
  NavL1Column,
  NavLinkItem,
  TaxonomyTreeNode,
} from "@/lib/nav/types";

function categoryHref(slug: string): string {
  return `/categoria/${slug}/`;
}

function brandHref(leafSlug: string | undefined, brand: string): string {
  if (leafSlug) {
    return `${categoryHref(leafSlug)}?brand=${encodeURIComponent(brand)}`;
  }
  return `/mercado/marca/?id=${encodeURIComponent(brand)}`;
}

/** Flatten all nodes by slug. */
export function indexTree(
  tree: TaxonomyTreeNode[],
): Map<string, TaxonomyTreeNode> {
  const map = new Map<string, TaxonomyTreeNode>();
  const walk = (nodes: TaxonomyTreeNode[]) => {
    for (const n of nodes) {
      map.set(n.slug, n);
      if (n.children?.length) walk(n.children);
    }
  };
  walk(tree);
  return map;
}

function linkFromNode(n: TaxonomyTreeNode, popular?: boolean): NavLinkItem {
  const level =
    n.level === 1 ? "L1" : n.level === 2 ? "L2" : ("leaf" as const);
  return {
    label: n.display_name,
    slug: n.slug,
    href: categoryHref(n.slug),
    level,
    popular,
  };
}

function collectLeavesUnder(node: TaxonomyTreeNode): TaxonomyTreeNode[] {
  if (!node.children?.length) {
    return node.level >= 3 ? [node] : [];
  }
  const out: TaxonomyTreeNode[] = [];
  for (const c of node.children) {
    if (!c.children?.length && c.level >= 3) out.push(c);
    else out.push(...collectLeavesUnder(c));
  }
  return out;
}

function buildColumn(
  spec: NavElevationSpec,
  bySlug: Map<string, TaxonomyTreeNode>,
): NavL1Column | null {
  const anchor = bySlug.get(spec.anchorSlug);
  const items: NavLinkItem[] = [];
  const seen = new Set<string>();

  const push = (n: TaxonomyTreeNode | undefined, popular?: boolean) => {
    if (!n || seen.has(n.slug)) return;
    // Never duplicate the column hub label as a child link
    if (n.slug === spec.anchorSlug && n.display_name === spec.label) return;
    seen.add(n.slug);
    items.push(linkFromNode(n, popular));
  };

  const popularSet = new Set(spec.leafShortcuts.slice(0, 4));
  for (const slug of spec.leafShortcuts) {
    push(bySlug.get(slug), popularSet.has(slug));
  }

  if (!items.length && anchor?.children?.length) {
    for (const c of anchor.children.slice(0, 8)) {
      push(c);
    }
  }

  if (!items.length && !anchor) return null;

  const hubSlug = anchor?.slug || items[0]?.slug;
  if (!hubSlug) return null;

  const primaryLeaf =
    items.find((i) => i.level === "leaf")?.slug ||
    spec.leafShortcuts.find((s) => (bySlug.get(s)?.level ?? 0) >= 3);

  let secondarySeeAll: NavLinkItem | undefined;
  if (spec.secondarySeeAll) {
    const sec = bySlug.get(spec.secondarySeeAll.slug);
    if (sec) {
      secondarySeeAll = {
        label: spec.secondarySeeAll.label,
        slug: sec.slug,
        href: categoryHref(sec.slug),
        level: sec.level === 1 ? "L1" : sec.level === 2 ? "L2" : "leaf",
      };
    }
  }

  return {
    id: spec.id,
    label: spec.label,
    href: categoryHref(hubSlug),
    anchorSlug: hubSlug,
    items: items.slice(0, 14),
    seeAll: {
      label: `Explorar ${spec.label}`,
      slug: hubSlug,
      href: categoryHref(hubSlug),
      level: anchor?.level === 1 ? "L1" : "L2",
    },
    secondarySeeAll,
    brands: (spec.brands || []).map((b) => ({
      label: b.label,
      href: brandHref(primaryLeaf, b.brand),
    })),
  };
}

export function buildMegaMenuFromTree(
  tree: TaxonomyTreeNode[],
  taxonomyVersion: string | null,
): MegaMenuModel {
  const bySlug = indexTree(tree);
  const columns: NavL1Column[] = [];
  for (const spec of NAV_ELEVATION) {
    const col = buildColumn(spec, bySlug);
    if (col) columns.push(col);
  }

  const popularFallback: NavLinkItem[] = [];
  for (const slug of POPULAR_LEAF_FALLBACK) {
    const n = bySlug.get(slug);
    if (n) popularFallback.push(linkFromNode(n, true));
  }

  const quickLinks: NavLinkItem[] = popularFallback.slice(0, 8);

  return {
    columns,
    quickLinks,
    popularFallback,
    allCategoriesHref: "/categorias/",
    taxonomyVersion,
  };
}

/** Related sibling/parent links for a hub page. */
export function relatedForSlug(
  tree: TaxonomyTreeNode[],
  slug: string,
): NavLinkItem[] {
  const bySlug = indexTree(tree);
  const node = bySlug.get(slug);
  if (!node) return [];
  const out: NavLinkItem[] = [];
  if (node.parent) {
    const p = bySlug.get(node.parent);
    if (p) out.push(linkFromNode(p));
  }
  const parent = node.parent ? bySlug.get(node.parent) : null;
  if (parent?.children) {
    for (const sib of parent.children) {
      if (sib.slug !== slug) out.push(linkFromNode(sib));
    }
  }
  return out.slice(0, 8);
}

export function flattenTreeForMap(
  tree: TaxonomyTreeNode[],
): { l1: TaxonomyTreeNode; l2: TaxonomyTreeNode[]; leaves: TaxonomyTreeNode[] }[] {
  return tree.map((l1) => {
    const l2 = l1.children || [];
    const leaves = l2.flatMap((c) => collectLeavesUnder(c));
    return { l1, l2, leaves };
  });
}
