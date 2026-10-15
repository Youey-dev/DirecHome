// Opens Stripe's Customer Portal (update card, see invoices, cancel) for the signed-in user.
// Secrets needed: STRIPE_SECRET_KEY, SITE_URL
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
    const missing = ["STRIPE_SECRET_KEY", "SITE_URL"].filter((k) => !Deno.env.get(k));
    if (missing.length) {
      console.error("Missing secrets:", missing.join(", "));
      return json({ error: `Setup incomplete: missing secret ${missing.join(", ")} in Supabase.` }, 500);
    }
    const auth = req.headers.get("Authorization") ?? "";
    const url = Deno.env.get("SUPABASE_URL")!;
    const asUser = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
    const { data: u } = await asUser.auth.getUser();
    if (!u?.user) return json({ error: "Please sign in first." }, 401);

    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    // One Stripe customer per person (billing_customers); older accounts fall back to their newest one
    const { data: customer } = await admin
      .from("billing_customers").select("stripe_customer_id").eq("user_id", u.user.id).maybeSingle();
    const { data: prior } = customer
      ? { data: null }
      : await admin.from("listing_billing").select("stripe_customer_id").eq("user_id", u.user.id)
          .order("updated_at", { ascending: false }).limit(1).maybeSingle();
    const row = customer ?? prior;
    if (!row) return json({ error: "You do not have any billing to manage yet." }, 404);

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { httpClient: Stripe.createFetchHttpClient() });
    const site = (Deno.env.get("SITE_URL") ?? "").replace(/\/+$/, "");
    const session = await stripe.billingPortal.sessions.create({
      customer: row.stripe_customer_id,
      return_url: `${site}/dashboard`,
    });
    return json({ url: session.url });
  } catch (e) {
    console.error("create-portal", e);
    // Stripe's own message (e.g. "No configuration provided...") tells us exactly what to fix
    const stripeMsg = (e as any)?.type?.startsWith?.("Stripe") ? (e as any).message : null;
    return json({ error: stripeMsg ? `Stripe: ${stripeMsg}` : "We could not open billing. Please try again." }, 500);
  }
});
