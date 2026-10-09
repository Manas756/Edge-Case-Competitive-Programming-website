import { route } from "@/lib/api";
import { AppError, getContest, publicContest } from "@/lib/services";
export const dynamic = "force-dynamic";
export const GET = route<{ id: string }>((_r, { id }) => {
  const c = getContest(id);
  if (c.status === "DRAFT") throw new AppError("NOT_FOUND", "Contest not found", 404);
  return { contest: publicContest(c) };
});
