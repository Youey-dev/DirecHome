# OwnersMarket — Launch Checklist

Last updated 2026-11-26. `[x]` = done, `[ ]` = still to do.

Items marked *(built)* are finished in the code; whatever is left is a setup step in a dashboard
(Supabase, Netlify, Stripe, Resend, Cloudflare) that the code cannot confirm.

---

## 1. Database (Supabase)
- [x] Project created, initial schema run (`20261010_initial_schema.sql`)
- [x] Security hardening run (`20261011_security_hardening.sql`): admin roles come from the database, exact addresses are private, sellers cannot self-approve, server-side rate limits, storage buckets and rules
- [x] App support run (`20261012_app_support.sql`): records Terms acceptance, adds "delete my account"
- [x] Table permissions run (`20261013_table_permissions.sql`)
- [ ] Confirm every later migration has been run, in filename order: `20261014_one_account_and_notifications.sql` through `20261042_admin_delete_messages.sql` (there are two `20261036_…` files; run both)
- [x] Email confirmation ON, password minimum 10+ characters
- [x] Admin account created (only one admin; check with `select email, role from public.users;`)
- [ ] Turn on 2-factor authentication on your own Supabase login
- [ ] Verify daily backups: Supabase → Database → Backups
- [ ] Custom email sender (SMTP) — Supabase's built-in email is heavily limited. Create a Resend account, verify your domain, then Supabase → Authentication → SMTP Settings

## 2. Hosting (Netlify) — needs your live site
- [x] Netlify settings in the repo *(built)*: `netlify.toml` has the build command, `dist` folder, page redirects, security headers and edge functions
- [ ] Import the GitHub repo into Netlify
- [ ] Add environment variables **VITE_SUPABASE_URL** and **VITE_SUPABASE_ANON_KEY** (anon/public key ONLY — never the service_role key)
- [ ] **Supabase → Authentication → URL Configuration:** set **Site URL** to your live address and add it (and your final domain) under **Redirect URLs**
- [ ] Register your domain, point DNS at Netlify, confirm HTTPS works
- [x] Sitemap line in `public/robots.txt` (`https://ownersmarket.ca/sitemap.xml`, served by the `sitemap` edge function)

## 3. Payments (Stripe) — $24.99 CAD / month per listing
Follow **STRIPE_SETUP.md** for the details.
- [x] Billing built *(built)*: `create-checkout`, `create-portal` and `stripe-webhook` edge functions, billing migrations, pricing page, promo codes, tests in `tests/billing.test.ts`
- [ ] Deploy the three Stripe edge functions (`stripe-webhook` with Verify JWT **off**)
- [ ] Add the Supabase secrets: `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, `STRIPE_WEBHOOK_SECRET`, `SITE_URL` (your live address)
- [ ] Stripe webhook endpoint added with the six events listed in STRIPE_SETUP.md
- [ ] Stripe Customer Portal turned on (cancel at end of billing period, update payment method)
- [ ] Test-mode run: pay with 4242 4242 4242 4242 → listing goes live; cancel → "stays live until <date>"; failing card 4000 0000 0000 0341
- [ ] Switch to live mode keys and the live price before launch

## 4. Before real users
- [ ] Run **docs/TESTING.md** start to finish
- [ ] Bot protection — Cloudflare Turnstile is built into sign-up, sign-in and password reset *(built)*. To turn it on: create the widget → add `VITE_TURNSTILE_SITE_KEY` in Netlify → Supabase → Authentication → Attack Protection → enable CAPTCHA (Turnstile secret)
- [ ] Hosted map tiles (e.g. MapTiler) — supported in code *(built)*: set `VITE_MAP_TILE_URL` and `VITE_MAP_ATTRIBUTION` in Netlify (the free OpenStreetMap servers are not intended for commercial traffic)
- [ ] Error monitoring (Sentry) and an uptime monitor on the home page — not built yet
- [x] Support email address on your domain, shown in the footer/legal pages (`hello@ownersmarket.ca`, `privacy@ownersmarket.ca`) — make sure both mailboxes actually receive mail

## 5. Legal & regulatory
- [ ] Lawyer reviews Terms of Use, Privacy Policy, Listing Rules, the paid-listing terms and the non-brokerage wording
- [ ] Confirm BCFSA (and other provinces' regulators, now that listings are open across Canada outside Quebec) guidance for for-sale-by-owner advertising portals
- [ ] Business registration, business bank account
- [ ] Privacy officer named and contact address published (`privacy@ownersmarket.ca` is on the site; name the person)
- [x] Ownership documents are no longer collected *(built)*: migration `20261016_remove_ownership_verification.sql`
- [ ] Delete the `private_verification_docs` bucket in Supabase Storage (after that migration is run)
- [ ] Lawyer review of Terms v1.1 section 3 (no ownership verification, seller representation & indemnity)
- [x] ~~Buyer cash-back policy~~ — removed (Nov 2026); `/cashback` redirects to the Terms

## 6. Known gaps (the site works without these, but plan for them)
- [x] **Email notifications** *(built)*: `send-notification-emails` edge function + migration `20261023_email_notifications.sql` email unread notifications after 2 minutes. Still to do: add the `RESEND_API_KEY` secret, deploy the function with Verify JWT off, and check the pg_cron job runs
- [x] ~~Buyer inbox~~ — done: everyone has one dashboard with their homes, messages and viewings
- [x] **Re-review on edits** *(built)*: edits to a live listing's words, address or photos wait for admin review while the live version stays up (`20261031_pending_listing_edits.sql`, `20261032_review_hardening.sql`)
- [x] **Shareable link previews / SEO** *(built)*: Netlify edge functions (`link-previews`, `sitemap`) and build-time prerendering give each listing and page its own title and preview image
- [x] **Security policy header (CSP)** *(built)*: a specific policy is set in `netlify.toml`. Add any new outside service to it before turning that service on
- [x] **Notification preferences** *(built)*: saved on the person's profile, not just the device
- [ ] View counter can be inflated by repeat visitors: it counts once per browser tab session, with no per-visitor limit on the server; add one if the numbers matter

## Legal copy
- [x] Supabase data region filled in: United States (US West)
- [ ] Lawyer sign-off on Terms v1.1 and Privacy Policy v1.1 (BC PIPA)
- [x] Email & CASL Preferences tab matches what is sent: account emails (can be turned off) and opt-in product news; the weekly digest was dropped
- [x] Cloudflare Turnstile and Google Analytics are described in the Privacy Policy. Add any new service there before turning it on
