import { Inter, Sora } from "next/font/google";
import type { Metadata } from "next";
import "@workspace/ui/globals.css";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@workspace/ui/components/sonner";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const sora = Sora({ subsets: ["latin"], variable: "--font-display", weight: ["400", "600", "700", "800"] });

export const metadata: Metadata = {
  title: "Workdeal Admin",
  description: "Painel administrativo Workdeal",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-MZ" className={cn("antialiased", sora.variable, inter.variable)}>
      <body className="min-h-screen bg-background font-sans">
        <ThemeProvider>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}