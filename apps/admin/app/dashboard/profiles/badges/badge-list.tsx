"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontalIcon, EditIcon, TrashIcon, ToggleLeftIcon, ToggleRightIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuGroup,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@workspace/ui/components/dropdown-menu";
import { BADGE_TYPE_LABELS, BADGE_ORIGIN_LABELS } from "@workdeal/shared";
import { deleteBadge, toggleBadgeActive } from "@/app/actions/admin";
import type { BadgeListItem } from "./page";

export function BadgeList({ items, isAdmin }: { items: BadgeListItem[]; isAdmin: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function toggle(id: string) {
    setBusy(id);
    setError(null);
    try {
      const res = await toggleBadgeActive(id);
      if (!res.success) setError(res.error?.message ?? "Falha ao alternar estado");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao alternar estado");
    } finally {
      setBusy(null);
    }
  }

  async function remove(id: string) {
    if (!confirm("Eliminar este selo? Esta acção é irreversível.")) return;
    setBusy(id);
    setError(null);
    try {
      const res = await deleteBadge(id);
      if (!res.success) setError(res.error?.message ?? "Falha ao eliminar selo");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao eliminar selo");
    } finally {
      setBusy(null);
    }
  }

  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">Ainda não há selos.</p>;
  }

  return (
    <div className="space-y-3">
      {error && <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>}
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-left">
              <th className="px-3 py-2 font-medium">Nome</th>
              <th className="px-3 py-2 font-medium">Tipo</th>
              <th className="px-3 py-2 font-medium">Origem</th>
              <th className="px-3 py-2 font-medium">Descrição</th>
              <th className="px-3 py-2 font-medium">Estado</th>
              <th className="px-3 py-2 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {items.map((b) => (
              <tr key={b.id} className="border-b last:border-0 align-top">
                <td className="px-3 py-2">
                  <span className="font-medium">{b.name}</span>
                  <span className="ml-2 text-xs text-muted-foreground">{b.slug}</span>
                </td>
                <td className="px-3 py-2 text-muted-foreground">{BADGE_TYPE_LABELS[b.type]}</td>
                <td className="px-3 py-2 text-muted-foreground">{BADGE_ORIGIN_LABELS[b.origin]}</td>
                <td className="px-3 py-2 text-muted-foreground max-w-[220px] truncate">{b.description ?? "—"}</td>
                <td className="px-3 py-2">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${b.isActive ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                    {b.isActive ? "Activo" : "Inactivo"}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <div className="flex justify-end">
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <button
                            type="button"
                            disabled={busy === b.id}
                            className="inline-flex size-8 items-center justify-center rounded-md border border-input bg-background hover:bg-accent disabled:opacity-50"
                            aria-label={`Ações de ${b.name}`}
                          >
                            <MoreHorizontalIcon className="size-4" />
                          </button>
                        }
                      />
                      <DropdownMenuContent align="end" sideOffset={4}>
                        <DropdownMenuGroup>
                          <DropdownMenuLabel>{b.name}</DropdownMenuLabel>
                        </DropdownMenuGroup>
                        {isAdmin && (
                          <DropdownMenuItem render={<Link href={`/dashboard/profiles/badges/${b.id}/edit`} />}>
                            <EditIcon /> Editar
                          </DropdownMenuItem>
                        )}
                        {isAdmin && (
                          <DropdownMenuItem onClick={() => void toggle(b.id)} disabled={busy === b.id}>
                            {b.isActive ? <ToggleLeftIcon /> : <ToggleRightIcon />}
                            {b.isActive ? "Desactivar" : "Activar"}
                          </DropdownMenuItem>
                        )}
                        {isAdmin && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem variant="destructive" onClick={() => void remove(b.id)} disabled={busy === b.id}>
                              <TrashIcon /> Eliminar
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}