import { isValidBearer } from "@/lib/links";
import { dispatchReminders } from "@/lib/reminders/dispatch";
import { cronSecret } from "@/lib/server-env";

// Called every 5 minutes by Supabase pg_cron (see supabase/cron.sql) with
// `Authorization: Bearer <CRON_SECRET>`. Sends whatever reminders are due.
export const maxDuration = 60;

async function handle(request: Request) {
  if (!isValidBearer(request.headers.get("authorization"), cronSecret())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const summary = await dispatchReminders();
    if (summary.failures.length) console.warn("Reminder failures", summary.failures);
    return Response.json(summary);
  } catch (err) {
    console.error("Reminder dispatch failed", err);
    return Response.json({ error: (err as Error).message }, { status: 500 });
  }
}

export const GET = handle;
export const POST = handle;
