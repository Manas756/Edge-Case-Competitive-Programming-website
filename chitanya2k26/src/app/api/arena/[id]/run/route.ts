import { route, participant, body } from "@/lib/api";
import { runCode } from "@/lib/services";
export const POST = route<{ id: string }>(async (req, { id }) => {
  const t = await participant(id);
  const b = await body<{ problemId?: string; language?: string; code?: string }>(req);
  return runCode(id, t.uid, t.epoch, String(b.problemId ?? ""), String(b.language ?? ""), String(b.code ?? ""));
});
