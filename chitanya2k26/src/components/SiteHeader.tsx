"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";

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

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Close nav on route change
  useEffect(() => {
    setOpen(false);
  }, [path]);

  return (
    <header className="site-header">
      <div className="container">
        <Brand />
        {open && <div className="nav-backdrop" onClick={() => setOpen(false)} aria-hidden />}
        <nav id="mobile-nav" className={`nav ${open ? "open" : ""}`} onClick={() => setOpen(false)}>
          {links.map(([href, label]) => (
            <Link key={href} href={href} className={(href === "/" ? path === "/" : path.startsWith(href)) ? "active" : ""}>{label}</Link>
          ))}
          <div className="only-mobile-nav-actions">
            <Link href="/join" className="btn primary block">Join Contest</Link>
            <Link href="/organizer/login" className="btn ghost block">Organizer Portal</Link>
          </div>
        </nav>
        <div className="header-actions">
          <Link href="/organizer/login" className="btn ghost sm">Organizer</Link>
          <Link href="/join" className="btn primary sm">Join Contest</Link>
          <button
            className="btn sm icon menu-btn"
            aria-label="Menu"
            aria-expanded={open}
            aria-controls="mobile-nav"
            onClick={() => setOpen((o) => !o)}
          >
            {open ? "✕" : "≡"}
          </button>
        </div>
      </div>
    </header>
  );
}
