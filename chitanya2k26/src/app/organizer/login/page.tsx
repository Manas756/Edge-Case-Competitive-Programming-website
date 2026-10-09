import { redirect } from "next/navigation";
import { isOrganizer } from "@/lib/auth";
import LoginForm from "./LoginForm";
import { Brand } from "@/components/SiteHeader";

export const metadata = { title: "Organizer sign in" };
export const dynamic = "force-dynamic";

export default async function OrganizerLogin({ searchParams }: { searchParams: Promise<{ next?: string; e?: string }> }) {
  if (await isOrganizer()) redirect("/organizer");
  const { e } = await searchParams;
  return (
    <div style={{ minHeight: "100vh", display: "grid", gridTemplateRows: "auto 1fr", background: "var(--bg-subtle)" }}>
      <div className="container" style={{ height: 56, display: "flex", alignItems: "center" }}><Brand /></div>
      <div style={{ display: "grid", placeItems: "center", padding: 16 }}>
        <div className="panel" style={{ width: "100%", maxWidth: 400, boxShadow: "var(--shadow)" }}>
          <div className="panel-body stack" style={{ padding: 28 }}>
            <div>
              <div className="eyebrow">Organizer</div>
              <h1 style={{ fontSize: 22, marginTop: 6 }}>Sign in to manage contests</h1>
              <p className="muted small" style={{ marginTop: 6 }}>Use the organizer key configured on this server. It is never shown in the participant interface.</p>
            </div>
            {e === "auth" && <div className="notice error">Your organizer session has expired or is missing. Sign in again.</div>}
            <LoginForm />
          </div>
        </div>
      </div>
    </div>
  );
}
