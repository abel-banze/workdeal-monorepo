export default function DashboardLoading() {
  return (
    <div className="mx-auto w-full max-w-[1120px] space-y-4 pb-10">
      <div className="animate-pulse rounded-[22px] border border-[#D9D2C2] bg-white p-6">
        <div className="h-6 w-40 rounded bg-[#F6F3EE]" />
        <div className="mt-3 h-4 w-64 rounded bg-[#F6F3EE]" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse rounded-[18px] border border-[#D9D2C2] bg-white p-4">
            <div className="h-4 w-24 rounded bg-[#F6F3EE]" />
            <div className="mt-3 h-6 w-32 rounded bg-[#F6F3EE]" />
          </div>
        ))}
      </div>
    </div>
  );
}
