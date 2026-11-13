import React, { useState, useEffect } from 'react';
import { Cookie, X } from 'lucide-react';
import { analyticsAllowed, analyticsAvailable, onOpenCookieSettings, readConsent, saveConsent } from '../lib/analytics';

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
      className="fixed bottom-4 left-4 right-4 sm:left-6 sm:right-auto sm:max-w-md z-50 bg-white text-slate-900 border border-hairline rounded-2xl p-4 sm:p-5 shadow-xl animate-fade-in"
    >
      <div className="flex items-start gap-3">
        <div className="space-y-2 flex-1">
          <div className="flex items-center justify-between">
            <h2 className="text-[16px] font-semibold text-slate-900">
              {analyticsAvailable ? 'Cookies and privacy' : 'Essential storage only'}
            </h2>
            <button
              onClick={() => choose(analyticsAllowed())}
              className="text-slate-600 hover:text-slate-900 w-10 h-10 -m-2 flex items-center justify-center rounded-full"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {analyticsAvailable ? (
            <p className="text-[13px] text-slate-600 leading-relaxed">
              We use essential browser storage to keep you signed in and remember your listing draft. We also use Google Analytics to count visits and see which pages help people, so we can improve the site. We never use it for advertising or sell your personal data. You can turn analytics off here, or any time from "Cookie settings" at the bottom of the page.
            </p>
          ) : (
            <p className="text-[13px] text-slate-600 leading-relaxed">
              OwnersMarket uses only essential browser storage to keep you signed in and remember your listing draft and preferences. We do not use analytics or advertising trackers, and we never sell your personal data.
            </p>
          )}

          <div className="flex items-center gap-2 pt-1 flex-wrap">
            {analyticsAvailable ? (
              <>
                <button
                  onClick={() => choose(analyticsAllowed())}
                  className="px-4 bg-emerald-700 hover:bg-emerald-800 text-white text-[14px] font-semibold rounded-[10px] transition-colors cursor-pointer min-h-[44px]"
                >
                  {readConsent()?.analytics === false ? 'Keep analytics off' : 'OK'}
                </button>
                {analyticsAllowed() ? (
                  <button
                    onClick={() => choose(false)}
                    className="px-4 bg-white hover:bg-mist border-[1.5px] border-slate-900 text-slate-900 text-[14px] font-semibold rounded-[10px] transition-colors cursor-pointer min-h-[44px]"
                  >
                    Turn off analytics
                  </button>
                ) : (
                  <button
                    onClick={() => choose(true)}
                    className="px-4 bg-white hover:bg-mist border-[1.5px] border-slate-900 text-slate-900 text-[14px] font-semibold rounded-[10px] transition-colors cursor-pointer min-h-[44px]"
                  >
                    Turn analytics on
                  </button>
                )}
              </>
            ) : (
              <button
                onClick={() => choose(false)}
                className="px-4 bg-emerald-700 hover:bg-emerald-800 text-white text-[14px] font-semibold rounded-[10px] transition-colors cursor-pointer min-h-[44px]"
              >
                OK
              </button>
            )}

            <button
              onClick={() => onNavigateLegal('privacy')}
              className="text-[13px] text-slate-600 hover:text-emerald-700 underline transition-colors ml-1 min-h-[44px]"
            >
              Privacy policy
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};
