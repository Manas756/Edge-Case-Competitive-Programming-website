"use client";
import { use, useState } from "react";
import Link from "next/link";
import { fmtTime, usePoll } from "@/lib/client";
import { ApiErrorState, SkeletonRows } from "@/components/ui";

const LABEL: Record<string, string> = { visibility_hidden: "Tab hidden", window_blur: "Window lost focus", leave_attempt: "Tried to leave page", fullscreen_exit: "Exited fullscreen", paste_burst: "Large paste" };
type I = { id: string; userId: string; name: string; type: string; detail: string; at: string; counted: boolean };

export default function Activity({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, error } = usePoll<{ incidents: I[] }>(`/api/organizer/contests/${id}/incidents`, 5000);
  const ov = usePoll<{ contest: { cheatDetection: boolean; sessionRule: { enabled: boolean; maxViolations: number } } }>(`/api/organizer/contests/${id}`);
  const [type, setType] = useState("");
  if (error) return <ApiErrorState error={error} />;
  const rows = (data?.incidents ?? []).filter((i) => !type || i.type === type);
  const c = ov.data?.contest;
  return (
    <div className="stack" style={{ gap: 16 }}>
      <div>
        <h1>Suspicious activity</h1>
        <p className="muted small" style={{ maxWidth: 720 }}>Events come from browser signals (Page Visibility API, window focus and unload events). They show that the contest tab lost focus, not why. A notification, a second monitor or a system dialog can trigger them, so review before acting.</p>
      </div>
      {c && (
        <div className="notice">
          Cheat detection is <strong>{c.cheatDetection ? "on" : "off"}</strong>.{" "}
          {c.cheatDetection && (c.sessionRule.enabled ? <>Sessions end automatically after <strong>{c.sessionRule.maxViolations}</strong> counted {c.sessionRule.maxViolations === 1 ? "violation" : "violations"}.</> : "The session rule is off, so events are recorded only.")}{" "}
          <Link href={`/organizer/contests/${id}/settings`} style={{ textDecoration: "underline" }}>Change</Link>
        </div>
      )}
      <div className="row"><select className="select" style={{ width: "auto" }} value={type} onChange={(e) => setType(e.target.value)} aria-label="Event type"><option value="">All events</option>{Object.entries(LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select><span className="small muted">{rows.length} events</span></div>
      <div className="panel">
        {!data ? <SkeletonRows /> : !rows.length ? <div className="state"><div className="glyph">◎</div><h2>No events</h2><p>Nothing has been recorded{type ? " for this event type" : ""}.</p></div> : (
          <div className="table-wrap">
            <table className="table cards">
              <thead><tr><th>Time</th><th>Participant</th><th>Event</th><th>Detail</th><th>Counted</th></tr></thead>
              <tbody>
                {rows.map((i) => (
                  <tr key={i.id}>
                    <td data-label="Time" className="num small">{fmtTime(i.at)}</td>
                    <td data-label="Participant"><Link href={`/organizer/contests/${id}/participants/${i.userId}`} style={{ fontWeight: 500 }}>{i.name}</Link></td>
                    <td data-label="Event">{LABEL[i.type] ?? i.type}</td>
                    <td data-label="Detail" className="small muted">{i.detail}</td>
                    <td data-label="Counted">{i.counted ? <span className="badge">Yes</span> : <span className="badge dashed" title="Fired within 3 s of another event">Merged</span>}</td>
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
