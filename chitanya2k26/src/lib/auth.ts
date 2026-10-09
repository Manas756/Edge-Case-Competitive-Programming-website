import crypto from "node:crypto";
import { cookies } from "next/headers";

const ORG_COOKIE = "c26_org";
const partCookie = (contestId: string) => `c26_p_${contestId.replace(/[^a-zA-Z0-9_-]/g, "")}`;

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) {
    if (process.env.NODE_ENV === "production") throw new Error("SESSION_SECRET must be set (16+ chars)");
    return "dev-only-insecure-session-secret";
  }
  return s;
}

function sign(payload: object): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const mac = crypto.createHmac("sha256", secret()).update(body).digest("base64url");
  return `${body}.${mac}`;
}

function verify<T>(token: string | undefined): T | null {
  if (!token) return null;
  const [body, mac] = token.split(".");
  if (!body || !mac) return null;
  const expected = crypto.createHmac("sha256", secret()).update(body).digest("base64url");
  const a = Buffer.from(mac), b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(body, "base64url").toString()) as T & { exp: number };
    return data.exp > Date.now() ? data : null;
  } catch {
    return null;
  }
}

const cookieOpts = (maxAgeSec: number) => ({
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: maxAgeSec,
});

// ---------- Organizer ----------
export function checkOrganizerKey(key: string): boolean {
  const real = process.env.ORGANIZER_KEY;
  if (!real) return false;
  const a = crypto.createHash("sha256").update(key).digest();
  const b = crypto.createHash("sha256").update(real).digest();
  return crypto.timingSafeEqual(a, b);
}

export async function setOrganizerSession() {
  const jar = await cookies();
  jar.set(ORG_COOKIE, sign({ role: "organizer", exp: Date.now() + 12 * 3600_000 }), cookieOpts(12 * 3600));
}

export async function clearOrganizerSession() {
  (await cookies()).delete(ORG_COOKIE);
}

export async function isOrganizer(): Promise<boolean> {
  const jar = await cookies();
  return !!verify<{ role: string }>(jar.get(ORG_COOKIE)?.value);
}

// ---------- Participant ----------
export interface ParticipantToken {
  uid: string;
  cid: string;
  epoch: number;
}

export async function setParticipantSession(t: ParticipantToken) {
  const jar = await cookies();
  jar.set(partCookie(t.cid), sign({ ...t, exp: Date.now() + 24 * 3600_000 }), cookieOpts(24 * 3600));
}

export async function getParticipantToken(contestId: string): Promise<ParticipantToken | null> {
  const jar = await cookies();
  const t = verify<ParticipantToken>(jar.get(partCookie(contestId))?.value);
  return t && t.cid === contestId ? t : null;
}
