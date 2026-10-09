import { organizerRoute } from "@/lib/api";
import { organizerParticipants } from "@/lib/services";
export const dynamic = "force-dynamic";
export const GET = organizerRoute<{ id: string }>((_r, { id }) => ({ participants: organizerParticipants(id) }));
