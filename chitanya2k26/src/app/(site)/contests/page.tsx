import ContestCard from "@/components/ContestCard";
import { listPublicContests } from "@/lib/services";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const metadata = { title: "Contests" };

export default async function Contests({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const all = listPublicContests();
  const filters = [["", "All"], ["LIVE", "Live"], ["READY", "Upcoming"], ["ENDED", "Ended"]];
  const list = status ? all.filter((c) => c.status === status) : all;
  return (
    <div className="container page">
      <div className="eyebrow">Contests</div>
      <h1 style={{ fontSize: 30, marginTop: 6 }}>All contests</h1>
      <p className="muted" style={{ marginTop: 6 }}>Live rounds you can join now, upcoming rounds and final results of past rounds.</p>
      <div className="tabs" style={{ margin: "24px 0" }}>
        {filters.map(([k, l]) => (
          <Link key={k} href={k ? `/contests?status=${k}` : "/contests"} className={(status ?? "") === k ? "on" : ""}>
            {l} <span className="faint">{k ? all.filter((c) => c.status === k).length : all.length}</span>
          </Link>
        ))}
      </div>
      {list.length ? (
        <div className="contest-grid">{list.map((c) => <ContestCard key={c.id} c={c} />)}</div>
      ) : (
        <div className="panel"><div className="state"><div className="glyph">∅</div><h2>No contests here</h2><p>Nothing matches this filter right now.</p><Link className="btn" href="/contests">Show all</Link></div></div>
      )}
    </div>
  );
}
