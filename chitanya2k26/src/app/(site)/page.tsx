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
            {live ? (
              <div className="hero-pill">
                <span className="badge solid"><span className="dot live" /> ARENA LIVE</span>
                <span className="pixel">ROUND 2026</span>
                <span className="faint">/</span>
                <span className="mono">INVITE CODE: <strong>CHALLENGE</strong></span>
              </div>
            ) : (
              <div className="hero-pill">
                <span className="badge soft">NEXT ROUND</span>
                <span className="pixel">EDGE CASE 2026</span>
                <span className="faint">/</span>
                <span className="mono">STANDBY</span>
              </div>
            )}
            <div className="eyebrow">EDGE CASE // HARDCORE ALGORITHMIC ARENA</div>
            <h1 style={{ marginTop: 14 }}>
              <span className="br">{"<"}</span>Edge Case<span className="br">{"/>"}</span>
            </h1>
            <p className="sub">Where algorithms meet their breaking points.</p>
            <p className="lede">
              Stress-test your code against merciless hidden bounds and fight for rank #1 on the live leaderboard.
            </p>
            <div className="row wrap" style={{ marginTop: 28 }}>
              <Link href="/join" className="btn primary lg">
                <span className="pixel">Enter Arena</span>
              </Link>
              <Link href="#recent" className="btn lg">Explore Battles</Link>
            </div>
            {live && (
              <Link href={`/contests/${live.id}`} className="row small" style={{ marginTop: 24, gap: 8 }}>
                <span className="badge solid"><span className="dot live" />LIVE MATCH</span>
                <span><strong>{live.name}</strong> is running now · {live.participants} hackers battling</span>
                <span aria-hidden>→</span>
              </Link>
            )}
            <div className="hero-specs">
              <div className="spec-card">
                <span className="k pixel">CONSTRAINTS</span>
                <span className="v mono">N ≤ 2·10⁵</span>
              </div>
              <div className="spec-card">
                <span className="k pixel">PENALTY TIME</span>
                <span className="v mono">+5m / WRONG</span>
              </div>
              <div className="spec-card">
                <span className="k pixel">RUNTIMES</span>
                <span className="v mono">C++ / PY / JS / JAVA</span>
              </div>
            </div>
          </div>
          <div className="terminal" aria-hidden>
            <div className="terminal-bar">
              <i /><i /><i />
              <span style={{ marginLeft: 8 }} className="pixel">edge_case_stress.cpp</span>
            </div>
            <pre>
              <span className="c">{"// Problem E · Stress-testing Dijkstra under extreme bounds\n// N <= 2e5, M <= 5e5, edge weights up to 1e9 (avoid overflow!)"}</span>{"\n"}
              <span className="k">priority_queue</span>{"<pair<ll,int>, vector<pair<ll,int>>, greater<>> pq;\n"}
              {"dist[1] = 0; pq.push({0, 1});\n"}
              <span className="k">while</span>{" (!pq.empty()) {\n"}
              {"    auto [d, u] = pq.top(); pq.pop();\n"}
              {"    "}<span className="k">if</span>{" (d > dist[u]) "}<span className="k">continue</span>{"; // prune stale states\n"}
              {"    "}<span className="k">for</span>{" (auto [v, w] : adj[u]) {\n"}
              {"        "}<span className="k">if</span>{" (dist[u] + w < dist[v]) {\n"}
              {"            pq.push({dist[v] = dist[u] + w, v});\n"}
              {"        }\n"}
              {"    }\n"}
              {"}"}
            </pre>
            <div style={{ padding: "0 18px 10px" }}><GraphFigure /></div>
            <div className="terminal-foot">
              <span className="pixel">✓ 48/48 hidden tests passed</span>
              <span className="mono">8 ms · 3.1 MB · 0 WA</span>
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="recent">
        <div className="container">
          <div className="section-head">
            <div>
              <div className="eyebrow">WAR ROOM // CONTEST ARCHIVES</div>
              <h2 style={{ marginTop: 6 }}>Active & Recent Battles</h2>
            </div>
            <Link href="/contests" className="btn sm">All Battles →</Link>
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
          <div className="section-head">
            <div>
              <div className="eyebrow">ARENA PROTOCOL</div>
              <h2 style={{ marginTop: 6 }}>How a Round Works</h2>
            </div>
          </div>
          <div className="steps">
            <div>
              <span className="n">01 // INFILTRATE</span>
              <h3>Join with Contest Key</h3>
              <p className="muted">Enter your invite code. Your personal clock triggers the microsecond your session initializes.</p>
            </div>
            <div>
              <span className="n">02 // STRESS-TEST</span>
              <h3>Run Samples, Brave Hidden Tests</h3>
              <p className="muted">Test against public samples, then submit to the isolated sandbox judge where adversarial edge cases await.</p>
            </div>
            <div>
              <span className="n">03 // DOMINATE</span>
              <h3>Climb the Dynamic Board</h3>
              <p className="muted">Scores update in real time with penalty deductions for failed attempts. Solve cleanly and quickly to top the standings.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <div>
              <div className="eyebrow">SYSTEM CAPABILITIES</div>
              <h2 style={{ marginTop: 6 }}>Engineered for Precision</h2>
            </div>
          </div>
          <div className="stats" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
            <div className="stat">
              <div className="k pixel">SANDBOX JUDGE</div>
              <div className="v" style={{ fontSize: 17, marginTop: 6 }}>Sub-second Execution</div>
              <p className="muted tiny" style={{ marginTop: 4 }}>Fast isolated grading across C++, Python, Java & JS.</p>
            </div>
            <div className="stat">
              <div className="k pixel">INTEGRITY GUARD</div>
              <div className="v" style={{ fontSize: 17, marginTop: 6 }}>Focus & Anti-Cheat</div>
              <p className="muted tiny" style={{ marginTop: 4 }}>Tab-switch tracking and session telemetry keep it fair.</p>
            </div>
            <div className="stat">
              <div className="k pixel">DYNAMIC PENALTY</div>
              <div className="v" style={{ fontSize: 17, marginTop: 6 }}>Zero-Tolerance Board</div>
              <p className="muted tiny" style={{ marginTop: 4 }}>Real-time recalculations with precision time and wrong penalties.</p>
            </div>
            <div className="stat">
              <div className="k pixel">CUSTOM ARENAS</div>
              <div className="v" style={{ fontSize: 17, marginTop: 6 }}>Organizer Control</div>
              <p className="muted tiny" style={{ marginTop: 4 }}>Curate test suites, hidden edge cases, and launch live matches.</p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
