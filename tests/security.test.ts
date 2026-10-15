import { stripHtml, sanitizeHtml, validateBCPostalCode, validateCanadianPostalCode, isValidInternalRedirect, validateEmail } from '../src/lib/security';
import { cityCentre, isInCanada } from '../src/data/cities';

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
  check(validateCanadianPostalCode('M5V 2T6', 'ON').valid === true, 'Canada postal code: Toronto code accepted for Ontario');
  check(validateCanadianPostalCode('b3h4r2', 'NS').formatted === 'B3H 4R2', 'Canada postal code: Halifax code accepted and formatted');
  check(validateCanadianPostalCode('H2X 1Y4', 'QC').valid === true, 'Canada postal code: Montreal code accepted for Quebec');
  check(validateCanadianPostalCode('M5V 2T6', 'BC').valid === false, 'Canada postal code: Ontario code rejected for BC');
  check(validateCanadianPostalCode('D1A 1A1').valid === false, 'Canada postal code: letters Canada Post never uses are rejected');
  check(validateCanadianPostalCode('W1A 1A1').valid === false, 'Canada postal code: W never starts a Canadian code');
  check(Math.abs(cityCentre('Ottawa', 'ON').lat - 45.42) < 0.1, 'Map fallback: known city centre found');
  check(Math.abs(cityCentre('Somewhere Small', 'MB').lat - 49.9) < 0.1, 'Map fallback: unknown city falls back to province');
  check(isInCanada(49.1, -122.6) && !isInCanada(40.7, -74.0), 'Map check: Langley is in Canada, New York is not');
  check(isValidInternalRedirect('/dashboard') === true, 'Redirects: internal path allowed');
  check(isValidInternalRedirect('https://evil.example') === false, 'Redirects: external URL blocked');
  check(isValidInternalRedirect('//evil.example') === false, 'Redirects: protocol-relative URL blocked');
  check(validateEmail('owner@example.ca') === true, 'Email: valid address accepted');
  check(validateEmail('not-an-email') === false, 'Email: invalid address rejected');

  console.log('🎉 Input-safety tests passed.\n');
}
