import { route, participant } from "@/lib/api";
import { heartbeat } from "@/lib/services";
export const dynamic = "force-dynamic";
export const GET = route<{ id: string }>(async (_r, { id }) => {
  const t = await participant(id);
  return heartbeat(id, t.uid, t.epoch);
});
