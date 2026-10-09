import { route, body } from "@/lib/api";
import { publicContest, resolveCode } from "@/lib/services";
export const POST = route(async (req) => {
  const { code } = await body<{ code?: string }>(req);
  const { contest, team } = resolveCode(String(code ?? ""));
  return { contest: publicContest(contest), team: team ? { name: team.name } : null };
});
