"use client";
import { use, useMemo, useState } from "react";
import Link from "next/link";
import { ago, usePoll } from "@/lib/client";
import { ApiErrorState, SessionBadge, SkeletonRows } from "@/components/ui";
import SessionControls from "@/components/org/SessionControls";

type Row = { userId: string; name: string; email: string; team: string | null; sessionStatus: string; solvedCount: number; score: number; penalty: number; lastActivity: string | null; cheatViolations: number; submissions: number };

export default function Participants({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, error, reload } = usePoll<{ participants: Row[] }>(`/api/organizer/contests/${id}/participants`, 5000);
  const ov = usePoll<{ contest: { status: string; sessionRule: { enabled: boolean; maxViolations: number } } }>(`/api/organizer/contests/${id}`, 15000);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("");
  const rows = useMemo(() => (data?.participants ?? [])
    .filter((p) => !filter || p.sessionStatus === filter)
    .filter((p) => !q || `${p.name} ${p.email} ${p.team ?? ""}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => b.score - a.score || a.penalty - b.penalty), [data, q, filter]);

  if (error) return <ApiErrorState error={error} />;
  const max = ov.data?.contest.sessionRule;
  return (
    <div className="stack" style={{ gap: 16 }}>
      <div><h1>Participants</h1><p className="muted small">Monitor sessions and step in when something goes wrong. Restore or allow re-entry for anyone who lost access by accident.</p></div>
      <div className="row wrap">
        <input className="input" style={{ maxWidth: 280 }} placeholder="Search name, email or team" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search participants" />
        <select className="select" style={{ width: "auto" }} value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filter by status">
          <option value="">All statuses</option><option value="ACTIVE">Active</option><option value="FINISHED">Finished</option><option value="TERMINATED">Terminated</option><option value="BLOCKED">Blocked</option>
        </select>
        <span className="small muted">{rows.length} shown</span>
      </div>
      <div className="panel">
        {!data ? <SkeletonRows /> : !rows.length ? (
          <div className="state"><div className="glyph">∅</div><h2>{data.participants.length ? "No matches" : "No participants yet"}</h2><p>{data.participants.length ? "Try a different search or filter." : "Participants appear here when they join with the contest code."}</p></div>
        ) : (
          <div className="table-wrap">
            <table className="table cards" style={{ minWidth: 900 }}>
              <thead><tr><th>Name</th><th>Team</th><th>Session</th><th className="right">Solved</th><th className="right">Score</th><th className="right">Penalty</th><th>Last activity</th><th className="right">Violations</th><th /></tr></thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.userId}>
                    <td data-label="Name"><Link href={`/organizer/contests/${id}/participants/${p.userId}`} style={{ fontWeight: 500 }}>{p.name}</Link><div className="tiny muted">{p.email}</div></td>
                    <td data-label="Team">{p.team ?? <span className="faint">—</span>}</td>
                    <td data-label="Session"><SessionBadge status={p.sessionStatus} /></td>
                    <td data-label="Solved" className="right num">{p.solvedCount}</td>
                    <td data-label="Score" className="right num" style={{ fontWeight: 600 }}>{p.score}</td>
                    <td data-label="Penalty" className="right num">{p.penalty}</td>
                    <td data-label="Last activity" className="small muted">{ago(p.lastActivity)}</td>
                    <td data-label="Violations" className="right num">{p.cheatViolations ? <strong>{p.cheatViolations}{max?.enabled ? `/${max.maxViolations}` : ""}</strong> : <span className="faint">0</span>}</td>
                    <td className="actions"><SessionControls compact contestId={id} contestStatus={ov.data?.contest.status ?? ""} p={p} onDone={reload} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
