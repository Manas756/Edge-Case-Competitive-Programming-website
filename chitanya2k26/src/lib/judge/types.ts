import type { Language, Verdict } from "../types";

export interface JudgeTest {
  input: string;
  expected: string;
}

export interface JudgeRequest {
  language: Language;
  source: string;
  tests: JudgeTest[];
  timeLimit: number; // seconds
  memoryLimit: number; // MB
  stopOnFailure: boolean;
}

export interface JudgeTestOutcome {
  verdict: Verdict;
  time: number | null; // ms
  memory: number | null; // KB
  stdout: string | null;
  message: string | null;
}

// A judge adapter sends code to an isolated sandbox and maps the result to our verdicts.
// Participant code is never executed inside this Next.js process.
export interface JudgeAdapter {
  name: string;
  executesCode: boolean;
  judge(req: JudgeRequest): Promise<JudgeTestOutcome[]>;
}

export class JudgeUnavailableError extends Error {}
