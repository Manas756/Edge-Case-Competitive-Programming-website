import Link from "next/link";
import { StatusBadge } from "./ui";
import type { PublicContest } from "@/lib/services";

const fmt = (s: string | null) => (s ? new Date(s).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "TBA");
const dur = (m: number) => (m >= 60 ? `${Math.floor(m / 60)}h${m % 60 ? ` ${m % 60}m` : ""}` : `${m}m`);

export default function ContestCard({ c }: { c: PublicContest }) {
  return (
    <div className="contest-card">
      <div className="row between">
        <StatusBadge status={c.status} paused={c.paused} />
        <span className="tag">{c.problemCount} problems</span>
      </div>
      <Link href={`/contests/${c.id}`} className="stack" style={{ gap: 6 }}>
        <h3>{c.name}</h3>
        <p className="muted small" style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{c.description}</p>
      </Link>
      <div className="meta">
        <div><div className="k">Date</div><div className="v">{fmt(c.scheduledAt)}</div></div>
        <div><div className="k">Duration</div><div className="v">{dur(c.durationMinutes)}</div></div>
        <div><div className="k">Joined</div><div className="v">{c.participants}</div></div>
      </div>
      <div className="row">
        {c.status === "ENDED" ? (
          <Link className="btn block" href={`/contest/${c.id}/leaderboard`}>Final results</Link>
        ) : (
          <Link className={`btn block ${c.status === "LIVE" ? "primary" : ""}`} href={`/join?contest=${c.id}`}>{c.status === "LIVE" ? "Join" : "Details & join"}</Link>
        )}
        <Link className="btn" href={`/contests/${c.id}`}>Details</Link>
      </div>
    </div>
  );
}
