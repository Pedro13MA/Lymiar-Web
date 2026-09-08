import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, within, fireEvent } from "@testing-library/react";
import { BreadcrumbNav } from "@/components/nav/BreadcrumbNav";
import { EmptyCategory } from "@/components/nav/EmptyCategory";
import { BottomNavigation } from "@/components/nav/BottomNavigation";
import { MegaMenu } from "@/components/nav/MegaMenu";
import type { MegaMenuModel } from "@/lib/nav/types";

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

const sampleMenu: MegaMenuModel = {
  columns: [
    {
      id: "computadores",
      label: "Computadores",
      emoji: "💻",
      href: "/categoria/informatica/",
      anchorSlug: "informatica",
      items: [
        { label: "Portáteis", slug: "laptop", href: "/categoria/laptop/" },
        { label: "Desktops", slug: "desktop", href: "/categoria/desktop/" },
      ],
      groups: [
        {
          title: "Computadores",
          slug: "computadores",
          href: "/categoria/computadores/",
          items: [
            { label: "Portáteis", slug: "laptop", href: "/categoria/laptop/" },
            { label: "Desktops", slug: "desktop", href: "/categoria/desktop/" },
            { label: "Mini-PC", slug: "mini_pc", href: "/categoria/mini_pc/" },
          ],
        },
        {
          title: "Periféricos",
          slug: "perifericos",
          href: "/categoria/perifericos/",
          items: [
            { label: "Teclados", slug: "keyboard", href: "/categoria/keyboard/" },
            { label: "Ratos", slug: "mouse", href: "/categoria/mouse/" },
          ],
        },
      ],
      brands: [],
    },
    {
      id: "gaming",
      label: "Gaming",
      emoji: "🎮",
      href: "/categoria/gaming/",
      anchorSlug: "gaming",
      items: [
        { label: "Consolas", slug: "console", href: "/categoria/console/" },
      ],
      groups: [
        {
          title: "Hardware",
          slug: "gaming_hardware",
          href: "/categoria/gaming_hardware/",
          items: [
            { label: "Consolas", slug: "console", href: "/categoria/console/" },
          ],
        },
      ],
      brands: [],
    },
  ],
  quickLinks: [],
  popularFallback: [],
  allCategoriesHref: "/categorias/",
  taxonomyVersion: "1.2",
};

describe("MegaMenu drawer", () => {
  it("lists all categories and shows every subcategory without Ver tudo", () => {
    render(
      <MegaMenu
        model={sampleMenu}
        open
        onOpenChange={() => {}}
        triggerId="cat-trigger"
      />,
    );
    expect(screen.getByRole("tab", { name: /Computadores/ })).toBeTruthy();
    expect(screen.getByRole("tab", { name: /Gaming/ })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Portáteis" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Mini-PC" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Teclados" })).toBeTruthy();
    expect(screen.queryByText(/Ver tudo/i)).toBeNull();
    expect(screen.queryByText(/Explorar /i)).toBeNull();

    fireEvent.click(screen.getByRole("tab", { name: /Gaming/ }));
    expect(screen.getByRole("link", { name: "Consolas" })).toBeTruthy();
  });
});
