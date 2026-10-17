// Emails in-app notifications that are still unread 2 minutes after they were created.
// Called every 2 minutes by pg_cron (migration 014). Verify JWT: OFF (the call carries a
// secret from Supabase Vault instead, checked below).
//
// Secrets needed: RESEND_API_KEY
// Optional: EMAIL_FROM (default "OwnersMarket <notifications@ownersmarket.ca>"),
//           EMAIL_REPLY_TO (default "hello@ownersmarket.ca"), SITE_URL (default https://ownersmarket.ca),
//           EMAIL_DAILY_CAP (default 95, under Resend's free 100/day),
//           BUSINESS_MAILING_ADDRESS (shown in the footer; CASL asks for a mailing address).
import { createClient } from "npm:@supabase/supabase-js@2";
import { buildEmail, type NotificationRow } from "./template.ts";

const DELAY_MS = 2 * 60 * 1000; // give people a moment to see it on the site first
const MAX_AGE_MS = 2 * 24 * 60 * 60 * 1000; // never email old news
const MAX_ATTEMPTS = 3;
const BATCH = 25;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  const url = Deno.env.get("SUPABASE_URL")!;
  const db = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const { data: ok, error: secretErr } = await db.rpc("email_cron_secret_ok", { _s: req.headers.get("x-cron-secret") ?? "" });
  if (secretErr || ok !== true) return json({ error: "Forbidden" }, 403);

  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) return json({ skipped: "RESEND_API_KEY is not set" });

  const site = (Deno.env.get("SITE_URL") ?? "https://ownersmarket.ca").replace(/\/+$/, "");
  const from = Deno.env.get("EMAIL_FROM") ?? "OwnersMarket <notifications@ownersmarket.ca>";
  const replyTo = Deno.env.get("EMAIL_REPLY_TO") ?? "hello@ownersmarket.ca";
  const address = Deno.env.get("BUSINESS_MAILING_ADDRESS") ?? "";
  const dailyCap = Number(Deno.env.get("EMAIL_DAILY_CAP") ?? 95);

  // Stay under the plan's daily limit; anything left waits for the next run
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count: sentToday } = await db
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("email_status", "sent")
    .gte("emailed_at", dayAgo);
  const room = Math.max(0, dailyCap - (sentToday ?? 0));
  if (room === 0) return json({ sent: 0, reason: "daily cap reached" });

  const now = Date.now();
  const { data: due, error } = await db
    .from("notifications")
    .select("id, user_id, type, title, body, listing_id, conversation_id, created_at, email_attempts")
    .is("emailed_at", null)
    .is("read_at", null)
    .lt("created_at", new Date(now - DELAY_MS).toISOString())
    .gt("created_at", new Date(now - MAX_AGE_MS).toISOString())
    .lt("email_attempts", MAX_ATTEMPTS)
    .order("created_at", { ascending: true })
    .limit(Math.min(room, BATCH));
  if (error) {
    console.error("queue read failed", error);
    return json({ error: "queue read failed" }, 500);
  }

  let sent = 0, skipped = 0, failed = 0;
  for (const n of (due ?? []) as (NotificationRow & { user_id: string; email_attempts: number })[]) {
    // Claim it, so two runs can never send the same email
    const { data: claimed } = await db
      .from("notifications")
      .update({ emailed_at: new Date().toISOString(), email_status: "sending" })
      .eq("id", n.id)
      .is("emailed_at", null)
      .select("id");
    if (!claimed?.length) continue;

    const { data: user } = await db
      .from("users")
      .select("email, full_name, email_notify")
      .eq("id", n.user_id)
      .maybeSingle();
    if (!user?.email || user.email_notify === false) {
      await db.from("notifications").update({ email_status: user?.email ? "skipped: turned off" : "skipped: no email" }).eq("id", n.id);
      skipped++;
      continue;
    }

    const email = buildEmail(n, { site, firstName: firstName(user.full_name), address });
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "Idempotency-Key": `notification-${n.id}-${n.created_at}`,
        },
        body: JSON.stringify({
          from,
          to: [user.email],
          reply_to: replyTo,
          subject: email.subject,
          html: email.html,
          text: email.text,
          headers: { "List-Unsubscribe": `<${site}/notifications>` },
          tags: [{ name: "type", value: n.type.replace(/[^a-zA-Z0-9_-]/g, "_") }],
        }),
      });
      if (!res.ok) throw new Error(`Resend ${res.status}: ${(await res.text()).slice(0, 300)}`);
      await db.from("notifications").update({ email_status: "sent" }).eq("id", n.id);
      sent++;
    } catch (e) {
      console.error("send failed", n.id, e);
      // Put it back in the queue for another try (up to MAX_ATTEMPTS)
      await db
        .from("notifications")
        .update({ emailed_at: null, email_status: `failed: ${String(e).slice(0, 200)}`, email_attempts: n.email_attempts + 1 })
        .eq("id", n.id);
      failed++;
    }
  }
  return json({ sent, skipped, failed });
});

function firstName(full: string | null | undefined): string {
  const f = (full ?? "").trim().split(/\s+/)[0] ?? "";
  // Account names are sometimes an email handle; only use something that looks like a name
  return /^[\p{L}'-]{2,30}$/u.test(f) ? f : "";
}
