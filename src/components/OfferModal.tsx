import React, { useState } from 'react';
import { Loader2, X } from 'lucide-react';
import type { Listing, OfferCondition, OfferFinancing } from '../types/listing';
import { db } from '../lib/db';
import { formatCAD } from '../lib/commissionCalc';
import { CONDITION_LABEL, FINANCING_LABEL, localToIso } from '../lib/listingNews';

const money = (s: string) => Number(s.replace(/[^\d.]/g, '')) || 0;
const plain = (n: number) => (n ? n.toLocaleString('en-CA') : '');
const inDays = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toLocaleDateString('en-CA');
};

/**
 * "Make an offer": tells the owner what a buyer would pay and on what terms. Not a contract:
 * if the owner accepts, a lawyer, notary or realtor writes the real one.
 */
export const OfferModal: React.FC<{ listing: Listing; isOpen: boolean; onClose: () => void; onSent: () => void }> = ({
  listing,
  isOpen,
  onClose,
  onSent,
}) => {
  const isCondo = /condo|townhouse/i.test(listing.propertyType);
  const [amount, setAmount] = useState(plain(listing.price));
  const [deposit, setDeposit] = useState('');
  const [possession, setPossession] = useState('');
  const [openDate, setOpenDate] = useState(inDays(3));
  const [conditions, setConditions] = useState<OfferCondition[]>(['financing', 'inspection']);
  const [financing, setFinancing] = useState<OfferFinancing>('pre_approved');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!isOpen) return null;

  const value = money(amount);
  const diff = value && listing.price ? (value - listing.price) / listing.price : 0;
  const options: OfferCondition[] = ['financing', 'inspection', ...(isCondo ? (['strata_documents'] as OfferCondition[]) : []), 'sale_of_home'];

  const toggle = (c: OfferCondition) =>
    setConditions((cur) => (cur.includes(c) ? cur.filter((x) => x !== c) : [...cur, c]));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!value) return setError('Enter the price you’d pay.');
    if (!openDate) return setError('Choose how long your offer stays open.');
    setBusy(true);
    setError(null);
    try {
      await db.makeOffer({
        listingId: listing.id,
        amount: value,
        deposit: money(deposit) || null,
        possessionDate: possession || null,
        openUntil: localToIso(openDate, '17:00', listing.province),
        conditions,
        financing,
        message,
      });
      onSent();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Your offer couldn’t be sent. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const input = 'w-full px-3 py-2.5 rounded-lg border border-slate-300 text-[15px] focus:outline-none focus:ring-2 focus:ring-emerald-700';
  const label = 'block text-xs font-semibold text-slate-800 mb-1';

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 flex items-end sm:items-center justify-center sm:p-4"
      onMouseDown={(e) => e.target === e.currentTarget && !busy && onClose()}
    >
      <form
        onSubmit={submit}
        role="dialog"
        aria-modal="true"
        aria-labelledby="offer-title"
        className="bg-white w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl p-5 sm:p-6 space-y-4 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="offer-title" className="text-xl font-bold text-slate-900">Make an offer</h2>
            <p className="text-sm text-slate-600">Asking {formatCAD(listing.price)} · {listing.headline}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="p-2 -m-2 text-slate-500 hover:text-slate-900 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className={label}>Your offer</span>
            <input required inputMode="numeric" value={amount} onChange={(e) => setAmount(plain(money(e.target.value)))} className={input} />
            {value > 0 && Math.abs(diff) >= 0.001 && (
              <span className="block text-xs text-slate-500 mt-1">
                {diff < 0 ? `${(diff * -100).toFixed(1)}% under asking` : `${(diff * 100).toFixed(1)}% over asking`}
              </span>
            )}
          </label>
          <label className="block">
            <span className={label}>Deposit (optional)</span>
            <input inputMode="numeric" value={deposit} onChange={(e) => setDeposit(plain(money(e.target.value)))} placeholder="e.g. 30,000" className={input} />
          </label>
          <label className="block">
            <span className={label}>Possession date (optional)</span>
            <input type="date" min={inDays(1)} value={possession} onChange={(e) => setPossession(e.target.value)} className={input} />
          </label>
          <label className="block">
            <span className={label}>Offer open until (5 pm)</span>
            <input type="date" required min={inDays(1)} max={inDays(30)} value={openDate} onChange={(e) => setOpenDate(e.target.value)} className={input} />
          </label>
        </div>

        <fieldset>
          <legend className={label}>Subject to</legend>
          <div className="flex flex-wrap gap-2">
            {options.map((c) => {
              const on = conditions.includes(c);
              return (
                <button
                  key={c}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggle(c)}
                  className={`px-3 py-2 rounded-full text-sm font-semibold border cursor-pointer min-h-[40px] ${
                    on ? 'border-emerald-700 bg-emerald-50 text-emerald-800' : 'border-slate-300 bg-white text-slate-800'
                  }`}
                >
                  {on ? '✓ ' : ''}
                  {CONDITION_LABEL[c]}
                </button>
              );
            })}
          </div>
          {conditions.length === 0 && <p className="text-xs text-slate-500 mt-1">No conditions (a “firm” offer).</p>}
        </fieldset>

        <label className="block">
          <span className={label}>Financing</span>
          <select value={financing} onChange={(e) => setFinancing(e.target.value as OfferFinancing)} className={`${input} bg-white`}>
            {(Object.keys(FINANCING_LABEL) as OfferFinancing[]).map((f) => (
              <option key={f} value={f}>
                {f === 'pre_approved' ? 'Pre-approved for a mortgage' : f === 'cash' ? 'Paying cash' : 'Not pre-approved yet'}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className={label}>Message to the owner (optional)</span>
          <textarea rows={3} maxLength={1000} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="A little about you, and anything flexible (dates, inclusions…)" className={input} />
        </label>

        <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-slate-800 leading-relaxed">
          This is <strong>not a binding offer or contract</strong>. It lets the owner know what you’d pay and on what terms, so they can
          accept, counter or decline. If you agree, you both sign a contract of purchase and sale prepared by a lawyer, notary or realtor.
          Never send a deposit through a message.
        </div>

        {error && <p className="text-sm text-rose-700" role="alert">{error}</p>}

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={busy} className="px-4 py-2.5 text-sm font-semibold text-slate-700 cursor-pointer">
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            className="px-5 py-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 disabled:opacity-70 text-white text-sm font-semibold min-h-[44px] flex items-center gap-1.5 cursor-pointer"
          >
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            Send to the owner
          </button>
        </div>
      </form>
    </div>
  );
};
