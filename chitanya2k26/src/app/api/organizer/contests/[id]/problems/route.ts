import { organizerRoute, body } from "@/lib/api";
import { contestProblems, upsertProblem } from "@/lib/services";
import { getDb } from "@/lib/store";
export const dynamic = "force-dynamic";
type P = { id: string };
export const GET = organizerRoute<P>((_r, { id }) => {
  const tcs = getDb().testCases;
  return {
    problems: contestProblems(id).map((p) => ({
      ...p,
      publicTests: tcs.filter((t) => t.problemId === p.id && !t.isHidden).length,
      hiddenTests: tcs.filter((t) => t.problemId === p.id && t.isHidden).length,
    })),
  };
});
export const POST = organizerRoute<P>(async (req, { id }) => ({ problem: upsertProblem(id, null, await body(req)) }));
