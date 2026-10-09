import { organizerRoute } from "@/lib/api";
import { exportCsv, getContest } from "@/lib/services";
export const dynamic = "force-dynamic";
export const GET = organizerRoute<{ id: string }>((_r, { id }) => {
  const c = getContest(id);
  return new Response("﻿" + exportCsv(id), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${c.code}-results.csv"` },
  });
});
