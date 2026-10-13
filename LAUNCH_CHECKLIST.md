# DirectHome BC — Launch Checklist

Last updated 2026-10-12. `[x]` = done, `[ ]` = still to do.

---

## 1. Database (Supabase)
- [x] Project created, initial schema run (`20261010_initial_schema.sql`)
- [x] Security hardening run (`20261011_security_hardening.sql`): admin roles come from the database, exact addresses are private, sellers cannot self-approve, server-side rate limits, storage buckets and rules
- [ ] App support run (`20261012_app_support.sql`): records Terms acceptance, adds "delete my account"
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
- [ ] Bot protection: Cloudflare Turnstile widget → add `VITE_TURNSTILE_SITE_KEY` in Vercel → Supabase → Authentication → Attack Protection → enable CAPTCHA (Turnstile secret)
- [ ] Hosted map tiles (e.g. MapTiler): set `VITE_MAP_TILE_URL` and `VITE_MAP_ATTRIBUTION` in Vercel (the free OpenStreetMap servers are not intended for commercial traffic)
- [ ] Error monitoring (Sentry) and an uptime monitor on the home page
- [ ] Support email address on your domain, shown in the footer/legal pages

## 4. Legal & regulatory (BC Real Estate Services Act)
- [ ] BC real estate lawyer reviews Terms of Use, Privacy Policy, Listing Rules, Cash-Back Policy and the non-brokerage wording
- [ ] Confirm BCFSA guidance for for-sale-by-owner advertising portals, including how cash-back to buyers is described
- [ ] Business registration, business bank account
- [ ] Privacy officer named and contact address published (`privacy@…`)
- [ ] Rejected-document retention: delete rejected ownership documents after 90 days (manual until automated)
- [ ] Consider whether you want a minimum seller age or ID check beyond the ownership document

## 5. Known gaps (the site works without these, but plan for them)
- [ ] **Email notifications** — homeowners are not emailed when a viewing request or message arrives; they see it in their dashboard. Build with a Supabase Edge Function + Resend
- [ ] **Buyer inbox** — buyers see messages and viewing status on each listing page, not in one place
- [ ] **Re-review on edits** — editing a *live* listing (e.g. the address) does not send it back for review
- [ ] **Shareable link previews / SEO** — listing pages use the same title and preview image; needs server-side rendering or an edge function
- [ ] **Security policy header (CSP)** — currently a permissive policy in `index.html`; tighten once the final set of services is known
- [ ] **Notification preferences** — saved on the device only; no marketing email is sent today
- [ ] View counter can be inflated by repeat visitors; add per-visitor limits if the numbers matter
