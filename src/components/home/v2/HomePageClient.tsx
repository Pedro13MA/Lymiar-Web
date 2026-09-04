"use client";

import { HomeHeroPremium } from "@/components/home/premium/HomeHeroPremium";
import { HomeDecisionsPremium } from "@/components/home/premium/HomeDecisionsPremium";
import { HomeDealsProvider } from "@/components/home/premium/HomeDealsProvider";
import { HomeEssence } from "@/components/home/premium/HomeEssence";
import { HomeExplorePremium } from "@/components/home/premium/HomeExplorePremium";
import { HomeCouponsPremium } from "@/components/home/premium/HomeCouponsPremium";
import { HomeTelegramPremium } from "@/components/home/premium/HomeTelegramPremium";
import { LazySection } from "@/components/ui/LazySection";

/**
 * Homepage — radar no hero; decisões com produtos por veredicto; sem duplicar mosaicos.
 */
export function HomePageClient() {
  return (
    <HomeDealsProvider>
      <HomeHeroPremium />
      <LazySection minHeight="28rem">
        <HomeDecisionsPremium />
      </LazySection>
      <LazySection minHeight="18rem">
        <HomeEssence />
      </LazySection>
      <LazySection minHeight="12rem">
        <HomeExplorePremium />
      </LazySection>
      <LazySection minHeight="14rem">
        <HomeCouponsPremium />
      </LazySection>
      <LazySection minHeight="10rem">
        <HomeTelegramPremium />
      </LazySection>
    </HomeDealsProvider>
  );
}
