"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { preRegisterCompany } from "@/app/actions/admin";

interface PlaceSuggestion {
  placeId: string;
  mainText: string;
  secondaryText: string;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function PreRegisterForm({ isAdmin }: { isAdmin: boolean }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [formattedAddress, setFormattedAddress] = useState("");
  const [googlePlaceId, setGooglePlaceId] = useState("");
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function searchPlaces(query: string) {
    if (!query.trim() || query.trim().length < 3) {
      setSuggestions([]);
      return;
    }
    try {
      const res = await fetch(`/api/places/autocomplete?input=${encodeURIComponent(query.trim())}`);
      const json = await res.json().catch(() => ({ success: false, data: [] }));
      if (json.success) {
        setSuggestions((json.data as PlaceSuggestion[]).slice(0, 5));
      } else {
        setSuggestions([]);
      }
    } catch {
      setSuggestions([]);
    }
  }

  function pickPlace(s: PlaceSuggestion) {
    setSuggestions([]);
    if (!name) setName(s.mainText);
    if (!slug) setSlug(slugify(s.mainText));
    setFormattedAddress(s.secondaryText || s.mainText);
    setGooglePlaceId(s.placeId);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await preRegisterCompany({
        name: name.trim(),
        slug: slug.trim() || slugify(name.trim()),
        contactName: contactName.trim(),
        contactPhone: contactPhone.trim(),
        contactEmail: contactEmail.trim() || undefined,
        googlePlaceId: googlePlaceId || undefined,
        formattedAddress: formattedAddress.trim() || undefined,
      });
      if (!res.success) {
        setError(res.error?.message ?? "Falha ao criar pré-registo");
      } else {
        setSuccess(`${name.trim()} registada. Notificação enviada por email, SMS e WhatsApp.`);
        setName("");
        setSlug("");
        setContactName("");
        setContactPhone("");
        setContactEmail("");
        setFormattedAddress("");
        setGooglePlaceId("");
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao criar pré-registo");
    } finally {
      setBusy(false);
    }
  }

  if (!isAdmin) {
    return <p className="text-sm text-muted-foreground">Só administradores podem criar pré-registos.</p>;
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error && <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>}
      {success && <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700">{success}</div>}

      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">Nome da empresa</label>
        <input
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (!slug || slug === slugify(name)) setSlug(slugify(e.target.value));
            void searchPlaces(e.target.value);
          }}
          placeholder="Pesquisar no Google Places ou escrever manualmente"
          className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
        />
        {suggestions.length > 0 && (
          <ul className="mt-1 overflow-hidden rounded-md border border-input bg-background">
            {suggestions.map((s) => (
              <li key={s.placeId}>
                <button
                  type="button"
                  onClick={() => pickPlace(s)}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-accent"
                >
                  <span className="block font-medium">{s.mainText}</span>
                  <span className="block text-xs text-muted-foreground">{s.secondaryText}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Slug (URL)</label>
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Morada (opcional)</label>
          <input
            value={formattedAddress}
            onChange={(e) => setFormattedAddress(e.target.value)}
            placeholder="Av. Julius Nyerere, Maputo"
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Nome do contacto *</label>
          <input
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
            required
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Telefone *</label>
          <input
            value={contactPhone}
            onChange={(e) => setContactPhone(e.target.value)}
            required
            placeholder="+258 82 000 0000"
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Email (opcional)</label>
          <input
            type="email"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            placeholder="contacto@empresa.co.mz"
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          />
        </div>
      </div>

      <Button type="submit" disabled={busy}>
        {busy ? "A registar…" : "Registar empresa"}
      </Button>
    </form>
  );
}
