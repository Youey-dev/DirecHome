// Receives Stripe events and keeps each listing's payment status correct.
// IMPORTANT: turn OFF "Verify JWT" for this function (Stripe is not a signed-in user; the
// Stripe signature below is what proves the request is genuine).
// Secrets needed: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
import Stripe from "npm:stripe@17.7.0";
import { createClient } from "npm:@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { httpClient: Stripe.createFetchHttpClient() });
const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

// We always re-read the subscription from Stripe, so event order never matters.
async function sync(subscriptionId: string) {
  const sub = await stripe.subscriptions.retrieve(subscriptionId);
  const listingId = sub.metadata?.listing_id;
  const userId = sub.metadata?.user_id;
  if (!listingId) return;

  const { data: current } = await admin
    .from("listings").select("payment_status, past_due_since").eq("id", listingId).maybeSingle();
  if (!current) return;

  let payment: string;
  switch (sub.status) {
    case "active":
    case "trialing": payment = "active"; break;
    case "past_due": payment = "past_due"; break;
    case "incomplete": payment = current.payment_status; break; // first payment not done yet
    default: payment = "canceled"; // canceled, unpaid, incomplete_expired, paused
  }

  const periodEnd = (sub as any).current_period_end ?? (sub.items?.data?.[0] as any)?.current_period_end;
  const price = sub.items?.data?.[0]?.price;
  await admin.from("listings").update({
    payment_status: payment,
    past_due_since: payment === "past_due" ? (current.past_due_since ?? new Date().toISOString()) : null,
    cancel_at_period_end: !!sub.cancel_at_period_end,
    next_billing_at: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    billing_cycle: "monthly",
    subscription_tier: "standard_monthly",
    monthly_fee_cad: price?.unit_amount ? price.unit_amount / 100 : 25,
  }).eq("id", listingId);

  if (userId) {
    await admin.from("listing_billing").upsert({
      listing_id: listingId,
      user_id: userId,
      stripe_customer_id: String(sub.customer),
      stripe_subscription_id: sub.id,
      updated_at: new Date().toISOString(),
    });
  }
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
