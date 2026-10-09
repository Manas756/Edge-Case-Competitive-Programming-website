"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/client";
import { ConfirmDialog, useToast } from "../ui";

type A = "restore" | "allow_reentry" | "terminate" | "block" | "unblock" | "delete";
const COPY: Record<A, [string, (n: string) => string, string]> = {
  restore: ["Restore session", (n) => `${n} can continue in the same browser. Their violation counter resets. If their time had run out, they get extra minutes.`, "Restore"],
  allow_reentry: ["Allow re-entry", (n) => `${n}'s current browser session is signed out and they can re-enter with their code, from any device. Violations reset, and expired time is extended.`, "Allow re-entry"],
  terminate: ["Terminate session", (n) => `${n} is removed from the arena immediately. Their submissions are kept and you can restore the session later.`, "Terminate"],
  block: ["Block participant", (n) => `${n} loses access and cannot rejoin until unblocked. Submissions are kept.`, "Block"],
  unblock: ["Unblock participant", (n) => `${n} returns to their previous session state.`, "Unblock"],
  delete: ["Delete participant", (n) => `This permanently deletes ${n}, all of their submissions and monitoring events from this contest. This cannot be undone.`, "Delete permanently"],
};

export default function SessionControls({ contestId, contestStatus, p, onDone, compact }: { contestId: string; contestStatus: string; p: { userId: string; name: string; sessionStatus: string }; onDone: () => void; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState<A | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [extra, setExtra] = useState(15);
  const toast = useToast();
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const s = p.sessionStatus;
  const live = contestStatus === "LIVE";
  const allowed: Record<A, boolean> = {
    restore: live && (s === "TERMINATED" || s === "FINISHED"),
    allow_reentry: live && s !== "BLOCKED",
    terminate: s === "ACTIVE",
    block: s !== "BLOCKED",
    unblock: s === "BLOCKED",
    delete: true,
  };

  async function run(a: A) {
    setBusy(true); setErr(null);
    try {
      await api(`/api/organizer/contests/${contestId}/participants/${p.userId}`, { body: { action: a, extraMinutes: extra } });
      toast(`${COPY[a][0]}: done for ${p.name}`);
      setConfirm(null);
      if (a === "delete" && !compact) router.push(`/organizer/contests/${contestId}/participants`);
      else onDone();
    } catch (e) {
      setErr((e as ApiError).message);
    } finally {
      setBusy(false);
    }
  }

  const item = (a: A) => <button key={a} disabled={!allowed[a]} onClick={() => { setOpen(false); setErr(null); setConfirm(a); }}>{COPY[a][0]}</button>;
  return (
    <div className="menu" ref={ref} style={{ display: "inline-block" }}>
      <button className="btn sm" onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open}>{compact ? "⋯" : "Session controls ▾"}</button>
      {open && (
        <div className="menu-list" role="menu">
          {compact && <><Link href={`/organizer/contests/${contestId}/participants/${p.userId}`}>View participant</Link><Link href={`/organizer/contests/${contestId}/submissions?user=${p.userId}`}>View submitted code</Link><hr /></>}
          {item("restore")}{item("allow_reentry")}<hr />{item("terminate")}{s === "BLOCKED" ? item("unblock") : item("block")}<hr />{item("delete")}
        </div>
      )}
      {confirm && (
        <ConfirmDialog open title={`${COPY[confirm][0]}?`} body={<p>{COPY[confirm][1](p.name)}</p>} confirmLabel={COPY[confirm][2]} busy={busy} onClose={() => setConfirm(null)} onConfirm={() => run(confirm)}>
          {(confirm === "restore" || confirm === "allow_reentry") && (
            <div className="field"><label htmlFor="extra">Extra minutes if their time has expired</label><input id="extra" type="number" min={0} max={240} className="input" value={extra} onChange={(e) => setExtra(Number(e.target.value))} /></div>
          )}
          {err && <div className="notice error">{err}</div>}
        </ConfirmDialog>
      )}
    </div>
  );
}
