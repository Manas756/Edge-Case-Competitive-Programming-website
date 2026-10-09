import { organizerRoute, body } from "@/lib/api";
import { deleteTest, upsertTest } from "@/lib/services";
type P = { id: string; pid: string; tid: string };
export const PUT = organizerRoute<P>(async (req, { id, pid, tid }) => ({ test: upsertTest(id, pid, tid, await body(req)) }));
export const DELETE = organizerRoute<P>((_r, { id, pid, tid }) => (deleteTest(id, pid, tid), { ok: true }));
