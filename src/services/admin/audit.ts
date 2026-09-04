/** Admin audit log */

import { getApiBaseUrl } from "@/lib/api-base-url";
import { getStoredToken } from "@/lib/auth/session";

function authHeaders(): HeadersInit {
  const token = getStoredToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export type AuditEntry = {
  id: string;
  adminUserId: string;
  action: string;
  resource: string;
  resourceId: string | null;
  oldValue: unknown;
  newValue: unknown;
  ip: string | null;
  createdAt: string;
};

export async function fetchAdminAudit(params?: {
  limit?: number;
  offset?: number;
  resource?: string;
}): Promise<{ ok: boolean; entries: AuditEntry[] }> {
  const sp = new URLSearchParams();
  if (params?.limit != null) sp.set("limit", String(params.limit));
  if (params?.offset != null) sp.set("offset", String(params.offset));
  if (params?.resource) sp.set("resource", params.resource);
  const q = sp.toString();
  const res = await fetch(`${getApiBaseUrl()}/api/admin/audit${q ? `?${q}` : ""}`, {
    headers: authHeaders(),
    credentials: "include",
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`audit_http_${res.status}`);
  return res.json();
}
