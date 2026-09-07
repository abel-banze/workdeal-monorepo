import Link from "next/link";
import { listAdminInvites } from "@/app/actions/admin";
import { requireSystemRole } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { InvitesList, type InviteRow } from "./invites-list";

export const metadata = {
  title: "Convites | Workdeal Admin",
};

export default async function InvitesPage() {
  const session = await requireSystemRole("moderator", "admin");
  const isAdmin = session.user.systemRole === "admin";

  const res = await listAdminInvites({ limit: 500 });
  const invites = (res.data as InviteRow[] | null) ?? [];
  const total = (res.meta?.total as number | undefined) ?? invites.length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#0B5E56]">
            Utilizadores · Acesso à equipa
          </p>
          <h1
            className="mt-2 text-2xl font-black leading-tight tracking-[-0.04em] text-[#0F1A2E] sm:text-[26px]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Convites
          </h1>
          <p className="mt-1 max-w-xl text-sm text-[#0F1A2E]/50">
            Convidar pessoas para a equipa de moderação. Cada convite tem um link com validade, pode ser revogado e um
            novo link gerado a qualquer momento.
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard/users">Ver utilizadores</Link>
        </Button>
      </div>

      <InvitesList invites={invites} isAdmin={isAdmin} total={total} />
    </div>
  );
}