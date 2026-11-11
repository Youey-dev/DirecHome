import React, { useState } from 'react';
import { CalendarDays, Loader2, Plus, Users } from 'lucide-react';
import type { Listing, OpenHouse } from '../types/listing';
import { db } from '../lib/db';
import { isoToLocal, localToIso, longDay, timeRange, upcomingOpenHouses } from '../lib/listingNews';

const tomorrow = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toLocaleDateString('en-CA');
};

/**
 * Dashboard, on an approved listing: add, change or cancel open houses (up to 3), and see who's coming.
 */
export const OpenHouseManager: React.FC<{ listing: Listing; onToast: (m: string) => void }> = ({ listing, onToast }) => {
  const upcoming = upcomingOpenHouses(listing);
  const [editing, setEditing] = useState<OpenHouse | 'new' | null>(null);
  const [date, setDate] = useState(tomorrow());
  const [start, setStart] = useState('14:00');
  const [end, setEnd] = useState('16:00');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guests, setGuests] = useState<{ id: string; list: { name: string; email: string }[] } | null>(null);

  const open = (o: OpenHouse | 'new') => {
    setError(null);
    if (o === 'new') {
      setDate(tomorrow());
      setStart('14:00');
      setEnd('16:00');
      setNote('');
    } else {
      const a = isoToLocal(o.startsAt, listing.province);
      const b = isoToLocal(o.endsAt, listing.province);
      setDate(a.date);
      setStart(a.time);
      setEnd(b.time);
      setNote(o.note ?? '');
    }
    setEditing(o);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (end <= start) return setError('The end time must be after the start time.');
    setBusy(true);
    setError(null);
    try {
      const startsAt = localToIso(date, start, listing.province);
      const endsAt = localToIso(date, end, listing.province);
      if (editing === 'new') await db.addOpenHouse(listing.id, startsAt, endsAt, note);
      else if (editing) await db.updateOpenHouse(editing.id, startsAt, endsAt, note);
      onToast(editing === 'new' ? 'Open house added. It shows on your listing now.' : 'Open house updated. Anyone coming has been told.');
      setEditing(null);
    } catch (err: any) {
      setError(err?.message || 'Could not save the open house.');
    } finally {
      setBusy(false);
    }
  };

  const cancel = async (o: OpenHouse) => {
    if (!window.confirm(`Cancel the open house on ${longDay(o.startsAt, listing.province)}? Anyone coming will be told.`)) return;
    try {
      await db.cancelOpenHouse(o.id);
      onToast('Open house cancelled. Anyone coming has been told.');
    } catch (err: any) {
      onToast(`⚠️ ${err?.message || 'Could not cancel it.'}`);
    }
  };

  const showGuests = async (o: OpenHouse) => {
    if (guests?.id === o.id) return setGuests(null);
    try {
      setGuests({ id: o.id, list: await db.openHouseGuests(o.id) });
    } catch (err: any) {
      onToast(`⚠️ ${err?.message || 'Could not load who’s coming.'}`);
    }
  };

  const input = 'w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700';

  return (
    <div className="px-5 py-3 border-t border-slate-100 bg-white text-xs space-y-2">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="font-semibold text-slate-900 flex items-center gap-1.5">
          <CalendarDays className="w-4 h-4 text-emerald-700" /> Open houses
        </div>
        {!editing && upcoming.length < 3 && (
          <button
            onClick={() => open('new')}
            className="px-3 py-1.5 rounded-lg border border-emerald-700 text-emerald-800 font-semibold flex items-center gap-1 cursor-pointer min-h-[36px] hover:bg-emerald-50"
          >
            <Plus className="w-3.5 h-3.5" /> Add an open house
          </button>
        )}
      </div>

      {upcoming.length === 0 && !editing && (
        <p className="text-slate-600">Pick a day and time. Buyers tap “I’ll come” and get your address and a reminder.</p>
      )}

      {upcoming.map((o) => (
        <div key={o.id} className="rounded-lg border border-slate-200 p-2.5">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex-1 min-w-[10rem]">
              <div className="font-semibold text-slate-900 text-sm">
                {longDay(o.startsAt, listing.province)} · {timeRange(o, listing.province)}
              </div>
              <button onClick={() => void showGuests(o)} className="text-emerald-800 font-semibold flex items-center gap-1 cursor-pointer">
                <Users className="w-3.5 h-3.5" /> {o.goingCount} coming{o.goingCount > 0 ? (guests?.id === o.id ? ' · hide' : ' · see who') : ''}
              </button>
            </div>
            <button onClick={() => open(o)} className="underline text-slate-600 cursor-pointer min-h-[32px]">Edit</button>
            <button onClick={() => void cancel(o)} className="underline text-rose-700 cursor-pointer min-h-[32px]">Cancel</button>
          </div>
          {guests?.id === o.id && (
            <ul className="mt-2 space-y-0.5 text-slate-700">
              {guests.list.length === 0 && <li>Nobody yet.</li>}
              {guests.list.map((g, i) => (
                <li key={i}>
                  {g.name || 'A buyer'} · <a href={`mailto:${g.email}`} className="underline">{g.email}</a>
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}

      {editing && (
        <form onSubmit={save} className="rounded-xl border border-slate-200 p-3 space-y-2 bg-slate-50">
          <div className="grid grid-cols-3 gap-2">
            <label className="block">
              <span className="block font-semibold text-slate-800 mb-1">Date</span>
              <input type="date" required min={new Date().toLocaleDateString('en-CA')} value={date} onChange={(e) => setDate(e.target.value)} className={input} />
            </label>
            <label className="block">
              <span className="block font-semibold text-slate-800 mb-1">Starts</span>
              <input type="time" required step={900} value={start} onChange={(e) => setStart(e.target.value)} className={input} />
            </label>
            <label className="block">
              <span className="block font-semibold text-slate-800 mb-1">Ends</span>
              <input type="time" required step={900} value={end} onChange={(e) => setEnd(e.target.value)} className={input} />
            </label>
          </div>
          <label className="block">
            <span className="block font-semibold text-slate-800 mb-1">Note for visitors (optional)</span>
            <input value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Street parking on Maple Ave. Shoes off, please." className={input} />
          </label>
          <p className="text-slate-600">
            {listing.showAddress
              ? 'It shows on your listing right away, and is removed once it’s over.'
              : 'It shows on your listing right away. People who tap “I’ll come” get your address in their confirmation and reminder.'}
          </p>
          {error && <p className="text-rose-700" role="alert">{error}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setEditing(null)} disabled={busy} className="px-3 py-2 font-semibold text-slate-700 cursor-pointer">
              Cancel
            </button>
            <button type="submit" disabled={busy} className="px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold flex items-center gap-1.5 cursor-pointer min-h-[40px] disabled:opacity-70">
              {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {editing === 'new' ? 'Add open house' : 'Save changes'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
