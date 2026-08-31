import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth";
import { LoginForm } from "./login-form";

export const metadata = {
  title: "Login | Workdeal Admin",
};

export default async function LoginPage() {
  const session = await getServerSession();
  if (session) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Workdeal Admin</h1>
          <p className="mt-1 text-sm text-muted-foreground">Acesso restrito à equipa Workdeal</p>
        </div>
        <div className="rounded-lg border bg-background p-6 shadow-sm">
          <LoginForm />
        </div>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          Só moderadores e administradores têm acesso ao painel de gestão.
        </p>
      </div>
    </div>
  );
}
