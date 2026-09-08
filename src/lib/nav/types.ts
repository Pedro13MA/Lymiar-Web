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

export type NavL1Column = {
  id: string;
  label: string;
  href: string;
  anchorSlug: string;
  items: NavLinkItem[];
  seeAll?: NavLinkItem;
  /** Optional second explore link (e.g. Acessórios under Telemóveis). */
  secondarySeeAll?: NavLinkItem;
  brands: { label: string; href: string }[];
  groups?: { title: string; items: NavLinkItem[] }[];
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
