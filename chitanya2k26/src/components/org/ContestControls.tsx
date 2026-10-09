"use client";
import { useState } from "react";
import { api, ApiError } from "@/lib/client";
import { ConfirmDialog, Spinner, useToast } from "../ui";

type Action = "mark_ready" | "back_to_draft" | "start" | "pause" | "resume" | "end";
const CONFIRM: Partial<Record<Action, [string, string, string]>> = {
  start: ["Start contest?", "The contest goes live and participants can enter with the code. Scoring, timing and the contest code are locked after this.", "Start contest"],
  end: ["End contest now?", "Every active session ends, submissions are locked and the leaderboard becomes final. This cannot be undone.", "End contest"],
  pause: ["Pause contest?", "Submissions are blocked and every participant timer freezes until you resume.", "Pause"],
};

export default function ContestControls({ contest, onDone }: { contest: { id: string; status: string; pausedAt: string | null }; onDone: () => void }) {
  const toast = useToast();
  const [busy, setBusy] = useState<Action | null>(null);
  const [confirm, setConfirm] = useState<Action | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function run(a: Action) {
    setBusy(a); setErr(null);
    try {
      await api(`/api/organizer/contests/${contest.id}/action`, { body: { action: a } });
      toast({ mark_ready: "Contest marked ready", back_to_draft: "Moved back to draft", start: "Contest is live", pause: "Contest paused", resume: "Contest resumed", end: "Contest ended" }[a]);
      onDone();
    } catch (e) {
      setErr((e as ApiError).message);
    } finally {
      setBusy(null); setConfirm(null);
    }
  }
  const btn = (a: Action, label: string, primary = false) => (
    <button key={a} className={`btn ${primary ? "primary" : ""}`} disabled={!!busy} onClick={() => (CONFIRM[a] ? setConfirm(a) : run(a))}>{busy === a && <Spinner />}{label}</button>
  );
  const s = contest.status;
  return (
    <div className="stack" style={{ gap: 8 }}>
      <div className="row wrap">
        {s === "DRAFT" && btn("mark_ready", "Mark ready", true)}
        {s === "READY" && <>{btn("start", "Start contest", true)}{btn("back_to_draft", "Back to draft")}</>}
        {s === "LIVE" && <>{contest.pausedAt ? btn("resume", "Resume", true) : btn("pause", "Pause")}{btn("end", "End contest", !contest.pausedAt)}</>}
        {s === "ENDED" && <a className="btn primary" href={`/api/organizer/contests/${contest.id}/export`}>Export results (CSV)</a>}
      </div>
      {err && <div className="notice error" role="alert">{err}</div>}
      {confirm && CONFIRM[confirm] && (
        <ConfirmDialog open title={CONFIRM[confirm]![0]} body={<p>{CONFIRM[confirm]![1]}</p>} confirmLabel={CONFIRM[confirm]![2]} busy={!!busy} onClose={() => setConfirm(null)} onConfirm={() => run(confirm)} />
      )}
    </div>
  );
}
