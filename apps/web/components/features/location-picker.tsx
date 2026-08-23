"use client";

import { useEffect, useRef, useState } from "react";
import { hasGoogleMapsKey, loadGoogleMaps, reverseGeocode } from "@/lib/google-maps";

type Props = {
  initialLat?: number | null;
  initialLng?: number | null;
  onPick: (coords: { lat: number; lng: number }) => void;
  onAddressChange?: (address: string | null) => void;
};

export function LocationPicker({ initialLat, initialLng, onPick, onAddressChange }: Props) {
  const [lat, setLat] = useState<number | null>(initialLat ?? null);
  const [lng, setLng] = useState<number | null>(initialLng ?? null);
  const [address, setAddress] = useState<string | null>(null);
  const [loadingAddr, setLoadingAddr] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const mapRefInstance = useRef<google.maps.Map | null>(null);
  const hasKey = hasGoogleMapsKey();

  // sync externals
  useEffect(() => {
    setLat(initialLat ?? null);
    setLng(initialLng ?? null);
  }, [initialLat, initialLng]);

  // reverse geocode on move
  async function updateAddress(nextLat: number, nextLng: number) {
    setLoadingAddr(true);
    const addr = await reverseGeocode(nextLat, nextLng);
    setAddress(addr);
    onAddressChange?.(addr);
    setLoadingAddr(false);
  }

  useEffect(() => {
    if (!hasKey || !mapRef.current) return;
    let cancelled = false;

    loadGoogleMaps()
      .then((g) => {
        if (cancelled || !mapRef.current) return;
        const center = { lat: lat ?? -25.95, lng: lng ?? 32.58 };
        const map = new g.maps.Map(mapRef.current, {
          center,
          zoom: lat != null && lng != null ? 14 : 5,
          disableDefaultUI: false,
          zoomControl: true,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
          styles: [
            { featureType: "poi", stylers: [{ visibility: "off" }] },
            { featureType: "transit", stylers: [{ visibility: "off" }] },
          ],
        });
        mapRefInstance.current = map;

        const marker = new g.maps.Marker({
          position: center,
          map,
          draggable: true,
          title: "Arraste para ajustar",
        });
        markerRef.current = marker;

        // Places Autocomplete no input
        if (inputRef.current) {
          const autocomplete = new g.maps.places.Autocomplete(inputRef.current, {
            fields: ["geometry", "formatted_address", "name"],
            types: ["geocode"],
          });
          autocomplete.addListener("place_changed", () => {
            const place = autocomplete.getPlace();
            const loc = place.geometry?.location;
            if (!loc) return;
            const next = { lat: loc.lat(), lng: loc.lng() };
            marker.setPosition(next);
            map.panTo(next);
            map.setZoom(15);
            setLat(next.lat);
            setLng(next.lng);
            onPick(next);
            const fmt = place.formatted_address ?? place.name ?? null;
            setAddress(fmt);
            onAddressChange?.(fmt ?? null);
            setError(null);
          });
        }

        marker.addListener("dragend", () => {
          const pos = marker.getPosition();
          if (!pos) return;
          const next = { lat: pos.lat(), lng: pos.lng() };
          setLat(next.lat);
          setLng(next.lng);
          onPick(next);
          updateAddress(next.lat, next.lng);
        });

        map.addListener("click", (e: google.maps.MapMouseEvent) => {
          const ll = e.latLng;
          if (!ll) return;
          const next = { lat: ll.lat(), lng: ll.lng() };
          marker.setPosition(next);
          setLat(next.lat);
          setLng(next.lng);
          onPick(next);
          updateAddress(next.lat, next.lng);
        });

        // init address if coords exist
        if (lat != null && lng != null) updateAddress(lat, lng);
      })
      .catch((e: Error) => setError(e.message));

    return () => {
      cancelled = true;
    };
  }, [hasKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Quando lat/lng mudam via props, move marker/map
  useEffect(() => {
    if (!markerRef.current || !mapRefInstance.current || lat == null || lng == null) return;
    const pos = { lat, lng };
    markerRef.current.setPosition(pos);
    mapRefInstance.current.panTo(pos);
  }, [lat, lng]);

  function useMyLocation() {
    if (!navigator.geolocation) {
      setError("Geolocalização não suportada neste browser.");
      return;
    }
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const next = { lat: p.coords.latitude, lng: p.coords.longitude };
        setLat(next.lat);
        setLng(next.lng);
        onPick(next);
        updateAddress(next.lat, next.lng);
        if (mapRefInstance.current && markerRef.current) {
          markerRef.current.setPosition(next);
          mapRefInstance.current.panTo(next);
          mapRefInstance.current.setZoom(14);
        }
      },
      () => setError("Não foi possível obter a localização. Verifique permissões."),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }

  if (!hasKey) {
    return (
      <div className="space-y-3 rounded-2xl border border-[#D9D2C2] bg-[#F6F3EE] p-4">
        <p className="text-xs font-semibold tracking-wide text-[#0F1A2E]/60">
          Mapa Google indisponível — defina <code className="rounded bg-white border border-[#D9D2C2] px-1 py-0.5 text-xs">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> em <code className="bg-white px-1">apps/web/.env.local</code> para activar Places & Geocoding. Fallback manual activo.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-bold tracking-[0.07em] text-[#0F1A2E]/70 uppercase">Latitude</label>
            <input
              type="number"
              step="0.000001"
              value={lat ?? ""}
              onChange={(e) => {
                const v = e.target.value ? parseFloat(e.target.value) : null;
                setLat(v);
                if (v != null && lng != null) onPick({ lat: v, lng });
              }}
              placeholder="-25.959"
              className="w-full rounded-xl border border-[#D9D2C2] bg-white px-3 py-2.5 text-sm text-[#0F1A2E] outline-none focus:border-[#0B5E56] focus:ring-2 focus:ring-[#0B5E56]/15"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold tracking-[0.07em] text-[#0F1A2E]/70 uppercase">Longitude</label>
            <input
              type="number"
              step="0.000001"
              value={lng ?? ""}
              onChange={(e) => {
                const v = e.target.value ? parseFloat(e.target.value) : null;
                setLng(v);
                if (lat != null && v != null) onPick({ lat: lat!, lng: v });
              }}
              placeholder="32.583"
              className="w-full rounded-xl border border-[#D9D2C2] bg-white px-3 py-2.5 text-sm text-[#0F1A2E] outline-none focus:border-[#0B5E56] focus:ring-2 focus:ring-[#0B5E56]/15"
            />
          </div>
        </div>
        <p className="text-xs text-[#0F1A2E]/45">
          Dica: abra{" "}
          <a href="https://www.openstreetmap.org" target="_blank" rel="noreferrer" className="font-semibold text-[#0B5E56] underline underline-offset-4">
            openstreetmap.org
          </a>{" "}
          → clique direito → Mostrar endereço → copie coordenadas.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Places search */}
      <label className="flex items-center gap-2 rounded-xl border border-[#D9D2C2] bg-white px-3 py-2.5 shadow-sm focus-within:border-[#0B5E56] focus-within:ring-2 focus-within:ring-[#0B5E56]/15">
        <span className="shrink-0 text-[#0F1A2E]/40" aria-hidden>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" />
          </svg>
        </span>
        <input
          ref={inputRef}
          placeholder="Pesquisar endereço — ex: Av. Julius Nyerere, Maputo"
          aria-label="Pesquisar endereço no Google Maps"
          className="w-full bg-transparent text-sm placeholder:text-[#0F1A2E]/40 focus:outline-none"
        />
        <button
          type="button"
          onClick={useMyLocation}
          className="shrink-0 rounded-full border border-[#D9D2C2] bg-[#F6F3EE] px-3 py-1 text-xs font-semibold text-[#0F1A2E] hover:bg-white"
        >
          Usar a minha localização
        </button>
      </label>

      <div
        ref={mapRef}
        className="h-[320px] w-full overflow-hidden rounded-[16px] border border-[#D9D2C2] bg-[#EDE9E1] shadow-[0_8px_24px_rgba(15,26,46,0.06)]"
        aria-label="Mapa Google Maps — arraste o marcador ou clique no mapa"
      />

      {error && <p className="rounded-xl border border-[#FF3B1F]/20 bg-[#FF3B1F]/10 px-3 py-2 text-xs font-medium text-[#7A1A0A]">{error}</p>}

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#D9D2C2] bg-[#F6F3EE] px-3 py-2">
        <p className="text-xs font-medium text-[#0F1A2E]/70">
          {lat != null && lng != null ? (
            <>
              <span className="font-bold text-[#0F1A2E]">{lat.toFixed(5)}, {lng.toFixed(5)}</span>
              {address ? <span className="text-[#0F1A2E]/50"> • {loadingAddr ? "a obter endereço…" : address}</span> : null}
            </>
          ) : (
            <span className="text-[#0F1A2E]/50">Clique no mapa ou arraste o marcador para definir a localização exacta.</span>
          )}
        </p>
        <span className="rounded-full bg-white border border-[#D9D2C2] px-2.5 py-1 text-[11px] font-semibold text-[#0F1A2E]/60">Privacidade “zona” mostra só bairro até contacto aceite</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-bold tracking-[0.07em] text-[#0F1A2E]/70 uppercase">Latitude</label>
          <input value={lat ?? ""} readOnly className="w-full rounded-xl border border-[#D9D2C2] bg-white px-3 py-2.5 text-sm text-[#0F1A2E]/70" placeholder="—" />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-bold tracking-[0.07em] text-[#0F1A2E]/70 uppercase">Longitude</label>
          <input value={lng ?? ""} readOnly className="w-full rounded-xl border border-[#D9D2C2] bg-white px-3 py-2.5 text-sm text-[#0F1A2E]/70" placeholder="—" />
        </div>
      </div>
    </div>
  );
}
