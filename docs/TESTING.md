# DirectHome BC — Before-launch test (about 30 minutes, no coding)

Do this on your live (or Vercel preview) site **after** the three database scripts have been run in Supabase
(`20261010_initial_schema.sql`, `20261011_security_hardening.sql`, `20261012_app_support.sql`).

You need **three email addresses** you can open (Gmail "+" tricks work, e.g. `you+seller@gmail.com`,
`you+buyer@gmail.com`) and your admin account. Use a private/incognito window for each person so the
sessions don't mix.

Tick each box. If anything fails, write down what you clicked and what you saw (or a screenshot) and send it to Claude.

## A. Accounts
- [ ] **Sign up as a homeowner** (`you+seller@…`). You should see "Check your email". Open the email, click the link, then sign in.
- [ ] **Sign up as a buyer** (`you+buyer@…`). Same steps.
- [ ] Try signing up again with the same email → it says the account already exists.
- [ ] Sign in with a wrong password → a friendly "not correct" message.
- [ ] **Forgot password** → email arrives → link lets you choose a new password → you can sign in with it.
- [ ] Signed out, open `/dashboard` and `/admin` → you are asked to sign in / told it's restricted.
- [ ] Signed in as the buyer, open `/admin` → "Restricted area".

## B. Listing a home (as the homeowner)
- [ ] Click **List Your Home**. The form starts **empty** (no sample address, price or photos).
- [ ] Fill in all 7 steps with a test home. Add at least 2 real photos. Upload a real PDF or photo as the ownership document.
- [ ] Press **Submit** → "Your Listing is in Review".
- [ ] In **Dashboard** the listing shows as *In review*, with your photos.
- [ ] While signed in as the buyer (other window), the listing is **not** visible in Browse yet.
- [ ] Try **Edit** on the listing, change the price, submit again. You should NOT get a second copy of the listing.

## C. Approving (as admin)
- [ ] Sign in as admin → profile menu → **Verification queue**.
- [ ] Your test listing is there. Click **View document** → your uploaded file opens.
- [ ] Click **Approve**. The listing goes live.
- [ ] (Optional) Make a second test listing and **Reject** it with a reason. The homeowner sees the reason on the dashboard.

## D. Buyer experience
- [ ] Signed out: Browse shows the approved listing. The page shows the **neighbourhood and an approximate map area, NOT the street address**.
- [ ] Signed out, click **Message** or **Request viewing** → asked to sign in.
- [ ] As the buyer: **Message the homeowner** → message sent. (No automatic fake reply should appear.)
- [ ] As the homeowner: **Dashboard → Messages** shows the message. Reply. The buyer sees the reply (may take up to a minute, or refresh).
- [ ] As the buyer: **Request viewing**.
- [ ] As the homeowner: **Dashboard → Viewings** → **Confirm**.
- [ ] As the buyer: refresh the listing page → the **exact street address now appears**.
- [ ] Another buyer account that has NOT had a viewing confirmed still cannot see the street address.
- [ ] Save (heart) a listing as the buyer → it appears under **Saved** and stays after refreshing.
- [ ] **Report** the listing as the buyer → shows in the admin **Reports** list.

## E. Privacy tools (use a throwaway account)
- [ ] **Privacy page → Download my data** → a file downloads.
- [ ] **Privacy page → Delete my account** → you're signed out, and signing in again fails.
- [ ] In Supabase → Table Editor → `users`, the deleted person is gone.

## F. Things that must NOT work (security)
- [ ] There is no "Demo account" switcher anywhere in the header.
- [ ] A buyer cannot approve their own viewing request or a listing (there is no button for it).
- [ ] In Supabase → Table Editor → `users`, only **your** account has role `admin`.

When everything is ticked, you are ready for a small private beta with real homeowners.
