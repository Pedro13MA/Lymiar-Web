"use client";



import { useCallback, useEffect, useMemo, useState } from "react";

import {

  Check,

  ChevronRight,

  ExternalLink,

  Loader2,

  RefreshCw,

  Search,

  X,

  Ban,

  AlertTriangle,

} from "lucide-react";

import { PageHeader, LoadingState, EmptyState } from "@/components/admin/shared";

import {

  approveIdentityMatch,

  dismissIdentitySource,

  fetchIdentityDetail,

  fetchIdentityQueue,

  fetchIdentitySummary,

  rejectIdentityMatch,

  searchIdentityCanonical,

  type IdentityApproveResult,

  type IdentityCandidate,

  type IdentityQueueItem,

  type IdentitySearchProduct,

  type IdentitySummary,

  type IdentityProductProfile,

} from "@/services/admin/identity";

import { cn } from "@/lib/utils";

import { IdentityDiffPanel } from "./IdentityDiffPanel";



const TIERS = [

  { id: "", label: "Todos os tiers" },

  { id: "monitor_99", label: "monitor_99" },

  { id: "caution_98", label: "caution_98" },

  { id: "ambiguous_margin", label: "ambiguous_margin" },

  { id: "shadow_only", label: "shadow_only" },

  { id: "block_model", label: "block_model" },

  { id: "block_condition", label: "block_condition" },

];



const PENDING = new Set(["shadow", "auto_match", "pending"]);

const IDENTITY_STORES = [
  { id: "powerplanetpt", label: "Powerplanet" },
  { id: "worten", label: "Worten" },
];



function TierBadge({ tier }: { tier: string | null }) {

  const t = tier || "unknown";

  const tone =

    t === "safe_100"

      ? "bg-emerald-100 text-emerald-800"

      : t.startsWith("block")

        ? "bg-red-100 text-red-800"

        : t === "ambiguous_margin"

          ? "bg-amber-100 text-amber-900"

          : "bg-slate-100 text-slate-700";

  return (

    <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-medium uppercase", tone)}>

      {t}

    </span>

  );

}



function CheckList({ reasons, penalties }: { reasons: string[]; penalties: string[] }) {

  const checks = [

    { key: "brand", label: "Marca" },

    { key: "model", label: "Modelo" },

    { key: "storage", label: "Capacidade" },

    { key: "color", label: "Cor" },

    { key: "title_similarity", label: "Título" },

  ];

  return (

    <ul className="space-y-1 text-sm">

      {checks.map((c) => {

        const ok = reasons.some((r) => r === c.key || r.startsWith(c.key));

        const bad = penalties.some((p) => p.includes(c.key.split("_")[0]));

        return (

          <li key={c.key} className="flex items-center gap-2 text-[var(--admin-muted)]">

            {bad ? (

              <X className="h-3.5 w-3.5 text-[var(--admin-critical)]" />

            ) : ok ? (

              <Check className="h-3.5 w-3.5 text-[var(--admin-ok)]" />

            ) : (

              <span className="h-3.5 w-3.5 rounded-full border border-[var(--admin-border)]" />

            )}

            {c.label}

          </li>

        );

      })}

    </ul>

  );

}



function CandidateCard({

  selected,

  onSelect,

  ean,

  name,

  score,

  margin,

  tier,

  hardRule,

  reasons,

  penalties,

  status,

  manual,

}: {

  selected: boolean;

  onSelect: () => void;

  ean: string;

  name: string | null;

  score?: number | null;

  margin?: number | null;

  tier?: string | null;

  hardRule?: string | null;

  reasons?: string[];

  penalties?: string[];

  status?: string;

  manual?: boolean;

}) {

  const pending = status ? PENDING.has(status) : true;

  return (

    <label

      className={cn(

        "block cursor-pointer rounded-lg border p-4 transition-colors",

        selected

          ? "border-[var(--admin-brand)] bg-[var(--admin-brand)]/5 ring-1 ring-[var(--admin-brand)]"

          : "border-[var(--admin-border)] hover:bg-[var(--admin-hover)]",

        !pending && "opacity-60",

      )}

    >

      <div className="flex items-start gap-3">

        <input

          type="radio"

          name="identity-candidate"

          checked={selected}

          onChange={onSelect}

          className="mt-1"

        />

        <div className="min-w-0 flex-1">

          <div className="flex flex-wrap items-center gap-2">

            <span className="font-mono text-xs text-[var(--admin-muted)]">{ean}</span>

            {manual && (

              <span className="rounded bg-violet-100 px-1.5 py-0.5 text-[10px] font-medium text-violet-800">

                pesquisa manual

              </span>

            )}

            {tier != null && <TierBadge tier={tier} />}

            {score != null && (

              <span className="text-xs tabular-nums text-[var(--admin-muted)]">

                score {score}

                {margin != null && ` · margem ${margin}`}

              </span>

            )}

            {status && !pending && (

              <span className="text-[10px] uppercase text-[var(--admin-faint)]">{status}</span>

            )}

          </div>

          <p className="mt-1 font-medium text-[var(--admin-text)]">{name || "—"}</p>

          {hardRule && hardRule !== "pass" && (

            <p className="mt-2 flex items-center gap-1.5 text-xs text-amber-800">

              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />

              Regra dura: {hardRule}

            </p>

          )}

          {reasons && penalties && selected && (

            <div className="mt-3 border-t border-[var(--admin-border)] pt-3">

              <CheckList reasons={reasons} penalties={penalties} />

            </div>

          )}

        </div>

      </div>

    </label>

  );

}



function ApproveSuccessBanner({ result }: { result: IdentityApproveResult }) {

  const stores = result.stores ?? [];

  return (

    <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">

      <p className="font-medium">Match confirmado — produto unificado no catálogo.</p>

      {result.canonical_name && (

        <p className="mt-1 text-emerald-800">{result.canonical_name}</p>

      )}

      <p className="mt-1 font-mono text-xs">EAN {result.canonical_ean ?? result.candidate_ean}</p>

      {stores.length > 0 && (

        <p className="mt-2">

          Lojas com oferta:{" "}

          {stores.map((s) => s.store_slug).join(", ")}

        </p>

      )}

      {result.site_path && (

        <a

          href={result.site_path}

          target="_blank"

          rel="noopener noreferrer"

          className="mt-3 inline-flex items-center gap-1.5 font-medium text-emerald-700 hover:underline"

        >

          Ver no site <ExternalLink className="h-3.5 w-3.5" />

        </a>

      )}

    </div>

  );

}



export function IdentityReviewView() {

  const [summary, setSummary] = useState<IdentitySummary | null>(null);

  const [items, setItems] = useState<IdentityQueueItem[]>([]);

  const [total, setTotal] = useState(0);

  const [offset, setOffset] = useState(0);

  const [minScore, setMinScore] = useState(70);

  const [tier, setTier] = useState("");

  const [busy, setBusy] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const [selected, setSelected] = useState<IdentityQueueItem | null>(null);

  const [detailCandidates, setDetailCandidates] = useState<IdentityCandidate[]>([]);

  const [sourceProfile, setSourceProfile] = useState<IdentityProductProfile | null>(null);

  const [detailBusy, setDetailBusy] = useState(false);

  const [actionBusy, setActionBusy] = useState(false);

  const [msg, setMsg] = useState<string | null>(null);

  const [selectedEan, setSelectedEan] = useState<string | null>(null);

  const [manualPick, setManualPick] = useState<IdentitySearchProduct | null>(null);

  const [searchQ, setSearchQ] = useState("");

  const [searchBusy, setSearchBusy] = useState(false);

  const [searchResults, setSearchResults] = useState<IdentitySearchProduct[]>([]);

  const [approveResult, setApproveResult] = useState<IdentityApproveResult | null>(null);



  const [store, setStore] = useState("powerplanetpt");



  const limit = 40;



  const load = useCallback(async () => {

    setBusy(true);

    setError(null);

    try {

      const [sum, queue] = await Promise.all([

        fetchIdentitySummary(store),

        fetchIdentityQueue({

          store,

          min_score: minScore,

          tier: tier || undefined,

          limit,

          offset,

        }),

      ]);

      setSummary(sum);

      setItems(queue.items);

      setTotal(queue.total);

    } catch (e) {

      setError(e instanceof Error ? e.message : "load_error");

      setItems([]);

    } finally {

      setBusy(false);

    }

  }, [minScore, tier, offset, store]);



  const resetDetailState = () => {

    setSelectedEan(null);

    setManualPick(null);

    setSearchQ("");

    setSearchResults([]);

    setApproveResult(null);

    setMsg(null);

    setSourceProfile(null);

  };



  const loadDetail = useCallback(async (item: IdentityQueueItem) => {

    setSelected(item);

    resetDetailState();

    setDetailBusy(true);

    try {

      const d = await fetchIdentityDetail(item.source_key);

      setDetailCandidates(d.candidates);

      setSourceProfile(d.source.profile ?? {
        title: d.source.canonical_name,
        brand: d.source.brand,
        condition: d.source.condition,
      });

      const firstPending = d.candidates.find((c) => PENDING.has(c.match_status));

      if (firstPending) setSelectedEan(firstPending.candidate_ean);

    } catch (e) {

      setMsg(e instanceof Error ? e.message : "detail_error");

      setDetailCandidates([]);

    } finally {

      setDetailBusy(false);

    }

  }, []);



  useEffect(() => {

    void load();

  }, [load]);



  useEffect(() => {

    if (!selected || searchQ.trim().length < 2) {

      setSearchResults([]);

      return;

    }

    const t = window.setTimeout(() => {

      setSearchBusy(true);

      void searchIdentityCanonical({

        q: searchQ.trim(),

        brand: selected.source_brand || undefined,

        limit: 15,

      })

        .then((r) => setSearchResults(r.products))

        .catch(() => setSearchResults([]))

        .finally(() => setSearchBusy(false));

    }, 350);

    return () => window.clearTimeout(t);

  }, [searchQ, selected]);



  const pendingCandidates = useMemo(

    () => detailCandidates.filter((c) => PENDING.has(c.match_status)),

    [detailCandidates],

  );



  const allCandidates = useMemo(() => {

    const list = [...detailCandidates];

    if (manualPick && !list.some((c) => c.candidate_ean === manualPick.ean)) {

      list.unshift({

        candidate_ean: manualPick.ean,

        candidate_store: null,

        candidate_name: manualPick.canonical_name,

        match_score: 0,

        match_level: null,

        match_status: "manual",

        match_reasons: [],

        match_penalties: [],

        second_score: null,

        score_margin: null,

        hard_rule_status: null,

        promotion_tier: null,

        identity_matched_from: "human_search",

      });

    }

    return list;

  }, [detailCandidates, manualPick]);



  const activeCandidate = useMemo(() => {

    if (!selectedEan) return null;

    return allCandidates.find((c) => c.candidate_ean === selectedEan) ?? null;

  }, [allCandidates, selectedEan]);



  const candidateProfile = useMemo((): IdentityProductProfile | null => {

    if (!selectedEan) return null;

    const c = activeCandidate;

    if (c?.profile) return c.profile;

    if (manualPick && manualPick.ean === selectedEan) {

      return {

        title: manualPick.canonical_name,

        brand: manualPick.brand,

      };

    }

    return {

      title: c?.candidate_name,

    };

  }, [activeCandidate, manualPick, selectedEan]);



  const closeModal = () => {

    setSelected(null);

    setDetailCandidates([]);

    resetDetailState();

  };



  const afterAction = async () => {

    closeModal();

    await load();

  };



  const onApprove = async () => {

    if (!selected || !selectedEan) return;

    if (!confirm("Confirmar merge deste SKU ao EAN canónico seleccionado?")) return;

    setActionBusy(true);

    setMsg(null);

    try {

      const matchedFrom = manualPick?.ean === selectedEan ? "human_search" : undefined;

      const result = await approveIdentityMatch(selected.source_key, selectedEan, matchedFrom);

      setApproveResult(result);

      setMsg(null);

      window.setTimeout(() => void afterAction(), 2500);

    } catch (e) {

      setMsg(e instanceof Error ? e.message : "approve_error");

    } finally {

      setActionBusy(false);

    }

  };



  const onRejectSelected = async () => {

    if (!selected || !selectedEan || manualPick?.ean === selectedEan) return;

    setActionBusy(true);

    setMsg(null);

    try {

      await rejectIdentityMatch(selected.source_key, selectedEan);

      setMsg("Candidato rejeitado.");

      if (selectedEan === activeCandidate?.candidate_ean) setSelectedEan(null);

      await loadDetail(selected);

      await load();

    } catch (e) {

      setMsg(e instanceof Error ? e.message : "reject_error");

    } finally {

      setActionBusy(false);

    }

  };



  const onDismiss = async () => {

    if (!selected) return;

    if (!confirm("Nenhum destes produtos corresponde? O SKU ficará como produto único Powerplanet.")) return;

    setActionBusy(true);

    setMsg(null);

    try {

      await dismissIdentitySource(selected.source_key);

      setMsg("SKU marcado como produto único — sem match cross-store.");

      await afterAction();

    } catch (e) {

      setMsg(e instanceof Error ? e.message : "dismiss_error");

    } finally {

      setActionBusy(false);

    }

  };



  const pickManual = (p: IdentitySearchProduct) => {

    setManualPick(p);

    setSelectedEan(p.ean);

    setSearchQ("");

    setSearchResults([]);

  };



  return (

    <div className="mx-auto max-w-6xl">

      <PageHeader

        title="Identidade de produto"

        description="Escolhe o candidato correcto, pesquisa manualmente, ou marca como produto único."

        breadcrumb={["Control Center", "Identidade"]}

        actions={

          <button

            type="button"

            onClick={() => void load()}

            className="inline-flex items-center gap-2 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface)] px-3 py-1.5 text-sm text-[var(--admin-muted)] hover:bg-[var(--admin-hover)]"

          >

            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}

            Actualizar

          </button>

        }

      />



      {summary && (

        <div className="mb-6 grid gap-3 sm:grid-cols-4">

          {[

            ["LMSKU restantes", summary.lmsku_remaining],

            ["Com candidatos", summary.with_candidates],

            ["Sem match", summary.no_match],

            ["Promovidos", summary.promoted_total],

          ].map(([label, val]) => (

            <div

              key={label}

              className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-4 shadow-sm"

            >

              <p className="text-xs uppercase tracking-wide text-[var(--admin-faint)]">{label}</p>

              <p className="mt-1 font-display text-2xl font-semibold text-[var(--admin-text)]">

                {String(val)}

              </p>

            </div>

          ))}

        </div>

      )}



      <div className="mb-4 flex flex-wrap items-end gap-3">

        <label className="text-sm text-[var(--admin-muted)]">

          Loja

          <select

            value={store}

            onChange={(e) => {

              setOffset(0);

              setStore(e.target.value);

            }}

            className="ml-2 rounded border border-[var(--admin-border)] px-2 py-1"

          >

            {IDENTITY_STORES.map((s) => (

              <option key={s.id} value={s.id}>{s.label}</option>

            ))}

          </select>

        </label>

        <label className="text-sm text-[var(--admin-muted)]">

          Score ≥

          <input

            type="number"

            min={0}

            max={100}

            value={minScore}

            onChange={(e) => {

              setOffset(0);

              setMinScore(Number(e.target.value));

            }}

            className="ml-2 w-16 rounded border border-[var(--admin-border)] px-2 py-1"

          />

        </label>

        <label className="text-sm text-[var(--admin-muted)]">

          Tier

          <select

            value={tier}

            onChange={(e) => {

              setOffset(0);

              setTier(e.target.value);

            }}

            className="ml-2 rounded border border-[var(--admin-border)] px-2 py-1"

          >

            {TIERS.map((t) => (

              <option key={t.id} value={t.id}>{t.label}</option>

            ))}

          </select>

        </label>

        <p className="text-xs text-[var(--admin-faint)]">

          {total} SKUs na fila · página {Math.floor(offset / limit) + 1}

        </p>

      </div>



      {error ? (

        <EmptyState title="Não foi possível carregar" description={error} />

      ) : busy && !items.length ? (

        <LoadingState />

      ) : !items.length ? (

        <EmptyState title="Fila vazia" description="Nenhum candidato pendente com estes filtros." />

      ) : (

        <div className="overflow-hidden rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] shadow-sm">

          <table className="w-full text-sm">

            <thead className="border-b border-[var(--admin-border)] bg-[var(--admin-surface-2)] text-xs uppercase text-[var(--admin-faint)]">

              <tr>

                <th className="px-4 py-3 text-left">SKU</th>

                <th className="px-4 py-3 text-left">Powerplanet</th>

                <th className="px-4 py-3 text-left">Candidato EAN</th>

                <th className="px-4 py-3 text-right">Score</th>

                <th className="px-4 py-3 text-right">Margem</th>

                <th className="px-4 py-3 text-left">Tier</th>

                <th className="px-4 py-3" />

              </tr>

            </thead>

            <tbody>

              {items.map((row) => (

                <tr

                  key={row.source_key}

                  className="border-b border-[var(--admin-border)] last:border-0 hover:bg-[var(--admin-hover)]"

                >

                  <td className="px-4 py-3 font-mono text-xs">{row.source_merchant_product_id}</td>

                  <td className="max-w-[200px] truncate px-4 py-3 text-[var(--admin-text)]">

                    {row.source_name}

                  </td>

                  <td className="px-4 py-3 font-mono text-xs">{row.candidate_ean}</td>

                  <td className="px-4 py-3 text-right tabular-nums">{row.match_score}</td>

                  <td className="px-4 py-3 text-right tabular-nums">

                    {row.score_margin ?? "—"}

                  </td>

                  <td className="px-4 py-3">

                    <TierBadge tier={row.promotion_tier} />

                  </td>

                  <td className="px-4 py-3 text-right">

                    <button

                      type="button"

                      onClick={() => void loadDetail(row)}

                      className="inline-flex items-center gap-1 text-[var(--admin-brand)] hover:underline"

                    >

                      Revisar <ChevronRight className="h-3.5 w-3.5" />

                    </button>

                  </td>

                </tr>

              ))}

            </tbody>

          </table>

          <div className="flex justify-between border-t border-[var(--admin-border)] px-4 py-3">

            <button

              type="button"

              disabled={offset === 0}

              onClick={() => setOffset(Math.max(0, offset - limit))}

              className="text-sm text-[var(--admin-muted)] disabled:opacity-40"

            >

              Anterior

            </button>

            <button

              type="button"

              disabled={offset + limit >= total}

              onClick={() => setOffset(offset + limit)}

              className="text-sm text-[var(--admin-muted)] disabled:opacity-40"

            >

              Seguinte

            </button>

          </div>

        </div>

      )}



      {selected && (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">

          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] shadow-xl">

            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--admin-border)] bg-[var(--admin-surface)] px-5 py-4">

              <div>

                <h2 className="font-display text-lg font-semibold text-[var(--admin-text)]">

                  Revisão de match

                </h2>

                <p className="text-xs text-[var(--admin-faint)]">

                  SKU {selected.source_merchant_product_id} · {selected.source_key}

                </p>

              </div>

              <button

                type="button"

                onClick={closeModal}

                className="rounded p-1 hover:bg-[var(--admin-hover)]"

              >

                <X className="h-5 w-5" />

              </button>

            </div>



            {detailBusy ? (

              <div className="p-8 text-center text-[var(--admin-muted)]">

                <Loader2 className="mx-auto h-6 w-6 animate-spin" />

              </div>

            ) : (

              <div className="space-y-5 p-5">

                {approveResult ? (

                  <ApproveSuccessBanner result={approveResult} />

                ) : (

                  <>

                    {msg && (

                      <p className="rounded-lg bg-[var(--admin-surface-2)] px-3 py-2 text-sm text-[var(--admin-text)]">

                        {msg}

                      </p>

                    )}



                    {sourceProfile && candidateProfile && selectedEan ? (

                      <IdentityDiffPanel

                        sourceLabel={store === "powerplanetpt" ? "POWERPLANET" : store.toUpperCase()}

                        candidateLabel="CANDIDATO EAN"

                        source={sourceProfile}

                        candidate={candidateProfile}

                        score={activeCandidate?.match_score}

                        margin={activeCandidate?.score_margin}

                        tier={activeCandidate?.promotion_tier}

                        reasons={activeCandidate?.match_reasons}

                        penalties={activeCandidate?.match_penalties}

                      />

                    ) : (

                      <div className="rounded-lg border border-[var(--admin-border)] p-4">

                        <p className="text-xs font-medium uppercase text-[var(--admin-faint)]">Origem</p>

                        <p className="mt-2 font-medium text-[var(--admin-text)]">{selected.source_name}</p>

                        <p className="mt-1 text-xs text-[var(--admin-muted)]">

                          {selected.source_brand} · {selected.source_condition} · {selected.source_leaf_id}

                        </p>

                      </div>

                    )}



                    <div>

                      <p className="mb-2 text-xs font-medium uppercase text-[var(--admin-faint)]">

                        Candidatos sugeridos ({pendingCandidates.length} pendentes · {detailCandidates.length} total)

                      </p>

                      {detailCandidates.length === 0 ? (

                        <p className="text-sm text-[var(--admin-muted)]">

                          Sem candidatos automáticos — usa a pesquisa abaixo.

                        </p>

                      ) : (

                        <div className="space-y-2">

                          {detailCandidates.map((c) => (

                            <CandidateCard

                              key={c.candidate_ean}

                              selected={selectedEan === c.candidate_ean}

                              onSelect={() => {

                                setSelectedEan(c.candidate_ean);

                                setManualPick(null);

                              }}

                              ean={c.candidate_ean}

                              name={c.candidate_name}

                              score={c.match_score}

                              margin={c.score_margin}

                              tier={c.promotion_tier}

                              hardRule={c.hard_rule_status}

                              reasons={c.match_reasons}

                              penalties={c.match_penalties}

                              status={c.match_status}

                            />

                          ))}

                        </div>

                      )}

                    </div>



                    <div className="rounded-lg border border-[var(--admin-border)] p-4">

                      <p className="mb-2 text-xs font-medium uppercase text-[var(--admin-faint)]">

                        Pesquisar produto canónico

                      </p>

                      <div className="relative">

                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--admin-faint)]" />

                        <input

                          type="search"

                          value={searchQ}

                          onChange={(e) => setSearchQ(e.target.value)}

                          placeholder="Nome, modelo ou EAN (ex. Redmi Note 15, 6932554487980)"

                          className="w-full rounded-lg border border-[var(--admin-border)] py-2 pl-9 pr-3 text-sm"

                        />

                      </div>

                      {searchBusy && (

                        <p className="mt-2 text-xs text-[var(--admin-muted)]">

                          <Loader2 className="mr-1 inline h-3 w-3 animate-spin" />

                          A pesquisar…

                        </p>

                      )}

                      {searchResults.length > 0 && (

                        <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto">

                          {searchResults.map((p) => (

                            <li key={p.ean}>

                              <button

                                type="button"

                                onClick={() => pickManual(p)}

                                className="w-full rounded px-2 py-2 text-left text-sm hover:bg-[var(--admin-hover)]"

                              >

                                <span className="font-mono text-xs text-[var(--admin-muted)]">{p.ean}</span>

                                <span className="mt-0.5 block font-medium text-[var(--admin-text)]">

                                  {p.canonical_name}

                                </span>

                                {p.brand && (

                                  <span className="text-xs text-[var(--admin-faint)]">{p.brand}</span>

                                )}

                              </button>

                            </li>

                          ))}

                        </ul>

                      )}

                      {manualPick && (

                        <div className="mt-3">

                          <CandidateCard

                            selected={selectedEan === manualPick.ean}

                            onSelect={() => setSelectedEan(manualPick.ean)}

                            ean={manualPick.ean}

                            name={manualPick.canonical_name}

                            manual

                          />

                        </div>

                      )}

                    </div>



                    <div className="flex flex-wrap gap-2 border-t border-[var(--admin-border)] pt-4">

                      <button

                        type="button"

                        disabled={actionBusy || !selectedEan}

                        onClick={() => void onApprove()}

                        className="inline-flex items-center gap-2 rounded-lg bg-[var(--admin-brand)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"

                      >

                        {actionBusy ? (

                          <Loader2 className="h-4 w-4 animate-spin" />

                        ) : (

                          <Check className="h-4 w-4" />

                        )}

                        APROVAR

                      </button>

                      {activeCandidate && PENDING.has(activeCandidate.match_status) && (

                        <button

                          type="button"

                          disabled={actionBusy}

                          onClick={() => void onRejectSelected()}

                          className="inline-flex items-center gap-2 rounded-lg border border-[var(--admin-border)] px-4 py-2 text-sm text-[var(--admin-muted)] hover:bg-[var(--admin-hover)]"

                        >

                          <X className="h-4 w-4" />

                          REJEITAR

                        </button>

                      )}

                      <button

                        type="button"

                        disabled={actionBusy}

                        onClick={() => void onDismiss()}

                        className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2 text-sm text-red-700 hover:bg-red-50"

                      >

                        <Ban className="h-4 w-4" />

                        IGNORAR SKU

                      </button>

                    </div>

                  </>

                )}

              </div>

            )}

          </div>

        </div>

      )}

    </div>

  );

}

