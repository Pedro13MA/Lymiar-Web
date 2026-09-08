/** Types for P3 Block 1 navigation (FE). */

export type TaxonomyTreeNode = {
  slug: string;
  display_name: string;
  parent?: string | null;
  level: number;
  is_active?: boolean;
  kind_allowed?: string | null;
  children: TaxonomyTreeNode[];
};

export type TaxonomyTreeResponse = {
  taxonomy_version: string;
  source?: string;
  tree: TaxonomyTreeNode[];
};

export type NavLinkItem = {
  label: string;
  slug: string;
  href: string;
  popular?: boolean;
  level?: "L1" | "L2" | "leaf";
};

/** Single row in the drill-down drawer (L1, L2, L3, or virtual Mais). */
export type DrillNavNode = {
  slug: string;
  label: string;
  href: string;
  /** Taxonomy level 1–3; 0 = virtual bucket (Mais). */
  level: number;
  emoji?: string;
  hasChildren: boolean;
  /** Virtual container — not a real taxonomy slug. */
  isVirtual?: boolean;
  children: DrillNavNode[];
};

export type DrillNavModel = {
  roots: DrillNavNode[];
  allCategoriesHref: string;
  taxonomyVersion: string | null;
};

/** @deprecated Use DrillNavModel — kept for gradual call-site migration. */
export type MegaMenuModel = DrillNavModel;

export type BreadcrumbItem = {
  label: string;
  href?: string;
};
