# OwnersMarket — Canadian For-Sale-By-Owner Home Marketplace

> **Homeowners across Canada (outside Quebec) list their homes directly, with no commission when the home sells.**
> Sellers pay a flat monthly listing fee. Buyers browse, message, book viewings and send offers directly to the owner.
> OwnersMarket is an advertising marketplace, not a real estate brokerage.

(The code and some older docs still use the working name "DirectHome BC".)

---

## 💳 Pricing

- **$24.99 CAD a month per listing**, billed through Stripe. No commission when the home sells.
- Creating a listing, adding photos and previewing it is free. The owner pays only when they activate a listing **after it has been approved**.
- Cancel any time from the dashboard; the listing stays up until the end of the paid month. A failed payment hides the listing after 1 day.
- Each listing has its own plan, so owners with several homes can cancel one without touching the others.
- Promo codes can be created by admins.
- Setup steps: [`STRIPE_SETUP.md`](STRIPE_SETUP.md).

---

## 🌟 Key Features

1. **Photo-first marketplace:**
   - Listing cards with cover photo, price, beds/baths/sqft.
   - Split-screen MapLibre GL map (OpenStreetMap tiles by default; set a hosted tile provider for launch).
   - Search by city, neighbourhood, postal code, price, beds and home type; saved searches send new-listing alerts.
   - Province pages, a "recently sold" section and seller/buyer guides (`src/content/articles/`).
2. **6-step seller listing wizard:**
   - Address and type → details and price → photos → description → buyers and agents → review and submit.
   - Photos resized in the browser (max 2000px, 400px thumbnails); blurry or tiny images (< 600px) rejected with a friendly message.
   - Text fields autosave on the seller's device.
3. **Seller tools:** open houses, price-drop alerts, an offers inbox, a step-by-step seller checklist, share buttons and free printable lawn/window signs.
4. **Commission savings calculator:** compares standard BC tiered commission (7% on first $100k + 2.5% on balance + 5% GST) with the flat monthly fee.
5. **Listing review & trust:**
   - Every listing gets an admin content review (spam, scams, inappropriate content) before the owner can activate it.
   - Edits to a live listing's words, address or photos are reviewed while the live version stays up.
   - Ownership is NOT verified; sellers declare they own the home or are authorized to sell it.
   - Approximate location only, unless the owner chooses to show the address.
6. **Messaging, viewings & notifications:**
   - In-app messaging with anti-spam rate limiting; admins can read conversations and remove rule-breaking messages.
   - Viewing requests with preferred date and time.
   - In-site notifications (bell, badges) plus email notifications through Resend; email preferences saved on the person's profile (CASL).
7. **Admin console:** overview, listings, review queue (new listings and edits), people, messages, reports, and promotions (promo codes and the homepage promo message).
8. **Link previews & SEO:** Netlify edge functions give each listing and page its own title and preview image, and serve the sitemap; pages are prerendered at build time.

---

## 🛠️ Tech Stack

- **Framework:** React 19 + TypeScript + Vite (SPA, prerendered at build)
- **Styling:** Tailwind CSS
- **Backend:** Supabase (Postgres with Row Level Security, Auth, Storage, Edge Functions, pg_cron)
- **Payments:** Stripe Checkout and Customer Portal (Supabase edge functions `create-checkout`, `create-portal`, `stripe-webhook`)
- **Email:** Resend (Supabase edge function `send-notification-emails`)
- **Maps:** MapLibre GL
- **Bot protection:** Cloudflare Turnstile (optional)
- **Analytics:** Google Analytics 4 (optional)
- **Error monitoring:** Sentry (optional, off until `VITE_SENTRY_DSN` is set)
- **Hosting:** Netlify (`netlify.toml`, edge functions in `netlify/edge-functions/`)

---

## 🚀 Getting Started

### 1. Clone & Install
```bash
git clone https://github.com/Youey-dev/DirecHome
cd DirecHome
npm install
```

### 2. Environment Variables
```bash
cp .env.example .env
```
Fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Optional: `VITE_TURNSTILE_SITE_KEY`, `VITE_MAP_TILE_URL`, `VITE_MAP_ATTRIBUTION`, `VITE_GA_MEASUREMENT_ID`, `VITE_SENTRY_DSN`.
Stripe and Resend keys are **not** website settings; they are Supabase Edge Function secrets (see `STRIPE_SETUP.md`).

### 3. Run Locally
```bash
npm run dev
```
Open `http://localhost:3000`.

### 4. Checks & Build
```bash
npm test
npm run lint
npm run build
```

---

## ☁️ Deploying to Netlify

Build settings live in `netlify.toml` (build command, `dist` folder, Node 22, redirects, security headers including the Content Security Policy, and the edge functions).

1. Netlify → **Add new site** → import this GitHub repository.
2. Add the `VITE_…` environment variables above (anon/public key only — never the service_role key).
3. Deploy, then point your domain at Netlify and confirm HTTPS.
4. In Supabase → Authentication → URL Configuration, set the Site URL and Redirect URLs to the live address.

If you add a new outside service (analytics, chat widget…), add its address to the Content Security Policy in `netlify.toml`.

---

## 🚫 Out of Scope

- **MLS Integration:** no MLS syndication, DDF or IDX feeds.
- **Contracts & negotiation:** offers sent through the site are non-binding. OwnersMarket does not draft purchase agreements or negotiate; parties use their own lawyer or notary.
- **Mortgage tools:** no rate comparison or lender referrals.
- **Reviews & Ratings:** none.
- **Native Apps:** responsive mobile web only.
- **Buyer cash-back:** removed in Nov 2026 (`/cashback` redirects to the Terms).

---

## ⚖️ Legal Notice
OwnersMarket is an online advertising marketplace and does not operate as a licensed real estate brokerage. It never negotiates, advises, or represents either party. Property transfers complete through independent notaries or real estate lawyers.

---

## Running and launching

- **Database:** run the files in `supabase/migrations/` in filename order (Supabase → SQL Editor). They are run by hand; `LAUNCH_CHECKLIST.md` tracks which are done.
- **Edge functions:** deploy each folder in `supabase/functions/`. Turn "Verify JWT" **off** for `stripe-webhook` and `send-notification-emails`, and leave it on for the rest (each file's header lists the secrets it needs).
- **Settings:** website values go in Netlify environment variables; secrets go in Supabase Edge Function secrets. Never commit real keys.
- **Pull request checks:** GitHub Actions runs `npm run lint`, `npm test` and `npm run build` on every PR (`.github/workflows/checks.yml`).
- **Before real users:** follow `docs/TESTING.md` and `LAUNCH_CHECKLIST.md`.
