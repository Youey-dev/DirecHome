/**
 * Google Analytics 4, ON by default (notice and opt-out).
 *
 *  - Runs for every visitor unless they turn it off ("Turn off analytics" in the banner or
 *    "Cookie settings" in the footer), or their browser sends Global Privacy Control.
 *  - Turning it off stops it right away and removes the Google cookies.
 *  - The privacy policy describes this, including how to opt out.
 *  - Ad features are off (no Google signals, no ad personalisation).
 *  - The admin pages are never tracked. Only the page path is sent: no names, emails or
 *    search text. Event names/values must never contain personal information.
 */

// A Measurement ID is public (it appears in every page's network traffic), so it is safe in the code.
// VITE_GA_MEASUREMENT_ID can override it (e.g. a separate property for previews).
export const GA_ID = String(import.meta.env.VITE_GA_MEASUREMENT_ID ?? '').trim() || 'G-7KJQNZ591C';
const CONSENT_KEY = 'directhome_cookie_consent_v1';
const CHANGE_EVENT = 'om-consent-changed';
const OPEN_EVENT = 'om-open-cookie-settings';

type Gtag = (...args: unknown[]) => void;
declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: Gtag;
    [key: `ga-disable-${string}`]: boolean | undefined;
  }
}

export const analyticsAvailable = /^G-[A-Z0-9]{6,}$/.test(GA_ID);

export type Consent = { analytics: boolean; essential: true; timestamp: string } | null;

export function readConsent(): Consent {
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    return raw ? (JSON.parse(raw) as Consent) : null;
  } catch {
    return null;
  }
}

export function saveConsent(analytics: boolean): void {
  try {
    localStorage.setItem(CONSENT_KEY, JSON.stringify({ analytics, essential: true, timestamp: new Date().toISOString() }));
  } catch { /* storage blocked: the choice just lasts until the page closes */ }
  if (analytics) startAnalytics();
  else stopAnalytics();
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/** Lets the footer link re-open the banner. */
export const openCookieSettings = () => window.dispatchEvent(new Event(OPEN_EVENT));
export const onOpenCookieSettings = (fn: () => void) => {
  window.addEventListener(OPEN_EVENT, fn);
  return () => window.removeEventListener(OPEN_EVENT, fn);
};

let started = false;
let lastPath = '';

function startAnalytics(): void {
  if (!analyticsAvailable || started || typeof document === 'undefined') return;
  started = true;
  window[`ga-disable-${GA_ID}`] = false;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    // gtag.js requires the real `arguments` object, not an array
    // eslint-disable-next-line prefer-rest-params
    (window.dataLayer as unknown[]).push(arguments);
  };
  window.gtag('js', new Date());
  window.gtag('config', GA_ID, {
    send_page_view: false, // we send them ourselves because this site changes pages without reloading
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
  });
  const s = document.createElement('script');
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_ID)}`;
  document.head.appendChild(s);
  if (lastPath) sendPageView(lastPath);
}

function stopAnalytics(): void {
  if (!analyticsAvailable) return;
  window[`ga-disable-${GA_ID}`] = true;
  started = false;
  // Remove the Google cookies this site may have set (_ga and _ga_XXXX)
  const host = location.hostname;
  const domains = ['', host, `.${host}`, `.${host.split('.').slice(-2).join('.')}`];
  for (const c of document.cookie.split(';')) {
    const name = c.split('=')[0].trim();
    if (name === '_ga' || name.startsWith('_ga_') || name === '_gid') {
      for (const d of domains) {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/${d ? `; domain=${d}` : ''}`;
      }
    }
  }
}

/** True when the browser asks sites not to track (Global Privacy Control). We honour it as an opt-out. */
const browserOptsOut = (): boolean => {
  try {
    return (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true;
  } catch {
    return false;
  }
};

/** Analytics runs unless the visitor turned it off (or their browser opts out). */
export function analyticsAllowed(): boolean {
  const c = readConsent();
  if (c) return c.analytics;
  return !browserOptsOut();
}

/** Call once when the site opens. */
export function initAnalytics(): void {
  if (analyticsAllowed()) startAnalytics();
}

const NEVER_TRACK = /^\/(admin)(\/|$)/;

/** Call on every page change (path only, without the query string). */
export function trackPageView(path: string, title: string): void {
  lastPath = path;
  if (!analyticsAvailable || NEVER_TRACK.test(path)) return;
  if (!analyticsAllowed()) return;
  sendPageView(path, title);
}

function sendPageView(path: string, title = document.title): void {
  if (!window.gtag || NEVER_TRACK.test(path)) return;
  window.gtag('event', 'page_view', {
    page_path: path,
    page_location: `${location.origin}${path}`,
    page_title: title.replace(/^\(\d+\)\s*/, ''), // drop the unread-message count from the title
  });
}

/** Optional named events, e.g. trackEvent('start_listing'). Never pass personal details. */
export function trackEvent(name: string, params: Record<string, string | number | boolean> = {}): void {
  if (!analyticsAvailable || !window.gtag || !analyticsAllowed()) return;
  window.gtag('event', name, params);
}
