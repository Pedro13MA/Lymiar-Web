/**
 * Auth.js (NextAuth v5) config — Google only (superfície OAuth mínima).
 *
 * Runtime OAuth/JWT: Hub `/api/v1/auth/*` (export estático não hospeda Route Handlers).
 */

import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

export const AUTH_PROVIDER_IDS = ["google"] as const;

export type AuthProviderId = (typeof AUTH_PROVIDER_IDS)[number];

export const AUTH_PROVIDER_LABELS: Record<AuthProviderId, string> = {
  google: "Continuar com Google",
};

export const authConfig = {
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID ?? process.env.AUTH_GOOGLE_CLIENT_ID,
      clientSecret:
        process.env.AUTH_GOOGLE_SECRET ?? process.env.AUTH_GOOGLE_CLIENT_SECRET,
    }),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/entrar",
  },
  trustHost: true,
} satisfies NextAuthConfig;
