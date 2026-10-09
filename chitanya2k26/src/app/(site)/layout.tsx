import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main style={{ minHeight: "calc(100vh - 140px)" }}>{children}</main>
      <SiteFooter />
    </>
  );
}
