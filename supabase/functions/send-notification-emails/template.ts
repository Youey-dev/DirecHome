// The notification email: one simple branded layout for every type. No imports, so the
// website's test suite can check it (tests/email.test.ts).

export interface NotificationRow {
  id: string;
  type: string;
  title: string;
  body: string | null;
  listing_id: string | null;
  conversation_id: string | null;
  created_at: string;
}

interface Action {
  path: string;
  button: string;
  note?: string;
}

const SAFETY =
  "OwnersMarket never asks for payments, deposits or banking details by message. If someone does, don't send money and report the listing.";

export function actionFor(type: string): Action {
  switch (type) {
    case "new_message":
      return {
        path: "/dashboard?tab=messages",
        button: "Read and reply",
        note: `Please reply on OwnersMarket. Replying to this email doesn't reach them. ${SAFETY}`,
      };
    case "viewing_requested":
      return { path: "/dashboard?tab=viewings", button: "See the request", note: "Accept, decline or suggest another time from your dashboard." };
    case "viewing_confirmed":
    case "viewing_declined":
    case "viewing_cancelled":
    case "viewing_rescheduled":
      return { path: "/dashboard?tab=viewings", button: "See your viewings" };
    case "listing_live":
    case "listing_rejected":
    case "listing_rereview":
    case "listing_paused_admin":
      return { path: "/dashboard?tab=listings", button: "Open your listings" };
    case "listing_deleted_admin":
      return { path: "/dashboard?tab=listings", button: "Open your dashboard", note: "Questions? Reply to this email." };
    case "listing_in_review":
    case "new_report":
      return { path: "/admin", button: "Open the admin console" };
    default:
      return { path: "/dashboard", button: "Open OwnersMarket" };
  }
}

export const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

/** Strips anything tag-like and control characters from database text before it goes in an email. */
const clean = (s: string | null | undefined) =>
  (s ?? "").replace(/<[^>]*>?/g, "").replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, " ").trim();

export function buildEmail(
  n: NotificationRow,
  opts: { site: string; firstName?: string; address?: string },
): { subject: string; html: string; text: string } {
  const action = actionFor(n.type);
  const link = `${opts.site}${action.path}`;
  const prefs = `${opts.site}/notifications`;
  const title = clean(n.title).slice(0, 150) || "You have an update on OwnersMarket";
  const body = clean(n.body).slice(0, 600);
  const hello = opts.firstName ? `Hi ${opts.firstName},` : "Hi,";
  const address = clean(opts.address);

  const text = [
    hello,
    "",
    title,
    body,
    "",
    `${action.button}: ${link}`,
    ...(action.note ? ["", action.note] : []),
    "",
    "—",
    "OwnersMarket · For sale by owner across Canada",
    "You're getting this because you have an OwnersMarket account and this is about your account, listing, messages or viewings.",
    `Turn these emails off: ${prefs}`,
    ...(address ? [address] : []),
  ].join("\n");

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title></head>
<body style="margin:0;padding:0;background:#EEF2EF;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#16261D;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#EEF2EF;padding:24px 12px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:10px;border:1px solid #DCE8DF;">
<tr><td style="padding:22px 28px;border-bottom:4px solid #0F5A40;">
<span style="font-size:22px;font-weight:800;letter-spacing:-0.3px;color:#0F5A40;">OwnersMarket</span>
</td></tr>
<tr><td style="padding:28px;">
<p style="margin:0 0 16px;font-size:16px;line-height:1.5;">${escapeHtml(hello)}</p>
<h1 style="margin:0 0 12px;font-size:21px;line-height:1.3;color:#16261D;">${escapeHtml(title)}</h1>
${body ? `<p style="margin:0 0 24px;font-size:16px;line-height:1.55;color:#33443A;white-space:pre-line;">${escapeHtml(body)}</p>` : ""}
<table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="border-radius:6px;background:#0F5A40;">
<a href="${escapeHtml(link)}" style="display:inline-block;padding:13px 22px;font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;">${escapeHtml(action.button)}</a>
</td></tr></table>
${action.note ? `<p style="margin:22px 0 0;font-size:14px;line-height:1.5;color:#55665B;">${escapeHtml(action.note)}</p>` : ""}
</td></tr>
<tr><td style="padding:18px 28px;background:#F6F8F6;border-top:1px solid #DCE8DF;border-radius:0 0 10px 10px;font-size:12px;line-height:1.5;color:#6B7B70;">
OwnersMarket · For sale by owner across Canada<br>
You're getting this because you have an OwnersMarket account and this is about your account, listing, messages or viewings.
<a href="${escapeHtml(prefs)}" style="color:#0F5A40;">Turn these emails off</a>.
${address ? `<br>${escapeHtml(address)}` : ""}
</td></tr>
</table>
</td></tr></table>
</body></html>`;

  return { subject: title, html, text };
}
