"use client";
import { use } from "react";
import Link from "next/link";
import { usePoll } from "@/lib/client";
import { ApiErrorState, SkeletonRows } from "@/components/ui";
import { ProblemStats, StatusPanel, type OverviewData } from "@/components/org/Overview";

const STEPS = [
  ["Add problems", "problems"], ["Add public and hidden test cases", "problems"], ["Configure scoring and penalty", "settings"], ["Configure cheat detection", "settings"],
];

export default function ContestOverview({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, error, reload } = usePoll<OverviewData>(`/api/organizer/contests/${id}`, 5000);
  if (error) return <ApiErrorState error={error} />;
  if (!data) return <SkeletonRows />;
  const pre = data.contest.status === "DRAFT" || data.contest.status === "READY";
  return (
    <div className="stack" style={{ gap: 20 }}>
      <StatusPanel d={data} reload={reload} />
      {pre && (
        <div className="panel">
          <div className="panel-head"><h2>Before the contest</h2></div>
          <ol className="timeline" style={{ padding: "0 18px" }}>
            {STEPS.map(([l, href], i) => (
              <li key={i}><span className="mono faint">{String(i + 1).padStart(2, "0")}</span><span className="grow">{l}</span><Link className="btn sm" href={`/organizer/contests/${id}/${href}`}>Open</Link></li>
            ))}
            <li><span className="mono faint">05</span><span className="grow">{data.contest.status === "DRAFT" ? "Mark the contest ready, then start it" : "Start the contest when participants are ready"}</span></li>
          </ol>
        </div>
      )}
      <ProblemStats d={data} />
    </div>
  );
}
