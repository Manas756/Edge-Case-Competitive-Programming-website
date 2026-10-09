import { organizerRoute, body } from "@/lib/api";
import { upsertTest } from "@/lib/services";
export const POST = organizerRoute<{ id: string; pid: string }>(async (req, { id, pid }) => ({ test: upsertTest(id, pid, null, await body(req)) }));
