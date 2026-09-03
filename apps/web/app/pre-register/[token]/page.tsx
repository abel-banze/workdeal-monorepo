import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSession } from "@/lib/auth";
import { getCategories } from "@/lib/profiles";
import { CompleteForm } from "./complete-form";

export const metadata = {
  title: "Completar registo | Workdeal",
};

interface PreRegisterCompany {
  id: string;
  name: string;
  slug: string;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  formattedAddress: string | null;
  province: string | null;
  city: string | null;
  logoUrl: string | null;
  categorySlugs: string[];
  preRegisteredAt: string | null;
  verificationStatus: string;
}

function formatPreRegisteredAt(value: string | null): string {
  if (!value) return "recentemente";
  try {
    return new Intl.DateTimeFormat("pt-PT", { day: "2-digit", month: "long", year: "numeric" }).format(new Date(value));
  } catch {
    return value;
  }
}

export default async function PreRegisterPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  let company: PreRegisterCompany | null = null;
  try {
    const { apiFetch } = await import("@/lib/api");
    const res = await apiFetch<PreRegisterCompany>(`/api/v1/pre-register/${encodeURIComponent(token)}`, {
      cache: "no-store",
    });
    company = res.data ?? null;
  } catch {
    company = null;
  }

  if (!company) {
    notFound();
  }

  const session = await getServerSession();
  const initials = company.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
  const location = [company.city, company.province].filter(Boolean).join(", ") || company.formattedAddress || null;
  const allCategories = await getCategories().catch(() => ({ data: [] as { id: string; name: string; slug: string }[] }));
  const categoryLabel = new Map((allCategories.data ?? []).map((c) => [c.slug, c.name]));
  const categories = (company.categorySlugs ?? [])
    .map((s) => categoryLabel.get(s) ?? s)
    .filter(Boolean)
    .slice(0, 3);

  return (
    <div className="min-h-dvh bg-[#F6F3EE]">
      <div className="grid min-h-dvh lg:grid-cols-[1fr_1fr]">
        {/* LEFT — convite da equipa, personalizado à empresa */}
        <div className="relative hidden overflow-hidden bg-[#0F1A2E] text-white lg:flex lg:flex-col">
          <div className="absolute top-0 inset-x-0 h-[3px] bg-[#FF3B1F]" />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.06]"
            style={{
              backgroundImage: `linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)`,
              backgroundSize: "56px 56px",
            }}
          />
          <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 size-[520px] rounded-full bg-[#FF3B1F]/20 blur-[60px]" />
          <div aria-hidden className="pointer-events-none absolute -left-32 bottom-0 size-[460px] rounded-full bg-[#0B5E56]/20 blur-[60px]" />

          <div className="relative flex flex-1 flex-col px-10 py-8 xl:px-12">
            <Link href="/" className="flex items-center gap-3">
              <Image src="/logo.png" alt="Workdeal" width={36} height={36} className="size-9 object-contain" priority />
              <span className="flex flex-col leading-none">
                <span className="font-black tracking-[-0.04em] text-[18px]">WORKDEAL</span>
                <span className="text-[10px] tracking-[0.22em] font-semibold text-white/60 -mt-[1px]">PLATAFORMA GLOBAL</span>
              </span>
            </Link>

            <div className="mt-10 flex-1">
              <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-bold tracking-[0.14em] text-white/80">
                <span className="size-1.5 rounded-full bg-[#FF3B1F]" aria-hidden />
                CONVITE DA EQUIPA WORKDEAL
              </p>
              <h1 className="mt-5 text-[34px] font-black leading-[0.95] tracking-[-0.05em] xl:text-[42px]" style={{ fontFamily: "var(--font-display)" }}>
                O seu negócio
                <br />
                foi pré-registado.
                <br />
                <span className="font-light text-white/85">Reclame-o agora.</span>
              </h1>
              <p className="mt-4 max-w-[440px] text-[15px] leading-relaxed text-white/60">
                A Workdeal pré-registou a <span className="font-semibold text-white/90">{company.name}</span> na plataforma. Crie a sua conta e prepare o perfil para começar a aparecer para clientes perto de si.
              </p>

              <div className="mt-8 flex items-center gap-2 rounded-full bg-white/[0.03] px-3 py-1.5 text-[11px] font-semibold tracking-[0.12em] text-white/40">
                <span>SEM CUSTOS</span>
                <span className="size-1 rounded-full bg-white/20" />
                <span>CONTACTO DIRECTO</span>
                <span className="size-1 rounded-full bg-white/20" />
                <span>VERIFICADO PELA EQUIPA</span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-6 text-[11px] font-semibold tracking-[0.14em] text-white/30">
              <span>GLOBAL</span>
              <span className="size-1 rounded-full bg-white/20" />
              <span>DIGITAL</span>
              <span className="size-1 rounded-full bg-white/20" />
              <span>SEM FRONTEIRAS</span>
            </div>
          </div>
        </div>

        {/* RIGHT — reclamação da empresa + conta */}
        <div className="flex flex-col">
          {/* mobile header */}
          <div className="flex items-center justify-between border-b border-[#D9D2C2] bg-[#F6F3EE]/80 px-6 py-4 backdrop-blur lg:hidden">
            <Link href="/" className="flex items-center gap-2.5">
              <Image src="/logo.png" alt="Workdeal" width={32} height={32} className="size-8 object-contain" />
              <span className="font-black tracking-[-0.04em] text-[#0F1A2E]">WORKDEAL</span>
            </Link>
            <Link href="/login" className="text-xs font-semibold text-[#0F1A2E]/60 hover:text-[#0F1A2E]">
              Entrar →
            </Link>
          </div>

          <div className="flex flex-1 items-center justify-center px-4 py-8 sm:px-6 lg:px-10">
            <div className="w-full max-w-[480px]">
              {/* cartão de identidade da empresa — o momento central do convite */}
              <div className="mb-6 rounded-[24px] border border-[#D9D2C2] bg-white p-5 shadow-[0_12px_40px_rgba(15,26,46,0.08)]">
                <div className="flex items-start gap-4">
                  <div className="relative flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[#D9D2C2] bg-[#F6F3EE] text-[17px] font-black tracking-[-0.02em] text-[#0F1A2E]">
                    {company.logoUrl ? (
                      <Image src={company.logoUrl} alt={`${company.name} logótipo`} fill sizes="56px" className="object-cover" />
                    ) : (
                      initials
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="inline-flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[#B27300]">
                      <span className="size-1.5 animate-pulse rounded-full bg-[#FFB020]" aria-hidden />
                      Pré-registada · {formatPreRegisteredAt(company.preRegisteredAt)}
                    </p>
                    <h2 className="mt-1 truncate text-[20px] font-black tracking-[-0.03em] text-[#0F1A2E]" style={{ fontFamily: "var(--font-display)" }}>
                      {company.name}
                    </h2>
                    {location && <p className="mt-0.5 truncate text-[13px] text-[#0F1A2E]/55">📍 {location}</p>}
                  </div>
                </div>

                {categories.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-1.5 border-t border-[#D9D2C2]/60 pt-3">
                    {categories.map((c) => (
                      <span key={c} className="inline-flex rounded-full border border-[#D9D2C2] bg-[#F6F3EE] px-2.5 py-1 text-[11px] font-semibold text-[#0F1A2E]/70">
                        {c}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-[24px] border border-[#D9D2C2] bg-white p-6 shadow-[0_12px_40px_rgba(15,26,46,0.08)] sm:p-8">
                <div className="mb-6">
                  <div className="hidden lg:inline-flex items-center gap-2 rounded-full border border-[#0F1A2E]/10 bg-[#F6F3EE] px-3 py-1 text-[11px] font-bold tracking-[0.14em] text-[#0F1A2E]/60">
                    <span className="size-1.5 rounded-full bg-[#0B5E56]" /> CRIAR A SUA CONTA
                  </div>
                  <h2 className="mt-3 text-[22px] font-black tracking-[-0.03em] text-[#0F1A2E]" style={{ fontFamily: "var(--font-display)" }}>
                    Completar registo
                  </h2>
                  <p className="mt-1 text-sm text-[#0F1A2E]/60">Defina os seus dados para assumir a conta da empresa.</p>
                </div>

                <CompleteForm
                  token={token}
                  companyName={company.name}
                  prefilledName={company.contactName}
                  prefilledPhone={company.contactPhone}
                  isLoggedIn={!!session}
                />
              </div>

              <p className="mt-6 text-center text-xs text-[#0F1A2E]/40">
                Ao criar a conta, concorda com os Termos e a Política de Privacidade.
              </p>
              <p className="mt-3 text-center text-xs">
                <Link href="/" className="font-medium text-[#0F1A2E]/40 hover:text-[#0F1A2E]/70">
                  ← Voltar à página inicial
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}