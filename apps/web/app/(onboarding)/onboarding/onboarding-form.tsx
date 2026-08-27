"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { requestVerification } from "@/app/actions/verifications";
import { completeOnboardingAction } from "@/app/actions/onboarding";
import { authClient } from "@/lib/auth-client";
import { classifyCompanySize, sizeLabel, sizeDescription, normalizeBusinessHours } from "@workdeal/shared";
import type { BusinessHours, PlaceSuggestion } from "@workdeal/shared";
import type { LegalForm } from "@workdeal/shared/lib/company-size";
import type { ContactChannel } from "@workdeal/shared/lib/phone";
import { getVerifiedContacts } from "@/app/actions/otp";
import { placesAutocompleteAction, placesDetailsAction } from "@/app/actions/places";
import { LocationPicker } from "@/components/features/location-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import {
  Combobox,
  ComboboxChips,
  ComboboxChip,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  useComboboxAnchor,
} from "@workspace/ui/components/combobox";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@workspace/ui/components/input-otp";
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@workspace/ui/components/input-group";
import { Input } from "@workspace/ui/components/input";
import { Phone, Clock } from "lucide-react";

type Category = { id: string; name: string; slug: string };

const DRAFT_KEY = "wd:onb:draft:v1";

const PROVINCES = ["Cidade de Maputo", "Matola", "Gaza", "Inhambane", "Sofala", "Manica", "Tete", "Zambézia", "Nampula", "Niassa", "Cabo Delgado"] as const;
const LEGAL_FORMS = [
  { value: "unipessoal", label: "Empresa em Nome Individual" },
  { value: "su", label: "Sociedade Unipessoal (SU)" },
  { value: "lda", label: "Sociedade por Quotas (Lda)" },
  { value: "cooperativa", label: "Cooperativa" },
  { value: "outro", label: "Outro" },
] as const;
const BUSINESS_HOURS_OPTIONS = ["Manhã (08–12)", "Tarde (13–17)", "Comercial (08–17)", "Alargado (08–20)", "24h", "Sob marcação"] as const;

// Workdeal tokens — compact (inputs reduzidos)
const inputCls =
  "w-full rounded-lg border border-[#D9D2C2] bg-[#F6F3EE] px-3 py-2 text-[13px] leading-none text-[#0F1A2E] placeholder:text-[#0F1A2E]/35 outline-none transition focus:border-[#0B5E56] focus:bg-white focus:ring-2 focus:ring-[#0B5E56]/15";
const textareaCls =
  "w-full rounded-lg border border-[#D9D2C2] bg-[#F6F3EE] px-3 py-2 text-[13px] text-[#0F1A2E] placeholder:text-[#0F1A2E]/35 outline-none transition focus:border-[#0B5E56] focus:bg-white focus:ring-2 focus:ring-[#0B5E56]/15";
const selectCls =
  "w-full rounded-lg border border-[#D9D2C2] bg-[#F6F3EE] px-3 py-2 text-[13px] text-[#0F1A2E] outline-none transition focus:border-[#0B5E56] focus:bg-white focus:ring-2 focus:ring-[#0B5E56]/15";
const labelCls = "text-xs font-bold tracking-[0.07em] text-[#0F1A2E]/70 uppercase";
const errorCls = "rounded-xl border border-[#FF3B1F]/20 bg-[#FF3B1F]/10 px-3.5 py-2.5 text-sm font-medium text-[#7A1A0A]";
const fieldErrCls = "text-xs font-medium text-[#7A1A0A]";

function formatTimestamp(d: Date) {
  return `Verificado às ${d.toLocaleTimeString("pt-MZ", { hour: "2-digit", minute: "2-digit" })} — ${d.toLocaleDateString("pt-MZ")}`;
}

// Campos inteiros aceitam formatação com espaços/pontos ("4 800 000") — strip
// de tudo excepto dígitos antes de parsear, senão parseInt devolve 4.
function parseDigits(value: string): number | null {
  const digits = value.replace(/\D/g, "");
  if (!digits) return null;
  const n = parseInt(digits, 10);
  return Number.isFinite(n) ? n : null;
}

export function OnboardingForm({
  categories,
  tags,
  userName,
  userEmail: _userEmail,
  initialOrganizationId,
  initialOrganizationName,
}: {
  categories: Category[];
  tags: { slug: string; name: string }[];
  userName: string;
  userEmail: string;
  initialOrganizationId: string | null;
  initialOrganizationName: string | null;
}) {
  const router = useRouter();
  const [organizationId, setOrganizationId] = useState<string | null>(initialOrganizationId);

  // core — se já existe organização (ex: Codebaz), pré-preenche com nome da empresa, não com dados pessoais
  const [profileName, setProfileName] = useState(initialOrganizationName ?? userName);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [tagline, setTagline] = useState("");
  const [description, setDescription] = useState("");
  const [nuit, setNuit] = useState("");
  const [legalForm, setLegalForm] = useState<LegalForm | "">("");
  const [foundedYear, setFoundedYear] = useState("");
  const [workers, setWorkers] = useState("");
  const [turnover, setTurnover] = useState("");
  const [capital, setCapital] = useState("");
  const [alvara, setAlvara] = useState("");
  const [licenses, setLicenses] = useState("");

  const [selectedCats, setSelectedCats] = useState<string[]>([]);
  const [province, setProvince] = useState("");
  const [district, setDistrict] = useState("");
  const [bairro, setBairro] = useState("");
  const [interestTags, setInterestTags] = useState<string[]>([]);
  const [website, setWebsite] = useState("");

  // Localização Google — tudo opcional (skip = deixar em branco)
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [googlePlaceId, setGooglePlaceId] = useState<string | null>(null);
  const [formattedAddress, setFormattedAddress] = useState<string | null>(null);
  const [placeQuery, setPlaceQuery] = useState("");
  const [placeSuggestions, setPlaceSuggestions] = useState<PlaceSuggestion[]>([]);
  // idle | loading | empty | error — alimenta o feedback visual sob o input
  const [placeStatus, setPlaceStatus] = useState<"idle" | "loading" | "empty" | "error">("idle");
  const suppressPlaceSearchRef = useRef(false);
  const [pickedPlaceLabel, setPickedPlaceLabel] = useState<string | null>(null);

  // Horários — formato canónico (Google periods); presets convertem via normalizeBusinessHours
  const [bhPreset, setBhPreset] = useState("");
  const [businessHours, setBusinessHours] = useState<BusinessHours | null>(null);
  const catAnchor = useComboboxAnchor();
  const [catQuery, setCatQuery] = useState("");

  // contacts + OTP
  const [whatsapp, setWhatsapp] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  const [whatsappOtp, setWhatsappOtp] = useState<string | null>(null);
  const [whatsappInput, setWhatsappInput] = useState("");
  const [whatsappVerifiedAt, setWhatsappVerifiedAt] = useState<Date | null>(null);
  const [whatsappSending, setWhatsappSending] = useState(false);

  const [phoneOtp, setPhoneOtp] = useState<string | null>(null);
  const [phoneInput, setPhoneInput] = useState("");
  const [phoneVerifiedAt, setPhoneVerifiedAt] = useState<Date | null>(null);
  const [phoneSending, setPhoneSending] = useState(false);

  const [emailOtp, setEmailOtp] = useState<string | null>(null);
  const [emailInput, setEmailInput] = useState("");
  const [emailVerifiedAt, setEmailVerifiedAt] = useState<Date | null>(null);
  const [emailSending, setEmailSending] = useState(false);

  const [msg, setMsg] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);
  const [timers, setTimers] = useState<Record<"whatsapp" | "phone" | "email", number | null>>({ whatsapp: null, phone: null, email: null });
  const [timerNow, setTimerNow] = useState(Date.now());

  useEffect(() => {
    const hasActive = timers.whatsapp != null || timers.phone != null || timers.email != null;
    if (!hasActive) return;
    const id = setInterval(() => {
      const now = Date.now();
      setTimerNow(now);
      setTimers((prev) => {
        let changed = false;
        const next = { ...prev };
        (Object.keys(next) as Array<keyof typeof next>).forEach((k) => {
          if (next[k] != null && now >= next[k]!) { next[k] = null; changed = true; }
        });
        return changed ? next : prev;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [timers]);

  // Debounce 300ms — pesquisa de empresa/endereço via proxy Places
  useEffect(() => {
    const q = placeQuery.trim();
    if (q.length < 3) {
      setPlaceSuggestions([]);
      setPlaceStatus("idle");
      return;
    }
    if (suppressPlaceSearchRef.current) {
      suppressPlaceSearchRef.current = false;
      setPlaceSuggestions([]);
      setPlaceStatus("idle");
      return;
    }
    let cancelled = false;
    setPlaceStatus("loading");
    console.log(`[places] a pesquisar "${q}"…`);
    const id = setTimeout(async () => {
      const res = await placesAutocompleteAction(q);
      if (!cancelled) {
        const suggestions = res.ok ? res.suggestions : [];
        if (res.ok) {
          console.log(`[places] ${suggestions.length} sugestões para "${q}"`);
        } else {
          console.error(`[places] falhou para "${q}":`, res.error);
        }
        setPlaceSuggestions(suggestions);
        setPlaceStatus(!res.ok ? "error" : suggestions.length > 0 ? "idle" : "empty");
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [placeQuery]);

  function matchProvinceName(googleName: string | null): string {
    if (!googleName) return "";
    const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const g = norm(googleName);
    return PROVINCES.find((p) => norm(p) === g || g.includes(norm(p)) || norm(p).includes(g)) ?? "";
  }

  async function pickPlaceSuggestion(s: PlaceSuggestion) {
    suppressPlaceSearchRef.current = true;
    setProfileName(s.mainText);
    setPlaceSuggestions([]);
    setPickedPlaceLabel(s.mainText);
    setPlaceQuery(s.secondaryText ? `${s.mainText} — ${s.secondaryText}` : s.mainText);
    const res = await placesDetailsAction(s.placeId);
    if (!res.ok) return;
    const p = res.place;
    setGooglePlaceId(p.placeId);
    if (p.latitude != null && p.longitude != null) {
      setLatitude(p.latitude);
      setLongitude(p.longitude);
    }
    if (p.formattedAddress) setFormattedAddress(p.formattedAddress);
    // pré-preenche só campos vazios — tudo permanece editável
    if (!province && p.province) {
      const matched = matchProvinceName(p.province);
      if (matched) setProvince(matched);
    }
    if (!district && p.district) setDistrict(p.district);
    if (!bairro && p.bairro) setBairro(p.bairro);
    if (!phone && p.phone) setPhone(p.phone.replace(/^\+258\s*/, ""));
    if (!website && p.website) setWebsite(p.website);
    if (!businessHours && p.businessHours) setBusinessHours(p.businessHours);
  }

  function clearLocation() {
    setLatitude(null);
    setLongitude(null);
    setGooglePlaceId(null);
    setFormattedAddress(null);
    setPickedPlaceLabel(null);
    setPlaceQuery("");
  }

  function countdownLabel(channel: "whatsapp" | "phone" | "email"): string {
    const endsAt = timers[channel];
    if (!endsAt) return "";
    const secs = Math.max(0, Math.ceil((endsAt - timerNow) / 1000));
    return `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`;
  }

  const [activeStep, setActiveStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [progressLabel, setProgressLabel] = useState("");
  const [createdProfileId, setCreatedProfileId] = useState<string | null>(null);
  const [wantVerification, setWantVerification] = useState<boolean | null>(null);
  const [docNote, setDocNote] = useState("");
  const [verifyLevel, setVerifyLevel] = useState<"level1" | "level2">("level1");
  // Erros por campo (mostrados junto ao input); preenchidos em cada tentativa de avançar
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Hidratação: draft sobrevive a refresh; contactos verificados vêm do cookie CV
  const [hydrated, setHydrated] = useState(false);
  const [restoredVerified, setRestoredVerified] = useState<Set<ContactChannel>>(new Set());

  useEffect(() => {
    let alive = true;

    // 1. Recuperação de crash: organização criada mas submit falhou → reutiliza
    try {
      if (!initialOrganizationId) {
        const saved = window.localStorage.getItem("wd:onb:orgId");
        if (saved) setOrganizationId(saved);
      }
    } catch {}

    // 2. Draft — só se for do mesmo utilizador + TTL 24h (LGPD P2-5)
    try {
      const raw = window.localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const d = JSON.parse(raw) as Record<string, unknown>;
        const savedAt = typeof d.savedAt === "number" ? d.savedAt : 0;
        if (savedAt && Date.now() - savedAt > 24 * 60 * 60 * 1000) {
          try { window.localStorage.removeItem(DRAFT_KEY); } catch {}
        } else {
          const str = (k: string): string | undefined => (typeof d[k] === "string" ? (d[k] as string) : undefined);
          const numOrNull = (k: string): number | null | undefined =>
            typeof d[k] === "number" ? (d[k] as number) : d[k] === null ? null : undefined;
          if (d.owner !== userName && typeof d.owner === "string") {
            // draft de outro utilizador — ignora conteúdo mas mantém org recovery acima
          } else {
          const maybe = <T,>(v: T | undefined, set: (x: T) => void) => { if (v !== undefined) set(v); };
          maybe(str("profileName"), setProfileName);
          if (typeof d.logoUrl === "string" && d.logoUrl) setLogoUrl(d.logoUrl);
          maybe(str("tagline"), setTagline);
          maybe(str("description"), setDescription);
          maybe(str("nuit"), setNuit);
          maybe(str("legalForm"), (v) => setLegalForm(v as LegalForm));
          maybe(str("foundedYear"), setFoundedYear);
          maybe(str("workers"), setWorkers);
          maybe(str("turnover"), setTurnover);
          maybe(str("capital"), setCapital);
          maybe(str("alvara"), setAlvara);
          maybe(str("licenses"), setLicenses);
          if (Array.isArray(d.selectedCats)) setSelectedCats(d.selectedCats.filter((x): x is string => typeof x === "string").slice(0, 5));
          maybe(str("province"), setProvince);
          maybe(str("district"), setDistrict);
          maybe(str("bairro"), setBairro);
          if (Array.isArray(d.interestTags)) {
            setInterestTags(
              d.interestTags
                .filter((x): x is string => typeof x === "string" && tags.some((t) => t.slug === x))
                .slice(0, 10),
            );
          }
          maybe(str("website"), setWebsite);
          maybe(numOrNull("latitude"), setLatitude);
          maybe(numOrNull("longitude"), setLongitude);
          maybe(str("googlePlaceId") ?? undefined, setGooglePlaceId as (v: string | null) => void);
          maybe(str("formattedAddress") ?? undefined, setFormattedAddress as (v: string | null) => void);
          maybe(str("pickedPlaceLabel") ?? undefined, setPickedPlaceLabel as (v: string | null) => void);
          maybe(str("placeQuery"), setPlaceQuery);
          maybe(str("bhPreset") ?? "", setBhPreset);
          if (d.businessHours && typeof d.businessHours === "object" && Array.isArray((d.businessHours as BusinessHours).periods)) {
            setBusinessHours(d.businessHours as BusinessHours);
          }
          maybe(str("whatsapp"), setWhatsapp);
          maybe(str("phone"), setPhone);
          maybe(str("email"), setEmail);
          if (typeof d.activeStep === "number") setActiveStep(Math.min(Math.max(Math.trunc(d.activeStep), 0), 3));
          }
        }
      }
    } catch {}

    // 3. Contactos verificados — cookie CV válido 24h; campo passa a mostrar
    //    o identificador verificado (o backend exige match no submit)
    void (async () => {
      try {
        const verified = await getVerifiedContacts();
        if (!alive) return;
        for (const v of verified) {
          if (v.channel === "email") {
            setEmail(v.identifier);
            setEmailVerifiedAt(new Date());
          } else {
            const local = v.identifier.startsWith("258") ? v.identifier.slice(3) : v.identifier;
            if (v.channel === "whatsapp") {
              setWhatsapp(local);
              setWhatsappVerifiedAt(new Date());
            } else {
              setPhone(local);
              setPhoneVerifiedAt(new Date());
            }
          }
          setRestoredVerified((prev) => new Set(prev).add(v.channel));
        }
      } catch {}
      if (alive) setHydrated(true);
    })();

    return () => {
      alive = false;
    };
  }, [initialOrganizationId, userName, tags]);

  // Auto-save do draft após hidratação — TTL 24h (P2-5 LGPD)
  useEffect(() => {
    if (!hydrated) return;
    const draft = {
      owner: userName,
      savedAt: Date.now(),
      profileName, logoUrl, tagline, description, nuit, legalForm, foundedYear, workers, turnover, capital, alvara, licenses,
      selectedCats, province, district, bairro, interestTags, website,
      latitude, longitude, googlePlaceId, formattedAddress, pickedPlaceLabel, placeQuery,
      bhPreset, businessHours, whatsapp, phone, email, activeStep,
    };
    try {
      window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {}
  }, [
    hydrated, userName, activeStep,
    profileName, logoUrl, tagline, description, nuit, legalForm, foundedYear, workers, turnover, capital, alvara, licenses,
    selectedCats, province, district, bairro, interestTags, website,
    latitude, longitude, googlePlaceId, formattedAddress, pickedPlaceLabel, placeQuery,
    bhPreset, businessHours, whatsapp, phone, email,
  ]);

  function verifiedLabel(at: Date, channel: ContactChannel): string {
    return restoredVerified.has(channel) ? "Verificado anteriormente nesta conta" : formatTimestamp(at);
  }

  const previewSize = (() => {
    const w = parseDigits(workers);
    if (w == null || w < 1) return null;
    const size = classifyCompanySize({ workers: w, turnoverMzn: parseDigits(turnover) });
    return { size, label: sizeLabel(size), desc: sizeDescription(size) };
  })();

  function toggleCategory(_id: string) {
    // legacy — categorias agora via combobox multi-select
  }

  async function sendOtp(type: "whatsapp" | "phone" | "email") {
    setMsg(null);
    if (type === "whatsapp") {
      if (!whatsapp.trim()) { setError("Preencha o WhatsApp antes de enviar o código."); return; }
      setWhatsappSending(true);
      setError(null);
      try {
        const { sendWhatsappOtp } = await import("@/app/actions/otp");
        const res = await sendWhatsappOtp({ whatsapp: whatsapp.trim() });
        if (!res.ok) { setMsg({ type: "error", text: res.error ?? "Falha ao enviar código." }); return; }
        setWhatsappOtp("sent");
        setWhatsappInput("");
        setMsg({ type: "success", text: "Código enviado! Verifica o teu WhatsApp." });
        setTimers((prev) => ({ ...prev, whatsapp: Date.now() + 60_000 }));
      } catch (e) { setMsg({ type: "error", text: e instanceof Error ? e.message : "Falha ao enviar WhatsApp" }); }
      finally { setWhatsappSending(false); }
      return;
    }
    if (type === "phone") {
      if (!phone.trim()) { setError("Preencha o telefone antes de enviar o código."); return; }
      setPhoneSending(true);
      setError(null);
      try {
        const { sendPhoneOtp } = await import("@/app/actions/otp");
        const res = await sendPhoneOtp({ phone: phone.trim() });
        if (!res.ok) { setMsg({ type: "error", text: res.error ?? "Falha ao enviar SMS." }); return; }
        setPhoneOtp("sent");
        setPhoneInput("");
        setMsg({ type: "success", text: "Código enviado! Verifica o teu SMS." });
        setTimers((prev) => ({ ...prev, phone: Date.now() + 60_000 }));
      } catch (e) { setMsg({ type: "error", text: e instanceof Error ? e.message : "Falha ao enviar SMS" }); }
      finally { setPhoneSending(false); }
      return;
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError("Email inválido para enviar código."); return; }
    setEmailSending(true);
    setError(null);
    try {
      const { sendEmailOtp } = await import("@/app/actions/otp");
      const res = await sendEmailOtp({ email: email.trim() });
      if (!res.ok) { setMsg({ type: "error", text: res.error ?? "Falha ao enviar email." }); return; }
      setEmailOtp("sent");
      setEmailInput("");
      setMsg({ type: "success", text: "Código enviado! Verifica o teu email." });
      setTimers((prev) => ({ ...prev, email: Date.now() + 60_000 }));
    } catch (e) { setMsg({ type: "error", text: e instanceof Error ? e.message : "Falha ao enviar email" }); }
    finally { setEmailSending(false); }
  }

  async function verifyOtp(type: "whatsapp" | "phone" | "email") {
    setMsg(null);
    if (type === "whatsapp") {
      try {
        const { verifyWhatsappOtp } = await import("@/app/actions/otp");
        const res = await verifyWhatsappOtp({ whatsapp: whatsapp.trim(), code: whatsappInput.trim() });
        if (!res.ok) {
          const errText = res.error ?? "Código incorreto.";
          const isExpired = /expirad/i.test(errText);
          const isInvalid = /incorreto/i.test(errText) || /inválid/i.test(errText);
          setMsg({ type: "error", text: isExpired ? "Código expirado. Reenvia um novo código." : isInvalid ? "Código inválido. Verifica e tenta novamente." : errText });
          return;
        }
        setWhatsappVerifiedAt(new Date());
        setWhatsappOtp(null);
        setTimers((prev) => ({ ...prev, whatsapp: null }));
        setMsg({ type: "success", text: "WhatsApp verificado com sucesso!" });
      } catch (e) { setMsg({ type: "error", text: e instanceof Error ? e.message : "Falha ao verificar OTP" }); }
      return;
    }
    if (type === "phone") {
      if (!phoneInput || phoneInput.length < 6) { setMsg({ type: "error", text: "Introduz os 6 dígitos do código." }); return; }
      try {
        const { verifyPhoneOtp } = await import("@/app/actions/otp");
        const res = await verifyPhoneOtp({ phone: phone.trim(), code: phoneInput.trim() });
        if (!res.ok) {
          const errText = res.error ?? "Código incorreto.";
          const isExpired = /expirad/i.test(errText);
          const isInvalid = /incorreto/i.test(errText) || /inválid/i.test(errText);
          setMsg({ type: "error", text: isExpired ? "Código expirado. Reenvia um novo código." : isInvalid ? "Código inválido. Verifica e tenta novamente." : errText });
          return;
        }
        setPhoneVerifiedAt(new Date());
        setPhoneOtp(null);
        setTimers((prev) => ({ ...prev, phone: null }));
        setMsg({ type: "success", text: "Telefone verificado com sucesso!" });
      } catch (e) { setMsg({ type: "error", text: e instanceof Error ? e.message : "Falha ao verificar OTP" }); }
      return;
    }
    if (!emailInput || emailInput.length < 6) { setMsg({ type: "error", text: "Introduz os 6 dígitos do código." }); return; }
    try {
      const { verifyEmailOtp } = await import("@/app/actions/otp");
      const res = await verifyEmailOtp({ email: email.trim(), code: emailInput.trim() });
      if (!res.ok) {
        const errText = res.error ?? "Código incorreto.";
        const isExpired = /expirad/i.test(errText);
        const isInvalid = /incorreto/i.test(errText) || /inválid/i.test(errText);
        setMsg({ type: "error", text: isExpired ? "Código expirado. Reenvia um novo código." : isInvalid ? "Código inválido. Verifica e tenta novamente." : errText });
        return;
      }
      setEmailVerifiedAt(new Date());
      setEmailOtp(null);
      setTimers((prev) => ({ ...prev, email: null }));
      setMsg({ type: "success", text: "Email verificado com sucesso!" });
    } catch (e) { setMsg({ type: "error", text: e instanceof Error ? e.message : "Falha ao verificar OTP" }); }
  }

  async function handleLogoFile(file: File) {
    if (!file.type.startsWith("image/")) {
      setMsg({ type: "error", text: "O logótipo deve ser uma imagem (PNG, JPG ou WebP)." });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setMsg({ type: "error", text: "Imagem muito grande — máximo 5 MB." });
      return;
    }
    // preview local imediato
    const localUrl = URL.createObjectURL(file);
    setLogoPreview(localUrl);
    setLogoUploading(true);
    try {
      const { uploadFilesAction } = await import("@/app/actions/files");
      const fd = new FormData();
      fd.set("file", file, file.name);
      fd.set("purpose", "logo");
      const res = await uploadFilesAction(fd);
      if (!res.ok) throw new Error(res.error);
      setLogoUrl(res.file.url);
      setMsg({ type: "success", text: "Logótipo carregado." });
    } catch (e) {
      setLogoPreview(null);
      URL.revokeObjectURL(localUrl);
      setMsg({ type: "error", text: e instanceof Error ? e.message : "Falha ao carregar logótipo." });
    } finally {
      setLogoUploading(false);
    }
  }

  function clearLogo() {
    if (logoPreview) URL.revokeObjectURL(logoPreview);
    setLogoPreview(null);
    setLogoUrl(null);
  }

  // Validação completa ANTES de qualquer escrita — nada é criado se algo estiver inválido
  const FIELD_STEP: Record<string, number> = {
    profileName: 0,
    selectedCats: 0,
    workers: 0,
    foundedYear: 0,
    nuit: 0,
    contacts: 1,
    whatsapp: 1,
    phone: 1,
    email: 1,
    website: 1,
    province: 2,
  };

  function computeFieldErrors(): Record<string, string> {
    const errs: Record<string, string> = {};
    if (!profileName.trim() || profileName.trim().length < 2) errs.profileName = "Nome da empresa obrigatório (≥2 caracteres)";
    if (selectedCats.length === 0) errs.selectedCats = "Escolhe pelo menos 1 área de actuação";
    const w = parseDigits(workers);
    if (w == null || w < 1) errs.workers = "Nº de trabalhadores obrigatório";
    if (foundedYear) {
      const y = parseDigits(foundedYear);
      if (y == null || y < 1900 || y > new Date().getFullYear()) errs.foundedYear = "Ano de fundação inválido";
    }
    if (nuit.trim() && !/^[0-9]{9}$/.test(nuit.trim())) errs.nuit = "NUIT deve ter 9 dígitos";

    if (!whatsappVerifiedAt && !phoneVerifiedAt && !emailVerifiedAt) {
      errs.contacts = "Verifica pelo menos um contacto com código OTP antes de continuar.";
    }
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errs.email = "Email inválido — corrige ou limpa o campo.";
    if (whatsapp.trim() && !whatsappVerifiedAt) errs.whatsapp = "Verifica o WhatsApp ou limpa o campo.";
    if (phone.trim() && !phoneVerifiedAt) errs.phone = "Verifica o telefone ou limpa o campo.";

    if (!province) errs.province = "Província obrigatória";
    if (website.trim() && !/^https?:\/\/.+\..+/.test(website.trim())) {
      errs.website = "Website deve ser um URL completo (ex: https://empresa.co.mz)";
    }
    return errs;
  }

  function validateAll(): { step: number; msg: string } | null {
    const errs = computeFieldErrors();
    setFieldErrors(errs);
    for (const [key, msg] of Object.entries(errs)) {
      return { step: FIELD_STEP[key] ?? 0, msg };
    }
    return null;
  }

  async function ensureOrganization(): Promise<string> {
    if (organizationId) return organizationId;
    const slug = profileName
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    const res = await authClient.organization.create({ name: profileName.trim(), slug });
    if (res.error) throw new Error(res.error.message ?? "Falha ao criar organização");
    const createdId = (res.data as { id?: string })?.id ?? (res as unknown as { id?: string })?.id;
    if (!createdId) throw new Error("Falha ao obter ID da organização criada");
    setOrganizationId(createdId);
    try {
      window.localStorage.setItem("wd:onb:orgId", createdId);
    } catch {}
    return createdId;
  }

  async function handleCreateCompany() {
    setError(null);
    if (logoUploading) {
      setError("Aguarda o carregamento do logótipo terminar antes de publicar.");
      return;
    }

    const invalid = validateAll();
    if (invalid) {
      setError(invalid.msg);
      setActiveStep(invalid.step);
      return;
    }

    setLoading(true);
    try {
      setProgressLabel("A preparar organização…");
      const orgId = await ensureOrganization();

      try {
        const { fetchJwtToken } = await import("@/lib/auth-client");
        await fetchJwtToken();
      } catch {}

      const licensesArr = licenses
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 20);
      const tagSlugs = interestTags;

      setProgressLabel("A publicar o teu perfil…");
      const res = await completeOnboardingAction({
        organizationId: orgId,
        profile: {
          name: profileName.trim(),
          categoryIds: selectedCats,
          whatsapp: whatsapp.trim() ? whatsapp.trim() : undefined,
          phone: phone.trim() ? phone.trim() : undefined,
          email: email.trim() ? email.trim() : undefined,
          website: website.trim() ? website.trim() : undefined,
          description: description.trim() ? description.trim() : undefined,
          tagline: tagline.trim() ? tagline.trim() : undefined,
          ...(logoUrl ? { logoUrl } : {}),
          ...(latitude != null && longitude != null ? { latitude, longitude } : {}),
          ...(googlePlaceId ? { googlePlaceId } : {}),
          ...(formattedAddress ? { formattedAddress } : {}),
          ...(businessHours && businessHours.periods.length > 0 ? { businessHours } : {}),
        },
        qualification: {
          workers: parseDigits(workers) ?? 0,
          turnoverMzn: parseDigits(turnover),
          foundedYear: parseDigits(foundedYear),
          legalForm: legalForm || null,
          nuit: nuit.trim() || null,
          alvara: alvara.trim() || null,
          capitalSocialMzn: parseDigits(capital),
          licenses: licensesArr.length ? licensesArr : null,
        },
        location: {
          province,
          district: district || null,
          bairro: bairro || null,
          address: formattedAddress ?? (district || bairro ? `${bairro ? bairro + ", " : ""}${district ? district + ", " : ""}${province}` : null),
          latitude: latitude ?? null,
          longitude: longitude ?? null,
          visibility: "zone" as const,
        },
        ...(tagSlugs.length > 0 ? { tagSlugs } : {}),
      });

      if (!res.ok) throw new Error(res.error);

      try {
        window.localStorage.removeItem("wd:onb:orgId");
        window.localStorage.removeItem(DRAFT_KEY);
      } catch {}
      setCreatedProfileId(res.profileId === "ok" ? null : res.profileId);
      setActiveStep(3);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao criar perfil empresa");
    } finally {
      setLoading(false);
      setProgressLabel("");
    }
  }

  async function handleVerification(skip: boolean) {
    setError(null);
    setLoading(true);
    try {
      if (!skip && createdProfileId) {
        const docs = docNote.trim() ? [{ type: "note", url: docNote.trim() }] : [{ type: "pending", note: "Solicitação via onboarding" }];
        await requestVerification({ profileId: createdProfileId, documents: docs, level: verifyLevel });
      }
      router.push("/dashboard?welcome=1");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao pedir verificação");
    } finally {
      setLoading(false);
    }
  }

  const steps = [
    { title: "Empresa", desc: "Identidade e porte" },
    { title: "Contactos", desc: "Verificação OTP" },
    { title: "Presença", desc: "Áreas e localização" },
    { title: "Verificação", desc: "Selo verificado (opcional)" },
  ];

  return (
    <div className="grid gap-8 lg:grid-cols-[0.9fr_1.25fr] lg:items-start">
      {/* MOBILE — barra compacta: evita empurrar o form ~500px para baixo em <lg */}
      <div className="lg:hidden">
        <div className="rounded-2xl border border-[#D9D2C2] bg-[#F6F3EE] px-4 py-3">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold tracking-[0.14em] text-[#0B5E56]">
              PASSO {Math.min(activeStep + 1, steps.length)} DE {steps.length} • {steps[Math.min(activeStep, steps.length - 1)]?.title.toUpperCase()}
            </p>
            <span className="text-xs font-semibold text-[#0F1A2E]/50">{Math.round(((Math.min(activeStep + 1, steps.length)) / steps.length) * 100)}%</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#D9D2C2]">
            <div className="h-full rounded-full bg-[#0B5E56] transition-all" style={{ width: `${((Math.min(activeStep + 1, steps.length)) / steps.length) * 100}%` }} />
          </div>
          <div className="mt-3 flex gap-2">
            {steps.map((s, i) => {
              const isDone = i < activeStep;
              const isActive = i === activeStep;
              return (
                <div
                  key={s.title}
                  className={`flex h-7 flex-1 items-center justify-center rounded-full border text-[11px] font-black ${isDone ? "border-[#0B5E56] bg-[#0B5E56] text-white" : isActive ? "border-[#FF3B1F] bg-white text-[#FF3B1F]" : "border-[#D9D2C2] bg-white text-[#0F1A2E]/30"}`}
                >
                  {isDone ? "✓" : i + 1}
                </div>
              );
            })}
          </div>
        </div>
        <h1 className="mt-4 text-[22px] font-black leading-[0.95] tracking-[-0.05em] text-[#0F1A2E]" style={{ fontFamily: "var(--font-display)" }}>
          Vamos criar o teu perfil
        </h1>
        <p className="mt-1.5 text-sm leading-relaxed text-[#0F1A2E]/60">Completo, verificado e pronto para ser encontrado.</p>
      </div>

      {/* LEFT — manifesto + stepper vertical (desktop only; escondido em mobile para não empurrar o form) */}
      <div className="hidden lg:block lg:sticky lg:top-[88px]">
        <div className="inline-flex items-center gap-2 rounded-full border border-[#0F1A2E]/10 bg-white px-3.5 py-1.5 text-[11px] font-bold tracking-[0.14em] text-[#0F1A2E]/60 shadow-sm">
          <span className="size-1.5 rounded-full bg-[#0B5E56] animate-pulse" />
          CONFIGURAÇÃO INICIAL • ≈ 5 MINUTOS
        </div>
        <h1 className="mt-4 text-[30px] font-black leading-[0.9] tracking-[-0.05em] sm:text-[34px]" style={{ fontFamily: "var(--font-display)" }}>
          Vamos criar
          <br />
          o teu perfil
          <br />
          <span className="font-light text-[#0F1A2E]/70">no ecossistema.</span>
        </h1>
        <p className="mt-3 max-w-[420px] text-[15px] leading-relaxed text-[#0F1A2E]/60">
          O teu perfil é o teu cartão de visita onde os negócios se encontram. Completo, verificado e pronto para ser encontrado — sem fronteiras.
        </p>

        {/* stepper vertical — substitui os 3 cards de benefício */}
        <div className="mt-6 rounded-[20px] border border-[#D9D2C2] bg-[#F6F3EE] p-4">
          <p className="text-[11px] font-bold tracking-[0.14em] text-[#0B5E56]">ONBOARDING</p>
          <p className="mt-1 text-xs text-[#0F1A2E]/60">4 passos • ~5 min</p>
          <div className="relative mt-4 space-y-0">
            <div className="absolute left-[15px] top-[14px] bottom-[14px] w-px bg-[#D9D2C2]" aria-hidden />
            {steps.map((s, i) => {
              const isActive = i === activeStep;
              const isDone = i < activeStep;
              return (
                <div key={s.title} className="relative flex gap-3 py-3">
                  <div
                    className={`flex size-8 shrink-0 items-center justify-center rounded-full border text-xs font-black transition-colors ${
                      isDone ? "border-[#0B5E56] bg-[#0B5E56] text-white" : isActive ? "border-[#FF3B1F] bg-white text-[#FF3B1F] shadow" : "border-[#D9D2C2] bg-white text-[#0F1A2E]/30"
                    }`}
                  >
                    {isDone ? "✓" : i + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-bold leading-none ${isActive ? "text-[#0F1A2E]" : isDone ? "text-[#0B5E56]" : "text-[#0F1A2E]/40"}`}>{s.title}</p>
                    <p className="text-xs text-[#0F1A2E]/50">{s.desc}</p>
                    {i === 1 && (whatsappVerifiedAt || phoneVerifiedAt || emailVerifiedAt) && (
                      <p className="mt-1 inline-flex rounded-full bg-[#0B5E56]/10 px-2 py-0.5 text-[11px] font-medium text-[#0B5E56]">✓ contacto verificado</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {previewSize && (
            <div className="mt-4 rounded-xl border border-[#0B5E56]/15 bg-white px-3 py-2 text-xs">
              <span className="font-bold text-[#0B5E56]">{previewSize.label}</span> <span className="text-[#0F1A2E]/50">— {previewSize.desc}</span>
            </div>
          )}
        </div>

        <div className="mt-6 hidden items-center gap-2 text-[11px] font-bold tracking-[0.14em] text-[#0F1A2E]/30 lg:flex">
          <span>GLOBAL</span>
          <span className="size-1 rounded-full bg-[#0F1A2E]/20" />
          <span>DIGITAL</span>
          <span className="size-1 rounded-full bg-[#0F1A2E]/20" />
          <span>SEM FRONTEIRAS</span>
        </div>
      </div>

      {/* RIGHT — form card */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (activeStep === 0) {
            const errs = computeFieldErrors();
            const first = Object.entries(errs).find(([k]) => FIELD_STEP[k] === 0);
            setFieldErrors(errs);
            if (first) { setError(first[1]); return; }
            setError(null);
            setActiveStep(1);
            return;
          }
          if (activeStep === 1) {
            const errs = computeFieldErrors();
            const first = Object.entries(errs).find(([k]) => FIELD_STEP[k] === 1);
            setFieldErrors(errs);
            if (first) { setError(first[1]); return; }
            setError(null);
            setActiveStep(2);
            return;
          }
          if (activeStep === 2) void handleCreateCompany();
        }}
        noValidate
        className="rounded-[24px] border border-[#D9D2C2] bg-white p-6 shadow-[0_12px_40px_rgba(15,26,46,0.08)] sm:p-7"
      >
        <div className="mb-6 flex items-center justify-between">
          <p className="text-[11px] font-bold tracking-[0.16em] text-[#0B5E56]">ONBOARDING</p>
          <span className="rounded-full border border-[#D9D2C2] bg-[#F6F3EE] px-2.5 py-1 text-[11px] font-semibold text-[#0F1A2E]/50">Olá, {userName.split(" ")[0]}</span>
        </div>
        <div className="space-y-4">
        {activeStep === 0 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-[18px] font-black tracking-[-0.02em] text-[#0F1A2E]" style={{ fontFamily: "var(--font-display)" }}>
                Identidade da empresa
              </h2>
              <p className="text-sm text-[#0F1A2E]/60">Como a empresa aparece no ecossistema. O nome aqui cria a organização e o perfil público.</p>
            </div>

            {/* Pesquisa Google Places — pré-preenche nome, morada, contactos e horário (tudo editável) */}
            <div className="space-y-2 rounded-2xl border border-[#D9D2C2] bg-[#F6F3EE] p-4">
              <div className="flex items-center justify-between">
                <p className={labelCls}>Pesquisar no Google Maps</p>
                <span className="rounded-full border border-[#D9D2C2] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#0F1A2E]/50">Opcional</span>
              </div>
              <div className="relative">
                <input
                  value={placeQuery}
                  onChange={(e) => setPlaceQuery(e.target.value)}
                  placeholder="Pesquisar nome da empresa ou endereço…"
                  className={inputCls}
                  autoComplete="off"
                />
                {placeStatus === "loading" && (
                  <span
                    className="absolute right-3 top-1/2 size-3 -translate-y-1/2 animate-spin rounded-full border-2 border-[#0F1A2E]/20 border-t-[#0B5E56]"
                    aria-hidden="true"
                  />
                )}
                {(placeSuggestions.length > 0 || placeStatus !== "idle") && (
                  <div className="absolute inset-x-0 top-full z-30 mt-1 overflow-hidden rounded-xl border border-[#D9D2C2] bg-white shadow-[0_12px_32px_rgba(15,26,46,0.14)]">
                    {placeSuggestions.length > 0 ? (
                      placeSuggestions.map((s) => (
                        <button
                          key={s.placeId}
                          type="button"
                          onClick={() => void pickPlaceSuggestion(s)}
                          className="block w-full px-3 py-2.5 text-left transition hover:bg-[#0B5E56]/5"
                        >
                          <span className="block text-[13px] font-semibold text-[#0F1A2E]">{s.mainText}</span>
                          {s.secondaryText && <span className="block truncate text-xs text-[#0F1A2E]/50">{s.secondaryText}</span>}
                        </button>
                      ))
                    ) : placeStatus === "loading" ? (
                      <div className="flex items-center gap-2 px-3 py-2.5">
                        <span
                          className="size-3 shrink-0 animate-spin rounded-full border-2 border-[#0F1A2E]/20 border-t-[#0B5E56]"
                          aria-hidden="true"
                        />
                        <span className="text-[13px] text-[#0F1A2E]/60">A pesquisar no Google Maps…</span>
                      </div>
                    ) : placeStatus === "empty" ? (
                      <div className="px-3 py-2.5">
                        <span className="block text-[13px] font-semibold text-[#0F1A2E]/70">
                          Nada encontrado no Google Maps para “{placeQuery.trim()}”
                        </span>
                        <span className="mt-0.5 block text-xs text-[#0F1A2E]/50">Sem problema — continua o preenchimento manual abaixo.</span>
                      </div>
                    ) : (
                      <div className="px-3 py-2.5 text-[13px] font-medium text-[#7A1A0A]">A pesquisa falhou — tenta novamente.</div>
                    )}
                  </div>
                )}
              </div>
              {pickedPlaceLabel && (
                <p className="inline-flex flex-wrap items-center gap-2 rounded-full bg-[#0B5E56]/10 px-3 py-1.5 text-xs font-medium text-[#0B5E56]">
                  ✓ Dados pré-preenchidos de “{pickedPlaceLabel}” — revê e ajusta nos campos
                  <button type="button" onClick={clearLocation} className="font-bold hover:underline">
                    limpar
                  </button>
                </p>
              )}
              <p className="text-xs leading-relaxed text-[#0F1A2E]/50">
                Se a empresa existe no Google, poupas tempo: morada, telefone, site e horário ficam preenchidos automaticamente.
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="onb-profileName" className={labelCls}>Nome da empresa *</label>
                <input id="onb-profileName" value={profileName} onChange={(e) => setProfileName(e.target.value)} placeholder="Ex: Marquel Brindes, Lda" aria-invalid={!!fieldErrors.profileName} aria-describedby={fieldErrors.profileName ? "err-profileName" : undefined} className={inputCls} />
                {fieldErrors.profileName && <p id="err-profileName" role="alert" className={fieldErrCls}>{fieldErrors.profileName}</p>}
              </div>

              {/* Logótipo — opcional, melhora selo profile-complete */}
              <div className="space-y-1.5">
                <label className={labelCls}>Logótipo da empresa</label>
                <div className="flex items-center gap-4 rounded-xl border border-[#D9D2C2] bg-[#F6F3EE] p-3">
                  <div className="relative size-16 shrink-0 overflow-hidden rounded-xl border border-[#D9D2C2] bg-white flex items-center justify-center">
                    {logoPreview || logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={logoPreview ?? logoUrl ?? ""} alt="Pré-visualização do logótipo" className="size-full object-cover" />
                    ) : (
                      <span className="text-[10px] font-bold tracking-widest text-[#0F1A2E]/25">LOGO</span>
                    )}
                    {logoUploading && (
                      <span className="absolute inset-0 grid place-items-center bg-white/70">
                        <span className="size-4 animate-spin rounded-full border-2 border-[#0F1A2E]/20 border-t-[#0B5E56]" />
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap gap-2">
                      <label className="inline-flex cursor-pointer items-center justify-center rounded-full border border-[#D9D2C2] bg-white px-4 py-2 text-xs font-bold text-[#0F1A2E] transition hover:bg-[#F6F3EE] has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50">
                        {logoUploading ? "A carregar…" : logoUrl || logoPreview ? "Trocar imagem" : "Carregar imagem"}
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp,image/svg+xml"
                          className="hidden"
                          disabled={logoUploading}
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) void handleLogoFile(f);
                            e.target.value = "";
                          }}
                        />
                      </label>
                      {(logoUrl || logoPreview) && (
                        <button type="button" onClick={clearLogo} disabled={logoUploading} className="rounded-full border border-[#FF3B1F]/20 bg-white px-4 py-2 text-xs font-semibold text-[#7A1A0A] hover:bg-[#FF3B1F]/10 disabled:opacity-50">
                          Remover
                        </button>
                      )}
                    </div>
                    <p className="mt-1.5 text-xs leading-relaxed text-[#0F1A2E]/40">PNG, JPG ou WebP até 5 MB. Quadrado 512×512 recomendado. Opcional — podes adicionar depois.</p>
                  </div>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label htmlFor="onb-nuit" className={labelCls}>NUIT (9 dígitos)</label>
                  <input id="onb-nuit" value={nuit} onChange={(e) => setNuit(e.target.value)} placeholder="123456789" maxLength={9} aria-invalid={!!fieldErrors.nuit} className={inputCls} />
                  {fieldErrors.nuit && <p role="alert" className={fieldErrCls}>{fieldErrors.nuit}</p>}
                </div>
                <div className="space-y-1.5">
                  <label className={labelCls}>Forma jurídica</label>
                  <Select value={legalForm || null} onValueChange={(v) => setLegalForm((v as LegalForm) || "")}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar…" />
                    </SelectTrigger>
                    <SelectContent>
                      {LEGAL_FORMS.map((f) => (
                        <SelectItem key={f.value} value={f.value}>
                          {f.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="onb-foundedYear" className={labelCls}>Ano de fundação</label>
                  <input id="onb-foundedYear" type="number" value={foundedYear} onChange={(e) => setFoundedYear(e.target.value)} placeholder="Ex: 2018" aria-invalid={!!fieldErrors.foundedYear} className={inputCls} />
                  {fieldErrors.foundedYear && <p role="alert" className={fieldErrCls}>{fieldErrors.foundedYear}</p>}
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="onb-workers" className={labelCls}>Nº trabalhadores *</label>
                  <input id="onb-workers" type="number" value={workers} onChange={(e) => setWorkers(e.target.value)} placeholder="Ex: 12" aria-invalid={!!fieldErrors.workers} className={inputCls} />
                  {fieldErrors.workers && <p role="alert" className={fieldErrCls}>{fieldErrors.workers}</p>}
                </div>
                <div className="space-y-1.5">
                  <label className={labelCls}>Volume anual (MZN)</label>
                  <input type="number" value={turnover} onChange={(e) => setTurnover(e.target.value)} placeholder="Ex: 4 800 000" className={inputCls} />
                </div>
                <div className="space-y-1.5">
                  <label className={labelCls}>Capital social (MZN)</label>
                  <input type="number" value={capital} onChange={(e) => setCapital(e.target.value)} placeholder="Opcional" className={inputCls} />
                </div>
              </div>
              <div className="space-y-3">
                <p className={labelCls}>Categoria da empresa *</p>
                <Combobox
                  multiple
                  value={selectedCats}
                  onValueChange={(val) => {
                    const next = (val as string[]) ?? [];
                    if (next.length <= 5) setSelectedCats(next);
                  }}
                  onInputValueChange={setCatQuery}
                >
                  <ComboboxChips
                    ref={catAnchor}
                    className="min-h-[38px] rounded-lg border border-[#D9D2C2] bg-[#F6F3EE] px-2 py-1 text-[13px] transition focus-within:border-[#0B5E56] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#0B5E56]/15"
                  >
                    {selectedCats.map((id) => {
                      const cat = categories.find((c) => c.id === id);
                      return (
                        <ComboboxChip key={id} className="bg-[#0B5E56] text-white hover:bg-[#0A4A44]">
                          {cat?.name ?? id}
                        </ComboboxChip>
                      );
                    })}
                    <ComboboxChipsInput
                      placeholder={selectedCats.length === 0 ? "Procurar categoria da empresa…" : selectedCats.length < 5 ? "Adicionar…" : "Limite 5 atingido"}
                      disabled={selectedCats.length >= 5 && !catQuery}
                      className="placeholder:text-[#0F1A2E]/40"
                    />
                  </ComboboxChips>
                  <ComboboxContent anchor={catAnchor} className="z-50">
                    <ComboboxList>
                      {categories
                        .filter((c) => {
                          if (!catQuery) return true;
                          return c.name.toLowerCase().includes(catQuery.toLowerCase());
                        })
                        .slice(0, 30)
                        .map((c) => (
                          <ComboboxItem key={c.id} value={c.id} className="data-[selected]:bg-[#0B5E56] data-[selected]:text-white">
                            {c.name}
                          </ComboboxItem>
                        ))}
                    </ComboboxList>
                    <ComboboxEmpty className="px-3 py-6 text-center text-sm text-[#0F1A2E]/50">Nenhuma categoria encontrada.</ComboboxEmpty>
                  </ComboboxContent>
                </Combobox>
                <p className="text-xs text-[#0F1A2E]/50">
                  {selectedCats.length}/5 seleccionadas{selectedCats.length === 5 ? " • limite atingido" : " • escolhe até 5"} — define onde a empresa aparece no directório
                </p>
                {fieldErrors.selectedCats && <p role="alert" className={fieldErrCls}>{fieldErrors.selectedCats}</p>}
                {selectedCats.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {selectedCats.map((id) => {
                      const cat = categories.find((c) => c.id === id);
                      return (
                        <span key={id} className="inline-flex items-center gap-1 rounded-full border border-[#0B5E56]/15 bg-[#0B5E56]/10 px-2.5 py-1 text-xs font-medium text-[#0B5E56]">
                          {cat?.name ?? id}
                          <button
                            type="button"
                            onClick={() => setSelectedCats((prev) => prev.filter((x) => x !== id))}
                            className="ml-1 rounded-full p-0.5 hover:bg-[#0B5E56]/20"
                            aria-label={`Remover ${cat?.name}`}
                          >
                            ×
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="space-y-1.5">
                <label className={labelCls}>Tagline</label>
                <input value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="Ex: Brindes que marcam." maxLength={160} className={inputCls} />
              </div>
              <div className="space-y-1.5">
                <label className={labelCls}>Descrição</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="O que a empresa faz, diferenciais…" rows={3} className={textareaCls} maxLength={800} />
              </div>
            </div>

            {error && <p role="alert" aria-live="polite" className={errorCls}>{error}</p>}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => {
                  const errs = computeFieldErrors();
                  const first = Object.entries(errs).find(([k]) => FIELD_STEP[k] === 0);
                  setFieldErrors(errs);
                  if (first) {
                    setError(first[1]);
                    return;
                  }
                  setError(null);
                  setActiveStep(1);
                }}
                className="inline-flex rounded-full bg-[#0F1A2E] px-6 py-3 text-sm font-bold text-white hover:bg-black"
              >
                Continuar → contactos
              </button>
            </div>
          </div>
        )}

        {activeStep === 1 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-[18px] font-black tracking-[-0.02em] text-[#0F1A2E]" style={{ fontFamily: "var(--font-display)" }}>
                Contactos verificados
              </h2>
              <p className="text-sm text-[#0F1A2E]/60">Verifica pelo menos um contacto com código de 6 dígitos.</p>
            </div>

            {msg && (
              <div className={`flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-medium ${msg.type === "success" ? "border border-[#0B5E56]/20 bg-[#0B5E56]/10 text-[#0B5E56]" : msg.type === "error" ? "border border-[#FF3B1F]/20 bg-[#FF3B1F]/10 text-[#7A1A0A]" : "border border-[#2563EB]/20 bg-[#2563EB]/10 text-[#1E40AF]"}`}>
                {msg.type === "success" && <span className="shrink-0">✓</span>}
                {msg.type === "error" && <span className="shrink-0">✕</span>}
                {msg.type === "info" && <span className="shrink-0">ℹ</span>}
                {msg.text}
              </div>
            )}
            {fieldErrors.contacts && <p role="alert" aria-live="polite" className={errorCls}>{fieldErrors.contacts}</p>}

            {/* WhatsApp */}
            <div className="rounded-2xl border border-[#D9D2C2] bg-white p-4">
              <label htmlFor="onb-whatsapp" className={labelCls}>WhatsApp</label>
              <div className="mt-1.5 flex gap-2">
                <InputGroup className="h-11 flex-1 rounded-lg border-[#D9D2C2] bg-[#F6F3EE] has-[[data-slot=input-group-control]:focus-visible]:border-[#0B5E56] has-[[data-slot=input-group-control]:focus-visible]:ring-2 has-[[data-slot=input-group-control]:focus-visible]:ring-[#0B5E56]/15 has-[[data-slot=input-group-control]:focus-visible]:bg-white">
                  <InputGroupAddon align="inline-start" className="border-r border-[#D9D2C2] pl-3">
                    <InputGroupText className="gap-1.5 text-[13px] font-semibold text-[#0F1A2E]/50">
                      <Phone className="size-3.5" />
                      +258
                    </InputGroupText>
                  </InputGroupAddon>
                  <InputGroupInput id="onb-whatsapp" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="82 000 0001" aria-invalid={!!fieldErrors.whatsapp} className="h-full px-3 text-[13px] text-[#0F1A2E] placeholder:text-[#0F1A2E]/35" />
                </InputGroup>
                <button type="button" onClick={() => sendOtp("whatsapp")} disabled={whatsappSending || !!whatsappVerifiedAt} className="shrink-0 rounded-lg border border-[#D9D2C2] bg-[#F6F3EE] px-4 text-xs font-bold text-[#0F1A2E] transition hover:bg-white hover:border-[#0B5E56] disabled:opacity-40 disabled:hover:bg-[#F6F3EE] disabled:hover:border-[#D9D2C2]">
                  {whatsappVerifiedAt ? "✓" : whatsappSending ? (
                    <span className="flex items-center gap-1.5"><span className="size-3 animate-spin rounded-full border-2 border-[#0F1A2E]/20 border-t-[#0F1A2E]" /> Enviar</span>
                  ) : timers.whatsapp ? "Reenviar" : "Enviar código"}
                </button>
              </div>
              {whatsappVerifiedAt ? (
                <p className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-[#0B5E56]/10 px-3 py-1 text-xs font-medium text-[#0B5E56]">
                  <span className="size-1.5 rounded-full bg-[#0B5E56]" /> {verifiedLabel(whatsappVerifiedAt, "whatsapp")}
                </p>
              ) : whatsappOtp ? (
                <div className="mt-3 space-y-2.5">
                  <div className="flex items-center gap-3">
                    <InputOTP maxLength={6} value={whatsappInput} onChange={setWhatsappInput} containerClassName="gap-1.5">
                      <InputOTPGroup className="gap-1.5">
                        {[0, 1, 2].map((i) => (
                          <InputOTPSlot key={i} index={i} className="size-10 rounded-lg border border-[#D9D2C2] bg-[#F6F3EE] text-base font-semibold text-[#0F1A2E] data-[active=true]:border-[#0B5E56] data-[active=true]:ring-2 data-[active=true]:ring-[#0B5E56]/15 data-[active=true]:bg-white" />
                        ))}
                      </InputOTPGroup>
                      <div className="flex items-center px-1 text-[#0F1A2E]/20">–</div>
                      <InputOTPGroup className="gap-1.5">
                        {[3, 4, 5].map((i) => (
                          <InputOTPSlot key={i} index={i} className="size-10 rounded-lg border border-[#D9D2C2] bg-[#F6F3EE] text-base font-semibold text-[#0F1A2E] data-[active=true]:border-[#0B5E56] data-[active=true]:ring-2 data-[active=true]:ring-[#0B5E56]/15 data-[active=true]:bg-white" />
                        ))}
                      </InputOTPGroup>
                    </InputOTP>
                    <button type="button" onClick={() => verifyOtp("whatsapp")} disabled={whatsappInput.length < 6} className="shrink-0 rounded-lg bg-[#0B5E56] px-5 py-2.5 text-xs font-bold text-white transition hover:bg-[#0A4A44] disabled:opacity-40">
                      Verificar
                    </button>
                  </div>
                  {timers.whatsapp && (
                    <p className="flex items-center gap-1.5 text-xs text-[#0F1A2E]/40">
                      <Clock className="size-3" /> Reenviar em {countdownLabel("whatsapp")}
                    </p>
                  )}
                </div>
              ) : null}
              {fieldErrors.whatsapp && <p role="alert" className={`mt-2 ${fieldErrCls}`}>{fieldErrors.whatsapp}</p>}
            </div>

            {/* Telefone */}
            <div className="rounded-2xl border border-[#D9D2C2] bg-white p-4">
              <label htmlFor="onb-phone" className={labelCls}>Telefone (chamadas)</label>
              <div className="mt-1.5 flex gap-2">
                <InputGroup className="h-11 flex-1 rounded-lg border-[#D9D2C2] bg-[#F6F3EE] has-[[data-slot=input-group-control]:focus-visible]:border-[#0B5E56] has-[[data-slot=input-group-control]:focus-visible]:ring-2 has-[[data-slot=input-group-control]:focus-visible]:ring-[#0B5E56]/15 has-[[data-slot=input-group-control]:focus-visible]:bg-white">
                  <InputGroupAddon align="inline-start" className="border-r border-[#D9D2C2] pl-3">
                    <InputGroupText className="gap-1.5 text-[13px] font-semibold text-[#0F1A2E]/50">
                      <Phone className="size-3.5" />
                      +258
                    </InputGroupText>
                  </InputGroupAddon>
                  <InputGroupInput id="onb-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="84 000 0000" aria-invalid={!!fieldErrors.phone} className="h-full px-3 text-[13px] text-[#0F1A2E] placeholder:text-[#0F1A2E]/35" />
                </InputGroup>
                <button type="button" onClick={() => sendOtp("phone")} disabled={phoneSending || !!phoneVerifiedAt} className="shrink-0 rounded-lg border border-[#D9D2C2] bg-[#F6F3EE] px-4 text-xs font-bold text-[#0F1A2E] transition hover:bg-white hover:border-[#0B5E56] disabled:opacity-40 disabled:hover:bg-[#F6F3EE] disabled:hover:border-[#D9D2C2]">
                  {phoneVerifiedAt ? "✓" : phoneSending ? (
                    <span className="flex items-center gap-1.5"><span className="size-3 animate-spin rounded-full border-2 border-[#0F1A2E]/20 border-t-[#0F1A2E]" /> Enviar</span>
                  ) : timers.phone ? "Reenviar" : "Enviar código"}
                </button>
              </div>
              {phoneVerifiedAt ? (
                <p className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-[#0B5E56]/10 px-3 py-1 text-xs font-medium text-[#0B5E56]">
                  <span className="size-1.5 rounded-full bg-[#0B5E56]" /> {verifiedLabel(phoneVerifiedAt, "phone")}
                </p>
              ) : phoneOtp ? (
                <div className="mt-3 space-y-2.5">
                  <div className="flex items-center gap-3">
                    <InputOTP maxLength={6} value={phoneInput} onChange={setPhoneInput} containerClassName="gap-1.5">
                      <InputOTPGroup className="gap-1.5">
                        {[0, 1, 2].map((i) => (
                          <InputOTPSlot key={i} index={i} className="size-10 rounded-lg border border-[#D9D2C2] bg-[#F6F3EE] text-base font-semibold text-[#0F1A2E] data-[active=true]:border-[#0B5E56] data-[active=true]:ring-2 data-[active=true]:ring-[#0B5E56]/15 data-[active=true]:bg-white" />
                        ))}
                      </InputOTPGroup>
                      <div className="flex items-center px-1 text-[#0F1A2E]/20">–</div>
                      <InputOTPGroup className="gap-1.5">
                        {[3, 4, 5].map((i) => (
                          <InputOTPSlot key={i} index={i} className="size-10 rounded-lg border border-[#D9D2C2] bg-[#F6F3EE] text-base font-semibold text-[#0F1A2E] data-[active=true]:border-[#0B5E56] data-[active=true]:ring-2 data-[active=true]:ring-[#0B5E56]/15 data-[active=true]:bg-white" />
                        ))}
                      </InputOTPGroup>
                    </InputOTP>
                    <button type="button" onClick={() => verifyOtp("phone")} disabled={phoneInput.length < 6} className="shrink-0 rounded-lg bg-[#0B5E56] px-5 py-2.5 text-xs font-bold text-white transition hover:bg-[#0A4A44] disabled:opacity-40">
                      Verificar
                    </button>
                  </div>
                  {timers.phone && (
                    <p className="flex items-center gap-1.5 text-xs text-[#0F1A2E]/40">
                      <Clock className="size-3" /> Reenviar em {countdownLabel("phone")}
                    </p>
                  )}
                </div>
              ) : null}
              {fieldErrors.phone && <p role="alert" className={`mt-2 ${fieldErrCls}`}>{fieldErrors.phone}</p>}
            </div>

            {/* Email */}
            <div className="rounded-2xl border border-[#D9D2C2] bg-white p-4">
              <label htmlFor="onb-email" className={labelCls}>Email da empresa</label>
              <div className="mt-1.5 flex gap-2">
                <Input id="onb-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="geral@empresa.co.mz" aria-invalid={!!fieldErrors.email} className="h-11 flex-1 rounded-lg border-[#D9D2C2] bg-[#F6F3EE] px-3 text-[13px] text-[#0F1A2E] placeholder:text-[#0F1A2E]/35 focus:border-[#0B5E56] focus:bg-white focus:ring-2 focus:ring-[#0B5E56]/15" />
                <button type="button" onClick={() => sendOtp("email")} disabled={emailSending || !!emailVerifiedAt} className="shrink-0 rounded-lg border border-[#D9D2C2] bg-[#F6F3EE] px-4 text-xs font-bold text-[#0F1A2E] transition hover:bg-white hover:border-[#0B5E56] disabled:opacity-40 disabled:hover:bg-[#F6F3EE] disabled:hover:border-[#D9D2C2]">
                  {emailVerifiedAt ? "✓" : emailSending ? (
                    <span className="flex items-center gap-1.5"><span className="size-3 animate-spin rounded-full border-2 border-[#0F1A2E]/20 border-t-[#0F1A2E]" /> Enviar</span>
                  ) : timers.email ? "Reenviar" : "Enviar código"}
                </button>
              </div>
              {emailVerifiedAt ? (
                <p className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-[#0B5E56]/10 px-3 py-1 text-xs font-medium text-[#0B5E56]">
                  <span className="size-1.5 rounded-full bg-[#0B5E56]" /> {verifiedLabel(emailVerifiedAt, "email")}
                </p>
              ) : emailOtp ? (
                <div className="mt-3 space-y-2.5">
                  <div className="flex items-center gap-3">
                    <InputOTP maxLength={6} value={emailInput} onChange={setEmailInput} containerClassName="gap-1.5">
                      <InputOTPGroup className="gap-1.5">
                        {[0, 1, 2].map((i) => (
                          <InputOTPSlot key={i} index={i} className="size-10 rounded-lg border border-[#D9D2C2] bg-[#F6F3EE] text-base font-semibold text-[#0F1A2E] data-[active=true]:border-[#0B5E56] data-[active=true]:ring-2 data-[active=true]:ring-[#0B5E56]/15 data-[active=true]:bg-white" />
                        ))}
                      </InputOTPGroup>
                      <div className="flex items-center px-1 text-[#0F1A2E]/20">–</div>
                      <InputOTPGroup className="gap-1.5">
                        {[3, 4, 5].map((i) => (
                          <InputOTPSlot key={i} index={i} className="size-10 rounded-lg border border-[#D9D2C2] bg-[#F6F3EE] text-base font-semibold text-[#0F1A2E] data-[active=true]:border-[#0B5E56] data-[active=true]:ring-2 data-[active=true]:ring-[#0B5E56]/15 data-[active=true]:bg-white" />
                        ))}
                      </InputOTPGroup>
                    </InputOTP>
                    <button type="button" onClick={() => verifyOtp("email")} disabled={emailInput.length < 6} className="shrink-0 rounded-lg bg-[#0B5E56] px-5 py-2.5 text-xs font-bold text-white transition hover:bg-[#0A4A44] disabled:opacity-40">
                      Verificar
                    </button>
                  </div>
                  {timers.email && (
                    <p className="flex items-center gap-1.5 text-xs text-[#0F1A2E]/40">
                      <Clock className="size-3" /> Reenviar em {countdownLabel("email")}
                    </p>
                  )}
                </div>
              ) : null}
              {fieldErrors.email && <p role="alert" className={`mt-2 ${fieldErrCls}`}>{fieldErrors.email}</p>}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="onb-website" className={labelCls}>Website (opcional)</label>
              <input id="onb-website" type="url" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://..." aria-invalid={!!fieldErrors.website} className={inputCls} />
              {fieldErrors.website && <p role="alert" className={fieldErrCls}>{fieldErrors.website}</p>}
            </div>

            {error && <p role="alert" aria-live="polite" className={errorCls}>{error}</p>}
            <div className="flex justify-between">
              <button type="button" onClick={() => setActiveStep(0)} className="rounded-full border border-[#D9D2C2] bg-white px-5 py-3 text-sm font-semibold text-[#0F1A2E] hover:bg-[#F6F3EE]">
                ← Voltar
              </button>
              <button
                type="button"
                onClick={() => {
                  const errs = computeFieldErrors();
                  const first = Object.entries(errs).find(([k]) => FIELD_STEP[k] === 1);
                  setFieldErrors(errs);
                  if (first) {
                    setError(first[1]);
                    return;
                  }
                  setError(null);
                  setActiveStep(2);
                }}
                className="rounded-full bg-[#0F1A2E] px-6 py-3 text-sm font-bold text-white hover:bg-black"
              >
                Continuar → presença
              </button>
            </div>
          </div>
        )}

        {activeStep === 2 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-[18px] font-black tracking-[-0.02em] text-[#0F1A2E]" style={{ fontFamily: "var(--font-display)" }}>
                Presença no ecossistema
              </h2>
              <p className="text-sm text-[#0F1A2E]/60">Onde a empresa aparece e é encontrada — localização e selos.</p>
            </div>

            {/* Categorias já escolhidas no passo 1 — resumo */}
            <div className="rounded-xl border border-[#D9D2C2] bg-[#F6F3EE] px-3 py-3">
              <p className={labelCls}>Categorias escolhidas</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {selectedCats.length === 0 ? (
                  <span className="text-xs text-[#0F1A2E]/50">Nenhuma — volta ao passo 1 para escolher</span>
                ) : (
                  selectedCats.map((id) => {
                    const cat = categories.find((c) => c.id === id);
                    return (
                      <span key={id} className="inline-flex rounded-full bg-[#0B5E56] px-2.5 py-1 text-xs font-medium text-white">
                        {cat?.name ?? id}
                      </span>
                    );
                  })
                )}
              </div>
              <button type="button" onClick={() => setActiveStep(0)} className="mt-2 text-xs font-bold text-[#0B5E56] hover:underline">
                ← Editar categoria
              </button>
            </div>

            {/* Localização Google — opcional, podes pular e completar depois no dashboard.
                A pesquisa por nome vive no passo 1; aqui só se ajusta a localização. */}
            <div className="space-y-3 rounded-2xl border border-[#D9D2C2] bg-[#F6F3EE] p-4">
              <div className="flex items-center justify-between">
                <p className={labelCls}>Localização no mapa</p>
                <span className="rounded-full border border-[#D9D2C2] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#0F1A2E]/50">Opcional</span>
              </div>

              {pickedPlaceLabel && (
                <p className="inline-flex flex-wrap items-center gap-2 rounded-full bg-[#0B5E56]/10 px-3 py-1.5 text-xs font-medium text-[#0B5E56]">
                  ✓ Dados pré-preenchidos de “{pickedPlaceLabel}” — revê e ajusta abaixo
                  <button type="button" onClick={clearLocation} className="font-bold hover:underline">
                    limpar
                  </button>
                </p>
              )}

              <LocationPicker
                initialLat={latitude}
                initialLng={longitude}
                onPick={({ lat, lng }) => {
                  setLatitude(lat);
                  setLongitude(lng);
                }}
                onAddressChange={(a) => {
                  if (a && !formattedAddress) setFormattedAddress(a);
                }}
              />

              {formattedAddress && (
                <p className="text-xs text-[#0F1A2E]/60">
                  <span className="font-semibold text-[#0F1A2E]">Morada:</span> {formattedAddress}
                </p>
              )}
              <p className="text-xs text-[#0F1A2E]/45">
                Não sabes agora? Podes pular — a localização exacta melhora a tua visibilidade em pesquisas nearby, mas não é obrigatória.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="onb-province" className={labelCls}>Província *</label>
                <Select value={province || null} onValueChange={(v) => setProvince((v as string) ?? "")}>
                  <SelectTrigger id="onb-province" aria-invalid={!!fieldErrors.province}>
                    <SelectValue placeholder="Seleccionar…" />
                  </SelectTrigger>
                  <SelectContent>
                    {PROVINCES.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fieldErrors.province && <p role="alert" className={fieldErrCls}>{fieldErrors.province}</p>}
              </div>
              <div className="space-y-1.5">
                <label htmlFor="onb-district" className={labelCls}>Distrito</label>
                <input id="onb-district" value={district} onChange={(e) => setDistrict(e.target.value)} placeholder="Ex: KaMpfumo" className={inputCls} />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="onb-bairro" className={labelCls}>Bairro / Zona</label>
                <input id="onb-bairro" value={bairro} onChange={(e) => setBairro(e.target.value)} placeholder="Ex: Sommerschield" className={inputCls} />
              </div>
              <div className="space-y-1.5">
                <label className={labelCls}>Tags de interesse</label>
                {tags.length > 0 ? (
                  <>
                    <div className="flex flex-wrap gap-1.5">
                      {tags.map((t) => {
                        const on = interestTags.includes(t.slug);
                        return (
                          <button
                            key={t.slug}
                            type="button"
                            disabled={!on && interestTags.length >= 10}
                            onClick={() =>
                              setInterestTags((prev) =>
                                on ? prev.filter((x) => x !== t.slug) : [...prev, t.slug],
                              )
                            }
                            className={
                              on
                                ? "rounded-full border border-[#0B5E56] bg-[#0B5E56] px-3 py-1.5 text-xs font-semibold text-white transition"
                                : "rounded-full border border-[#0F1A2E]/10 bg-[#F6F3EE] px-3 py-1.5 text-xs font-medium text-[#0F1A2E]/60 transition hover:border-[#0B5E56]/40 hover:text-[#0B5E56] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-[#0F1A2E]/10 disabled:hover:text-[#0F1A2E]/60"
                            }
                          >
                            {t.name}
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-xs text-[#0F1A2E]/50">
                      {interestTags.length}/10 seleccionadas — ajudam clientes a encontrar a empresa
                    </p>
                  </>
                ) : (
                  <p className="text-xs text-[#0F1A2E]/50">Sem tags disponíveis — podes adicioná-las depois no painel.</p>
                )}
              </div>
              <div className="space-y-1.5">
                <label className={labelCls}>Alvará / Licença</label>
                <input value={alvara} onChange={(e) => setAlvara(e.target.value)} placeholder="Ex: 12345/2024" className={inputCls} />
              </div>
              <div className="space-y-1.5">
                <label className={labelCls}>Licenças (vírgula)</label>
                <input value={licenses} onChange={(e) => setLicenses(e.target.value)} placeholder="Ex: ISO 9001" className={inputCls} />
              </div>
            </div>

            <div className="space-y-2">
              <p className={labelCls}>Horário de funcionamento</p>
              <div className="flex flex-wrap items-center gap-2">
                {BUSINESS_HOURS_OPTIONS.map((o) => {
                  const active = bhPreset === o;
                  return (
                    <button
                      key={o}
                      type="button"
                      onClick={() => {
                        // converte o preset para o formato canónico (Google periods) na hora
                        if (active) {
                          setBhPreset("");
                          setBusinessHours(null);
                        } else {
                          setBhPreset(o);
                          setBusinessHours(normalizeBusinessHours({ horario: o }));
                        }
                      }}
                      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${active ? "border-[#0B5E56] bg-[#0B5E56] text-white" : "border-[#D9D2C2] bg-white text-[#0F1A2E] hover:bg-[#F6F3EE]"}`}
                    >
                      {o}
                    </button>
                  );
                })}
              </div>
            </div>

            {error && <p role="alert" aria-live="polite" className={errorCls}>{error}</p>}
            <div className="flex justify-between">
              <button type="button" onClick={() => setActiveStep(1)} className="rounded-full border border-[#D9D2C2] bg-white px-5 py-3 text-sm font-semibold text-[#0F1A2E] hover:bg-[#F6F3EE]">
                ← Voltar
              </button>
              <button
                type="submit"
                disabled={loading || logoUploading}
                className="rounded-full bg-[#FF3B1F] px-6 py-3 text-sm font-bold text-white shadow-[0_4px_16px_rgba(255,59,31,0.25)] hover:bg-[#E8350F] disabled:opacity-50"
              >
                {loading ? progressLabel || "A publicar…" : logoUploading ? "A carregar logótipo…" : "Criar perfil da empresa"}
              </button>
            </div>
          </div>
        )}

        {activeStep === 3 && (
          <div className="space-y-4">
            <h2 className="text-[18px] font-black tracking-[-0.02em] text-[#0F1A2E]" style={{ fontFamily: "var(--font-display)" }}>
              Queres pedir verificação?
            </h2>
            <p className="text-sm text-[#0F1A2E]/60">Selo “Verificado” desbloqueia confiança máxima. Podes saltar e pedir depois.</p>
            <div className="grid gap-3">
              <button
                type="button"
                onClick={() => setWantVerification(true)}
                className={`rounded-2xl border p-4 text-left transition ${wantVerification === true ? "border-[#0B5E56] bg-[#0B5E56]/5" : "border-[#D9D2C2] bg-white hover:bg-[#F6F3EE]"}`}
              >
                <p className="text-sm font-bold text-[#0F1A2E]">Sim, pedir agora</p>
                <p className="text-xs text-[#0F1A2E]/60">Recomendado — 24–48h úteis. Contactos já verificados dão prioridade.</p>
                {(whatsappVerifiedAt || phoneVerifiedAt || emailVerifiedAt) && (
                  <p className="mt-2 text-xs font-medium text-[#0B5E56]">
                    ✓{" "}
                    {whatsappVerifiedAt
                      ? verifiedLabel(whatsappVerifiedAt, "whatsapp")
                      : phoneVerifiedAt
                        ? verifiedLabel(phoneVerifiedAt, "phone")
                        : verifiedLabel(emailVerifiedAt!, "email")}
                  </p>
                )}
              </button>
              <button
                type="button"
                onClick={() => setWantVerification(false)}
                className={`rounded-2xl border p-4 text-left transition ${wantVerification === false ? "border-[#0B5E56] bg-[#0B5E56]/5" : "border-[#D9D2C2] bg-white hover:bg-[#F6F3EE]"}`}
              >
                <p className="text-sm font-bold text-[#0F1A2E]">Fazer depois</p>
                <p className="text-xs text-[#0F1A2E]/60">Vais directo para o painel.</p>
              </button>
            </div>
            {wantVerification === true && (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className={labelCls}>Nível de verificação</label>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => setVerifyLevel("level1")}
                      className={`rounded-xl border p-3 text-left transition ${verifyLevel === "level1" ? "border-[#0B5E56] bg-[#0B5E56]/5" : "border-[#D9D2C2] bg-white"}`}
                    >
                      <span className="block text-sm font-bold text-[#0F1A2E]">1º grau — Verificado</span>
                      <span className="mt-0.5 block text-xs leading-snug text-[#0F1A2E]/55">Todos os documentos de registo legal.</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setVerifyLevel("level2")}
                      className={`rounded-xl border p-3 text-left transition ${verifyLevel === "level2" ? "border-[#1F5C99] bg-[#1F5C99]/5" : "border-[#D9D2C2] bg-white"}`}
                    >
                      <span className="block text-sm font-bold text-[#0F1A2E]">2º grau — Em legalização</span>
                      <span className="mt-0.5 block text-xs leading-snug text-[#0F1A2E]/55">Ainda em processo de legalização.</span>
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className={labelCls}>Nota / link do documento (opcional)</label>
                  <input value={docNote} onChange={(e) => setDocNote(e.target.value)} placeholder="Ex: NUIT, alvará ou link Drive" className={inputCls} />
                </div>
              </div>
            )}
            {error && <p role="alert" aria-live="polite" className={errorCls}>{error}</p>}
            <div className="flex justify-between">
              <button type="button" onClick={() => setActiveStep(2)} className="rounded-full border border-[#D9D2C2] bg-white px-5 py-3 text-sm font-semibold text-[#0F1A2E] hover:bg-[#F6F3EE]">
                ← Voltar
              </button>
              <div className="flex gap-2">
                <button type="button" onClick={() => handleVerification(true)} className="rounded-full border border-[#D9D2C2] bg-white px-5 py-3 text-sm font-medium text-[#0F1A2E]/60 hover:text-[#0F1A2E]">
                  Saltar
                </button>
                <button
                  type="button"
                  disabled={loading || wantVerification === null}
                  onClick={() => {
                    if (wantVerification !== null) handleVerification(!wantVerification);
                  }}
                  className={`rounded-full px-6 py-3 text-sm font-bold text-white disabled:opacity-50 ${wantVerification ? "bg-[#FF3B1F] hover:bg-[#E8350F]" : "bg-[#0F1A2E] hover:bg-black"}`}
                >
                  {loading ? "A processar…" : wantVerification ? "Pedir verificação" : "Ir para painel"}
                </button>
              </div>
            </div>
          </div>
        )}
        </div>
        <p className="mt-6 text-center text-xs text-[#0F1A2E]/35">Podes completar ou editar tudo depois no painel. Sem fidelização.</p>
      </form>
    </div>
  );
}
