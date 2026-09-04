/** Configuração por prefixo de endpoint. */

import type { ApiEndpointConfig } from "./types";

const DEFAULT: ApiEndpointConfig = {
  timeoutMs: 30_000,
  cacheTtlMs: 0,
  dedupe: true,
};

/** Recursos estáveis — cache TTL longo, dedupe activo. */
const STABLE: Partial<ApiEndpointConfig> = {
  cacheTtlMs: 5 * 60_000,
  dedupe: true,
};

/** Pesquisa — cache curto + dedupe para repetir query/filtros sem round-trip. */
const SEARCH: Partial<ApiEndpointConfig> = {
  timeoutMs: 12_000,
  cacheTtlMs: 45_000,
  dedupe: true,
};

const PREFIX_RULES: Array<[string, Partial<ApiEndpointConfig>]> = [
  ["/api/v1/taxonomy/tree", STABLE],
  ["/api/v1/categorias", STABLE],
  ["/api/v1/marcas", STABLE],
  ["/api/v1/lojas", STABLE],
  ["/api/v1/search/suggest", { ...SEARCH, timeoutMs: 8_000 }],
  ["/api/v1/search", SEARCH],
];

export function resolveEndpointConfig(path: string): ApiEndpointConfig {
  for (const [prefix, partial] of PREFIX_RULES) {
    if (path.startsWith(prefix)) {
      return { ...DEFAULT, ...partial };
    }
  }
  return DEFAULT;
}

/** Chave normalizada para cache/dedupe (path sem host). */
export function requestKey(method: string, path: string): string {
  return `${method}:${path}`;
}
