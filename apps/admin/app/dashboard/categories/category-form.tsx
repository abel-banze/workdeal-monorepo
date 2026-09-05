"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createCategory, updateCategory } from "@/app/actions/admin";
import type { CategoryCreateInput, CategoryUpdateInput } from "@workdeal/shared";

export interface CategoryFormProps {
  mode: "create" | "edit";
  initial?: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    parentId: string | null;
    isActive: boolean;
  };
  parentOptions?: { id: string; name: string }[];
}

export function CategoryForm({ mode, initial, parentOptions = [] }: CategoryFormProps) {
  const router = useRouter();
  const [name, setName] = useState(initial?.name ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [parentId, setParentId] = useState(initial?.parentId ?? "");
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
        const input: CategoryCreateInput = {
          name: name.trim(),
          slug: slug.trim() || generateSlug(name.trim()),
          description: description.trim() || undefined,
          parentId: parentId || undefined,
          isActive,
        };
        const res = await createCategory(input);
        if (!res.success) throw new Error(res.error?.message ?? "Falha ao criar categoria");
        router.push("/dashboard/categories");
        router.refresh();
      } else {
        const input: CategoryUpdateInput = {
          name: name.trim() || undefined,
          slug: slug.trim() || undefined,
          description: description.trim() || undefined,
          parentId: parentId || undefined,
          isActive,
        };
        const res = await updateCategory(initial!.id, input);
        if (!res.success) throw new Error(res.error?.message ?? "Falha ao actualizar categoria");
        router.push("/dashboard/categories");
        router.refresh();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao guardar categoria");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 max-w-lg">
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
          placeholder="Ex: Construção Civil"
          className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="slug" className="text-sm font-medium">Slug *</label>
        <input
          id="slug"
          required
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          placeholder="ex: construcao-civil"
          className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$"
        />
        <p className="text-xs text-muted-foreground">Apenas letras minúsculas, números e hífens.</p>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="description" className="text-sm font-medium">Descrição</label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Descrição opcional da categoria"
          rows={3}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="parentId" className="text-sm font-medium">Categoria pai</label>
        <select
          id="parentId"
          value={parentId}
          onChange={(e) => setParentId(e.target.value)}
          className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">Nenhuma (categoria principal)</option>
          {parentOptions
            .filter((p) => p.id !== initial?.id)
            .map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
        </select>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="isActive"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
          className="size-4 rounded border-input"
        />
        <label htmlFor="isActive" className="text-sm font-medium">Activa</label>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={loading}>
          {loading ? "A guardar…" : mode === "create" ? "Criar categoria" : "Guardar alterações"}
        </Button>
        <Button variant="outline" type="button" onClick={() => router.push("/dashboard/categories")}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
