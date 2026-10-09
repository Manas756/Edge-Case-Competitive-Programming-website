import { redirect } from "next/navigation";
import { isOrganizer } from "@/lib/auth";
import OrgShell from "@/components/org/OrgShell";

export const dynamic = "force-dynamic";

// Server-side gate for every organizer page. API routes check the same session independently.
export default async function SecureLayout({ children }: { children: React.ReactNode }) {
  if (!(await isOrganizer())) redirect("/organizer/login?e=auth");
  return <OrgShell>{children}</OrgShell>;
}
