import {
  NAV_ELEVATION,
  POPULAR_LEAF_FALLBACK,
  type NavElevationSpec,
} from "@/lib/nav/elevation";
import type {
  MegaMenuModel,
  NavGroup,
  NavL1Column,
  NavLinkItem,
  TaxonomyTreeNode,
} from "@/lib/nav/types";

/** Dump / honesty queue leaves — not shown as shoppable nav destinations. */
const HIDDEN_LEAF_SLUGS = new Set([
  "unclassified",
  "non_catalog",
  "phone_accessory_other",
  "peripherals_other",
  "components_other",
  "casa_other",
]);

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

function isHiddenLeaf(n: TaxonomyTreeNode): boolean {
  if (HIDDEN_LEAF_SLUGS.has(n.slug)) return true;
  if (n.slug.endsWith("_other") && n.level >= 3) return true;
  return n.is_active === false;
}

function collectLeavesUnder(node: TaxonomyTreeNode): TaxonomyTreeNode[] {
  if (!node.children?.length) {
    return node.level >= 3 && !isHiddenLeaf(node) ? [node] : [];
  }
  const out: TaxonomyTreeNode[] = [];
  for (const c of node.children) {
    if (!c.children?.length && c.level >= 3) {
      if (!isHiddenLeaf(c)) out.push(c);
    } else {
      out.push(...collectLeavesUnder(c));
    }
  }
  return out;
}

function orderLeaves(
  leaves: TaxonomyTreeNode[],
  preferred: string[],
): TaxonomyTreeNode[] {
  const bySlug = new Map(leaves.map((l) => [l.slug, l]));
  const ordered: TaxonomyTreeNode[] = [];
  const seen = new Set<string>();
  for (const slug of preferred) {
    const n = bySlug.get(slug);
    if (n && !seen.has(n.slug)) {
      seen.add(n.slug);
      ordered.push(n);
    }
  }
  for (const n of leaves) {
    if (!seen.has(n.slug)) {
      seen.add(n.slug);
      ordered.push(n);
    }
  }
  return ordered;
}

function resolveGroupNodes(
  spec: NavElevationSpec,
  anchor: TaxonomyTreeNode | undefined,
  bySlug: Map<string, TaxonomyTreeNode>,
): TaxonomyTreeNode[] {
  if (spec.groupSlugs?.length) {
    return spec.groupSlugs
      .map((slug) => bySlug.get(slug))
      .filter((n): n is TaxonomyTreeNode => Boolean(n));
  }

  if (!anchor) return [];

  // Elevated L2 hub (e.g. componentes, wearables): one group = itself.
  if (anchor.level === 2) {
    return [anchor];
  }

  const ownAnchors = new Set(
    NAV_ELEVATION.filter((e) => e.id !== spec.id).map((e) => e.anchorSlug),
  );

  return (anchor.children || []).filter((c) => {
    if (c.is_active === false) return false;
    if (ownAnchors.has(c.slug)) return false;
    return Boolean(c.children?.length) || c.level === 2;
  });
}

function buildGroups(
  spec: NavElevationSpec,
  bySlug: Map<string, TaxonomyTreeNode>,
): NavGroup[] {
  const anchor = bySlug.get(spec.anchorSlug);
  const groupNodes = resolveGroupNodes(spec, anchor, bySlug);
  const popularSet = new Set(spec.leafShortcuts.slice(0, 6));
  const groups: NavGroup[] = [];

  for (const g of groupNodes) {
    const leaves = orderLeaves(collectLeavesUnder(g), spec.leafShortcuts);
    if (!leaves.length) continue;
    groups.push({
      title: g.display_name,
      slug: g.slug,
      href: categoryHref(g.slug),
      items: leaves.map((n) => linkFromNode(n, popularSet.has(n.slug))),
    });
  }

  // Fallback: shortcuts only when tree groups missing (partial API tree).
  if (!groups.length) {
    const items: NavLinkItem[] = [];
    const seen = new Set<string>();
    for (const slug of spec.leafShortcuts) {
      const n = bySlug.get(slug);
      if (!n || seen.has(n.slug) || isHiddenLeaf(n)) continue;
      seen.add(n.slug);
      items.push(linkFromNode(n, popularSet.has(n.slug)));
    }
    if (items.length) {
      groups.push({
        title: spec.label,
        slug: spec.anchorSlug,
        href: categoryHref(spec.anchorSlug),
        items,
      });
    }
  }

  return groups;
}

function buildColumn(
  spec: NavElevationSpec,
  bySlug: Map<string, TaxonomyTreeNode>,
): NavL1Column | null {
  const anchor = bySlug.get(spec.anchorSlug);
  const groups = buildGroups(spec, bySlug);
  if (!groups.length && !anchor) return null;

  const items: NavLinkItem[] = [];
  const seen = new Set<string>();
  for (const g of groups) {
    for (const item of g.items) {
      if (seen.has(item.slug)) continue;
      seen.add(item.slug);
      items.push(item);
    }
  }

  // Prefer shortcut order for flat items list.
  const preferred = orderLeaves(
    items
      .map((i) => bySlug.get(i.slug))
      .filter((n): n is TaxonomyTreeNode => Boolean(n)),
    spec.leafShortcuts,
  ).map((n) => linkFromNode(n, spec.leafShortcuts.slice(0, 6).includes(n.slug)));

  const hubSlug = anchor?.slug || groups[0]?.slug || preferred[0]?.slug;
  if (!hubSlug) return null;

  const primaryLeaf =
    preferred.find((i) => i.level === "leaf")?.slug ||
    spec.leafShortcuts.find((s) => (bySlug.get(s)?.level ?? 0) >= 3);

  return {
    id: spec.id,
    label: spec.label,
    emoji: spec.emoji,
    href: categoryHref(hubSlug),
    anchorSlug: hubSlug,
    items: preferred.length ? preferred : items,
    groups,
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
