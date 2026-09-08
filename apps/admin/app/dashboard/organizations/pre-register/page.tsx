import Link from "next/link";
import { listPreRegisteredCompanies } from "@/app/actions/admin";
import { requireSystemRole } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { PreRegisterList } from "./pre-register-list";

export const metadata = {
  title: "Pré-registo de empresas | Workdeal Admin",
};

export interface PreRegisterListItem {
  id: string;
  name: string;
  slug: string;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  formattedAddress: string | null;
  logoUrl: string | null;
  categorySlugs: string[];
  createdAt: string;
  preRegisteredAt: string | null;
  promoterEmail: string | null;
  completionToken: string | null;
  completionUrl: string | null;
}

export default async function PreRegisterPage() {
  const session = await requireSystemRole("moderator", "admin");
  const isAdmin = session.user.systemRole === "admin";

  const res = await listPreRegisteredCompanies({ limit: 500 });
  const items = (res.data as PreRegisterListItem[] | null) ?? [];
  const total = (res.meta?.total as number) ?? items.length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#0B5E56]">
            Organizações · Lista de equipa
          </p>
          <h1
            className="mt-2 text-2xl font-black leading-tight tracking-[-0.04em] text-[#0F1A2E] sm:text-[26px]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Pré-registo de empresas
          </h1>
          <p className="mt-1 max-w-xl text-sm text-[#0F1A2E]/50">
            Empresas recolhidas pela equipa (ex: FACIM). Gera o convite, copia o link e notifica a empresa por email, SMS
            e WhatsApp para completar o registo.
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard/organizations/pre-register/new">+ Novo pré-registo</Link>
        </Button>
      </div>

      <PreRegisterList items={items} isAdmin={isAdmin} total={total} />
    </div>
  );
}
