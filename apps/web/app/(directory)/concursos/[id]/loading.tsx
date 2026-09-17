export default function LoadingPublicTender() {
  return (
    <div aria-busy="true" aria-live="polite" className="bg-[#F6F3EE]">
      <section className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8 py-8">
        <div className="h-[280px] animate-pulse rounded-[20px] border border-[#D9D2C2] bg-[#0F1A2E]" />
        <div className="mt-6 grid gap-8 lg:grid-cols-[1.6fr_1fr]">
          <div className="space-y-6">
            <div className="h-40 animate-pulse rounded-[20px] border border-[#D9D2C2] bg-white" />
            <div className="h-64 animate-pulse rounded-[20px] border border-[#D9D2C2] bg-white" />
          </div>
          <div className="h-72 animate-pulse rounded-[20px] border border-[#D9D2C2] bg-white" />
        </div>
      </section>
    </div>
  );
}