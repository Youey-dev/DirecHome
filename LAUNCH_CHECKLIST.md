# DirectHome BC — Launch Checklist

Last updated 2026-11-26. `[x]` = done, `[ ]` = still to do.

---

## 1. Database (Supabase)
- [x] Project created, initial schema run (`20261010_initial_schema.sql`)
- [x] Security hardening run (`20261011_security_hardening.sql`): admin roles come from the database, exact addresses are private, sellers cannot self-approve, server-side rate limits, storage buckets and rules
- [x] App support run (`20261012_app_support.sql`): records Terms acceptance, adds "delete my account"
- [x] Table permissions run (`20261013_table_permissions.sql`)
- [ ] One account type + notifications run (`20261014_one_account_and_notifications.sql`)
- [x] Email confirmation ON, password minimum 10+ characters
- [x] Admin account created (only one admin; check with `select email, role from public.users;`)
- [ ] Turn on 2-factor authentication on your own Supabase login
- [ ] Verify daily backups: Supabase → Database → Backups
- [ ] Custom email sender (SMTP) — Supabase's built-in email is heavily limited. Create a Resend account, verify your domain, then Supabase → Authentication → SMTP Settings

## 2. Hosting (Vercel) — needs your live site
- [ ] Import the GitHub repo into Vercel
- [ ] Add environment variables **VITE_SUPABASE_URL** and **VITE_SUPABASE_ANON_KEY** (anon/public key ONLY — never the service_role key)
- [ ] **Supabase → Authentication → URL Configuration:** set **Site URL** to your live address and add it (and your final domain) under **Redirect URLs**
- [ ] Register your domain, point DNS at Vercel, confirm HTTPS works
- [ ] Add a sitemap line to `public/robots.txt` once the domain is final

## 3. Before real users
- [ ] Run **docs/TESTING.md** start to finish
- [ ] Bot protection: Cloudflare Turnstile widget → `VITE_TURNSTILE_SITE_KEY` in Netlify (done, set 2026-10-15) → Supabase → Authentication → Attack Protection → enable CAPTCHA with the Turnstile **secret** key (confirm this is on; if the site key is set but CAPTCHA is off in Supabase, the widget shows but nothing is checked)
- [ ] Hosted map tiles (e.g. MapTiler): set `VITE_MAP_TILE_URL` (e.g. `https://api.maptiler.com/maps/streets-v2/256/{z}/{x}/{y}.png?key=YOUR_KEY`) and `VITE_MAP_ATTRIBUTION` (e.g. `&copy; MapTiler &copy; OpenStreetMap contributors`) in Netlify, then redeploy. In MapTiler, restrict the key to `ownersmarket.ca`. The code, security policy and privacy policy already handle it (the free OpenStreetMap servers are not intended for commercial traffic)
- [ ] Error monitoring: code is in (`src/lib/monitoring.ts`). Create a Sentry project (platform: React), set `VITE_SENTRY_DSN` in Netlify, redeploy. In Sentry → Settings → Security & Privacy, turn on "Prevent Storing of IP Addresses". The privacy policy lists Sentry automatically once the DSN is set
- [ ] Uptime monitor on the home page (e.g. UptimeRobot or Better Stack, free tier)
- [ ] Support email address on your domain, shown in the footer/legal pages

## 4. Legal & regulatory (BC Real Estate Services Act)
- [ ] BC real estate lawyer reviews Terms of Use, Privacy Policy, Listing Rules, Cash-Back Policy and the non-brokerage wording
- [ ] Confirm BCFSA guidance for for-sale-by-owner advertising portals, including how cash-back to buyers is described
- [ ] Business registration, business bank account
- [ ] Privacy officer named and contact address published (`privacy@…`)
- [ ] Ownership documents are no longer collected: run migration 007 and delete the `private_verification_docs` bucket in Supabase Storage
- [ ] Lawyer review of Terms v1.1 section 3 (no ownership verification, seller representation & indemnity)

## 5. Known gaps (the site works without these, but plan for them)
- [x] **Email notifications** — built (`send-notification-emails` edge function + Resend, every 2 minutes). Live: 34 emails sent, most recent 2026-11-24
- [x] ~~Buyer inbox~~ — done: everyone has one dashboard with their homes, messages and viewings
- [ ] **Re-review on edits** — editing a *live* listing (e.g. the address) does not send it back for review
- [ ] **Shareable link previews / SEO** — listing pages use the same title and preview image; needs server-side rendering or an edge function
- [ ] **Security policy header (CSP)** — currently a permissive policy in `index.html`; tighten once the final set of services is known
- [ ] **Notification preferences** — saved on the device only; no marketing email is sent today
- [ ] View counter can be inflated by repeat visitors; add per-visitor limits if the numbers matter

## Legal copy (Oct 2026, after lawyer discussion)
- [x] Supabase data region filled in: United States (US West)
- [ ] Lawyer sign-off on Terms v1.1, Privacy Policy v1.1 (BC PIPA), and the cash-back lender notice
- [ ] Email & CASL Preferences tab describes emails the site does not send yet (weekly digest, marketing) — trim or build before launch
- [ ] When Cloudflare Turnstile or any analytics is turned on, add it to the Privacy Policy first
