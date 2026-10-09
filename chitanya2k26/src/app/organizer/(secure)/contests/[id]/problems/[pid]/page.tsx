"use client";
import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, ApiError, usePoll } from "@/lib/client";
import { ApiErrorState, ConfirmDialog, SkeletonRows, Spinner, useToast } from "@/components/ui";

type Ex = { input: string; output: string; explanation?: string };
type T = { id: string; input: string; expectedOutput: string; isHidden: boolean };
const EMPTY = { title: "", description: "", inputFormat: "", outputFormat: "", constraints: "", examples: [{ input: "", output: "" }] as Ex[], timeLimit: 1, memoryLimit: 256, difficulty: "Medium", tags: "", score: 5 };

export default function ProblemEditor({ params }: { params: Promise<{ id: string; pid: string }> }) {
  const { id, pid } = use(params);
  const isNew = pid === "new";
  const router = useRouter();
  const toast = useToast();
  const { data, error, reload } = usePoll<{ problem: typeof EMPTY & { id: string; index: string; tags: string[] }; tests: T[]; contest: { status: string } }>(isNew ? null : `/api/organizer/contests/${id}/problems/${pid}`);
  const ov = usePoll<{ contest: { status: string } }>(`/api/organizer/contests/${id}`);
  const [f, setF] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (data) setF({ ...data.problem, tags: data.problem.tags.join(", "), examples: data.problem.examples.length ? data.problem.examples : [{ input: "", output: "" }] });
  }, [data]);

  const status = data?.contest.status ?? ov.data?.contest.status;
  const editable = status === "DRAFT" || status === "READY";

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(null);
    try {
      const body = { ...f, tags: f.tags.split(",").map((t) => t.trim()).filter(Boolean) };
      const d = isNew ? await api(`/api/organizer/contests/${id}/problems`, { body }) : await api(`/api/organizer/contests/${id}/problems/${pid}`, { method: "PUT", body });
      toast(isNew ? "Problem created. Add its test cases next." : "Problem saved");
      if (isNew) router.replace(`/organizer/contests/${id}/problems/${d.problem.id}#tests`);
      else reload();
    } catch (e) { setErr((e as ApiError).message); } finally { setBusy(false); }
  }

  if (error) return <ApiErrorState error={error} />;
  if (!isNew && !data) return <SkeletonRows />;
  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });

  return (
    <div className="stack" style={{ gap: 20 }}>
      <Link href={`/organizer/contests/${id}/problems`} className="small muted">← Problems</Link>
      <div className="row wrap between"><h1>{isNew ? "New problem" : `${data!.problem.index}. ${data!.problem.title}`}</h1></div>
      {status && !editable && <div className="notice">This contest has {status === "LIVE" ? "started" : "ended"}, so the problem is read-only.</div>}

      <form className="panel" onSubmit={save}>
        <div className="panel-head"><h2>Statement</h2></div>
        <fieldset disabled={!editable} style={{ border: 0, margin: 0, padding: 0 }}>
          <div className="panel-body form-grid">
            <div className="field span-2"><label htmlFor="t">Problem title</label><input id="t" className="input" value={f.title} onChange={set("title")} required /></div>
            <div className="field span-2"><label htmlFor="d">Description</label><textarea id="d" className="textarea" style={{ minHeight: 140 }} value={f.description} onChange={set("description")} /><span className="hint">Use `code` and **bold**. Blank line starts a new paragraph.</span></div>
            <div className="field"><label htmlFor="if">Input format</label><textarea id="if" className="textarea" value={f.inputFormat} onChange={set("inputFormat")} /></div>
            <div className="field"><label htmlFor="of">Output format</label><textarea id="of" className="textarea" value={f.outputFormat} onChange={set("outputFormat")} /></div>
            <div className="field span-2"><label htmlFor="c">Constraints</label><textarea id="c" className="textarea mono" value={f.constraints} onChange={set("constraints")} /></div>
            <div className="field"><label htmlFor="tl">Time limit (seconds)</label><input id="tl" type="number" step="0.5" min={0.5} max={10} className="input" value={f.timeLimit} onChange={(e) => setF({ ...f, timeLimit: Number(e.target.value) })} /></div>
            <div className="field"><label htmlFor="ml">Memory limit (MB)</label><input id="ml" type="number" min={16} max={1024} className="input" value={f.memoryLimit} onChange={(e) => setF({ ...f, memoryLimit: Number(e.target.value) })} /></div>
            <div className="field"><label htmlFor="df">Difficulty</label><select id="df" className="select" value={f.difficulty} onChange={set("difficulty")}><option>Easy</option><option>Medium</option><option>Hard</option></select></div>
            <div className="field"><label htmlFor="sc">Score</label><input id="sc" type="number" min={1} max={100} className="input" value={f.score} onChange={(e) => setF({ ...f, score: Number(e.target.value) })} /></div>
            <div className="field span-2"><label htmlFor="tg">Tags</label><input id="tg" className="input" value={f.tags} onChange={set("tags")} placeholder="graph, dijkstra" /></div>

            <div className="span-2 stack" style={{ gap: 10 }}>
              <div className="row between"><span className="label">Examples shown in the statement</span>{editable && <button type="button" className="btn sm" onClick={() => setF({ ...f, examples: [...f.examples, { input: "", output: "" }] })}>+ Example</button>}</div>
              {f.examples.map((ex, i) => (
                <div key={i} className="panel" style={{ padding: 12 }}>
                  <div className="form-grid">
                    <div className="field"><label>Input</label><textarea className="textarea mono" value={ex.input} onChange={(e) => setF({ ...f, examples: f.examples.map((x, j) => (j === i ? { ...x, input: e.target.value } : x)) })} /></div>
                    <div className="field"><label>Output</label><textarea className="textarea mono" value={ex.output} onChange={(e) => setF({ ...f, examples: f.examples.map((x, j) => (j === i ? { ...x, output: e.target.value } : x)) })} /></div>
                    <div className="field span-2"><label>Explanation (optional)</label><input className="input" value={ex.explanation ?? ""} onChange={(e) => setF({ ...f, examples: f.examples.map((x, j) => (j === i ? { ...x, explanation: e.target.value } : x)) })} /></div>
                  </div>
                  {editable && f.examples.length > 1 && <button type="button" className="btn sm ghost" style={{ marginTop: 8 }} onClick={() => setF({ ...f, examples: f.examples.filter((_, j) => j !== i) })}>Remove example</button>}
                </div>
              ))}
            </div>
            {err && <div className="notice error span-2">{err}</div>}
          </div>
        </fieldset>
        {editable && <div className="modal-foot"><button className="btn primary" disabled={busy}>{busy && <Spinner />}{isNew ? "Create problem" : "Save problem"}</button></div>}
      </form>

      {!isNew && data && <Tests contestId={id} problemId={pid} tests={data.tests} editable={editable} onChange={reload} />}
    </div>
  );
}

function Tests({ contestId, problemId, tests, editable, onChange }: { contestId: string; problemId: string; tests: T[]; editable: boolean; onChange: () => void }) {
  return (
    <div id="tests" className="grid-2">
      <TestList title="Public test cases" hint="Visible to participants and used by Run and Submit." hidden={false} {...{ contestId, problemId, editable, onChange }} tests={tests.filter((t) => !t.isHidden)} />
      <TestList title="Hidden test cases" hint="Never sent to the browser. Used only when judging a submission." hidden {...{ contestId, problemId, editable, onChange }} tests={tests.filter((t) => t.isHidden)} />
    </div>
  );
}

function TestList({ title, hint, hidden, tests, contestId, problemId, editable, onChange }: { title: string; hint: string; hidden: boolean; tests: T[]; contestId: string; problemId: string; editable: boolean; onChange: () => void }) {
  const [edit, setEdit] = useState<T | "new" | null>(null);
  const [input, setInput] = useState("");
  const [out, setOut] = useState("");
  const [del, setDel] = useState<T | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const toast = useToast();
  const base = `/api/organizer/contests/${contestId}/problems/${problemId}/tests`;

  function open(t: T | "new") { setEdit(t); setErr(null); setInput(t === "new" ? "" : t.input); setOut(t === "new" ? "" : t.expectedOutput); }
  async function save() {
    setBusy(true); setErr(null);
    try {
      const body = { input, expectedOutput: out, isHidden: hidden };
      if (edit === "new") await api(base, { body }); else await api(`${base}/${(edit as T).id}`, { method: "PUT", body });
      toast("Test case saved"); setEdit(null); onChange();
    } catch (e) { setErr((e as ApiError).message); } finally { setBusy(false); }
  }
  async function remove() {
    if (!del) return;
    setBusy(true);
    try { await api(`${base}/${del.id}`, { method: "DELETE" }); toast("Test case deleted"); setDel(null); onChange(); }
    catch (e) { setErr((e as ApiError).message); } finally { setBusy(false); }
  }

  return (
    <div className="panel">
      <div className="panel-head"><div><h3>{title} <span className="faint">({tests.length})</span></h3><div className="tiny muted">{hint}</div></div>{editable && <button className="btn sm" onClick={() => open("new")}>+ Add</button>}</div>
      <div className="panel-body stack" style={{ gap: 10 }}>
        {!tests.length && edit !== "new" && <p className="muted small">{hidden ? "No hidden tests. A problem needs at least one before the contest can be marked ready." : "No public tests yet."}</p>}
        {tests.map((t, i) => edit && edit !== "new" && edit.id === t.id ? null : (
          <div key={t.id} className="panel" style={{ padding: 10 }}>
            <div className="row between"><span className="small" style={{ fontWeight: 500 }}>#{i + 1}</span>{editable && <span className="row" style={{ gap: 4 }}><button className="btn sm ghost" onClick={() => open(t)}>Edit</button><button className="btn sm ghost" onClick={() => { setErr(null); setDel(t); }}>Delete</button></span>}</div>
            <div className="grid-2" style={{ gap: 8, marginTop: 6 }}>
              <div><div className="tiny muted">Input</div><pre className="pre" style={{ maxHeight: 120 }}>{t.input.length > 400 ? t.input.slice(0, 400) + "…" : t.input}</pre></div>
              <div><div className="tiny muted">Expected output</div><pre className="pre" style={{ maxHeight: 120 }}>{t.expectedOutput.length > 400 ? t.expectedOutput.slice(0, 400) + "…" : t.expectedOutput}</pre></div>
            </div>
          </div>
        ))}
        {edit && (
          <div className="confirm stack" style={{ gap: 10 }}>
            <strong className="small">{edit === "new" ? `New ${hidden ? "hidden" : "public"} test` : "Edit test"}</strong>
            <div className="field"><label>Input</label><textarea className="textarea mono" value={input} onChange={(e) => setInput(e.target.value)} placeholder={hidden ? "100000" : "5"} /></div>
            <div className="field"><label>Expected output</label><textarea className="textarea mono" value={out} onChange={(e) => setOut(e.target.value)} placeholder={hidden ? "10000000000" : "25"} /></div>
            {err && <div className="notice error">{err}</div>}
            <div className="row"><button className="btn primary sm" onClick={save} disabled={busy}>{busy && <Spinner />}Save test</button><button className="btn sm" onClick={() => setEdit(null)}>Cancel</button></div>
          </div>
        )}
      </div>
      {del && <ConfirmDialog open title="Delete test case?" body={<p>This {hidden ? "hidden" : "public"} test case is removed permanently.</p>} confirmLabel="Delete" busy={busy} onClose={() => setDel(null)} onConfirm={remove}>{err && <div className="notice error">{err}</div>}</ConfirmDialog>}
    </div>
  );
}
