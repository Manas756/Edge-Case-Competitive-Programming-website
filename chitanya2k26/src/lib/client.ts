"use client";
import { useCallback, useEffect, useRef, useState } from "react";

export class ApiError extends Error {
  constructor(public code: string, message: string, public status: number) {
    super(message);
  }
}

const inflightGets = new Map<string, Promise<any>>();

export async function api<T = any>(url: string, opts: { method?: string; body?: unknown } = {}): Promise<T> {
  const isGet = (!opts.method || opts.method === "GET") && opts.body === undefined;
  if (isGet && inflightGets.has(url)) {
    return inflightGets.get(url) as Promise<T>;
  }

  const p = (async () => {
    let res: Response;
    try {
      res = await fetch(url, {
        method: opts.method ?? (opts.body !== undefined ? "POST" : "GET"),
        headers: opts.body !== undefined ? { "Content-Type": "application/json" } : undefined,
        body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
        cache: "no-store",
      });
    } catch {
      throw new ApiError("NETWORK", "Network error. Check your connection and try again.", 0);
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new ApiError(data?.error?.code ?? "HTTP_" + res.status, data?.error?.message ?? `Request failed (${res.status})`, res.status);
    return data as T;
  })();

  if (isGet) {
    inflightGets.set(url, p);
    p.finally(() => {
      inflightGets.delete(url);
    });
  }

  return p;
}

// Fetch + optional polling. Keeps the last good data visible while refreshing.
export function usePoll<T = any>(url: string | null, intervalMs = 0) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(true);
  const alive = useRef(true);
  const loadingRef = useRef(false);

  const load = useCallback(async (isBackground = false) => {
    if (!url || loadingRef.current) return;
    loadingRef.current = true;
    try {
      const d = await api<T>(url);
      if (alive.current) {
        setData(d);
        setError(null);
      }
    } catch (e) {
      if (alive.current) setError(e as ApiError);
    } finally {
      loadingRef.current = false;
      if (alive.current && !isBackground) setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    alive.current = true;
    setLoading(true);
    load();
    if (!intervalMs) return () => void (alive.current = false);
    const t = setInterval(() => {
      if (document.visibilityState === "visible") {
        load(true);
      }
    }, intervalMs);
    return () => {
      alive.current = false;
      clearInterval(t);
    };
  }, [load, intervalMs]);
  return { data, error, loading, reload: () => load(false), setData };
}

export const fmtDate = (s: string | null | undefined) =>
  s ? new Date(s).toLocaleString(undefined, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";
export const fmtTime = (s: string | null | undefined) =>
  s ? new Date(s).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "—";
export const fmtDuration = (min: number) => (min >= 60 ? `${Math.floor(min / 60)}h${min % 60 ? ` ${min % 60}m` : ""}` : `${min}m`);
export function fmtClock(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
  return [h, m, x].map((n) => String(n).padStart(2, "0")).join(":");
}
export function ago(s: string | null | undefined) {
  if (!s) return "—";
  const d = Math.max(0, Date.now() - Date.parse(s)) / 1000;
  if (d < 60) return `${Math.floor(d)}s ago`;
  if (d < 3600) return `${Math.floor(d / 60)}m ago`;
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
  return `${Math.floor(d / 86400)}d ago`;
}
