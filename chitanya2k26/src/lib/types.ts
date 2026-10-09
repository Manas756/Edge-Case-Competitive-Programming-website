// Domain model. Shaped so the JSON store can later be swapped for a real database.

export type Role = "participant" | "organizer";
export type ContestStatus = "DRAFT" | "READY" | "LIVE" | "ENDED";
export type Difficulty = "Easy" | "Medium" | "Hard";
export type Language = "cpp" | "c" | "python" | "java" | "javascript";

export type Verdict =
  | "Accepted"
  | "Wrong Answer"
  | "Time Limit Exceeded"
  | "Memory Limit Exceeded"
  | "Compilation Error"
  | "Runtime Error"
  | "Judge Error"
  | "Pending";

export type SessionStatus = "NOT_STARTED" | "ACTIVE" | "FINISHED" | "TERMINATED" | "BLOCKED";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface Team {
  id: string;
  contestId: string;
  name: string;
  code: string;
  createdAt: string;
}

export interface ContestSettings {
  scoringMode: string; // key into scoring registry
  penaltyMode: string; // key into penalty registry
  wrongPenaltyMinutes: number;
  cheatDetection: boolean;
  sessionRule: { enabled: boolean; maxViolations: number };
  maxParticipants: number; // 0 = unlimited
  showVerdicts: boolean; // reveal submit verdicts to participants
}

export interface Contest extends ContestSettings {
  id: string;
  name: string;
  description: string;
  code: string;
  durationMinutes: number;
  entryWindowMinutes: number; // how long after start new participants may enter
  status: ContestStatus;
  scheduledAt: string | null; // display date
  startTime: string | null;
  endTime: string | null;
  pausedAt: string | null;
  createdAt: string;
}

export interface Example {
  input: string;
  output: string;
  explanation?: string;
}

export interface Problem {
  id: string;
  contestId: string;
  index: string; // A, B, C...
  title: string;
  description: string;
  inputFormat: string;
  outputFormat: string;
  constraints: string;
  examples: Example[];
  timeLimit: number; // seconds
  memoryLimit: number; // MB
  difficulty: Difficulty;
  tags: string[];
  score: number;
}

export interface TestCase {
  id: string;
  problemId: string;
  input: string;
  expectedOutput: string;
  isHidden: boolean;
}

export interface TestResult {
  index: number;
  verdict: Verdict;
  time: number | null; // ms
  memory: number | null; // KB
  // Only populated for public tests. Hidden test data never leaves the server.
  input?: string;
  expected?: string;
  output?: string;
  message?: string;
}

export interface Submission {
  id: string;
  contestId: string;
  userId: string;
  problemId: string;
  language: Language;
  sourceCode: string;
  verdict: Verdict;
  executionTime: number | null;
  memoryUsed: number | null;
  passed: number;
  total: number;
  message: string | null;
  judge: string;
  submittedAt: string;
}

export interface ContestParticipant {
  contestId: string;
  userId: string;
  teamId: string | null;
  score: number;
  penalty: number;
  solvedCount: number;
  sessionStatus: SessionStatus;
  cheatViolations: number;
  startedAt: string | null;
  endsAt: string | null;
  lastActivity: string | null;
  lastAcceptedAt: string | null;
  sessionEpoch: number; // bumped on re-entry so old browser tokens stop working
  statusBeforeBlock?: SessionStatus;
}

export type IncidentType = "visibility_hidden" | "window_blur" | "leave_attempt" | "fullscreen_exit" | "paste_burst";

export interface Incident {
  id: string;
  contestId: string;
  userId: string;
  type: IncidentType;
  detail: string;
  at: string;
  counted: boolean;
}

export interface AuditEntry {
  id: string;
  contestId: string;
  userId: string | null;
  action: string;
  at: string;
}

export interface Database {
  users: User[];
  teams: Team[];
  contests: Contest[];
  problems: Problem[];
  testCases: TestCase[];
  submissions: Submission[];
  participants: ContestParticipant[];
  incidents: Incident[];
  audit: AuditEntry[];
}
