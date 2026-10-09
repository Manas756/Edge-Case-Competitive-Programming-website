import { organizerRoute, body } from "@/lib/api";
import { deleteContest, organizerOverview, updateContest } from "@/lib/services";
export const dynamic = "force-dynamic";
type P = { id: string };
export const GET = organizerRoute<P>((_r, { id }) => organizerOverview(id));
export const PATCH = organizerRoute<P>(async (req, { id }) => ({ contest: updateContest(id, await body(req)) }));
export const DELETE = organizerRoute<P>((_r, { id }) => (deleteContest(id), { ok: true }));
