export default function LoadingTasks() {
  return (
    <div aria-busy="true" aria-live="polite" className="bg-[#F6F3EE]">
      <section className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8 py-8">
        <div className="h-[440px] animate-pulse rounded-[20px] border border-[#D9D2C2] bg-white" />
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-[#D9D2C2] bg-white p-5">
              <div className="h-4 w-32 animate-pulse rounded-full bg-[#F6F3EE]" />
              <div className="mt-3 h-6 w-3/4 animate-pulse rounded bg-[#F6F3EE]" />
              <div className="mt-2 h-3 w-full animate-pulse rounded bg-[#F6F3EE]/80" />
              <div className="mt-2 h-3 w-2/3 animate-pulse rounded bg-[#F6F3EE]/80" />
              <div className="mt-4 h-9 w-full animate-pulse rounded-full bg-[#F6F3EE]" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}