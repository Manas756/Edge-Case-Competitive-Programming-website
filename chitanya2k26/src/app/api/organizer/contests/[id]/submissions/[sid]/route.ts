import { organizerRoute } from "@/lib/api";
import { organizerSubmission } from "@/lib/services";
export const dynamic = "force-dynamic";
export const GET = organizerRoute<{ id: string; sid: string }>((_r, { id, sid }) => organizerSubmission(id, sid));
