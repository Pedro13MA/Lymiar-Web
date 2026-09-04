/**
 * FASE 8.0 — testes de identidade (OAuth-first, Auth.js-aligned).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import { AUTH_PROVIDER_IDS, AUTH_PROVIDER_LABELS, authConfig } from "@/auth.config";
import {
  getStoredToken,
  setStoredToken,
  fetchSession,
  startOAuthLogin,
} from "@/lib/auth/session";
import { isProtectedPath } from "@/components/auth/ProtectedRoute";
import { LoginButtons } from "@/components/auth/LoginButton";
import { LoadingAuth } from "@/components/auth/LoadingAuth";
import { UserMenu } from "@/components/auth/UserMenu";
import { SessionProvider, useSession } from "@/components/auth/SessionProvider";
import { AuthProvider } from "@/components/auth/AuthProvider";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  usePathname: () => "/favoritos/",
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

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  sessionStorage.clear();
});

describe("providers / Auth.js config", () => {
  it("só Google OAuth", () => {
    expect(AUTH_PROVIDER_IDS).toEqual(["google"]);
    expect(authConfig.session?.strategy).toBe("jwt");
    expect(authConfig.pages?.signIn).toBe("/entrar");
    expect(authConfig.providers.length).toBe(1);
  });

  it("labels de login sem password", () => {
    for (const id of AUTH_PROVIDER_IDS) {
      expect(AUTH_PROVIDER_LABELS[id]).toMatch(/^Continuar com /);
      expect(AUTH_PROVIDER_LABELS[id].toLowerCase()).not.toContain("password");
    }
  });
});

describe("JWT token storage (cookies + bearer bridge)", () => {
  it("guarda e limpa token em sessionStorage", () => {
    setStoredToken("abc.jwt.token");
    expect(getStoredToken()).toBe("abc.jwt.token");
    setStoredToken(null);
    expect(getStoredToken()).toBeNull();
  });
});

describe("session fetch", () => {
  it("utilizador anónimo", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ authenticated: false, user: null }),
      }),
    );
    const s = await fetchSession();
    expect(s.authenticated).toBe(false);
    expect(s.user).toBeNull();
  });

  it("utilizador autenticado", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          authenticated: true,
          user: {
            id: "u1",
            provider: "google",
            providerAccountId: "g1",
            name: "Ana",
            email: "ana@example.com",
            image: null,
            createdAt: "2026-01-01T00:00:00Z",
            lastLogin: "2026-08-03T00:00:00Z",
          },
        }),
      }),
    );
    setStoredToken("tok");
    const s = await fetchSession();
    expect(s.authenticated).toBe(true);
    expect(s.user?.provider).toBe("google");
    expect(s.user?.email).toBe("ana@example.com");
  });
});

describe("OAuth login redirects", () => {
  beforeEach(() => {
    // @ts-expect-error test stub
    delete window.location;
    // @ts-expect-error test stub
    window.location = { href: "", origin: "http://localhost:3000" };
  });

  it("login Google aponta para Hub OAuth", () => {
    startOAuthLogin("google");
    expect(window.location.href).toContain("/api/v1/auth/google");
    expect(window.location.href).toContain("callbackUrl=");
  });
});

describe("rotas protegidas", () => {
  it("protege favoritos/alertas/projetos/timeline/perfil", () => {
    expect(isProtectedPath("/favoritos/")).toBe(true);
    expect(isProtectedPath("/alertas")).toBe(true);
    expect(isProtectedPath("/projetos/p/")).toBe(true);
    expect(isProtectedPath("/carrinho/")).toBe(false);
    expect(isProtectedPath("/timeline/")).toBe(true);
    expect(isProtectedPath("/perfil/")).toBe(true);
  });

  it("não bloqueia home/pesquisa/produto/mercado/catalogo/comparar", () => {
    expect(isProtectedPath("/")).toBe(false);
    expect(isProtectedPath("/search/")).toBe(false);
    expect(isProtectedPath("/p/")).toBe(false);
    expect(isProtectedPath("/mercado/")).toBe(false);
    expect(isProtectedPath("/catalogo/")).toBe(false);
    expect(isProtectedPath("/comparar/")).toBe(false);
    expect(isProtectedPath("/categoria/telemoveis/")).toBe(false);
  });
});

describe("UI: login / loading / menu", () => {
  it("LoadingAuth", () => {
    render(<LoadingAuth />);
    expect(screen.getByRole("status")).toBeTruthy();
  });

  it("LoginButtons mostra quatro providers", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ authenticated: false, user: null }),
      }),
    );
    render(
      <AuthProvider>
        <LoginButtons providers={[...AUTH_PROVIDER_IDS]} />
      </AuthProvider>,
    );
    await waitFor(() => {
      expect(screen.getByText("Continuar com Google")).toBeTruthy();
    });
    expect(screen.queryByText("Continuar com Apple")).toBeNull();
    expect(screen.queryByText("Continuar com Microsoft")).toBeNull();
    expect(screen.queryByText("Continuar com GitHub")).toBeNull();
  });

  it("header anónimo mostra Entrar", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ authenticated: false, user: null }),
      }),
    );
    render(
      <SessionProvider>
        <UserMenu />
      </SessionProvider>,
    );
    await waitFor(() => {
      expect(screen.getByText("Entrar")).toBeTruthy();
    });
  });

  it("header autenticado mostra menu com Terminar sessão", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          authenticated: true,
          user: {
            id: "u1",
            provider: "github",
            providerAccountId: "1",
            name: "Pedro",
            email: "p@example.com",
            image: null,
            createdAt: "2026-01-01T00:00:00Z",
            lastLogin: "2026-08-03T00:00:00Z",
          },
        }),
      }),
    );
    render(
      <SessionProvider>
        <UserMenu />
      </SessionProvider>,
    );
    await waitFor(() => {
      expect(screen.getByLabelText("Menu da conta")).toBeTruthy();
    });
    fireEvent.click(screen.getByLabelText("Menu da conta"));
    expect(screen.getByText("Minha Área")).toBeTruthy();
    expect(screen.getByText("Favoritos")).toBeTruthy();
    expect(screen.getByText("Projetos")).toBeTruthy();
    expect(screen.getByText("Alertas")).toBeTruthy();
    expect(screen.getByText("Notificações")).toBeTruthy();
    expect(screen.getByText("Perfil")).toBeTruthy();
    expect(screen.queryByText("Carrinho")).toBeNull();
    expect(screen.queryByText("Timeline")).toBeNull();
    expect(screen.getByText("Terminar sessão")).toBeTruthy();
  });
});

describe("logout", () => {
  it("signOut chama POST logout e limpa token", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ authenticated: false, user: null, ok: true }),
    });
    vi.stubGlobal("fetch", fetchMock);
    setStoredToken("tok");

    function Probe() {
      const { signOut } = useSession();
      return (
        <button type="button" onClick={() => void signOut()}>
          out
        </button>
      );
    }

    render(
      <SessionProvider>
        <Probe />
      </SessionProvider>,
    );
    await waitFor(() => screen.getByText("out"));
    fireEvent.click(screen.getByText("out"));
    await waitFor(() => {
      expect(getStoredToken()).toBeNull();
    });
    expect(
      fetchMock.mock.calls.some((c) => String(c[0]).includes("/api/v1/logout")),
    ).toBe(true);
  });
});
