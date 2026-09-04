"use client";

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { OpportunityCard } from "@/components/product/OpportunityCard";
import { WifiLoaderBlock } from "@/components/ui/WifiLoader";
import type { Product } from "@/lib/types";

export function HomeRadarCarousel({
  products,
  loading,
}: {
  products: Product[];
  loading: boolean;
}) {
  const count = products.length;

  if (loading && count === 0) {
    return (
      <div className="home-radar-carousel home-radar-carousel--loading">
        <WifiLoaderBlock
          text="A carregar"
          className="wifi-loader-block--compact"
        />
      </div>
    );
  }

  if (count === 0) {
    return (
      <p className="py-10 text-center text-sm text-slate-400">
        O radar atualiza em breve.
      </p>
    );
  }

  return (
    <Carousel
      className="home-radar-carousel w-full px-1 sm:px-2"
      opts={{
        align: "start",
        loop: count > 3,
        skipSnaps: false,
        dragFree: false,
      }}
    >
      {/* Gap: negativo no content + padding no item (padrão shadcn) */}
      <CarouselContent className="-ml-5 sm:-ml-6 md:-ml-7">
        {products.map((product) => (
          <CarouselItem
            key={product.ean || product.slug}
            className="basis-[86%] pl-5 sm:basis-[58%] sm:pl-6 md:basis-[48%] md:pl-7 lg:basis-[34%] xl:basis-[30%]"
          >
            <div className="h-full pb-3 pr-1 pt-1">
              <OpportunityCard product={product} compact />
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>
      {count > 1 ? (
        <>
          <CarouselPrevious className="left-0 flex h-9 w-9 sm:-left-3 sm:h-10 sm:w-10" />
          <CarouselNext className="right-0 flex h-9 w-9 sm:-right-3 sm:h-10 sm:w-10" />
        </>
      ) : null}
    </Carousel>
  );
}
