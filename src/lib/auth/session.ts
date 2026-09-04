/** Cliente de sessão — JWT em sessionStorage + cookie cross-origin no Hub. */

import { apiClient } from "@/lib/api-client";
import { normalizeRole } from "@/lib/auth/roles";
import type { LymiarSession, LymiarUser } from "@/lib/auth/types";
import type { AuthProviderId } from "@/auth.config";
import { getApiBaseUrl } from "@/lib/api-base-url";

const TOKEN_KEY = "lymiar_session_token";

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (token) sessionStorage.setItem(TOKEN_KEY, token);
    else sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore quota */
  }
}

function authHeaders(): HeadersInit {
  const token = getStoredToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function normalizeUser(user: LymiarUser | null | undefined): LymiarUser | null {
  if (!user) return null;
  return { ...user, role: normalizeRole(user.role) };
}

function normalizeSession(session: LymiarSession): LymiarSession {
  if (!session.authenticated || !session.user) {
    return { authenticated: false, user: null };
  }
  return { authenticated: true, user: normalizeUser(session.user) };
}

export async function fetchSession(): Promise<LymiarSession> {
  try {
    const session = await apiClient.get<LymiarSession>("/api/v1/session", {
      headers: authHeaders(),
      credentials: "include",
      label: "SESSION",
    });
    return normalizeSession(session);
  } catch {
    return { authenticated: false, user: null };
  }
}

export async function fetchMe(): Promise<LymiarUser | null> {
  try {
    const user = await apiClient.get<LymiarUser>("/api/v1/me", {
      headers: authHeaders(),
      credentials: "include",
      label: "ME",
    });
    return normalizeUser(user);
  } catch {
    return null;
  }
}

export async function updateMe(patch: {
  name?: string;
  image?: string | null;
}): Promise<LymiarUser> {
  return apiClient.patch<LymiarUser>("/api/v1/me", patch, {
    headers: authHeaders(),
    credentials: "include",
    label: "ME_PATCH",
  });
}

export async function deleteMe(confirmEmail: string): Promise<void> {
  await apiClient.delete("/api/v1/me", {
    headers: authHeaders(),
    credentials: "include",
    label: "ME_DELETE",
    body: { confirmEmail },
  });
  setStoredToken(null);
}

export async function logoutRemote(): Promise<void> {
  try {
    await apiClient.post(
      "/api/v1/logout",
      undefined,
      {
        headers: authHeaders(),
        credentials: "include",
        label: "LOGOUT",
      },
    );
  } finally {
    setStoredToken(null);
  }
}

export function startOAuthLogin(
  provider: AuthProviderId,
  callbackPath = "/entrar/callback/",
): void {
  if (typeof window === "undefined") return;
  const origin = window.location.origin;
  const callbackUrl = encodeURIComponent(`${origin}${callbackPath}`);
  window.location.href = `${getApiBaseUrl()}/api/v1/auth/${provider}?callbackUrl=${callbackUrl}`;
}
