"use client";
import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, ApiError, usePoll } from "@/lib/client";
import { ApiErrorState, ConfirmDialog, SkeletonRows, useToast } from "@/components/ui";

type P = { id: string; index: string; title: string; difficulty: string; score: number; timeLimit: number; memoryLimit: number; tags: string[]; publicTests: number; hiddenTests: number };

export default function Problems({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const toast = useToast();
  const { data, error, reload } = usePoll<{ problems: P[] }>(`/api/organizer/contests/${id}/problems`);
  const ov = usePoll<{ contest: { status: string } }>(`/api/organizer/contests/${id}`);
  const [del, setDel] = useState<P | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const editable = ov.data && (ov.data.contest.status === "DRAFT" || ov.data.contest.status === "READY");

  async function remove() {
    if (!del) return;
    setBusy(true);
    try {
      await api(`/api/organizer/contests/${id}/problems/${del.id}`, { method: "DELETE" });
      toast(`Deleted ${del.title}`);
      setDel(null); reload();
    } catch (e) { setErr((e as ApiError).message); } finally { setBusy(false); }
  }

  if (error) return <ApiErrorState error={error} />;
  return (
    <div className="stack" style={{ gap: 16 }}>
      <div className="row wrap between">
        <div><h1>Problems</h1><p className="muted small">Participants see the statement, examples and public tests. Hidden tests stay on the server.</p></div>
        {editable && <Link className="btn primary" href={`/organizer/contests/${id}/problems/new`}>+ Add problem</Link>}
      </div>
      {ov.data && !editable && <div className="notice">Problems and tests are locked because the contest has {ov.data.contest.status === "LIVE" ? "started" : "ended"}.</div>}
      <div className="panel">
        {!data ? <SkeletonRows /> : !data.problems.length ? (
          <div className="state"><div className="glyph">A</div><h2>No problems yet</h2><p>Add the first problem, then its public and hidden test cases.</p>{editable && <Link className="btn primary" href={`/organizer/contests/${id}/problems/new`}>Add problem</Link>}</div>
        ) : (
          <div className="table-wrap">
            <table className="table cards">
              <thead><tr><th>#</th><th>Title</th><th>Difficulty</th><th className="right">Score</th><th className="right">Limits</th><th className="right">Public</th><th className="right">Hidden</th><th /></tr></thead>
              <tbody>
                {data.problems.map((p) => (
                  <tr key={p.id} className="clickable" onClick={() => router.push(`/organizer/contests/${id}/problems/${p.id}`)}>
                    <td data-label="#" className="mono" style={{ fontWeight: 600 }}>{p.index}</td>
                    <td data-label="Title"><div style={{ fontWeight: 500 }}>{p.title}</div><div className="row" style={{ gap: 4, marginTop: 2 }}>{p.tags.map((t) => <span key={t} className="tag">{t}</span>)}</div></td>
                    <td data-label="Difficulty">{p.difficulty}</td>
                    <td data-label="Score" className="right num">{p.score}</td>
                    <td data-label="Limits" className="right num small">{p.timeLimit}s · {p.memoryLimit}MB</td>
                    <td data-label="Public" className="right num">{p.publicTests}</td>
                    <td data-label="Hidden" className="right num">{p.hiddenTests === 0 ? <span className="badge dashed">none</span> : p.hiddenTests}</td>
                    <td className="actions" onClick={(e) => e.stopPropagation()}>
                      <Link className="btn sm" href={`/organizer/contests/${id}/problems/${p.id}`}>{editable ? "Edit" : "View"}</Link>
                      {editable && <button className="btn sm ghost" onClick={() => { setErr(null); setDel(p); }} aria-label={`Delete ${p.title}`}>Delete</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {del && <ConfirmDialog open title={`Delete problem ${del.index}?`} body={<p>This deletes <strong>{del.title}</strong> and all {del.publicTests + del.hiddenTests} of its test cases. Later problems are re-lettered.</p>} confirmLabel="Delete problem" busy={busy} onClose={() => setDel(null)} onConfirm={remove}>{err && <div className="notice error">{err}</div>}</ConfirmDialog>}
    </div>
  );
}
