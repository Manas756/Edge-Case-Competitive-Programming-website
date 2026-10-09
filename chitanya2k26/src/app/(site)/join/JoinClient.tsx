"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { api, ApiError, fmtDate } from "@/lib/client";
import { Spinner, StatusBadge, useToast } from "@/components/ui";

type Resolved = { contest: { id: string; name: string; status: string; paused: boolean; durationMinutes: number; problemCount: number; participants: number; scheduledAt: string | null; cheatDetection: boolean; sessionRule: { enabled: boolean; maxViolations: number } }; team: { name: string } | null };

const store = {
  get: (k: string) => { try { return localStorage.getItem(k) ?? ""; } catch { return ""; } },
  set: (k: string, v: string) => { try { localStorage.setItem(k, v); } catch {} },
};

export default function JoinClient({ demoCode }: { demoCode: string }) {
  const sp = useSearchParams();
  const router = useRouter();
  const toast = useToast();
  const [tab, setTab] = useState<"join" | "make">(sp.get("tab") === "make" ? "make" : "join");
  const [code, setCode] = useState(sp.get("code") ?? "");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [resolved, setResolved] = useState<Resolved | null>(null);
  const [target, setTarget] = useState<{ id: string; name: string } | null>(null);
  const [resolving, setResolving] = useState(false);
  const [err, setErr] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);
  const [joined, setJoined] = useState<string | null>(null);

  // make-it state
  const [mCode, setMCode] = useState("");
  const [mTeam, setMTeam] = useState("");
  const [made, setMade] = useState<{ name: string; code: string; contest: string } | null>(null);
  const [mErr, setMErr] = useState<string | null>(null);

  useEffect(() => {
    setName(store.get("c26_name"));
    setEmail(store.get("c26_email"));
    const cid = sp.get("contest");
    if (cid) api(`/api/contests/${cid}`).then((d) => setTarget({ id: d.contest.id, name: d.contest.name })).catch(() => {});
  }, [sp]);

  async function check(c = code) {
    const cleanCode = c.trim();
    if (!cleanCode) {
      setResolved(null);
      return null;
    }
    setResolving(true);
    setErr(null);
    try {
      const r = await api<Resolved>("/api/join/resolve", { body: { code: cleanCode } });
      setResolved(r);
      router.prefetch(`/contest/${r.contest.id}`);
      return r;
    } catch (e) {
      setResolved(null);
      setErr(e as ApiError);
      return null;
    } finally {
      setResolving(false);
    }
  }

  // Debounced auto-resolve when typing or pasting code
  useEffect(() => {
    const trimmed = code.trim();
    if (!trimmed || trimmed.length < 3) {
      setResolved(null);
      return;
    }
    const t = setTimeout(() => {
      check(trimmed);
    }, 350);
    return () => clearTimeout(t);
  }, [code]);

  async function join(e: React.FormEvent) {
    e.preventDefault();
    const cleanCode = code.trim();
    const cleanName = name.trim();
    const cleanEmail = email.trim();

    if (!cleanCode) {
      setErr(new ApiError("INVALID_CODE", "Enter a team or contest code.", 400));
      return;
    }
    if (!cleanName || !cleanEmail) {
      setErr(new ApiError("INVALID_NAME", "Enter your name and email to join.", 400));
      return;
    }

    setBusy(true);
    setErr(null);
    try {
      const d = await api<{ contestId: string; contestName?: string; resumed: boolean }>("/api/join", {
        body: { code: cleanCode, name: cleanName, email: cleanEmail },
      });
      store.set("c26_name", cleanName);
      store.set("c26_email", cleanEmail);
      const contestTitle = d.contestName || resolved?.contest.name || "contest";
      setJoined(contestTitle);
      toast(d.resumed ? "Welcome back. Resuming your session." : "Joined. Your timer has started.");
      router.replace(`/contest/${d.contestId}`);
    } catch (e) {
      setErr(e as ApiError);
      setBusy(false);
    }
  }

  async function make(e: React.FormEvent) {
    e.preventDefault();
    setMErr(null);
    setBusy(true);
    try {
      const d = await api("/api/teams", { body: { contestCode: mCode, teamName: mTeam } });
      setMade({ name: d.team.name, code: d.team.code, contest: d.contest.name });
    } catch (e) {
      setMErr((e as ApiError).message);
    } finally {
      setBusy(false);
    }
  }

  const c = resolved?.contest;
  const blocking = c && (c.status !== "LIVE" || c.paused);

  return (
    <div className="container page">
      <div className="join-wrap stack" style={{ gap: 24 }}>
        <div>
          <div className="eyebrow">Contest entry</div>
          <h1 style={{ fontSize: 30, marginTop: 6 }}>{target ? `Join ${target.name}` : "Join a contest"}</h1>
          <p className="muted" style={{ marginTop: 6 }}>Enter the code you got from your organizer or team captain. You enter the contest right after.</p>
        </div>

        <div className="segmented" role="tablist" style={{ alignSelf: "flex-start" }}>
          <button role="tab" className={tab === "join" ? "on" : ""} onClick={() => setTab("join")}>Join code</button>
          <button role="tab" className={tab === "make" ? "on" : ""} onClick={() => setTab("make")}>Make it</button>
        </div>

        {tab === "join" ? (
          <form className="panel" onSubmit={join} noValidate>
            <div className="panel-body stack">
              <div className="field">
                <label htmlFor="code">Team code</label>
                <div className="row">
                  <input
                    id="code"
                    className={`input lg mono ${err?.code === "INVALID_CODE" ? "invalid" : ""}`}
                    placeholder="Enter Team Code"
                    value={code}
                    autoComplete="off"
                    spellCheck={false}
                    onChange={(e) => { setCode(e.target.value); setResolved(null); setErr(null); }}
                    onBlur={() => code.trim() && !resolved && check()}
                  />
                  {resolving && <Spinner />}
                </div>
                {demoCode && <span className="hint">Demo contest code: <button type="button" className="tag" style={{ cursor: "pointer" }} onClick={() => { setCode(demoCode); check(demoCode); }}>{demoCode}</button></span>}
              </div>

              {c && (
                <div className="confirm stack" style={{ gap: 10 }}>
                  <div className="row between"><span className="row small" style={{ gap: 8 }}><span className="check">✓</span>Code accepted</span><StatusBadge status={c.status} paused={c.paused} /></div>
                  <div><strong style={{ fontSize: 16 }}>{c.name}</strong>{resolved?.team && <span className="muted"> · team {resolved.team.name}</span>}</div>
                  <div className="row wrap small muted" style={{ gap: 16 }}>
                    <span>{c.problemCount} problems</span><span>{c.durationMinutes} min timer</span><span>{c.participants} joined</span>
                    {c.cheatDetection && <span>Monitoring on{c.sessionRule.enabled ? ` · ${c.sessionRule.maxViolations} violation limit` : ""}</span>}
                  </div>
                  {c.status === "READY" && <div className="notice">◷ This contest has not started yet{c.scheduledAt ? `. It opens ${fmtDate(c.scheduledAt)}` : ""}.</div>}
                  {c.status === "ENDED" && <div className="notice">■ This contest has ended. <Link href={`/contest/${c.id}/leaderboard`} style={{ textDecoration: "underline" }}>See final results</Link></div>}
                  {c.paused && <div className="notice">The organizer has paused this contest. Try again shortly.</div>}
                </div>
              )}

              {!blocking && (
                <div className="form-grid">
                  <div className="field"><label htmlFor="name">Your name</label><input id="name" className="input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" /></div>
                  <div className="field"><label htmlFor="email">Email</label><input id="email" type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /><span className="hint">Use the same email to resume on another device.</span></div>
                </div>
              )}

              {err && <div className="notice error" role="alert"><strong>{errTitle(err.code)}</strong><span>{err.message}</span></div>}
              {joined && <div className="notice strong"><span className="check">✓</span><span>Joined <strong>{joined}</strong>. Entering the contest…</span></div>}

              <button className="btn primary lg block" disabled={busy || !!joined || !!blocking}>
                {(busy || !!joined) && <Spinner />}
                {joined ? "Entering contest…" : busy ? "Joining contest…" : "Join Contest"}
              </button>
              {c?.cheatDetection && !blocking && <p className="hint">By joining you agree that tab switches and window focus changes are recorded for the organizer. Browser monitoring is a signal, not proof.</p>}
            </div>
          </form>
        ) : (
          <form className="panel" onSubmit={make} noValidate>
            <div className="panel-body stack">
              <p className="muted small">Create a team inside a contest. You get a team code to share with teammates; everyone who joins with it is listed under your team.</p>
              <div className="field"><label htmlFor="mcode">Contest code</label><input id="mcode" className="input mono" value={mCode} onChange={(e) => setMCode(e.target.value)} placeholder={demoCode || "Contest code"} /></div>
              <div className="field"><label htmlFor="mteam">Team name</label><input id="mteam" className="input" value={mTeam} onChange={(e) => setMTeam(e.target.value)} maxLength={40} /></div>
              {mErr && <div className="notice error" role="alert">{mErr}</div>}
              {made ? (
                <div className="confirm stack" style={{ gap: 12 }}>
                  <div className="small">Team <strong>{made.name}</strong> created in {made.contest}</div>
                  <div className="code-chip">{made.code}</div>
                  <div className="row wrap">
                    <button type="button" className="btn" onClick={() => { navigator.clipboard?.writeText(made.code); toast("Team code copied"); }}>Copy code</button>
                    <button type="button" className="btn primary" onClick={() => { setTab("join"); setCode(made.code); check(made.code); }}>Join with this code</button>
                  </div>
                </div>
              ) : (
                <button className="btn primary lg block" disabled={busy}>{busy && <Spinner />}Create team code</button>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function errTitle(code: string) {
  return ({ INVALID_CODE: "Invalid code. ", NOT_STARTED: "Not started. ", CONTEST_ENDED: "Contest ended. ", CONTEST_FULL: "Contest full. ", BLOCKED: "Blocked. ", TERMINATED: "Session terminated. ", FINISHED: "Time over. ", ENTRY_CLOSED: "Entry closed. ", NETWORK: "Network error. " } as Record<string, string>)[code] ?? "";
}
