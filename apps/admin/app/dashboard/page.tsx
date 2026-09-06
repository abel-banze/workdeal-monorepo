import { DashboardOverview } from "@/components/dashboard/dashboard-overview";
import { fetchDashboardStats } from "@/lib/dashboard-server";

export default async function DashboardPage() {
  const stats = await fetchDashboardStats();
  return <DashboardOverview initial={stats} />;
}