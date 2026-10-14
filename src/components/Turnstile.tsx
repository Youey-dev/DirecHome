/**
 * Cloudflare Turnstile bot check.
 *
 * Only shows when VITE_TURNSTILE_SITE_KEY is set. The token it produces is sent to
 * Supabase Auth, which verifies it with Cloudflare on the server
 * (Supabase Dashboard -> Authentication -> Attack Protection -> Enable CAPTCHA).
 */
import React, { useEffect, useRef } from 'react';

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, options: Record<string, unknown>) => string;
      remove: (id: string) => void;
    };
  }
}

export const TURNSTILE_SITE_KEY = String(import.meta.env.VITE_TURNSTILE_SITE_KEY ?? '').trim();
export const isTurnstileEnabled = TURNSTILE_SITE_KEY.length > 0;

let scriptPromise: Promise<void> | null = null;
const loadScript = (): Promise<void> => {
  if (window.turnstile) return Promise.resolve();
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => {
        scriptPromise = null;
        reject(new Error('Could not load the verification check.'));
      };
      document.head.appendChild(s);
    });
  }
  return scriptPromise;
};

interface TurnstileProps {
  onToken: (token: string | null) => void;
}

export const Turnstile: React.FC<TurnstileProps> = ({ onToken }) => {
  const ref = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const cb = useRef(onToken);
  cb.current = onToken;

  useEffect(() => {
    if (!isTurnstileEnabled) return;
    let cancelled = false;
    loadScript()
      .then(() => {
        if (cancelled || !ref.current || !window.turnstile) return;
        widgetId.current = window.turnstile.render(ref.current, {
          sitekey: TURNSTILE_SITE_KEY,
          callback: (t: string) => cb.current(t),
          'expired-callback': () => cb.current(null),
          'error-callback': () => cb.current(null),
        });
      })
      .catch(() => cb.current(null));
    return () => {
      cancelled = true;
      if (widgetId.current && window.turnstile) window.turnstile.remove(widgetId.current);
      widgetId.current = null;
    };
  }, []);

  if (!isTurnstileEnabled) return null;
  return <div ref={ref} className="flex justify-center my-2" />;
};
