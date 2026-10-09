import type { Language, Verdict } from "../types";
import { JudgeAdapter, JudgeRequest, JudgeTestOutcome, JudgeUnavailableError } from "./types";

// Judge0 CE language ids. Override with JUDGE0_LANGUAGE_IDS='{"cpp":54,...}' if your instance differs.
const DEFAULT_IDS: Record<Language, number> = { cpp: 54, c: 50, python: 71, java: 62, javascript: 63 };

const b64 = (s: string) => Buffer.from(s, "utf8").toString("base64");
const unb64 = (s: string | null | undefined) => (s ? Buffer.from(s, "base64").toString("utf8") : null);

function mapStatus(id: number): Verdict {
  if (id === 3) return "Accepted";
  if (id === 4) return "Wrong Answer";
  if (id === 5) return "Time Limit Exceeded";
  if (id === 6) return "Compilation Error";
  if (id >= 7 && id <= 12) return "Runtime Error";
  return "Judge Error";
}

export function createJudge0Adapter(): JudgeAdapter {
  const base = (process.env.JUDGE0_URL || "").trim().replace(/\/$/, "");
  let customIds: Partial<Record<Language, number>> = {};
  if (process.env.JUDGE0_LANGUAGE_IDS) {
    try {
      customIds = JSON.parse(process.env.JUDGE0_LANGUAGE_IDS);
    } catch {
      console.warn("Invalid JUDGE0_LANGUAGE_IDS JSON. Falling back to default language IDs.");
    }
  }
  const ids: Record<Language, number> = { ...DEFAULT_IDS, ...customIds };
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (process.env.JUDGE0_API_KEY) {
    headers["X-RapidAPI-Key"] = process.env.JUDGE0_API_KEY;
    if (process.env.JUDGE0_API_HOST) headers["X-RapidAPI-Host"] = process.env.JUDGE0_API_HOST;
  }
  if (process.env.JUDGE0_AUTH_TOKEN) headers["X-Auth-Token"] = process.env.JUDGE0_AUTH_TOKEN;

  async function runOne(req: JudgeRequest, input: string, expected: string): Promise<JudgeTestOutcome> {
    if (!base) throw new JudgeUnavailableError("JUDGE0_URL is not configured");
    const langId = ids[req.language];
    if (!langId) throw new JudgeUnavailableError(`Language '${req.language}' is not configured on Judge0`);
    const memKb = req.memoryLimit * 1024;
    let res: Response;
    try {
      res = await fetch(`${base}/submissions?base64_encoded=true&wait=true`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          source_code: b64(req.source),
          language_id: langId,
          stdin: b64(input),
          expected_output: b64(expected),
          cpu_time_limit: req.timeLimit,
          wall_time_limit: req.timeLimit * 3,
          memory_limit: memKb,
        }),
        signal: AbortSignal.timeout(30_000),
      });
    } catch (e) {
      throw new JudgeUnavailableError(`Judge0 unreachable: ${(e as Error).message}`);
    }
    if (!res.ok) throw new JudgeUnavailableError(`Judge0 returned HTTP ${res.status}`);
    const data = await res.json();
    let verdict = mapStatus(data.status?.id ?? 13);
    const memory = typeof data.memory === "number" ? data.memory : null;
    // Judge0 reports memory overruns as runtime errors (usually SIGSEGV / SIGKILL); detect them by usage.
    if (verdict === "Runtime Error" && memory !== null && memory >= memKb * 0.95) verdict = "Memory Limit Exceeded";
    const message = unb64(data.compile_output) || unb64(data.stderr) || (verdict === "Judge Error" ? data.status?.description ?? null : null);
    return {
      verdict,
      time: data.time != null ? Math.round(parseFloat(data.time) * 1000) : null,
      memory,
      stdout: unb64(data.stdout),
      message: message ? message.slice(0, 4000) : null,
    };
  }

  return {
    name: "judge0",
    executesCode: true,
    async judge(req) {
      const out: JudgeTestOutcome[] = [];
      for (const t of req.tests) {
        const r = await runOne(req, t.input, t.expected);
        out.push(r);
        if (r.verdict === "Compilation Error") break;
        if (req.stopOnFailure && r.verdict !== "Accepted") break;
      }
      return out;
    },
  };
}
