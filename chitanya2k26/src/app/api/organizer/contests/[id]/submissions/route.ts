import { organizerRoute } from "@/lib/api";
import { organizerSubmissions } from "@/lib/services";
export const dynamic = "force-dynamic";
export const GET = organizerRoute<{ id: string }>((_r, { id }) => ({ submissions: organizerSubmissions(id) }));
