"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2Icon, CheckIcon, PlusIcon, SearchIcon, UserIcon, XIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/select";
import { Button } from "@/components/ui/button";
import { createAdminAffiliate, listAdminOrganizations, listAdminUsers } from "@/app/actions/admin";

interface UserRow {
  id: string;
  name: string;
  email: string;
}

interface OrgRow {
  id: string;
  name: string;
  slug: string;
}

interface ActorRef {
  actorType: "user" | "organization";
  actorId: string;
  label: string;
  detail: string;
}

const inputClass = "h-9 w-full rounded-md border border-input bg-background px-3 text-sm";

export function NewAffiliateDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [actorType, setActorType] = useState<"user" | "organization">("organization");
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<Array<{ id: string; name: string; detail: string }>>([]);
  const [searched, setSearched] = useState(false);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<ActorRef | null>(null);
  const [commissionType, setCommissionType] = useState<"percent" | "fixed">("percent");
  const [commissionValue, setCommissionValue] = useState("10");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setSearch("");
    setResults([]);
    setSearched(false);
    setSelected(null);
    setCommissionType("percent");
    setCommissionValue("10");
    setError(null);
  }

  function switchType(next: "user" | "organization") {
    if (next === actorType) return;
    setActorType(next);
    setSearch("");
    setResults([]);
    setSearched(false);
    setSelected(null);
    setError(null);
  }

  async function runSearch() {
    const q = search.trim();
    if (!q) return;
    setSearching(true);
    setError(null);
    setSearched(true);
    try {
      const res =
        actorType === "user"
          ? await listAdminUsers({ search: q, page: 1, limit: 12 })
          : await listAdminOrganizations({ search: q, page: 1, limit: 12 });
      if (!res.success) {
        setResults([]);
        setError(res.error?.message ?? "Falha na pesquisa");
        return;
      }
      const rows = res.data ?? null;
      if (actorType === "user") {
        const users = (rows as UserRow[] | null) ?? [];
        setResults(users.map((u) => ({ id: u.id, name: u.name || u.email, detail: u.email })));
      } else {
        const orgs = (rows as OrgRow[] | null) ?? [];
        setResults(orgs.map((o) => ({ id: o.id, name: o.name, detail: o.slug })));
      }
    } catch (e) {
      setResults([]);
      setError(e instanceof Error ? e.message : "Falha na pesquisa");
    } finally {
      setSearching(false);
    }
  }

  function pickActor(r: { id: string; name: string; detail: string }) {
    setSelected({ actorType, actorId: r.id, label: r.name, detail: r.detail });
    setResults([]);
  }

  async function submit() {
    setError(null);
    const value = Math.trunc(Number(commissionValue));
    if (!selected) {
      setError("Selecciona o utilizador ou empresa.");
      return;
    }
    if (!Number.isFinite(value) || value < 0) {
      setError("Valor de comissão inválido.");
      return;
    }
    if (commissionType === "percent" && value > 100) {
      setError("Percentagem máxima é 100%.");
      return;
    }
    setBusy(true);
    try {
      const res = await createAdminAffiliate({
        actorType: selected.actorType,
        actorId: selected.actorId,
        commissionType,
        commissionValue: value,
      });
      if (!res.success) {
        setError(res.error?.message ?? "Falha ao criar afiliado");
        return;
      }
      reset();
      setOpen(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao criar afiliado");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger
        render={
          <Button size="sm" type="button">
            <PlusIcon className="size-4" />
            Novo afiliado
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo afiliado</DialogTitle>
          <DialogDescription>
            Escolhe a pessoa ou empresa que vai indicar novas empresas. O código é gerado automaticamente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <label className="text-sm font-medium">Tipo de afiliado</label>
            <div className="inline-flex rounded-md border">
              <Button
                type="button"
                size="sm"
                variant={actorType === "organization" ? "default" : "ghost"}
                className="rounded-r-none"
                onClick={() => switchType("organization")}
              >
                <Building2Icon className="size-4" />
                Empresa
              </Button>
              <Button
                type="button"
                size="sm"
                variant={actorType === "user" ? "default" : "ghost"}
                className="rounded-l-none"
                onClick={() => switchType("user")}
              >
                <UserIcon className="size-4" />
                Utilizador
              </Button>
            </div>
          </div>

          {selected ? (
            <div className="flex items-center justify-between gap-2 rounded-md border p-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{selected.label}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {selected.actorType === "user" ? "Utilizador" : "Empresa"} · {selected.detail}
                </p>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={() => setSelected(null)} aria-label="Remover seleção">
                <XIcon className="size-4" />
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void runSearch();
                    }
                  }}
                  placeholder={`Pesquisar ${actorType === "user" ? "nome ou email" : "nome ou slug"}…`}
                  className={inputClass}
                />
                <Button type="button" size="sm" variant="outline" onClick={() => void runSearch()} disabled={searching || !search.trim()}>
                  <SearchIcon className="size-4" />
                  Buscar
                </Button>
              </div>
              {searched && !searching && (
                <div className="max-h-52 overflow-y-auto rounded-md border">
                  {results.length === 0 ? (
                    <p className="px-3 py-6 text-center text-sm text-muted-foreground">Sem resultados.</p>
                  ) : (
                    results.map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => pickActor(r)}
                        className="flex w-full items-center justify-between gap-2 border-b px-3 py-2 text-left text-sm last:border-0 hover:bg-accent"
                      >
                        <span className="min-w-0">
                          <span className="block truncate font-medium">{r.name}</span>
                          <span className="block truncate text-xs text-muted-foreground">{r.detail}</span>
                        </span>
                        <CheckIcon className="size-4 shrink-0 text-muted-foreground" />
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          <div className="grid gap-3">
            <label className="text-sm font-medium">Comissão</label>
            <Select value={commissionType} onValueChange={(v) => setCommissionType(v === "fixed" ? "fixed" : "percent")}>
              <SelectTrigger className="h-9 w-full text-[13px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="percent">Percentagem (%)</SelectItem>
                <SelectItem value="fixed">Valor fixo (MZN)</SelectItem>
              </SelectContent>
            </Select>
            <input
              type="number"
              min={0}
              value={commissionValue}
              onChange={(e) => setCommissionValue(e.target.value)}
              className={inputClass}
            />
            {commissionType === "percent" ? (
              <p className="text-xs text-muted-foreground">Porcentagem de cada factura paga. Máximo 100%.</p>
            ) : (
              <p className="text-xs text-muted-foreground">Valor fixo pago por cada empresa convertida.</p>
            )}
          </div>

          {error && <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>}
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button size="sm" onClick={() => void submit()} disabled={busy || !selected}>
            {busy ? "A criar…" : "Criar afiliado"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}