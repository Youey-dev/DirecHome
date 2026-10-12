# DirectHome BC — Engineering & Product Architecture Decisions

This document details the product, UX, legal, and engineering decisions made during the implementation of the Canadian "sell your home yourself" marketplace MVP for the Fraser Valley & Lower Mainland, BC.

---

## 1. Regulatory & Brokerage Boundary (Real Estate Services Act BC)
- **Decision:** Explicitly and consistently state in the header, footer, wizard, and listing pages that **DirectHome BC is strictly an advertising marketplace, not a licensed real estate brokerage**.
- **Rationale:** Under the British Columbia *Real Estate Services Act* (RESA) and BC Financial Services Authority (BCFSA) guidelines, platforms that advertise homes for sale by owner must not offer negotiation services, pricing appraisals, agency representation, or hold client trust monies.
- **Implementation:**
  - Clear legal banner in the footer with independent notary/conveyancer notice.
  - Seller and buyer guidance recommending standard BC Contract of Purchase and Sale executed with independent legal counsel.
  - Transparent pricing and commission calculations labeled as educational estimates based on standard BC tiered formulas (7% on first $100k + 2.5% on balance + 5% GST), noting that commissions in Canada are freely negotiable.

---

## 2. Privacy & Safety: Approximate Location Until Viewing Confirmation
- **Decision:** On public search maps and listing detail pages, show only the general neighborhood and approximate radius (e.g. Willoughby Heights, Kitsilano, Sumas Prairie Foothills). Do not display the exact house or unit number publicly.
- **Rationale:** Homeowners hosting their own viewings need protection from drive-by looky-loos, unsolicited agent solicitation, and security risks. Once a verified buyer submits a viewing request and the homeowner clicks "Confirm Viewing", the exact street number is unlocked.

---

## 3. Mandatory Ownership Verification via Private Storage
- **Decision:** Require sellers to upload a proof-of-ownership document (e.g., annual BC Property Tax Notice, BC Assessment notice, or LTSA Land Title Search) before a listing transitions to `live`.
- **Rationale:** Fake listings and rental scam impersonators destroy marketplace trust.
- **Storage Strategy:**
  - Public home photos go to public storage (`public_listing_photos`).
  - Sensitive tax and title documents go to an encrypted `private_verification_docs` bucket.
  - RLS rules restrict access to only the listing owner and compliance officers.

---

## 4. In-Browser Photo Resizing & Thumbnails
- **Decision:** Use an HTML5 `<canvas>` processing pipeline in the browser before upload (`processAndResizeImage`):
  - Long side capped at 2,000px (high-resolution full screen display).
  - High-performance 400×300px (4:3) thumbnails generated client-side for rapid list view rendering.
  - Validation check to reject images smaller than 600px wide or corrupt/extreme ratios with friendly error messages.
- **Rationale:** Most BC sellers photograph their homes directly on mobile devices (smartphones produce 10–25MB raw HEIC/JPEG files). Resizing on-device saves cellular data, avoids Vercel serverless request body limits (4.5MB), and keeps page load times under 1 second.

---

## 5. Live Buyer Cash-Back & Commission Savings Formula
- **Decision:** Implement a live, interactive calculator comparing traditional 2-agent commissions in BC against listing directly on DirectHome.
- **Formula:**
  $$\text{Traditional BC Commission} = (\min(\text{Price}, 100\,000) \times 7\%) + (\max(0, \text{Price} - 100\,000) \times 2.5\%) + 5\%\text{ GST}$$
- **Cash-Back Model:**
  - The seller keeps the entire listing commission side ($0 platform listing fee).
  - The seller can elect to offer e.g. $10,000–$25,000 cash-back to the buyer.
  - The cash-back is credited directly on the **Statement of Adjustments** prepared by the conveyancing notary or lawyer at closing.

---

## 6. Effortless 7-Step Seller Wizard with Continuous Autosave
- **Decision:** One question group per screen with a thin progress bar, 44px+ tap targets, always-visible Back/Continue buttons, and automatic debounced autosave to `localStorage`.
- **Rationale:** Listing a home involves many fields. Step-by-step cognitive pacing ensures sellers finish in under 15 minutes without feeling overwhelmed. Autosave ensures sellers can leave and resume exactly where they left off.

---

## 7. Anti-Spam Rate-Limiting for Messaging
- **Decision:** Enforce a rate limit of maximum 5 new listing conversation starts per hour for buyer profiles.
- **Rationale:** Prevents bots and aggressive third-party cold-callers from spamming private homeowners, while leaving genuine buyers plenty of room to inquire about multiple homes.

---

## 8. MapLibre GL with OpenStreetMap Raster Tiles
- **Decision:** Use MapLibre GL powered by free OpenStreetMap raster tiles rather than proprietary paid APIs (Google Maps / Mapbox).
- **Rationale:** Enables fully interactive, customizable vector and raster cartography for Fraser Valley & Lower Mainland homes with zero recurring cost or API key friction for MVP deployment.

---

## 9. Explicit Out-of-Scope Boundaries & Future-Proofing Architecture
The following features are **explicitly excluded from this MVP** to keep the platform lean, legally compliant, and laser-focused on effortless UX:

1. **Payments & Subscriptions (Every Listing 100% Free for Launch):**
   - **Current State:** Zero paywalls, zero transaction fees, zero credit card prompts. Every seller publishes for free during the Fraser Valley launch.
   - **Future-Proof Data Structure:** The data model and PostgreSQL schema already include dedicated fields:
     - `subscriptionTier: 'free_launch' | 'standard_monthly' | 'featured_monthly'`
     - `monthlyFeeCAD: number` (defaults to `0`)
     - `billingCycle: 'free_launch' | 'monthly' | 'annual'`
     - `nextBillingAt: string | null`
     - `paymentStatus: 'complimentary_launch' | 'active' | 'past_due' | 'canceled'`
     This ensures a monthly SaaS listing fee can be activated in the future without database migrations or breaking changes.
2. **MLS / DDF / IDX Integration:**
   - No MLS syndication, CREA Data Distribution Facility (DDF) feeds, or board reciprocity widgets. DirectHome is a pure direct-to-consumer marketplace with verified land title records.
3. **Offer Negotiation & Contract Drafting Tools:**
   - DirectHome does NOT generate legal purchase agreements or negotiate terms. Parties use standard BC Contracts of Purchase and Sale and complete through independent BC Notaries Public or lawyers.
4. **Mortgage Tools:**
   - No mortgage affordability calculators, rate tables, or lead-generation funnels. DirectHome remains unbiased and unbundled.
5. **Reviews & Star Ratings:**
   - No agent reviews or subjective star scores. The platform relies on objective BC Land Title ownership verification.
6. **Native Mobile App Wrappers:**
   - Built as an ultra-responsive, fast mobile web app (touch ergonomics, 44px+ hitboxes, camera upload, viewport optimized) that runs directly in any browser without App Store friction.

---

## 10. Statutory Legal Guardrails & PIPEDA Compliance
To satisfy strict Canadian real estate advertising and privacy statutes:

1. **Mandatory Verbatim Legal Notice:**
   - Displayed permanently in both the site footer and listing detail purchase module:
     > *"This site is an advertising platform. We are not a real estate brokerage and do not provide real estate advice. Sellers and buyers should consult a lawyer or notary before signing any agreement."*
2. **Cash-Back Disclosure Standard:**
   - All cash-back amounts are explicitly marked as the seller's voluntary offer, not a platform guarantee, and must be formally incorporated as a clause in the standard BC Contract of Purchase and Sale to be executed by conveyancers on the Statement of Adjustments.
3. **Enforced Verification Gate:**
   - A listing cannot go live until its ownership verification document (Property Tax Notice or LTSA Title Search) has been reviewed and approved by compliance officers. Attempts by sellers to make unapproved listings live are strictly blocked.
4. **PIPEDA & BC PIPA Compliance:**
   - Dedicated **Terms of Use** and **Privacy Policy** views marked with `[PLACEHOLDER TEXT — PENDING FORMAL REVIEW BY BRITISH COLUMBIA LEGAL COUNSEL]`.
   - Adheres to minimal data collection (only essential viewing contact info and private encrypted title documents).
   - Includes an interactive **self-serve PIPEDA account and data deletion tool** enabling users to wipe their personal data, listings, and messages on demand.

---

## 11. Relational Data Model & Row Level Security (RLS) Specification

The system is implemented across 9 core entities matching production Supabase PostgreSQL tables (`supabase/migrations/20261010_initial_schema.sql`):

| Entity | Primary Key | Key Relationships & Foreign Keys | Core Purpose |
| :--- | :--- | :--- | :--- |
| **`users`** | `id` (UUID) | References `auth.users(id)` | User profiles with role enum (`buyer`, `seller`, `admin`). |
| **`listings`** | `id` (UUID) | Foreign key to `users(id)` | Property specifications, pricing, address, cash-back offer, and `listing_status` enum (`draft`, `in_review`, `live`, `paused`, `sold`, `rejected`). |
| **`listing_photos`** | `id` (UUID) | Foreign key to `listings(id)` ON DELETE CASCADE | High-resolution images and thumbnails with integer `sort_order` and `is_cover`. |
| **`verifications`** | `id` (UUID) | Foreign key to `listings(id)` ON DELETE CASCADE | Encrypted private storage paths (`private_verification_docs`) for BC Property Tax Notices and LTSA title searches. |
| **`conversations`** | `id` (UUID) | `buyer_id` and `seller_id` to `users(id)` | In-app messaging threads linked to listings with unique constraint per buyer/listing. |
| **`messages`** | `id` (UUID) | Foreign key to `conversations(id)` ON DELETE CASCADE | Message contents, timestamp, and read receipts. |
| **`viewing_requests`** | `id` (UUID) | `listing_id` and `buyer_id` | Appointment requests with preferred date, time slot, notes, and status enum. |
| **`favourites`** | `id` (UUID) | `user_id` and `listing_id` | User shortlists with unique composite constraint `(user_id, listing_id)`. |
| **`reports`** | `id` (UUID) | `listing_id` and `reporter_id` | Community listing moderation flags with reason enum and resolution tracking. |

### Row Level Security (RLS) Matrix
- **`listings`:**
  - **SELECT:** Buyers see **only `live` listings**. Sellers see `live` listings **plus their own drafts, in-review, and paused listings**. Admins see all listings.
  - **INSERT/UPDATE/DELETE:** Sellers can edit and delete **only their own listings** (`auth.uid() = user_id`).
- **`verifications`:**
  - **SELECT:** Strictly restricted to the listing owner (`auth.uid() = user_id`) and admins. **Never visible to buyers or unauthenticated users.**
  - **UPDATE:** Only admins can verify or reject documents.
- **`conversations` & `messages`:**
  - **SELECT/INSERT:** Restricted exclusively to the participating buyer and seller (`auth.uid() IN (buyer_id, seller_id)`) or admins.
- **`viewing_requests`:**
  - **SELECT:** Visible only to the requesting buyer, the owning seller, and admins.
  - **UPDATE:** Status can only be changed by the listing owner (confirm/decline) or requesting buyer.
- **`favourites`:**
  - **ALL:** Isolated to the owning user (`auth.uid() = user_id`).
- **`reports`:**
  - **INSERT:** Public/authenticated users.
  - **SELECT/UPDATE:** Restricted exclusively to compliance officers (`role = 'admin'`).

---

## 12. Security & Privacy Audit Verification (Phase 1 Deliverables)
- **Private Storage Bucket (`private_verification_docs`):** Configured with private read permissions. Tax notices and land title documents are accessible only to the listing owner and admin officers, never exposed to buyers or search engines.
- **In-Browser EXIF Stripping:** `processAndResizeImage` draws camera photos onto an HTML5 Canvas, generating fresh JPEG data URLs without GPS or device metadata, while keeping orientation and aspect ratio.
- **Input Sanitization & Injection Defense:** `sanitizeHtml` and `stripHtml` in `/src/lib/security.ts` sanitize text fields across wizard headlines, descriptions, buyer notes, and chat messages to block XSS attacks.
- **Bot Protection:** Cloudflare Turnstile verification widget (`TurnstileBadge`) is integrated across viewing appointment requests, listing submissions, and listing reporting modals.
- **Rate Limiting:** Maximum 5 reports/hour, 6 viewing requests/hour, and 5 conversation inquiries/hour enforced with localized sliding-window limiters.
- **Address Masking:** Civic street numbers and pin coordinates are locked to approximate neighborhood boundaries until the homeowner approves a viewing appointment.
- **PIPEDA Self-Serve Rights:** Full data export (`exportUserData` downloading a compliant JSON package) and self-serve permanent erasure (`deleteAccountData`) implemented in the Privacy Portal.

---

## 13. Legal & Regulatory Compliance Architecture (Phase 2 Deliverables)
- **Lawyer-Ready Legal Structure:** Dedicated pages for **Terms of Use & Advertising Agreement**, **Privacy Policy (PIPEDA)**, **Community and Listing Rules**, and **How Cash-Back Works**, all explicitly flagged with `[PENDING FORMAL REVIEW BY BRITISH COLUMBIA LEGAL COUNSEL]`.
- **Double Terms Acceptance & Version Audit:**
  - Terms acceptance is recorded on sign-up / persona activation and strictly required before submitting any listing in Step 7 of the Wizard.
  - Stored with immutable timestamp (`termsAcceptedAt`) and version tag (`2026-v1.0-draft`).
- **Approved Verbatim Non-Brokerage Notice:** Prominently maintained on the site footer, every listing detail page, and the savings simulator:
  > *"This site is an advertising platform. We are not a real estate brokerage and do not provide real estate advice. Sellers and buyers should consult a lawyer or notary before signing any agreement."*
- **Savings Calculator Caveat:** All calculations clearly state assumptions (standard BC 7%/2.5% + 5% GST formula) and state: *"Estimate only. Any cash-back represents the seller's voluntary offer, not a platform guarantee, and must be formally documented in the purchase contract to be applied on the Statement of Adjustments at completion."*
- **CASL Compliance (Canada’s Anti-Spam Legislation):**
  - Essential transactional alerts only (viewing approvals, incoming inquiries, title audit status).
  - Dedicated **Email Preferences & CASL Center** (`/notifications`) with explicit opt-in checkboxes for marketing / digest emails and instant unsubscribe controls.
- **Privacy & Cookie Consent Banner:** Non-intrusive banner (`CookieConsentBanner`) giving users explicit choice to accept privacy-friendly analytics or keep strictly essential storage.
