"use client";
import { use } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { fmtDate, fmtTime, usePoll } from "@/lib/client";
import { ApiErrorState, SkeletonRows, VerdictBadge, useToast } from "@/components/ui";
import { LANG_LABEL } from "@/lib/languages";

const CodeEditor = dynamic(() => import("@/components/CodeEditor"), { ssr: false, loading: () => <div className="skeleton" style={{ height: 300 }} /> });

export default function Review({ params }: { params: Promise<{ id: string; sid: string }> }) {
  const { id, sid } = use(params);
  const toast = useToast();
  const { data, error } = usePoll<any>(`/api/organizer/contests/${id}/submissions/${sid}`);
  if (error) return <ApiErrorState error={error} />;
  if (!data) return <SkeletonRows />;
  const s = data.submission;
  return (
    <div className="stack" style={{ gap: 20 }}>
      <Link href={`/organizer/contests/${id}/submissions`} className="small muted">← Submissions</Link>
      <div className="row wrap between">
        <div><div className="eyebrow">Code review</div><h1 style={{ marginTop: 4 }}>{data.problem ? `${data.problem.index}. ${data.problem.title}` : "Submission"}</h1></div>
        <VerdictBadge verdict={s.verdict} />
      </div>
      <div className="grid-main">
        <div className="stack" style={{ gap: 10 }}>
          <div className="row between">
            <span className="small muted">{LANG_LABEL[s.language]} · {s.sourceCode.split("\n").length} lines</span>
            <button className="btn sm" onClick={() => { navigator.clipboard?.writeText(s.sourceCode); toast("Source copied"); }}>Copy source</button>
          </div>
          <div className="code-view"><CodeEditor value={s.sourceCode} language={s.language} readOnly height="auto" /></div>
          {s.message && <div><div className="tiny muted" style={{ marginBottom: 4 }}>Judge output</div><pre className="pre dark">{s.message}</pre></div>}
        </div>
        <div className="stack" style={{ gap: 20 }}>
          <div className="panel">
            <div className="panel-head"><h2>Details</h2></div>
            <div className="panel-body">
              <dl className="kv" style={{ gridTemplateColumns: "110px minmax(0,1fr)" }}>
                <dt>Participant</dt><dd>{data.participant ? <Link href={`/organizer/contests/${id}/participants/${data.participant.id}`} style={{ textDecoration: "underline" }}>{data.participant.name}</Link> : "—"}</dd>
                <dt>Problem</dt><dd>{data.problem ? `${data.problem.index}. ${data.problem.title}` : "Deleted"}</dd>
                <dt>Language</dt><dd>{LANG_LABEL[s.language]}</dd>
                <dt>Submitted</dt><dd>{fmtDate(s.submittedAt)}</dd>
                <dt>Verdict</dt><dd>{s.verdict}</dd>
                <dt>Tests passed</dt><dd>{s.passed} / {s.total}</dd>
                <dt>Execution</dt><dd>{s.executionTime ?? "—"} ms{data.problem ? <span className="muted"> / {data.problem.timeLimit * 1000} ms</span> : null}</dd>
                <dt>Memory</dt><dd>{s.memoryUsed != null ? `${(s.memoryUsed / 1024).toFixed(1)} MB` : "—"}{data.problem ? <span className="muted"> / {data.problem.memoryLimit} MB</span> : null}</dd>
                <dt>Judge</dt><dd>{s.judge}{s.judge === "simulated" ? " (code not executed)" : ""}</dd>
              </dl>
            </div>
          </div>
          <div className="panel">
            <div className="panel-head"><h2>Attempts on this problem</h2></div>
            <ul className="timeline" style={{ padding: "0 18px" }}>
              {data.history.map((h: any, i: number) => (
                <li key={h.id} style={h.id === s.id ? { fontWeight: 600 } : undefined}>
                  <span className="mono faint tiny" style={{ width: 24 }}>#{i + 1}</span>
                  <Link href={`/organizer/contests/${id}/submissions/${h.id}`} className="grow">{fmtTime(h.submittedAt)}</Link>
                  <VerdictBadge verdict={h.verdict} short />
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
