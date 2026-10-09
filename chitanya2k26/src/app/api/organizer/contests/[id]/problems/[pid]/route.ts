import { organizerRoute, body } from "@/lib/api";
import { deleteProblem, organizerProblem, upsertProblem } from "@/lib/services";
export const dynamic = "force-dynamic";
type P = { id: string; pid: string };
export const GET = organizerRoute<P>((_r, { id, pid }) => organizerProblem(id, pid));
export const PUT = organizerRoute<P>(async (req, { id, pid }) => ({ problem: upsertProblem(id, pid, await body(req)) }));
export const DELETE = organizerRoute<P>((_r, { id, pid }) => (deleteProblem(id, pid), { ok: true }));
