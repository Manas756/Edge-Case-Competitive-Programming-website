import { createJudge0Adapter } from "./judge0";
import { createSimulatedAdapter } from "./simulated";
import type { JudgeAdapter } from "./types";

export * from "./types";

let adapter: JudgeAdapter | null = null;

export function getJudge(): JudgeAdapter {
  if (adapter) return adapter;
  const provider = (process.env.JUDGE_PROVIDER || "judge0").toLowerCase();
  adapter = provider === "simulated" ? createSimulatedAdapter() : createJudge0Adapter();
  return adapter;
}
