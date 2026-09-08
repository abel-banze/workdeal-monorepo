"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createAdminInstitution, updateAdminInstitution } from "@/app/actions/admin";
import {
  INSTITUTION_TYPES,
  institutionTypeLabels,
  OPERATING_SCOPES,
  operatingScopeLabels,
  PROVINCES,
  type InstitutionOperatingScope,
  type InstitutionType,
} from "@workdeal/shared";

export interface InstitutionSocialLinks {
  facebook: string;
  instagram: string;
  linkedin: string;
  youtube: string;
  x: string;
  tiktok: string;
}

export interface InstitutionPrimaryContact {
  name: string;
  role: string;
  email: string;
  phone: string;
}

export interface InstitutionFormInitial {
  id: string;
  name: string;
  slug: string;
  organizationType: InstitutionType;
  status: "draft" | "active" | "suspended";
  legalName: string | null;
  website: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  province: string | null;
  district: string | null;
  city: string | null;
  address: string | null;
  foundedAt: string | null;
  logoUrl: string | null;
  coverUrl: string | null;
  tagline: string | null;
  description: string | null;
  latitude: number | null;
  longitude: number | null;
  // Campos de domínio institucional (Etapa 1)
  acronym: string | null;
  taxId: string | null;
  mission: string | null;
  vision: string | null;
  operatingScope: InstitutionOperatingScope | null;
  socialLinks: InstitutionSocialLinks | null;
  primaryContact: InstitutionPrimaryContact | null;
}

export interface InstitutionFormProps {
  mode: "create" | "edit";
  initial?: Partial<InstitutionFormInitial>;
}

const INPUT_CLS =
  "h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none transition focus:border-[#0B5E56] focus:ring-2 focus:ring-[#0B5E56]/15";
const TEXTAREA_CLS =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition focus:border-[#0B5E56] focus:ring-2 focus:ring-[#0B5E56]/15";

const EMPTY_SOCIAL: InstitutionSocialLinks = { facebook: "", instagram: "", linkedin: "", youtube: "", x: "", tiktok: "" };
const EMPTY_CONTACT: InstitutionPrimaryContact = { name: "", role: "", email: "", phone: "" };

function orNull(v: string): string | null {
  return v.trim() ? v.trim() : null;
}

export function InstitutionForm({ mode, initial = {} }: InstitutionFormProps) {
  const router = useRouter();
  const [state, setState] = useState({
    name: initial.name ?? "",
    slug: initial.slug ?? "",
    organizationType: initial.organizationType ?? "",
    status: initial.status ?? "draft",
    legalName: initial.legalName ?? "",
    tagline: initial.tagline ?? "",
    description: initial.description ?? "",
    website: initial.website ?? "",
    email: initial.email ?? "",
    phone: initial.phone ?? "",
    whatsapp: initial.whatsapp ?? "",
    province: initial.province ?? "",
    district: initial.district ?? "",
    city: initial.city ?? "",
    address: initial.address ?? "",
    foundedAt: initial.foundedAt ? String(initial.foundedAt).slice(0, 10) : "",
    logoUrl: initial.logoUrl ?? "",
    coverUrl: initial.coverUrl ?? "",
    latitude: initial.latitude != null ? String(initial.latitude) : "",
    longitude: initial.longitude != null ? String(initial.longitude) : "",
    // Campos de domínio institucional
    acronym: initial.acronym ?? "",
    taxId: initial.taxId ?? "",
    mission: initial.mission ?? "",
    vision: initial.vision ?? "",
    operatingScope: initial.operatingScope ?? "",
    social: { ...EMPTY_SOCIAL, ...(initial.socialLinks ?? {}) },
    primaryContact: { ...EMPTY_CONTACT, ...(initial.primaryContact ?? {}) },
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function generateSlug(value: string) {
    return value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\p{M}]/gu, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const socialLinksEntries = Object.entries(state.social).filter(([, v]) => v.trim());
      const socialLinks = socialLinksEntries.length > 0 ? Object.fromEntries(socialLinksEntries.map(([k, v]) => [k, v.trim()])) : null;
      const primaryContact = state.primaryContact.name.trim()
        ? {
            name: state.primaryContact.name.trim(),
            role: orNull(state.primaryContact.role),
            email: orNull(state.primaryContact.email),
            phone: orNull(state.primaryContact.phone),
          }
        : null;

      const input: Record<string, unknown> = {
        name: state.name.trim(),
        organizationType: state.organizationType,
        status: state.status,
        tagline: state.tagline.trim() || null,
        description: state.description.trim() || null,
        website: state.website.trim() || null,
        email: state.email.trim() || null,
        phone: state.phone.trim() || null,
        whatsapp: state.whatsapp.trim() || null,
        province: state.province || null,
        district: state.district || null,
        city: state.city || null,
        address: state.address || null,
        foundedAt: state.foundedAt ? new Date(state.foundedAt).toISOString() : null,
        logoUrl: state.logoUrl.trim() || null,
        coverUrl: state.coverUrl.trim() || null,
        latitude: state.latitude ? Number(state.latitude) : null,
        longitude: state.longitude ? Number(state.longitude) : null,
        acronym: orNull(state.acronym),
        taxId: state.taxId.trim() ? state.taxId.trim() : null,
        mission: orNull(state.mission),
        vision: orNull(state.vision),
        operatingScope: (state.operatingScope as InstitutionOperatingScope | "") || null,
        socialLinks,
        primaryContact,
      };
      if (mode === "create") {
        input.slug = state.slug.trim() || generateSlug(state.name.trim());
        const res = await createAdminInstitution(input);
        if (!res.success) throw new Error(res.error?.message ?? "Falha ao criar instituição");
        router.push("/dashboard/institutions");
        router.refresh();
      } else {
        const res = await updateAdminInstitution(initial.id!, input);
        if (!res.success) throw new Error(res.error?.message ?? "Falha ao actualizar instituição");
        router.push("/dashboard/institutions");
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao guardar instituição");
    } finally {
      setLoading(false);
    }
  }

  const set = (key: keyof typeof state) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setState((s) => ({ ...s, [key]: e.target.value }));
  const setSocial = (key: keyof InstitutionSocialLinks) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setState((s) => ({ ...s, social: { ...s.social, [key]: e.target.value } }));
  const setContact = (key: keyof InstitutionPrimaryContact) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setState((s) => ({ ...s, primaryContact: { ...s.primaryContact, [key]: e.target.value } }));

  return (
    <form onSubmit={onSubmit} className="max-w-2xl space-y-7">
      {/* Identidade */}
      <section className="space-y-4">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#0B5E56]">Identidade</p>
        <div className="space-y-1.5">
          <label htmlFor="name" className="text-sm font-medium">Nome da instituição *</label>
          <input
            id="name"
            required
            value={state.name}
            onChange={(e) => {
              const v = e.target.value;
              setState((s) => ({ ...s, name: v, ...(mode === "create" && !state.slug ? { slug: generateSlug(v) } : {}) }));
            }}
            placeholder="Ex: Associação Comercial de Maputo"
            className={INPUT_CLS}
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="slug" className="text-sm font-medium">Slug</label>
          <input
            id="slug"
            value={state.slug}
            onChange={set("slug")}
            placeholder="ex: associacao-comercial-maputo"
            className={INPUT_CLS}
            pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$"
          />
          <p className="text-xs text-muted-foreground">Se vazio, é gerado a partir do nome. Minúsculas, números e hífens.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="organizationType" className="text-sm font-medium">Tipo de instituição *</label>
            <select id="organizationType" required value={state.organizationType} onChange={set("organizationType")} className={INPUT_CLS}>
              <option value="" disabled>Seleccionar tipo</option>
              {INSTITUTION_TYPES.map((t) => (
                <option key={t} value={t}>{institutionTypeLabels[t]}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="status" className="text-sm font-medium">Estado</label>
            <select id="status" value={state.status} onChange={set("status")} className={INPUT_CLS}>
              <option value="draft">Rascunho</option>
              <option value="active">Activa</option>
              {mode === "edit" && <option value="suspended">Suspensa</option>}
            </select>
            <p className="text-xs text-muted-foreground">{mode === "create" ? "Criada em rascunho, só publicada quando activa." : "Suspender só faz sentido para uma instituição já criada."}</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <label htmlFor="acronym" className="text-sm font-medium">Acrónimo</label>
            <input id="acronym" value={state.acronym} onChange={set("acronym")} placeholder="ex: ACM" maxLength={24} className={INPUT_CLS} />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="taxId" className="text-sm font-medium">NUIT</label>
            <input id="taxId" value={state.taxId} onChange={set("taxId")} placeholder="9 dígitos" maxLength={9} pattern="[0-9]{9}" inputMode="numeric" className={INPUT_CLS} />
            <p className="text-xs text-muted-foreground">Identificação fiscal — 9 dígitos.</p>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="operatingScope" className="text-sm font-medium">Âmbito de actuação</label>
            <select id="operatingScope" value={state.operatingScope} onChange={set("operatingScope")} className={INPUT_CLS}>
              <option value="">—</option>
              {OPERATING_SCOPES.map((s) => (
                <option key={s} value={s}>{operatingScopeLabels[s]}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="legalName" className="text-sm font-medium">Nome legal</label>
            <input id="legalName" value={state.legalName} onChange={set("legalName")} placeholder="Nome de registo oficial" className={INPUT_CLS} />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="foundedAt" className="text-sm font-medium">Data de fundação</label>
            <input id="foundedAt" type="date" value={state.foundedAt} onChange={set("foundedAt")} className={INPUT_CLS} />
          </div>
        </div>
      </section>

      {/* Missão e visão */}
      <section className="space-y-4">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#0B5E56]">Missão e visão</p>
        <div className="space-y-1.5">
          <label htmlFor="mission" className="text-sm font-medium">Missão</label>
          <textarea id="mission" value={state.mission} onChange={set("mission")} rows={3} maxLength={2000} placeholder="Propósito da instituição…" className={TEXTAREA_CLS} />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="vision" className="text-sm font-medium">Visão</label>
          <textarea id="vision" value={state.vision} onChange={set("vision")} rows={3} maxLength={2000} placeholder="O que a instituição aspira alcançar…" className={TEXTAREA_CLS} />
        </div>
      </section>

      {/* Perfil público */}
      <section className="space-y-4">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#0B5E56]">Perfil público</p>
        <div className="space-y-1.5">
          <label htmlFor="tagline" className="text-sm font-medium">Sub-título</label>
          <input id="tagline" value={state.tagline} onChange={set("tagline")} placeholder="Breve descrição (máx. 160)" maxLength={160} className={INPUT_CLS} />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="description" className="text-sm font-medium">Descrição</label>
          <textarea id="description" value={state.description} onChange={set("description")} rows={5} placeholder="Missão, âmbito, membros…" className={TEXTAREA_CLS} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="logoUrl" className="text-sm font-medium">Logo (URL)</label>
            <input id="logoUrl" value={state.logoUrl} onChange={set("logoUrl")} placeholder="https://…" className={INPUT_CLS} />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="coverUrl" className="text-sm font-medium">Capa (URL)</label>
            <input id="coverUrl" value={state.coverUrl} onChange={set("coverUrl")} placeholder="https://…" className={INPUT_CLS} />
          </div>
        </div>
      </section>

      {/* Contactos */}
      <section className="space-y-4">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#0B5E56]">Contactos</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="website" className="text-sm font-medium">Website</label>
            <input id="website" value={state.website} onChange={set("website")} placeholder="https://" className={INPUT_CLS} />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-sm font-medium">Email</label>
            <input id="email" type="email" value={state.email} onChange={set("email")} placeholder="contacto@…" className={INPUT_CLS} />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="phone" className="text-sm font-medium">Telefone</label>
            <input id="phone" value={state.phone} onChange={set("phone")} placeholder="+258…" className={INPUT_CLS} />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="whatsapp" className="text-sm font-medium">WhatsApp</label>
            <input id="whatsapp" value={state.whatsapp} onChange={set("whatsapp")} placeholder="+258…" className={INPUT_CLS} />
          </div>
        </div>
      </section>

      {/* Contacto principal */}
      <section className="space-y-4">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#0B5E56]">Contacto principal</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="contactName" className="text-sm font-medium">Nome</label>
            <input id="contactName" value={state.primaryContact.name} onChange={setContact("name")} placeholder="Contacto de referência" className={INPUT_CLS} />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="contactRole" className="text-sm font-medium">Cargo</label>
            <input id="contactRole" value={state.primaryContact.role} onChange={setContact("role")} placeholder="ex: Secretário-Geral" className={INPUT_CLS} />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="contactEmail" className="text-sm font-medium">Email</label>
            <input id="contactEmail" type="email" value={state.primaryContact.email} onChange={setContact("email")} placeholder="contacto@…" className={INPUT_CLS} />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="contactPhone" className="text-sm font-medium">Telefone</label>
            <input id="contactPhone" value={state.primaryContact.phone} onChange={setContact("phone")} placeholder="+258…" className={INPUT_CLS} />
          </div>
        </div>
      </section>

      {/* Redes sociais */}
      <section className="space-y-4">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#0B5E56]">Redes sociais</p>
        <div className="grid gap-4 sm:grid-cols-2">
          {([
            ["facebook", "Facebook"],
            ["instagram", "Instagram"],
            ["linkedin", "LinkedIn"],
            ["youtube", "YouTube"],
            ["x", "X (Twitter)"],
            ["tiktok", "TikTok"],
          ] as const).map(([key, label]) => (
            <div key={key} className="space-y-1.5">
              <label htmlFor={`social-${key}`} className="text-sm font-medium">{label}</label>
              <input id={`social-${key}`} value={state.social[key]} onChange={setSocial(key)} placeholder="https://…" className={INPUT_CLS} />
            </div>
          ))}
        </div>
      </section>

      {/* Localização */}
      <section className="space-y-4">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#0B5E56]">Localização</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="province" className="text-sm font-medium">Província</label>
            <select id="province" value={state.province} onChange={set("province")} className={INPUT_CLS}>
              <option value="">—</option>
              {PROVINCES.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="district" className="text-sm font-medium">Distrito</label>
            <input id="district" value={state.district} onChange={set("district")} className={INPUT_CLS} />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="city" className="text-sm font-medium">Cidade</label>
            <input id="city" value={state.city} onChange={set("city")} className={INPUT_CLS} />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="address" className="text-sm font-medium">Morada</label>
            <input id="address" value={state.address} onChange={set("address")} className={INPUT_CLS} />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="latitude" className="text-sm font-medium">Latitude</label>
            <input id="latitude" value={state.latitude} onChange={set("latitude")} placeholder="-25.9664" className={INPUT_CLS} />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="longitude" className="text-sm font-medium">Longitude</label>
            <input id="longitude" value={state.longitude} onChange={set("longitude")} placeholder="32.5732" className={INPUT_CLS} />
          </div>
        </div>
      </section>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>
      )}

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={loading}>
          {loading ? "A guardar…" : mode === "create" ? "Criar instituição" : "Guardar alterações"}
        </Button>
        <Button variant="outline" type="button" onClick={() => router.push("/dashboard/institutions")}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}