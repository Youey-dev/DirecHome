# DirectHome BC — Before-launch test (about 40 minutes, no coding)

Run this on your live site **after** all five database scripts have been run in Supabase, in this order:
`20261010_initial_schema`, `20261011_security_hardening`, `20261012_app_support`,
`20261013_table_permissions`, `20261014_one_account_and_notifications`.

You need **three email addresses** you can open (Gmail "+" tricks work: `you+anna@gmail.com`, `you+ben@gmail.com`)
plus your admin account. Use a separate private/incognito window for each person so the sessions don't mix.
In this guide **Anna** owns a home and **Ben** is interested in buying it — but both are the same kind of account.

Tick each box. If anything fails, note what you clicked and send a screenshot (or the red text from the browser Console).

## A. Accounts (one account type for everyone)
- [ ] Sign up as **Anna**. There is **no** buyer/seller choice. You see "Check your email". Click the link, then sign in.
- [ ] Sign up as **Ben** the same way.
- [ ] Signing up again with the same email says the account already exists.
- [ ] Wrong password gives a friendly message. **Forgot password** emails a link that lets you choose a new one.
- [ ] Signed out, open `/dashboard` → asked to sign in. Open `/admin` while signed in as Ben → "Restricted area".
- [ ] In the header there is **no** "Demo account" switcher, and the menu says "Member account".

## B. Anna lists a home
- [ ] **List Your Home** opens the form (no switching or extra step). It starts **empty**.
- [ ] Fill in all 6 steps, add 2+ real photos, **Submit**. (No ownership document is asked for.)
- [ ] Dashboard → **My Homes** shows it as *In review*.
- [ ] Ben cannot see it in Browse yet.

## C. Admin approves
- [ ] The admin's **bell** shows a notification "New listing awaiting review".
- [ ] Click it → the Review queue opens. Check the listing against the checklist. Click **Approve**.
- [ ] Anna's bell shows "Your listing is live" (refresh if it takes more than ~30 seconds).
- [ ] (Optional) Reject a second test listing with a reason → Anna's bell shows "Your listing needs changes" with the reason.

## D. Messages
- [ ] Signed out, the listing page shows the neighbourhood and approximate map, **not** the street address. The map loads (no blank map).
- [ ] As **Ben**: open the listing → **Message Homeowner** → the window opens (no blank page) → send a message.
- [ ] **Anna sees a red number on the bell, on "My Dashboard" in the header, and on the Messages tab.** The browser tab title shows `(1)`.
- [ ] Anna clicks the notification → the dashboard opens on that conversation. Reply.
- [ ] **Ben's bell now shows Anna's reply.** Ben opens it → the conversation opens and the number clears.
- [ ] Ben sends 3 quick messages in a row → Anna sees ONE notification, not three.
- [ ] Anna opens her **own** listing page: she sees "This is your listing" instead of message/viewing buttons.

## E. Viewings
- [ ] Ben: **Request a Private Viewing** (pick a date).
- [ ] Anna's bell + dashboard show "New viewing request". **Dashboard → Viewings → Requests for your homes**.
- [ ] Anna **Confirms**. **Ben's bell shows "Your viewing was confirmed"**; Dashboard → Viewings → *Viewings you asked for* shows **Confirmed ✓** and the exact address now appears on the listing page.
- [ ] Ben requests a second viewing; Anna **Declines**. **Ben's bell shows "Your viewing request was declined"** and his list shows *Declined / cancelled*.
- [ ] Ben requests a third and **cancels it** from his dashboard. Anna's bell shows "Viewing request cancelled".
- [ ] A different account that has no confirmed viewing still cannot see the street address.

## F. Other
- [ ] Heart a listing as Ben → appears under **Saved**, stays after a refresh.
- [ ] **Report** a listing as Ben → the admin's bell shows "A listing was reported" and it's in the admin Reports list.
- [ ] **Privacy page → Download my data** works. **Delete my account** (throwaway account only) signs you out and the account is gone.
- [ ] Notifications are private: in Supabase → Table Editor → `notifications`, you see rows, but on the website each person only sees their own.
- [ ] In Supabase → Table Editor → `users`, only **your** account has role `admin`.

## What is NOT covered yet
Notifications appear on the site (bell, dashboard, pop-up banner, browser-tab count). People are **not emailed** yet when
something happens — that needs the email sender (Resend) set up first. See `LAUNCH_CHECKLIST.md`.
