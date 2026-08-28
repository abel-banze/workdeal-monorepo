import Link from "next/link";

export default function NotFound() {
  return (
    <section className="bg-[#F6F3EE]">
      <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8 py-20 text-center">
        <p className="inline-flex items-center gap-2 rounded-full bg-white border border-[#D9D2C2] px-3 py-1 text-xs font-bold tracking-widest text-[#0F1A2E]/60">
          <span className="size-1.5 rounded-full bg-[#FF3B1F]" /> NÃO ENCONTRADO
        </p>
        <h1 className="mt-4 text-2xl font-black tracking-tight text-[#0F1A2E]" style={{ fontFamily: "var(--font-display)" }}>
          Esta requisição não existe ou já foi removida
        </h1>
        <Link href="/tasks" className="mt-6 inline-flex h-11 items-center rounded-full bg-[#0F1A2E] px-6 text-sm font-bold text-white hover:bg-black">
          ← Ver requisições
        </Link>
      </div>
    </section>
  );
}