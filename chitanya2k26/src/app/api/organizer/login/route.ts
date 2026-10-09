import { route, body } from "@/lib/api";
import { AppError } from "@/lib/services";
import { checkOrganizerKey, setOrganizerSession } from "@/lib/auth";

const attempts = new Map<string, { n: number; until: number }>();

export const POST = route(async (req) => {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
  const a = attempts.get(ip);
  if (a && a.until > Date.now()) throw new AppError("RATE_LIMITED", "Too many attempts. Wait a minute and try again.", 429);
  if (!process.env.ORGANIZER_KEY) throw new AppError("NOT_CONFIGURED", "Organizer access is not configured on this server (ORGANIZER_KEY).", 503);
  const { key } = await body<{ key?: string }>(req);
  if (!checkOrganizerKey(String(key ?? ""))) {
    const n = (a?.n ?? 0) + 1;
    attempts.set(ip, { n, until: n >= 5 ? Date.now() + 60_000 : 0 });
    throw new AppError("UNAUTHORIZED", "That organizer key is not correct.", 401);
  }
  attempts.delete(ip);
  await setOrganizerSession();
  return { ok: true };
});
