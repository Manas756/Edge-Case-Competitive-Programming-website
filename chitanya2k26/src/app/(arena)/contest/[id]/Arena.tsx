"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, ApiError, fmtClock, usePoll } from "@/lib/client";
import { ApiErrorState, Loading, Modal, Prose, Spinner, VerdictBadge } from "@/components/ui";
import { LANG_LABEL } from "@/lib/languages";

const CodeEditor = dynamic(() => import("@/components/CodeEditor"), { ssr: false, loading: () => <div className="skeleton" style={{ height: "100%", borderRadius: 0 }} /> });

type Problem = {
  id: string; index: string; title: string; description: string; inputFormat: string; outputFormat: string; constraints: string;
  examples: { input: string; output: string; explanation?: string }[]; timeLimit: number; memoryLimit: number; difficulty: string; tags: string[]; score: number; submitted: boolean;
};
type State = {
  contest: { id: string; name: string; status: string; paused: boolean; cheatDetection: boolean; sessionRule: { enabled: boolean; maxViolations: number } };
  me: { name: string; team: string | null; sessionStatus: string; startedAt: string; endsAt: string; violations: number; serverNow: string };
  problems: Problem[];
  showVerdicts: boolean;
  simulatedJudge: boolean;
};
type RunResult = { verdict: string; simulated: boolean; results: { index: number; verdict: string; time: number | null; memory: number | null; input?: string; expected?: string; output?: string; message?: string }[] };
type SubmitResult = { ok: boolean; simulated: boolean; verdict?: string; passed?: number; total?: number; time?: number | null; memory?: number | null; message?: string | null };

const TEMPLATES: Record<string, string> = {
  cpp: "#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    ios::sync_with_stdio(false);\n    cin.tie(nullptr);\n\n    return 0;\n}\n",
  c: "#include <stdio.h>\n\nint main(void) {\n\n    return 0;\n}\n",
  python: "import sys\n\ndef main():\n    data = sys.stdin.read().split()\n\n\nmain()\n",
  java: "import java.util.*;\nimport java.io.*;\n\npublic class Main {\n    public static void main(String[] args) throws IOException {\n        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));\n\n    }\n}\n",
  javascript: "const lines = require('fs').readFileSync(0, 'utf8').trim().split('\\n');\n\n",
};

const ls = {
  get: (k: string) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k: string, v: string) => { try { localStorage.setItem(k, v); } catch {} },
};

export default function Arena({ contestId }: { contestId: string }) {
  const router = useRouter();
  const { data, error, setData } = usePoll<State>(`/api/arena/${contestId}`, 10000);
  const [active, setActive] = useState(0);
  const [lang, setLang] = useState("cpp");
  const [code, setCode] = useState("");
  const [drawer, setDrawer] = useState(false);
  const [consoleTab, setConsoleTab] = useState<"result" | "submit">("result");
  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [run, setRun] = useState<RunResult | null>(null);
  const [caseIdx, setCaseIdx] = useState(0);
  const [sub, setSub] = useState<SubmitResult | null>(null);
  const [actionErr, setActionErr] = useState<string | null>(null);
  const [warning, setWarning] = useState<{ n: number; max: number; rule: boolean } | null>(null);
  const [lock, setLock] = useState<null | "time" | "terminated" | "blocked" | "finished">(null);
  const [mobileView, setMobileView] = useState<"problem" | "code">("problem");
  const offset = useRef(0);

  const problem = data?.problems[active];
  const storeKey = problem ? `c26:${contestId}:${problem.id}:${lang}` : "";

  useEffect(() => {
    if (data) offset.current = Date.parse(data.me.serverNow) - Date.now();
  }, [data]);

  useEffect(() => {
    const l = ls.get(`c26:${contestId}:lang`);
    if (l && TEMPLATES[l]) setLang(l);
  }, [contestId]);

  useEffect(() => {
    if (!storeKey) return;
    setCode(ls.get(storeKey) ?? TEMPLATES[lang]);
  }, [storeKey, lang]);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onCode = useCallback((v: string) => {
    setCode(v);
    if (!storeKey) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      ls.set(storeKey, v);
    }, 200);
  }, [storeKey]);

  // Session status → lock and redirect to results.
  const endSession = useCallback((reason: "time" | "terminated" | "blocked" | "finished") => {
    setLock((l) => l ?? reason);
    setTimeout(() => router.replace(`/contest/${contestId}/leaderboard?reason=${reason}`), 2600);
  }, [contestId, router]);

  useEffect(() => {
    if (!data) return;
    const s = data.me.sessionStatus;
    if (s === "TERMINATED") endSession("terminated");
    else if (s === "BLOCKED") endSession("blocked");
    else if (s === "FINISHED" || data.contest.status === "ENDED") endSession("time");
  }, [data, endSession]);

  const onTimeExpire = useCallback(() => {
    if (data?.me.sessionStatus === "ACTIVE") endSession("time");
  }, [data?.me.sessionStatus, endSession]);

  // ---------- Monitoring (browser signals only; not proof of cheating) ----------
  const monitoring = !!data && data.contest.cheatDetection && data.me.sessionStatus === "ACTIVE" && !lock;
  const pendingWarn = useRef<{ n: number; max: number; rule: boolean } | null>(null);
  useEffect(() => {
    if (!monitoring) return;
    let hiddenAt = 0;
    const send = async (type: string, detail: string) => {
      try {
        const r = await api<{ tracked: boolean; violations: number; max: number; terminated: boolean; ruleEnabled?: boolean }>(`/api/arena/${contestId}/event`, { body: { type, detail } });
        if (!r.tracked) return;
        if (r.terminated) { endSession("terminated"); return; }
        const w = { n: r.violations, max: r.max, rule: !!r.ruleEnabled };
        if (document.visibilityState === "visible" && document.hasFocus()) setWarning(w);
        else pendingWarn.current = w;
        setData((d) => (d ? { ...d, me: { ...d.me, violations: r.violations } } : d));
      } catch {}
    };
    const onVis = () => {
      if (document.visibilityState === "hidden") {
        hiddenAt = Date.now();
        send("visibility_hidden", "Contest tab hidden");
      } else if (hiddenAt) {
        hiddenAt = 0;
        if (pendingWarn.current) { setWarning(pendingWarn.current); pendingWarn.current = null; }
      }
    };
    const onBlur = () => { if (document.visibilityState === "visible") send("window_blur", "Window lost focus"); };
    const onFocus = () => { if (pendingWarn.current) { setWarning(pendingWarn.current); pendingWarn.current = null; } };
    const onLeave = (e: BeforeUnloadEvent) => {
      navigator.sendBeacon?.(`/api/arena/${contestId}/event`, JSON.stringify({ type: "leave_attempt", detail: "Tried to close or reload the contest page" }));
      e.preventDefault();
      e.returnValue = "";
    };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    window.addEventListener("beforeunload", onLeave);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("beforeunload", onLeave);
    };
  }, [monitoring, contestId, endSession, setData]);

  const handleErr = (e: unknown) => {
    const err = e as ApiError;
    if (err.code === "TERMINATED") endSession("terminated");
    else if (err.code === "BLOCKED") endSession("blocked");
    else if (err.code === "CONTEST_ENDED") endSession("time");
    setActionErr(err.message);
  };

  async function doRun() {
    if (!problem || running) return;
    setRunning(true); setActionErr(null); setConsoleTab("result"); setMobileView("code");
    try {
      const r = await api<RunResult>(`/api/arena/${contestId}/run`, { body: { problemId: problem.id, language: lang, code } });
      setRun(r);
      setCaseIdx(Math.max(0, r.results.findIndex((x) => x.verdict !== "Accepted")));
    } catch (e) { setRun(null); handleErr(e); } finally { setRunning(false); }
  }

  async function doSubmit() {
    if (!problem || submitting) return;
    setSubmitting(true); setActionErr(null); setSub(null); setConsoleTab("submit"); setMobileView("code");
    try {
      const r = await api<SubmitResult>(`/api/arena/${contestId}/submit`, { body: { problemId: problem.id, language: lang, code } });
      setSub(r);
      setData((d) => (d ? { ...d, problems: d.problems.map((p) => (p.id === problem.id ? { ...p, submitted: true } : p)) } : d));
    } catch (e) { handleErr(e); } finally { setSubmitting(false); }
  }

  const submitRef = useRef(doSubmit);
  const runRef = useRef(doRun);
  useEffect(() => {
    submitRef.current = doSubmit;
    runRef.current = doRun;
  });

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        e.shiftKey ? submitRef.current() : runRef.current();
      }
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, []);

  const solvedCount = useMemo(() => data?.problems.filter((p) => p.submitted).length ?? 0, [data]);

  const ProblemList = useMemo(() => {
    if (!data) return null;
    return (
      <ul className="plist">
        {data.problems.map((p, i) => (
          <li key={p.id}>
            <button className={i === active ? "on" : ""} onClick={() => { setActive(i); setRun(null); setSub(null); setActionErr(null); setDrawer(false); setMobileView("problem"); }}>
              <span className="idx">{p.index}</span>
              <span className="t">{p.title}</span>
              {p.submitted && <span className="check" title="Submitted successfully">✓</span>}
            </button>
          </li>
        ))}
      </ul>
    );
  }, [data, active]);

  if (error && !data) return <div className="container page"><ApiErrorState error={error} contestId={contestId} /></div>;
  if (!data || !problem) return <Loading label="Entering contest" />;

  const paused = !!data.contest.paused;
  const disabled = paused || !!lock || data.me.sessionStatus !== "ACTIVE";

  const cur = run?.results[caseIdx];

  return (
    <div className="arena">
      <header className="arena-bar">
        <button className="btn sm only-mobile" onClick={() => setDrawer(true)} aria-label="Problems">☰ {problem.index}</button>
        <Link href="/" className="brand-mark hide-mobile" aria-label="Home">{"{c}"}</Link>
        <div className="title grow">{data.contest.name}<span className="muted hide-mobile" style={{ fontWeight: 400 }}> · {data.me.name}{data.me.team ? ` (${data.me.team})` : ""}</span></div>
        {data.contest.cheatDetection && <span className="badge hide-mobile" title="Recorded monitoring events">Monitored{data.contest.sessionRule.enabled ? ` · ${data.me.violations}/${data.contest.sessionRule.maxViolations}` : ""}</span>}
        <span className="small muted hide-mobile">{solvedCount}/{data.problems.length} submitted</span>
        <ArenaTimer endsAt={data.me.endsAt} serverOffset={offset.current} paused={paused} onExpire={onTimeExpire} />
      </header>

      {data.simulatedJudge && (
        <div className="notice" style={{ margin: "8px 8px 0", borderRadius: 6 }}>
          <span>⚠</span><span>This server uses the <strong>simulated judge</strong> for demos. Code is not executed, so results do not reflect correctness.</span>
        </div>
      )}

      <div className="only-mobile" style={{ padding: "8px 8px 0" }}>
        <div className="segmented" style={{ width: "100%" }}>
          <button style={{ flex: 1 }} className={mobileView === "problem" ? "on" : ""} onClick={() => setMobileView("problem")}>Problem</button>
          <button style={{ flex: 1 }} className={mobileView === "code" ? "on" : ""} onClick={() => setMobileView("code")}>Code</button>
        </div>
      </div>

      <div className="arena-body">
        <aside className="arena-pane plist-pane">
          <div className="pane-head"><span className="small muted">Problems</span></div>
          <div className="pane-scroll">{ProblemList}</div>
        </aside>

        <section className={`arena-pane statement ${mobileView !== "problem" ? "hide-mobile" : ""}`}>
          <div className="pane-head"><span className="small muted">Problem {problem.index}</span></div>
          <div className="pane-scroll" style={{ padding: "18px 20px 28px" }}>
            <h2 style={{ fontSize: 20 }}>{problem.index}. {problem.title}</h2>
            <div className="row wrap" style={{ gap: 6, margin: "10px 0 18px" }}>
              <span className="badge">{problem.difficulty}</span>
              <span className="badge soft">{problem.score} pts</span>
              <span className="badge soft">{problem.timeLimit}s</span>
              <span className="badge soft">{problem.memoryLimit} MB</span>
              {problem.tags.map((t) => <span key={t} className="tag">{t}</span>)}
            </div>
            <Prose text={problem.description} />
            <div className="prose"><h4>Input</h4></div><Prose text={problem.inputFormat} />
            <div className="prose"><h4>Output</h4></div><Prose text={problem.outputFormat} />
            {problem.examples.map((ex, i) => (
              <div key={i} style={{ marginTop: 16 }}>
                <div className="prose"><h4>Example {i + 1}</h4></div>
                <div className="grid-2" style={{ gap: 8 }}>
                  <div><div className="tiny muted" style={{ marginBottom: 4 }}>Input</div><pre className="pre">{ex.input}</pre></div>
                  <div><div className="tiny muted" style={{ marginBottom: 4 }}>Output</div><pre className="pre">{ex.output}</pre></div>
                </div>
                {ex.explanation && <p className="small muted" style={{ marginTop: 6 }}>{ex.explanation}</p>}
              </div>
            ))}
            <div className="prose"><h4>Constraints</h4></div>
            <pre className="pre">{problem.constraints}</pre>
          </div>
        </section>

        <section className={`arena-pane editor-pane ${mobileView !== "code" ? "hide-mobile" : ""}`}>
          <div className="pane-head">
            <select className="select" style={{ width: "auto", height: 30 }} value={lang} onChange={(e) => { setLang(e.target.value); ls.set(`c26:${contestId}:lang`, e.target.value); }} aria-label="Language">
              {Object.entries(LANG_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <button className="btn sm ghost" onClick={() => onCode(TEMPLATES[lang])} title="Reset to template">Reset</button>
            <div className="grow" />
            <button className="btn sm" onClick={doRun} disabled={disabled || running || submitting} title="Run on sample tests (Ctrl+Enter)">{running ? <Spinner /> : "▶"} Run</button>
            <button className="btn sm primary" onClick={doSubmit} disabled={disabled || running || submitting} title="Submit (Ctrl+Shift+Enter)">{submitting && <Spinner />}Submit</button>
          </div>
          <div className="editor-host"><CodeEditor value={code} onChange={onCode} language={lang} readOnly={disabled} /></div>
          <div className="console">
            <div className="tabs">
              <button className={consoleTab === "result" ? "on" : ""} onClick={() => setConsoleTab("result")}>Test result</button>
              <button className={consoleTab === "submit" ? "on" : ""} onClick={() => setConsoleTab("submit")}>Submission</button>
            </div>
            <div className="pane-scroll" style={{ padding: 14 }}>
              {actionErr && <div className="notice error" style={{ marginBottom: 12 }} role="alert"><strong>{consoleTab === "submit" ? "Submission failed." : "Run failed."}</strong> {actionErr}</div>}
              {consoleTab === "result" ? (
                running ? <div className="row muted"><Spinner /> Running on sample tests…</div>
                : run ? (
                  <div className="stack" style={{ gap: 12 }}>
                    <div className="row wrap between">
                      <span className="verdict">{run.verdict === "Accepted" ? "✓ All sample tests passed" : run.verdict}</span>
                      <span className="small muted">{run.results.filter((r) => r.verdict === "Accepted").length}/{run.results.length} passed</span>
                    </div>
                    {run.verdict === "Compilation Error" ? (
                      <pre className="pre dark">{run.results[0]?.message ?? "Compilation failed"}</pre>
                    ) : (
                      <>
                        <div className="case-tabs">
                          {run.results.map((r, i) => (
                            <button key={i} className={i === caseIdx ? "on" : ""} onClick={() => setCaseIdx(i)}>{r.verdict === "Accepted" ? "✓" : "✕"} Case {r.index}</button>
                          ))}
                        </div>
                        {cur && (
                          <div className="stack" style={{ gap: 8 }}>
                            <div className="row wrap small"><VerdictBadge verdict={cur.verdict} /><span className="muted">{cur.time ?? "—"} ms · {cur.memory != null ? (cur.memory / 1024).toFixed(1) : "—"} MB</span></div>
                            <div><div className="tiny muted">Input</div><pre className="pre">{cur.input}</pre></div>
                            <div className="grid-2" style={{ gap: 8 }}>
                              <div><div className="tiny muted">Your output</div><pre className="pre">{cur.output || " "}</pre></div>
                              <div><div className="tiny muted">Expected</div><pre className="pre">{cur.expected}</pre></div>
                            </div>
                            {cur.message && <div><div className="tiny muted">stderr</div><pre className="pre dark">{cur.message}</pre></div>}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ) : <p className="muted small">Run your code against the sample tests. Hidden tests are only used when you submit.</p>
              ) : submitting ? (
                <div className="row muted"><Spinner /> Judging your submission…</div>
              ) : sub ? (
                <div className="stack" style={{ gap: 10 }}>
                  <div className="verdict"><span className="check">✓</span> Submitted successfully</div>
                  {sub.verdict ? (
                    <div className="row wrap small"><VerdictBadge verdict={sub.verdict} /><span className="muted">{sub.passed}/{sub.total} tests · {sub.time ?? "—"} ms · {sub.memory != null ? (sub.memory / 1024).toFixed(1) : "—"} MB</span></div>
                  ) : (
                    <p className="small muted">Your solution was recorded and judged. Results appear on the leaderboard. You can resubmit at any time before the timer ends.</p>
                  )}
                  {sub.message && <pre className="pre dark">{sub.message}</pre>}
                </div>
              ) : (
                <p className="muted small">Submissions are judged on public and hidden tests. You can resubmit until your timer ends. Ranking follows the contest scoring rules.</p>
              )}
            </div>
          </div>
        </section>
      </div>

      {drawer && (
        <>
          <div className="drawer-back" onClick={() => setDrawer(false)} />
          <div className="drawer" role="dialog" aria-label="Problems">
            <div className="pane-head between"><strong>Problems</strong><button className="btn sm icon ghost" onClick={() => setDrawer(false)} aria-label="Close">✕</button></div>
            <div className="pane-scroll">{ProblemList}</div>
          </div>
        </>
      )}

      <Modal open={!!warning && !lock} onClose={() => setWarning(null)} title="Monitoring warning"
        footer={<button className="btn primary" onClick={() => setWarning(null)}>Return to contest</button>}>
        {warning && (
          <div className="stack" style={{ gap: 10 }}>
            <p>Leaving the contest window was recorded and is visible to the organizer.</p>
            {warning.rule ? (
              <div className="notice strong"><strong>{warning.n} of {warning.max}</strong><span>{warning.max - warning.n > 0 ? `Your session ends after ${warning.max - warning.n} more recorded ${warning.max - warning.n === 1 ? "violation" : "violations"}.` : "This is your last warning."}</span></div>
            ) : <p className="small muted">{warning.n} event{warning.n === 1 ? "" : "s"} recorded so far.</p>}
          </div>
        )}
      </Modal>

      {paused && !lock && (
        <div className="lock"><div className="box stack" style={{ gap: 10 }}><div className="eyebrow">Paused</div><h2>The organizer paused the contest</h2><p className="muted">Your timer is frozen. This page continues automatically when the contest resumes.</p></div></div>
      )}
      {lock && (
        <div className="lock">
          <div className="box stack" style={{ gap: 12 }}>
            <div className="eyebrow">{lock === "time" ? "Time is up" : "Session ended"}</div>
            <h2>{lock === "time" ? "00:00:00" : lock === "terminated" ? "Session terminated" : lock === "blocked" ? "You have been blocked" : "Session finished"}</h2>
            <p className="muted">{lock === "time" ? "The contest is locked and your submissions are final." : lock === "terminated" ? "The session rule limit was reached. Your submissions are kept. The organizer can restore your session." : "Contact the organizer if you think this is a mistake."}</p>
            <div className="row" style={{ justifyContent: "center" }}><Spinner /><span className="small muted">Opening results…</span></div>
          </div>
        </div>
      )}
    </div>
  );
}

function ArenaTimer({ endsAt, serverOffset, paused, onExpire }: { endsAt: string | null; serverOffset: number; paused: boolean; onExpire: () => void }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [paused]);

  const left = endsAt ? Date.parse(endsAt) - (now + serverOffset) : null;
  const low = left !== null && left < 5 * 60_000;

  useEffect(() => {
    if (left !== null && left <= 0 && !paused) {
      onExpire();
    }
  }, [left, paused, onExpire]);

  return (
    <div className={`timer ${low ? "low" : ""}`} aria-live="off" title="Time remaining">
      {paused ? "PAUSED" : left === null ? "--:--:--" : fmtClock(left)}
    </div>
  );
}
