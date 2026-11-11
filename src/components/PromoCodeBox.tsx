import React, { useState } from 'react';
import { Loader2, Ticket } from 'lucide-react';
import { db, type PromoResult } from '../lib/db';
import { rememberedPromo } from '../lib/promo';

const longDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' });
const monthsLabel = (n: number) => `${n} ${n === 1 ? 'month' : 'months'}`;

/**
 * Dashboard, under "Activate listing": "Have a promo code?". The code is checked first and what
 * it gives is shown; then "Go live free" (no card) or "Continue to checkout" (card required).
 */
export const PromoCodeBox: React.FC<{
  listingId: string;
  onDone: (message: string) => void;
}> = ({ listingId, onDone }) => {
  // A code remembered from the homepage offer opens the box with it filled in
  const [code, setCode] = useState(() => rememberedPromo() ?? '');
  const [open, setOpen] = useState(() => !!code);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [found, setFound] = useState<PromoResult | null>(null);

  const check = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      setFound(await db.redeemPromo(listingId, code, false));
    } catch (err: any) {
      setError(err?.message || 'That promo code isn’t valid.');
    } finally {
      setBusy(false);
    }
  };

  const goLive = async () => {
    if (!found || busy) return;
    setBusy(true);
    setError(null);
    try {
      if (found.cardRequired) {
        await db.startCheckout(listingId, found.code); // goes to Stripe; the page is left behind
        return;
      }
      const r = await db.redeemPromo(listingId, found.code, true);
      onDone(`🎉 Your listing is live, free until ${longDate(r.freeUntil)}.`);
    } catch (err: any) {
      setError(err?.message || 'Something went wrong. Please try again.');
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-xs font-semibold text-emerald-800 underline underline-offset-2 cursor-pointer min-h-[32px]"
      >
        Have a promo code?
      </button>
    );
  }

  if (found) {
    return (
      <div className="w-full rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-950 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="font-bold">
            🎉 {found.code}: {monthsLabel(found.freeMonths)} free
          </div>
          {found.cardRequired ? (
            <div className="text-xs mt-0.5">
              {monthsLabel(found.freeMonths)} free, then $24.99 a month. You add a card at checkout, but you won’t be charged until{' '}
              <strong>{longDate(found.freeUntil)}</strong>. Cancel any time before then and you pay nothing.
            </div>
          ) : (
            <div className="text-xs mt-0.5">
              Your listing goes live now, free until <strong>{longDate(found.freeUntil)}</strong>. No card needed. We’ll remind you a
              week before it ends.
            </div>
          )}
          {error && <div className="text-xs text-rose-700 mt-1" role="alert">{error}</div>}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setFound(null); setError(null); }}
            disabled={busy}
            className="px-2 py-1.5 text-xs font-medium underline cursor-pointer min-h-[44px]"
          >
            Change code
          </button>
          <button
            onClick={() => void goLive()}
            disabled={busy}
            className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-80 text-white font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer min-h-[44px] text-xs"
          >
            {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />}
            {found.cardRequired ? (busy ? 'Opening secure checkout…' : 'Continue to checkout') : busy ? 'Going live…' : 'Go live free'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={check} className="w-full flex items-start gap-2 flex-wrap">
      <label className="flex-1 min-w-[12rem]">
        <span className="sr-only">Promo code</span>
        <span className="relative block">
          <Ticket className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
          <input
            autoFocus
            value={code}
            onChange={(e) => { setCode(e.target.value.toUpperCase()); setError(null); }}
            maxLength={30}
            placeholder="Promo code"
            autoCapitalize="characters"
            autoComplete="off"
            className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-slate-300 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-emerald-700"
          />
        </span>
        {error && <span className="block text-xs text-rose-700 mt-1" role="alert">{error}</span>}
      </label>
      <button
        type="submit"
        disabled={busy || !code.trim()}
        className="px-4 py-2.5 rounded-lg bg-white border border-emerald-700 text-emerald-800 font-semibold text-sm hover:bg-emerald-50 disabled:opacity-50 cursor-pointer min-h-[44px] flex items-center gap-1.5"
      >
        {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />}
        Apply
      </button>
    </form>
  );
};
