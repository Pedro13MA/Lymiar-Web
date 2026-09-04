import type { AdminNavItem, DashboardFixture } from "@/types/admin";

/**
 * Static navigation for the Control Center shell.
 * UI fixtures only — authorization is enforced by Hub require_admin + RequireAdmin.
 */
export const ADMIN_NAV: AdminNavItem[] = [
  { id: "dashboard", label: "Dashboard", href: "/control-center", icon: "LayoutDashboard" },
  { id: "produtos", label: "Produtos", href: "/control-center/produtos", icon: "Package" },
  { id: "identidade", label: "Identidade", href: "/control-center/identidade", icon: "Link2" },
  { id: "conhecimento", label: "Conhecimento", href: "/control-center/conhecimento", icon: "Brain" },
  { id: "utilizadores", label: "Utilizadores", href: "/control-center/utilizadores", icon: "Users" },
  { id: "analytics", label: "Analytics", href: "/control-center/analytics", icon: "BarChart3" },
  { id: "feeds", label: "Feeds", href: "/control-center/feeds", icon: "Store" },
  { id: "base-de-dados", label: "Base de Dados", href: "/control-center/base-de-dados", icon: "Database" },
  { id: "infraestrutura", label: "Infraestrutura", href: "/control-center/infraestrutura", icon: "Server" },
  { id: "logs", label: "Logs", href: "/control-center/logs", icon: "ScrollText" },
  { id: "sistema", label: "Sistema", href: "/control-center/sistema", icon: "Settings" },
];

/**
 * Mock dashboard data for UI composition.
 * Replace with live services in Phase 2 — do not treat as production truth.
 */
export const DASHBOARD_FIXTURE: DashboardFixture = {
  overview: {
    score: 85.9,
    healthLabel: "Good",
    healthTone: "ok",
    lastAuditLabel: "há 12 min",
    alertCount: 4,
  },
  quickMetrics: [
    {
      id: "products",
      label: "Produtos",
      value: "66 606",
      hint: "Catálogo activo",
      trend: { direction: "up", label: "+0,4%" },
    },
    {
      id: "offers",
      label: "Ofertas",
      value: "94 723",
      hint: "Across merchants",
      trend: { direction: "up", label: "+1,1%" },
    },
    {
      id: "users",
      label: "Utilizadores",
      value: "—",
      hint: "Fase 2 · auth metrics",
      tone: "neutral",
    },
    {
      id: "categories",
      label: "Categorias",
      value: "80",
      hint: "Leafs com produtos",
    },
    {
      id: "feeds",
      label: "Feeds",
      value: "3",
      hint: "Merchants activos",
      tone: "ok",
    },
  ],
  infrastructure: [
    { id: "cpu", label: "CPU", value: "23%", pct: 23, tone: "ok" },
    { id: "ram", label: "RAM", value: "61%", pct: 61, tone: "warn" },
    { id: "disk", label: "Disco", value: "74%", pct: 74, tone: "warn" },
    { id: "sqlite", label: "SQLite", value: "4,64 GB", pct: 46, tone: "ok" },
    { id: "api", label: "API", value: "Online", pct: 100, tone: "ok" },
    { id: "frontend", label: "Frontend", value: "Online", pct: 100, tone: "ok" },
    { id: "backend", label: "Backend", value: "Online", pct: 100, tone: "ok" },
  ],
  charts: {
    products: [
      { label: "Seg", value: 66210 },
      { label: "Ter", value: 66340 },
      { label: "Qua", value: 66410 },
      { label: "Qui", value: 66480 },
      { label: "Sex", value: 66550 },
      { label: "Sáb", value: 66590 },
      { label: "Dom", value: 66606 },
    ],
    offers: [
      { label: "Seg", value: 93800 },
      { label: "Ter", value: 94120 },
      { label: "Qua", value: 94250 },
      { label: "Qui", value: 94380 },
      { label: "Sex", value: 94510 },
      { label: "Sáb", value: 94640 },
      { label: "Dom", value: 94723 },
    ],
    visits: [
      { label: "Seg", value: 420 },
      { label: "Ter", value: 510 },
      { label: "Qua", value: 480 },
      { label: "Qui", value: 620 },
      { label: "Sex", value: 710 },
      { label: "Sáb", value: 390 },
      { label: "Dom", value: 340 },
    ],
    accounts: [
      { label: "Seg", value: 2 },
      { label: "Ter", value: 5 },
      { label: "Qua", value: 3 },
      { label: "Qui", value: 7 },
      { label: "Sex", value: 4 },
      { label: "Sáb", value: 1 },
      { label: "Dom", value: 2 },
    ],
  },
  alerts: [
    {
      id: "a1",
      title: "Search lento",
      description: "/api/v1/search > 3s em probes recentes",
      tone: "warn",
      timeLabel: "há 18 min",
      href: "/control-center/infraestrutura",
    },
    {
      id: "a2",
      title: "Produtos sem categoria",
      description: "1 034 produtos em unclassified / unmapped",
      tone: "warn",
      timeLabel: "última auditoria",
      href: "/control-center/produtos",
    },
    {
      id: "a3",
      title: "Specs relevantes baixas",
      description: "typed_attributes cheio, atributos úteis escassos",
      tone: "warn",
      timeLabel: "última auditoria",
      href: "/control-center/produtos",
    },
    {
      id: "a4",
      title: "Worten · MPN em falta",
      description: "MPN fill ≈ 0% no feed principal",
      tone: "critical",
      timeLabel: "feeds",
      href: "/control-center/feeds",
    },
  ],
};

export function getDashboardFixture(): DashboardFixture {
  return DASHBOARD_FIXTURE;
}
