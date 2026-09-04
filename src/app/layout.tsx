import type { Metadata, Viewport } from "next";
import { GoogleAnalytics } from "@next/third-parties/google";
import { Space_Grotesk, Source_Sans_3, JetBrains_Mono } from "next/font/google";
import { AppProviders } from "@/components/providers/AppProviders";
import { DkModeToggle } from "@/components/ui/DkModeToggle";
import "./globals.css";

const display = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display-face",
  display: "swap",
});

const sans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono-face",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL("https://lymiar.com"),
  title: {
    default: "Lymiar — Quando vale realmente a pena comprar",
    template: "%s | Lymiar",
  },
  description:
    "Comparamos o preço atual com o histórico observado para perceber se vale a pena comprar agora, esperar, ou se ainda não há dados suficientes.",
  keywords: [
    "lymiar",
    "quando comprar",
    "histórico de preços portugal",
    "comparar lojas",
    "vale a pena comprar",
  ],
  authors: [{ name: "Pedro Martins" }],
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  manifest: "/site.webmanifest",
  openGraph: {
    type: "website",
    locale: "pt_PT",
    url: "https://lymiar.com",
    siteName: "Lymiar",
    title: "Lymiar — Quando vale realmente a pena comprar",
    description:
      "Comparamos o preço atual com o histórico observado. Comprar agora, esperar, ou ainda não sabemos.",
    images: [
      {
        url: "/og-default.png",
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
      "Comparamos o preço atual com o histórico observado. Comprar agora, esperar, ou ainda não sabemos.",
    images: ["/og-default.png"],
  },
  robots: { index: true, follow: true },
  alternates: { canonical: "https://lymiar.com" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-PT"
      className={`light ${display.variable} ${sans.variable} ${mono.variable}`}
    >
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/site.webmanifest" />
      </head>
      <body className="min-h-screen bg-slate-50 font-sans text-slate-500 antialiased">
        <AppProviders>
          {children}
          <DkModeToggle />
        </AppProviders>
        <GoogleAnalytics gaId="G-DDXSVE4ED7" />
      </body>
    </html>
  );
}
