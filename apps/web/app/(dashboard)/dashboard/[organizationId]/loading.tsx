export default function OrgDashboardLoading() {
  return (
    <div className="mx-auto w-full max-w-[1160px] space-y-4 pb-10">
      <div className="animate-pulse rounded-[22px] border border-[#D9D2C2] bg-white p-6">
        <div className="h-6 w-48 rounded bg-[#F6F3EE]" />
        <div className="mt-2 h-4 w-80 rounded bg-[#F6F3EE]" />
      </div>
      <div className="h-64 animate-pulse rounded-[20px] border border-[#D9D2C2] bg-white" />
    </div>
  );
}
