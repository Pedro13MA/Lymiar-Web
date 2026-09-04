"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SiteFooter, SiteHeader } from "@/components/layout/SiteHeader";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useSession } from "@/components/auth/SessionProvider";
import { deleteMe, updateMe } from "@/lib/auth/session";
import { Button } from "@/components/ui/button";
import "@/components/home/premium/home-premium.css";
import "@/components/catalogo/catalog-premium.css";
import "@/components/auth/account.css";

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("pt-PT", {
      dateStyle: "long",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function accountAgeLabel(createdAt: string | null | undefined): string {
  if (!createdAt) return "—";
  const created = new Date(createdAt).getTime();
  if (Number.isNaN(created)) return "—";
  const days = Math.max(0, Math.floor((Date.now() - created) / 86_400_000));
  if (days < 1) return "Desde hoje";
  if (days === 1) return "Há 1 dia";
  if (days < 30) return `Há ${days} dias`;
  const months = Math.floor(days / 30);
  if (months < 12) return months === 1 ? "Há 1 mês" : `Há ${months} meses`;
  const years = Math.floor(months / 12);
  return years === 1 ? "Há 1 ano" : `Há ${years} anos`;
}

async function fileToAvatarDataUrl(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  const scale = Math.max(size / bitmap.width, size / bitmap.height);
  const w = bitmap.width * scale;
  const h = bitmap.height * scale;
  ctx.drawImage(bitmap, (size - w) / 2, (size - h) / 2, w, h);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.85);
}

function PerfilBody() {
  const { user, refresh, signOut } = useSession();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(user?.name || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [confirmEmail, setConfirmEmail] = useState("");
  const [deleting, setDeleting] = useState(false);

  if (!user) return null;

  const initial = (user.name || user.email || "?").slice(0, 1).toUpperCase();

  const saveName = async () => {
    setSaving(true);
    setError(null);
    setOkMsg(null);
    try {
      await updateMe({ name: name.trim() });
      await refresh();
      setOkMsg("Nome atualizado.");
    } catch {
      setError("Não foi possível guardar o nome.");
    } finally {
      setSaving(false);
    }
  };

  const onPickPhoto = async (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Escolhe uma imagem (JPG ou PNG).");
      return;
    }
    setSaving(true);
    setError(null);
    setOkMsg(null);
    try {
      const dataUrl = await fileToAvatarDataUrl(file);
      await updateMe({ image: dataUrl });
      await refresh();
      setOkMsg("Foto atualizada.");
    } catch {
      setError("Não foi possível atualizar a foto.");
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    setDeleting(true);
    setError(null);
    try {
      await deleteMe(confirmEmail);
      await signOut();
      router.replace("/");
    } catch {
      setError("Confirma o email exactamente como na conta para eliminar.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <main className="account-shell mx-auto max-w-lg space-y-6 px-4 py-10 sm:px-6">
      <div>
        <Link
          href="/minha-area/"
          className="text-sm font-medium text-[var(--hm-brand-deep)] hover:underline"
        >
          ← Minha Área
        </Link>
        <h1 className="mt-3 font-display text-3xl font-bold text-[var(--hm-ink)]">
          Perfil
        </h1>
        <p className="mt-2 text-sm text-[var(--hm-muted)]">
          Conta Google · {accountAgeLabel(user.createdAt)} · criada em{" "}
          {formatDate(user.createdAt)}
        </p>
      </div>

      <section className="catalog-panel flex flex-col items-center gap-4 p-6">
        {user.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.image}
            alt=""
            className="h-24 w-24 rounded-2xl object-cover ring-1 ring-[var(--hm-line)]"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div
            className="flex h-24 w-24 items-center justify-center rounded-2xl bg-[var(--hm-bg-soft)] text-2xl font-semibold text-[var(--hm-ink)]"
            aria-hidden
          >
            {initial}
          </div>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => void onPickPhoto(e.target.files?.[0] ?? null)}
        />
        <Button
          type="button"
          variant="secondary"
          disabled={saving}
          onClick={() => fileRef.current?.click()}
        >
          Alterar foto
        </Button>
        <p className="text-center text-xs text-[var(--hm-faint)]">
          Por omissão usa a foto da conta Google. Podes substituir por uma foto
          tua (redimensionada no dispositivo).
        </p>
      </section>

      <section className="catalog-panel space-y-4 p-6">
        <div>
          <label
            htmlFor="perfil-name"
            className="text-xs font-medium uppercase tracking-wide text-[var(--hm-faint)]"
          >
            Nome
          </label>
          <input
            id="perfil-name"
            value={name}
            maxLength={80}
            onChange={(e) => setName(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-[var(--hm-line)] bg-white px-3 py-2.5 text-sm text-[var(--hm-ink)] outline-none focus:border-[var(--hm-brand)]"
          />
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--hm-faint)]">
            Email
          </p>
          <p className="mt-1.5 text-sm font-medium text-[var(--hm-ink)]">
            {user.email || "—"}
          </p>
          <p className="mt-1 text-xs text-[var(--hm-faint)]">
            Vem da conta Google — usado para alertas de preço.
          </p>
        </div>
        <Button
          type="button"
          disabled={saving || !name.trim() || name.trim() === (user.name || "")}
          onClick={() => void saveName()}
        >
          Guardar nome
        </Button>
        {okMsg ? (
          <p className="text-sm text-emerald-700" role="status">
            {okMsg}
          </p>
        ) : null}
        {error ? (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}
      </section>

      <section className="catalog-panel space-y-3 p-6">
        <Button
          type="button"
          variant="secondary"
          className="w-full"
          onClick={() => void signOut()}
        >
          Terminar sessão
        </Button>
      </section>

      <section className="perfil-danger catalog-panel space-y-3 p-6">
        <h2 className="font-display text-base font-bold text-[var(--hm-ink)]">
          Eliminar conta
        </h2>
        <p className="text-sm text-[var(--hm-muted)]">
          Apaga permanentemente o perfil, favoritos, alertas, projetos e
          notificações. Não há recuperação.
        </p>
        <label
          htmlFor="perfil-confirm"
          className="block text-xs font-medium text-[var(--hm-faint)]"
        >
          Escreve o teu email para confirmar
        </label>
        <input
          id="perfil-confirm"
          type="email"
          autoComplete="off"
          value={confirmEmail}
          onChange={(e) => setConfirmEmail(e.target.value)}
          placeholder={user.email || "email@exemplo.com"}
          className="w-full rounded-xl border border-[var(--hm-line)] bg-white px-3 py-2.5 text-sm outline-none focus:border-red-400"
        />
        <Button
          type="button"
          variant="secondary"
          className="w-full border-red-200 text-red-700 hover:bg-red-50"
          disabled={
            deleting ||
            !user.email ||
            confirmEmail.trim().toLowerCase() !== user.email.toLowerCase()
          }
          onClick={() => void onDelete()}
        >
          {deleting ? "A eliminar…" : "Eliminar conta permanentemente"}
        </Button>
      </section>
    </main>
  );
}

export function PerfilPageClient() {
  return (
    <div className="home-premium min-h-screen">
      <SiteHeader />
      <ProtectedRoute>
        <PerfilBody />
      </ProtectedRoute>
      <SiteFooter />
    </div>
  );
}
