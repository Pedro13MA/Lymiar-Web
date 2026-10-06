import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import {
  ProductActionPlaceholders,
  ProductTelegramStrip,
} from "@/components/product/p34/ProductActionPlaceholders";
import {
  ProductRelatedInterestSection,
  ProductSimilarSection,
} from "@/components/product/p34/ProductDiscoveryPlaceholders";
import {
  ProductCouponsSection,
  ProductStoresEmpty,
} from "@/components/product/p34/ProductCouponsSection";
import { ProductPdpSkeleton } from "@/components/product/p34/ProductPdpSkeleton";
import type { Product } from "@/lib/types";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

const getStorePromotions = vi.fn();
const getCoupons = vi.fn();

vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
  return {
    ...actual,
    getStorePromotions: (...args: unknown[]) => getStorePromotions(...args),
    getCoupons: (...args: unknown[]) => getCoupons(...args),
  };
});

const baseProduct = {
  ean: "1",
  slug: "test",
  name: "Test Product",
  brand: "Brand",
  category: "ssd",
  currentPrice: 10,
  offers: [],
  history: [],
  recommendations: {},
} as unknown as Product;

beforeEach(() => {
  getStorePromotions.mockReset();
  getCoupons.mockReset();
  getStorePromotions.mockResolvedValue({
    storeSlug: "worten",
    count: 0,
    results: [],
  });
  getCoupons.mockResolvedValue({ store: null, coupons: [] });
});

describe("P34 PDP placeholders", () => {
  it("action placeholders stay empty (no fake CTAs)", () => {
    const { container } = render(<ProductActionPlaceholders />);
    expect(container.firstChild).toBeNull();
  });

  it("renders telegram strip with link", () => {
    render(<ProductTelegramStrip />);
    expect(screen.getByLabelText(/Telegram/i)).toBeTruthy();
    expect(screen.getByRole("link", { name: /Abrir canal/i })).toBeTruthy();
  });

  it("similar empty placeholder", () => {
    render(<ProductSimilarSection products={[]} />);
    expect(screen.getByText(/semelhantes suficientes/i)).toBeTruthy();
  });

  it("related interest placeholder", () => {
    render(<ProductRelatedInterestSection />);
    expect(screen.getByText(/Também pode interessar/i)).toBeTruthy();
  });

  it("coupons section hidden when no offer stores", async () => {
    const { container } = render(
      <ProductCouponsSection product={baseProduct} />,
    );
    await waitFor(() => {
      expect(container.querySelector("#cupoes")).toBeNull();
    });
    expect(screen.queryByText(/Sem cupões/i)).toBeNull();
  });

  it("coupons section shows compact cards for offer stores", async () => {
    getStorePromotions.mockResolvedValue({
      storeSlug: "worten",
      count: 1,
      results: [
        {
          externalId: "1",
          merchantId: "1",
          storeName: "Worten PT",
          storeSlug: "worten",
          title: "Hot Days",
          description: "Aproveita +10%",
          code: null,
          url: "https://www.worten.pt/campanha/hot-days",
          promotionType: "promotion",
          discountKind: "percent",
          discountValue: 10,
          startDate: "2026-10-05T00:00:00+00:00",
          endDate: "2026-10-09T21:59:00+00:00",
          isActive: true,
        },
      ],
    });

    render(
      <ProductCouponsSection
        product={{
          ...baseProduct,
          offers: [
            {
              store: "wortenpt",
              storeName: "Worten",
              slug: "wortenpt",
              url: "https://worten.pt",
              price: 35,
            },
          ],
        }}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText(/Cupões e campanhas/i)).toBeTruthy();
    });
    expect(screen.getByText("Hot Days")).toBeTruthy();
    expect(screen.getByText("10%")).toBeTruthy();
    expect(screen.getByText(/Sem código/i)).toBeTruthy();
    expect(
      screen.queryByText(/Existe campanha ou cupão numa loja/i),
    ).toBeNull();
  });

  it("stores empty", () => {
    render(<ProductStoresEmpty />);
    expect(screen.getByText(/não há lojas/i)).toBeTruthy();
  });

  it("skeleton has aria-busy", () => {
    render(<ProductPdpSkeleton />);
    const el = screen.getByLabelText(/A carregar produto/i);
    expect(el.getAttribute("aria-busy")).toBe("true");
  });
});
