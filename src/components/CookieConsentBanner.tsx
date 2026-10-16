import React, { useState, useEffect } from 'react';
import { Cookie, X } from 'lucide-react';
import { analyticsAvailable, onOpenCookieSettings, readConsent, saveConsent } from '../lib/analytics';

interface CookieConsentBannerProps {
  onNavigateLegal: (tab: string) => void;
}

export const CookieConsentBanner: React.FC<CookieConsentBannerProps> = ({ onNavigateLegal }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const unsub = onOpenCookieSettings(() => setIsVisible(true));
    if (!readConsent()) {
      // Show banner after brief delay
      const timer = setTimeout(() => setIsVisible(true), 1200);
      return () => { clearTimeout(timer); unsub(); };
    }
    return unsub;
  }, []);

  const choose = (analytics: boolean) => {
    saveConsent(analytics);
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <aside 
      aria-label="Cookie & Privacy Consent"
      className="fixed bottom-4 left-4 right-4 sm:left-6 sm:right-auto sm:max-w-md z-50 bg-slate-900/95 backdrop-blur-md text-white border border-slate-700/80 rounded-2xl p-4 sm:p-5 shadow-2xl animate-fade-in"
    >
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-emerald-950 text-emerald-400 border border-emerald-800/60 flex items-center justify-center shrink-0 mt-0.5">
          <Cookie className="w-5 h-5" />
        </div>

        <div className="space-y-2 flex-1">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-white tracking-tight">
              {analyticsAvailable ? 'Cookies and privacy' : 'Essential Storage Only'}
            </h4>
            <button
              onClick={() => choose(readConsent()?.analytics ?? false)}
              className="text-slate-400 hover:text-white p-1 rounded-lg"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {analyticsAvailable ? (
            <p className="text-xs text-slate-300 leading-relaxed">
              We use essential browser storage to keep you signed in and remember your listing draft. With your OK we also use Google Analytics to count visits and see which pages help people, so we can improve the site. It is off unless you accept, and we never use it for advertising or sell your personal data. You can change your mind any time from "Cookie settings" at the bottom of the page.
            </p>
          ) : (
            <p className="text-xs text-slate-300 leading-relaxed">
              OwnersMarket uses only essential browser storage to keep you signed in and remember your listing draft and preferences. We do not use analytics or advertising trackers, and we never sell your personal data.
            </p>
          )}

          <div className="flex items-center gap-2 pt-1 flex-wrap">
            {analyticsAvailable ? (
              <>
                <button
                  onClick={() => choose(true)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer min-h-[36px]"
                >
                  Accept analytics
                </button>
                <button
                  onClick={() => choose(false)}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 active:scale-95 text-white text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer min-h-[36px]"
                >
                  Essential only
                </button>
              </>
            ) : (
              <button
                onClick={() => choose(false)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer min-h-[36px]"
              >
                OK
              </button>
            )}

            <button
              onClick={() => onNavigateLegal('privacy')}
              className="text-xs text-slate-400 hover:text-emerald-400 underline transition-colors ml-1"
            >
              Privacy Policy
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};
