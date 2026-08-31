import type { Metadata } from "next";
import { SiteFooter, SiteHeader } from "@/components/layout/SiteHeader";
import { ProductPageClient } from "@/components/product/ProductPageClient";
import { detailToProduct, getDealsNow, getDealsWait, getProductBySlug } from "@/lib/api";
import { displayCategoryLabel, isOtherLabel } from "@/lib/product-display";
import { buildUsefulDescription } from "@/lib/product-content";
import { MOCK_PRODUCTS } from "@/lib/mocks";
import { formatEUR } from "@/lib/utils";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  const slugs = new Set<string>();
  for (const p of MOCK_PRODUCTS) {
    slugs.add(p.slug);
    slugs.add(p.ean);
  }
  try {
    const [now, wait] = await Promise.all([
      getDealsNow(50),
      getDealsWait(50),
    ]);
    for (const r of [...now.results, ...wait.results]) {
      slugs.add(r.slug);
      slugs.add(r.ean);
    }
  } catch {
    // Build sem API — mantém mocks
  }
  return Array.from(slugs).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const detail = await getProductBySlug(slug);
    const product = detailToProduct(detail);
    const cat =
      displayCategoryLabel(
        product.leafId?.replace(/_/g, " "),
        product.subcategoryLabel,
        isOtherLabel(product.category) ? null : product.category,
      ) || "";
    const titleParts = [
      product.name,
      product.brand && !product.name.toLowerCase().includes(product.brand.toLowerCase())
        ? product.brand
        : null,
      formatEUR(product.currentPrice),
      "Lymiar",
    ].filter(Boolean);
    const title = titleParts.join(" · ");
    const useful = buildUsefulDescription(product);
    const description =
      useful ||
      [
        product.name,
        cat || null,
        `desde ${formatEUR(product.currentPrice)}`,
        "histórico observado e comparação de lojas no Lymiar.",
      ]
        .filter(Boolean)
        .join(" — ");

    const images = product.imageUrls?.length
      ? product.imageUrls.slice(0, 3)
      : product.imageUrl
        ? [product.imageUrl]
        : [];

    return {
      title,
      description: description.slice(0, 160),
      openGraph: {
        title,
        description: description.slice(0, 160),
        type: "website",
        ...(images.length
          ? { images: images.map((url) => ({ url })) }
          : {}),
      },
      twitter: {
        card: "summary_large_image",
        title,
        description: description.slice(0, 160),
      },
    };
  } catch {
    return {
      title: `${slug} · Lymiar`,
      description: "Decisão Lymiar, histórico observado e onde comprar.",
    };
  }
}

export default async function ProductSlugPage({ params }: PageProps) {
  const { slug } = await params;
  return (
    <>
      <SiteHeader />
      <ProductPageClient slug={slug} />
      <SiteFooter />
    </>
  );
}
