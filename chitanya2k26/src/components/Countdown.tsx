"use client";
import { useEffect, useState } from "react";
import { fmtClock } from "@/lib/client";

export default function Countdown({ to, paused, offset = 0, onZero }: { to: string; paused?: boolean; offset?: number; onZero?: () => void }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    if (paused) return;
    setNow(Date.now() + offset);
    const t = setInterval(() => setNow(Date.now() + offset), 500);
    return () => clearInterval(t);
  }, [paused, offset]);
  const left = now === null ? null : Date.parse(to) - now;
  useEffect(() => {
    if (left !== null && left <= 0) onZero?.();
  }, [left !== null && left <= 0]); // eslint-disable-line react-hooks/exhaustive-deps
  if (paused) return <span>Paused</span>;
  return <span suppressHydrationWarning>{left === null ? "--:--:--" : fmtClock(left)}</span>;
}
