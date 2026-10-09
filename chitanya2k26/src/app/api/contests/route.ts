import { route } from "@/lib/api";
import { listPublicContests } from "@/lib/services";
export const dynamic = "force-dynamic";
export const GET = route(() => ({ contests: listPublicContests() }));
