"use client";
import { use } from "react";
import Link from "next/link";
import { ago, fmtDate, fmtTime, usePoll } from "@/lib/client";
import { ApiErrorState, SessionBadge, SkeletonRows, VerdictBadge } from "@/components/ui";
import SessionControls from "@/components/org/SessionControls";
import { LANG_LABEL } from "@/lib/languages";

const LABEL: Record<string, string> = { visibility_hidden: "Tab hidden", window_blur: "Window lost focus", leave_attempt: "Tried to leave page", fullscreen_exit: "Exited fullscreen", paste_burst: "Large paste" };

export default function ParticipantPage({ params }: { params: Promise<{ id: string; uid: string }> }) {
  const { id, uid } = use(params);
  const { data, error, reload } = usePoll<any>(`/api/organizer/contests/${id}/participants/${uid}`, 5000);
  const ov = usePoll<{ contest: { status: string } }>(`/api/organizer/contests/${id}`, 15000);
  if (error) return <ApiErrorState error={error} />;
  if (!data) return <SkeletonRows />;
  const p = data.participant;
  const probs: Record<string, { index: string; title: string }> = Object.fromEntries(data.problems.map((x: any) => [x.id, x]));
  return (
    <div className="stack" style={{ gap: 20 }}>
      <Link href={`/organizer/contests/${id}/participants`} className="small muted">← Participants</Link>
      <div className="row wrap between">
        <div><h1>{p.name}</h1><p className="muted small">{p.email}{p.team ? ` · ${p.team}` : ""}</p></div>
        <div className="row"><SessionBadge status={p.sessionStatus} /><SessionControls contestId={id} contestStatus={ov.data?.contest.status ?? ""} p={p} onDone={reload} /></div>
      </div>
      <div className="stats">
        <div className="stat"><div className="k">Solved</div><div className="v">{p.solvedCount}</div></div>
        <div className="stat"><div className="k">Score</div><div className="v">{p.score}</div></div>
        <div className="stat"><div className="k">Penalty</div><div className="v">{p.penalty}</div></div>
        <div className="stat"><div className="k">Violations</div><div className="v">{p.cheatViolations}</div></div>
        <div className="stat"><div className="k">Submissions</div><div className="v">{p.submissions}</div></div>
      </div>
      <div className="panel">
        <div className="panel-head"><h2>Session</h2></div>
        <div className="panel-body">
          <dl className="kv">
            <dt>Status</dt><dd>{p.sessionStatus}</dd>
            <dt>Entered</dt><dd>{fmtDate(p.startedAt)}</dd>
            <dt>Timer ends</dt><dd>{fmtDate(p.endsAt)}</dd>
            <dt>Last activity</dt><dd>{ago(p.lastActivity)}</dd>
            <dt>Last accepted</dt><dd>{fmtDate(p.lastAcceptedAt)}</dd>
          </dl>
        </div>
      </div>
      <div className="grid-main">
        <div className="panel">
          <div className="panel-head"><h2>Submissions</h2></div>
          {data.submissions.length ? (
            <div className="table-wrap">
              <table className="table" style={{ minWidth: 520 }}>
                <thead><tr><th>Time</th><th>Problem</th><th>Language</th><th>Verdict</th><th className="right">Time</th><th /></tr></thead>
                <tbody>
                  {data.submissions.map((s: any) => (
                    <tr key={s.id}>
                      <td className="small num">{fmtTime(s.submittedAt)}</td>
                      <td><span className="mono">{probs[s.problemId]?.index}</span> {probs[s.problemId]?.title}</td>
                      <td className="small">{LANG_LABEL[s.language]}</td>
                      <td><VerdictBadge verdict={s.verdict} short /></td>
                      <td className="right num small">{s.executionTime ?? "—"} ms</td>
                      <td className="actions"><Link className="btn sm" href={`/organizer/contests/${id}/submissions/${s.id}`}>Code</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <div className="state" style={{ padding: 32 }}><p>No submissions yet.</p></div>}
        </div>
        <div className="panel">
          <div className="panel-head"><h2>Monitoring & actions</h2></div>
          {data.incidents.length || data.audit.length ? (
            <ul className="timeline" style={{ padding: "0 18px" }}>
              {[...data.incidents.map((i: any) => ({ at: i.at, text: LABEL[i.type] ?? i.type, sub: i.detail + (i.counted ? "" : " · not counted (duplicate)") })), ...data.audit.map((a: any) => ({ at: a.at, text: a.action, sub: "Organizer / system" }))]
                .sort((a, b) => b.at.localeCompare(a.at))
                .map((e, i) => <li key={i}><span className="mono faint tiny nowrap" style={{ width: 64 }}>{fmtTime(e.at)}</span><span className="grow"><div style={{ fontWeight: 500 }}>{e.text}</div><div className="tiny muted">{e.sub}</div></span></li>)}
            </ul>
          ) : <div className="state" style={{ padding: 32 }}><p>No events recorded.</p></div>}
        </div>
      </div>
    </div>
  );
}
