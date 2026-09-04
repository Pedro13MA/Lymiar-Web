/** Admin identity match review — Control Center Fase B */

import { getApiBaseUrl } from "@/lib/api-base-url";
import { getStoredToken } from "@/lib/auth/session";

function authHeaders(): HeadersInit {
  const token = getStoredToken();
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    "Content-Type": "application/json",
  };
}

async function adminFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    headers: { ...authHeaders(), ...(init?.headers || {}) },
    credentials: "include",
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`admin_http_${res.status}:${text.slice(0, 200)}`);
  }
  return res.json() as Promise<T>;
}

export type IdentityQueueItem = {
  source_key: string;
  source_merchant_product_id: string | null;
  source_name: string | null;
  source_brand: string | null;
  source_condition: string | null;
  source_leaf_id: string | null;
  candidate_ean: string;
  candidate_name: string | null;
  match_score: number;
  second_score: number | null;
  score_margin: number | null;
  promotion_tier: string | null;
  hard_rule_status: string | null;
  match_status: string;
  identity_matched_from: string | null;
};

export type IdentityCandidate = {
  candidate_ean: string;
  candidate_store: string | null;
  candidate_name: string | null;
  match_score: number;
  match_level: string | null;
  match_status: string;
  match_reasons: string[];
  match_penalties: string[];
  second_score: number | null;
  score_margin: number | null;
  hard_rule_status: string | null;
  promotion_tier: string | null;
  identity_matched_from: string | null;
  profile?: IdentityProductProfile | null;
};

export type IdentityProductProfile = {
  title?: string | null;
  brand?: string | null;
  model?: string | null;
  storage?: string | null;
  color?: string | null;
  condition?: string | null;
};

export type IdentityApproveResult = {
  ok: boolean;
  promoted?: boolean;
  already_promoted?: boolean;
  candidate_ean: string;
  canonical_ean?: string;
  canonical_name?: string | null;
  site_path?: string;
  stores?: Array<{
    store_slug: string;
    offer_count: number;
    min_price: number | null;
  }>;
};

export type IdentitySearchProduct = {
  ean: string;
  canonical_name: string | null;
  brand: string | null;
  offerCount?: number;
  bestPrice?: number | null;
};
export type IdentitySummary = {
  ok: boolean;
  store: string;
  lmsku_remaining: number;
  promoted_total: number;
  with_candidates: number;
  no_match: number;
  safe_100_top: number;
  shadow_or_review: number;
  tier_top_candidate: Record<string, number>;
};

export async function fetchIdentitySummary(store = "powerplanetpt"): Promise<IdentitySummary> {
  return adminFetch(`/api/admin/identity/summary?store=${encodeURIComponent(store)}`);
}

export async function fetchIdentityQueue(params: {
  store?: string;
  min_score?: number;
  tier?: string;
  limit?: number;
  offset?: number;
}): Promise<{
  ok: boolean;
  total: number;
  items: IdentityQueueItem[];
  limit: number;
  offset: number;
}> {
  const q = new URLSearchParams();
  if (params.store) q.set("store", params.store);
  if (params.min_score != null) q.set("min_score", String(params.min_score));
  if (params.tier) q.set("tier", params.tier);
  if (params.limit != null) q.set("limit", String(params.limit));
  if (params.offset != null) q.set("offset", String(params.offset));
  return adminFetch(`/api/admin/identity/queue?${q.toString()}`);
}

export async function fetchIdentityDetail(sourceKey: string): Promise<{
  ok: boolean;
  source: {
    source_key: string;
    canonical_name: string | null;
    brand: string | null;
    condition: string | null;
    leaf_id: string | null;
    merchant_product_id: string | null;
    profile?: IdentityProductProfile;
  };
  candidates: IdentityCandidate[];
  pending_count: number;
}> {
  return adminFetch(`/api/admin/identity/queue/${encodeURIComponent(sourceKey)}`);
}

export async function searchIdentityCanonical(params: {
  q: string;
  brand?: string;
  limit?: number;
}): Promise<{ ok: boolean; products: IdentitySearchProduct[] }> {
  const sp = new URLSearchParams();
  sp.set("q", params.q);
  if (params.brand) sp.set("brand", params.brand);
  if (params.limit != null) sp.set("limit", String(params.limit));
  return adminFetch(`/api/admin/identity/search?${sp.toString()}`);
}

export async function approveIdentityMatch(
  sourceKey: string,
  candidateEan: string,
  identityMatchedFrom?: string,
): Promise<IdentityApproveResult> {
  return adminFetch(`/api/admin/identity/queue/${encodeURIComponent(sourceKey)}/approve`, {
    method: "POST",
    body: JSON.stringify({
      candidate_ean: candidateEan,
      identity_matched_from: identityMatchedFrom,
    }),
  });
}

export async function rejectIdentityMatch(
  sourceKey: string,
  candidateEan: string,
  reason?: string,
) {
  return adminFetch(`/api/admin/identity/queue/${encodeURIComponent(sourceKey)}/reject`, {
    method: "POST",
    body: JSON.stringify({ candidate_ean: candidateEan, reason }),
  });
}

export async function dismissIdentitySource(sourceKey: string) {
  return adminFetch(`/api/admin/identity/queue/${encodeURIComponent(sourceKey)}/dismiss`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}
