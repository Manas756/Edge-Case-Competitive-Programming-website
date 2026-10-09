import type { Contest, Database, Problem, Submission, TestCase, User, ContestParticipant, Team, Verdict, Language, Incident } from "./types";

const MIN = 60_000;
let seq = 0;
const sid = (p: string) => `${p}_${(++seq).toString(36).padStart(4, "0")}`;

function problem(contestId: string, p: Omit<Problem, "id" | "contestId">): Problem {
  return { id: sid("prb"), contestId, ...p };
}

function tests(problemId: string, pub: [string, string][], hidden: [string, string][]): TestCase[] {
  return [
    ...pub.map(([input, expectedOutput]) => ({ id: sid("tc"), problemId, input, expectedOutput, isHidden: false })),
    ...hidden.map(([input, expectedOutput]) => ({ id: sid("tc"), problemId, input, expectedOutput, isHidden: true })),
  ];
}

const CODE: Record<string, Record<Language, string>> = {
  twoSum: {
    cpp: `#include <bits/stdc++.h>
using namespace std;
int main() {
    int n; cin >> n;
    vector<long long> a(n);
    for (auto &x : a) cin >> x;
    long long t; cin >> t;
    unordered_map<long long, int> seen;
    for (int i = 0; i < n; i++) {
        auto it = seen.find(t - a[i]);
        if (it != seen.end()) { cout << it->second << " " << i << "\\n"; return 0; }
        seen[a[i]] = i;
    }
}`,
    python: `n = int(input())
a = list(map(int, input().split()))
t = int(input())
seen = {}
for i, x in enumerate(a):
    if t - x in seen:
        print(seen[t - x], i)
        break
    seen[x] = i`,
    java: "", c: "", javascript: "",
  },
  parens: {
    python: `s = input().strip()
pairs = {')': '(', ']': '[', '}': '{'}
st = []
ok = True
for ch in s:
    if ch in pairs:
        if not st or st.pop() != pairs[ch]:
            ok = False
            break
    else:
        st.append(ch)
print("true" if ok and not st else "false")`,
    cpp: `#include <bits/stdc++.h>
using namespace std;
int main() {
    string s; cin >> s;
    stack<char> st;
    for (char c : s) {
        if (c == '(' || c == '[' || c == '{') st.push(c);
        else {
            if (st.empty()) { cout << "false"; return 0; }
            char o = st.top(); st.pop();
            if ((c == ')' && o != '(') || (c == ']' && o != '[') || (c == '}' && o != '{')) { cout << "false"; return 0; }
        }
    }
    cout << (st.empty() ? "true" : "false");
}`,
    java: "", c: "", javascript: "",
  },
  kadane: {
    cpp: `#include <bits/stdc++.h>
using namespace std;
int main() {
    int n; cin >> n;
    long long best = LLONG_MIN, cur = 0;
    for (int i = 0; i < n; i++) {
        long long x; cin >> x;
        cur = max(x, cur + x);
        best = max(best, cur);
    }
    cout << best << "\\n";
}`,
    python: `n = int(input())
a = list(map(int, input().split()))
best = cur = a[0]
for x in a[1:]:
    cur = max(x, cur + x)
    best = max(best, cur)
print(best)`,
    java: "", c: "", javascript: "",
  },
};

export function buildSeed(now = Date.now()): Database {
  seq = 0;
  const iso = (t: number) => new Date(t).toISOString();

  // ---------- Contests ----------
  const mainStart = now - 35 * MIN;
  const main: Contest = {
    id: "Chaitanya2k26",
    name: "Chaitanya2k26",
    description:
      "The flagship round of Chaitanya 2026. Five algorithmic problems covering hashing, stacks, dynamic programming, trees and graphs. Your timer starts the moment you enter.",
    code: "Chaitanya2k26",
    durationMinutes: 120,
    entryWindowMinutes: 90,
    status: "LIVE",
    scheduledAt: iso(mainStart),
    startTime: iso(mainStart),
    endTime: iso(mainStart + (90 + 120) * MIN),
    pausedAt: null,
    createdAt: iso(now - 3 * 24 * 60 * MIN),
    scoringMode: "leetcode",
    penaltyMode: "time_wrong",
    wrongPenaltyMinutes: 5,
    cheatDetection: true,
    sessionRule: { enabled: true, maxViolations: 1 },
    maxParticipants: 200,
    showVerdicts: false,
  };
  const warmStart = now - 6 * 24 * 60 * MIN;
  const warmup: Contest = {
    ...main,
    id: "warmup-round",
    name: "Chaitanya Warmup Round",
    description: "A short practice round to get familiar with the platform before the main contest.",
    code: "WARMUP26",
    durationMinutes: 60,
    entryWindowMinutes: 30,
    status: "ENDED",
    scheduledAt: iso(warmStart),
    startTime: iso(warmStart),
    endTime: iso(warmStart + 90 * MIN),
    createdAt: iso(warmStart - 2 * 24 * 60 * MIN),
    penaltyMode: "time",
    sessionRule: { enabled: false, maxViolations: 1 },
  };
  const graphAt = now + 4 * 24 * 60 * MIN;
  const graph: Contest = {
    ...main,
    id: "graph-sprint",
    name: "Graph Theory Sprint",
    description: "Shortest paths, components and spanning trees. Four problems, ninety minutes.",
    code: "GRAPH26",
    durationMinutes: 90,
    entryWindowMinutes: 30,
    status: "READY",
    scheduledAt: iso(graphAt),
    startTime: null,
    endTime: null,
    createdAt: iso(now - 24 * 60 * MIN),
    scoringMode: "icpc",
    penaltyMode: "time_wrong",
    wrongPenaltyMinutes: 20,
  };
  const dp: Contest = {
    ...graph,
    id: "dp-night",
    name: "Dynamic Programming Night",
    description: "Draft round, still being prepared.",
    code: "DPNIGHT",
    status: "DRAFT",
    scheduledAt: null,
  };

  // ---------- Problems ----------
  const pA = problem(main.id, {
    index: "A",
    title: "Two Sum",
    description:
      "You are given an array of `n` integers and a target value `t`. Find two **distinct** indices `i < j` such that `a[i] + a[j] = t`.\n\nIt is guaranteed that exactly one valid pair exists.",
    inputFormat: "The first line contains `n`.\nThe second line contains `n` space-separated integers `a[0..n-1]`.\nThe third line contains the target `t`.",
    outputFormat: "Print the two indices `i j` (0-based, `i < j`) separated by a space.",
    constraints: "2 ≤ n ≤ 10^5\n-10^9 ≤ a[i] ≤ 10^9\n-10^9 ≤ t ≤ 10^9",
    examples: [
      { input: "4\n2 7 11 15\n9", output: "0 1", explanation: "a[0] + a[1] = 2 + 7 = 9." },
      { input: "3\n3 2 4\n6", output: "1 2" },
    ],
    timeLimit: 1,
    memoryLimit: 256,
    difficulty: "Easy",
    tags: ["array", "hashing"],
    score: 3,
  });
  const pB = problem(main.id, {
    index: "B",
    title: "Valid Parentheses",
    description:
      "Given a string `s` consisting only of the characters `()[]{}`, decide whether it is valid.\n\nA string is valid when every opening bracket is closed by the same type of bracket, and brackets are closed in the correct order.",
    inputFormat: "A single line containing the string `s`.",
    outputFormat: "Print `true` if the string is valid, otherwise `false`.",
    constraints: "1 ≤ |s| ≤ 10^5",
    examples: [
      { input: "()[]{}", output: "true" },
      { input: "(]", output: "false", explanation: "The bracket opened by '(' is closed by ']'." },
    ],
    timeLimit: 1,
    memoryLimit: 256,
    difficulty: "Easy",
    tags: ["stack", "string"],
    score: 4,
  });
  const pC = problem(main.id, {
    index: "C",
    title: "Maximum Subarray",
    description:
      "Given an array of `n` integers, find the contiguous non-empty subarray with the largest sum and print that sum.",
    inputFormat: "The first line contains `n`.\nThe second line contains `n` space-separated integers.",
    outputFormat: "Print a single integer, the maximum subarray sum.",
    constraints: "1 ≤ n ≤ 2·10^5\n-10^4 ≤ a[i] ≤ 10^4",
    examples: [
      { input: "9\n-2 1 -3 4 -1 2 1 -5 4", output: "6", explanation: "The subarray [4, -1, 2, 1] has sum 6." },
      { input: "1\n1", output: "1" },
    ],
    timeLimit: 1,
    memoryLimit: 256,
    difficulty: "Medium",
    tags: ["dynamic programming", "kadane"],
    score: 5,
  });
  const pD = problem(main.id, {
    index: "D",
    title: "Binary Tree Traversal",
    description:
      "A binary tree is given in level order, where `null` marks a missing child (the same encoding LeetCode uses). Print the **inorder** traversal of the tree.",
    inputFormat: "The first line contains `k`, the number of tokens.\nThe second line contains `k` tokens, each an integer or `null`.",
    outputFormat: "Print the node values in inorder, separated by spaces.",
    constraints: "1 ≤ k ≤ 10^4\nThe first token is never null.\n-1000 ≤ value ≤ 1000",
    examples: [
      { input: "4\n1 null 2 3", output: "1 3 2", explanation: "Root 1 has right child 2, and 2 has left child 3." },
      { input: "1\n1", output: "1" },
    ],
    timeLimit: 1,
    memoryLimit: 256,
    difficulty: "Medium",
    tags: ["tree", "dfs"],
    score: 5,
  });
  const pE = problem(main.id, {
    index: "E",
    title: "Shortest Path",
    description:
      "You are given an undirected weighted graph with `n` vertices and `m` edges. Compute the shortest distance from vertex `1` to every vertex. Print `-1` for vertices that cannot be reached.",
    inputFormat: "The first line contains `n m`.\nEach of the next `m` lines contains `u v w`, an edge between `u` and `v` of weight `w`.",
    outputFormat: "Print `n` integers: the distance from vertex 1 to vertices 1..n.",
    constraints: "1 ≤ n ≤ 10^5\n0 ≤ m ≤ 2·10^5\n1 ≤ w ≤ 10^9",
    examples: [
      { input: "4 4\n1 2 1\n2 3 2\n1 3 5\n3 4 1", output: "0 1 3 4", explanation: "Vertex 3 is reached via 1 → 2 → 3 with cost 3." },
      { input: "3 1\n1 2 7", output: "0 7 -1" },
    ],
    timeLimit: 2,
    memoryLimit: 256,
    difficulty: "Hard",
    tags: ["graph", "dijkstra"],
    score: 7,
  });

  const wA = problem(warmup.id, {
    index: "A",
    title: "Square It",
    description: "Read an integer `n` and print `n²`.",
    inputFormat: "A single integer `n`.",
    outputFormat: "Print `n * n`.",
    constraints: "1 ≤ n ≤ 10^5",
    examples: [{ input: "5", output: "25" }],
    timeLimit: 1,
    memoryLimit: 128,
    difficulty: "Easy",
    tags: ["math"],
    score: 3,
  });
  const strip = ({ id: _i, contestId: _c, ...rest }: Problem) => rest;
  const wB = problem(warmup.id, { ...strip(pC), index: "B" });
  const gA = problem(graph.id, { ...strip(pE), index: "A" });

  const testCases: TestCase[] = [
    ...tests(pA.id, [["4\n2 7 11 15\n9", "0 1"], ["3\n3 2 4\n6", "1 2"]], [["2\n3 3\n6", "0 1"], ["5\n-1 -2 -3 -4 -5\n-8", "2 4"], ["6\n1 5 9 13 2 8\n21", "3 5"]]),
    ...tests(pB.id, [["()[]{}", "true"], ["(]", "false"]], [["([)]", "false"], ["{[]}", "true"], ["((((", "false"], ["]", "false"]]),
    ...tests(pC.id, [["9\n-2 1 -3 4 -1 2 1 -5 4", "6"], ["1\n1", "1"]], [["5\n5 4 -1 7 8", "23"], ["3\n-3 -1 -2", "-1"]]),
    ...tests(pD.id, [["4\n1 null 2 3", "1 3 2"], ["1\n1", "1"]], [["7\n4 2 6 1 3 5 7", "1 2 3 4 5 6 7"], ["5\n1 2 3 4 5", "4 2 5 1 3"]]),
    ...tests(pE.id, [["4 4\n1 2 1\n2 3 2\n1 3 5\n3 4 1", "0 1 3 4"], ["3 1\n1 2 7", "0 7 -1"]], [["5 6\n1 2 2\n1 3 4\n2 3 1\n2 4 7\n3 5 3\n5 4 2", "0 2 3 8 6"]]),
    ...tests(wA.id, [["5", "25"]], [["100000", "10000000000"], ["1", "1"]]),
    ...tests(wB.id, [["9\n-2 1 -3 4 -1 2 1 -5 4", "6"]], [["5\n5 4 -1 7 8", "23"]]),
    ...tests(gA.id, [["4 4\n1 2 1\n2 3 2\n1 3 5\n3 4 1", "0 1 3 4"]], [["5 6\n1 2 2\n1 3 4\n2 3 1\n2 4 7\n3 5 3\n5 4 2", "0 2 3 8 6"]]),
  ];

  // ---------- Users / teams ----------
  const people: [string, string][] = [
    ["Ananya Sharma", "Byte Benders"],
    ["Rohan Mehta", "Byte Benders"],
    ["Ishita Rao", "Null Pointers"],
    ["Kabir Singh", "Null Pointers"],
    ["Meera Iyer", "Segment Trees"],
    ["Arjun Nair", "Segment Trees"],
    ["Tanvi Kulkarni", "Off By One"],
    ["Vikram Joshi", "Off By One"],
    ["Sara Thomas", "Recursion Club"],
  ];
  const teams: Team[] = [];
  const users: User[] = [];
  const participants: ContestParticipant[] = [];
  for (const [name, teamName] of people) {
    let team = teams.find((t) => t.name === teamName);
    if (!team) {
      team = { id: sid("team"), contestId: main.id, name: teamName, code: `CH26-${teamName.replace(/[^A-Z]/g, "")}${teams.length + 1}`, createdAt: iso(now - 2 * 24 * 60 * MIN) };
      teams.push(team);
    }
    const u: User = { id: sid("usr"), name, email: name.toLowerCase().replace(/ /g, ".") + "@Chaitanya.edu", role: "participant" };
    users.push(u);
  }

  const submissions: Submission[] = [];
  const sub = (contest: Contest, u: User, p: Problem, offsetMin: number, verdict: Verdict, lang: Language, code: string, startedAt: number) => {
    const ok = verdict === "Accepted";
    const total = testCases.filter((t) => t.problemId === p.id).length;
    submissions.push({
      id: sid("sub"),
      contestId: contest.id,
      userId: u.id,
      problemId: p.id,
      language: lang,
      sourceCode: code || "// source unavailable",
      verdict,
      executionTime: verdict === "Compilation Error" ? null : verdict === "Time Limit Exceeded" ? p.timeLimit * 1000 : 12 + ((offsetMin * 7) % 60),
      memoryUsed: verdict === "Compilation Error" ? null : verdict === "Memory Limit Exceeded" ? p.memoryLimit * 1024 : 3200 + ((offsetMin * 131) % 9000),
      passed: ok ? total : Math.max(0, total - 2),
      total,
      message: verdict === "Compilation Error" ? "error: expected ';' before '}' token" : null,
      judge: "seed",
      submittedAt: iso(startedAt + offsetMin * MIN),
    });
  };

  // [userIndex, startedMinAgo, [problem, offset, verdict, lang][]]
  type Plan = [number, number, [Problem, number, Verdict, Language][]];
  const plans: Plan[] = [
    [0, 34, [[pA, 4, "Accepted", "cpp"], [pB, 9, "Accepted", "cpp"], [pC, 15, "Wrong Answer", "cpp"], [pC, 19, "Accepted", "cpp"], [pE, 30, "Time Limit Exceeded", "cpp"]]],
    [1, 33, [[pA, 6, "Accepted", "python"], [pB, 11, "Accepted", "python"], [pC, 20, "Accepted", "python"]]],
    [2, 33, [[pA, 3, "Accepted", "cpp"], [pC, 12, "Accepted", "cpp"], [pB, 18, "Compilation Error", "cpp"], [pB, 21, "Accepted", "cpp"], [pD, 30, "Runtime Error", "cpp"]]],
    [3, 31, [[pA, 8, "Wrong Answer", "python"], [pA, 12, "Accepted", "python"], [pB, 22, "Accepted", "python"]]],
    [4, 32, [[pB, 5, "Accepted", "python"], [pA, 10, "Accepted", "python"], [pE, 27, "Memory Limit Exceeded", "python"]]],
    [5, 30, [[pA, 7, "Accepted", "cpp"], [pC, 25, "Wrong Answer", "cpp"]]],
    [6, 29, [[pB, 14, "Accepted", "python"]]],
    [7, 28, [[pA, 18, "Wrong Answer", "cpp"], [pA, 24, "Wrong Answer", "cpp"]]],
    [8, 5, []],
  ];
  const codeFor = (p: Problem, lang: Language) =>
    (p === pA ? CODE.twoSum : p === pB ? CODE.parens : p === pC ? CODE.kadane : null)?.[lang] ||
    (lang === "python" ? `# ${p.title}\nimport sys\ndata = sys.stdin.read().split()\nprint(data[0])` : `#include <bits/stdc++.h>\nusing namespace std;\n// ${p.title}\nint main() {\n    ios::sync_with_stdio(false);\n    // TODO\n    return 0;\n}`);

  for (const [ui, ago, list] of plans) {
    const u = users[ui];
    const started = now - ago * MIN;
    for (const [p, off, v, lang] of list) sub(main, u, p, off, v, lang, codeFor(p, lang), started);
    const last = list.length ? started + list[list.length - 1][1] * MIN : started;
    participants.push({
      contestId: main.id,
      userId: u.id,
      teamId: teams.find((t) => t.name === people[ui][1])!.id,
      score: 0, penalty: 0, solvedCount: 0,
      sessionStatus: ui === 7 ? "TERMINATED" : ui === 6 ? "BLOCKED" : "ACTIVE",
      cheatViolations: ui === 7 ? 3 : ui === 3 ? 1 : 0,
      startedAt: iso(started),
      endsAt: iso(Math.min(started + main.durationMinutes * MIN, Date.parse(main.endTime!))),
      lastActivity: iso(Math.max(last, now - (ui % 4) * MIN)),
      lastAcceptedAt: null,
      sessionEpoch: 1,
    });
  }

  // Warmup (ended) participants
  for (const [ui, offA, offB] of [[0, 4, 20], [2, 6, 31], [4, 9, -1], [5, 12, 40]] as const) {
    const u = users[ui];
    sub(warmup, u, wA, offA, "Accepted", "cpp", "#include <iostream>\nint main(){ long long n; std::cin >> n; std::cout << n*n; }", warmStart);
    if (offB > 0) sub(warmup, u, wB, offB, "Accepted", "cpp", CODE.kadane.cpp, warmStart);
    participants.push({
      contestId: warmup.id, userId: u.id, teamId: null, score: 0, penalty: 0, solvedCount: 0,
      sessionStatus: "FINISHED", cheatViolations: 0, startedAt: iso(warmStart), endsAt: iso(warmStart + 60 * MIN),
      lastActivity: iso(warmStart + 50 * MIN), lastAcceptedAt: null, sessionEpoch: 1,
    });
  }

  const incidents: Incident[] = [
    { id: sid("inc"), contestId: main.id, userId: users[3].id, type: "visibility_hidden", detail: "Tab hidden for 14s", at: iso(now - 12 * MIN), counted: true },
    { id: sid("inc"), contestId: main.id, userId: users[7].id, type: "window_blur", detail: "Window lost focus", at: iso(now - 9 * MIN), counted: true },
    { id: sid("inc"), contestId: main.id, userId: users[7].id, type: "visibility_hidden", detail: "Tab hidden for 41s", at: iso(now - 7 * MIN), counted: true },
    { id: sid("inc"), contestId: main.id, userId: users[7].id, type: "leave_attempt", detail: "Attempted to leave the contest page", at: iso(now - 4 * MIN), counted: true },
  ];

  return {
    users,
    teams,
    contests: [main, warmup, graph, dp],
    problems: [pA, pB, pC, pD, pE, wA, wB, gA],
    testCases,
    submissions,
    participants,
    incidents,
    audit: [{ id: sid("aud"), contestId: main.id, userId: users[6].id, action: "Blocked participant", at: iso(now - 6 * MIN) }],
  };
}
