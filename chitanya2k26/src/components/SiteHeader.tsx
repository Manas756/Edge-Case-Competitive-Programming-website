"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

export function Brand() {
  return (
    <Link href="/" className="brand" aria-label="Edge Case home">
      <span className="brand-mark">{"{ec}"}</span>
      <span className="brand-name">Edge Case</span>
    </Link>
  );
}

export default function SiteHeader() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const links = [["/", "Home"], ["/contests", "Contests"], ["/join", "Join contest"]];
  return (
    <header className="site-header">
      <div className="container">
        <Brand />
        <nav className={`nav ${open ? "open" : ""}`} onClick={() => setOpen(false)}>
          {links.map(([href, label]) => (
            <Link key={href} href={href} className={(href === "/" ? path === "/" : path.startsWith(href)) ? "active" : ""}>{label}</Link>
          ))}
          <Link href="/organizer/login" className="only-mobile-link">Organizer</Link>
        </nav>
        <div className="header-actions">
          <Link href="/organizer/login" className="btn ghost sm">Organizer</Link>
          <Link href="/join" className="btn primary sm">Join Contest</Link>
          <button className="btn sm icon menu-btn" aria-label="Menu" onClick={() => setOpen((o) => !o)}>{open ? "✕" : "≡"}</button>
        </div>
      </div>
    </header>
  );
}
