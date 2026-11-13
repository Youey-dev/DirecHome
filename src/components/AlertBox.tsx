import React, { useState } from 'react';
import { Bell, Check, Loader2 } from 'lucide-react';
import { db } from '../lib/db';
import { describeAlert, type AlertCriteria } from '../lib/alerts';

/**
 * Browse page: "Get new homes like these by email". Signed-in people save the search in one tap;
 * others are asked to sign in (free) first.
 */
export const AlertBox: React.FC<{
  criteria: AlertCriteria;
  signedIn: boolean;
  onSignIn: () => void;
}> = ({ criteria, signedIn, onSignIn }) => {
  const [busy, setBusy] = useState(false);
  const [savedFor, setSavedFor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const label = describeAlert(criteria);
  const saved = savedFor === label;

  const save = async () => {
    if (!signedIn) return onSignIn();
    setBusy(true);
    setError(null);
    try {
      await db.createAlert(criteria);
      setSavedFor(label);
    } catch (e: any) {
      setError(e?.message || 'Could not save the alert. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className={`rounded-2xl p-4 sm:px-5 flex items-center gap-4 flex-wrap ${saved ? 'bg-fern' : 'bg-mist'}`}
    >
      <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center flex-none">
        {saved ? <Check className="w-5 h-5 text-emerald-700" /> : <Bell className="w-5 h-5 text-emerald-800" />}
      </div>
      <div className="flex-1 min-w-[14rem]">
        <div className="font-semibold text-slate-900">
          {saved ? 'Alert saved' : 'Get new homes like these by email'}
        </div>
        <div className="text-sm text-slate-600">
          {saved ? (
            <>We’ll email you when new {label.charAt(0).toLowerCase() + label.slice(1)} go up. Stop it any time from your dashboard.</>
          ) : (
            <>{label}. Once a day at most, only when there’s something new. Stop any time.</>
          )}
        </div>
        {error && <div className="text-sm text-rose-700 mt-1" role="alert">{error}</div>}
      </div>
      {!saved && (
        <button
          onClick={() => void save()}
          disabled={busy}
          className="px-5 rounded-[11px] bg-white hover:bg-slate-50 border-[1.5px] border-slate-900 disabled:opacity-70 text-slate-900 text-[15px] font-semibold min-h-[44px] flex items-center gap-2 cursor-pointer"
        >
          {busy && <Loader2 className="w-4 h-4 animate-spin" />}
          {signedIn ? 'Email me' : 'Sign in to get alerts'}
        </button>
      )}
    </div>
  );
};
