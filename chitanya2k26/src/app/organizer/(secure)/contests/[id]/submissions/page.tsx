"use client";
import { Suspense, use, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { fmtTime, usePoll } from "@/lib/client";
import { ApiErrorState, SkeletonRows, VerdictBadge } from "@/components/ui";
import { LANG_LABEL } from "@/lib/languages";

type S = { id: string; userId: string; participant: string; problemIndex: string; problemTitle: string; language: string; verdict: string; executionTime: number | null; memoryUsed: number | null; submittedAt: string; judge: string };

function Inner({ id }: { id: string }) {
  const sp = useSearchParams();
  const router = useRouter();
  const { data, error } = usePoll<{ submissions: S[] }>(`/api/organizer/contests/${id}/submissions`, 5000);
  const [verdict, setVerdict] = useState("");
  const [prob, setProb] = useState("");
  const user = sp.get("user");
  const rows = useMemo(() => (data?.submissions ?? []).filter((s) => (!verdict || s.verdict === verdict) && (!prob || s.problemIndex === prob) && (!user || s.userId === user)), [data, verdict, prob, user]);
  const probs = [...new Set((data?.submissions ?? []).map((s) => s.problemIndex))].sort();
  if (error) return <ApiErrorState error={error} />;
  return (
    <div className="stack" style={{ gap: 16 }}>
      <div><h1>Submissions</h1><p className="muted small">Every judged submission with its verdict. Open one to review the exact source code.</p></div>
      <div className="row wrap">
        <select className="select" style={{ width: "auto" }} value={prob} onChange={(e) => setProb(e.target.value)} aria-label="Problem"><option value="">All problems</option>{probs.map((p) => <option key={p}>{p}</option>)}</select>
        <select className="select" style={{ width: "auto" }} value={verdict} onChange={(e) => setVerdict(e.target.value)} aria-label="Verdict">
          <option value="">All verdicts</option>{["Accepted", "Wrong Answer", "Time Limit Exceeded", "Memory Limit Exceeded", "Compilation Error", "Runtime Error", "Judge Error"].map((v) => <option key={v}>{v}</option>)}
        </select>
        {user && <Link href={`/organizer/contests/${id}/submissions`} className="badge">One participant ✕</Link>}
        <span className="small muted">{rows.length} shown</span>
      </div>
      <div className="panel">
        {!data ? <SkeletonRows /> : !rows.length ? <div className="state"><div className="glyph">∅</div><h2>No submissions</h2><p>Nothing matches these filters yet.</p></div> : (
          <div className="table-wrap">
            <table className="table cards" style={{ minWidth: 760 }}>
              <thead><tr><th>Time</th><th>Participant</th><th>Problem</th><th>Language</th><th>Verdict</th><th className="right">Exec</th><th className="right">Memory</th><th /></tr></thead>
              <tbody>
                {rows.map((s) => (
                  <tr key={s.id} className="clickable" onClick={() => router.push(`/organizer/contests/${id}/submissions/${s.id}`)}>
                    <td data-label="Time" className="num small">{fmtTime(s.submittedAt)}</td>
                    <td data-label="Participant" style={{ fontWeight: 500 }}>{s.participant}</td>
                    <td data-label="Problem"><span className="mono">{s.problemIndex}</span> {s.problemTitle}</td>
                    <td data-label="Language" className="small">{LANG_LABEL[s.language] ?? s.language}</td>
                    <td data-label="Verdict"><VerdictBadge verdict={s.verdict} short />{s.judge === "simulated" && <span className="tiny faint"> sim</span>}</td>
                    <td data-label="Exec" className="right num small">{s.executionTime ?? "—"} ms</td>
                    <td data-label="Memory" className="right num small">{s.memoryUsed != null ? (s.memoryUsed / 1024).toFixed(1) + " MB" : "—"}</td>
                    <td className="actions"><Link className="btn sm" href={`/organizer/contests/${id}/submissions/${s.id}`} onClick={(e) => e.stopPropagation()}>Review</Link></td>
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

export default function Submissions({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <Suspense fallback={<SkeletonRows />}><Inner id={id} /></Suspense>;
}
