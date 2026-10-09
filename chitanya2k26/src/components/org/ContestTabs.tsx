"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { usePoll } from "@/lib/client";
import { StatusBadge } from "../ui";

export default function ContestTabs({ id }: { id: string }) {
  const path = usePathname();
  const { data } = usePoll<{ contest: { name: string; status: string; pausedAt: string | null } }>(`/api/organizer/contests/${id}`, 15000);
  const base = `/organizer/contests/${id}`;
  const tabs: [string, string][] = [["", "Overview"], ["/problems", "Problems"], ["/participants", "Participants"], ["/submissions", "Submissions"], ["/activity", "Activity"], ["/leaderboard", "Leaderboard"], ["/settings", "Settings"]];
  return (
    <div style={{ borderBottom: "1px solid var(--line)", background: "var(--bg)" }}>
      <div className="row ctabs-head" style={{ gap: 10, flexWrap: "wrap" }}>
        <Link href="/organizer/contests" className="small muted">Contests /</Link>
        <strong style={{ fontSize: 16 }}>{data?.contest.name ?? "…"}</strong>
        {data && <StatusBadge status={data.contest.status} paused={!!data.contest.pausedAt} />}
      </div>
      <nav className="tabs ctabs" style={{ borderBottom: 0 }}>
        {tabs.map(([t, l]) => {
          const on = t === "" ? path === base : path.startsWith(base + t);
          return <Link key={t} href={base + t} className={on ? "on" : ""}>{l}</Link>;
        })}
      </nav>
    </div>
  );
}
