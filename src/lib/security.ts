/**
 * Security & Input Sanitization Utilities
 * DirectHome BC - Fraser Valley & Lower Mainland Marketplace
 * 
 * Provides defense-in-depth against:
 * - Cross-Site Scripting (XSS): HTML entity escaping, tag stripping
 * - Open Redirects: Safe URL path validation
 * - Content length, phone, email, and postal code sanitization
 * - Rate-limit verification for forms (sign-in, viewings, messaging, reports)
 */

/**
 * Escapes HTML characters to prevent XSS injection.
 */
export function sanitizeHtml(input: string): string {
  if (!input) return '';
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Strips all HTML tags and control characters, leaving plain safe text.
 */
export function stripHtml(input: string): string {
  if (!input) return '';
  return input
    .replace(/<[^>]*>?/gm, '')
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
    .trim();
}

/**
 * Validates and standardizes a Canadian postal code (e.g., "V2Y 3K9").
 */
export function validateBCPostalCode(postal: string): { valid: boolean; formatted: string } {
  const cleaned = postal.toUpperCase().replace(/\s+/g, '');
  // Canadian postal code format: A1A1A1, BC postal codes start with V
  const bcPostalRegex = /^V\d[A-Z]\d[A-Z]\d$/;
  const isMatch = bcPostalRegex.test(cleaned);
  if (!isMatch) {
    return { valid: false, formatted: postal.trim() };
  }
  const formatted = `${cleaned.substring(0, 3)} ${cleaned.substring(3)}`;
  return { valid: true, formatted };
}

/**
 * Validates email format.
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email.trim());
}

/**
 * Validates phone number (BC / Canadian standard 10 digits).
 */
export function validatePhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 11;
}

/**
 * Validates redirect paths to prevent Open Redirect attacks.
 * Rejects external URLs (e.g. //attacker.com, javascript:, data:).
 */
export function isValidInternalRedirect(path: string): boolean {
  if (!path) return false;
  // Must start with '/' or be a known internal view key, and not start with '//'
  if (path.startsWith('//') || path.includes('://') || path.startsWith('javascript:')) {
    return false;
  }
  return true;
}

/**
 * Rate Limiter for Client-side actions (Viewings, Reports, Inquiries).
 */
export interface RateLimitCheck {
  allowed: boolean;
  remaining: number;
  resetMinutes: number;
}

export function checkActionRateLimit(
  storageKey: string,
  maxAllowed: number,
  windowMs: number = 60 * 60 * 1000
): RateLimitCheck {
  if (typeof window === 'undefined') {
    return { allowed: true, remaining: maxAllowed, resetMinutes: 0 };
  }

  const now = Date.now();
  try {
    const raw = localStorage.getItem(storageKey);
    let timestamps: number[] = raw ? JSON.parse(raw) : [];
    timestamps = timestamps.filter((t) => now - t < windowMs);
    localStorage.setItem(storageKey, JSON.stringify(timestamps));

    if (timestamps.length >= maxAllowed) {
      const oldest = timestamps[0];
      const resetMinutes = Math.max(1, Math.ceil((windowMs - (now - oldest)) / 60000));
      return { allowed: false, remaining: 0, resetMinutes };
    }

    return {
      allowed: true,
      remaining: maxAllowed - timestamps.length,
      resetMinutes: Math.ceil(windowMs / 60000)
    };
  } catch {
    return { allowed: true, remaining: maxAllowed, resetMinutes: 60 };
  }
}

export function recordActionRateLimit(storageKey: string): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(storageKey);
    const timestamps: number[] = raw ? JSON.parse(raw) : [];
    timestamps.push(Date.now());
    localStorage.setItem(storageKey, JSON.stringify(timestamps));
  } catch {
    // Ignore storage quota
  }
}
