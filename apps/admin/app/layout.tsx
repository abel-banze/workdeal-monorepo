import type { Metadata } from "next";
import "@workdeal/ui/globals.css";

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
    <html lang="pt-MZ">
      <body className="min-h-screen bg-background font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
