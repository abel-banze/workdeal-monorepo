"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/select";

const STATUS_OPTIONS = [
  { value: "pre_registered", label: "Pré-registada" },
  { value: "pending", label: "Pendente" },
  { value: "in_review", label: "Em análise" },
  { value: "verified", label: "Verificada" },
  { value: "suspended", label: "Suspensa" },
  { value: "expired", label: "Expirada" },
] as const;

type OrganizationsFiltersProps = {
  initialSearch: string;
  initialStatus: string;
  initialHasMembers: string;
  initialHasProfiles: string;
};

export function OrganizationsFilters({
  initialSearch,
  initialStatus,
  initialHasMembers,
  initialHasProfiles,
}: OrganizationsFiltersProps) {
  const router = useRouter();
  const [search, setSearch] = useState(initialSearch);
  const [status, setStatus] = useState(initialStatus);
  const [hasMembers, setHasMembers] = useState(initialHasMembers);
  const [hasProfiles, setHasProfiles] = useState(initialHasProfiles);

  const activeCount = [search.trim(), status, hasMembers, hasProfiles].filter(Boolean).length;

  function handleApply(e?: React.FormEvent) {
    e?.preventDefault();
    const params = new URLSearchParams();
    const q = search.trim();
    if (q) params.set("search", q);
    if (status) params.set("verificationStatus", status);
    if (hasMembers) params.set("hasMembers", hasMembers);
    if (hasProfiles) params.set("hasProfiles", hasProfiles);
    router.push(params.toString() ? `/dashboard/organizations?${params.toString()}` : "/dashboard/organizations");
  }

  function handleClear() {
    setSearch("");
    setStatus("");
    setHasMembers("");
    setHasProfiles("");
    router.push("/dashboard/organizations");
  }

  return (
    <form onSubmit={handleApply} className="flex flex-wrap items-center gap-2">
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Pesquisar por nome ou slug"
        aria-label="Pesquisar empresa"
        className="h-9 w-64 rounded-md border border-input bg-background px-3 text-sm"
      />

      <Select value={status || null} onValueChange={(v) => setStatus(v ?? "")}>
        <SelectTrigger aria-label="Filtrar por estado" className="h-9 w-auto min-w-[170px] text-[13px]">
          <SelectValue placeholder="Estado: todos" />
        </SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={hasMembers || null} onValueChange={(v) => setHasMembers(v ?? "")}>
        <SelectTrigger aria-label="Filtrar por membros" className="h-9 w-auto min-w-[170px] text-[13px]">
          <SelectValue placeholder="Membros: todos" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="with">Com membros</SelectItem>
          <SelectItem value="without">Sem membros</SelectItem>
        </SelectContent>
      </Select>

      <Select value={hasProfiles || null} onValueChange={(v) => setHasProfiles(v ?? "")}>
        <SelectTrigger aria-label="Filtrar por perfis" className="h-9 w-auto min-w-[170px] text-[13px]">
          <SelectValue placeholder="Perfis: todos" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="with">Com perfil</SelectItem>
          <SelectItem value="without">Sem perfil</SelectItem>
        </SelectContent>
      </Select>

      <Button type="submit" size="sm">Filtrar</Button>
      {activeCount > 0 && (
        <Button type="button" variant="outline" size="sm" onClick={handleClear}>
          Limpar
        </Button>
      )}
    </form>
  );
}