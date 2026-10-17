import { actionFor, buildEmail } from '../supabase/functions/send-notification-emails/template';

export function runEmailTests() {
  console.log('🧪 Testing notification emails...');
  const fail = (m: string) => { throw new Error(m); };
  const base = { id: '1', listing_id: null, conversation_id: null, created_at: '2026-10-17T00:00:00Z' };

  const msg = buildEmail(
    { ...base, type: 'new_message', title: 'New message from <b>Sam</b>', body: 'About "Rancher": is it <script>x</script> available?' },
    { site: 'https://ownersmarket.ca', firstName: 'Ana', address: '' }
  );
  if (msg.html.includes('<script>') || msg.html.includes('<b>Sam')) fail('Email HTML must not contain tags from user text');
  if (!msg.html.includes('https://ownersmarket.ca/dashboard?tab=messages')) fail('Message email should link to messages');
  if (!msg.text.includes('Turn these emails off: https://ownersmarket.ca/notifications')) fail('Every email needs the turn-off link');
  if (!msg.text.includes('never asks for payments')) fail('Message emails carry the scam warning');
  if (!msg.html.includes('Hi Ana,')) fail('Greets by first name');

  if (actionFor('listing_in_review').path !== '/admin') fail('Admin notices link to the admin console');
  if (actionFor('viewing_confirmed').path !== '/dashboard?tab=viewings') fail('Viewing notices link to viewings');
  if (actionFor('listing_paused_admin').path !== '/dashboard?tab=listings') fail('Listing notices link to listings');

  const withAddress = buildEmail({ ...base, type: 'listing_live', title: 'Your listing is live', body: '' }, { site: 'https://x.ca', address: 'PO Box 1, Mission BC' });
  if (!withAddress.text.includes('PO Box 1, Mission BC')) fail('Mailing address shows when set');
  console.log('✅ Notification emails: safe text, right links, turn-off link in every email\n');
}
