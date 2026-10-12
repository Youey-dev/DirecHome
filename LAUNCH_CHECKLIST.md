# DirectHome BC — Production Launch Checklist

This checklist tracks manual steps required for launch in British Columbia (domain, DNS, legal agreements, accounts, compliance).

---

## 1. Domain, DNS & Hosting
- [ ] **Domain Registration:**
  - Secure `directhome.ca` and `directhomebc.ca` via CIRA certified registrar.
- [ ] **DNS & SSL Configuration:**
  - Point A/CNAME records to Vercel/Cloudflare.
  - Enable Automatic HTTPS (Strict SSL) and HSTS.
- [ ] **Email Configuration (SPF, DKIM, DMARC):**
  - Add TXT records for SPF: `v=spf1 include:_spf.mx.cloudflare.net ~all`
  - Add DKIM public keys from transactional email provider (Resend or Postmark).
  - Add DMARC record: `v=DMARC1; p=quarantine; rua=mailto:dmarc@directhome.ca`.

---

## 2. Supabase Cloud Setup (Completed)
- [x] **Project Creation:** Connected to project `kpmadcjvwjnsnawtwjnn`.
- [x] **Database Schema & Enums:** Tables (`users`, `listings`, `listing_photos`, `verifications`, `conversations`, `messages`, `viewing_requests`, `favourites`, `reports`) created.
- [x] **Row Level Security (RLS):** Policies enabled and verified.
- [ ] **Storage Buckets Configuration:**
  - In Supabase Dashboard -> **Storage**:
    1. Create bucket: `public_listing_photos` (Public bucket = ON)
    2. Create bucket: `private_verification_docs` (Public bucket = OFF, restricted via signed URLs)

---

## 3. Legal & Regulatory (BC Real Estate Services Act)
- [ ] **Lawyer Review:**
  - Have independent BC real estate lawyer review the Terms of Use, Privacy Policy, and Non-Brokerage notices.
  - Confirm compliance with BC Financial Services Authority (BCFSA) guidance regarding for-sale-by-owner advertising portals.
- [ ] **Standard Contract Guidance:**
  - Reiterate that buyers and sellers must execute standard BC Contract of Purchase and Sale through an independent notary public or lawyer.

---

## 4. Privacy & PIPEDA
- [ ] **Privacy Officer:** Designate a company privacy officer contact address (`privacy@directhome.ca`).
- [ ] **Data Retention Policy:** Schedule automated deletion of rejected verification documents after 90 days.

---

## 5. Security & Monitoring
- [ ] **Error Monitoring:** Set up Sentry DSN in production environment variables.
- [ ] **Uptime & Health Checks:** Add health monitor targeting `/api/health` or root uptime ping.
- [ ] **Backups:** Verify daily automated Postgres backups in Supabase Dashboard -> Database -> Backups.
