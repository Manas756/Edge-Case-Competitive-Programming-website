"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { api } from "@/lib/client";
import { Brand } from "../SiteHeader";

export default function OrgShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const links: [string, string, string][] = [["/organizer", "Dashboard", "▦"], ["/organizer/contests", "Contests", "≡"]];
  const isOn = (h: string) => (h === "/organizer" ? path === h : path.startsWith(h));
  async function logout() {
    await api("/api/organizer/logout", { body: {} }).catch(() => {});
    router.replace("/organizer/login");
    router.refresh();
  }
  return (
    <div className="org">
      <aside className="org-side">
        <Brand />
        <div className="eyebrow" style={{ padding: "0 10px" }}>Organizer</div>
        <nav>{links.map(([h, l, g]) => <Link key={h} href={h} className={isOn(h) ? "on" : ""}><span className="mono faint">{g}</span>{l}</Link>)}</nav>
        <div style={{ marginTop: "auto" }} className="stack">
          <Link href="/" className="btn sm ghost" style={{ justifyContent: "flex-start" }}>↗ View public site</Link>
          <button className="btn sm" onClick={logout}>Sign out</button>
        </div>
      </aside>
      <div className="org-main">
        <div className="org-top org-mobile-nav">
          <Brand />
          <div className="grow" />
          {links.map(([h, l]) => <Link key={h} href={h} className={`btn sm ${isOn(h) ? "" : "ghost"}`}>{l}</Link>)}
          <button className="btn sm ghost" onClick={logout} aria-label="Sign out">⎋</button>
        </div>
        {children}
      </div>
    </div>
  );
}
