import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, within, fireEvent } from "@testing-library/react";
import { BreadcrumbNav } from "@/components/nav/BreadcrumbNav";
import { EmptyCategory } from "@/components/nav/EmptyCategory";
import { BottomNavigation } from "@/components/nav/BottomNavigation";
import { MegaMenu } from "@/components/nav/MegaMenu";
import type { DrillNavModel } from "@/lib/nav/types";
import { NAV_MAIS_ID } from "@/lib/nav/elevation";

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

const sampleMenu: DrillNavModel = {
  roots: [
    {
      slug: "informatica",
      label: "Informática",
      href: "/categoria/informatica/",
      level: 1,
      emoji: "💻",
      hasChildren: true,
      children: [
        {
          slug: "componentes",
          label: "Componentes",
          href: "/categoria/componentes/",
          level: 2,
          hasChildren: true,
          children: [
            {
              slug: "cpu",
              label: "Processadores",
              href: "/categoria/cpu/",
              level: 3,
              hasChildren: false,
              children: [],
            },
            {
              slug: "gpu",
              label: "Placas Gráficas",
              href: "/categoria/gpu/",
              level: 3,
              hasChildren: false,
              children: [],
            },
          ],
        },
        {
          slug: "computadores",
          label: "Computadores",
          href: "/categoria/computadores/",
          level: 2,
          hasChildren: true,
          children: [
            {
              slug: "laptop",
              label: "Portáteis",
              href: "/categoria/laptop/",
              level: 3,
              hasChildren: false,
              children: [],
            },
          ],
        },
      ],
    },
    {
      slug: "gaming",
      label: "Gaming",
      href: "/categoria/gaming/",
      level: 1,
      emoji: "🎮",
      hasChildren: true,
      children: [
        {
          slug: "gaming_hardware",
          label: "Hardware",
          href: "/categoria/gaming_hardware/",
          level: 2,
          hasChildren: true,
          children: [
            {
              slug: "console",
              label: "Consolas",
              href: "/categoria/console/",
              level: 3,
              hasChildren: false,
              children: [],
            },
          ],
        },
      ],
    },
    {
      slug: NAV_MAIS_ID,
      label: "Mais",
      href: "/categorias/",
      level: 0,
      isVirtual: true,
      hasChildren: true,
      children: [
        {
          slug: "servicos",
          label: "Serviços",
          href: "/categoria/servicos/",
          level: 1,
          hasChildren: false,
          children: [],
        },
      ],
    },
  ],
  allCategoriesHref: "/categorias/",
  taxonomyVersion: "1.2",
};

describe("MegaMenu drill-down drawer", () => {
  it("nível 0 shows only L1, not Computadores/Componentes as tops", () => {
    render(
      <MegaMenu
        model={sampleMenu}
        open
        onOpenChange={() => {}}
        triggerId="cat-trigger"
      />,
    );
    expect(screen.getByRole("button", { name: /Informática/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Gaming/ })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /^Computadores/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /^Componentes/ })).toBeNull();
    expect(screen.queryByText(/Ver tudo/i)).toBeNull();
    expect(screen.queryByText(/Explorar /i)).toBeNull();
  });

  it("drills L1 → L2 → L3 and supports Voltar + Escape", () => {
    const onOpenChange = vi.fn();
    render(
      <MegaMenu
        model={sampleMenu}
        open
        onOpenChange={onOpenChange}
        triggerId="cat-trigger"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Informática/ }));
    expect(screen.getByRole("button", { name: /Componentes/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Computadores/ })).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Processadores" })).toBeNull();

    const infoTitle = screen.getByRole("link", { name: "Informática" });
    expect(infoTitle.getAttribute("href")).toBe("/categoria/informatica/");

    fireEvent.click(screen.getByRole("button", { name: /Componentes/ }));
    expect(screen.getByRole("link", { name: "Processadores" }).getAttribute("href")).toBe(
      "/categoria/cpu/",
    );
    expect(screen.getByRole("link", { name: "Placas Gráficas" })).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Portáteis" })).toBeNull();

    const compTitle = screen.getByRole("link", { name: "Componentes" });
    expect(compTitle.getAttribute("href")).toBe("/categoria/componentes/");

    fireEvent.click(screen.getByRole("button", { name: /Voltar/ }));
    expect(screen.getByRole("button", { name: /Componentes/ })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /Voltar/ }));
    expect(screen.getByRole("button", { name: /Informática/ })).toBeTruthy();

    fireEvent.keyDown(window, { key: "Escape" });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("Fechar and click-outside close the drawer", () => {
    const onOpenChange = vi.fn();
    render(
      <MegaMenu
        model={sampleMenu}
        open
        onOpenChange={onOpenChange}
        triggerId="cat-trigger"
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Fechar" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);

    onOpenChange.mockClear();
    cleanup();
    render(
      <MegaMenu
        model={sampleMenu}
        open
        onOpenChange={onOpenChange}
        triggerId="cat-trigger"
      />,
    );
    fireEvent.click(screen.getByLabelText("Fechar categorias"));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
