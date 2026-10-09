"use client";
import { use } from "react";
import Link from "next/link";
import Leaderboard, { type LbData } from "@/components/Leaderboard";
import { ApiErrorState, SkeletonRows, StatusBadge } from "@/components/ui";
import { fmtTime, usePoll } from "@/lib/client";
import { useSearchParams } from "next/navigation";

export default function LeaderboardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const sp = useSearchParams();
  const reason = sp.get("reason");
  const { data, error } = usePoll<LbData>(`/api/contests/${id}/leaderboard`, 5000);
  const final = data?.final;
  return (
    <div className="container page">
      <Link href={`/contests/${id}`} className="small muted">← Contest details</Link>
      {reason && (
        <div className="notice strong" style={{ marginTop: 16 }}>
          <span>■</span>
          <span>{reason === "time" ? "Time is up. Your session has ended and your submissions are locked." : reason === "terminated" ? "Your session was terminated under the contest's session rule. Contact the organizer if this was a mistake." : reason === "blocked" ? "You have been blocked from this contest by the organizer." : "Your contest session has ended."}</span>
        </div>
      )}
      <div className="row wrap between" style={{ marginTop: 16, alignItems: "flex-end" }}>
        <div className="stack" style={{ gap: 8 }}>
          <div className="eyebrow">{final ? "Final results" : "Live standings"}</div>
          <h1 style={{ fontSize: 30 }}>{data?.contest.name ?? "Leaderboard"}</h1>
          {data && <p className="muted small">{data.contest.scoring}. {data.contest.penalty}</p>}
        </div>
        {data && (
          <div className="row small muted">
            <StatusBadge status={data.contest.status} />
            {!final && <span>Updated {fmtTime(data.updatedAt)} · refreshes every 5s</span>}
          </div>
        )}
      </div>
      <div className="panel" style={{ marginTop: 24 }}>
        {error && !data ? <ApiErrorState error={error} /> : data ? <Leaderboard data={data} /> : <SkeletonRows n={8} />}
      </div>
    </div>
  );
}
