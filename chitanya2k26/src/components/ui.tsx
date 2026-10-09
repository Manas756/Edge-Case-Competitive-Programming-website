"use client";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";

export function Spinner() {
  return <span className="spinner" aria-hidden />;
}

const STATUS_LABEL: Record<string, string> = { DRAFT: "Draft", READY: "Upcoming", LIVE: "Live", ENDED: "Ended" };
export function StatusBadge({ status, paused }: { status: string; paused?: boolean }) {
  if (status === "LIVE" && paused) return <span className="badge dashed">Paused</span>;
  if (status === "LIVE") return <span className="badge solid"><span className="dot live" />Live</span>;
  if (status === "READY") return <span className="badge">Upcoming</span>;
  if (status === "ENDED") return <span className="badge soft">Ended</span>;
  return <span className="badge dashed">{STATUS_LABEL[status] ?? status}</span>;
}

export function SessionBadge({ status }: { status: string }) {
  const map: Record<string, [string, string]> = {
    ACTIVE: ["solid", "Active"], FINISHED: ["soft", "Finished"], TERMINATED: ["dashed", "Terminated"], BLOCKED: ["", "Blocked"], NOT_STARTED: ["dashed", "Not started"],
  };
  const [cls, label] = map[status] ?? ["", status];
  return <span className={`badge ${cls}`}>{status === "BLOCKED" ? "⊘ " : ""}{label}</span>;
}

const SHORT: Record<string, string> = {
  Accepted: "AC", "Wrong Answer": "WA", "Time Limit Exceeded": "TLE", "Memory Limit Exceeded": "MLE", "Compilation Error": "CE", "Runtime Error": "RE", "Judge Error": "JE", Pending: "…",
};
export function VerdictBadge({ verdict, short }: { verdict: string; short?: boolean }) {
  const ok = verdict === "Accepted";
  return (
    <span className={`badge ${ok ? "solid" : verdict === "Judge Error" ? "dashed" : ""}`} title={verdict}>
      {ok ? "✓" : "✕"} {short ? SHORT[verdict] ?? verdict : verdict}
    </span>
  );
}

export function Modal({ open, onClose, title, children, footer, wide }: { open: boolean; onClose: () => void; title: ReactNode; children?: ReactNode; footer?: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${wide ? "wide" : ""}`} role="dialog" aria-modal="true">
        <div className="modal-head"><h3>{title}</h3></div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

export function ConfirmDialog({ open, title, body, confirmLabel, onConfirm, onClose, busy, children }: {
  open: boolean; title: string; body: ReactNode; confirmLabel: string; onConfirm: () => void; onClose: () => void; busy?: boolean; children?: ReactNode;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title}
      footer={<>
        <button className="btn" onClick={onClose} disabled={busy}>Cancel</button>
        <button className="btn primary" onClick={onConfirm} disabled={busy}>{busy && <Spinner />}{confirmLabel}</button>
      </>}>
      <div className="stack" style={{ gap: 12 }}>{body}{children}</div>
    </Modal>
  );
}

export function ErrorState({ glyph = "!", title, message, action }: { glyph?: string; title: string; message?: string; action?: ReactNode }) {
  return (
    <div className="state">
      <div className="glyph">{glyph}</div>
      <h2>{title}</h2>
      {message && <p>{message}</p>}
      {action && <div className="row wrap" style={{ justifyContent: "center" }}>{action}</div>}
    </div>
  );
}

export function Loading({ label = "Loading" }: { label?: string }) {
  return <div className="state"><Spinner /><p className="small">{label}…</p></div>;
}

export function SkeletonRows({ n = 5 }: { n?: number }) {
  return <div className="stack" style={{ gap: 10, padding: 18 }}>{Array.from({ length: n }, (_, i) => <div key={i} className="skeleton" style={{ height: 18, width: `${90 - i * 7}%` }} />)}</div>;
}

// Map API error codes to user-facing states.
export function ApiErrorState({ error, contestId }: { error: { code: string; message: string }; contestId?: string }) {
  const lb = contestId ? <Link className="btn primary" href={`/contest/${contestId}/leaderboard`}>View leaderboard</Link> : null;
  const map: Record<string, [string, string]> = {
    NOT_JOINED: ["→", "Join this contest first"],
    SESSION_REPLACED: ["↺", "Session signed out"],
    BLOCKED: ["⊘", "You are blocked"],
    TERMINATED: ["■", "Session terminated"],
    CONTEST_ENDED: ["■", "Contest ended"],
    FINISHED: ["■", "Your time is over"],
    NOT_STARTED: ["◷", "Contest not started"],
    CONTEST_FULL: ["≡", "Contest full"],
    NOT_FOUND: ["?", "Not found"],
    NETWORK: ["~", "Network error"],
    UNAUTHORIZED: ["⚿", "Organizer access required"],
  };
  const [glyph, title] = map[error.code] ?? ["!", "Something went wrong"];
  const join = <Link className="btn" href="/join">Enter a code</Link>;
  const org = <Link className="btn primary" href="/organizer/login">Organizer sign in</Link>;
  return (
    <ErrorState glyph={glyph} title={title} message={error.message}
      action={error.code === "UNAUTHORIZED" ? org : error.code === "NETWORK" ? <button className="btn" onClick={() => location.reload()}>Retry</button> : <>{lb}{join}</>} />
  );
}

// ---------- Toasts ----------
const ToastCtx = createContext<(msg: string) => void>(() => {});
export const useToast = () => useContext(ToastCtx);
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<{ id: number; msg: string }[]>([]);
  const push = useCallback((msg: string) => {
    const id = Date.now() + Math.random();
    setItems((x) => [...x, { id, msg }]);
    setTimeout(() => setItems((x) => x.filter((i) => i.id !== id)), 3200);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toasts" aria-live="polite">{items.map((t) => <div key={t.id} className="toast">{t.msg}</div>)}</div>
    </ToastCtx.Provider>
  );
}

export function Switch({ checked, onChange, disabled, label }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean; label: string }) {
  return (
    <label className="switch" title={label}>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} aria-label={label} />
      <span />
    </label>
  );
}

// Tiny statement renderer: paragraphs, `code` and **bold**. Avoids pulling in a markdown library.
export function Prose({ text }: { text: string }) {
  return (
    <div className="prose">
      {text.split(/\n{2,}/).map((para, i) => (
        <p key={i}>
          {para.split("\n").map((line, j, arr) => (
            <span key={j}>{inline(line)}{j < arr.length - 1 && <br />}</span>
          ))}
        </p>
      ))}
    </div>
  );
}
function inline(s: string) {
  return s.split(/(`[^`]+`|\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("`") && part.endsWith("`") ? <code key={i}>{part.slice(1, -1)}</code> : part.startsWith("**") && part.endsWith("**") ? <strong key={i}>{part.slice(2, -2)}</strong> : part,
  );
}
