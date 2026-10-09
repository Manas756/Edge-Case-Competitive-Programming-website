import { JudgeAdapter } from "./types";

// DEMO ONLY. This adapter does not run code, so its verdicts mean nothing about correctness.
// It exists so the UI flow can be explored without a sandbox. Every submission it judges is
// tagged "simulated" and the UI says so. Use JUDGE_PROVIDER=judge0 for a real contest.
export function createSimulatedAdapter(): JudgeAdapter {
  return {
    name: "simulated",
    executesCode: false,
    async judge(req) {
      await new Promise((r) => setTimeout(r, 400 + Math.random() * 500));
      const src = req.source;
      const opens = (src.match(/[({[]/g) || []).length;
      const closes = (src.match(/[)}\]]/g) || []).length;
      const writesOutput = /\b(cout|printf|puts|print|System\.out|console\.log|process\.stdout)\b/.test(src);
      const trivial = !writesOutput || /TODO|your code here/i.test(src);
      return req.tests.map((t, i) => {
        if (opens !== closes) return { verdict: "Compilation Error" as const, time: null, memory: null, stdout: null, message: "Simulated judge: unbalanced brackets" };
        if (trivial) return { verdict: "Wrong Answer" as const, time: 4, memory: 3100, stdout: "", message: null };
        return { verdict: "Accepted" as const, time: 8 + i * 3, memory: 3300 + i * 40, stdout: t.expected, message: null };
      }).slice(0, opens !== closes ? 1 : undefined);
    },
  };
}
