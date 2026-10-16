import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Trophy, X } from 'lucide-react';
import type { Listing } from '../types/listing';
import { formatCAD } from '../lib/commissionCalc';

/**
 * A clear, full-size confirmation before a listing is deleted, so sellers understand what
 * happens to their subscription. Replaces the small browser confirm box.
 *
 * What deleting does (supabase/functions/listing-action, action "delete"):
 *  - the listing comes off the site immediately
 *  - billing stops now; the rest of the month already paid is not refunded
 *  - photos, viewing requests and buyer conversations about it are deleted for good
 */
export const DeleteListingDialog: React.FC<{
  listing: Listing;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  onMarkSold: () => void;
}> = ({ listing, busy, onCancel, onConfirm, onMarkSold }) => {
  const paying = ['active', 'past_due'].includes(listing.paymentStatus ?? '');
  const [understood, setUnderstood] = useState(!paying);
  const keepRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    keepRef.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !busy && onCancel();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [busy, onCancel]);

  const cover = listing.photos.find((p) => p.isCover) ?? listing.photos[0];
  const place = listing.streetAddress ? `${listing.streetAddress}, ${listing.city}` : listing.city;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-listing-title"
      onClick={(e) => e.target === e.currentTarget && !busy && onCancel()}
    >
      <div className="w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-6">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-rose-100">
              <AlertTriangle className="h-6 w-6 text-rose-700" aria-hidden="true" />
            </span>
            <h2 id="delete-listing-title" className="text-2xl font-extrabold text-slate-900">
              Delete this listing?
            </h2>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            aria-label="Close"
            className="flex h-11 w-11 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 p-6">
          <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
            {cover && (
              <img src={cover.thumbnailUrl || cover.url} alt="" className="h-16 w-20 shrink-0 rounded-lg object-cover" />
            )}
            <div className="min-w-0">
              <div className="text-lg font-bold text-slate-900 tabular-nums">{formatCAD(listing.price)}</div>
              <div className="truncate text-sm text-slate-600">{place}</div>
            </div>
          </div>

          <div>
            <p className="text-base font-semibold text-slate-900">If you delete it:</p>
            <ul className="mt-2 space-y-2.5 text-base leading-relaxed text-slate-800">
              <li className="flex gap-3">
                <span aria-hidden="true" className="mt-2.5 h-2 w-2 shrink-0 rounded-full bg-rose-600" />
                <span>It comes off the site <b>right away</b>. Buyers can no longer see it.</span>
              </li>
              {paying && (
                <>
                  <li className="flex gap-3">
                    <span aria-hidden="true" className="mt-2.5 h-2 w-2 shrink-0 rounded-full bg-rose-600" />
                    <span>
                      Your <b>$24.99/month subscription stops today</b>. You won’t be charged again for this listing.
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <span aria-hidden="true" className="mt-2.5 h-2 w-2 shrink-0 rounded-full bg-rose-600" />
                    <span>
                      <b>The rest of this month is not refunded</b>, even if you’ve only just paid.
                    </span>
                  </li>
                </>
              )}
              <li className="flex gap-3">
                <span aria-hidden="true" className="mt-2.5 h-2 w-2 shrink-0 rounded-full bg-rose-600" />
                <span>
                  Its photos, viewing requests and conversations with buyers are <b>deleted for good</b>. This can’t be undone.
                </span>
              </li>
            </ul>
          </div>

          {listing.status !== 'sold' && (
            <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950">
              <Trophy className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" aria-hidden="true" />
              <div className="space-y-2">
                <p>
                  <b>Sold your home?</b> Choose <b>Mark sold</b> instead. It also comes off the site
                  {paying ? ', and your subscription ends at the close of the month you’ve paid for' : ''}, but you keep your messages and records.
                </p>
                <button
                  type="button"
                  onClick={onMarkSold}
                  disabled={busy}
                  className="min-h-[44px] rounded-lg border border-emerald-300 bg-white px-4 font-semibold text-emerald-900 hover:bg-emerald-100"
                >
                  Mark sold instead
                </button>
              </div>
            </div>
          )}

          {paying && (
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-300 p-4">
              <input
                type="checkbox"
                checked={understood}
                onChange={(e) => setUnderstood(e.target.checked)}
                className="mt-0.5 h-5 w-5 shrink-0 accent-rose-700"
              />
              <span className="text-sm font-medium text-slate-900">
                I understand my subscription stops today, the rest of this month isn’t refunded, and this can’t be undone.
              </span>
            </label>
          )}
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-slate-200 p-6 sm:flex-row sm:justify-end">
          <button
            ref={keepRef}
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="min-h-[48px] rounded-xl border border-slate-300 bg-white px-5 text-base font-semibold text-slate-900 hover:bg-slate-50"
          >
            Keep my listing
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!understood || busy}
            className="min-h-[48px] rounded-xl bg-rose-700 px-5 text-base font-bold text-white hover:bg-rose-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? 'Deleting…' : 'Delete listing'}
          </button>
        </div>
      </div>
    </div>
  );
};
