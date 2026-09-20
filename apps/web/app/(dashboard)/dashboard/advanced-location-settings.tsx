"use client";

import { useState } from "react";
import { createProfileLocation, updateProfileLocation, deleteProfileLocation } from "@/app/actions/locations-tags";
import { LocationPicker } from "@/components/features/location-picker";

type Loc = { id: string; province: string; district: string | null; bairro: string | null; latitude: number | null; longitude: number | null; visibility: string; isPrimary: boolean };

export function AdvancedLocationSettings({ profileId, organizationId, initial }: { profileId: string | null; organizationId: string | null; initial: Loc[] }) {
  const [locations, setLocations] = useState<Loc[]>(() => [...initial].sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary)));
  const [province, setProvince] = useState("Cidade de Maputo");
  const [district, setDistrict] = useState("");
  const [bairro, setBairro] = useState("");
  const [visibility, setVisibility] = useState<"exact" | "zone">("zone");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editProvince, setEditProvince] = useState("");
  const [editDistrict, setEditDistrict] = useState("");
  const [editBairro, setEditBairro] = useState("");
  const [editVisibility, setEditVisibility] = useState<"exact" | "zone">("zone");
  const [geoRequested, setGeoRequested] = useState(false);

  function requestGeo() {
    setGeoRequested(true);
    if (!navigator.geolocation) {
      setError("Geolocalização não suportada neste browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => setCoords({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => setError("Não foi possível obter a localização. Verifica as permissões do browser."),
      { enableHighAccuracy: false, timeout: 8000 },
    );
  }

  async function onSave() {
    if (!profileId) {
      setError("Complete o onboarding primeiro para criar o perfil.");
      return;
    }
    setSaving(true);
    setError(null);
    setMsg(null);
    try {
      const res = await createProfileLocation({
        profileId,
        organizationId,
        province,
        district: district || null,
        bairro: bairro || null,
        address: [bairro, district, province].filter(Boolean).join(", ") || null,
        latitude: coords?.lat ?? null,
        longitude: coords?.lng ?? null,
        label: locations.length === 0 ? "Sede" : `Filial ${locations.length + 1}`,
        isPrimary: locations.length === 0,
        visibility,
      });
      const created = (res as unknown as { data: Loc }).data ?? {
        id: `tmp-${Date.now()}`,
        province,
        district: district || null,
        bairro: bairro || null,
        latitude: coords?.lat ?? null,
        longitude: coords?.lng ?? null,
        visibility,
        isPrimary: locations.length === 0,
      };
      setMsg("Localização guardada. Irá aparecer em pesquisas por proximidade e no mapa.");
      setLocations((prev) => {
        const withNew = [...prev, created as Loc];
        // ordena: principal primeiro (P1-1)
        return withNew.sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary));
      });
      setDistrict("");
      setBairro("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao guardar localização");
    } finally {
      setSaving(false);
    }
  }

  async function onSetPrimary(id: string) {
    if (!profileId) return;
    setError(null);
    try {
      await updateProfileLocation(id, { isPrimary: true });
      setLocations((prev) => {
        const next = prev.map((l) => ({ ...l, isPrimary: l.id === id }));
        return next.sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary));
      });
      setMsg("Sede principal actualizada.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao definir principal");
    }
  }

  async function onDelete(id: string) {
    if (!confirm("Remover esta localização?")) return;
    setError(null);
    try {
      await deleteProfileLocation(id);
      setLocations((prev) => prev.filter((l) => l.id !== id));
      setMsg("Localização removida.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao remover");
    }
  }

  function startEdit(l: Loc) {
    setEditingId(l.id);
    setEditProvince(l.province);
    setEditDistrict(l.district ?? "");
    setEditBairro(l.bairro ?? "");
    setEditVisibility(l.visibility as "exact" | "zone");
  }

  async function onSaveEdit() {
    if (!editingId) return;
    setSaving(true);
    setError(null);
    try {
      const res = await updateProfileLocation(editingId, {
        province: editProvince,
        district: editDistrict || null,
        bairro: editBairro || null,
        address: [editBairro, editDistrict, editProvince].filter(Boolean).join(", ") || null,
        visibility: editVisibility,
      });
      const updated = (res as unknown as { data: Loc }).data;
      setLocations((prev) => prev.map((l) => (l.id === editingId ? { ...l, ...(updated as Loc), province: editProvince, district: editDistrict || null, bairro: editBairro || null, visibility: editVisibility } : l)));
      setEditingId(null);
      setMsg("Localização actualizada.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao actualizar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold tracking-tight text-foreground">
          Localizações & privacidade
        </h2>
        <span className="rounded-full bg-muted border border-border px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
          {locations.length} {locations.length === 1 ? "local" : "locais"}
        </span>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
        Adicione quantas sedes precisar. Escolha se mostra só a zona/bairro (privacidade) ou o pin exacto no mapa. A pesquisa “Perto de mim” funciona com ou sem GPS, via Google Maps.
      </p>

      {locations.length > 0 && (
        <ul className="mt-4 grid gap-2">
          {locations.map((l) => (
            <li key={l.id} className="flex flex-col gap-2 rounded-xl border border-border bg-muted px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <span className="text-sm font-medium text-foreground">
                  {l.province}
                  {l.district ? ` · ${l.district}` : ""}
                  {l.bairro ? ` · ${l.bairro}` : ""} {l.isPrimary ? <span className="ml-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">PRINCIPAL</span> : null}
                </span>
                <span className="block text-xs font-medium text-muted-foreground">
                  {l.visibility === "exact" ? "exacto" : "zona"} {l.latitude ? `· ${l.latitude.toFixed(4)}, ${l.longitude?.toFixed(4)}` : "· sem pin"}
                </span>
                {editingId === l.id && (
                  <div className="mt-3 grid gap-2 rounded-lg border border-border bg-card p-3">
                    <select value={editProvince} onChange={(e) => setEditProvince(e.target.value)} className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-[13px] text-foreground">
                      {["Cabo Delgado", "Cidade de Maputo", "Gaza", "Inhambane", "Manica", "Maputo", "Nampula", "Niassa", "Sofala", "Tete", "Zambézia"].map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                    <input value={editDistrict} onChange={(e) => setEditDistrict(e.target.value)} placeholder="Distrito" className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-[13px] text-foreground" />
                    <input value={editBairro} onChange={(e) => setEditBairro(e.target.value)} placeholder="Bairro" className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-[13px] text-foreground" />
                    <select value={editVisibility} onChange={(e) => setEditVisibility(e.target.value as "exact" | "zone")} className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-[13px] text-foreground">
                      <option value="zone">Só zona/bairro (privacidade)</option>
                      <option value="exact">Exacta (pin no mapa)</option>
                    </select>
                    <div className="flex gap-2">
                      <button onClick={() => onSaveEdit()} disabled={saving} className="flex-1 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/80 disabled:opacity-50">
                        Guardar
                      </button>
                      <button onClick={() => setEditingId(null)} className="flex-1 rounded-full border border-border bg-card px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted">
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex shrink-0 gap-1.5">
                {editingId !== l.id && (
                  <>
                    {!l.isPrimary && (
                      <button onClick={() => onSetPrimary(l.id)} className="rounded-full border border-primary/20 bg-card px-3 py-1.5 text-[11px] font-semibold text-primary hover:bg-primary/10">
                        Principal
                      </button>
                    )}
                    <button onClick={() => startEdit(l)} className="rounded-full border border-border bg-card px-3 py-1.5 text-[11px] font-semibold text-foreground hover:bg-muted">
                      Editar
                    </button>
                    <button onClick={() => onDelete(l.id)} className="rounded-full border border-destructive/20 bg-card px-3 py-1.5 text-[11px] font-semibold text-destructive hover:bg-destructive/10">
                      Remover
                    </button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-5 grid gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Província *</label>
            <select value={province} onChange={(e) => setProvince(e.target.value)} className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-[13px] text-foreground outline-none focus:border-primary focus:bg-card focus:ring-2 focus:ring-ring/50">
              {["Cabo Delgado", "Cidade de Maputo", "Gaza", "Inhambane", "Manica", "Maputo", "Nampula", "Niassa", "Sofala", "Tete", "Zambézia"].map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Distrito</label>
            <input
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              placeholder="KaMpfumo"
              className="w-full rounded-xl border border-border bg-muted px-3 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary focus:bg-card focus:ring-2 focus:ring-ring/50"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Bairro / Zona</label>
            <input
              value={bairro}
              onChange={(e) => setBairro(e.target.value)}
              placeholder="Sommerschield"
              className="w-full rounded-xl border border-border bg-muted px-3 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary focus:bg-card focus:ring-2 focus:ring-ring/50"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Visibilidade</label>
            <select
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as "exact" | "zone")}
              className="w-full rounded-xl border border-border bg-muted px-3 py-3 text-sm text-foreground outline-none focus:border-primary focus:bg-card focus:ring-2 focus:ring-ring/50"
            >
              <option value="zone">Só zona/bairro (privacidade)</option>
              <option value="exact">Exacta (pin no mapa)</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <LocationPicker initialLat={coords?.lat ?? null} initialLng={coords?.lng ?? null} onPick={setCoords} />
          {!geoRequested ? (
            <button onClick={requestGeo} type="button" className="rounded-full border border-border bg-muted px-4 py-2 text-xs font-semibold text-foreground hover:bg-card">
              Usar a minha localização
            </button>
          ) : (
            <span className="text-xs text-muted-foreground">{coords ? `Pin: ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}` : "A aguardar permissão..."}</span>
          )}
        </div>

        <button
          onClick={onSave}
          disabled={saving}
          className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-sm hover:bg-primary/80 disabled:opacity-50"
        >
          {saving ? "A guardar…" : locations.length === 0 ? "Adicionar sede principal" : "Adicionar outra localização"}
        </button>
        {msg && <p className="rounded-xl border border-primary/20 bg-primary/10 px-3 py-2 text-xs font-medium text-primary">{msg}</p>}
        {error && <p className="rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">{error}</p>}
        <p className="text-xs leading-relaxed text-muted-foreground">
          Dica: pesquise o endereço no campo acima (Google Places) ou clique no mapa. O pin é usado para calcular distância em pesquisas “Perto de mim” — sem pin, a pesquisa usa bairro/cidade. Ao clicar “Usar a minha localização” dá consentimento explícito (LGPD).
        </p>
      </div>
    </div>
  );
}
