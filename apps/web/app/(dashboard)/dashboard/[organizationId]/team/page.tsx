import { notFound, redirect } from "next/navigation"
import { requireAuth } from "@/lib/auth"
import { getOrgRole } from "@workdeal/auth/repository"
import { hasOrgPermission } from "@workdeal/shared"
import { TeamManager } from "./team-manager"

export default async function TeamPage({ params }: { params: Promise<{ organizationId: string }> }) {
  const { organizationId } = await params
  if (organizationId === "personal") redirect("/dashboard")
  const session = await requireAuth()
  const role = await getOrgRole(session.user.id, organizationId)
  if (!role) notFound()
  const canManage = hasOrgPermission(role, "members:manage")

  const { db, member, user, invitation } = await import("@workdeal/db")
  const { eq } = await import("drizzle-orm")

  const members = await db
    .select({ id: member.id, role: member.role, userId: member.userId, name: user.name, email: user.email, createdAt: member.createdAt })
    .from(member)
    .innerJoin(user, eq(member.userId, user.id))
    .where(eq(member.organizationId, organizationId))

  const invites = await db
    .select({ id: invitation.id, email: invitation.email, role: invitation.role, status: invitation.status, createdAt: invitation.createdAt })
    .from(invitation)
    .where(eq(invitation.organizationId, organizationId))

  const { listUserOrganizations } = await import("@workdeal/auth/repository")
  const orgs = await listUserOrganizations(session.user.id)
  const org = orgs.find((o) => o.id === organizationId)

  return (
    <div className="mx-auto w-full max-w-[880px] space-y-5 pb-10">
      <div className="rounded-[22px] border border-[#D9D2C2] bg-white p-6">
        <p className="text-[11px] font-bold tracking-[0.14em] text-[#0B5E56]">EQUIPA · {org?.name ?? organizationId}</p>
        <h1 className="mt-2 text-[22px] font-black tracking-tight text-[#0F1A2E]" style={{ fontFamily: "var(--font-display)" }}>
          Membros e convites
        </h1>
        <p className="mt-1 text-sm text-[#0F1A2E]/60">
          Papel actual: <span className="font-bold capitalize text-[#0F1A2E]">{role}</span> · {canManage ? "Podes gerir membros." : "Só visualização — apenas owner/admin gere equipa."}
        </p>
      </div>

      <TeamManager
        organizationId={organizationId}
        members={members.map((m) => ({ id: m.id, userId: m.userId, name: m.name, email: m.email, role: m.role as string, createdAt: m.createdAt.toISOString() }))}
        invites={invites.map((i) => ({ id: i.id, email: i.email, role: i.role as string, status: i.status as string, createdAt: i.createdAt.toISOString() }))}
        canManage={canManage}
        currentUserId={session.user.id}
      />
    </div>
  )
}
