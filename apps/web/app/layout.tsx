import { Geist_Mono, Inter, Sora } from "next/font/google"
import NextTopLoader from "nextjs-toploader"
import { Analytics } from "@vercel/analytics/next"
import "@workspace/ui/globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { cn } from "@workspace/ui/lib/utils"
import type { Metadata } from "next"

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" })
const sora = Sora({ subsets: ["latin"], variable: "--font-display", weight: ["400", "600", "700", "800"] })
const fontMono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" })

export const metadata: Metadata = {
  title: "Workdeal — Onde os negócios se encontram",
  description:
    "O Workdeal é o ecossistema global de negócios — uma plataforma digital onde empresas verificadas ganham visibilidade, constroem confiança e fecham negócios sem fronteiras.",
  openGraph: {
    title: "Workdeal — Onde os negócios se encontram",
    description: "Mais do que um directório: a comunidade global onde empresas sérias se encontram e crescem juntas.",
  },
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-MZ" suppressHydrationWarning className={cn("antialiased", sora.variable, fontMono.variable, "font-sans", inter.variable)}>
      <body className="bg-[#F6F3EE] text-[#0F1A2E]">
        <NextTopLoader color="#0B5E56" height={3} showSpinner={false} shadow="0 0 10px rgba(11,94,86,0.35)" crawlSpeed={180} />
        <ThemeProvider>{children}</ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}
