import Image from "next/image";
import Link from "next/link";
import { requireAuth } from "@/lib/auth";

export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAuth().catch(() => null);

  return (
    <div className="min-h-dvh bg-muted text-foreground">
      <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2.5">
            <Image src="/logo.png" alt="Workdeal" width={36} height={36} className="size-9 object-contain" priority />
            <span className="text-base font-bold tracking-tight">Workdeal</span>
            <span className="hidden text-xs text-muted-foreground sm:inline">Configuração inicial</span>
          </Link>
          {session && (
            <span className="inline-flex size-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground" aria-hidden>
              {session.user.name.slice(0, 2).toUpperCase()}
            </span>
          )}
        </div>
      </header>

      <main className="relative mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8 py-8 lg:py-10">{children}</main>
    </div>
  );
}
