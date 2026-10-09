import { route, body } from "@/lib/api";
import { createTeam } from "@/lib/services";
export const POST = route(async (req) => {
  const b = await body<{ contestCode?: string; teamName?: string }>(req);
  const { team, contest } = createTeam(String(b.contestCode ?? ""), String(b.teamName ?? ""));
  return { team: { name: team.name, code: team.code }, contest };
});
