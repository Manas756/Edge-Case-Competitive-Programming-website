import { NextResponse } from "next/server";
import { AppError } from "./services";
import { isOrganizer, getParticipantToken } from "./auth";

type Ctx<P> = { params: Promise<P> };

export function route<P = Record<string, string>>(fn: (req: Request, params: P) => Promise<unknown> | unknown) {
  return async (req: Request, ctx: Ctx<P>) => {
    try {
      const out = await fn(req, (await ctx?.params) as P);
      return out instanceof Response ? out : NextResponse.json(out ?? { ok: true });
    } catch (e) {
      if (e instanceof AppError) return NextResponse.json({ error: { code: e.code, message: e.message } }, { status: e.status });
      console.error(e);
      return NextResponse.json({ error: { code: "SERVER_ERROR", message: "Something went wrong on the server." } }, { status: 500 });
    }
  };
}

export function organizerRoute<P = Record<string, string>>(fn: (req: Request, params: P) => Promise<unknown> | unknown) {
  return route<P>(async (req, params) => {
    if (!(await isOrganizer())) throw new AppError("UNAUTHORIZED", "Organizer sign-in required.", 401);
    return fn(req, params);
  });
}

export async function participant(contestId: string) {
  const t = await getParticipantToken(contestId);
  if (!t) throw new AppError("NOT_JOINED", "Join this contest with your code first.", 401);
  return t;
}

export async function body<T = Record<string, unknown>>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw new AppError("BAD_REQUEST", "Invalid request body.");
  }
}
