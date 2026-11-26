import { scrubDeep, scrubText, isMonitoringEnabled } from '../src/lib/monitoring';

export function runMonitoringTests() {
  console.log('🧪 Testing error-report scrubbing...');
  const fail = (m: string) => { throw new Error(m); };
  if (isMonitoringEnabled) fail('Monitoring must be off when VITE_SENTRY_DSN is not set');

  const url = 'https://ownersmarket.ca/#access_token=eyJabc.def&expires_in=3600&refresh_token=r3fr3sh&type=recovery';
  const s = scrubText(url);
  if (s.includes('eyJabc') || s.includes('r3fr3sh')) fail(`Auth tokens must be removed, got ${s}`);
  if (!s.includes('expires_in=3600')) fail('Harmless parts of the address should stay');
  if (scrubText('/auth/confirm?token_hash=abc123&type=signup').includes('abc123')) fail('token_hash must be removed');
  if (scrubText('?code=9f8e7d').includes('9f8e7d')) fail('PKCE code must be removed');
  if (scrubText('error_code=otp_expired') !== 'error_code=otp_expired') fail('error_code is not a secret and should stay');

  const t = scrubText('Could not message jane.doe+fsbo@example.com or call (604) 555-0199 / +1 778-555-0123');
  if (t.includes('@example.com') || t.includes('555-0199') || t.includes('555-0123')) fail(`Emails and phones must be removed, got ${t}`);

  const jwt = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U';
  if (scrubText(jwt).includes('eyJhbGci')) fail('JWTs must be removed');

  const listing = '/listing/3f2b8c1e-9a4d-4e6b-8f1a-2c3d4e5f6a7b';
  if (scrubText(listing) !== listing) fail('Listing addresses must stay readable');

  const ev = scrubDeep({ message: 'x a@b.co', extra: { list: ['call 604-555-0199', 3, null] }, n: 1 });
  if (ev.message !== 'x [email]' || ev.extra.list[0] !== 'call [phone]' || ev.extra.list[1] !== 3 || ev.n !== 1) {
    fail(`Nested values must be scrubbed, got ${JSON.stringify(ev)}`);
  }
  console.log('✅ Error reports: tokens, emails and phone numbers are removed\n');
}
