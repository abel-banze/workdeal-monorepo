import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSession } from "@/lib/auth";
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
  verificationStatus: string;
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

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F6F3EE] px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <span className="inline-block rounded-lg bg-[#0B5E56] px-4 py-2 text-lg font-black tracking-tight text-white">
            workdeal
          </span>
          <p className="mt-3 text-xs font-bold uppercase tracking-[0.2em] text-[#0B5E56]">Completar registo</p>
        </div>

        <div className="rounded-2xl border border-[#D9D2C2] bg-white p-6 shadow-sm">
          <h1 className="text-xl font-black text-[#0F1A2E]">{company.name}</h1>
          {company.formattedAddress && (
            <p className="mt-1 text-sm text-[#0F1A2E]/60">📍 {company.formattedAddress}</p>
          )}
          <p className="mt-3 text-sm leading-relaxed text-[#0F1A2E]/70">
            A tua empresa foi pré-registada no Workdeal pela nossa equipa. Cria a tua conta para completar o perfil e
            ficares disponível para clientes encontrarem e contactarem o teu negócio.
          </p>

          <div className="mt-5">
            <CompleteForm
              token={token}
              companyName={company.name}
              prefilledName={company.contactName}
              isLoggedIn={!!session}
            />
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-[#0F1A2E]/50">
          Já tens conta?{" "}
          <Link href="/login" className="font-semibold text-[#0B5E56] underline underline-offset-2">
            Entra primeiro
          </Link>
          {" "}e volta a abrir este link.
        </p>
      </div>
    </main>
  );
}
