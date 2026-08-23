"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function SearchFilters({
  categories,
  initialParams,
}: {
  categories: { id: string; name: string; slug: string }[];
  initialParams: Record<string, string | undefined>;
}) {
  const router = useRouter();
  const [q, setQ] = useState(initialParams.q ?? "");
  const [categoryId, setCategoryId] = useState(initialParams.categoryId ?? "");

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (categoryId) params.set("categoryId", categoryId);
    router.push(`/?${params.toString()}`);
  }

  function onNearby() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const near = `${pos.coords.latitude.toFixed(4)},${pos.coords.longitude.toFixed(4)}`;
        const params = new URLSearchParams(window.location.search);
        params.set("near", near);
        params.set("radiusKm", "25");
        params.set("sort", "distance");
        router.push(`/?${params.toString()}`);
      },
      () => {},
    );
  }

  return (
    <form onSubmit={onSubmit} className="mb-6 flex flex-wrap gap-3 items-end border p-4 bg-card">
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Pesquisa</span>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="ex: electricista, canalização"
          className="border px-3 py-2 text-sm min-w-[220px] bg-background"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Categoria</span>
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="border px-3 py-2 text-sm bg-background min-w-[180px]"
        >
          <option value="">Todas</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      <button type="submit" className="h-9 px-4 bg-foreground text-background text-sm font-medium">
        Filtrar
      </button>
      <button type="button" onClick={onNearby} className="h-9 px-4 border text-sm">
        Perto de mim
      </button>
    </form>
  );
}
