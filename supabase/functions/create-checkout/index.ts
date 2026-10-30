// Starts a Stripe Checkout ($24.99 CAD / month) for ONE listing owned by the signed-in user.
// Secrets needed (Supabase -> Edge Functions -> Secrets): STRIPE_SECRET_KEY, STRIPE_PRICE_ID, SITE_URL
//
// Guards against paying twice for one listing:
//  - if the listing's subscription is already running, it refuses;
//  - if a checkout for this listing is already open (another tab, a double tap), it reuses it;
//  - every person has ONE Stripe customer, so all their subscriptions appear in "Manage billing".
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

    const auth = req.headers.get("Authorization") ?? "";
    const url = Deno.env.get("SUPABASE_URL")!;
    const asUser = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
    // Read with the server key (billing columns are private); ownership is checked below
    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const sub = tokenSubject(auth);

    // Everything that doesn't depend on another answer is asked at the same time
    const [userRes, listingRes, billingRes, customerRes] = await Promise.all([
      asUser.auth.getUser(),
      admin.from("listings").select("id,user_id,status,payment_status,headline").eq("id", listingId).maybeSingle(),
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
    if (["active", "past_due", "complimentary_launch"].includes(listing.payment_status)) {
      return json({ error: "This listing already has an active subscription." }, 400);
    }

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
    const reusable = open.data.find((s) => s.metadata?.listing_id === listing.id && s.url);
    if (reusable) return json({ url: reusable.url });

    const site = (Deno.env.get("SITE_URL") ?? "").replace(/\/+$/, "");
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: Deno.env.get("STRIPE_PRICE_ID")!, quantity: 1 }],
      customer: customerId,
      client_reference_id: listing.id,
      allow_promotion_codes: true,
      metadata: { listing_id: listing.id, user_id: user.id },
      // Each listing is its OWN subscription. Label it so the owner can tell them apart
      // on the checkout page, receipts and in "Manage billing".
      subscription_data: {
        description: `OwnersMarket listing: ${String(listing.headline ?? "").slice(0, 200)}`,
        metadata: { listing_id: listing.id, user_id: user.id },
      },
      custom_text: {
        submit: { message: `New monthly subscription for "${String(listing.headline ?? "your home").slice(0, 150)}". Your other listings are billed separately.` },
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
