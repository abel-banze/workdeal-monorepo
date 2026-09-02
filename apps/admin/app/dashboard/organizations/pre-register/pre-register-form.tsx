"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { preRegisterCompany, updatePreRegister } from "@/app/actions/admin";

interface PlaceSuggestion {
  placeId: string;
  mainText: string;
  secondaryText: string;
}

export interface CategoryOption {
  id: string;
  slug: string;
  name: string;
}

export interface PreRegisterFormValues {
  name: string;
  slug: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  formattedAddress: string;
  googlePlaceId: string;
  logoUrl: string;
  categorySlugs: string[];
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

interface Props {
  isAdmin: boolean;
  categories: CategoryOption[];
  // Em modo edição, os valores iniciais preenchem o formulário
  initial?: Partial<PreRegisterFormValues> | null;
  id?: string;
}

export function PreRegisterForm({ isAdmin, categories, initial, id }: Props) {
  const router = useRouter();
  const isEdit = Boolean(id);
  const [name, setName] = useState(initial?.name ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [contactName, setContactName] = useState(initial?.contactName ?? "");
  const [contactPhone, setContactPhone] = useState(initial?.contactPhone ?? "");
  const [contactEmail, setContactEmail] = useState(initial?.contactEmail ?? "");
  const [formattedAddress, setFormattedAddress] = useState(initial?.formattedAddress ?? "");
  const [googlePlaceId, setGooglePlaceId] = useState(initial?.googlePlaceId ?? "");
  const [logoUrl, setLogoUrl] = useState(initial?.logoUrl ?? "");
  const [categorySlugs, setCategorySlugs] = useState<string[]>(initial?.categorySlugs ?? []);
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

  // Ao escolher uma sugestão do Google Places, o nome passa a ser o do Google Places.
  function pickPlace(s: PlaceSuggestion) {
    setSuggestions([]);
    setName(s.mainText);
    setSlug(slugify(s.mainText));
    setFormattedAddress(s.secondaryText || s.mainText);
    setGooglePlaceId(s.placeId);
  }

  function toggleCategory(slug: string) {
    setCategorySlugs((prev) => (prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const payload = {
        name: name.trim(),
        slug: slug.trim() || slugify(name.trim()),
        contactName: contactName.trim(),
        contactPhone: contactPhone.trim(),
        contactEmail: contactEmail.trim() || undefined,
        googlePlaceId: googlePlaceId || undefined,
        formattedAddress: formattedAddress.trim() || undefined,
        logoUrl: logoUrl.trim() || undefined,
        categorySlugs: categorySlugs.length > 0 ? categorySlugs : undefined,
      };
      if (isEdit) {
        const res = await updatePreRegister(id!, payload);
        if (!res.success) {
          setError(res.error?.message ?? "Falha ao actualizar pré-registo");
        } else {
          setSuccess("Pré-registo actualizado.");
          router.refresh();
        }
      } else {
        const res = await preRegisterCompany(payload);
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
          setLogoUrl("");
          setCategorySlugs([]);
          router.refresh();
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao guardar pré-registo");
    } finally {
      setBusy(false);
    }
  }

  if (!isAdmin) {
    return <p className="text-sm text-muted-foreground">Só administradores podem {isEdit ? "editar" : "criar"} pré-registos.</p>;
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error && <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>}
      {success && <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700">{success}</div>}

      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">Nome da empresa *</label>
        <input
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (isEdit) return;
            if (!slug || slug === slugify(name)) setSlug(slugify(e.target.value));
            void searchPlaces(e.target.value);
          }}
          placeholder="Pesquisar no Google Places ou escrever manualmente"
          required
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
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Slug / URL</label>
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

      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">Logo (URL, opcional)</label>
        <input
          value={logoUrl}
          onChange={(e) => setLogoUrl(e.target.value)}
          placeholder="https://…/logo.png"
          className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
        />
        {logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt="Pré-visualização do logo" className="mt-2 h-12 w-12 rounded object-cover" />
        )}
      </div>

      {categories.length > 0 && (
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Categorias</label>
          <div className="flex max-h-40 flex-wrap gap-1.5 overflow-y-auto rounded-md border border-input p-2">
            {categories.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => toggleCategory(c.slug)}
                className={`rounded-full border px-2.5 py-1 text-xs ${categorySlugs.includes(c.slug) ? "border-primary bg-primary text-primary-foreground" : "border-input bg-background hover:bg-accent"}`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>
      )}

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

      <div className="flex gap-2">
        <Button type="submit" disabled={busy}>
          {busy ? "A guardar…" : isEdit ? "Guardar alterações" : "Registar empresa"}
        </Button>
        {isEdit && (
          <Button type="button" variant="outline" onClick={() => router.push("/dashboard/organizations/pre-register")}>
            Cancelar
          </Button>
        )}
      </div>
    </form>
  );
}
