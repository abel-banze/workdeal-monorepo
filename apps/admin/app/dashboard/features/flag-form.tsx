"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createFeatureFlagFromForm, updateFeatureFlagFromForm } from "@/app/actions/admin";

const FLAG_GROUPS = ["free", "trust", "premium", "enterprise", "others"] as const;

export function CreateFlagForm() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    try {
      const formData = new FormData(e.currentTarget);
      const res = await createFeatureFlagFromForm(formData);
      if (!res.success) {
        alert(res.error?.message ?? "Falha ao criar flag");
        return;
      }
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid flex-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
      <label className="grid gap-1 text-xs font-medium">
        Chave (catálogo)
        <input name="key" required placeholder="ex: ai_assistant" className="rounded-md border border-input bg-background px-3 py-1.5 text-sm" />
      </label>
      <label className="grid gap-1 text-xs font-medium">
        Nome
        <input name="name" required placeholder="Assistente de IA" className="rounded-md border border-input bg-background px-3 py-1.5 text-sm" />
      </label>
      <label className="grid gap-1 text-xs font-medium">
        Grupo
        <select name="group" className="rounded-md border border-input bg-background px-3 py-1.5 text-sm">
          <option value="">Sem grupo</option>
          {FLAG_GROUPS.map((g) => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>
      </label>
      <label className="grid gap-1 text-xs font-medium">
        Ordem
        <input name="sortOrder" type="number" defaultValue={100} className="rounded-md border border-input bg-background px-3 py-1.5 text-sm" />
      </label>
      <label className="flex items-center gap-1.5 pt-5 text-xs font-medium">
        <input name="defaultEnabled" type="checkbox" defaultChecked className="size-4 rounded border" />
        Ligado por defeito
      </label>
      <div className="grid content-end">
        <Button type="submit" disabled={saving} size="sm">{saving ? "A criar…" : "Criar"}</Button>
      </div>
    </form>
  );
}

export function EditFlagForm({ flag }: { flag: { key: string; name: string; group: string | null; sortOrder: number; description?: string | null } }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    try {
      const formData = new FormData(e.currentTarget);
      const res = await updateFeatureFlagFromForm(formData);
      if (!res.success) {
        alert(res.error?.message ?? "Falha ao guardar flag");
        return;
      }
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid flex-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
      <input type="hidden" name="key" value={flag.key} />
      <label className="grid gap-1 text-xs font-medium">
        Nome
        <input name="name" required defaultValue={flag.name} className="rounded-md border border-input bg-background px-3 py-1.5 text-sm" />
      </label>
      <label className="grid gap-1 text-xs font-medium">
        Grupo
        <select name="group" defaultValue={flag.group ?? ""} className="rounded-md border border-input bg-background px-3 py-1.5 text-sm">
          <option value="">Sem grupo</option>
          {FLAG_GROUPS.map((g) => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>
      </label>
      <label className="grid gap-1 text-xs font-medium">
        Ordem
        <input name="sortOrder" type="number" defaultValue={flag.sortOrder} className="rounded-md border border-input bg-background px-3 py-1.5 text-sm" />
      </label>
      <label className="grid gap-1 text-xs font-medium lg:col-span-3">
        Descrição
        <textarea name="description" defaultValue={flag.description ?? ""} rows={2} className="rounded-md border border-input bg-background px-3 py-1.5 text-sm" />
      </label>
      <div className="grid content-end">
        <Button type="submit" disabled={saving} size="sm">{saving ? "A guardar…" : "Guardar"}</Button>
      </div>
    </form>
  );
}
