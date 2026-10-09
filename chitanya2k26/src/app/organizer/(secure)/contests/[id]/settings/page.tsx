"use client";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError, usePoll } from "@/lib/client";
import { ApiErrorState, ConfirmDialog, SkeletonRows, Spinner, Switch, useToast } from "@/components/ui";

type C = { id: string; name: string; code: string; description: string; status: string; scheduledAt: string | null; durationMinutes: number; entryWindowMinutes: number; scoringMode: string; penaltyMode: string; wrongPenaltyMinutes: number; cheatDetection: boolean; showVerdicts: boolean; sessionRule: { enabled: boolean; maxViolations: number }; maxParticipants: number };

const SCORING = [["leetcode", "Weighted score", "Each problem has its own points. Rank by total score, then lower penalty."], ["icpc", "Problems solved", "Each problem counts once. Rank by solved count, then lower penalty."]];
const PENALTY = [["time", "Option 1 · Time-based", "Time of the last accepted submission, in minutes from the participant's start."], ["time_wrong", "Option 2 · Time + wrong submissions", "Last accepted time plus a fixed number of minutes per rejected attempt on solved problems."], ["icpc_sum", "ICPC cumulative", "Sum of every solve time plus minutes per rejected attempt."]];

const toLocal = (s: string | null) => (s ? new Date(new Date(s).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "");

export default function Settings({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const toast = useToast();
  const { data, error, reload } = usePoll<{ contest: C }>(`/api/organizer/contests/${id}`);
  const [f, setF] = useState<C | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [del, setDel] = useState(false);
  useEffect(() => { if (data) setF(data.contest); }, [data]);

  if (error) return <ApiErrorState error={error} />;
  if (!f || !data) return <SkeletonRows />;
  const pre = f.status === "DRAFT" || f.status === "READY";
  const ended = f.status === "ENDED";

  async function save() {
    setBusy(true); setErr(null);
    const live = { name: f!.name, description: f!.description, cheatDetection: f!.cheatDetection, showVerdicts: f!.showVerdicts, sessionRule: f!.sessionRule, maxParticipants: f!.maxParticipants, scheduledAt: f!.scheduledAt };
    const body = pre ? { ...live, code: f!.code, durationMinutes: f!.durationMinutes, entryWindowMinutes: f!.entryWindowMinutes, scoringMode: f!.scoringMode, penaltyMode: f!.penaltyMode, wrongPenaltyMinutes: f!.wrongPenaltyMinutes } : live;
    try { await api(`/api/organizer/contests/${id}`, { method: "PATCH", body }); toast("Settings saved"); reload(); }
    catch (e) { setErr((e as ApiError).message); } finally { setBusy(false); }
  }
  async function remove() {
    setBusy(true);
    try { await api(`/api/organizer/contests/${id}`, { method: "DELETE" }); router.push("/organizer/contests"); }
    catch (e) { setErr((e as ApiError).message); setDel(false); setBusy(false); }
  }
  const set = <K extends keyof C>(k: K, v: C[K]) => setF({ ...f, [k]: v });

  return (
    <div className="stack" style={{ gap: 20, maxWidth: 900 }}>
      <div><h1>Contest settings</h1><p className="muted small">{pre ? "Everything can be changed until the contest starts." : ended ? "This contest has ended. Settings are read-only." : "The contest is live. Scoring, timing and the code are locked; monitoring and access controls can still change."}</p></div>
      <fieldset disabled={ended} style={{ border: 0, padding: 0, margin: 0 }} className="stack">
        <div className="panel">
          <div className="panel-head"><h2>General</h2></div>
          <div className="panel-body form-grid">
            <div className="field"><label htmlFor="n">Name</label><input id="n" className="input" value={f.name} onChange={(e) => set("name", e.target.value)} /></div>
            <div className="field"><label htmlFor="c">Contest code</label><input id="c" className="input mono" value={f.code} disabled={!pre} onChange={(e) => set("code", e.target.value)} /><span className="hint">Participants join with this code. Team codes created under “Make it” also work.</span></div>
            <div className="field"><label htmlFor="du">Duration per participant (minutes)</label><input id="du" type="number" className="input" disabled={!pre} value={f.durationMinutes} onChange={(e) => set("durationMinutes", Number(e.target.value))} /></div>
            <div className="field"><label htmlFor="ew">Entry window after start (minutes)</label><input id="ew" type="number" className="input" disabled={!pre} value={f.entryWindowMinutes} onChange={(e) => set("entryWindowMinutes", Number(e.target.value))} /><span className="hint">Late joiners can enter until this closes. The contest closes at start + entry window + duration.</span></div>
            <div className="field"><label htmlFor="mp">Max participants</label><input id="mp" type="number" min={0} className="input" value={f.maxParticipants} onChange={(e) => set("maxParticipants", Number(e.target.value))} /><span className="hint">0 means unlimited.</span></div>
            <div className="field"><label htmlFor="sa">Scheduled for</label><input id="sa" type="datetime-local" className="input" value={toLocal(f.scheduledAt)} onChange={(e) => set("scheduledAt", e.target.value ? new Date(e.target.value).toISOString() : null)} /></div>
            <div className="field span-2"><label htmlFor="d">Description</label><textarea id="d" className="textarea" value={f.description} onChange={(e) => set("description", e.target.value)} /></div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-head"><h2>Scoring</h2>{!pre && <span className="badge dashed">Locked</span>}</div>
          <div className="panel-body stack">
            <div className="field"><span className="label">Scoring mode</span>
              {SCORING.map(([k, l, d]) => (
                <label key={k} className="row" style={{ alignItems: "flex-start", gap: 10, padding: "8px 0", cursor: pre ? "pointer" : "default" }}>
                  <input type="radio" name="scoring" checked={f.scoringMode === k} disabled={!pre} onChange={() => set("scoringMode", k)} style={{ marginTop: 4 }} />
                  <span><strong>{l}</strong><br /><span className="small muted">{d}</span></span>
                </label>
              ))}
            </div>
            <hr className="divider" />
            <div className="field"><span className="label">Penalty mode</span>
              {PENALTY.map(([k, l, d]) => (
                <label key={k} className="row" style={{ alignItems: "flex-start", gap: 10, padding: "8px 0", cursor: pre ? "pointer" : "default" }}>
                  <input type="radio" name="penalty" checked={f.penaltyMode === k} disabled={!pre} onChange={() => set("penaltyMode", k)} style={{ marginTop: 4 }} />
                  <span><strong>{l}</strong><br /><span className="small muted">{d}</span></span>
                </label>
              ))}
            </div>
            {f.penaltyMode !== "time" && (
              <div className="field" style={{ maxWidth: 260 }}><label htmlFor="wp">Minutes per wrong submission</label><input id="wp" type="number" min={0} max={120} className="input" disabled={!pre} value={f.wrongPenaltyMinutes} onChange={(e) => set("wrongPenaltyMinutes", Number(e.target.value))} /><span className="hint">Compilation errors are never penalised.</span></div>
            )}
          </div>
        </div>

        <div className="panel">
          <div className="panel-head"><h2>Monitoring & session rule</h2></div>
          <div className="panel-body">
            <div className="setting">
              <div className="d"><h4>Cheat detection · {f.cheatDetection ? "ON" : "OFF"}</h4><p className="small muted">Records tab visibility changes, window blur and attempts to leave the contest page, and shows them to you. These are browser signals and can have innocent causes; they are not proof of cheating.</p></div>
              <Switch label="Cheat detection" checked={f.cheatDetection} onChange={(v) => set("cheatDetection", v)} />
            </div>
            <div className="setting">
              <div className="d"><h4>Session termination rule</h4><p className="small muted">When on, participants see a warning on each counted violation and their session ends when the limit is reached. Their submissions are kept, and you can restore the session from Participants.</p></div>
              <Switch label="Session rule" checked={f.sessionRule.enabled} disabled={!f.cheatDetection} onChange={(v) => set("sessionRule", { ...f.sessionRule, enabled: v })} />
            </div>
            {f.sessionRule.enabled && f.cheatDetection && (
              <div className="setting">
                <div className="d"><h4>Allowed violations</h4><p className="small muted">The session ends when this many violations are counted. Events within 3 seconds of each other count once.</p></div>
                <input type="number" min={1} max={50} className="input" style={{ width: 100 }} value={f.sessionRule.maxViolations} onChange={(e) => set("sessionRule", { ...f.sessionRule, maxViolations: Number(e.target.value) })} aria-label="Allowed violations" />
              </div>
            )}
            <div className="setting">
              <div className="d"><h4>Show verdicts to participants</h4><p className="small muted">Off by default: participants only see “Submitted successfully”. Turn on to reveal the verdict, tests passed, time and memory after each submission.</p></div>
              <Switch label="Show verdicts" checked={f.showVerdicts} onChange={(v) => set("showVerdicts", v)} />
            </div>
          </div>
        </div>
        {err && <div className="notice error">{err}</div>}
        {!ended && <div className="row"><button className="btn primary" onClick={save} disabled={busy}>{busy && <Spinner />}Save settings</button><button className="btn" onClick={() => setF(data.contest)} disabled={busy}>Discard changes</button></div>}
      </fieldset>

      <div className="panel">
        <div className="panel-head"><h2>Danger zone</h2></div>
        <div className="panel-body row wrap between">
          <p className="small muted">Delete this contest with all problems, tests, participants and submissions.</p>
          <button className="btn danger" disabled={f.status === "LIVE"} onClick={() => setDel(true)} title={f.status === "LIVE" ? "End the contest first" : undefined}>Delete contest</button>
        </div>
      </div>
      {del && <ConfirmDialog open title={`Delete ${f.name}?`} body={<p>Everything in this contest is permanently deleted. This cannot be undone.</p>} confirmLabel="Delete contest" busy={busy} onClose={() => setDel(false)} onConfirm={remove} />}
    </div>
  );
}
