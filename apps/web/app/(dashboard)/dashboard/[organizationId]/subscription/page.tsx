import { notFound, redirect } from "next/navigation"
import { requireAuth } from "@/lib/auth"
import { getOrgRole } from "@workdeal/auth/repository"
import { SubscriptionManager } from "@/components/features/subscription-manager"
import { fetchPublicPlans, getCurrentSubscription, type CurrentSubscription, type PublicPlan } from "@/app/actions/subscriptions"

export default async function OrgSubscriptionPage({
  params,
}: {
  params: Promise<{ organizationId: string }>
}) {
  const { organizationId } = await params
  if (organizationId === "personal") redirect("/dashboard/personal")

  const session = await requireAuth()
  const role = await getOrgRole(session.user.id, organizationId)
  if (!role) notFound()

  let plans: PublicPlan[] = []
  let current: CurrentSubscription | null = null
  let orgName: string | undefined

  try {
    const { listUserOrganizations } = await import("@workdeal/auth/repository")
    const orgs = await listUserOrganizations(session.user.id)
    orgName = orgs.find((o) => o.id === organizationId)?.name
  } catch {
    // org name é informativo — falha silenciosa
  }

  try {
    const plansRes = await fetchPublicPlans()
    plans = plansRes.data ?? []
  } catch {
    // catálogo indisponível — a página mostra só o plano actual
  }

  try {
    const subRes = await getCurrentSubscription(organizationId)
    current = subRes.data ?? null
  } catch {
    // sem subscrição ainda — a página mostra a grelha de planos
  }

  return (
    <div className="mx-auto w-full max-w-[1160px] space-y-5 pb-10">
      <SubscriptionManager organizationId={organizationId} orgName={orgName} initial={current} plans={plans} />
    </div>
  )
}