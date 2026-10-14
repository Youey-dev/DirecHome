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
    const auth = req.headers.get("Authorization") ?? "";
    const url = Deno.env.get("SUPABASE_URL")!;
    const asUser = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
    const { data: u } = await asUser.auth.getUser();
    if (!u?.user) return json({ error: "Please sign in first." }, 401);

    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: row } = await admin
      .from("listing_billing").select("stripe_customer_id").eq("user_id", u.user.id).limit(1).maybeSingle();
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
    return json({ error: "We could not open billing. Please try again." }, 500);
  }
});
