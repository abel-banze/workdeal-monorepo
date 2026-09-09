"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/select";

const STATUS_OPTIONS = [
  { value: "active", label: "Activo" },
  { value: "suspended", label: "Suspendido" },
] as const;

export function AffiliatesFilters({ initialSearch, initialStatus }: { initialSearch: string; initialStatus: string }) {
  const router = useRouter();
  const [search, setSearch] = useState(initialSearch);
  const [status, setStatus] = useState(initialStatus);

  const activeCount = [search.trim(), status].filter(Boolean).length;

  function handleApply(e?: React.FormEvent) {
    e?.preventDefault();
    const params = new URLSearchParams();
    const q = search.trim();
    if (q) params.set("search", q);
    if (status) params.set("status", status);
    router.push(params.toString() ? `/dashboard/affiliates?${params.toString()}` : "/dashboard/affiliates");
  }

  function handleClear() {
    setSearch("");
    setStatus("");
    router.push("/dashboard/affiliates");
  }

  return (
    <form onSubmit={handleApply} className="flex flex-wrap items-center gap-2">
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Pesquisar por código ou nome"
        aria-label="Pesquisar afiliado"
        className="h-9 w-72 rounded-md border border-input bg-background px-3 text-sm"
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

      <Button type="submit" size="sm">Filtrar</Button>
      {activeCount > 0 && (
        <Button type="button" variant="outline" size="sm" onClick={handleClear}>
          Limpar
        </Button>
      )}
    </form>
  );
}