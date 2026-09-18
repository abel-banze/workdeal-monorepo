import { Geist_Mono, Inter, Sora } from "next/font/google"
import NextTopLoader from "nextjs-toploader"
import { Analytics } from "@vercel/analytics/next"
import "@workspace/ui/globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@workspace/ui/components/sonner"
import { cn } from "@workspace/ui/lib/utils"
import { OrganizationJsonLd, WebSiteJsonLd } from "@/components/seo/json-ld"
import { SITE_DESCRIPTION, SITE_NAME, SITE_OG_IMAGE_ABS, SITE_TAGLINE, getSiteUrl } from "@/lib/seo"
import type { Metadata } from "next"

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" })
const sora = Sora({ subsets: ["latin"], variable: "--font-display", weight: ["400", "600", "700", "800"] })
const fontMono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" })

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: `${SITE_NAME} — ${SITE_TAGLINE}`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "pt_MZ",
    url: getSiteUrl(),
    siteName: SITE_NAME,
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
    images: [{ url: SITE_OG_IMAGE_ABS(getSiteUrl()), width: 1200, height: 630, alt: `${SITE_NAME} — ${SITE_TAGLINE}` }],
  },
  twitter: {
    card: "summary_large_image",
    site: SITE_NAME,
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
    images: [SITE_OG_IMAGE_ABS(getSiteUrl())],
  },
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-MZ" suppressHydrationWarning className={cn("antialiased", sora.variable, fontMono.variable, "font-sans", inter.variable)}>
      <body className="bg-[#F6F3EE] text-[#0F1A2E]">
        <NextTopLoader color="#0B5E56" height={3} showSpinner={false} shadow="0 0 10px rgba(11,94,86,0.35)" crawlSpeed={180} />
        <ThemeProvider>
          {children}
          <Toaster />
        </ThemeProvider>
        <Analytics />
        <OrganizationJsonLd />
        <WebSiteJsonLd />
      </body>
    </html>
  )
}