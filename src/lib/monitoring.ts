/**
 * Error monitoring (Sentry), OFF unless VITE_SENTRY_DSN is set.
 *
 *  - The Sentry code is a separate download, fetched only when a DSN is configured,
 *    so the site is no heavier without it.
 *  - Errors only: no session replay, no performance tracing, no cookies.
 *  - Personal information is kept out: no user details, cookies, request bodies or query
 *    strings are collected (see dataCollection below), and every report is scrubbed of email addresses, phone numbers and the
 *    sign-in tokens Supabase puts in password-reset and email-confirmation links.
 *  - In the Sentry project, also turn on Settings -> Security & Privacy ->
 *    "Prevent Storing of IP Addresses", so Sentry's servers do not keep the sender's IP.
 *
 * A Sentry DSN is public by design (it only lets someone SEND errors to the project),
 * so it is safe as a VITE_ variable.
 */

const DSN = String(import.meta.env?.VITE_SENTRY_DSN ?? '').trim();
export const isMonitoringEnabled = /^https:\/\/[^@\s]+@[^/\s]+\/\d+$/.test(DSN);

// --- Scrubbing (pure, tested in tests/monitoring.test.ts) ------------------------------

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
// North American phone numbers, with or without separators / +1
const PHONE_RE = /(?:\+?1[\s.-]?)?\(?\b\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/g;
// Supabase auth links: #access_token=...&refresh_token=...  ?code=...  token_hash=...
const TOKEN_RE = /\b(access_token|refresh_token|provider_token|provider_refresh_token|token_hash|token|code)=([^&#\s"']+)/gi;
// Long JWT-looking strings anywhere else
const JWT_RE = /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g;

export function scrubText(s: string): string {
  return s
    .replace(TOKEN_RE, (_m, k: string) => `${k}=[removed]`)
    .replace(JWT_RE, '[removed]')
    .replace(EMAIL_RE, '[email]')
    .replace(PHONE_RE, '[phone]');
}

/** Returns a copy of any JSON-like value with every string scrubbed. */
export function scrubDeep<T>(value: T, depth = 0): T {
  if (depth > 12) return value;
  if (typeof value === 'string') return scrubText(value) as unknown as T;
  if (Array.isArray(value)) return value.map((v) => scrubDeep(v, depth + 1)) as unknown as T;
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) out[k] = scrubDeep(v, depth + 1);
    return out as T;
  }
  return value;
}

/** Errors that are noise, not bugs in the site (browser extensions, flaky networks...). */
export const IGNORED_ERRORS: (string | RegExp)[] = [
  'ResizeObserver loop limit exceeded',
  'ResizeObserver loop completed with undelivered notifications',
  /^Non-Error promise rejection captured/,
  /Failed to fetch$/,
  /^NetworkError when attempting to fetch resource/,
  /^Load failed$/,
  /^AbortError/,
];

// --- Loading -----------------------------------------------------------------------------

type SentryModule = typeof import('@sentry/react');
let sentry: SentryModule | null = null;
const pending: unknown[] = [];

/** Starts monitoring if configured. Safe to call more than once. */
export function initMonitoring(): void {
  if (!isMonitoringEnabled || sentry || typeof window === 'undefined') return;
  import('@sentry/react')
    .then((S) => {
      if (sentry) return;
      S.init({
        dsn: DSN,
        environment: String(import.meta.env?.VITE_SENTRY_ENVIRONMENT ?? '').trim() || (import.meta.env?.PROD ? 'production' : 'development'),
        release: String(import.meta.env?.VITE_SENTRY_RELEASE ?? '').trim() || undefined,
        // Keep personal data out: no user details, cookies, request bodies or query strings,
        // and only the browser-type header.
        dataCollection: {
          userInfo: false,
          cookies: false,
          httpHeaders: { allow: ['User-Agent'] },
          httpBodies: [],
          urlQueryParams: false,
        },
        tracesSampleRate: 0,
        ignoreErrors: IGNORED_ERRORS,
        // Errors thrown by browser extensions, not our code
        denyUrls: [/^chrome-extension:\/\//, /^moz-extension:\/\//, /^safari-(web-)?extension:\/\//],
        beforeSend: (event) => ({ ...scrubDeep(event), user: undefined }),
        beforeBreadcrumb: (crumb) => scrubDeep(crumb),
      });
      sentry = S;
      for (const e of pending.splice(0)) S.captureException(e);
    })
    .catch(() => {
      /* monitoring must never break the site */
    });
}

/** Reports an error (e.g. from an error boundary). Does nothing when monitoring is off. */
export function reportError(error: unknown, extra?: Record<string, unknown>): void {
  if (!isMonitoringEnabled) return;
  if (sentry) sentry.captureException(error, extra ? { extra: scrubDeep(extra) } : undefined);
  else if (pending.length < 20) pending.push(error);
}
