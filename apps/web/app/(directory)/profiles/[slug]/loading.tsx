export default function Loading() {
  return (
    <div className="bg-[#F6F3EE] min-h-screen" aria-busy="true" aria-live="polite">
      <span className="sr-only">A carregar perfil…</span>

      {/* banner skeleton */}
      <div className="mx-auto max-w-[1160px] px-4 pt-6 sm:px-6">
        <div className="flex items-center gap-3 rounded-[16px] border border-[#D9D2C2] bg-white px-4 py-3.5 sm:px-5">
          <div className="size-8 shrink-0 animate-pulse rounded-full bg-[#D9D2C2]" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-40 animate-pulse rounded-full bg-[#D9D2C2]/70" />
            <div className="h-2.5 w-full max-w-[640px] animate-pulse rounded-full bg-[#D9D2C2]/40" />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1160px] px-4 py-6 sm:px-6">
        {/* HERO — replica exacta da estrutura da página, em skeleton */}
        <div className="overflow-hidden rounded-[28px] border border-[#D9D2C2] bg-white">
          <div className="h-[4px] w-full bg-[#D9D2C2]/60" />
          <div className="relative h-[132px] overflow-hidden bg-[#0F1A2E] sm:h-[168px]">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-[0.06]"
              style={{
                backgroundImage: "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
                backgroundSize: "48px 48px",
              }}
            />
            <div className="absolute -bottom-10 left-5 flex items-end gap-3 sm:left-7">
              <div className="size-[84px] animate-pulse rounded-[18px] border-[3px] border-white bg-[#D9D2C2] shadow-[0_8px_24px_rgba(15,26,46,0.18)] sm:size-[96px]" />
              <div className="mb-2 h-6 w-24 animate-pulse rounded-full bg-white/70" />
            </div>
          </div>

          <div className="grid gap-6 px-5 pb-6 pt-12 sm:grid-cols-[1.35fr_0.7fr] sm:px-7 sm:pb-7">
            <div className="min-w-0 space-y-3">
              <div className="h-3 w-64 animate-pulse rounded-full bg-[#D9D2C2]/60" />
              <div className="h-8 w-[78%] animate-pulse rounded-lg bg-[#0F1A2E]/10" />
              <div className="h-4 w-[92%] animate-pulse rounded-full bg-[#D9D2C2]/40" />
              <div className="flex flex-wrap gap-1.5 pt-1">
                <span className="h-7 w-20 animate-pulse rounded-full bg-[#F6F3EE] ring-1 ring-[#D9D2C2]" />
                <span className="h-7 w-24 animate-pulse rounded-full bg-[#F6F3EE] ring-1 ring-[#D9D2C2]" />
                <span className="h-7 w-16 animate-pulse rounded-full bg-[#F6F3EE] ring-1 ring-[#D9D2C2]" />
                <span className="h-7 w-28 animate-pulse rounded-full bg-[#0F1A2E]/10" />
              </div>
            </div>
            <div className="flex flex-col gap-3 sm:items-end">
              <div className="flex items-center gap-2">
                <span className="size-11 animate-pulse rounded-full bg-[#0B5E56]/20" />
                <span className="size-11 animate-pulse rounded-full bg-[#D9D2C2]/60" />
                <span className="size-11 animate-pulse rounded-full bg-[#D9D2C2]/60" />
                <span className="hidden size-11 animate-pulse rounded-full bg-[#D9D2C2]/40 sm:inline-flex" />
              </div>
              <div className="h-3 w-40 animate-pulse rounded-full bg-[#D9D2C2]/40" />
            </div>
          </div>

          <div className="grid grid-cols-3 divide-x divide-[#D9D2C2] border-t border-[#D9D2C2] bg-[#F6F3EE]/70 text-center">
            <div className="space-y-2 px-3 py-4">
              <div className="mx-auto h-2.5 w-20 animate-pulse rounded-full bg-[#D9D2C2]/60" />
              <div className="mx-auto h-4 w-12 animate-pulse rounded bg-[#0F1A2E]/10" />
              <div className="mx-auto h-2.5 w-14 animate-pulse rounded-full bg-[#D9D2C2]/40" />
            </div>
            <div className="space-y-2 px-3 py-4">
              <div className="mx-auto h-2.5 w-20 animate-pulse rounded-full bg-[#D9D2C2]/60" />
              <div className="mx-auto h-4 w-10 animate-pulse rounded bg-[#0F1A2E]/10" />
              <div className="mx-auto h-2.5 w-16 animate-pulse rounded-full bg-[#D9D2C2]/40" />
            </div>
            <div className="space-y-2 px-3 py-4">
              <div className="mx-auto h-2.5 w-16 animate-pulse rounded-full bg-[#D9D2C2]/60" />
              <div className="mx-auto h-4 w-16 animate-pulse rounded bg-[#0F1A2E]/10" />
              <div className="mx-auto h-2.5 w-20 animate-pulse rounded-full bg-[#D9D2C2]/40" />
            </div>
          </div>
        </div>

        {/* corpo — espelha grid 1.6fr / 0.9fr da página real */}
        <div className="mt-6 grid gap-6 lg:grid-cols-[1.6fr_0.9fr]">
          <div className="space-y-6">
            <section className="rounded-[22px] border border-[#D9D2C2] bg-white p-6 sm:p-7">
              <div className="h-3 w-14 animate-pulse rounded-full bg-[#0B5E56]/15" />
              <div className="mt-3 h-6 w-36 animate-pulse rounded bg-[#0F1A2E]/10" />
              <div className="mt-4 space-y-2">
                <div className="h-3 w-full animate-pulse rounded-full bg-[#D9D2C2]/50" />
                <div className="h-3 w-full animate-pulse rounded-full bg-[#D9D2C2]/30" />
                <div className="h-3 w-[82%] animate-pulse rounded-full bg-[#D9D2C2]/30" />
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                <span className="h-7 w-28 animate-pulse rounded-full bg-[#0F1A2E]/10" />
                <span className="h-7 w-32 animate-pulse rounded-full bg-[#F6F3EE] ring-1 ring-[#D9D2C2]" />
                <span className="h-7 w-36 animate-pulse rounded-full bg-white ring-1 ring-[#D9D2C2]" />
              </div>
            </section>

            <section className="overflow-hidden rounded-[22px] border border-[#D9D2C2] bg-white">
              <div className="flex items-center justify-between gap-3 border-b border-[#D9D2C2] bg-[#F6F3EE]/60 px-6 py-4 sm:px-7">
                <div className="space-y-2">
                  <div className="h-3 w-24 animate-pulse rounded-full bg-[#0B5E56]/15" />
                  <div className="h-5 w-32 animate-pulse rounded bg-[#0F1A2E]/10" />
                </div>
                <div className="h-6 w-24 animate-pulse rounded-full bg-[#0B5E56]" />
              </div>
              <div className="flex flex-col gap-6 p-6 sm:p-7">
                <div className="flex flex-col items-center gap-3">
                  <div className="size-[148px] animate-pulse rounded-full border border-[#D9D2C2] bg-[#F6F3EE] sm:size-[168px]" />
                  <div className="h-3 w-40 animate-pulse rounded-full bg-[#D9D2C2]/60" />
                  <div className="h-2.5 w-20 animate-pulse rounded-full bg-[#D9D2C2]/40" />
                </div>
                <div className="space-y-2.5">
                  <div className="h-3 w-44 animate-pulse rounded-full bg-[#0B5E56]/15" />
                  <div className="grid gap-2.5 sm:grid-cols-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="flex gap-3 rounded-2xl border border-[#D9D2C2] bg-[#F6F3EE] p-3.5">
                        <span className="mt-1 size-2 rounded-full bg-[#D9D2C2]" />
                        <div className="flex-1 space-y-2">
                          <div className="h-3 w-28 animate-pulse rounded bg-[#0F1A2E]/10" />
                          <div className="h-2.5 w-full animate-pulse rounded-full bg-[#D9D2C2]/40" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-2.5">
                  <div className="h-3 w-28 animate-pulse rounded-full bg-[#0F1A2E]/10" />
                  <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="flex gap-3 rounded-2xl border border-[#D9D2C2] bg-white p-3.5">
                        <span className="mt-1 size-2 rounded-full bg-[#D9D2C2]" />
                        <div className="flex-1 space-y-2">
                          <div className="h-3 w-16 animate-pulse rounded bg-[#0F1A2E]/10" />
                          <div className="h-2.5 w-full animate-pulse rounded-full bg-[#D9D2C2]/40" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="h-12 animate-pulse bg-[#0F1A2E]" />
            </section>

            <section className="rounded-[22px] border border-[#D9D2C2] bg-white p-6 sm:p-7">
              <div className="h-3 w-20 animate-pulse rounded-full bg-[#0B5E56]/15" />
              <div className="mt-2 h-5 w-36 animate-pulse rounded bg-[#0F1A2E]/10" />
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="overflow-hidden rounded-2xl border border-[#D9D2C2] bg-white">
                    <div className="h-[148px] animate-pulse bg-[#F6F3EE]" />
                    <div className="space-y-2 p-4">
                      <div className="h-3 w-[85%] animate-pulse rounded bg-[#0F1A2E]/10" />
                      <div className="h-2.5 w-[60%] animate-pulse rounded-full bg-[#D9D2C2]/40" />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="space-y-6 lg:sticky lg:top-6 lg:self-start">
            <section className="rounded-[22px] border border-[#D9D2C2] bg-white p-6">
              <div className="h-3 w-20 animate-pulse rounded-full bg-[#0B5E56]/15" />
              <div className="mt-2 h-5 w-40 animate-pulse rounded bg-[#0F1A2E]/10" />
              <div className="mt-4 grid gap-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-2xl border border-[#D9D2C2] bg-[#F6F3EE] p-3">
                    <span className="size-9 shrink-0 animate-pulse rounded-full bg-white ring-1 ring-[#D9D2C2]" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-2.5 w-16 animate-pulse rounded-full bg-[#D9D2C2]/60" />
                      <div className="h-3 w-32 animate-pulse rounded bg-[#0F1A2E]/10" />
                    </div>
                    <span className="h-7 w-16 animate-pulse rounded-full bg-white ring-1 ring-[#D9D2C2]" />
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-2xl border border-[#D9D2C2] bg-[#F6F3EE] p-4">
                <div className="h-2.5 w-14 animate-pulse rounded-full bg-[#0F1A2E]/10" />
                <div className="mt-3 h-3 w-[85%] animate-pulse rounded bg-[#0F1A2E]/10" />
                <div className="mt-2 h-3 w-[70%] animate-pulse rounded-full bg-[#D9D2C2]/40" />
                <div className="mt-3 h-[132px] animate-pulse rounded-xl border border-[#D9D2C2] bg-white" />
              </div>
            </section>

            <section className="rounded-[22px] bg-[#0F1A2E] p-6">
              <div className="h-2.5 w-16 animate-pulse rounded-full bg-white/15" />
              <div className="mt-3 h-5 w-[82%] animate-pulse rounded bg-white/15" />
              <div className="mt-3 h-3 w-full animate-pulse rounded-full bg-white/10" />
              <div className="mt-2 h-3 w-[78%] animate-pulse rounded-full bg-white/10" />
              <div className="mt-5 h-11 w-full animate-pulse rounded-full bg-white/15" />
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
