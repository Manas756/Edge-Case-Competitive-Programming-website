import Link from "next/link";
import ContestCard from "@/components/ContestCard";
import { listPublicContests } from "@/lib/services";

export const dynamic = "force-dynamic";

function GraphFigure() {
  // Small weighted graph with the shortest-path tree drawn solid.
  const nodes: [number, number, string][] = [[30, 70, "1"], [120, 25, "2"], [120, 115, "3"], [215, 70, "4"], [300, 115, "5"]];
  const edges: [number, number, string, boolean][] = [[0, 1, "1", true], [1, 2, "2", true], [0, 2, "5", false], [2, 3, "1", true], [3, 4, "3", true], [2, 4, "6", false]];
  return (
    <svg viewBox="0 0 330 140" width="100%" height="120" role="img" aria-label="Shortest path tree on a weighted graph">
      {edges.map(([a, b, w, tree], i) => {
        const [x1, y1] = nodes[a], [x2, y2] = nodes[b];
        return (
          <g key={i}>
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={tree ? "#fff" : "#555"} strokeWidth={tree ? 1.6 : 1} strokeDasharray={tree ? undefined : "3 4"} />
            <text x={(x1 + x2) / 2 + 4} y={(y1 + y2) / 2 - 4} fill="#8a8a8a" fontSize="10" fontFamily="var(--font-mono)">{w}</text>
          </g>
        );
      })}
      {nodes.map(([x, y, l]) => (
        <g key={l}>
          <circle cx={x} cy={y} r="12" fill="#0c0c0c" stroke="#fff" strokeWidth="1.4" />
          <text x={x} y={y + 4} textAnchor="middle" fill="#fff" fontSize="11" fontFamily="var(--font-mono)">{l}</text>
        </g>
      ))}
    </svg>
  );
}

export default function Home() {
  const contests = listPublicContests();
  const live = contests.find((c) => c.status === "LIVE");
  return (
    <>
      <section className="hero">
        <div className="hero-bg" />
        <div className="container hero-grid" style={{ position: "relative" }}>
          <div>
            <div className="eyebrow">Edge Case · Algorithms track</div>
            <h1 style={{ marginTop: 14 }}>
              <span className="br">{"<"}</span>Edge Case<span className="br">{"/>"}</span>
            </h1>
            <p className="sub">Competitive Programming Contest Platform</p>
            <p className="lede">
              Join a timed coding contest with your team code, solve algorithmic problems in the browser, and see where you stand on a live leaderboard.
              Every submission is judged against public and hidden test cases.
            </p>
            <div className="row wrap" style={{ marginTop: 28 }}>
              <Link href="/join" className="btn primary lg">Join Contest</Link>
              <Link href="#recent" className="btn lg">Recent Contests</Link>
            </div>
            {live && (
              <Link href={`/contests/${live.id}`} className="row small" style={{ marginTop: 24, gap: 8 }}>
                <span className="badge solid"><span className="dot live" />Live</span>
                <span><strong>{live.name}</strong> is running now · {live.participants} competing</span>
                <span aria-hidden>→</span>
              </Link>
            )}
          </div>
          <div className="terminal" aria-hidden>
            <div className="terminal-bar"><i /><i /><i /><span style={{ marginLeft: 8 }}>E_shortest_path.cpp</span></div>
            <pre>
              <span className="c">{"// Problem E · Dijkstra, O((n + m) log n)"}</span>{"\n"}
              <span className="k">priority_queue</span>{"<pair<ll,int>, vector<...>, greater<>> pq;\n"}
              {"dist[1] = 0; pq.push({0, 1});\n"}
              <span className="k">while</span>{" (!pq.empty()) {\n"}
              {"    auto [d, u] = pq.top(); pq.pop();\n"}
              {"    "}<span className="k">if</span>{" (d > dist[u]) "}<span className="k">continue</span>{";\n"}
              {"    "}<span className="k">for</span>{" (auto [v, w] : adj[u])\n"}
              {"        "}<span className="k">if</span>{" (dist[u] + w < dist[v])\n"}
              {"            pq.push({dist[v] = dist[u] + w, v});\n"}
              {"}"}
            </pre>
            <div style={{ padding: "0 18px 10px" }}><GraphFigure /></div>
            <div className="terminal-foot">
              <span>✓ 3/3 public tests passed</span>
              <span>12 ms · 3.4 MB</span>
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="recent">
        <div className="container">
          <div className="section-head">
            <div>
              <div className="eyebrow">Contests</div>
              <h2 style={{ marginTop: 6 }}>Recent contests</h2>
            </div>
            <Link href="/contests" className="btn sm">All contests →</Link>
          </div>
          {contests.length ? (
            <div className="contest-grid">{contests.slice(0, 6).map((c) => <ContestCard key={c.id} c={c} />)}</div>
          ) : (
            <div className="panel"><div className="state"><div className="glyph">∅</div><h2>No contests yet</h2><p>Contests appear here once an organizer publishes one.</p></div></div>
          )}
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head"><div><div className="eyebrow">Format</div><h2 style={{ marginTop: 6 }}>How a round works</h2></div></div>
          <div className="steps">
            <div><span className="n">01 · enter</span><h3>Join with a code</h3><p className="muted">Enter your team or contest code. Your personal timer starts the moment you enter the arena.</p></div>
            <div><span className="n">02 · solve</span><h3>Run, then submit</h3><p className="muted">Run against the sample tests as often as you like. A submission is judged on public and hidden tests in an isolated sandbox.</p></div>
            <div><span className="n">03 · rank</span><h3>Climb the leaderboard</h3><p className="muted">Ranking follows the contest&apos;s scoring rules: points or problems solved first, then penalty time.</p></div>
          </div>
        </div>
      </section>
    </>
  );
}
