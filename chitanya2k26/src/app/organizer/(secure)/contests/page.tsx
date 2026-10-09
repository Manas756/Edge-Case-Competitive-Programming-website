"use client";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { api, ApiError, fmtDate, usePoll } from "@/lib/client";
import { ApiErrorState, Modal, SkeletonRows, Spinner, StatusBadge } from "@/components/ui";

type Row = { id: string; name: string; code: string; status: string; pausedAt: string | null; scheduledAt: string | null; durationMinutes: number; participants: number; problemCount: number };

function Inner() {
  const { data, error } = usePoll<{ contests: Row[] }>("/api/organizer/contests");
  const sp = useSearchParams();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ name: "", code: "", description: "", durationMinutes: 120, scheduledAt: "" });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (sp.get("new")) setOpen(true); }, [sp]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(null);
    try {
      const d = await api("/api/organizer/contests", { body: { ...f, scheduledAt: f.scheduledAt ? new Date(f.scheduledAt).toISOString() : null } });
      router.push(`/organizer/contests/${d.contest.id}/problems`);
    } catch (e) { setErr((e as ApiError).message); setBusy(false); }
  }

  return (
    <>
      <div className="org-top"><h1 style={{ fontSize: 16 }}>Contests</h1><div className="grow" /><button className="btn primary sm" onClick={() => setOpen(true)}>+ Create contest</button></div>
      <div className="org-content">
        <div className="panel">
          {error ? <ApiErrorState error={error} /> : !data ? <SkeletonRows /> : !data.contests.length ? (
            <div className="state"><div className="glyph">+</div><h2>No contests yet</h2><button className="btn primary" onClick={() => setOpen(true)}>Create contest</button></div>
          ) : (
            <div className="table-wrap">
              <table className="table cards">
                <thead><tr><th>Contest</th><th>Status</th><th>Code</th><th>Scheduled</th><th className="right">Duration</th><th className="right">Problems</th><th className="right">Participants</th><th /></tr></thead>
                <tbody>
                  {data.contests.map((c) => (
                    <tr key={c.id} className="clickable" onClick={() => router.push(`/organizer/contests/${c.id}`)}>
                      <td data-label="Contest" style={{ fontWeight: 500 }}>{c.name}</td>
                      <td data-label="Status"><StatusBadge status={c.status} paused={!!c.pausedAt} /></td>
                      <td data-label="Code"><span className="tag">{c.code}</span></td>
                      <td data-label="Scheduled" className="small muted">{fmtDate(c.scheduledAt)}</td>
                      <td data-label="Duration" className="right num">{c.durationMinutes}m</td>
                      <td data-label="Problems" className="right num">{c.problemCount}</td>
                      <td data-label="Participants" className="right num">{c.participants}</td>
                      <td className="actions"><Link className="btn sm" href={`/organizer/contests/${c.id}`} onClick={(e) => e.stopPropagation()}>Open</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      <Modal open={open} onClose={() => setOpen(false)} title="Create contest" wide
        footer={<><button className="btn" onClick={() => setOpen(false)}>Cancel</button><button className="btn primary" form="create-contest" disabled={busy}>{busy && <Spinner />}Create and add problems</button></>}>
        <form id="create-contest" className="form-grid" onSubmit={create}>
          <div className="field span-2"><label htmlFor="cn">Contest name</label><input id="cn" className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required autoFocus /></div>
          <div className="field"><label htmlFor="cc">Contest code</label><input id="cc" className="input mono" value={f.code} onChange={(e) => setF({ ...f, code: e.target.value })} placeholder="Generated from name" /><span className="hint">Participants enter this to join.</span></div>
          <div className="field"><label htmlFor="cd">Duration (minutes)</label><input id="cd" type="number" min={5} max={1440} className="input" value={f.durationMinutes} onChange={(e) => setF({ ...f, durationMinutes: Number(e.target.value) })} /></div>
          <div className="field span-2"><label htmlFor="cs">Scheduled for</label><input id="cs" type="datetime-local" className="input" value={f.scheduledAt} onChange={(e) => setF({ ...f, scheduledAt: e.target.value })} /><span className="hint">Shown on the public page. The contest goes live only when you press Start.</span></div>
          <div className="field span-2"><label htmlFor="cdesc">Description</label><textarea id="cdesc" className="textarea" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
          {err && <div className="notice error span-2">{err}</div>}
        </form>
      </Modal>
    </>
  );
}

export default function ContestsPage() {
  return <Suspense fallback={<SkeletonRows />}><Inner /></Suspense>;
}
