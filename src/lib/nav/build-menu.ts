import {
  NAV_HIDDEN_L1_SLUGS,
  NAV_L1_EMOJI,
  NAV_L1_ORDER,
  NAV_LABEL_OVERRIDES,
  NAV_MAIS_ID,
  NAV_MAIS_L1_SLUGS,
  POPULAR_LEAF_FALLBACK,
} from "@/lib/nav/elevation";
import type {
  DrillNavModel,
  DrillNavNode,
  MegaMenuModel,
  NavLinkItem,
  TaxonomyTreeNode,
} from "@/lib/nav/types";

/** Dump / honesty queue — never shoppable nav destinations. */
const HIDDEN_SLUGS = new Set([
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

export function isNavigableTaxonomyNode(n: TaxonomyTreeNode): boolean {
  if (n.is_active === false) return false;
  if (HIDDEN_SLUGS.has(n.slug)) return false;
  if (n.slug === "unclassified") return false;
  if (n.slug.endsWith("_other")) return false;
  if (NAV_HIDDEN_L1_SLUGS.has(n.slug)) return false;
  return true;
}

function displayLabel(n: TaxonomyTreeNode): string {
  return NAV_LABEL_OVERRIDES[n.slug] || n.display_name;
}

function toDrillNode(n: TaxonomyTreeNode): DrillNavNode | null {
  if (!isNavigableTaxonomyNode(n)) return null;
  const kids = (n.children || [])
    .map(toDrillNode)
    .filter((c): c is DrillNavNode => Boolean(c));
  return {
    slug: n.slug,
    label: displayLabel(n),
    href: categoryHref(n.slug),
    level: n.level,
    emoji: n.level === 1 ? NAV_L1_EMOJI[n.slug] : undefined,
    hasChildren: kids.length > 0,
    children: kids,
  };
}

function orderByPreferred(
  nodes: TaxonomyTreeNode[],
  preferred: readonly string[],
): TaxonomyTreeNode[] {
  const bySlug = new Map(nodes.map((n) => [n.slug, n]));
  const ordered: TaxonomyTreeNode[] = [];
  const seen = new Set<string>();
  for (const slug of preferred) {
    const n = bySlug.get(slug);
    if (n && !seen.has(n.slug)) {
      seen.add(n.slug);
      ordered.push(n);
    }
  }
  for (const n of nodes) {
    if (!seen.has(n.slug)) {
      seen.add(n.slug);
      ordered.push(n);
    }
  }
  return ordered;
}

/**
 * Build L1 → L2 → L3 drill navigation from the live taxonomy tree.
 * Does not invent nodes; only filters dump leaves and applies label/order UX.
 */
export function buildDrillNavFromTree(
  tree: TaxonomyTreeNode[],
  taxonomyVersion: string | null,
): DrillNavModel {
  const l1Nodes = (tree || []).filter(
    (n) => n.level === 1 && isNavigableTaxonomyNode(n),
  );
  const maisSet = new Set<string>(NAV_MAIS_L1_SLUGS);
  const primary = l1Nodes.filter((n) => !maisSet.has(n.slug));
  const maisMembers = l1Nodes.filter((n) => maisSet.has(n.slug));

  const orderedPrimary = orderByPreferred(primary, NAV_L1_ORDER);
  const roots: DrillNavNode[] = [];

  for (const n of orderedPrimary) {
    const node = toDrillNode(n);
    if (node) roots.push(node);
  }

  if (maisMembers.length) {
    const orderedMais = orderByPreferred(maisMembers, NAV_MAIS_L1_SLUGS);
    const children = orderedMais
      .map(toDrillNode)
      .filter((c): c is DrillNavNode => Boolean(c));
    if (children.length) {
      roots.push({
        slug: NAV_MAIS_ID,
        label: "Mais",
        href: "/categorias/",
        level: 0,
        emoji: "⋯",
        hasChildren: true,
        isVirtual: true,
        children,
      });
    }
  }

  return {
    roots,
    allCategoriesHref: "/categorias/",
    taxonomyVersion,
  };
}

/** @deprecated Prefer buildDrillNavFromTree. */
export function buildMegaMenuFromTree(
  tree: TaxonomyTreeNode[],
  taxonomyVersion: string | null,
): MegaMenuModel {
  return buildDrillNavFromTree(tree, taxonomyVersion);
}

function linkFromNode(n: TaxonomyTreeNode, popular?: boolean): NavLinkItem {
  const level =
    n.level === 1 ? "L1" : n.level === 2 ? "L2" : ("leaf" as const);
  return {
    label: displayLabel(n),
    slug: n.slug,
    href: categoryHref(n.slug),
    level,
    popular,
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
    if (p && isNavigableTaxonomyNode(p)) out.push(linkFromNode(p));
  }
  const parent = node.parent ? bySlug.get(node.parent) : null;
  if (parent?.children) {
    for (const sib of parent.children) {
      if (sib.slug !== slug && isNavigableTaxonomyNode(sib)) {
        out.push(linkFromNode(sib));
      }
    }
  }
  return out.slice(0, 8);
}

function collectLeavesUnder(node: TaxonomyTreeNode): TaxonomyTreeNode[] {
  if (!node.children?.length) {
    return node.level >= 3 && isNavigableTaxonomyNode(node) ? [node] : [];
  }
  const out: TaxonomyTreeNode[] = [];
  for (const c of node.children) {
    if (!c.children?.length && c.level >= 3) {
      if (isNavigableTaxonomyNode(c)) out.push(c);
    } else {
      out.push(...collectLeavesUnder(c));
    }
  }
  return out;
}

export function flattenTreeForMap(
  tree: TaxonomyTreeNode[],
): { l1: TaxonomyTreeNode; l2: TaxonomyTreeNode[]; leaves: TaxonomyTreeNode[] }[] {
  return tree
    .filter((l1) => isNavigableTaxonomyNode(l1))
    .map((l1) => {
      const l2 = (l1.children || []).filter(isNavigableTaxonomyNode);
      const leaves = l2.flatMap((c) => collectLeavesUnder(c));
      return { l1, l2, leaves };
    });
}

/** Popular quick links derived from live tree (optional consumers). */
export function popularLinksFromTree(tree: TaxonomyTreeNode[]): NavLinkItem[] {
  const bySlug = indexTree(tree);
  const out: NavLinkItem[] = [];
  for (const slug of POPULAR_LEAF_FALLBACK) {
    const n = bySlug.get(slug);
    if (n && isNavigableTaxonomyNode(n)) out.push(linkFromNode(n, true));
  }
  return out.slice(0, 8);
}
