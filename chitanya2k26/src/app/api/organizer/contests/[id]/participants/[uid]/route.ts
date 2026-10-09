import { organizerRoute, body } from "@/lib/api";
import { organizerParticipant, sessionControl, type SessionAction } from "@/lib/services";
export const dynamic = "force-dynamic";
type P = { id: string; uid: string };
export const GET = organizerRoute<P>((_r, { id, uid }) => organizerParticipant(id, uid));
export const POST = organizerRoute<P>(async (req, { id, uid }) => {
  const b = await body<{ action: SessionAction; extraMinutes?: number }>(req);
  return sessionControl(id, uid, b.action, Math.max(0, Math.min(240, Number(b.extraMinutes ?? 15) || 0)));
});
