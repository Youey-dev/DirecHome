# DirectHome BC — Canadian Direct Home Marketplace (MVP)

> **Canada's peer-to-peer home marketplace for the Fraser Valley & Lower Mainland, BC.**
> Homeowners list their homes directly with zero listing commission. Buyers tour and purchase directly from the verified owner, receiving closing cash-back credits funded from the commission savings.

---

## 🌟 Key Features

1. **Photo-First Canadian Real Estate Marketplace:**
   - 4:3 cover photo cards with price, beds/baths/sqft, and green cash-back indicator.
   - Interactive split-screen MapLibre GL map (OpenStreetMap tiles by default; configure a hosted tile provider for launch).
   - Filter by Lower Mainland & Fraser Valley cities (Langley, Surrey, Abbotsford, Burnaby, Vancouver, etc.), price, beds, property types, and cash-back offers.
2. **Effortless 7-Step Seller Listing Wizard:**
   - One question group per screen with thin progress bar and always-visible Back/Continue buttons.
   - In-browser photo optimizer using HTML5 Canvas (resizes photos to max 2000px and generates 400px thumbnails).
   - Friendly quality check rejecting blurry/tiny images (< 600px).
   - Autosave of the text fields on the seller's device, so an unfinished listing can be resumed (new photos and documents upload on submit).
3. **Live BC Commission & Cash-Back Calculator:**
   - Interactive simulator comparing standard BC tiered commission (7% on first $100k + 2.5% on balance + 5% GST).
   - Demonstrates net seller cash kept vs. buyer closing cash-back credit.
4. **Trust & Private Ownership Verification:**
   - Sellers upload Property Tax notices or Land Title searches to a private Supabase storage bucket.
   - Admin compliance queue for reviewing title documents and approving listings.
   - Approximate neighborhood privacy radius until the homeowner approves a viewing.
5. **Direct In-App Messaging & Viewing Scheduler:**
   - Anti-spam rate limiting (max 5 new conversations/hour).
   - Direct appointment booking with preferred date and time slots.
6. **Regulatory Compliance (BC RESA):**
   - Advertising marketplace only; not a brokerage.

---

## 🛠️ Tech Stack

- **Framework:** React 19 + TypeScript + Vite (SPA)
- **Styling:** Tailwind CSS with custom design tokens (#0E7C66 brand, #F6F7F9 surface, #E7F6F1 savings tint)
- **Backend:** Supabase (Postgres with Row Level Security, Auth, Storage)
- **Maps:** MapLibre GL
- **Icons & Motion:** Lucide React & Motion
- **Deploy Target:** Vercel (or any static host)
- **Database / Backend Target:** Supabase (PostgreSQL, Auth, Storage, Row Level Security)

---

## 🚀 Getting Started

### 1. Clone & Install
```bash
git clone <repo-url>
cd directhome-bc
npm install
```

### 2. Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Configure your optional Supabase and Resend keys in `.env` if connecting to external backends.

### 3. Run Locally
```bash
npm run dev
```
Open your browser at `http://localhost:3000`.

### 4. Build for Production
```bash
npm run build
```

---

## ☁️ Deploying to Vercel

1. Push your repository to GitHub.
2. Go to [Vercel Dashboard](https://vercel.com) and click **Add New Project**.
3. Import this repository.
4. Framework Preset: **Vite** (or **Other**).
5. Build Command: `npm run build`
6. Output Directory: `dist`
7. Click **Deploy**.

---

## 🚫 Explicit Out-of-Scope Boundaries (MVP)

The following capabilities are deliberately excluded from this MVP:
- **Payments / Subscriptions:** Every listing is currently 100% free for the launch. The data model (`subscriptionTier`, `monthlyFeeCAD`, `billingCycle`, `paymentStatus`) is already structured so a monthly fee can be enabled later without database migrations.
- **MLS Integration:** No MLS syndication, DDF, or IDX feeds; strictly a verified direct-to-consumer marketplace.
- **Offers & Contract Tools:** No digital contract drafting or negotiation tools. Buyers and sellers execute standard BC Contracts of Purchase and Sale through their independent conveyancers.
- **Mortgage Tools:** No mortgage rate comparison, affordability calculators, or lender referrals.
- **Reviews & Ratings:** No subjective ratings or agent review widgets.
- **Native Apps:** Pure responsive mobile web with touch optimization, camera access, and 44px+ hitboxes.

---

## ⚖️ Legal Notice
DirectHome BC is an online advertising marketplace and does not operate as a licensed real estate brokerage. DirectHome never negotiates, advises, or represents either party. All property transfers complete through independent British Columbia Notaries Public or conveyancing lawyers.


---

## Running and launching

- **Database:** run the three files in `supabase/migrations/` in order (Supabase → SQL Editor).
- **Settings:** copy `.env.example` values into Vercel (never commit real keys).
- **Checks:** `npm install`, `npm run lint`, `npm test`, `npm run build`.
- **Before real users:** follow `docs/TESTING.md` and `LAUNCH_CHECKLIST.md`.
