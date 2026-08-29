"use client";

import { useEffect, useRef, useState } from "react";
import { FaMapMarkerAlt } from "react-icons/fa";
import { FiExternalLink } from "react-icons/fi";
import { hasGoogleMapsKey, loadGoogleMaps } from "@/lib/google-maps";

type Props = {
  lat: number;
  lng: number;
  name: string;
  bairro?: string | null;
  district?: string | null;
  address?: string | null;
};

export function ProfileMap({ lat, lng, name, bairro, district, address }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const hasKey = hasGoogleMapsKey();

  const googleMapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;

  useEffect(() => {
    if (!hasKey || !mapRef.current) return;
    let cancelled = false;

    loadGoogleMaps()
      .then((g) => {
        if (cancelled || !mapRef.current) return;
        const map = new g.maps.Map(mapRef.current, {
          center: { lat, lng },
          zoom: 15,
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
        new g.maps.Marker({ position: { lat, lng }, map, title: name });
      })
      .catch((e: Error) => setError(e.message));

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasKey, lat, lng]);

  if (!hasKey) {
    return (
      <div className="flex size-full flex-col items-center justify-center bg-[linear-gradient(135deg,#F6F3EE_0%,#FFFFFF_100%)] p-4 text-center">
        <span className="flex size-9 items-center justify-center rounded-full bg-[#0B5E56]/10 text-[#0B5E56]">
          <FaMapMarkerAlt className="size-4" aria-hidden />
        </span>
        <p className="mt-2 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-[#0B5E56]">Mapa</p>
        {bairro && district ? <p className="mt-1 text-xs text-[#0F1A2E]/60">{bairro} · {district}</p> : null}
        <p className="text-xs text-[#0F1A2E]/40">{lat.toFixed(2)}, {lng.toFixed(2)}</p>
        <div className="mt-2 flex gap-2">
          <a
            href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=15/${lat}/${lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full bg-[#0B5E56] px-3 py-1.5 text-[11px] font-bold text-white hover:bg-[#0A4A44]"
          >
            Ver no mapa <FaMapMarkerAlt className="size-3" aria-hidden />
          </a>
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full border border-[#0B5E56]/30 bg-white px-3 py-1.5 text-[11px] font-bold text-[#0B5E56] hover:border-[#0B5E56]/60"
          >
            Abrir no Google Maps <FiExternalLink className="size-3" aria-hidden />
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="relative size-full">
      <div
        ref={mapRef}
        className="size-full bg-[#EDE9E1]"
        aria-label={`Mapa da localização de ${name}`}
      >
        {error ? <p className="p-4 text-xs text-[#7A1A0A]">{error}</p> : null}
      </div>
      <a
        href={googleMapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute right-2 bottom-2 flex items-center gap-1.5 rounded-full border border-[#0B5E56]/30 bg-white/95 px-3 py-1.5 text-[11px] font-bold text-[#0B5E56] shadow-[0_2px_8px_rgba(15,26,46,0.12)] backdrop-blur hover:border-[#0B5E56]/60"
      >
        Abrir no Google Maps <FiExternalLink className="size-3" aria-hidden />
      </a>
    </div>
  );
}
