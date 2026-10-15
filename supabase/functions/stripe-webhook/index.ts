// Receives Stripe events and keeps each listing's payment status correct.
// IMPORTANT: turn OFF "Verify JWT" for this function (Stripe is not a signed-in user; the
// Stripe signature below is what proves the request is genuine).
// Secrets needed: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
//
// Safety rules (see ../_shared/billing-rules.ts):
//  - Only ONE subscription drives a listing. A second one started for the same listing (two tabs,
//    a double tap) is cancelled and refunded automatically.
//  - If the listing no longer exists, its subscription is cancelled so nobody is charged for nothing.
//  - Every event re-reads the subscription from Stripe, so repeats and out-of-order events are harmless.
import Stripe from "npm:stripe@17.7.0";
import { createClient } from "npm:@supabase/supabase-js@2";
import { decideSync, paymentStatusFor } from "../_shared/billing-rules.ts";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { httpClient: Stripe.createFetchHttpClient() });
const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

const MONTHLY_FEE_CAD = 24.99;

async function recordedFor(listingId: string): Promise<string | null> {
  const { data, error } = await admin
    .from("listing_billing").select("stripe_subscription_id").eq("listing_id", listingId).maybeSingle();
  if (error) throw error;
  return data?.stripe_subscription_id ?? null;
}

/** Cancels a second subscription for the same listing and refunds what it charged. */
async function cancelDuplicate(sub: Stripe.Subscription) {
  console.warn("duplicate subscription for listing", sub.metadata?.listing_id, sub.id);
  const full = await stripe.subscriptions.retrieve(sub.id, { expand: ["latest_invoice.payment_intent"] });
  if (full.status !== "canceled") await stripe.subscriptions.cancel(sub.id, { prorate: false, invoice_now: false });
  const invoice = full.latest_invoice as Stripe.Invoice | null;
  const pi = (invoice as any)?.payment_intent as Stripe.PaymentIntent | string | null | undefined;
  const piId = typeof pi === "string" ? pi : pi?.id;
  const succeeded = typeof pi === "string" ? invoice?.status === "paid" : pi?.status === "succeeded";
  if (piId && succeeded) {
    // Idempotency key: a repeated event never refunds twice
    await stripe.refunds.create({ payment_intent: piId, reason: "duplicate" }, { idempotencyKey: `dup-refund-${sub.id}` });
  }
}

async function sync(subscriptionId: string) {
  const sub = await stripe.subscriptions.retrieve(subscriptionId);
  const listingId = sub.metadata?.listing_id;
  const userId = sub.metadata?.user_id;
  if (!listingId) return;

  const { data: listing, error: listingErr } = await admin
    .from("listings").select("payment_status, past_due_since").eq("id", listingId).maybeSingle();
  if (listingErr) throw listingErr;

  // Two passes at most: if another event claimed the listing while we were deciding, decide again.
  for (let attempt = 0; attempt < 2; attempt++) {
    const recorded = listing ? await recordedFor(listingId) : null;
    const recordedStatus =
      recorded && recorded !== sub.id ? (await stripe.subscriptions.retrieve(recorded)).status : null;

    const decision = decideSync({
      subscriptionId: sub.id,
      subscriptionStatus: sub.status,
      listingExists: !!listing,
      recordedSubscriptionId: recorded,
      recordedStatus,
    });

    if (decision.kind === "ignore") return;
    if (decision.kind === "cancel_orphan") {
      console.warn("cancelling subscription for a listing that no longer exists", listingId, sub.id);
      await stripe.subscriptions.cancel(sub.id, { prorate: false, invoice_now: false });
      return;
    }
    if (decision.kind === "cancel_duplicate") {
      await cancelDuplicate(sub);
      return;
    }

    // apply
    if (decision.claim && recorded !== sub.id) {
      if (!userId) throw new Error(`subscription ${sub.id} has no user_id`);
      const row = {
        listing_id: listingId,
        user_id: userId,
        stripe_customer_id: String(sub.customer),
        stripe_subscription_id: sub.id,
        updated_at: new Date().toISOString(),
      };
      if (!recorded) {
        // Insert only if nobody else got there first (the unique listing_id decides)
        const { error } = await admin.from("listing_billing").upsert(row, { onConflict: "listing_id", ignoreDuplicates: true });
        if (error) throw error;
      } else {
        // The recorded subscription has ended: replace it, but only if it is still the one we saw
        const { error } = await admin.from("listing_billing").update(row)
          .eq("listing_id", listingId).eq("stripe_subscription_id", recorded);
        if (error) throw error;
      }
      if ((await recordedFor(listingId)) !== sub.id) continue; // lost a race: decide again
      await admin.from("billing_customers")
        .upsert({ user_id: userId, stripe_customer_id: String(sub.customer) }, { onConflict: "user_id", ignoreDuplicates: true });
    }

    const payment = paymentStatusFor(sub.status, listing!.payment_status);
    const periodEnd = (sub as any).current_period_end ?? (sub.items?.data?.[0] as any)?.current_period_end;
    const price = sub.items?.data?.[0]?.price;
    const { error } = await admin.from("listings").update({
      payment_status: payment,
      past_due_since: payment === "past_due" ? (listing!.past_due_since ?? new Date().toISOString()) : null,
      cancel_at_period_end: !!sub.cancel_at_period_end,
      next_billing_at: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
      billing_cycle: "monthly",
      subscription_tier: "standard_monthly",
      monthly_fee_cad: price?.unit_amount ? price.unit_amount / 100 : MONTHLY_FEE_CAD,
    }).eq("id", listingId);
    if (error) throw error;
    return;
  }
  throw new Error(`could not settle which subscription owns listing ${listingId}`);
}

Deno.serve(async (req) => {
  const signature = req.headers.get("stripe-signature");
  if (!signature) return new Response("Missing signature", { status: 400 });
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      await req.text(), signature, Deno.env.get("STRIPE_WEBHOOK_SECRET")!,
    );
  } catch (e) {
    console.error("bad signature", e);
    return new Response("Invalid signature", { status: 400 });
  }

  try {
    const o: any = event.data.object;
    let subId: string | null = null;
    switch (event.type) {
      case "checkout.session.completed":
        subId = typeof o.subscription === "string" ? o.subscription : o.subscription?.id ?? null; break;
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        subId = o.id; break;
      case "invoice.paid":
      case "invoice.payment_failed": {
        const s = o.subscription ?? o.parent?.subscription_details?.subscription;
        subId = typeof s === "string" ? s : s?.id ?? null; break;
      }
    }
    if (subId) await sync(subId);
    return new Response(JSON.stringify({ received: true }), { status: 200 });
  } catch (e) {
    console.error("webhook failed", event.type, e);
    return new Response("Processing error", { status: 500 }); // Stripe will retry
  }
});
