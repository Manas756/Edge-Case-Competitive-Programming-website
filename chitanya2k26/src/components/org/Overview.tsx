"use client";
import Link from "next/link";
import Countdown from "../Countdown";
import { StatusBadge } from "../ui";
import ContestControls from "./ContestControls";
import { fmtDate } from "@/lib/client";

export type OverviewData = {
  contest: { id: string; name: string; code: string; status: string; pausedAt: string | null; startTime: string | null; endTime: string | null; durationMinutes: number; entryWindowMinutes: number; scoringMode: string; penaltyMode: string; cheatDetection: boolean; sessionRule: { enabled: boolean; maxViolations: number } };
  judge: { name: string; executesCode: boolean };
  counts: { total: number; active: number; finished: number; blocked: number; terminated: number };
  stats: { id: string; index: string; title: string; attempts: number; accepted: number; failed: number; wa: number; tle: number; mle: number; ce: number; re: number; solvers: number }[];
  serverNow: string;
};

export function StatusPanel({ d, reload }: { d: OverviewData; reload: () => void }) {
  const c = d.contest;
  const offset = Date.parse(d.serverNow) - Date.now();
  const entryCloses = c.startTime ? new Date(Date.parse(c.startTime) + c.entryWindowMinutes * 60000).toISOString() : null;
  return (
    <div className="panel">
      <div className="panel-head">
        <div className="row"><h2>Contest status</h2><StatusBadge status={c.status} paused={!!c.pausedAt} /></div>
        <span className="tag" title="Contest code">{c.code}</span>
      </div>
      <div className="panel-body stack">
        <div className="stats">
          <div className="stat"><div className="k">{c.status === "LIVE" ? "Contest closes in" : c.status === "ENDED" ? "Ended" : "Duration"}</div>
            <div className="v mono">{c.status === "LIVE" && c.endTime ? <Countdown to={c.endTime} paused={!!c.pausedAt} offset={offset} onZero={reload} /> : c.status === "ENDED" ? <span style={{ fontSize: 15 }}>{fmtDate(c.endTime)}</span> : `${c.durationMinutes}m`}</div></div>
          <div className="stat"><div className="k">Total participants</div><div className="v">{d.counts.total}</div></div>
          <div className="stat"><div className="k">Active</div><div className="v">{d.counts.active}</div></div>
          <div className="stat"><div className="k">Finished</div><div className="v">{d.counts.finished}</div></div>
          <div className="stat"><div className="k">Blocked</div><div className="v">{d.counts.blocked}</div></div>
          <div className="stat"><div className="k">Terminated</div><div className="v">{d.counts.terminated}</div></div>
        </div>
        {c.status === "LIVE" && entryCloses && <p className="small muted">Entry window {Date.parse(entryCloses) > Date.now() + offset ? <>closes in <span className="mono"><Countdown to={entryCloses} paused={!!c.pausedAt} offset={offset} /></span></> : "is closed"}. Each participant gets {c.durationMinutes} minutes from entry.</p>}
        {!d.judge.executesCode && <div className="notice"><span>⚠</span><span>Judge: <strong>simulated</strong>. Code is not executed. Set <code>JUDGE_PROVIDER=judge0</code> and <code>JUDGE0_URL</code> for real judging.</span></div>}
        <ContestControls contest={c} onDone={reload} />
      </div>
    </div>
  );
}

export function ProblemStats({ d }: { d: OverviewData }) {
  return (
    <div className="panel">
      <div className="panel-head"><h2>Problem statistics</h2><Link href={`/organizer/contests/${d.contest.id}/problems`} className="btn sm ghost">Manage →</Link></div>
      {d.stats.length ? (
        <div className="table-wrap">
          <table className="table" style={{ minWidth: 620 }}>
            <thead><tr><th>Problem</th><th className="right">Attempts</th><th className="right">Accepted</th><th className="right">Failed</th><th className="right">WA</th><th className="right">TLE</th><th className="right">MLE</th><th className="right">CE</th><th className="right">RE</th></tr></thead>
            <tbody>
              {d.stats.map((s) => (
                <tr key={s.id}>
                  <td><span className="mono" style={{ fontWeight: 600 }}>{s.index}</span> {s.title}<div className="tiny muted">{s.solvers} solver{s.solvers === 1 ? "" : "s"}</div></td>
                  {[s.attempts, s.accepted, s.failed, s.wa, s.tle, s.mle, s.ce, s.re].map((n, i) => <td key={i} className="right num" style={i === 1 ? { fontWeight: 600 } : undefined}>{n}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <div className="state" style={{ padding: 32 }}><p>No problems yet.</p><Link className="btn primary" href={`/organizer/contests/${d.contest.id}/problems/new`}>Add a problem</Link></div>}
    </div>
  );
}
