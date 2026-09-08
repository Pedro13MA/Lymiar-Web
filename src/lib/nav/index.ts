export { isP32NavigationEnabled, P32_FLAG_NAME } from "@/lib/nav/flags";
export {
  NAV_L1_ORDER,
  NAV_LABEL_OVERRIDES,
  NAV_MAIS_ID,
  NAV_MAIS_L1_SLUGS,
  P32_EXTRA_STATIC_SLUGS,
  POPULAR_LEAF_FALLBACK,
} from "@/lib/nav/elevation";
export {
  buildDrillNavFromTree,
  buildMegaMenuFromTree,
  flattenTreeForMap,
  indexTree,
  isNavigableTaxonomyNode,
  popularLinksFromTree,
  relatedForSlug,
} from "@/lib/nav/build-menu";
export type {
  BreadcrumbItem,
  DrillNavModel,
  DrillNavNode,
  MegaMenuModel,
  NavLinkItem,
  TaxonomyTreeNode,
  TaxonomyTreeResponse,
} from "@/lib/nav/types";
