import React, { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import type { Offer } from '../types/listing';
import { db } from '../lib/db';
import { formatCAD } from '../lib/commissionCalc';
import { CONDITION_LABEL, FINANCING_LABEL } from '../lib/listingNews';

const day = (iso?: string) =>
  iso ? new Date(iso.length === 10 ? `${iso}T12:00:00` : iso).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' }) : '—';
const pct = (o: Offer) => {
  const d = (o.amount - o.listingPrice) / o.listingPrice;
  return `${d < 0 ? '−' : '+'}${Math.abs(d * 100).toFixed(1)}%`;
};
const isExpired = (o: Offer) => o.status === 'open' && new Date(o.openUntil).getTime() < Date.now();

const STATUS: Record<string, { label: string; cls: string }> = {
  open: { label: 'Waiting for a reply', cls: 'bg-amber-100 text-amber-900' },
  accepted: { label: 'Accepted', cls: 'bg-emerald-100 text-emerald-900' },
  countered: { label: 'Countered', cls: 'bg-sky-100 text-sky-900' },
  declined: { label: 'Declined', cls: 'bg-slate-200 text-slate-700' },
  withdrawn: { label: 'Withdrawn', cls: 'bg-slate-200 text-slate-700' },
  expired: { label: 'Expired', cls: 'bg-slate-200 text-slate-700' },
};
const statusOf = (o: Offer) => STATUS[isExpired(o) ? 'expired' : o.status];

/**
 * Dashboard → Offers. Sellers: every offer on each listing side by side, with accept / counter /
 * decline. Buyers: the offers they sent and the owner's answer. Nothing here is binding.
 */
export const OffersPanel: React.FC<{ onToast: (m: string) => void; onMessageBuyer: (listingId: string, buyerId: string) => void; onOpenListing: (id: string) => void }> = ({
  onToast,
  onMessageBuyer,
  onOpenListing,
}) => {
  const [offers, setOffers] = useState<Offer[] | null>(null);
  const [reply, setReply] = useState<{ offer: Offer; action: 'accept' | 'counter' | 'decline' } | null>(null);
  const [counter, setCounter] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setOffers(await db.loadOffers());
    } catch (e: any) {
      onToast(`⚠️ ${e?.message || 'Could not load offers.'}`);
      setOffers([]);
    }
  }, [onToast]);
  useEffect(() => {
    void load();
  }, [load]);

  const send = async () => {
    if (!reply) return;
    const amount = Number(counter.replace(/[^\d]/g, ''));
    if (reply.action === 'counter' && !amount) return onToast('⚠️ Enter the price you’d accept.');
    setBusy(true);
    try {
      await db.respondToOffer(reply.offer.id, reply.action, amount || undefined, note);
      onToast(
        reply.action === 'accept'
          ? 'Accepted. The buyer has been told. Message them to agree next steps, and have a lawyer or notary write the contract.'
          : reply.action === 'counter'
          ? 'Counter sent. The buyer can send a new offer.'
          : 'Declined. The buyer has been told.',
      );
      setReply(null);
      setNote('');
      setCounter('');
      await load();
    } catch (e: any) {
      onToast(`⚠️ ${e?.message || 'Could not send your reply.'}`);
    } finally {
      setBusy(false);
    }
  };

  const withdraw = async (o: Offer) => {
    if (!window.confirm(`Withdraw your ${formatCAD(o.amount)} offer?`)) return;
    try {
      await db.respondToOffer(o.id, 'withdraw');
      onToast('Offer withdrawn. The owner has been told.');
      await load();
    } catch (e: any) {
      onToast(`⚠️ ${e?.message || 'Could not withdraw it.'}`);
    }
  };

  if (offers === null) {
    return (
      <div className="py-10 text-center text-slate-500">
        <Loader2 className="w-5 h-5 animate-spin inline" />
      </div>
    );
  }

  const received = offers.filter((o) => !o.isMine);
  const sent = offers.filter((o) => o.isMine);
  const byListing = new Map<string, Offer[]>();
  received.forEach((o) => byListing.set(o.listingId, [...(byListing.get(o.listingId) ?? []), o]));

  return (
    <div className="space-y-8">
      <p className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg p-3">
        Offers on OwnersMarket are <strong>not binding</strong>. They say what a buyer would pay and on what terms. When you agree, a lawyer,
        notary or realtor writes the contract of purchase and sale. Never send or accept a deposit through a message.
      </p>

      {received.length === 0 && sent.length === 0 && (
        <div className="text-center py-10 text-slate-600">
          <div className="font-semibold text-slate-900">No offers yet</div>
          <p className="text-sm">Offers buyers send on your homes, and offers you send, show up here.</p>
        </div>
      )}

      {[...byListing.entries()].map(([listingId, list]) => {
        const best = Math.max(...list.filter((o) => o.status === 'open' && !isExpired(o)).map((o) => o.amount), 0);
        return (
          <section key={listingId} className="border border-slate-200 rounded-2xl overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 flex items-center justify-between gap-3 flex-wrap text-sm">
              <button onClick={() => onOpenListing(listingId)} className="font-bold text-slate-900 underline-offset-2 hover:underline cursor-pointer text-left">
                {list[0].listingHeadline}
              </button>
              <span className="text-slate-600">
                asking {formatCAD(list[0].listingPrice)} · {list.length} {list.length === 1 ? 'offer' : 'offers'}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[760px]">
                <thead className="text-left text-xs text-slate-500">
                  <tr>
                    {['Buyer', 'Offer', 'vs asking', 'Deposit', 'Subject to', 'Financing', 'Possession', 'Open until', ''].map((h) => (
                      <th key={h} className="px-4 py-2 font-semibold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {list.map((o) => {
                    const st = statusOf(o);
                    const top = o.status === 'open' && !isExpired(o) && o.amount === best;
                    return (
                      <React.Fragment key={o.id}>
                        <tr className={top ? 'bg-emerald-50/60' : ''}>
                          <td className="px-4 py-3 font-semibold text-slate-900">
                            {o.buyerName}
                            {top && list.length > 1 && <div className="text-[11px] font-bold text-emerald-800">HIGHEST</div>}
                          </td>
                          <td className="px-4 py-3 font-semibold text-xl tabular-nums">{formatCAD(o.amount)}</td>
                          <td className="px-4 py-3 text-slate-600">{pct(o)}</td>
                          <td className="px-4 py-3">{o.deposit ? formatCAD(o.deposit) : '—'}</td>
                          <td className="px-4 py-3">{o.conditions.length ? o.conditions.map((c) => CONDITION_LABEL[c]).join(', ') : 'None (firm)'}</td>
                          <td className="px-4 py-3">{FINANCING_LABEL[o.financing]}</td>
                          <td className="px-4 py-3">{day(o.possessionDate)}</td>
                          <td className="px-4 py-3">{day(o.openUntil)}</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {o.status === 'open' && !isExpired(o) ? (
                              <span className="flex items-center gap-1.5">
                                <button onClick={() => setReply({ offer: o, action: 'accept' })} className="px-2.5 py-1.5 rounded-md bg-emerald-700 text-white text-xs font-semibold cursor-pointer">Accept</button>
                                <button onClick={() => { setCounter(''); setReply({ offer: o, action: 'counter' }); }} className="px-2.5 py-1.5 rounded-md border border-slate-300 text-xs font-semibold cursor-pointer">Counter</button>
                                <button onClick={() => setReply({ offer: o, action: 'decline' })} className="px-1 text-xs underline text-slate-600 cursor-pointer">Decline</button>
                              </span>
                            ) : (
                              <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${st.cls}`}>
                                {st.label}
                                {o.status === 'countered' && o.counterAmount ? ` at ${formatCAD(o.counterAmount)}` : ''}
                              </span>
                            )}
                            {o.status === 'accepted' && (
                              <button onClick={() => onMessageBuyer(o.listingId, o.buyerId)} className="block mt-1 text-xs underline text-emerald-800 cursor-pointer">
                                Open messages
                              </button>
                            )}
                          </td>
                        </tr>
                        {o.message && (
                          <tr className={top ? 'bg-emerald-50/60' : ''}>
                            <td />
                            <td colSpan={8} className="px-4 pb-3 -mt-2 text-slate-600 text-[13px]">“{o.message}”</td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}

      {sent.length > 0 && (
        <section className="space-y-3">
          <h3 className="font-bold text-slate-900">Offers you sent</h3>
          {sent.map((o) => {
            const st = statusOf(o);
            return (
              <div key={o.id} className="border border-slate-200 rounded-xl p-4 text-sm flex flex-wrap items-center gap-3 justify-between">
                <div className="min-w-0">
                  <button onClick={() => onOpenListing(o.listingId)} className="font-semibold text-slate-900 hover:underline cursor-pointer text-left">
                    {o.listingHeadline}
                  </button>
                  <div className="text-slate-600">
                    You offered <strong className="text-slate-900">{formatCAD(o.amount)}</strong> (asking {formatCAD(o.listingPrice)}) · open until {day(o.openUntil)}
                  </div>
                  {o.status === 'countered' && o.counterAmount && (
                    <div className="text-sky-900 mt-1">The owner would accept <strong>{formatCAD(o.counterAmount)}</strong>. Send a new offer from the listing page, or message them.</div>
                  )}
                  {o.status === 'accepted' && (
                    <div className="text-emerald-900 mt-1">The owner wants to go ahead. Nothing is signed yet: message them, and have a lawyer, notary or realtor write the contract.</div>
                  )}
                  {o.reply && <div className="text-slate-600 mt-1">The owner says: “{o.reply}”</div>}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${st.cls}`}>{st.label}</span>
                  {(o.status === 'open' || o.status === 'countered') && !isExpired(o) && (
                    <button onClick={() => void withdraw(o)} className="text-xs underline text-slate-600 cursor-pointer">Withdraw</button>
                  )}
                </div>
              </div>
            );
          })}
        </section>
      )}

      {reply && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4" onMouseDown={(e) => e.target === e.currentTarget && !busy && setReply(null)}>
          <div role="dialog" aria-modal="true" className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900">
              {reply.action === 'accept' ? 'Accept' : reply.action === 'counter' ? 'Counter' : 'Decline'} {reply.offer.buyerName}’s {formatCAD(reply.offer.amount)} offer?
            </h3>
            <p className="text-sm text-slate-600">
              {reply.action === 'accept'
                ? 'This tells the buyer you want to go ahead. It is not a contract: next, message them and have a lawyer, notary or realtor write the contract of purchase and sale.'
                : reply.action === 'counter'
                ? 'Tell the buyer the price you’d accept. They can send a new offer.'
                : 'The buyer is told, and can send a new offer.'}
            </p>
            {reply.action === 'counter' && (
              <label className="block">
                <span className="block text-xs font-semibold text-slate-800 mb-1">Price you’d accept</span>
                <input
                  autoFocus
                  inputMode="numeric"
                  value={counter}
                  onChange={(e) => setCounter(Number(e.target.value.replace(/[^\d]/g, '')) ? Number(e.target.value.replace(/[^\d]/g, '')).toLocaleString('en-CA') : '')}
                  placeholder={reply.offer.listingPrice.toLocaleString('en-CA')}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-[15px]"
                />
              </label>
            )}
            <label className="block">
              <span className="block text-xs font-semibold text-slate-800 mb-1">Note to the buyer (optional)</span>
              <textarea rows={2} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm" />
            </label>
            <div className="flex justify-end gap-2">
              <button onClick={() => setReply(null)} disabled={busy} className="px-4 py-2 text-sm font-semibold text-slate-700 cursor-pointer">Cancel</button>
              <button
                onClick={() => void send()}
                disabled={busy}
                className={`px-5 py-2.5 rounded-xl text-sm font-semibold text-white min-h-[44px] flex items-center gap-1.5 cursor-pointer disabled:opacity-60 ${
                  reply.action === 'decline' ? 'bg-rose-700 hover:bg-rose-800' : 'bg-emerald-700 hover:bg-emerald-800'
                }`}
              >
                {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                {reply.action === 'accept' ? 'Accept offer' : reply.action === 'counter' ? 'Send counter' : 'Decline offer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
