// Starts a Stripe Checkout ($25 CAD / month) for ONE listing owned by the signed-in user.
// Secrets needed (Supabase -> Edge Functions -> Secrets): STRIPE_SECRET_KEY, STRIPE_PRICE_ID, SITE_URL
import Stripe from "npm:stripe@17.7.0";
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const missing = ["STRIPE_SECRET_KEY", "STRIPE_PRICE_ID", "SITE_URL"].filter((k) => !Deno.env.get(k));
    if (missing.length) {
      console.error("Missing secrets:", missing.join(", "));
      return json({ error: `Setup incomplete: missing secret ${missing.join(", ")} in Supabase.` }, 500);
    }
    const auth = req.headers.get("Authorization") ?? "";
    const url = Deno.env.get("SUPABASE_URL")!;
    const asUser = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
    const { data: u } = await asUser.auth.getUser();
    if (!u?.user) return json({ error: "Please sign in first." }, 401);

    const { listingId } = await req.json();
    if (typeof listingId !== "string") return json({ error: "Missing listing." }, 400);

    // RLS: only the owner (or admin) can read a non-public listing
    const { data: listing } = await asUser
      .from("listings").select("id,user_id,status,payment_status,headline").eq("id", listingId).maybeSingle();
    if (!listing || listing.user_id !== u.user.id) return json({ error: "Listing not found." }, 404);
    if (!["live", "paused"].includes(listing.status)) {
      return json({ error: "Your listing must pass ownership verification before it can be activated." }, 400);
    }
    if (["active", "past_due", "complimentary_launch"].includes(listing.payment_status)) {
      return json({ error: "This listing already has an active subscription." }, 400);
    }

    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: prior } = await admin
      .from("listing_billing").select("stripe_customer_id").eq("user_id", u.user.id).limit(1).maybeSingle();

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { httpClient: Stripe.createFetchHttpClient() });
    const site = (Deno.env.get("SITE_URL") ?? "").replace(/\/+$/, "");
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: Deno.env.get("STRIPE_PRICE_ID")!, quantity: 1 }],
      ...(prior?.stripe_customer_id ? { customer: prior.stripe_customer_id } : { customer_email: u.user.email ?? undefined }),
      client_reference_id: listing.id,
      allow_promotion_codes: true,
      metadata: { listing_id: listing.id, user_id: u.user.id },
      subscription_data: { metadata: { listing_id: listing.id, user_id: u.user.id } },
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
