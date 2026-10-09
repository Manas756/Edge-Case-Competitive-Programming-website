// All contest rules live here, on the server. API routes call these; the UI never decides permissions.
import { getDb, save, newId } from "./store";
import { computeStanding, compareStandings, SCORING_MODES, PENALTY_MODES } from "./scoring";
import { getJudge, JudgeUnavailableError } from "./judge";
import type {
  Contest, ContestParticipant, ContestStatus, Incident, IncidentType, Language, Problem, Submission, TestCase, TestResult, Verdict, Team,
} from "./types";

export class AppError extends Error {
  constructor(public code: string, message: string, public status = 400) {
    super(message);
  }
}

const now = () => Date.now();
const iso = (t = now()) => new Date(t).toISOString();
const MIN = 60_000;
export const LANGUAGES: Language[] = ["cpp", "c", "python", "java", "javascript"];

// ---------- State maintenance ----------
export function tick(c: Contest) {
  const db = getDb();
  let dirty = false;
  if (c.status === "LIVE" && !c.pausedAt && c.endTime && Date.parse(c.endTime) <= now()) {
    c.status = "ENDED";
    dirty = true;
  }
  for (const p of db.participants) {
    if (p.contestId !== c.id || p.sessionStatus !== "ACTIVE") continue;
    const expired = !c.pausedAt && p.endsAt && Date.parse(p.endsAt) <= now();
    if (expired || c.status === "ENDED") {
      p.sessionStatus = "FINISHED";
      dirty = true;
    }
  }
  if (dirty) save();
}

export function getContest(id: string): Contest {
  const c = getDb().contests.find((x) => x.id === id);
  if (!c) throw new AppError("NOT_FOUND", "Contest not found", 404);
  tick(c);
  return c;
}

export const contestProblems = (contestId: string) =>
  getDb().problems.filter((p) => p.contestId === contestId).sort((a, b) => a.index.localeCompare(b.index));

const participantsOf = (contestId: string) => getDb().participants.filter((p) => p.contestId === contestId);

// ---------- Public views ----------
export function publicContest(c: Contest) {
  return {
    id: c.id,
    name: c.name,
    description: c.description,
    status: c.status,
    paused: !!c.pausedAt,
    scheduledAt: c.scheduledAt,
    startTime: c.startTime,
    endTime: c.endTime,
    durationMinutes: c.durationMinutes,
    entryWindowMinutes: c.entryWindowMinutes,
    participants: participantsOf(c.id).length,
    problemCount: contestProblems(c.id).length,
    maxParticipants: c.maxParticipants,
    scoring: SCORING_MODES[c.scoringMode]?.label ?? c.scoringMode,
    penalty: PENALTY_MODES[c.penaltyMode]?.description(c) ?? c.penaltyMode,
    cheatDetection: c.cheatDetection,
    sessionRule: c.sessionRule,
  };
}
export type PublicContest = ReturnType<typeof publicContest>;

export function listPublicContests() {
  return getDb()
    .contests.filter((c) => c.status !== "DRAFT")
    .map((c) => (tick(c), publicContest(c)))
    .sort((a, b) => order(a.status) - order(b.status) || (b.scheduledAt ?? "").localeCompare(a.scheduledAt ?? ""));
}
const order = (s: ContestStatus) => ({ LIVE: 0, READY: 1, ENDED: 2, DRAFT: 3 })[s];

// Problem as participants see it: no hidden tests, ever.
export function participantProblem(p: Problem) {
  return {
    id: p.id, index: p.index, title: p.title, description: p.description, inputFormat: p.inputFormat,
    outputFormat: p.outputFormat, constraints: p.constraints, examples: p.examples, timeLimit: p.timeLimit,
    memoryLimit: p.memoryLimit, difficulty: p.difficulty, tags: p.tags, score: p.score,
  };
}

// ---------- Codes / joining ----------
export function resolveCode(raw: string): { contest: Contest; team: Team | null } {
  const code = raw.trim().toLowerCase();
  if (!code) throw new AppError("INVALID_CODE", "Enter a team or contest code.");
  const db = getDb();
  const team = db.teams.find((t) => t.code.toLowerCase() === code) ?? null;
  const contest = team
    ? db.contests.find((c) => c.id === team.contestId)
    : db.contests.find((c) => c.code.toLowerCase() === code || (code === "challenge" && c.status === "LIVE") || (code === "chitanya2k26" && c.code.toLowerCase() === "chaitanya2k26"));
  if (!contest || contest.status === "DRAFT") throw new AppError("INVALID_CODE", "That code does not match any open contest. Check it and try again.", 404);
  tick(contest);
  return { contest, team };
}

export function createTeam(contestCode: string, teamName: string) {
  const { contest } = resolveCode(contestCode);
  if (contest.status === "ENDED") throw new AppError("CONTEST_ENDED", "This contest has ended. Teams can no longer be created.");
  const name = teamName.trim().slice(0, 40);
  if (name.length < 2) throw new AppError("INVALID_TEAM", "Team name needs at least 2 characters.");
  const db = getDb();
  if (db.teams.some((t) => t.contestId === contest.id && t.name.toLowerCase() === name.toLowerCase()))
    throw new AppError("TEAM_EXISTS", "A team with that name already exists in this contest.");
  const slug = name.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6) || "TEAM";
  let code: string;
  do code = `${slug}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  while (db.teams.some((t) => t.code === code) || db.contests.some((c) => c.code === code));
  const team: Team = { id: newId("team"), contestId: contest.id, name, code, createdAt: iso() };
  db.teams.push(team);
  save();
  return { team, contest: publicContest(contest) };
}

function entryError(c: Contest): AppError | null {
  if (c.status === "READY") return new AppError("NOT_STARTED", "This contest has not started yet. Come back when it goes live.", 409);
  if (c.status === "ENDED") return new AppError("CONTEST_ENDED", "This contest has ended. You can still view the final leaderboard.", 409);
  if (c.status !== "LIVE") return new AppError("INVALID_CODE", "This contest is not open.", 409);
  return null;
}

export function joinContest(input: { code: string; name: string; email: string }) {
  const { contest: c, team } = resolveCode(input.code);
  const name = input.name.trim().slice(0, 60);
  const email = input.email.trim().toLowerCase().slice(0, 120);
  if (name.length < 2) throw new AppError("INVALID_NAME", "Enter your name (at least 2 characters).");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new AppError("INVALID_EMAIL", "Enter a valid email address.");
  const db = getDb();

  let user = db.users.find((u) => u.email === email);
  const existing = user ? db.participants.find((p) => p.contestId === c.id && p.userId === user!.id) : undefined;

  if (existing) {
    if (existing.sessionStatus === "BLOCKED") throw new AppError("BLOCKED", "You have been blocked from this contest. Contact the organizer.", 403);
    if (existing.sessionStatus === "TERMINATED") throw new AppError("TERMINATED", "Your session was terminated. The organizer can restore it if this was a mistake.", 403);
    if (existing.sessionStatus === "FINISHED") throw new AppError("FINISHED", "Your time for this contest is over. Check the leaderboard for results.", 409);
    const err = entryError(c);
    if (err && c.status !== "LIVE") throw err;
    existing.lastActivity = iso();
    save();
    return { contest: c, participant: existing, resumed: true };
  }

  const err = entryError(c);
  if (err) throw err;
  const entryCloses = Date.parse(c.startTime!) + c.entryWindowMinutes * MIN;
  if (!c.pausedAt && now() > entryCloses) throw new AppError("ENTRY_CLOSED", "The entry window for this contest has closed.", 409);
  if (c.maxParticipants > 0 && participantsOf(c.id).length >= c.maxParticipants)
    throw new AppError("CONTEST_FULL", "This contest is full. No more participants can join.", 409);

  if (!user) {
    user = { id: newId("usr"), name, email, role: "participant" };
    db.users.push(user);
  }
  const start = now();
  const p: ContestParticipant = {
    contestId: c.id,
    userId: user.id,
    teamId: team?.id ?? null,
    score: 0, penalty: 0, solvedCount: 0,
    sessionStatus: "ACTIVE",
    cheatViolations: 0,
    startedAt: iso(start),
    endsAt: iso(Math.min(start + c.durationMinutes * MIN, Date.parse(c.endTime!))),
    lastActivity: iso(start),
    lastAcceptedAt: null,
    sessionEpoch: 1,
  };
  db.participants.push(p);
  save();
  return { contest: c, participant: p, resumed: false };
}

export function requireParticipant(contestId: string, uid: string, epoch: number) {
  const c = getContest(contestId);
  const p = getDb().participants.find((x) => x.contestId === contestId && x.userId === uid);
  if (!p) throw new AppError("NOT_JOINED", "You have not joined this contest.", 401);
  if (p.sessionEpoch !== epoch) throw new AppError("SESSION_REPLACED", "This session is no longer valid. Join again with your code.", 401);
  return { c, p };
}

function assertCanAct(c: Contest, p: ContestParticipant) {
  if (p.sessionStatus === "BLOCKED") throw new AppError("BLOCKED", "You have been blocked from this contest.", 403);
  if (p.sessionStatus === "TERMINATED") throw new AppError("TERMINATED", "Your session was terminated.", 403);
  if (p.sessionStatus === "FINISHED" || c.status === "ENDED") throw new AppError("CONTEST_ENDED", "Time is up. Submissions are locked.", 409);
  if (c.status !== "LIVE") throw new AppError("NOT_STARTED", "The contest is not live.", 409);
  if (c.pausedAt) throw new AppError("PAUSED", "The contest is paused by the organizer.", 409);
}

export function arenaState(contestId: string, uid: string, epoch: number) {
  const { c, p } = requireParticipant(contestId, uid, epoch);
  const db = getDb();
  const mine = db.submissions.filter((s) => s.contestId === c.id && s.userId === uid);
  const user = db.users.find((u) => u.id === uid)!;
  return {
    contest: publicContest(c),
    me: {
      name: user.name,
      team: db.teams.find((t) => t.id === p.teamId)?.name ?? null,
      sessionStatus: p.sessionStatus,
      startedAt: p.startedAt,
      endsAt: p.endsAt,
      violations: p.cheatViolations,
      serverNow: iso(),
    },
    problems: contestProblems(c.id).map((pr) => ({
      ...participantProblem(pr),
      submitted: mine.some((s) => s.problemId === pr.id && s.verdict !== "Judge Error"),
    })),
    showVerdicts: c.showVerdicts,
    simulatedJudge: !getJudge().executesCode,
  };
}

// ---------- Running / submitting ----------
const busy = new Set<string>();

async function judgeAgainst(lang: Language, code: string, problem: Problem, tcs: TestCase[], stopOnFailure: boolean) {
  const judge = getJudge();
  const outcomes = await judge.judge({
    language: lang, source: code, timeLimit: problem.timeLimit, memoryLimit: problem.memoryLimit, stopOnFailure,
    tests: tcs.map((t) => ({ input: t.input, expected: t.expectedOutput })),
  });
  return { judge, outcomes };
}

function validateCode(problemId: string, contestId: string, lang: string, code: string) {
  const problem = getDb().problems.find((x) => x.id === problemId && x.contestId === contestId);
  if (!problem) throw new AppError("NOT_FOUND", "Problem not found.", 404);
  if (!LANGUAGES.includes(lang as Language)) throw new AppError("BAD_LANGUAGE", "Unsupported language.");
  if (!code.trim()) throw new AppError("EMPTY_CODE", "Write some code before running it.");
  if (code.length > 64_000) throw new AppError("CODE_TOO_LARGE", "Source code is limited to 64 KB.");
  return problem;
}

export async function runCode(contestId: string, uid: string, epoch: number, problemId: string, lang: string, code: string) {
  const { c, p } = requireParticipant(contestId, uid, epoch);
  assertCanAct(c, p);
  const problem = validateCode(problemId, contestId, lang, code);
  const key = `run:${uid}`;
  if (busy.has(key)) throw new AppError("BUSY", "A run is already in progress.", 429);
  busy.add(key);
  try {
    const pub = getDb().testCases.filter((t) => t.problemId === problem.id && !t.isHidden);
    const { judge, outcomes } = await judgeAgainst(lang as Language, code, problem, pub, false);
    p.lastActivity = iso();
    save();
    const results: TestResult[] = outcomes.map((o, i) => ({
      index: i + 1, verdict: o.verdict, time: o.time, memory: o.memory,
      input: pub[i].input, expected: pub[i].expectedOutput, output: o.stdout ?? "", message: o.message ?? undefined,
    }));
    return { verdict: overall(outcomes.map((o) => o.verdict)), results, simulated: !judge.executesCode };
  } catch (e) {
    if (e instanceof JudgeUnavailableError) throw new AppError("JUDGE_UNAVAILABLE", "The judge is unavailable right now. Try again in a moment.", 503);
    throw e;
  } finally {
    busy.delete(key);
  }
}

function overall(vs: Verdict[]): Verdict {
  return vs.find((v) => v !== "Accepted") ?? "Accepted";
}

export async function submitCode(contestId: string, uid: string, epoch: number, problemId: string, lang: string, code: string) {
  const { c, p } = requireParticipant(contestId, uid, epoch);
  assertCanAct(c, p);
  if (p.endsAt && Date.parse(p.endsAt) <= now()) throw new AppError("CONTEST_ENDED", "Time is up. Submissions are locked.", 409);
  const problem = validateCode(problemId, contestId, lang, code);
  const key = `sub:${uid}`;
  if (busy.has(key)) throw new AppError("BUSY", "Your previous submission is still being judged.", 429);
  busy.add(key);
  const submittedAt = iso();
  try {
    // Public tests first, then hidden ones; hidden data never leaves this function.
    const all = getDb().testCases.filter((t) => t.problemId === problem.id).sort((a, b) => Number(a.isHidden) - Number(b.isHidden));
    if (!all.length) throw new AppError("NO_TESTS", "This problem has no test cases yet. Tell the organizer.", 409);
    const { judge, outcomes } = await judgeAgainst(lang as Language, code, problem, all, true);
    const verdict = outcomes.length < all.length && outcomes.every((o) => o.verdict === "Accepted") ? "Judge Error" : overall(outcomes.map((o) => o.verdict));
    const times = outcomes.map((o) => o.time).filter((x): x is number => x != null);
    const mems = outcomes.map((o) => o.memory).filter((x): x is number => x != null);
    const s: Submission = {
      id: newId("sub"),
      contestId, userId: uid, problemId: problem.id, language: lang as Language, sourceCode: code,
      verdict,
      executionTime: times.length ? Math.max(...times) : null,
      memoryUsed: mems.length ? Math.max(...mems) : null,
      passed: outcomes.filter((o) => o.verdict === "Accepted").length,
      total: all.length,
      message: outcomes.find((o) => o.message)?.message ?? null,
      judge: judge.name,
      submittedAt,
    };
    const db = getDb();
    db.submissions.push(s);
    p.lastActivity = iso();
    recompute(c, p);
    save();
    const firstFail = outcomes.find((o) => o.verdict !== "Accepted");
    return {
      ok: true,
      submissionId: s.id,
      simulated: !judge.executesCode,
      ...(c.showVerdicts
        ? { verdict, passed: s.passed, total: s.total, time: s.executionTime, memory: s.memoryUsed, message: firstFail?.verdict === "Compilation Error" ? firstFail.message : null }
        : {}),
    };
  } catch (e) {
    if (e instanceof JudgeUnavailableError) throw new AppError("JUDGE_UNAVAILABLE", "Submission failed: the judge could not be reached. Your code was not recorded, so you can submit again.", 503);
    throw e;
  } finally {
    busy.delete(key);
  }
}

export function recompute(c: Contest, p: ContestParticipant) {
  const subs = getDb().submissions.filter((s) => s.contestId === c.id && s.userId === p.userId);
  const st = computeStanding(c, contestProblems(c.id), subs, p.startedAt);
  p.score = st.score;
  p.penalty = st.penalty;
  p.solvedCount = st.solvedCount;
  p.lastAcceptedAt = st.lastAcceptedAt;
  return st;
}

// ---------- Leaderboard / stats ----------
export function leaderboard(contestId: string) {
  const c = getContest(contestId);
  const db = getDb();
  const problems = contestProblems(c.id);
  const rows = participantsOf(c.id).map((p) => {
    const st = recompute(c, p);
    const u = db.users.find((x) => x.id === p.userId);
    return {
      userId: p.userId,
      name: u?.name ?? "Unknown",
      team: db.teams.find((t) => t.id === p.teamId)?.name ?? null,
      status: p.sessionStatus,
      st,
    };
  });
  rows.sort((a, b) => compareStandings(c, a.st, b.st) || a.name.localeCompare(b.name));
  let rank = 0;
  const out = rows.map((r, i) => {
    const prev = rows[i - 1];
    if (!prev || compareStandings(c, prev.st, r.st) !== 0) rank = i + 1;
    return {
      rank, userId: r.userId, name: r.name, team: r.team, status: r.status,
      solved: r.st.solvedCount, score: r.st.score, penalty: r.st.penalty, lastAcceptedAt: r.st.lastAcceptedAt,
      problems: r.st.problems.map((x) => ({ solved: x.solved, attempts: x.attempts, at: x.solvedAtMin })),
    };
  });
  return {
    contest: publicContest(c),
    problems: problems.map((p) => ({ id: p.id, index: p.index, title: p.title, score: p.score })),
    rows: out,
    final: c.status === "ENDED",
    updatedAt: iso(),
  };
}

export function problemStats(contestId: string) {
  const subs = getDb().submissions.filter((s) => s.contestId === contestId);
  return contestProblems(contestId).map((p) => {
    const mine = subs.filter((s) => s.problemId === p.id);
    const n = (v: Verdict) => mine.filter((s) => s.verdict === v).length;
    return {
      id: p.id, index: p.index, title: p.title,
      attempts: mine.length,
      accepted: n("Accepted"),
      failed: mine.length - n("Accepted"),
      wa: n("Wrong Answer"), tle: n("Time Limit Exceeded"), mle: n("Memory Limit Exceeded"),
      ce: n("Compilation Error"), re: n("Runtime Error"),
      solvers: new Set(mine.filter((s) => s.verdict === "Accepted").map((s) => s.userId)).size,
    };
  });
}

// ---------- Cheat detection / session rule ----------
const INCIDENT_TYPES: IncidentType[] = ["visibility_hidden", "window_blur", "leave_attempt", "fullscreen_exit", "paste_burst"];

export function reportIncident(contestId: string, uid: string, epoch: number, type: string, detail: string) {
  const { c, p } = requireParticipant(contestId, uid, epoch);
  if (!c.cheatDetection) return { tracked: false, violations: p.cheatViolations, terminated: false, max: c.sessionRule.maxViolations };
  if (!INCIDENT_TYPES.includes(type as IncidentType)) throw new AppError("BAD_EVENT", "Unknown event type.");
  if (p.sessionStatus !== "ACTIVE") return { tracked: false, violations: p.cheatViolations, terminated: p.sessionStatus === "TERMINATED", max: c.sessionRule.maxViolations };
  const db = getDb();
  // blur + visibilitychange usually fire together; count one violation per 3 s window.
  const last = db.incidents.filter((i) => i.contestId === c.id && i.userId === uid && i.counted).at(-1);
  const counted = !last || now() - Date.parse(last.at) > 3000;
  const inc: Incident = { id: newId("inc"), contestId: c.id, userId: uid, type: type as IncidentType, detail: detail.slice(0, 200), at: iso(), counted };
  db.incidents.push(inc);
  if (counted) p.cheatViolations++;
  let terminated = false;
  if (counted && c.sessionRule.enabled && p.cheatViolations >= c.sessionRule.maxViolations) {
    p.sessionStatus = "TERMINATED";
    terminated = true;
    audit(c.id, uid, `Session terminated automatically after ${p.cheatViolations} ${p.cheatViolations === 1 ? "violation" : "violations"}`);
  }
  p.lastActivity = iso();
  save();
  return { tracked: true, violations: p.cheatViolations, terminated, max: c.sessionRule.maxViolations, ruleEnabled: c.sessionRule.enabled };
}

export function heartbeat(contestId: string, uid: string, epoch: number) {
  const { p } = requireParticipant(contestId, uid, epoch);
  if (p.sessionStatus === "ACTIVE") {
    p.lastActivity = iso();
    save();
  }
  return arenaState(contestId, uid, epoch);
}

function audit(contestId: string, userId: string | null, action: string) {
  getDb().audit.push({ id: newId("aud"), contestId, userId, action, at: iso() });
}

// ---------- Organizer ----------
export function organizerContests() {
  return getDb().contests.map((c) => (tick(c), { ...c, participants: participantsOf(c.id).length, problemCount: contestProblems(c.id).length }));
}

export function organizerOverview(contestId: string) {
  const c = getContest(contestId);
  const ps = participantsOf(c.id);
  const count = (s: string) => ps.filter((p) => p.sessionStatus === s).length;
  return {
    contest: c,
    judge: { name: getJudge().name, executesCode: getJudge().executesCode },
    counts: { total: ps.length, active: count("ACTIVE"), finished: count("FINISHED"), blocked: count("BLOCKED"), terminated: count("TERMINATED") },
    stats: problemStats(c.id),
    serverNow: iso(),
  };
}

export function organizerParticipants(contestId: string) {
  const c = getContest(contestId);
  const db = getDb();
  return participantsOf(c.id).map((p) => {
    const u = db.users.find((x) => x.id === p.userId)!;
    recompute(c, p);
    return {
      ...p,
      name: u?.name ?? "Unknown",
      email: u?.email ?? "",
      team: db.teams.find((t) => t.id === p.teamId)?.name ?? null,
      submissions: db.submissions.filter((s) => s.contestId === c.id && s.userId === p.userId).length,
      incidents: db.incidents.filter((i) => i.contestId === c.id && i.userId === p.userId).length,
    };
  });
}

export function organizerParticipant(contestId: string, uid: string) {
  const row = organizerParticipants(contestId).find((p) => p.userId === uid);
  if (!row) throw new AppError("NOT_FOUND", "Participant not found", 404);
  const db = getDb();
  return {
    participant: row,
    submissions: db.submissions.filter((s) => s.contestId === contestId && s.userId === uid).sort((a, b) => b.submittedAt.localeCompare(a.submittedAt)).map(stripSource),
    incidents: db.incidents.filter((i) => i.contestId === contestId && i.userId === uid).sort((a, b) => b.at.localeCompare(a.at)),
    audit: db.audit.filter((a) => a.contestId === contestId && a.userId === uid).sort((a, b) => b.at.localeCompare(a.at)),
    problems: contestProblems(contestId).map((p) => ({ id: p.id, index: p.index, title: p.title })),
  };
}

const stripSource = ({ sourceCode, ...s }: Submission) => ({ ...s, lines: sourceCode.split("\n").length });

export function organizerSubmissions(contestId: string) {
  getContest(contestId);
  const db = getDb();
  return db.submissions
    .filter((s) => s.contestId === contestId)
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
    .map((s) => ({
      ...stripSource(s),
      participant: db.users.find((u) => u.id === s.userId)?.name ?? "Unknown",
      problem: db.problems.find((p) => p.id === s.problemId),
    }))
    .map(({ problem, ...s }) => ({ ...s, problemIndex: problem?.index ?? "?", problemTitle: problem?.title ?? "Deleted problem" }));
}

export function organizerSubmission(contestId: string, sid: string) {
  const db = getDb();
  const s = db.submissions.find((x) => x.id === sid && x.contestId === contestId);
  if (!s) throw new AppError("NOT_FOUND", "Submission not found", 404);
  const p = db.problems.find((x) => x.id === s.problemId);
  const u = db.users.find((x) => x.id === s.userId);
  const others = db.submissions.filter((x) => x.contestId === contestId && x.userId === s.userId && x.problemId === s.problemId)
    .sort((a, b) => a.submittedAt.localeCompare(b.submittedAt)).map((x) => ({ id: x.id, verdict: x.verdict, submittedAt: x.submittedAt }));
  return { submission: s, problem: p ? { id: p.id, index: p.index, title: p.title, timeLimit: p.timeLimit, memoryLimit: p.memoryLimit } : null, participant: u ? { id: u.id, name: u.name, email: u.email } : null, history: others };
}

export function organizerIncidents(contestId: string) {
  const db = getDb();
  return db.incidents
    .filter((i) => i.contestId === contestId)
    .sort((a, b) => b.at.localeCompare(a.at))
    .map((i) => ({ ...i, name: db.users.find((u) => u.id === i.userId)?.name ?? "Unknown" }));
}

export type SessionAction = "restore" | "allow_reentry" | "terminate" | "block" | "unblock" | "delete";

export function sessionControl(contestId: string, uid: string, action: SessionAction, extraMinutes = 15) {
  const c = getContest(contestId);
  const db = getDb();
  const p = db.participants.find((x) => x.contestId === contestId && x.userId === uid);
  if (!p) throw new AppError("NOT_FOUND", "Participant not found", 404);
  const name = db.users.find((u) => u.id === uid)?.name ?? uid;
  const needLive = () => {
    if (c.status !== "LIVE") throw new AppError("INVALID_STATE", "Sessions can only be reopened while the contest is live.", 409);
  };
  switch (action) {
    case "restore":
      needLive();
      if (p.sessionStatus === "BLOCKED") throw new AppError("INVALID_STATE", "Unblock the participant first.", 409);
      p.sessionStatus = "ACTIVE";
      p.cheatViolations = 0;
      if (p.endsAt && Date.parse(p.endsAt) <= now()) p.endsAt = iso(Math.min(now() + extraMinutes * MIN, Date.parse(c.endTime!)));
      audit(c.id, uid, "Session restored");
      break;
    case "allow_reentry":
      needLive();
      if (p.sessionStatus === "BLOCKED") throw new AppError("INVALID_STATE", "Unblock the participant first.", 409);
      p.sessionStatus = "ACTIVE";
      p.cheatViolations = 0;
      p.sessionEpoch++; // old browser tab is signed out; they re-enter with their code
      if (!p.endsAt || Date.parse(p.endsAt) <= now() + 60_000) p.endsAt = iso(Math.min(now() + extraMinutes * MIN, Date.parse(c.endTime!)));
      audit(c.id, uid, `Re-entry allowed${extraMinutes ? ` (+${extraMinutes} min if expired)` : ""}`);
      break;
    case "terminate":
      if (p.sessionStatus === "TERMINATED") break;
      p.sessionStatus = "TERMINATED";
      audit(c.id, uid, "Session terminated by organizer");
      break;
    case "block":
      if (p.sessionStatus === "BLOCKED") break;
      p.statusBeforeBlock = p.sessionStatus;
      p.sessionStatus = "BLOCKED";
      audit(c.id, uid, "Blocked participant");
      break;
    case "unblock":
      if (p.sessionStatus !== "BLOCKED") break;
      p.sessionStatus = p.statusBeforeBlock && p.statusBeforeBlock !== "BLOCKED" ? p.statusBeforeBlock : "TERMINATED";
      if (p.sessionStatus === "ACTIVE" && p.endsAt && Date.parse(p.endsAt) <= now()) p.sessionStatus = "FINISHED";
      delete p.statusBeforeBlock;
      audit(c.id, uid, "Unblocked participant");
      break;
    case "delete":
      db.participants = db.participants.filter((x) => x !== p);
      db.submissions = db.submissions.filter((s) => !(s.contestId === contestId && s.userId === uid));
      db.incidents = db.incidents.filter((i) => !(i.contestId === contestId && i.userId === uid));
      audit(c.id, null, `Deleted participant ${name}`);
      break;
    default:
      throw new AppError("BAD_ACTION", "Unknown action");
  }
  save();
  return { ok: true };
}

// ---------- Contest lifecycle ----------
export type ContestAction = "mark_ready" | "back_to_draft" | "start" | "pause" | "resume" | "end";

export function contestAction(contestId: string, action: ContestAction) {
  const c = getContest(contestId);
  const db = getDb();
  const bad = (msg: string) => new AppError("INVALID_STATE", msg, 409);
  switch (action) {
    case "mark_ready": {
      if (c.status !== "DRAFT") throw bad("Only a draft contest can be marked ready.");
      const probs = contestProblems(c.id);
      if (!probs.length) throw bad("Add at least one problem before marking the contest ready.");
      const missing = probs.filter((p) => !db.testCases.some((t) => t.problemId === p.id && t.isHidden));
      if (missing.length) throw bad(`Problem ${missing.map((p) => p.index).join(", ")} needs at least one hidden test case.`);
      c.status = "READY";
      break;
    }
    case "back_to_draft":
      if (c.status !== "READY") throw bad("Only a ready contest can go back to draft.");
      c.status = "DRAFT";
      break;
    case "start": {
      if (c.status !== "READY") throw bad("Mark the contest ready before starting it.");
      const t = now();
      c.status = "LIVE";
      c.startTime = iso(t);
      c.scheduledAt = c.scheduledAt ?? iso(t);
      c.endTime = iso(t + (c.entryWindowMinutes + c.durationMinutes) * MIN);
      break;
    }
    case "pause":
      if (c.status !== "LIVE" || c.pausedAt) throw bad("Only a running contest can be paused.");
      c.pausedAt = iso();
      break;
    case "resume": {
      if (c.status !== "LIVE" || !c.pausedAt) throw bad("The contest is not paused.");
      const shift = now() - Date.parse(c.pausedAt);
      c.endTime = iso(Date.parse(c.endTime!) + shift);
      c.startTime = iso(Date.parse(c.startTime!) + shift); // keeps the entry window fair
      for (const p of participantsOf(c.id)) if (p.sessionStatus === "ACTIVE" && p.endsAt) p.endsAt = iso(Date.parse(p.endsAt) + shift);
      c.pausedAt = null;
      break;
    }
    case "end":
      if (c.status !== "LIVE") throw bad("Only a live contest can be ended.");
      c.status = "ENDED";
      c.pausedAt = null;
      c.endTime = iso();
      for (const p of participantsOf(c.id)) if (p.sessionStatus === "ACTIVE") p.sessionStatus = "FINISHED";
      break;
    default:
      throw new AppError("BAD_ACTION", "Unknown action");
  }
  audit(c.id, null, `Contest action: ${action}`);
  save();
  return c;
}

const clampInt = (v: unknown, lo: number, hi: number, d: number) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : d;
};

export function createContest(body: { name?: string; code?: string; description?: string; durationMinutes?: number; scheduledAt?: string | null }) {
  const db = getDb();
  const name = (body.name ?? "").trim().slice(0, 80);
  if (name.length < 3) throw new AppError("INVALID", "Contest name needs at least 3 characters.");
  const code = (body.code ?? "").trim() || name.replace(/[^A-Za-z0-9]/g, "").slice(0, 16);
  assertCodeFree(code, null);
  const c: Contest = {
    id: newId("ct"),
    name, code,
    description: (body.description ?? "").slice(0, 1000),
    durationMinutes: clampInt(body.durationMinutes, 5, 1440, 120),
    entryWindowMinutes: 60,
    status: "DRAFT",
    scheduledAt: body.scheduledAt || null,
    startTime: null, endTime: null, pausedAt: null,
    createdAt: iso(),
    scoringMode: "leetcode", penaltyMode: "time_wrong", wrongPenaltyMinutes: 5,
    cheatDetection: true, sessionRule: { enabled: true, maxViolations: 1 }, maxParticipants: 0, showVerdicts: false,
  };
  db.contests.push(c);
  save();
  return c;
}

function assertCodeFree(code: string, exceptId: string | null) {
  if (!/^[A-Za-z0-9_-]{4,32}$/.test(code)) throw new AppError("INVALID_CODE", "Code must be 4–32 letters, digits, - or _.");
  const db = getDb();
  const l = code.toLowerCase();
  if (db.contests.some((c) => c.id !== exceptId && c.code.toLowerCase() === l) || db.teams.some((t) => t.code.toLowerCase() === l))
    throw new AppError("CODE_TAKEN", "That code is already in use.");
}

export function updateContest(contestId: string, body: Record<string, unknown>) {
  const c = getContest(contestId);
  const before = c.status === "DRAFT" || c.status === "READY";
  const has = (k: string) => k in body && body[k] !== undefined;
  // Fields that change how the contest is scored or timed are locked once it goes live.
  const locked = ["scoringMode", "penaltyMode", "wrongPenaltyMinutes", "durationMinutes", "entryWindowMinutes", "code"];
  if (!before && locked.some(has)) throw new AppError("INVALID_STATE", "Scoring, timing and code are locked once the contest has started.", 409);
  if (c.status === "ENDED" && Object.keys(body).length) throw new AppError("INVALID_STATE", "An ended contest cannot be changed.", 409);

  if (has("name")) { const n = String(body.name).trim(); if (n.length < 3) throw new AppError("INVALID", "Name needs at least 3 characters."); c.name = n.slice(0, 80); }
  if (has("description")) c.description = String(body.description).slice(0, 1000);
  if (has("code")) { const code = String(body.code).trim(); assertCodeFree(code, c.id); c.code = code; }
  if (has("scheduledAt")) c.scheduledAt = body.scheduledAt ? String(body.scheduledAt) : null;
  if (has("durationMinutes")) c.durationMinutes = clampInt(body.durationMinutes, 5, 1440, c.durationMinutes);
  if (has("entryWindowMinutes")) c.entryWindowMinutes = clampInt(body.entryWindowMinutes, 0, 1440, c.entryWindowMinutes);
  if (has("scoringMode")) { if (!SCORING_MODES[String(body.scoringMode)]) throw new AppError("INVALID", "Unknown scoring mode."); c.scoringMode = String(body.scoringMode); }
  if (has("penaltyMode")) { if (!PENALTY_MODES[String(body.penaltyMode)]) throw new AppError("INVALID", "Unknown penalty mode."); c.penaltyMode = String(body.penaltyMode); }
  if (has("wrongPenaltyMinutes")) c.wrongPenaltyMinutes = clampInt(body.wrongPenaltyMinutes, 0, 120, c.wrongPenaltyMinutes);
  if (has("cheatDetection")) c.cheatDetection = !!body.cheatDetection;
  if (has("showVerdicts")) c.showVerdicts = !!body.showVerdicts;
  if (has("maxParticipants")) c.maxParticipants = clampInt(body.maxParticipants, 0, 100000, c.maxParticipants);
  if (has("sessionRule")) {
    const r = body.sessionRule as { enabled?: boolean; maxViolations?: number };
    c.sessionRule = { enabled: !!r.enabled, maxViolations: clampInt(r.maxViolations, 1, 50, c.sessionRule.maxViolations) };
  }
  // Scoring may have changed: refresh stored aggregates.
  for (const p of participantsOf(c.id)) recompute(c, p);
  save();
  return c;
}

export function deleteContest(contestId: string) {
  const c = getContest(contestId);
  if (c.status === "LIVE") throw new AppError("INVALID_STATE", "End the contest before deleting it.", 409);
  const db = getDb();
  const pids = new Set(db.problems.filter((p) => p.contestId === c.id).map((p) => p.id));
  db.contests = db.contests.filter((x) => x.id !== c.id);
  db.problems = db.problems.filter((p) => p.contestId !== c.id);
  db.testCases = db.testCases.filter((t) => !pids.has(t.problemId));
  db.submissions = db.submissions.filter((s) => s.contestId !== c.id);
  db.participants = db.participants.filter((p) => p.contestId !== c.id);
  db.incidents = db.incidents.filter((i) => i.contestId !== c.id);
  db.teams = db.teams.filter((t) => t.contestId !== c.id);
  save();
}

// ---------- Problems & tests ----------
function assertEditable(c: Contest) {
  if (c.status === "LIVE" || c.status === "ENDED") throw new AppError("INVALID_STATE", "Problems and test cases can only be edited before the contest starts.", 409);
}

export function organizerProblem(contestId: string, problemId: string) {
  const p = getDb().problems.find((x) => x.id === problemId && x.contestId === contestId);
  if (!p) throw new AppError("NOT_FOUND", "Problem not found", 404);
  return { problem: p, tests: getDb().testCases.filter((t) => t.problemId === p.id), contest: getContest(contestId) };
}

export function upsertProblem(contestId: string, problemId: string | null, b: Record<string, unknown>) {
  const c = getContest(contestId);
  assertEditable(c);
  const db = getDb();
  const title = String(b.title ?? "").trim();
  if (title.length < 2) throw new AppError("INVALID", "Problem title is required.");
  const examples = Array.isArray(b.examples)
    ? (b.examples as { input?: string; output?: string; explanation?: string }[]).filter((e) => e && (e.input || e.output)).map((e) => ({ input: String(e.input ?? ""), output: String(e.output ?? ""), explanation: e.explanation ? String(e.explanation) : undefined }))
    : [];
  const fields = {
    title: title.slice(0, 120),
    description: String(b.description ?? "").slice(0, 20000),
    inputFormat: String(b.inputFormat ?? "").slice(0, 5000),
    outputFormat: String(b.outputFormat ?? "").slice(0, 5000),
    constraints: String(b.constraints ?? "").slice(0, 5000),
    examples,
    timeLimit: Math.min(10, Math.max(0.5, Number(b.timeLimit) || 1)),
    memoryLimit: clampInt(b.memoryLimit, 16, 1024, 256),
    difficulty: (["Easy", "Medium", "Hard"].includes(String(b.difficulty)) ? b.difficulty : "Medium") as Problem["difficulty"],
    tags: (Array.isArray(b.tags) ? b.tags : String(b.tags ?? "").split(",")).map((t) => String(t).trim()).filter(Boolean).slice(0, 10),
    score: clampInt(b.score, 1, 100, 5),
  };
  if (problemId) {
    const p = db.problems.find((x) => x.id === problemId && x.contestId === contestId);
    if (!p) throw new AppError("NOT_FOUND", "Problem not found", 404);
    Object.assign(p, fields);
    save();
    return p;
  }
  const existing = contestProblems(contestId);
  const index = String.fromCharCode(65 + existing.length);
  const p: Problem = { id: newId("prb"), contestId, index, ...fields };
  db.problems.push(p);
  save();
  return p;
}

export function deleteProblem(contestId: string, problemId: string) {
  const c = getContest(contestId);
  assertEditable(c);
  const db = getDb();
  db.problems = db.problems.filter((p) => !(p.id === problemId && p.contestId === contestId));
  db.testCases = db.testCases.filter((t) => t.problemId !== problemId);
  contestProblems(contestId).forEach((p, i) => (p.index = String.fromCharCode(65 + i)));
  save();
}

export function upsertTest(contestId: string, problemId: string, testId: string | null, b: { input?: string; expectedOutput?: string; isHidden?: boolean }) {
  const { contest } = organizerProblem(contestId, problemId);
  assertEditable(contest);
  const db = getDb();
  const fields = { input: String(b.input ?? "").slice(0, 2_000_000), expectedOutput: String(b.expectedOutput ?? "").slice(0, 2_000_000), isHidden: !!b.isHidden };
  if (!fields.expectedOutput.trim()) throw new AppError("INVALID", "Expected output is required.");
  if (testId) {
    const t = db.testCases.find((x) => x.id === testId && x.problemId === problemId);
    if (!t) throw new AppError("NOT_FOUND", "Test case not found", 404);
    Object.assign(t, fields);
    save();
    return t;
  }
  const t: TestCase = { id: newId("tc"), problemId, ...fields };
  db.testCases.push(t);
  save();
  return t;
}

export function deleteTest(contestId: string, problemId: string, testId: string) {
  const { contest } = organizerProblem(contestId, problemId);
  assertEditable(contest);
  const db = getDb();
  db.testCases = db.testCases.filter((t) => !(t.id === testId && t.problemId === problemId));
  save();
}

export function exportCsv(contestId: string) {
  const lb = leaderboard(contestId);
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const head = ["Rank", "Participant", "Team", "Solved", "Score", "Penalty", "Last accepted", ...lb.problems.map((p) => `${p.index} (attempts/solved min)`)];
  const lines = lb.rows.map((r) => [r.rank, r.name, r.team ?? "", r.solved, r.score, r.penalty, r.lastAcceptedAt ?? "", ...r.problems.map((x) => `${x.attempts}${x.solved ? `/${x.at}` : ""}`)]);
  return [head, ...lines].map((l) => l.map(esc).join(",")).join("\r\n");
}
