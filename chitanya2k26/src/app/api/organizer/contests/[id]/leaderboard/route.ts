import { organizerRoute } from "@/lib/api";
import { leaderboard } from "@/lib/services";
export const dynamic = "force-dynamic";
export const GET = organizerRoute<{ id: string }>((_r, { id }) => leaderboard(id));
