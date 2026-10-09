"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/client";
import { Spinner } from "@/components/ui";

export default function LoginForm() {
  const [key, setKey] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  useEffect(() => {
    router.prefetch("/organizer");
  }, [router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const cleanKey = key.trim();
    if (!cleanKey) { setErr("Enter the organizer key."); return; }
    setBusy(true); setErr(null);
    try {
      await api("/api/organizer/login", { body: { key: cleanKey } });
      setSuccess(true);
      router.replace("/organizer");
    } catch (e) {
      setErr((e as ApiError).message);
      setBusy(false);
    }
  }

  return (
    <form className="stack" onSubmit={submit}>
      <div className="field">
        <label htmlFor="key">Organizer key</label>
        <input
          id="key"
          type="password"
          className={`input ${err ? "invalid" : ""}`}
          value={key}
          onChange={(e) => { setKey(e.target.value); setErr(null); }}
          autoComplete="current-password"
          autoFocus
          disabled={busy || success}
        />
      </div>
      {err && <div className="notice error" role="alert">{err}</div>}
      <button className="btn primary block lg" disabled={busy || success}>
        {(busy || success) && <Spinner />}
        {success ? "Signing in…" : busy ? "Verifying…" : "Sign in"}
      </button>
    </form>
  );
}
