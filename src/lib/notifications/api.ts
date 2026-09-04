/** FASE 8.2 — cliente API de notificações. */

import { apiClient } from "@/lib/api-client";
import { getStoredToken } from "@/lib/auth/session";

export type AppNotification = {
  id: string;
  userId: string;
  eventId?: string | null;
  title: string;
  body: string;
  href?: string | null;
  channel: string;
  status: "unread" | "read" | "archived" | string;
  archived: boolean;
  createdAt: string;
  readAt?: string | null;
};

export type NotificationPreferences = {
  channels: { email: boolean; push: boolean; browser: boolean };
  scopes: Record<string, boolean>;
  quietHours: { enabled: boolean; start: string; end: string };
  frequency: "immediate" | "daily" | "weekly" | string;
  productEvents: Record<string, boolean>;
};

function headers(extra?: HeadersInit): HeadersInit {
  const token = getStoredToken();
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(extra || {}),
  };
}

async function req<T>(path: string, init?: { method?: string; body?: unknown; headers?: HeadersInit }): Promise<T> {
  const method = init?.method || "GET";
  const opts = {
    headers: headers(init?.headers),
    credentials: "include" as const,
    label: "NOTIFICATIONS",
  };
  if (method === "POST") {
    return apiClient.post<T>(path, init?.body, opts);
  }
  return apiClient.get<T>(path, opts);
}

export async function fetchNotifications(params?: {
  status?: string;
  archived?: boolean;
  q?: string;
}): Promise<AppNotification[]> {
  const sp = new URLSearchParams();
  if (params?.status) sp.set("status", params.status);
  if (params?.archived != null) sp.set("archived", params.archived ? "1" : "0");
  if (params?.q) sp.set("q", params.q);
  const qs = sp.toString();
  const data = await req<{ items: AppNotification[] }>(
    `/api/v1/notifications${qs ? `?${qs}` : ""}`,
  );
  return data.items;
}

export async function fetchUnreadCount(): Promise<number> {
  const data = await req<{ count: number }>("/api/v1/notifications/unread");
  return data.count;
}

export async function markNotificationsRead(
  ids: string[],
  opts?: { all?: boolean; archive?: boolean },
): Promise<void> {
  await req("/api/v1/notifications/read", {
    method: "POST",
    body: {
      ids,
      all: opts?.all ?? false,
      archive: opts?.archive ?? false,
    },
  });
}

export async function deleteNotifications(
  ids: string[],
  opts?: { all?: boolean },
): Promise<number> {
  const data = await req<{ deleted: number }>("/api/v1/notifications/delete", {
    method: "POST",
    body: {
      ids,
      all: opts?.all ?? false,
    },
  });
  return data.deleted ?? 0;
}

export async function fetchNotificationPreferences(): Promise<NotificationPreferences> {
  const data = await req<{ preferences: NotificationPreferences }>(
    "/api/v1/notifications/preferences",
  );
  return data.preferences;
}

export async function saveNotificationPreferences(
  prefs: Partial<NotificationPreferences>,
): Promise<NotificationPreferences> {
  const data = await req<{ preferences: NotificationPreferences }>(
    "/api/v1/notifications/preferences",
    { method: "POST", body: prefs },
  );
  return data.preferences;
}

export async function registerPushDevice(subscription: PushSubscriptionJSON): Promise<void> {
  await req("/api/v1/notifications/device", {
    method: "POST",
    body: {
      kind: "webpush",
      endpoint: subscription.endpoint,
      subscription,
    },
  });
}

export async function sendTestNotification(): Promise<void> {
  await req("/api/v1/notifications/test", { method: "POST", body: {} });
}

export async function ingestFactualNotification(event: {
  eventKind: string;
  entityKind: string;
  entityKey: string;
  title: string;
  body: string;
  href?: string;
}): Promise<void> {
  await req("/api/v1/notifications/ingest", {
    method: "POST",
    body: event,
  });
}

export function groupNotificationsByPeriod(items: AppNotification[]): {
  period: string;
  label: string;
  items: AppNotification[];
}[] {
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startYesterday = startToday - 86400000;
  const startWeek = startToday - 7 * 86400000;
  const buckets: Record<string, AppNotification[]> = {
    today: [],
    yesterday: [],
    week: [],
    older: [],
  };
  for (const n of items) {
    const t = new Date(n.createdAt).getTime();
    if (t >= startToday) buckets.today.push(n);
    else if (t >= startYesterday) buckets.yesterday.push(n);
    else if (t >= startWeek) buckets.week.push(n);
    else buckets.older.push(n);
  }
  return [
    { period: "today", label: "Hoje", items: buckets.today },
    { period: "yesterday", label: "Ontem", items: buckets.yesterday },
    { period: "week", label: "Esta semana", items: buckets.week },
    { period: "older", label: "Anteriores", items: buckets.older },
  ].filter((g) => g.items.length > 0);
}
