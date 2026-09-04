import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, within } from "@testing-library/react";
import { BreadcrumbNav } from "@/components/nav/BreadcrumbNav";
import { EmptyCategory } from "@/components/nav/EmptyCategory";
import { BottomNavigation } from "@/components/nav/BottomNavigation";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/categorias/",
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...rest
  }: {
    children: React.ReactNode;
    href: string;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

afterEach(() => cleanup());

describe("BreadcrumbNav", () => {
  it("renders trail with current page", () => {
    render(
      <BreadcrumbNav
        items={[
          { label: "Início", href: "/" },
          { label: "Wearables", href: "/categoria/wearables/" },
          { label: "Smartwatches" },
        ]}
      />,
    );
    const nav = screen.getByLabelText("Breadcrumb");
    expect(nav).toBeTruthy();
    expect(screen.getByText("Smartwatches")).toBeTruthy();
    const home = within(nav).getByRole("link", { name: "Início" });
    expect(home.getAttribute("href")).toBe("/");
  });
});

describe("EmptyCategory", () => {
  it("offers alternatives instead of bare zero", () => {
    render(
      <EmptyCategory
        title="Padel"
        parentHref="/categorias/"
        related={[{ label: "Gaming", slug: "gaming", href: "/categoria/gaming/" }]}
      />,
    );
    expect(screen.getByText(/Ainda não há produtos/i)).toBeTruthy();
    expect(screen.getByRole("link", { name: "Pesquisar" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Gaming" })).toBeTruthy();
  });
});

describe("BottomNavigation", () => {
  it("exposes five tabs", () => {
    render(<BottomNavigation />);
    const nav = screen.getByLabelText("Navegação inferior");
    expect(within(nav).getByRole("link", { name: "Início" })).toBeTruthy();
    expect(within(nav).getByRole("link", { name: "Categorias" })).toBeTruthy();
    expect(within(nav).getByRole("link", { name: "Pesquisar" })).toBeTruthy();
    expect(within(nav).getByRole("link", { name: "Avisos" })).toBeTruthy();
    expect(within(nav).getByRole("link", { name: "Perfil" })).toBeTruthy();
  });
});
