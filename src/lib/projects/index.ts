/**
 * FASE 7.13 — serviço de Projetos (adapter injectável).
 */

import { LocalProjectAdapter } from "@/lib/projects/local-project-adapter";
import { getTemplate } from "@/lib/projects/templates";
import type { ProjectStorageAdapter } from "@/lib/projects/storage-adapter";
import {
  projectTotal,
  todayIso,
} from "@/lib/projects/summary";
import type {
  Project,
  ProjectProductSnap,
  ProjectSlot,
  ProjectTemplateId,
  ProjectsSnapshot,
} from "@/lib/projects/types";
import type { Product } from "@/lib/types";
import { priceInsightShort } from "@/lib/product-insights-buying";
import { recommendationsFromApi } from "@/lib/product-discovery";

let adapter: ProjectStorageAdapter = new LocalProjectAdapter();

export function setProjectAdapter(next: ProjectStorageAdapter): void {
  adapter = next;
}

function uid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function emit(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("lymiar:projects-changed"));
  }
}

export function subscribeProjects(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("lymiar:projects-changed", cb);
  return () => window.removeEventListener("lymiar:projects-changed", cb);
}

export function productToProjectSnap(product: Product): ProjectProductSnap {
  return {
    slug: product.slug,
    ean: product.ean,
    name: product.name,
    brand: product.brand,
    imageUrl: product.imageUrl,
    currentPrice: product.currentPrice,
    priceAtAdd: product.currentPrice,
    lymiarIndex: product.decision.lymiarIndex.value,
    cheapestStore: product.decision.cheapestStore,
    storeCouponsAvailable: product.storeCouponsAvailable,
    isOnSale: product.isOnSale,
    leafId: product.leafId,
    chipsetModel: product.chipsetModel,
    category: product.category,
    typedAttributes: product.typedAttributes
      ? { ...product.typedAttributes }
      : null,
    knowledgeAttributes: product.knowledge?.attributes
      ? { ...product.knowledge.attributes }
      : product.typedAttributes
        ? { ...product.typedAttributes }
        : null,
    knowledgeCompleteness:
      typeof product.knowledgeCompleteness === "number"
        ? product.knowledgeCompleteness
        : typeof product.knowledge?.completeness === "number"
          ? product.knowledge.completeness
          : null,
    priceInsightLabel: priceInsightShort(product),
    betterAlternativeLabel: (() => {
      const alt = recommendationsFromApi(product.recommendations)?.alternatives?.[0];
      return alt ? `Melhor alternativa: ${alt.name}` : null;
    })(),
    betterAlternativeSlug:
      recommendationsFromApi(product.recommendations)?.alternatives?.[0]?.slug ||
      null,
    offers: (product.offers || [])
      .filter((o) => o.price > 0)
      .map((o) => ({
        store: o.slug || o.store,
        storeName: o.storeName || o.store,
        price: o.price,
        url: o.url,
      })),
  };
}

async function mutate(
  fn: (snap: ProjectsSnapshot) => ProjectsSnapshot,
): Promise<ProjectsSnapshot> {
  const snap = await adapter.load();
  const next = fn(snap);
  await adapter.save(next);
  emit();
  return next;
}

function touchHistory(project: Project): Project {
  const total = projectTotal(project);
  const date = todayIso();
  const hist = [...(project.priceHistory || [])];
  const last = hist[hist.length - 1];
  if (!last || last.date !== date) {
    hist.push({ date, total });
  } else {
    hist[hist.length - 1] = { date, total };
  }
  return {
    ...project,
    updatedAt: Date.now(),
    priceHistory: hist.slice(-90),
  };
}

export async function listProjects(includeArchived = false): Promise<Project[]> {
  const snap = await adapter.load();
  return snap.projects.filter((p) => includeArchived || p.status === "active");
}

export async function getProject(id: string): Promise<Project | null> {
  const snap = await adapter.load();
  return snap.projects.find((p) => p.id === id) || null;
}

export async function createProject(opts: {
  name: string;
  description?: string;
  imageUrl?: string | null;
  templateId: ProjectTemplateId | string;
}): Promise<Project> {
  const tpl = getTemplate(opts.templateId);
  const now = Date.now();
  const slots: ProjectSlot[] = tpl.slots.map((s) => ({
    slotId: s.id,
    label: s.label,
    product: null,
    selected: true,
    compatibilityHints: s.compatibilityHints,
  }));
  const project: Project = {
    id: uid("proj"),
    name: opts.name.trim() || tpl.name,
    description: (opts.description || "").trim(),
    imageUrl: opts.imageUrl || null,
    templateId: tpl.id,
    slots,
    status: "active",
    createdAt: now,
    updatedAt: now,
    initialTotal: 0,
    priceHistory: [{ date: todayIso(), total: 0 }],
    compatibilityVersion: 0,
  };
  await mutate((snap) => ({
    ...snap,
    projects: [project, ...snap.projects],
  }));
  return project;
}

export async function updateProjectMeta(
  id: string,
  patch: Partial<Pick<Project, "name" | "description" | "imageUrl">>,
): Promise<void> {
  await mutate((snap) => ({
    ...snap,
    projects: snap.projects.map((p) =>
      p.id === id
        ? touchHistory({
            ...p,
            ...patch,
            name: patch.name?.trim() || p.name,
          })
        : p,
    ),
  }));
}

export async function setSlotProduct(
  projectId: string,
  slotId: string,
  product: Product | null,
): Promise<void> {
  await mutate((snap) => ({
    ...snap,
    projects: snap.projects.map((p) => {
      if (p.id !== projectId) return p;
      const slots = p.slots.map((s) =>
        s.slotId === slotId
          ? {
              ...s,
              product: product ? productToProjectSnap(product) : null,
            }
          : s,
      );
      let next = { ...p, slots };
      const total = projectTotal(next);
      if (p.initialTotal === 0 && total > 0) {
        next = { ...next, initialTotal: total };
      }
      return touchHistory(next);
    }),
  }));
}

/** Adiciona a um slot vazio (primeiro) ou ao slot indicado. */
export async function addProductToProject(
  projectId: string,
  product: Product,
  slotId?: string,
): Promise<{ ok: boolean; reason?: "full" | "missing" }> {
  const project = await getProject(projectId);
  if (!project) return { ok: false, reason: "missing" };

  let target = slotId;
  if (!target) {
    const empty = project.slots.find((s) => !s.product);
    if (empty) target = empty.slotId;
    else {
      // blank: append slot
      if (project.templateId === "blank") {
        const newId = `item_${project.slots.length + 1}`;
        await mutate((snap) => ({
          ...snap,
          projects: snap.projects.map((p) => {
            if (p.id !== projectId) return p;
            const slots = [
              ...p.slots,
              {
                slotId: newId,
                label: `Item ${p.slots.length + 1}`,
                product: productToProjectSnap(product),
                selected: true,
              },
            ];
            let next = { ...p, slots };
            const total = projectTotal(next);
            if (p.initialTotal === 0) next = { ...next, initialTotal: total };
            return touchHistory(next);
          }),
        }));
        return { ok: true };
      }
      return { ok: false, reason: "full" };
    }
  }
  await setSlotProduct(projectId, target, product);
  return { ok: true };
}

export async function clearSlot(
  projectId: string,
  slotId: string,
): Promise<void> {
  await setSlotProduct(projectId, slotId, null);
}

export async function toggleSlotSelected(
  projectId: string,
  slotId: string,
  selected: boolean,
): Promise<void> {
  await mutate((snap) => ({
    ...snap,
    projects: snap.projects.map((p) =>
      p.id === projectId
        ? {
            ...p,
            slots: p.slots.map((s) =>
              s.slotId === slotId ? { ...s, selected } : s,
            ),
            updatedAt: Date.now(),
          }
        : p,
    ),
  }));
}

export async function reorderSlots(
  projectId: string,
  slotIds: string[],
): Promise<void> {
  await mutate((snap) => ({
    ...snap,
    projects: snap.projects.map((p) => {
      if (p.id !== projectId) return p;
      const map = new Map(p.slots.map((s) => [s.slotId, s]));
      const slots = slotIds.map((id) => map.get(id)).filter(Boolean) as ProjectSlot[];
      const rest = p.slots.filter((s) => !slotIds.includes(s.slotId));
      return touchHistory({ ...p, slots: [...slots, ...rest] });
    }),
  }));
}

export async function addCustomSlot(
  projectId: string,
  label: string,
): Promise<void> {
  await mutate((snap) => ({
    ...snap,
    projects: snap.projects.map((p) => {
      if (p.id !== projectId) return p;
      const slotId = uid("slot");
      return touchHistory({
        ...p,
        slots: [
          ...p.slots,
          {
            slotId,
            label: label.trim() || `Item ${p.slots.length + 1}`,
            product: null,
            selected: true,
          },
        ],
      });
    }),
  }));
}

export async function duplicateProject(id: string): Promise<Project | null> {
  const src = await getProject(id);
  if (!src) return null;
  const now = Date.now();
  const copy: Project = {
    ...JSON.parse(JSON.stringify(src)) as Project,
    id: uid("proj"),
    name: `${src.name} (cópia)`,
    status: "active",
    createdAt: now,
    updatedAt: now,
  };
  await mutate((snap) => ({
    ...snap,
    projects: [copy, ...snap.projects],
  }));
  return copy;
}

export async function archiveProject(id: string): Promise<void> {
  await mutate((snap) => ({
    ...snap,
    projects: snap.projects.map((p) =>
      p.id === id ? { ...p, status: "archived", updatedAt: Date.now() } : p,
    ),
  }));
}

export async function restoreProject(id: string): Promise<void> {
  await mutate((snap) => ({
    ...snap,
    projects: snap.projects.map((p) =>
      p.id === id ? { ...p, status: "active", updatedAt: Date.now() } : p,
    ),
  }));
}

export async function deleteProject(id: string): Promise<void> {
  await mutate((snap) => ({
    ...snap,
    projects: snap.projects.filter((p) => p.id !== id),
  }));
}

/** Reinsere um projecto completo (undo após eliminar). */
export async function reinsertProject(project: Project): Promise<void> {
  await mutate((snap) => {
    const others = snap.projects.filter((p) => p.id !== project.id);
    return { ...snap, projects: [project, ...others] };
  });
}

/** Actualiza preços dos snaps a partir do produto vivo. */
export async function refreshSlotFromProduct(
  projectId: string,
  slotId: string,
  product: Product,
): Promise<void> {
  await mutate((snap) => ({
    ...snap,
    projects: snap.projects.map((p) => {
      if (p.id !== projectId) return p;
      const slots = p.slots.map((s) => {
        if (s.slotId !== slotId || !s.product) return s;
          const snapProd = productToProjectSnap(product);
        return {
          ...s,
          product: {
            ...snapProd,
            priceAtAdd: s.product.priceAtAdd,
            typedAttributes:
              snapProd.typedAttributes || s.product.typedAttributes || null,
            knowledgeAttributes:
              snapProd.knowledgeAttributes ||
              s.product.knowledgeAttributes ||
              null,
            knowledgeCompleteness:
              snapProd.knowledgeCompleteness ??
              s.product.knowledgeCompleteness ??
              null,
          },
        };
      });
      return touchHistory({ ...p, slots });
    }),
  }));
}

export async function recordCompatibilitySnapshot(
  projectId: string,
  score: number,
  warnings: number,
  errors: number,
): Promise<void> {
  const date = todayIso();
  await mutate((snap) => ({
    ...snap,
    projects: snap.projects.map((p) => {
      if (p.id !== projectId) return p;
      const hist = [...(p.compatibilityHistory || [])];
      const last = hist[hist.length - 1];
      const point = { date, score, warnings, errors };
      if (!last || last.date !== date) hist.push(point);
      else hist[hist.length - 1] = point;
      return {
        ...p,
        compatibilityHistory: hist.slice(-90),
        compatibilityVersion: 1 as const,
        updatedAt: Date.now(),
      };
    }),
  }));
}

export { PROJECT_TEMPLATES, getTemplate } from "@/lib/projects/templates";
export {
  computeProjectSummary,
  projectTotal,
} from "@/lib/projects/summary";

