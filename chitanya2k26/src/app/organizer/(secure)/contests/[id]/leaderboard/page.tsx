"use client";
import { use } from "react";
import Link from "next/link";
import { fmtTime, usePoll } from "@/lib/client";
import { ApiErrorState, SkeletonRows } from "@/components/ui";
import Leaderboard, { type LbData } from "@/components/Leaderboard";

export default function OrgLeaderboard({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, error } = usePoll<LbData>(`/api/organizer/contests/${id}/leaderboard`, 4000);
  if (error) return <ApiErrorState error={error} />;
  return (
    <div className="stack" style={{ gap: 16 }}>
      <div className="row wrap between">
        <div><h1>{data?.final ? "Final leaderboard" : "Live leaderboard"}</h1>{data && <p className="muted small">{data.contest.scoring}. {data.contest.penalty} Updated {fmtTime(data.updatedAt)}.</p>}</div>
        <div className="row">
          <Link className="btn" href={`/contest/${id}/leaderboard`} target="_blank">Public view ↗</Link>
          <a className="btn primary" href={`/api/organizer/contests/${id}/export`}>Export CSV</a>
        </div>
      </div>
      <div className="panel">{data ? <Leaderboard data={data} /> : <SkeletonRows n={8} />}</div>
    </div>
  );
}
