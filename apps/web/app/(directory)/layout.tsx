import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { LocationConsentBanner } from "@/components/features/location-consent-banner";

export default function DirectoryLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <main className="min-h-[60vh]">{children}</main>
      <Footer />
      <LocationConsentBanner />
    </>
  );
}
