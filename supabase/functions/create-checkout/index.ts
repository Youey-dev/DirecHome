// Starts a Stripe Checkout ($24.99 CAD / month) for ONE listing owned by the signed-in user.
// Secrets needed (Supabase -> Edge Functions -> Secrets): STRIPE_SECRET_KEY, STRIPE_PRICE_ID, SITE_URL
//
// Guards against paying twice for one listing:
//  - if the listing's subscription is already running, it refuses;
//  - if a checkout for this listing is already open (another tab, a double tap), it reuses it;
//  - every person has ONE Stripe customer, so all their subscriptions appear in "Manage billing".
// Free months (no Stripe setup needed):
//  - a listing on a free period with an end date (promo code or admin gift) can be activated
//    early: Stripe starts charging when the free period ends;
//  - a "card required" promo code (body.promoCode) gives a free trial of the code's months.
// The webhook also cancels and refunds any second subscription that still gets through.
import Stripe from "npm:stripe@17.7.0";
import { createClient } from "npm:@supabase/supabase-js@2";
import { isRunning } from "../_shared/billing-rules.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
// The service-role database client (typed loosely: this project has no generated types)
// deno-lint-ignore no-explicit-any
type Db = any;
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

// Created once per server instance, not on every click
const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
const stripe = stripeKey ? new Stripe(stripeKey, { httpClient: Stripe.createFetchHttpClient() }) : null;

/** The user id in the caller's sign-in token. Only used to START a lookup early; getUser() below is what's trusted. */
function tokenSubject(auth: string): string | null {
  try {
    const payload = JSON.parse(atob(auth.replace(/^Bearer\s+/i, "").split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return typeof payload?.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const body = await req.json().catch(() => ({}));
    // The dashboard calls this once when it shows an "Activate listing" button, so the server is
    // already awake when the person clicks (a cold start adds about a second).
    if (body?.warm === true) return json({ ok: true });

    const missing = ["STRIPE_SECRET_KEY", "STRIPE_PRICE_ID", "SITE_URL"].filter((k) => !Deno.env.get(k));
    if (missing.length || !stripe) {
      console.error("Missing secrets:", missing.join(", "));
      return json({ error: `Setup incomplete: missing secret ${missing.join(", ")} in Supabase.` }, 500);
    }
    const { listingId } = body;
    if (typeof listingId !== "string") return json({ error: "Missing listing." }, 400);
    const promoCode = typeof body.promoCode === "string" && body.promoCode.trim() ? body.promoCode.trim().toUpperCase() : null;

    const auth = req.headers.get("Authorization") ?? "";
    const url = Deno.env.get("SUPABASE_URL")!;
    const asUser = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
    // Read with the server key (billing columns are private); ownership is checked below
    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const sub = tokenSubject(auth);

    // Everything that doesn't depend on another answer is asked at the same time
    const [userRes, listingRes, billingRes, customerRes] = await Promise.all([
      asUser.auth.getUser(),
      admin.from("listings").select("id,user_id,status,payment_status,headline,complimentary_until").eq("id", listingId).maybeSingle(),
      admin.from("listing_billing").select("stripe_subscription_id").eq("listing_id", listingId).maybeSingle(),
      sub
        ? admin.from("billing_customers").select("stripe_customer_id").eq("user_id", sub).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);
    const user = userRes.data?.user;
    if (!user) return json({ error: "Please sign in first." }, 401);
    const listing = listingRes.data;
    if (!listing || listing.user_id !== user.id) return json({ error: "Listing not found." }, 404);
    if (!["live", "paused"].includes(listing.status)) {
      return json({ error: "Your listing must be approved by our review team before it can be activated." }, 400);
    }
    // A free period with an end date may be followed by a subscription (charged from that date).
    // The older free listings with no end date need nothing.
    const freeUntil: string | null = listing.payment_status === "complimentary_launch" ? listing.complimentary_until : null;
    if (
      ["active", "past_due"].includes(listing.payment_status) ||
      (listing.payment_status === "complimentary_launch" && !freeUntil)
    ) {
      return json({ error: "This listing already has an active subscription." }, 400);
    }

    // When the first charge happens (Unix seconds), if not straight away
    let trialEnd: number | null = null;
    if (freeUntil) {
      trialEnd = Math.floor(new Date(freeUntil).getTime() / 1000);
    } else if (promoCode) {
      const { data: promo, error: promoErr } = await admin.rpc("check_promo", { _code: promoCode, _listing_id: listing.id });
      if (promoErr) return json({ error: promoErr.message }, 400);
      const p = (promo as { code: string; free_months: number; card_required: boolean }[] | null)?.[0];
      if (!p) return json({ error: "That promo code isn't valid." }, 400);
      const end = new Date();
      end.setMonth(end.getMonth() + p.free_months);
      trialEnd = Math.floor(end.getTime() / 1000);
      // Counted as used now (checking out again with the same code on this listing is fine)
      const { error: redErr } = await admin.from("promo_redemptions").upsert(
        { code: p.code, listing_id: listing.id, user_id: user.id, free_until: end.toISOString() },
        { onConflict: "listing_id" },
      );
      if (redErr) throw redErr;
    }
    // Stripe needs a trial to end at least 2 days from now; a shorter one is simply not given
    if (trialEnd && trialEnd < Date.now() / 1000 + 2 * 86400 + 600) trialEnd = null;
    const trialKey = trialEnd ? String(trialEnd) : "";

    // The customer found early only counts if the token's user is the verified user
    const knownCustomer = sub === user.id ? ((customerRes.data as { stripe_customer_id?: string } | null)?.stripe_customer_id ?? null) : null;
    const customerId = knownCustomer ?? (await customerFor(admin, stripe, user.id, user.email ?? undefined));
    const subscriptionId = (billingRes.data as { stripe_subscription_id?: string } | null)?.stripe_subscription_id;

    // Both Stripe checks at once: a payment that went through a moment ago (before the webhook
    // updated the listing), and a checkout already open for this listing (another tab, a double tap)
    const [existing, open] = await Promise.all([
      subscriptionId ? stripe.subscriptions.retrieve(subscriptionId) : Promise.resolve(null),
      stripe.checkout.sessions.list({ customer: customerId, status: "open", limit: 20 }),
    ]);
    if (existing && isRunning(existing.status) && existing.status !== "incomplete") {
      return json({ error: "This listing already has an active subscription. Refresh the page in a moment." }, 400);
    }
    // Reuse an open checkout only if it was for the same free period (or none)
    const reusable = open.data.find(
      (s) => s.metadata?.listing_id === listing.id && (s.metadata?.trial_end ?? "") === trialKey && s.url,
    );
    if (reusable) return json({ url: reusable.url });

    const site = (Deno.env.get("SITE_URL") ?? "").replace(/\/+$/, "");
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: Deno.env.get("STRIPE_PRICE_ID")!, quantity: 1 }],
      customer: customerId,
      client_reference_id: listing.id,
      // Stripe's own coupons still work, except on top of free months
      allow_promotion_codes: trialEnd ? undefined : true,
      metadata: { listing_id: listing.id, user_id: user.id, trial_end: trialKey },
      // Each listing is its OWN subscription. Label it so the owner can tell them apart
      // on the checkout page, receipts and in "Manage billing".
      subscription_data: {
        description: `OwnersMarket listing: ${String(listing.headline ?? "").slice(0, 200)}`,
        metadata: { listing_id: listing.id, user_id: user.id },
        ...(trialEnd ? { trial_end: trialEnd } : {}),
      },
      custom_text: {
        submit: {
          message: trialEnd
            ? `Free until ${new Date(trialEnd * 1000).toLocaleDateString("en-CA", { month: "long", day: "numeric", year: "numeric", timeZone: "America/Toronto" })}, then $24.99 a month for "${String(listing.headline ?? "your home").slice(0, 120)}". You won't be charged before then. Cancel any time.`
            : `New monthly subscription for "${String(listing.headline ?? "your home").slice(0, 150)}". Your other listings are billed separately.`,
        },
      },
      success_url: `${site}/dashboard?billing=success`,
      cancel_url: `${site}/dashboard?billing=cancelled`,
    });
    return json({ url: session.url });
  } catch (e) {
    console.error("create-checkout", e);
    // Stripe's own message (e.g. "No such price") is safe to show and tells us exactly what to fix
    const stripeMsg = (e as any)?.type?.startsWith?.("Stripe") ? (e as any).message : null;
    return json({ error: stripeMsg ? `Stripe: ${stripeMsg}` : "We could not start checkout. Please try again." }, 500);
  }
});

/** One Stripe customer per person, created the first time they activate a listing. */
async function customerFor(
  admin: Db,
  stripe: Stripe,
  userId: string,
  email: string | undefined,
): Promise<string> {
  const lookup = async () => {
    const { data } = await admin.from("billing_customers").select("stripe_customer_id").eq("user_id", userId).maybeSingle();
    return (data as { stripe_customer_id?: string } | null)?.stripe_customer_id ?? null;
  };
  const known = await lookup();
  if (known) return known;

  // Someone who paid before this table existed: reuse their newest customer
  const { data: prior } = await admin
    .from("listing_billing").select("stripe_customer_id").eq("user_id", userId)
    .order("updated_at", { ascending: false }).limit(1).maybeSingle();
  const candidate =
    (prior as { stripe_customer_id?: string } | null)?.stripe_customer_id ??
    (await stripe.customers.create({ email, metadata: { user_id: userId } }, { idempotencyKey: `customer-${userId}` })).id;

  // Two requests at once: whichever row lands first is the customer for good
  await admin.from("billing_customers").upsert(
    { user_id: userId, stripe_customer_id: candidate },
    { onConflict: "user_id", ignoreDuplicates: true },
  );
  return (await lookup()) ?? candidate;
}
