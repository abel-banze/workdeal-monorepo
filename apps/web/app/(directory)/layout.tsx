import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";

export default function DirectoryLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <main className="min-h-[60vh]">{children}</main>
      <Footer />
    </>
  );
}
