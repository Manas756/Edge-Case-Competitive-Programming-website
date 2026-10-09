# Chaitanya2k26 · Coding Contest Platform

A black-and-white competitive-programming contest site: contestants join with a code, solve problems in a browser editor against a personal timer, and climb a live leaderboard. Organizers sign in with a server-side key to build contests, add public and hidden tests, configure scoring, penalty and cheat detection, monitor sessions, review code, and export results.

Built with Next.js 15 (App Router) + TypeScript. No database needed for the demo; data lives in `data/db.json`.

## Run it

Requires Node.js 18.18+ (20 or newer recommended).

```bash
npm install
copy .env.example .env        # Windows  (macOS/Linux: cp .env.example .env)
# edit .env: set ORGANIZER_KEY and SESSION_SECRET
npm run dev
```

Open http://localhost:3000.

- **Participant:** Home → Join Contest → code `Chaitanya2k26` → your name and email → you are in the arena with the timer running.
- **Organizer:** http://localhost:3000/organizer/login → enter the `ORGANIZER_KEY` from `.env`.

Production build: `npm run build && npm start`.
Reset the demo data: stop the server, run `npm run reset-data`, start again.

## Judging (important)

Participant code is **never executed inside the Next.js process**. The server sends it to a judge adapter (`src/lib/judge/`):

| `JUDGE_PROVIDER` | What happens |
| --- | --- |
| `simulated` (default in `.env.example`) | Demo only. Code is **not run**. Verdicts are placeholders (code that never prints gets Wrong Answer, unbalanced brackets get Compilation Error, the rest Accepted). The arena and organizer screens show a "simulated judge" notice. |
| `judge0` | Real sandboxed execution through [Judge0 CE](https://github.com/judge0/judge0). Each test runs with the problem's time and memory limits, mapped to Accepted / Wrong Answer / TLE / MLE / Compilation Error / Runtime Error with time and memory. |

To use Judge0 locally, install Docker and follow the Judge0 CE deployment guide in its repository (download the release, `docker compose up -d db redis`, then `docker compose up -d`). It listens on `http://localhost:2358`. Then set:

```
JUDGE_PROVIDER=judge0
JUDGE0_URL=http://localhost:2358
```

and restart. Judge0 needs Linux cgroups; on Windows run it inside WSL2/Docker Desktop. A hosted Judge0 (RapidAPI) also works via `JUDGE0_API_KEY` and `JUDGE0_API_HOST`.

Adding another sandbox: implement `JudgeAdapter` in `src/lib/judge/types.ts` and return it from `getJudge()`.

## What is implemented

**Participant**
- Home, contest list with filters, contest details (rules, scoring, monitoring policy).
- Join: "Join code" (contest code or team code, validated server-side, contest info + confirmation, then straight into the arena) and "Make it" (create a team inside a contest, get a shareable team code).
- Arena: problem list A–E with a subtle ✓ after a successful submission, statement with examples, CodeMirror editor (C++, C, Python, Java, JavaScript, code saved per problem in the browser), Run on public tests with per-case input/expected/output, Submit on public + hidden tests showing "✓ Submitted successfully". Ctrl+Enter runs, Ctrl+Shift+Enter submits.
- Personal countdown that starts on entry; at 0 the arena locks and redirects to the leaderboard. Pause freezes it.
- Mobile: problem drawer, Problem/Code toggle, sticky timer.
- Leaderboard: live (5 s refresh), podium styling for top 3, per-problem cells; becomes final results when the contest ends.
- Error states: invalid code, not started, ended, full, entry closed, blocked, terminated, submission failed / judge unavailable, compilation error, TLE, MLE, runtime error, network error, unauthorized organizer.

**Organizer** (`/organizer`, server-side session cookie; every API route re-checks it)
- Dashboard: status (Draft/Ready/Live/Ended, paused), time remaining, entry window, participant counts, live leaderboard, recent suspicious activity, per-problem stats (attempts, accepted, failed, WA, TLE, MLE, CE, RE).
- Contests: create, then a workspace with Overview, Problems, Participants, Submissions, Activity, Leaderboard, Settings.
- Problems: create/edit/delete with title, description, input/output format, constraints, examples, time and memory limit, difficulty, tags, score; add/edit/delete public and hidden tests. Locked once live.
- Participants: search/filter, status, solved, score, penalty, last activity, violations; session controls (view, view code, restore session, allow re-entry with extra minutes, terminate, block, unblock, delete) with confirmation dialogs.
- Code review: syntax-highlighted source, participant, problem, language, time, verdict, execution time, memory, tests passed, attempt history.
- Settings: code, duration, entry window, max participants, scoring mode, penalty mode, minutes per wrong submission, cheat detection ON/OFF, session termination rule with configurable allowed violations, whether participants see verdicts.
- Lifecycle: DRAFT → READY (needs problems with hidden tests) → LIVE (start, pause, resume) → ENDED (locks submissions, final leaderboard, CSV export). Invalid actions are rejected by the server.

## Rules worth knowing

- **Timer:** each participant gets `duration` minutes from entry. Late entry is allowed for `entryWindow` minutes after start; the contest closes at start + entry window + duration.
- **Scoring** (`src/lib/scoring.ts`, pluggable registries): *Weighted score* (sum of problem points) or *Problems solved*, tie-broken by penalty, then earliest last accept.
- **Penalty:** Option 1 *Time-based* (minutes to last accepted). Option 2 *Time + wrong submissions* (plus N minutes per rejected attempt on solved problems). Also *ICPC cumulative*. Compilation errors are never penalised.
- **Cheat detection** uses the Page Visibility API, window blur and `beforeunload`. These are signals, not proof (notifications or a second monitor can trigger them), and the UI says so. Events within 3 s count once. With the session rule on, participants get a warning per violation and are terminated at the limit; their submissions are kept and the organizer can restore them.

## Security notes

- The organizer key is compared server-side (constant time) and is only read from `.env`. Login is rate limited.
- Sessions are HMAC-signed, httpOnly cookies. "Allow re-entry" rotates the participant token.
- Hidden tests are never included in any participant API response; only organizer routes return them.
- Every permission (state, session status, time left, block) is enforced in `src/lib/services.ts`, not in the UI.

## Project layout

```
src/lib/types.ts        data model (User, Contest, Problem, TestCase, Submission, ContestParticipant, …)
src/lib/store.ts        JSON-file repository (replace with Postgres/Prisma later)
src/lib/seed.ts         demo contest, 5 problems, hidden tests, 9 participants
src/lib/services.ts     all contest rules
src/lib/scoring.ts      scoring and penalty registries
src/lib/judge/          judge adapters (judge0, simulated)
src/app/api/            API routes (public, participant, organizer)
src/app/(site)/         public pages
src/app/(arena)/        contest arena
src/app/organizer/      organizer login and dashboard
```

The JSON store is fine for one server process and a demo. For a real event, move `store.ts` to a database and run Judge0 (or another sandbox) on a separate machine.
