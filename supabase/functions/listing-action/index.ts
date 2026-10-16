// Marks a listing sold, deletes it, or (admins only) takes it down — ending its Stripe
// subscription first, so nobody is charged for a listing that is no longer up.
// Secrets needed: STRIPE_SECRET_KEY (Verify JWT ON)
//
// Body: { listingId, action: "sold" | "delete" | "takedown", reason? }
//  - sold:     owner or admin. Billing stops at the end of the paid month (no refund).
//  - takedown: admins only, with a reason the owner sees. The listing goes to "needs changes";
//              the owner must edit and resubmit for review. Billing stops at the end of the paid
//              month (no refund).
//  - delete:   owner or admin. Billing stops now (no refund); photos are removed. When an admin
//              deletes someone else's listing, a reason is required and the owner is notified.
import Stripe from "npm:stripe@17.7.0";
import { createClient } from "npm:@supabase/supabase-js@2";
import { endModeFor, isRunning } from "../_shared/billing-rules.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
// The service-role database client (typed loosely: this project has no generated types)
// deno-lint-ignore no-explicit-any
type Db = any;
type StorageEntry = { id: string | null; name: string };
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const PHOTO_BUCKET = "public_listing_photos";
type Action = "sold" | "delete" | "takedown";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    if (!Deno.env.get("STRIPE_SECRET_KEY")) {
      console.error("Missing secret STRIPE_SECRET_KEY");
      return json({ error: "Setup incomplete: missing secret STRIPE_SECRET_KEY in Supabase." }, 500);
    }
    const url = Deno.env.get("SUPABASE_URL")!;
    const asUser = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });
    const { data: u } = await asUser.auth.getUser();
    if (!u?.user) return json({ error: "Please sign in first." }, 401);

    const body = await req.json().catch(() => ({}));
    const listingId = body?.listingId;
    const action = body?.action as Action;
    if (typeof listingId !== "string" || !["sold", "delete", "takedown"].includes(action)) {
      return json({ error: "Missing listing or action." }, 400);
    }

    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: me } = await admin.from("users").select("role").eq("id", u.user.id).maybeSingle();
    const isAdmin = me?.role === "admin";

    const { data: listing } = await admin
      .from("listings").select("id, user_id, status, headline").eq("id", listingId).maybeSingle();
    if (!listing) return json({ error: "Listing not found." }, 404);
    const isOwner = listing.user_id === u.user.id;

    if (action === "takedown" && !isAdmin) return json({ error: "Only administrators can take a listing down." }, 403);
    if (!isOwner && !isAdmin) return json({ error: "Listing not found." }, 404);

    const reason = String(body?.reason ?? "").replace(/<[^>]*>?/g, "").replace(/[\u0000-\u001F\u007F]/g, " ").trim().slice(0, 500);
    const adminDeletingOthers = action === "delete" && isAdmin && !isOwner;
    if (adminDeletingOthers && reason.length < 5) {
      return json({ error: "Please give the owner a reason (at least 5 characters)." }, 400);
    }
    if (action === "takedown") {
      if (reason.length < 5) return json({ error: "Please give the owner a reason (at least 5 characters)." }, 400);
      if (!["live", "paused", "in_review"].includes(listing.status)) {
        return json({ error: "Only listings that are up, paused or in review can be taken down." }, 400);
      }
    }
    if (action === "sold" && !["live", "paused"].includes(listing.status)) {
      return json({ error: "Only a listing that is up or paused can be marked sold." }, 400);
    }

    // 1. End billing in Stripe first. If this fails, nothing else changes.
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { httpClient: Stripe.createFetchHttpClient() });
    const endedAtPeriodEnd = await endBilling(admin, stripe, listing.id, listing.user_id, action);

    // 2. Change the listing (the server bypasses the browser-only rules on purpose)
    if (action === "sold") {
      const { error } = await admin.from("listings")
        .update({ status: "sold", ...(endedAtPeriodEnd ? { cancel_at_period_end: true } : {}) })
        .eq("id", listing.id);
      if (error) throw error;
    } else if (action === "takedown") {
      const { error } = await admin.from("listings")
        .update({ status: "rejected", review_notes: reason, ...(endedAtPeriodEnd ? { cancel_at_period_end: true } : {}) })
        .eq("id", listing.id);
      if (error) throw error;
    } else {
      await removeFolder(admin, `${listing.user_id}/${listing.id}`);
      const { error } = await admin.from("listings").delete().eq("id", listing.id);
      if (error) throw error;
      if (adminDeletingOthers) {
        const { error: nErr } = await admin.from("notifications").insert({
          user_id: listing.user_id,
          type: "listing_deleted_admin",
          title: "OwnersMarket removed your listing",
          body: `"${listing.headline ?? "Your listing"}": ${reason}`,
        });
        if (nErr) console.warn("owner notice not saved", nErr);
      }
    }
    return json({ ok: true });
  } catch (e) {
    console.error("listing-action", e);
    const stripeMsg = (e as any)?.type?.startsWith?.("Stripe") ? (e as any).message : null;
    return json({ error: stripeMsg ? `Stripe: ${stripeMsg}` : "That didn't work. Please try again." }, 500);
  }
});

/**
 * Ends every running subscription for this listing: the recorded one, plus any stray second one
 * started for the same listing. Returns true if billing will end at the close of the paid month.
 */
async function endBilling(
  admin: Db,
  stripe: Stripe,
  listingId: string,
  ownerId: string,
  action: Action,
): Promise<boolean> {
  const ids = new Set<string>();
  const { data: billing } = await admin
    .from("listing_billing").select("stripe_subscription_id").eq("listing_id", listingId).maybeSingle();
  const recorded = (billing as { stripe_subscription_id?: string } | null)?.stripe_subscription_id;
  if (recorded) ids.add(recorded);

  const { data: customer } = await admin
    .from("billing_customers").select("stripe_customer_id").eq("user_id", ownerId).maybeSingle();
  const customerId = (customer as { stripe_customer_id?: string } | null)?.stripe_customer_id;
  if (customerId) {
    for await (const s of stripe.subscriptions.list({ customer: customerId, status: "all", limit: 100 })) {
      if (s.metadata?.listing_id === listingId && isRunning(s.status)) ids.add(s.id);
    }
  }

  let atPeriodEnd = false;
  for (const id of ids) {
    const sub = await stripe.subscriptions.retrieve(id);
    const mode = endModeFor(action, sub.status);
    if (mode === "now") {
      await stripe.subscriptions.cancel(id, { prorate: false, invoice_now: false });
    } else if (mode === "period_end") {
      if (!sub.cancel_at_period_end) await stripe.subscriptions.update(id, { cancel_at_period_end: true });
      atPeriodEnd = true;
    }
  }
  return atPeriodEnd;
}

/** Deletes a listing's photos (best effort: the listing row is what makes them visible). */
async function removeFolder(admin: Db, prefix: string) {
  try {
    const { data } = await admin.storage.from(PHOTO_BUCKET).list(prefix, { limit: 1000 });
    const paths = ((data ?? []) as StorageEntry[]).filter((f) => f.id).map((f) => `${prefix}/${f.name}`);
    for (let i = 0; i < paths.length; i += 100) {
      await admin.storage.from(PHOTO_BUCKET).remove(paths.slice(i, i + 100));
    }
  } catch (e) {
    console.warn("photo cleanup skipped", prefix, e);
  }
}
