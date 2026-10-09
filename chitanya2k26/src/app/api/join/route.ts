import { route, body } from "@/lib/api";
import { joinContest } from "@/lib/services";
import { setParticipantSession } from "@/lib/auth";
export const POST = route(async (req) => {
  const b = await body<{ code?: string; name?: string; email?: string }>(req);
  const { contest, participant, resumed } = joinContest({ code: String(b.code ?? ""), name: String(b.name ?? ""), email: String(b.email ?? "") });
  await setParticipantSession({ uid: participant.userId, cid: contest.id, epoch: participant.sessionEpoch });
  return { contestId: contest.id, contestName: contest.name, resumed };
});
