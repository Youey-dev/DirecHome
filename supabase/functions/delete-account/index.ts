// Permanently deletes the signed-in person's account (Canadian privacy law: right to erasure).
// Order matters: 1) cancel every Stripe subscription they have, 2) delete their photos,
// 3) delete the account, which removes their profile, listings, messages, viewings and favourites.
// If step 1 fails, nothing is deleted, so nobody keeps being charged for an account that's gone.
// Secrets needed: STRIPE_SECRET_KEY (Verify JWT ON)
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
type StorageEntry = { id: string | null; name: string };
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const PHOTO_BUCKET = "public_listing_photos";

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
    const uid = u.user.id;

    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: me } = await admin.from("users").select("role").eq("id", uid).maybeSingle();
    if (me?.role === "admin") {
      return json({ error: "Administrator accounts must be removed by another administrator in the Supabase dashboard." }, 400);
    }

    // 1. Cancel every subscription on every Stripe customer this person has used
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { httpClient: Stripe.createFetchHttpClient() });
    const customers = new Set<string>();
    const subs = new Set<string>();
    const { data: c1 } = await admin.from("billing_customers").select("stripe_customer_id").eq("user_id", uid);
    const { data: c2 } = await admin.from("listing_billing").select("stripe_customer_id, stripe_subscription_id").eq("user_id", uid);
    (c1 ?? []).forEach((r: any) => customers.add(r.stripe_customer_id));
    (c2 ?? []).forEach((r: any) => {
      customers.add(r.stripe_customer_id);
      subs.add(r.stripe_subscription_id);
    });
    for (const customer of customers) {
      for await (const s of stripe.subscriptions.list({ customer, status: "all", limit: 100 })) subs.add(s.id);
    }
    for (const id of subs) {
      const sub = await stripe.subscriptions.retrieve(id);
      if (isRunning(sub.status)) await stripe.subscriptions.cancel(id, { prorate: false, invoice_now: false });
    }

    // 2. Photos (every file under the person's folder)
    await removeAllUnder(admin, uid);

    // 3. The account itself; the database removes everything linked to it
    const { error } = await admin.auth.admin.deleteUser(uid);
    if (error) throw error;
    return json({ ok: true });
  } catch (e) {
    console.error("delete-account", e);
    return json({ error: "Your account could not be deleted. Please try again or contact privacy@ownersmarket.ca." }, 500);
  }
});

async function removeAllUnder(admin: Db, uid: string) {
  const bucket = admin.storage.from(PHOTO_BUCKET);
  const paths: string[] = [];
  const { data: top } = await bucket.list(uid, { limit: 1000 });
  for (const entry of top ?? []) {
    if (entry.id) {
      paths.push(`${uid}/${entry.name}`);
      continue;
    }
    const { data: files } = await bucket.list(`${uid}/${entry.name}`, { limit: 1000 });
    ((files ?? []) as StorageEntry[]).filter((f) => f.id).forEach((f) => paths.push(`${uid}/${entry.name}/${f.name}`));
  }
  for (let i = 0; i < paths.length; i += 100) {
    const { error } = await bucket.remove(paths.slice(i, i + 100));
    if (error) throw error;
  }
}
