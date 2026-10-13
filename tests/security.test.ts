import { stripHtml, sanitizeHtml, validateBCPostalCode, isValidInternalRedirect, validateEmail } from '../src/lib/security';

function check(condition: boolean, message: string) {
  if (!condition) throw new Error(`Security check failed: ${message}`);
  console.log(`  ✅ ${message}`);
}

/**
 * Browser-side input helpers only.
 * The real access rules (who can see or change what) live in the database and are checked
 * by following docs/TESTING.md against your Supabase project.
 */
export function runSecurityTests() {
  console.log('🧪 Testing input-safety helpers...');

  check(!stripHtml('<script>alert(1)</script>Hello').includes('<script'), 'XSS: script tags are stripped from text');
  check(!sanitizeHtml('<img src=x onerror=alert(1)>Nice home').includes('<'), 'XSS: HTML angle brackets are escaped, so injected tags cannot run');
  check(validateBCPostalCode('V2Y 3K9').valid === true, 'BC postal code: valid code accepted');
  check(validateBCPostalCode('M5V 2T6').valid === false, 'BC postal code: non-BC code rejected');
  check(validateBCPostalCode('hello').valid === false, 'BC postal code: nonsense rejected');
  check(isValidInternalRedirect('/dashboard') === true, 'Redirects: internal path allowed');
  check(isValidInternalRedirect('https://evil.example') === false, 'Redirects: external URL blocked');
  check(isValidInternalRedirect('//evil.example') === false, 'Redirects: protocol-relative URL blocked');
  check(validateEmail('owner@example.ca') === true, 'Email: valid address accepted');
  check(validateEmail('not-an-email') === false, 'Email: invalid address rejected');

  console.log('🎉 Input-safety tests passed.\n');
}
