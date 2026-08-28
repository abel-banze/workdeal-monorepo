import type { Metadata } from "next";

export const metadata: Metadata = { title: "Requisição — Workdeal" };

export default function PublicTaskLoading() {
  return (
    <div aria-busy="true" aria-live="polite" className="bg-[#F6F3EE]">
      <section className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid gap-8 lg:grid-cols-[1.6fr_1fr] lg:items-start">
          <div>
            <div className="h-6 w-24 animate-pulse rounded-full bg-[#F6F3EE]" />
            <div className="mt-4 h-10 w-3/4 animate-pulse rounded bg-[#F6F3EE]" />
            <div className="mt-4 h-16 w-64 animate-pulse rounded-2xl bg-[#F6F3EE]" />
            <div className="mt-6 grid grid-cols-2 gap-4 rounded-[20px] border border-[#D9D2C2] bg-white p-5 sm:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-14 animate-pulse rounded-xl bg-[#F6F3EE]" />
              ))}
            </div>
            <div className="mt-6 h-64 animate-pulse rounded-[20px] border border-[#D9D2C2] bg-white" />
          </div>
          <div className="h-80 animate-pulse rounded-[20px] border border-[#D9D2C2] bg-white" />
        </div>
      </section>
    </div>
  );
}