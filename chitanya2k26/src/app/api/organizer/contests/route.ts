import { organizerRoute, body } from "@/lib/api";
import { createContest, organizerContests } from "@/lib/services";
export const dynamic = "force-dynamic";
export const GET = organizerRoute(() => ({ contests: organizerContests() }));
export const POST = organizerRoute(async (req) => ({ contest: createContest(await body(req)) }));
