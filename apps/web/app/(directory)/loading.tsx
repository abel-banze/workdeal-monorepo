export default function Loading() {
  return (
    <div className="bg-[#F6F3EE] min-h-screen" aria-busy="true" aria-live="polite">
      <span className="sr-only">A carregar experiência Workdeal…</span>
      {/* HERO skeleton */}
      <section className="border-b border-[#D9D2C2] bg-[#F6F3EE]">
        <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8">
          <div className="grid gap-10 py-10 lg:grid-cols-[1.08fr_0.92fr] lg:items-center lg:py-16">
            <div className="space-y-4">
              <div className="h-6 w-64 animate-pulse rounded-full bg-white ring-1 ring-[#D9D2C2]" />
              <div className="h-14 w-[85%] animate-pulse rounded-xl bg-[#0F1A2E]/10" />
              <div className="h-6 w-[70%] animate-pulse rounded-lg bg-[#0F1A2E]/5" />
              <div className="h-12 w-full max-w-[480px] animate-pulse rounded-full bg-white ring-1 ring-[#D9D2C2]" />
              <div className="flex gap-2 pt-2">
                <span className="h-6 w-24 animate-pulse rounded-full bg-white ring-1 ring-[#D9D2C2]" />
                <span className="h-6 w-28 animate-pulse rounded-full bg-white ring-1 ring-[#D9D2C2]" />
                <span className="h-6 w-20 animate-pulse rounded-full bg-white ring-1 ring-[#D9D2C2]" />
              </div>
            </div>
            <div className="rounded-[20px] border border-[#D9D2C2] bg-white p-3 shadow-[0_12px_40px_rgba(15,26,46,0.08)]">
              <div className="h-[260px] animate-pulse rounded-[14px] bg-[#F6F3EE]" />
              <div className="mt-3 grid gap-3">
                <div className="h-16 animate-pulse rounded-xl bg-[#F6F3EE]" />
                <div className="h-16 animate-pulse rounded-xl bg-[#F6F3EE]" />
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* CATEGORIAS skeleton */}
      <section className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8 py-10">
        <div className="h-3 w-40 animate-pulse rounded-full bg-[#0B5E56]/15" />
        <div className="mt-3 h-7 w-72 animate-pulse rounded-lg bg-[#0F1A2E]/10" />
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-white ring-1 ring-[#D9D2C2]" />
          ))}
        </div>
      </section>
      {/* EMPRESAS skeleton */}
      <section className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8 py-10">
        <div className="h-6 w-64 animate-pulse rounded bg-[#0F1A2E]/10" />
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-[#D9D2C2] bg-white p-5">
              <div className="flex gap-4">
                <div className="size-12 animate-pulse rounded-full bg-[#F6F3EE] ring-1 ring-[#D9D2C2]" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-32 animate-pulse rounded bg-[#F6F3EE]" />
                  <div className="h-2 w-48 animate-pulse rounded bg-[#F6F3EE]/80" />
                  <div className="flex gap-1.5 pt-1">
                    <span className="h-5 w-16 animate-pulse rounded-full bg-[#F6F3EE] ring-1 ring-[#D9D2C2]" />
                    <span className="h-5 w-20 animate-pulse rounded-full bg-[#F6F3EE] ring-1 ring-[#D9D2C2]" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
