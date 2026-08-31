import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Sem permissão | Workdeal Admin",
};

export default function ForbiddenPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-sm text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Acesso restrito</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          A tua conta não tem permissão para aceder a esta área do painel administrativo.
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <Button asChild variant="outline">
            <Link href="/dashboard">Ir para o painel</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
