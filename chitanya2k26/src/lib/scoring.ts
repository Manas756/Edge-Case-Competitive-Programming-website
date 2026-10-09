// Pluggable scoring and penalty rules. Add a new entry to either registry to support another format.
import type { Contest, Problem, Submission } from "./types";

export interface ProblemResult {
  problemId: string;
  solved: boolean;
  solvedAtMin: number | null; // minutes since the participant started
  wrongBefore: number; // rejected attempts before the first accept
  attempts: number;
  points: number;
}

export interface Standing {
  score: number;
  penalty: number;
  solvedCount: number;
  lastAcceptedAt: string | null;
  problems: ProblemResult[];
}

export interface PenaltyMode {
  key: string;
  label: string;
  description: (c: Pick<Contest, "wrongPenaltyMinutes">) => string;
  compute: (solved: ProblemResult[], c: Pick<Contest, "wrongPenaltyMinutes">) => number;
}

export interface ScoringMode {
  key: string;
  label: string;
  description: string;
  points: (p: Problem) => number;
  compare: (a: Standing, b: Standing) => number; // negative = a ranks higher
}

const lastSolve = (s: ProblemResult[]) => s.reduce((m, r) => Math.max(m, r.solvedAtMin ?? 0), 0);
const wrongs = (s: ProblemResult[]) => s.reduce((m, r) => m + r.wrongBefore, 0);

export const PENALTY_MODES: Record<string, PenaltyMode> = {
  time: {
    key: "time",
    label: "Time-based",
    description: () => "Penalty is the time of your last accepted submission, in minutes from when you entered.",
    compute: (s) => lastSolve(s),
  },
  time_wrong: {
    key: "time_wrong",
    label: "Time + wrong submissions",
    description: (c) => `Time of the last accepted submission plus ${c.wrongPenaltyMinutes} minutes for each rejected attempt on a solved problem.`,
    compute: (s, c) => lastSolve(s) + wrongs(s) * c.wrongPenaltyMinutes,
  },
  icpc_sum: {
    key: "icpc_sum",
    label: "ICPC cumulative",
    description: (c) => `Sum of solve times for every solved problem plus ${c.wrongPenaltyMinutes} minutes per rejected attempt on it.`,
    compute: (s, c) => s.reduce((m, r) => m + (r.solvedAtMin ?? 0), 0) + wrongs(s) * c.wrongPenaltyMinutes,
  },
};

export const SCORING_MODES: Record<string, ScoringMode> = {
  leetcode: {
    key: "leetcode",
    label: "Weighted score",
    description: "Each problem carries its own points. Rank by total score, then by lower penalty.",
    points: (p) => p.score,
    compare: (a, b) => b.score - a.score || a.penalty - b.penalty,
  },
  icpc: {
    key: "icpc",
    label: "Problems solved",
    description: "Every problem is worth one point. Rank by number solved, then by lower penalty.",
    points: () => 1,
    compare: (a, b) => b.solvedCount - a.solvedCount || a.penalty - b.penalty,
  },
};

// Verdicts that do not count as a penalised attempt.
const NEUTRAL = new Set(["Compilation Error", "Judge Error", "Pending"]);

export function computeStanding(contest: Contest, problems: Problem[], subs: Submission[], startedAt: string | null): Standing {
  const scoring = SCORING_MODES[contest.scoringMode] ?? SCORING_MODES.leetcode;
  const penalty = PENALTY_MODES[contest.penaltyMode] ?? PENALTY_MODES.time;
  const start = startedAt ? Date.parse(startedAt) : 0;
  let lastAcceptedAt: string | null = null;

  const results: ProblemResult[] = problems.map((p) => {
    const mine = subs.filter((s) => s.problemId === p.id).sort((a, b) => a.submittedAt.localeCompare(b.submittedAt));
    let wrongBefore = 0;
    for (const s of mine) {
      if (s.verdict === "Accepted") {
        if (!lastAcceptedAt || s.submittedAt > lastAcceptedAt) lastAcceptedAt = s.submittedAt;
        const min = Math.max(0, Math.floor((Date.parse(s.submittedAt) - start) / 60000));
        return { problemId: p.id, solved: true, solvedAtMin: min, wrongBefore, attempts: mine.length, points: scoring.points(p) };
      }
      if (!NEUTRAL.has(s.verdict)) wrongBefore++;
    }
    return { problemId: p.id, solved: false, solvedAtMin: null, wrongBefore, attempts: mine.length, points: 0 };
  });

  const solved = results.filter((r) => r.solved);
  return {
    score: solved.reduce((m, r) => m + r.points, 0),
    penalty: penalty.compute(solved, contest),
    solvedCount: solved.length,
    lastAcceptedAt,
    problems: results,
  };
}

export function compareStandings(contest: Contest, a: Standing, b: Standing) {
  const scoring = SCORING_MODES[contest.scoringMode] ?? SCORING_MODES.leetcode;
  return (
    scoring.compare(a, b) ||
    (a.lastAcceptedAt ?? "9").localeCompare(b.lastAcceptedAt ?? "9")
  );
}
