import Link from "next/link";
import { notFound } from "next/navigation";
import { StatusBadge } from "@/components/ui";
import { AppError, contestProblems, getContest, publicContest } from "@/lib/services";
import Countdown from "@/components/Countdown";

export const dynamic = "force-dynamic";

export default async function ContestDetails({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let c;
  try {
    const raw = getContest(id);
    if (raw.status === "DRAFT") notFound();
    c = publicContest(raw);
  } catch (e) {
    if (e instanceof AppError) notFound();
    throw e;
  }
  // Problem titles are only revealed once the contest is live.
  const problems = c.status === "READY" ? [] : contestProblems(c.id);
  const fmt = (s: string | null) => (s ? new Date(s).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "To be announced");
  return (
    <div className="container page">
      <Link href="/contests" className="small muted">← All contests</Link>
      <div className="row wrap between" style={{ marginTop: 16, alignItems: "flex-start" }}>
        <div className="stack" style={{ gap: 10, maxWidth: 680 }}>
          <StatusBadge status={c.status} paused={c.paused} />
          <h1 style={{ fontSize: 34 }}>{c.name}</h1>
          <p className="muted" style={{ fontSize: 15 }}>{c.description}</p>
        </div>
        <div className="row wrap">
          {c.status === "LIVE" && <Link href={`/join?contest=${c.id}`} className="btn primary lg">Join Contest</Link>}
          {c.status === "READY" && <span className="badge dashed">Opens {fmt(c.scheduledAt)}</span>}
          <Link href={`/contest/${c.id}/leaderboard`} className="btn lg">{c.status === "ENDED" ? "Final results" : "Leaderboard"}</Link>
        </div>
      </div>

      <div className="stats" style={{ marginTop: 32 }}>
        <div className="stat"><div className="k">Starts</div><div className="v" style={{ fontSize: 16 }}>{fmt(c.startTime ?? c.scheduledAt)}</div></div>
        <div className="stat"><div className="k">Duration</div><div className="v">{c.durationMinutes}<span className="small muted"> min</span></div></div>
        <div className="stat"><div className="k">Participants</div><div className="v">{c.participants}{c.maxParticipants ? <span className="small muted"> / {c.maxParticipants}</span> : null}</div></div>
        <div className="stat"><div className="k">Problems</div><div className="v">{c.problemCount}</div></div>
        {c.status === "LIVE" && c.endTime && <div className="stat"><div className="k">Contest closes in</div><div className="v mono"><Countdown to={c.endTime} paused={c.paused} /></div></div>}
      </div>

      <div className="grid-2" style={{ marginTop: 32 }}>
        <div className="panel">
          <div className="panel-head"><h2>Rules</h2></div>
          <div className="panel-body">
            <dl className="kv">
              <dt>Timer</dt><dd>Your {c.durationMinutes}-minute timer starts when you enter. {c.entryWindowMinutes ? `Entry stays open for ${c.entryWindowMinutes} minutes after the start.` : ""}</dd>
              <dt>Scoring</dt><dd>{c.scoring}</dd>
              <dt>Penalty</dt><dd>{c.penalty}</dd>
              <dt>Monitoring</dt><dd>{c.cheatDetection ? "On. Leaving the tab or window is recorded and visible to the organizer." : "Off."}</dd>
              {c.cheatDetection && c.sessionRule.enabled && <><dt>Session rule</dt><dd>Your session ends after {c.sessionRule.maxViolations} recorded {c.sessionRule.maxViolations === 1 ? "violation." : "violations. Warnings are shown before that."}</dd></>}
              <dt>Languages</dt><dd>C++17, C, Python 3, Java, JavaScript</dd>
            </dl>
          </div>
        </div>
        <div className="panel">
          <div className="panel-head"><h2>Problems</h2><span className="tag">{c.problemCount}</span></div>
          {problems.length ? (
            <div className="table-wrap">
              <table className="table">
                <tbody>
                  {problems.map((p) => (
                    <tr key={p.id}>
                      <td style={{ width: 40 }} className="mono">{p.index}</td>
                      <td>{p.title}</td>
                      <td className="muted small">{p.difficulty}</td>
                      <td className="right num">{p.score} pts</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="state" style={{ padding: 32 }}><div className="glyph">◷</div><p>Problems are revealed when the contest starts.</p></div>
          )}
        </div>
      </div>
    </div>
  );
}
