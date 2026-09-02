"use client";

import { useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { preRegisterCompany, updatePreRegister, uploadPreRegisterLogo } from "@/app/actions/admin";
import {
  Combobox,
  ComboboxChips,
  ComboboxChip,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxEmpty,
  useComboboxAnchor,
} from "@workspace/ui/components/combobox";
import { ImagePlusIcon, TrashIcon, LoaderCircleIcon } from "lucide-react";

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

const MAX_LOGO_MB = 5;

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

  // Logo — upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  // Categorias — combobox
  const catAnchor = useComboboxAnchor();
  const [catQuery, setCatQuery] = useState("");

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

  async function handleLogoUpload(file: File) {
    setUploadError(null);
    if (!file.type.startsWith("image/")) {
      setUploadError("O ficheiro tem de ser uma imagem (PNG, JPG, SVG…).");
      return;
    }
    if (file.size > MAX_LOGO_MB * 1024 * 1024) {
      setUploadError(`A imagem excede ${MAX_LOGO_MB}MB. Comprime o ficheiro e tenta de novo.`);
      return;
    }
    setUploadBusy(true);
    try {
      const res = await uploadPreRegisterLogo(file);
      if (!res.success) {
        setUploadError(res.error?.message ?? "Falha ao carregar o logo");
        return;
      }
      setLogoUrl(res.data.url);
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Falha ao carregar o logo");
    } finally {
      setUploadBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void handleLogoUpload(file);
  }

  const removeLogo = useCallback(() => {
    setLogoUrl("");
    setUploadError(null);
  }, []);

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

  const fieldCls = "h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      {error && <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>}
      {success && <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700">{success}</div>}

      {/* Identidade + Contacto */}
      <section className="space-y-4">
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
            className={fieldCls}
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
            <input value={slug} onChange={(e) => setSlug(e.target.value)} className={fieldCls} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Morada (opcional)</label>
            <input
              value={formattedAddress}
              onChange={(e) => setFormattedAddress(e.target.value)}
              placeholder="Av. Julius Nyerere, Maputo"
              className={fieldCls}
            />
          </div>
        </div>
      </section>

      {/* Apresentação: logo + categorias */}
      <section className="space-y-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Logo</label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleLogoUpload(file);
            }}
          />
          <div
            role="button"
            tabIndex={0}
            aria-label="Carregar logo da empresa"
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={onDrop}
            className={`flex items-center gap-4 rounded-lg border border-dashed p-4 transition ${
              dragActive ? "border-ring bg-accent/50" : "border-input hover:bg-accent/40"
            } ${logoUrl ? "" : "cursor-pointer"}`}
          >
            <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-md border border-input bg-muted">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt="Pré-visualização do logo" className="size-full object-cover" />
              ) : uploadBusy ? (
                <LoaderCircleIcon className="size-5 animate-spin text-muted-foreground" />
              ) : (
                <ImagePlusIcon className="size-5 text-muted-foreground" />
              )}
            </div>
            <div className="min-w-0 flex-1 text-sm">
              {logoUrl ? (
                <p className="font-medium">Logo carregado</p>
              ) : (
                <p className="font-medium">Arrasta o logo ou clica para escolher</p>
              )}
              <p className="text-xs text-muted-foreground">Imagem até {MAX_LOGO_MB}MB · PNG, JPG ou SVG</p>
              {uploadBusy && <p className="mt-0.5 text-xs text-muted-foreground">A carregar…</p>}
              {uploadError && <p className="mt-0.5 text-xs text-destructive">{uploadError}</p>}
            </div>
            {logoUrl && (
              <Button type="button" variant="ghost" size="icon" onClick={removeLogo} aria-label="Remover logo">
                <TrashIcon className="size-4" />
              </Button>
            )}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Categorias</label>
          <Combobox
            multiple
            value={categorySlugs}
            onValueChange={(val) => setCategorySlugs((val as string[]) ?? [])}
            onInputValueChange={setCatQuery}
          >
            <ComboboxChips
              ref={catAnchor}
              className="min-h-9 w-full rounded-md border border-input bg-background px-2 py-1 text-sm transition focus-within:border-ring focus-within:bg-background focus-within:ring-2 focus-within:ring-ring/50"
            >
              {categorySlugs.map((slug) => {
                const cat = categories.find((c) => c.slug === slug);
                return (
                  <ComboboxChip key={slug} className="bg-primary text-primary-foreground">
                    {cat?.name ?? slug}
                  </ComboboxChip>
                );
              })}
              <ComboboxChipsInput
                placeholder={categorySlugs.length === 0 ? "Procurar categorias…" : "Adicionar…"}
                className="placeholder:text-muted-foreground"
              />
            </ComboboxChips>
            <ComboboxContent anchor={catAnchor} className="z-50">
              <ComboboxList>
                {categories
                  .filter((c) => {
                    if (!catQuery) return true;
                    return c.name.toLowerCase().includes(catQuery.toLowerCase());
                  })
                  .map((c) => (
                    <ComboboxItem key={c.id} value={c.slug}>
                      {c.name}
                    </ComboboxItem>
                  ))}
              </ComboboxList>
              <ComboboxEmpty className="px-3 py-6 text-center text-sm text-muted-foreground">
                Nenhuma categoria encontrada.
              </ComboboxEmpty>
            </ComboboxContent>
          </Combobox>
          <p className="mt-1 text-xs text-muted-foreground">Selecciona uma ou mais categorias · define onde a empresa aparece no directório.</p>
        </div>
      </section>

      {/* Contacto */}
      <section className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Nome do contacto *</label>
            <input value={contactName} onChange={(e) => setContactName(e.target.value)} required className={fieldCls} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Telefone *</label>
            <input
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              required
              placeholder="+258 82 000 0000"
              className={fieldCls}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Email (opcional)</label>
            <input
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="contacto@empresa.co.mz"
              className={fieldCls}
            />
          </div>
        </div>
      </section>

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
