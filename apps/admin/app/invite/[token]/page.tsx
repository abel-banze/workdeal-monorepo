import { AcceptInvite } from "./accept-invite";

export const metadata = {
  title: "Aceitar convite | Workdeal Admin",
};

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F6F3EE] p-4">
      <AcceptInvite token={token} />
    </div>
  );
}