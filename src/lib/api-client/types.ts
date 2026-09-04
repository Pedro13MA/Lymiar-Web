/** Tipos partilhados do apiClient v2. */

export type ApiErrorKind =
  | "http"
  | "timeout"
  | "abort"
  | "network"
  | "parse";

export class ApiError extends Error {
  readonly status: number;
  readonly path: string;
  readonly kind: ApiErrorKind;

  constructor(
    message: string,
    opts: { status?: number; path: string; kind: ApiErrorKind },
  ) {
    super(message);
    this.name = "ApiError";
    this.status = opts.status ?? 0;
    this.path = opts.path;
    this.kind = opts.kind;
  }
}

export function isAbortError(err: unknown): boolean {
  return err instanceof ApiError && err.kind === "abort";
}

export type ApiRequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  headers?: HeadersInit;
  signal?: AbortSignal;
  credentials?: RequestCredentials;
  /** Ignorar cache TTL e ir à rede. */
  bypassCache?: boolean;
  /** Etiqueta curta para o painel de métricas (ex. SEARCH). */
  label?: string;
  /** Override do timeout por pedido. */
  timeoutMs?: number;
  /**
   * Status HTTP que não disparam ApiError (ex. 404 em rotas ainda não
   * deployadas). Devolve `null` em vez de lançar.
   */
  allowStatuses?: number[];
};

export type ServerTimingMetrics = {
  total?: number;
  handler?: number;
  sqlite?: number;
  serialize?: number;
  canonical?: number;
};

export type ApiMetricEntry = {
  id: string;
  label: string;
  method: string;
  path: string;
  status: number | "error";
  cache: "HIT" | "MISS";
  deduped: boolean;
  networkMs: number;
  backendMs: number | null;
  transferMs: number;
  renderMs: number | null;
  totalMs: number;
  aborted: boolean;
  timestamp: number;
  error?: string;
};

export type ApiEndpointConfig = {
  timeoutMs: number;
  cacheTtlMs: number;
  dedupe: boolean;
};
