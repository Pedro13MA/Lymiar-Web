export { isP32NavigationEnabled, P32_FLAG_NAME } from "@/lib/nav/flags";
export {
  NAV_ELEVATION,
  P32_EXTRA_STATIC_SLUGS,
  POPULAR_LEAF_FALLBACK,
} from "@/lib/nav/elevation";
export {
  buildMegaMenuFromTree,
  flattenTreeForMap,
  indexTree,
  relatedForSlug,
} from "@/lib/nav/build-menu";
export type {
  BreadcrumbItem,
  MegaMenuModel,
  NavGroup,
  NavL1Column,
  NavLinkItem,
  TaxonomyTreeNode,
  TaxonomyTreeResponse,
} from "@/lib/nav/types";
