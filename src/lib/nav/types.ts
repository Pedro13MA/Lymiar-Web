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

export type NavGroup = {
  title: string;
  slug: string;
  href: string;
  items: NavLinkItem[];
};

export type NavL1Column = {
  id: string;
  label: string;
  emoji: string;
  href: string;
  anchorSlug: string;
  /** Flat list (popular-first) for quick links / legacy consumers. */
  items: NavLinkItem[];
  /** Full L2 → L3 map — primary megamenu body (scroll, no "ver tudo"). */
  groups: NavGroup[];
  brands: { label: string; href: string }[];
};

export type MegaMenuModel = {
  columns: NavL1Column[];
  quickLinks: NavLinkItem[];
  popularFallback: NavLinkItem[];
  allCategoriesHref: string;
  taxonomyVersion: string | null;
};

export type BreadcrumbItem = {
  label: string;
  href?: string;
};
