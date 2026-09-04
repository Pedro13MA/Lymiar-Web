import type { Metadata } from "next";
import { HomePageClient } from "@/components/home/v2/HomePageClient";
import {
  HomeFooter,
  HomeHeader,
} from "@/components/home/premium/HomeChrome";
import { SiteFooter, SiteHeader } from "@/components/layout/SiteHeader";
import { isP32NavigationEnabled } from "@/lib/nav/flags";
import "@/components/home/premium/home-premium.css";
import { SITE_URL } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Lymiar — Quando vale realmente a pena comprar",
  description:
    "Comparamos o preço atual com o histórico observado antes de recomendar uma compra.",
  alternates: { canonical: SITE_URL },
  openGraph: {
    title: "Lymiar — Quando vale realmente a pena comprar",
    description:
      "Inteligência de compra com histórico observado em Portugal.",
    url: SITE_URL,
    siteName: "Lymiar",
    locale: "pt_PT",
    type: "website",
    images: [
      {
        url: `${SITE_URL}/og-default.png`,
        width: 1200,
        height: 630,
        alt: "Lymiar",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Lymiar — Quando vale realmente a pena comprar",
    description:
      "Descobre se vale a pena comprar agora — com evidência de histórico.",
    images: [`${SITE_URL}/og-default.png`],
  },
};

function HomeJsonLd() {
  const website = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Lymiar",
    url: SITE_URL,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/search/?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
  const org = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Lymiar",
    url: SITE_URL,
    logo: `${SITE_URL}/brand/lymiar-logo-primary.png`,
  };
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(website) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(org) }}
      />
    </>
  );
}

export default function HomePage() {
  const p32 = isP32NavigationEnabled();
  return (
    <div className="home-premium">
      <HomeJsonLd />
      {p32 ? <SiteHeader /> : <HomeHeader />}
      <main className="home-main-pad">
        <HomePageClient />
      </main>
      {p32 ? <SiteFooter /> : <HomeFooter />}
    </div>
  );
}
