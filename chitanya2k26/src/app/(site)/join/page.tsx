import { Suspense } from "react";
import JoinClient from "./JoinClient";
import { Loading } from "@/components/ui";

export const metadata = { title: "Join contest" };

export default function JoinPage() {
  return (
    <Suspense fallback={<Loading />}>
      <JoinClient demoCode={process.env.NEXT_PUBLIC_DEMO_CODE || ""} />
    </Suspense>
  );
}
