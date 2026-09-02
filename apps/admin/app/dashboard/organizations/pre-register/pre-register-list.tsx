"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { MoreHorizontalIcon, CopyIcon, EditIcon, LinkIcon, TrashIcon, BellRingIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuGroup,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@workspace/ui/components/dropdown-menu";
import { regeneratePreRegisterToken, deletePreRegister, resendPreRegisterNotification } from "@/app/actions/admin";
import type { PreRegisterListItem } from "./page";

export function PreRegisterList({ items, isAdmin }: { items: PreRegisterListItem[]; isAdmin: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  async function regenerate(id: string) {
    setBusy(id);
    setError(null);
    try {
      const res = await regeneratePreRegisterToken(id);
      if (!res.success) setError(res.error?.message ?? "Falha ao gerar novo link");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao gerar novo link");
    } finally {
      setBusy(null);
    }
  }

  async function resend(id: string) {
    setBusy(id);
    setError(null);
    try {
      const res = await resendPreRegisterNotification(id);
      if (!res.success) setError(res.error?.message ?? "Falha ao reenviar notificação");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao reenviar notificação");
    } finally {
      setBusy(null);
    }
  }

  async function remove(id: string) {
    if (!confirm("Eliminar este pré-registo? A empresa será removida e deixará de ser notificada.")) return;
    setBusy(id);
    setError(null);
    try {
      const res = await deletePreRegister(id);
      if (!res.success) setError(res.error?.message ?? "Falha ao eliminar pré-registo");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao eliminar pré-registo");
    } finally {
      setBusy(null);
    }
  }

  async function copyLink(url: string, id: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(id);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      /* clipboard indisponível */
    }
  }

  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">Ainda não há empresas pré-registadas.</p>;
  }

  return (
    <div className="space-y-3">
      {error && <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>}
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-left">
              <th className="px-3 py-2 font-medium">Empresa</th>
              <th className="px-3 py-2 font-medium">Categorias</th>
              <th className="px-3 py-2 font-medium">Contacto</th>
              <th className="px-3 py-2 font-medium">Registada por</th>
              <th className="px-3 py-2 font-medium">Link</th>
              <th className="px-3 py-2 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {items.map((o) => (
              <tr key={o.id} className="border-b last:border-0 align-top">
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    {o.logoUrl ? (
                      <Image src={o.logoUrl} alt="" width={28} height={28} className="size-7 shrink-0 rounded object-cover" />
                    ) : (
                      <span className="flex size-7 shrink-0 items-center justify-center rounded bg-muted text-[11px] font-bold">
                        {o.name.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                    <div className="min-w-0">
                      <span className="block truncate font-medium">{o.name}</span>
                      <span className="block text-xs text-muted-foreground">{o.slug}</span>
                    </div>
                  </div>
                  {o.formattedAddress && <span className="mt-1 block text-xs text-muted-foreground">{o.formattedAddress}</span>}
                </td>
                <td className="px-3 py-2">
                  {o.categorySlugs.length > 0 ? (
                    <div className="flex max-w-[180px] flex-wrap gap-1">
                      {o.categorySlugs.map((c) => (
                        <span key={c} className="rounded-full border px-2 py-0.5 text-[10px]">{c}</span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-3 py-2 text-muted-foreground">
                  <span className="block">{o.contactName}</span>
                  <span className="block">{o.contactPhone ?? "—"}</span>
                  <span className="block text-xs">{o.contactEmail ?? "—"}</span>
                </td>
                <td className="px-3 py-2 text-muted-foreground">{o.promoterEmail ?? "—"}</td>
                <td className="px-3 py-2">
                  {o.completionUrl ? (
                    <button
                      type="button"
                      onClick={() => void copyLink(o.completionUrl!, o.id)}
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      {copied === o.id ? "Copiado!" : (
                        <>
                          <LinkIcon className="size-3" /> Copiar link
                        </>
                      )}
                    </button>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-3 py-2">
                  <div className="flex justify-end">
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <button
                            type="button"
                            disabled={busy === o.id}
                            className="inline-flex size-8 items-center justify-center rounded-md border border-input bg-background hover:bg-accent disabled:opacity-50"
                            aria-label={`Ações de ${o.name}`}
                          >
                            <MoreHorizontalIcon className="size-4" />
                          </button>
                        }
                      />
                      <DropdownMenuContent align="end" sideOffset={4}>
                        <DropdownMenuGroup>
                          <DropdownMenuLabel>{o.name}</DropdownMenuLabel>
                        </DropdownMenuGroup>
                        {o.completionUrl && (
                          <DropdownMenuItem
                            onClick={() => void copyLink(o.completionUrl!, o.id)}
                          >
                            <CopyIcon /> {copied === o.id ? "Copiado!" : "Copiar link"}
                          </DropdownMenuItem>
                        )}
                        {isAdmin && (
                          <DropdownMenuItem
                            onClick={() => void regenerate(o.id)}
                          >
                            <LinkIcon /> Novo link
                          </DropdownMenuItem>
                        )}
                        {isAdmin && (
                          <DropdownMenuItem
                            onClick={() => void resend(o.id)}
                          >
                            <BellRingIcon /> Reenviar notificação
                          </DropdownMenuItem>
                        )}
                        {isAdmin && (
                          <DropdownMenuItem render={<Link href={`/dashboard/organizations/pre-register/${o.id}/edit`} />}>
                            <EditIcon /> Editar
                          </DropdownMenuItem>
                        )}
                        {isAdmin && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem variant="destructive" onClick={() => void remove(o.id)} disabled={busy === o.id}>
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
