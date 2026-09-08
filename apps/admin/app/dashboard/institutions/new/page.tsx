import { InstitutionForm } from "../institution-form";

export const metadata = {
  title: "Nova instituição | Workdeal Admin",
};

export default function NewInstitutionPage() {
  return (
    <div className="space-y-5">
      <div>
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#0B5E56]">Instituições · Criar</p>
        <h1 className="mt-2 text-2xl font-black leading-tight tracking-[-0.04em] text-[#0F1A2E] sm:text-[26px]" style={{ fontFamily: "var(--font-display)" }}>
          Nova instituição
        </h1>
        <p className="mt-1 max-w-xl text-sm text-[#0F1A2E]/50">
          Regista uma associação, câmara de comércio, ONG ou entidade pública no directório.
        </p>
      </div>
      <InstitutionForm mode="create" />
    </div>
  );
}