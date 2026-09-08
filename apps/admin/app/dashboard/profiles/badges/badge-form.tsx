"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createBadge, updateBadge } from "@/app/actions/admin";
import { BADGE_TYPES, BADGE_TYPE_LABELS, BADGE_ORIGINS, BADGE_ORIGIN_LABELS, type BadgeType, type BadgeOrigin } from "@workdeal/shared";

export interface BadgeFormProps {
  mode: "create" | "edit";
  initial?: {
    id: string;
    slug: string;
    name: string;
    description: string | null;
    type: BadgeType;
    origin: BadgeOrigin;
    criteria: string | null;
    isActive: boolean;
  };
}

export function BadgeForm({ mode, initial }: BadgeFormProps) {
  const router = useRouter();
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [type, setType] = useState<BadgeType>(initial?.type ?? "trust");
  const [origin, setOrigin] = useState<BadgeOrigin>(initial?.origin ?? "manual");
  const [criteria, setCriteria] = useState(initial?.criteria ?? "");
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function generateSlug(value: string) {
    return value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\p{M}]/gu, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === "create") {
        const res = await createBadge({
          slug: slug.trim() || generateSlug(name.trim()),
          name: name.trim(),
          description: description.trim() || undefined,
          type,
          origin,
          criteria: criteria.trim() || undefined,
        });
        if (!res.success) throw new Error(res.error?.message ?? "Falha ao criar selo");
        router.push("/dashboard/profiles/badges");
        router.refresh();
      } else {
        const res = await updateBadge(initial!.id, {
          name: name.trim() || undefined,
          description: description.trim() || undefined,
          type,
          origin,
          criteria: criteria.trim() || undefined,
          isActive,
        });
        if (!res.success) throw new Error(res.error?.message ?? "Falha ao actualizar selo");
        router.push("/dashboard/profiles/badges");
        router.refresh();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao guardar selo");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="max-w-lg space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="name" className="text-sm font-medium">Nome *</label>
        <input
          id="name"
          required
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (mode === "create" && !slug) setSlug(generateSlug(e.target.value));
          }}
          placeholder="Ex: Instituição Verificada"
          className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
        />
      </div>

      {mode === "create" && (
        <div className="space-y-1.5">
          <label htmlFor="slug" className="text-sm font-medium">Slug *</label>
          <input
            id="slug"
            required
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="ex: instituicao-verificada"
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$"
          />
          <p className="text-xs text-muted-foreground">Apenas minúsculas, números e hífens. Imutável após a criação.</p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="type" className="text-sm font-medium">Tipo *</label>
          <select id="type" required value={type} onChange={(e) => setType(e.target.value as BadgeType)} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
            {BADGE_TYPES.map((t) => (
              <option key={t} value={t}>{BADGE_TYPE_LABELS[t]}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="origin" className="text-sm font-medium">Origem *</label>
          <select id="origin" required value={origin} onChange={(e) => setOrigin(e.target.value as BadgeOrigin)} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
            {BADGE_ORIGINS.map((o) => (
              <option key={o} value={o}>{BADGE_ORIGIN_LABELS[o]}</option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">Manual = atribuído por um administrador.</p>
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="description" className="text-sm font-medium">Descrição</label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="O que significa este selo para quem o vê"
          rows={3}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="criteria" className="text-sm font-medium">Critérios</label>
        <textarea
          id="criteria"
          value={criteria}
          onChange={(e) => setCriteria(e.target.value)}
          placeholder="Regra/condição para obter o selo (ou referência ao worker automático)"
          rows={3}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      </div>

      {mode === "edit" && (
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="isActive"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="size-4 rounded border-input"
          />
          <label htmlFor="isActive" className="text-sm font-medium">Activo</label>
        </div>
      )}

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={loading}>
          {loading ? "A guardar…" : mode === "create" ? "Criar selo" : "Guardar alterações"}
        </Button>
        <Button variant="outline" type="button" onClick={() => router.push("/dashboard/profiles/badges")}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}