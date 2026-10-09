"use client";
import { useEffect, useRef } from "react";
import { fmtTime } from "@/lib/client";

export type LbData = {
  contest: { id: string; name: string; status: string; scoring: string; penalty: string };
  problems: { id: string; index: string; title: string; score: number }[];
  rows: { rank: number; userId: string; name: string; team: string | null; status: string; solved: number; score: number; penalty: number; lastAcceptedAt: string | null; problems: { solved: boolean; attempts: number; at: number | null }[] }[];
  final: boolean;
  updatedAt: string;
};

export default function Leaderboard({ data, highlight, compact }: { data: LbData; highlight?: string; compact?: boolean }) {
  const prev = useRef<Record<string, number>>({});
  const changed = new Set(data.rows.filter((r) => prev.current[r.userId] !== undefined && prev.current[r.userId] !== r.rank).map((r) => r.userId));
  useEffect(() => {
    prev.current = Object.fromEntries(data.rows.map((r) => [r.userId, r.rank]));
  }, [data]);

  if (!data.rows.length)
    return <div className="state"><div className="glyph">#</div><h2>No participants yet</h2><p>Rows appear as soon as someone joins.</p></div>;

  return (
    <div className="table-wrap">
      <table className="table" style={{ minWidth: compact ? 520 : 640 }}>
        <thead>
          <tr>
            <th style={{ width: 64 }}>Rank</th>
            <th>Participant</th>
            <th className="right">Solved</th>
            <th className="right">Score</th>
            <th className="right">Penalty</th>
            {!compact && data.problems.map((p) => <th key={p.id} className="right mono" title={p.title}>{p.index}</th>)}
            <th className="right">Last accepted</th>
          </tr>
        </thead>
        <tbody>
          {data.rows.map((r) => (
            <tr key={r.userId} className={`${r.rank <= 3 && r.solved > 0 ? "podium" : ""} ${changed.has(r.userId) ? "flash" : ""}`} style={highlight === r.userId ? { background: "var(--bg-muted)" } : undefined}>
              <td><span className={`rank ${r.solved > 0 && r.rank <= 3 ? `r${r.rank}` : ""}`}>{r.rank}</span></td>
              <td>
                <div style={{ fontWeight: r.rank <= 3 && r.solved ? 600 : 500 }}>{r.name}{highlight === r.userId && <span className="faint small"> (you)</span>}</div>
                <div className="tiny muted">{r.team ?? "Individual"}{r.status === "BLOCKED" || r.status === "TERMINATED" ? ` · ${r.status.toLowerCase()}` : ""}</div>
              </td>
              <td className="right num">{r.solved}</td>
              <td className="right num" style={{ fontWeight: 600 }}>{r.score}</td>
              <td className="right num">{r.penalty}</td>
              {!compact && r.problems.map((p, i) => (
                <td key={i} className="right num small">
                  {p.solved ? <span title={`Solved at ${p.at} min`}>✓<span className="faint"> {p.at}′</span></span> : p.attempts ? <span className="faint">−{p.attempts}</span> : <span className="faint">·</span>}
                </td>
              ))}
              <td className="right num small muted">{fmtTime(r.lastAcceptedAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
