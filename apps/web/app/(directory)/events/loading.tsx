export default function LoadingEvents() {
  return (
    <div aria-busy="true" aria-live="polite" className="bg-[#F6F3EE]">
      <section className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8 py-8">
        <div className="h-[440px] animate-pulse rounded-[20px] border border-[#D9D2C2] bg-white" />
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="overflow-hidden rounded-2xl border border-[#D9D2C2] bg-white">
              <div className="h-40 animate-pulse bg-[#F6F3EE]" />
              <div className="p-5">
                <div className="h-3 w-40 animate-pulse rounded bg-[#F6F3EE]" />
                <div className="mt-3 h-5 w-3/4 animate-pulse rounded bg-[#F6F3EE]" />
                <div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-[#F6F3EE]/80" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}