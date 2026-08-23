import Link from "next/link";

export default function OrgNotFound() {
  return (
    <div className="mx-auto w-full max-w-[640px] rounded-[20px] border border-[#D9D2C2] bg-white p-8 text-center">
      <p className="text-[11px] font-bold tracking-[0.14em] text-[#0B5E56]">ORGANIZAÇÃO NÃO ENCONTRADA</p>
      <h1 className="mt-2 text-[22px] font-black text-[#0F1A2E]" style={{ fontFamily: "var(--font-display)" }}>
        Sem acesso a esta organização
      </h1>
      <p className="mt-2 text-sm text-[#0F1A2E]/60">Verifica o link ou pede acesso ao proprietário.</p>
      <Link href="/dashboard" className="mt-4 inline-flex rounded-full bg-[#0F1A2E] px-5 py-2 text-xs font-bold text-white hover:bg-black">
        Voltar ao painel
      </Link>
    </div>
  );
}
