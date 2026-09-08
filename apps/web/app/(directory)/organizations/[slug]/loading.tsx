export default function InstitutionLoading() {
  return (
    <div className="bg-[#F6F3EE] min-h-screen">
      <div className="mx-auto max-w-[1160px] px-4 py-6 sm:px-6">
        <div className="mb-4 h-3 w-48 animate-pulse rounded bg-[#0B5E56]/10" />
        <div className="overflow-hidden rounded-[28px] border border-[#D9D2C2] bg-white">
          <div className="h-[4px] w-full bg-[#D9D2C2]/60" />
          <div className="relative h-[168px] animate-pulse bg-[#0F1A2E]">
            <div className="absolute -bottom-10 left-5 sm:left-7">
              <div className="size-24 animate-pulse rounded-[18px] border-[3px] border-white bg-[#F6F3EE]" />
            </div>
          </div>
          <div className="grid gap-6 px-5 pb-6 pt-12 sm:grid-cols-[1.35fr_0.7fr] sm:px-7">
            <div className="space-y-3">
              <div className="h-3 w-52 animate-pulse rounded bg-[#F6F3EE]" />
              <div className="h-8 w-72 animate-pulse rounded bg-[#F6F3EE]" />
              <div className="h-4 w-96 max-w-full animate-pulse rounded bg-[#F6F3EE]/80" />
              <div className="flex gap-2 pt-1">
                <span className="h-6 w-20 animate-pulse rounded-full bg-[#F6F3EE] ring-1 ring-[#D9D2C2]" />
                <span className="h-6 w-24 animate-pulse rounded-full bg-[#F6F3EE] ring-1 ring-[#D9D2C2]" />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 divide-x divide-[#D9D2C2] border-t border-[#D9D2C2] bg-[#F6F3EE]/70 p-4 text-center">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="mx-auto h-3 w-16 animate-pulse rounded bg-[#D9D2C2]/40" />
                <div className="mx-auto h-5 w-10 animate-pulse rounded bg-[#D9D2C2]/30" />
              </div>
            ))}
          </div>
        </div>
        <div className="mt-6 grid gap-6 lg:grid-cols-[1.6fr_0.9fr]">
          <div className="space-y-6">
            <div className="rounded-[22px] border border-[#D9D2C2] bg-white p-6 sm:p-7">
              <div className="h-3 w-20 animate-pulse rounded bg-[#0B5E56]/10" />
              <div className="mt-3 h-6 w-44 animate-pulse rounded bg-[#F6F3EE]" />
              <div className="mt-3 h-4 w-full animate-pulse rounded bg-[#F6F3EE]/80" />
              <div className="mt-2 h-4 w-3/4 animate-pulse rounded bg-[#F6F3EE]/80" />
            </div>
            <div className="rounded-[22px] border border-[#D9D2C2] bg-white p-6 sm:p-7">
              <div className="h-3 w-28 animate-pulse rounded bg-[#0B5E56]/10" />
              <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-2xl border border-[#D9D2C2] p-3">
                    <div className="size-9 animate-pulse rounded-full bg-[#F6F3EE]" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 w-24 animate-pulse rounded bg-[#F6F3EE]" />
                      <div className="h-2 w-16 animate-pulse rounded bg-[#F6F3EE]/70" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="space-y-6">
            <div className="rounded-[22px] border border-[#D9D2C2] bg-white p-6">
              <div className="h-3 w-20 animate-pulse rounded bg-[#0B5E56]/10" />
              <div className="mt-4 space-y-3">
                <div className="h-4 w-full animate-pulse rounded bg-[#F6F3EE]" />
                <div className="h-4 w-3/4 animate-pulse rounded bg-[#F6F3EE]" />
              </div>
            </div>
            <div className="rounded-[22px] bg-[#0F1A2E] p-6">
              <div className="h-3 w-24 animate-pulse rounded bg-white/10" />
              <div className="mt-3 h-5 w-full animate-pulse rounded bg-white/10" />
              <div className="mt-4 h-11 w-full animate-pulse rounded-full bg-white/10" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}