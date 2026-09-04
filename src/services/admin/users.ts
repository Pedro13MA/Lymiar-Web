/** Admin users API */

import { getApiBaseUrl } from "@/lib/api-base-url";
import { getStoredToken } from "@/lib/auth/session";

function authHeaders(): HeadersInit {
  const token = getStoredToken();
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    "Content-Type": "application/json",
  };
}

export type AdminUser = {
  id: string;
  name: string | null;
  email: string;
  provider: string | null;
  role: string;
  createdAt: string | null;
  lastLogin: string | null;
  image: string | null;
};

export async function fetchAdminUsers(): Promise<{
  ok: boolean;
  users: AdminUser[];
  viewerId: string;
}> {
  const res = await fetch(`${getApiBaseUrl()}/api/admin/users`, {
    headers: authHeaders(),
    credentials: "include",
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`users_http_${res.status}`);
  return res.json();
}

export async function patchAdminUserRole(
  userId: string,
  role: string,
): Promise<{ ok: boolean; user: { id: string; email: string; role: string } }> {
  const res = await fetch(
    `${getApiBaseUrl()}/api/admin/users/${encodeURIComponent(userId)}/role`,
    {
      method: "PATCH",
      headers: authHeaders(),
      credentials: "include",
      body: JSON.stringify({ role }),
    },
  );
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`role_http_${res.status}:${text.slice(0, 120)}`);
  }
  return res.json();
}
