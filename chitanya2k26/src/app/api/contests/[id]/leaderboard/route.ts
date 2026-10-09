import { route } from "@/lib/api";
import { AppError, getContest, leaderboard } from "@/lib/services";
export const dynamic = "force-dynamic";
export const GET = route<{ id: string }>((_r, { id }) => {
  if (getContest(id).status === "DRAFT") throw new AppError("NOT_FOUND", "Contest not found", 404);
  return leaderboard(id);
});
