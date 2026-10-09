import { route, participant, body } from "@/lib/api";
import { reportIncident } from "@/lib/services";
export const POST = route<{ id: string }>(async (req, { id }) => {
  const t = await participant(id);
  const b = await body<{ type?: string; detail?: string }>(req);
  return reportIncident(id, t.uid, t.epoch, String(b.type ?? ""), String(b.detail ?? ""));
});
