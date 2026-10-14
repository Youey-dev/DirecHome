# Stripe setup (do these in order)

Price: $25 CAD / month per listing. A listing goes live only after (1) you approve ownership and (2) the owner pays.
Failed payment: listing hides after 1 day. Cancel: listing stays up until the end of the paid month.

## A. Supabase (database)
1. SQL Editor -> paste `supabase/migrations/20261015_stripe_billing.sql` (also given as `006_stripe_billing.sql`) -> Run. Expect "Success".

## B. Supabase (three functions)
Dashboard -> Edge Functions -> Deploy a new function -> "Via Editor". Make three, with these EXACT names,
pasting the code from the matching file in `supabase/functions/<name>/index.ts`:
- `create-checkout`
- `create-portal`
- `stripe-webhook`  -> after deploying, open its settings and turn OFF "Enforce JWT verification".
  (Stripe is not a logged-in user; the Stripe signature is what protects this one.)

## C. Supabase secrets
Edge Functions -> Secrets -> add:
| Name | Value |
|---|---|
| `STRIPE_SECRET_KEY` | Stripe -> Developers -> API keys -> Secret key (`sk_...`). NEVER share it in chat or put it in GitHub. |
| `STRIPE_PRICE_ID` | `price_1UQK5XB6rLrJnhTtPIu3t7wi` (must be from the SAME Stripe mode as the key) |
| `SITE_URL` | Your Netlify address, e.g. `https://your-site.netlify.app` (no slash at the end) |
| `STRIPE_WEBHOOK_SECRET` | from step D |

## D. Stripe webhook
Stripe -> Developers -> Webhooks -> Add endpoint
- URL: `https://<your-supabase-project-ref>.supabase.co/functions/v1/stripe-webhook`
- Events: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`,
  `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`
- Save, then copy the "Signing secret" (`whsec_...`) into the `STRIPE_WEBHOOK_SECRET` secret above.

## E. Stripe settings
- Settings -> Billing -> Customer portal: turn on; allow "Cancel subscription" -> "At end of billing period"; allow updating payment methods.

## F. Test before launch
Best: switch Stripe to Test mode (sandbox), repeat the price + keys + webhook there, and pay with card 4242 4242 4242 4242.
To simulate a failure use 4000 0000 0000 0341. Check: pay -> listing goes live; Manage billing -> cancel -> shows "stays live until <date>".
The website needs no Stripe key (checkout happens on Stripe's own page), so the publishable key is not used.
