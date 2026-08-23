"use client";

export default function OrgDashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto w-full max-w-[640px] rounded-[20px] border border-[#FF3B1F]/20 bg-white p-6 text-center">
      <p className="text-sm font-bold text-[#7A1A0A]">Erro ao carregar organização</p>
      <p className="mt-1 text-xs text-[#0F1A2E]/60">{error.message}</p>
      <button onClick={() => reset()} className="mt-4 inline-flex rounded-full bg-[#0F1A2E] px-5 py-2 text-xs font-bold text-white hover:bg-black">
        Tentar novamente
      </button>
    </div>
  );
}
