import React, { useState } from 'react';
import { CalendarPlus, Check, Loader2 } from 'lucide-react';
import type { Listing, UserProfile } from '../types/listing';
import { db, isGuestUser } from '../lib/db';
import { longDay, openHouseIcs, timeRange, upcomingOpenHouses } from '../lib/listingNews';

/**
 * Listing page: the next open house, with "I'll come" and "Add to calendar".
 * Signed-in buyers get a confirmation and a reminder with the address.
 */
export const OpenHouseCard: React.FC<{
  listing: Listing;
  activeUser: UserProfile;
  isOwner: boolean;
  onSignIn: () => void;
}> = ({ listing, activeUser, isOwner, onSignIn }) => {
  const upcoming = upcomingOpenHouses(listing);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, force] = useState(0);
  if (!upcoming.length) return null;
  const [next, ...more] = upcoming;
  const going = db.isGoingTo(next.id);

  const toggle = async () => {
    if (isGuestUser(activeUser)) return onSignIn();
    setBusy(next.id);
    setError(null);
    try {
      await db.rsvpOpenHouse(next.id, !going);
      force((n) => n + 1);
    } catch (e: any) {
      setError(e?.message || 'Something went wrong. Please try again.');
    } finally {
      setBusy(null);
    }
  };

  const download = () => {
    const blob = new Blob([openHouseIcs(next, listing, window.location.origin)], { type: 'text/calendar' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'open-house.ics';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };

  return (
    <div className="rounded-xl bg-mist p-4 space-y-2">
      <div className="text-[15px] font-medium text-emerald-700">Open house</div>
      <div className="text-[22px] font-semibold tracking-[-0.02em] leading-tight text-slate-900">{longDay(next.startsAt, listing.province)}</div>
      <div className="text-base font-semibold text-slate-900">{timeRange(next, listing.province)}</div>
      {next.note && <p className="text-sm text-slate-700">{next.note}</p>}
      {!isOwner && (
        <p className="text-xs text-slate-600">
          {listing.showAddress ? 'Hosted by the owner.' : 'Hosted by the owner. Tap “I’ll come” and we’ll send you the address and a reminder.'}
        </p>
      )}
      <div className="flex flex-wrap gap-2 pt-1">
        {!isOwner && (
          <button
            onClick={() => void toggle()}
            disabled={busy !== null}
            aria-pressed={going}
            className={`px-4 py-2.5 rounded-md font-semibold text-sm min-h-[44px] flex items-center gap-1.5 cursor-pointer disabled:opacity-70 ${
              going ? 'bg-white text-emerald-800 border-[1.5px] border-emerald-700' : 'bg-emerald-700 hover:bg-emerald-800 text-white'
            }`}
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : going ? <Check className="w-4 h-4" /> : null}
            {going ? 'You’re going' : 'I’ll come'}
          </button>
        )}
        <button
          onClick={download}
          className="px-4 py-2.5 rounded-md font-semibold text-sm min-h-[44px] bg-white border border-slate-300 text-slate-900 hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer"
        >
          <CalendarPlus className="w-4 h-4" /> Add to calendar
        </button>
      </div>
      {going && !busy && (
        <button onClick={() => void toggle()} className="text-xs text-slate-600 underline cursor-pointer">
          Can’t make it any more
        </button>
      )}
      {error && <p className="text-xs text-rose-700" role="alert">{error}</p>}
      <p className="text-xs text-slate-600">
        {next.goingCount > 0 && `${next.goingCount} ${next.goingCount === 1 ? 'person plans' : 'people plan'} to come`}
        {next.goingCount > 0 && more.length > 0 && ' · '}
        {more.length > 0 && `also ${more.map((o) => `${longDay(o.startsAt, listing.province).split(',')[0]} ${timeRange(o, listing.province)}`).join(', ')}`}
      </p>
    </div>
  );
};
