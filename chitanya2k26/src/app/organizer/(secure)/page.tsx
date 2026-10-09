"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ago, usePoll } from "@/lib/client";
import { ApiErrorState, SkeletonRows } from "@/components/ui";
import Leaderboard, { type LbData } from "@/components/Leaderboard";
import { ProblemStats, StatusPanel, type OverviewData } from "@/components/org/Overview";

const LABEL: Record<string, string> = { visibility_hidden: "Tab hidden", window_blur: "Window blur", leave_attempt: "Leave attempt", fullscreen_exit: "Fullscreen exit", paste_burst: "Large paste" };

export default function Dashboard() {
  const list = usePoll<{ contests: { id: string; name: string; status: string }[] }>("/api/organizer/contests");
  const [id, setId] = useState<string | null>(() => {
    try { return localStorage.getItem("c26_org_contest"); } catch { return null; }
  });
  useEffect(() => {
    if (!list.data?.contests.length) return;
    const cs = list.data.contests;
    // If current id is invalid or not set, pick the best match
    if (!id || !cs.some((c) => c.id === id)) {
      const best = cs.find((c) => c.status === "LIVE") ?? cs[0];
      if (best) {
        setId(best.id);
        try { localStorage.setItem("c26_org_contest", best.id); } catch {}
      }
    }
  }, [list.data, id]);
  const ov = usePoll<OverviewData>(id ? `/api/organizer/contests/${id}` : null, 5000);
  const lb = usePoll<LbData>(id ? `/api/organizer/contests/${id}/leaderboard` : null, 5000);
  const inc = usePoll<{ incidents: { id: string; name: string; type: string; detail: string; at: string; userId: string }[] }>(id ? `/api/organizer/contests/${id}/incidents` : null, 8000);

  if (list.error) return <div className="org-content"><ApiErrorState error={list.error} /></div>;
  return (
    <>
      <div className="org-top">
        <h1 style={{ fontSize: 16 }}>Dashboard</h1>
        <div className="grow" />
        {list.data && (
          <select className="select" style={{ width: "auto", maxWidth: 260 }} value={id ?? ""} aria-label="Contest"
            onChange={(e) => { setId(e.target.value); try { localStorage.setItem("c26_org_contest", e.target.value); } catch {} }}>
            {list.data.contests.map((c) => <option key={c.id} value={c.id}>{c.name} · {c.status}</option>)}
          </select>
        )}
      </div>
      <div className="org-content stack" style={{ gap: 20 }}>
        {!list.data ? <SkeletonRows /> : !list.data.contests.length ? (
          <div className="panel"><div className="state"><div className="glyph">+</div><h2>No contests yet</h2><p>Create your first contest to get started.</p><Link href="/organizer/contests?new=1" className="btn primary">Create contest</Link></div></div>
        ) : ov.error ? <ApiErrorState error={ov.error} /> : !ov.data ? <SkeletonRows /> : (
          <>
            <div className="row wrap between">
              <div><div className="eyebrow">Overview</div><h1 style={{ marginTop: 4 }}>{ov.data.contest.name}</h1></div>
              <Link href={`/organizer/contests/${id}`} className="btn">Open contest workspace →</Link>
            </div>
            <StatusPanel d={ov.data} reload={() => { ov.reload(); lb.reload(); }} />
            <div className="grid-main">
              <div className="panel">
                <div className="panel-head"><h2>Live leaderboard</h2><Link className="btn sm ghost" href={`/organizer/contests/${id}/leaderboard`}>Full view →</Link></div>
                {lb.data ? <Leaderboard data={{ ...lb.data, rows: lb.data.rows.slice(0, 10) }} compact /> : <SkeletonRows />}
              </div>
              <div className="panel">
                <div className="panel-head"><h2>Suspicious activity</h2><Link className="btn sm ghost" href={`/organizer/contests/${id}/activity`}>All →</Link></div>
                {!ov.data.contest.cheatDetection && <div className="notice" style={{ margin: 12 }}>Cheat detection is off for this contest. No new events are recorded.</div>}
                {inc.data?.incidents.length ? (
                  <ul className="timeline" style={{ padding: "0 18px" }}>
                    {inc.data.incidents.slice(0, 8).map((i) => (
                      <li key={i.id}>
                        <span className="mono faint tiny nowrap" style={{ width: 54 }}>{ago(i.at)}</span>
                        <span className="grow"><Link href={`/organizer/contests/${id}/participants/${i.userId}`} style={{ fontWeight: 500 }}>{i.name}</Link> <span className="muted">· {LABEL[i.type] ?? i.type}</span></span>
                      </li>
                    ))}
                  </ul>
                ) : <div className="state" style={{ padding: 32 }}><p>No events recorded.</p></div>}
              </div>
            </div>
            <ProblemStats d={ov.data} />
          </>
        )}
      </div>
    </>
  );
}
