import { route } from "@/lib/api";
import { clearOrganizerSession } from "@/lib/auth";
export const POST = route(async () => {
  await clearOrganizerSession();
  return { ok: true };
});
