import { organizerRoute } from "@/lib/api";
import { organizerIncidents } from "@/lib/services";
export const dynamic = "force-dynamic";
export const GET = organizerRoute<{ id: string }>((_r, { id }) => ({ incidents: organizerIncidents(id) }));
