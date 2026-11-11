import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, Pause, Play, Plus } from 'lucide-react';
import { db, type PromoCode } from '../lib/db';

const shortDate = (d: string) =>
  new Date(d.length === 10 ? `${d}T12:00:00` : d).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' });

/**
 * Admin console → Promotions: create codes for free months (no Stripe setup) and pause them.
 * Sellers type a code on their dashboard under "Activate listing".
 */
export const AdminPromotions: React.FC = () => {
  const [codes, setCodes] = useState<PromoCode[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  const [code, setCode] = useState('');
  const [months, setMonths] = useState(3);
  const [cardRequired, setCardRequired] = useState(false);
  const [maxUses, setMaxUses] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [note, setNote] = useState('');

  const [homeBusy, setHomeBusy] = useState(false);
  const featured = codes?.find((c) => c.featured && c.active) ?? null;
  const setHomepage = async (months: number) => {
    setError(null);
    setDone(null);
    setHomeBusy(true);
    try {
      await db.adminSetHomepagePromo(months);
      setDone(months ? `The homepage now says “Your first ${months === 1 ? 'month is' : `${months} months are`} on us”.` : 'The homepage offer is off.');
      await load();
    } catch (err: any) {
      setError(err?.message || 'Could not change the homepage offer.');
    } finally {
      setHomeBusy(false);
    }
  };

  const load = useCallback(async () => {
    try {
      setCodes(await db.loadPromoCodes());
    } catch (e: any) {
      setError(e?.message || 'Could not load the promo codes.');
      setCodes([]);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setDone(null);
    const uses = maxUses.trim() ? Number(maxUses) : null;
    if (uses !== null && (!Number.isInteger(uses) || uses < 1)) return setError('Max uses must be a whole number, or leave it empty.');
    setBusy(true);
    try {
      await db.createPromoCode({ code, freeMonths: months, cardRequired, maxUses: uses, validUntil: validUntil || null, note });
      setDone(`${code.trim().toUpperCase()} is ready. Sellers can type it on their dashboard.`);
      setCode('');
      setMaxUses('');
      setValidUntil('');
      setNote('');
      await load();
    } catch (err: any) {
      setError(err?.message || 'Could not create the code.');
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (p: PromoCode) => {
    setError(null);
    try {
      await db.setPromoCodeActive(p.code, !p.active);
      await load();
    } catch (err: any) {
      setError(err?.message || 'Could not update the code.');
    }
  };

  const status = (p: PromoCode) => {
    if (!p.active) return { label: 'Paused', cls: 'bg-slate-200 text-slate-700' };
    if (p.validUntil && new Date(`${p.validUntil}T23:59:59`) < new Date()) return { label: 'Expired', cls: 'bg-slate-200 text-slate-700' };
    if (p.maxUses !== null && p.uses >= p.maxUses) return { label: 'Used up', cls: 'bg-slate-200 text-slate-700' };
    return { label: 'Active', cls: 'bg-emerald-100 text-emerald-900' };
  };

  const input = 'w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700';

  return (
    <div className="space-y-6">
      <section className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Homepage offer</h2>
          <p className="text-sm text-slate-600">
            Tick one and it goes live straight away: a thin bar above the menu and a line under the search on the homepage
            (“Your first 3 months are on us”), and the code is filled in for sellers on their dashboard. No card needed.
          </p>
        </div>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Homepage offer">
          {[0, 1, 3, 6, 9, 12].map((m) => {
            const on = m === 0 ? !featured : featured?.freeMonths === m && featured.code === `WELCOME${m}`;
            return (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={on}
                disabled={homeBusy || codes === null}
                onClick={() => !on && void setHomepage(m)}
                className={`px-4 py-2.5 rounded-xl border text-sm font-semibold min-h-[44px] cursor-pointer disabled:opacity-60 flex items-center gap-2 ${
                  on
                    ? m === 0
                      ? 'bg-slate-800 border-slate-800 text-white'
                      : 'bg-emerald-700 border-emerald-700 text-white'
                    : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span
                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${on ? 'border-white' : 'border-slate-400'}`}
                  aria-hidden="true"
                >
                  {on && <span className="w-2 h-2 rounded-full bg-white" />}
                </span>
                {m === 0 ? 'Off' : `${m} ${m === 1 ? 'month' : 'months'} free`}
              </button>
            );
          })}
          {homeBusy && <Loader2 className="w-5 h-5 animate-spin text-slate-500 self-center" />}
        </div>
        <p className="text-sm text-slate-700">
          {featured ? (
            <>
              <strong>Live now:</strong> “Your first {featured.freeMonths === 1 ? 'month is' : `${featured.freeMonths} months are`} on us”, code{' '}
              <span className="font-mono font-bold">{featured.code}</span>, used by {featured.uses}{' '}
              {featured.uses === 1 ? 'listing' : 'listings'} so far.
            </>
          ) : (
            <span className="text-slate-500">No offer on the homepage.</span>
          )}
        </p>
        <p className="text-xs text-slate-500">
          Sellers who already used a code keep their free months when you switch or turn it off.
        </p>
      </section>

      <form onSubmit={create} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Other promo codes</h2>
          <p className="text-sm text-slate-600">
            For a Facebook group, a partner or one person: they type the code on their dashboard. Each listing can use one code.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <label className="block">
            <span className="block text-xs font-semibold text-slate-700 mb-1">Code</span>
            <input
              required
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ''))}
              maxLength={30}
              placeholder="SPRING3"
              className={`${input} font-mono uppercase`}
            />
          </label>
          <label className="block">
            <span className="block text-xs font-semibold text-slate-700 mb-1">Free months</span>
            <select value={months} onChange={(e) => setMonths(Number(e.target.value))} className={`${input} bg-white`}>
              {[1, 2, 3, 4, 6, 9, 12].map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="block text-xs font-semibold text-slate-700 mb-1">Max uses (optional)</span>
            <input inputMode="numeric" value={maxUses} onChange={(e) => setMaxUses(e.target.value.replace(/\D/g, ''))} placeholder="No limit" className={input} />
          </label>
          <label className="block">
            <span className="block text-xs font-semibold text-slate-700 mb-1">Valid until (optional)</span>
            <input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} className={input} />
          </label>
        </div>

        <fieldset>
          <legend className="block text-xs font-semibold text-slate-700 mb-1">Card</legend>
          <div className="inline-flex rounded-lg border border-slate-300 p-0.5 bg-slate-50">
            {[
              { v: false, t: 'No card' },
              { v: true, t: 'Card required' },
            ].map((o) => (
              <button
                key={o.t}
                type="button"
                onClick={() => setCardRequired(o.v)}
                aria-pressed={cardRequired === o.v}
                className={`px-3 py-1.5 text-sm font-semibold rounded-md cursor-pointer ${
                  cardRequired === o.v ? 'bg-emerald-700 text-white' : 'text-slate-700'
                }`}
              >
                {o.t}
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-600 mt-1.5">
            {cardRequired
              ? `The seller enters a card at checkout. Nothing is charged for ${months} ${months === 1 ? 'month' : 'months'}, then $24.99 a month unless they cancel.`
              : `The listing goes live right away, free for ${months} ${months === 1 ? 'month' : 'months'}. A week before the end they get a reminder; if they don’t activate, it’s hidden (not deleted).`}
          </p>
        </fieldset>

        <label className="block">
          <span className="block text-xs font-semibold text-slate-700 mb-1">Internal note (only you see it)</span>
          <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} placeholder="e.g. Abbotsford Facebook group, spring" className={input} />
        </label>

        {error && <p className="text-sm text-rose-700" role="alert">{error}</p>}
        {done && <p className="text-sm text-emerald-800">{done}</p>}

        <button
          type="submit"
          disabled={busy || code.length < 3}
          className="px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-sm font-semibold flex items-center gap-1.5 min-h-[44px] cursor-pointer"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Create code
        </button>
      </form>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs text-slate-600">
            <tr>
              <th className="px-4 py-2.5 font-semibold">Code</th>
              <th className="px-4 py-2.5 font-semibold">Gives</th>
              <th className="px-4 py-2.5 font-semibold">Card</th>
              <th className="px-4 py-2.5 font-semibold">Used</th>
              <th className="px-4 py-2.5 font-semibold">Valid until</th>
              <th className="px-4 py-2.5 font-semibold">Note</th>
              <th className="px-4 py-2.5 font-semibold">Status</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {codes === null && (
              <tr><td colSpan={8} className="px-4 py-6 text-center text-slate-500">Loading…</td></tr>
            )}
            {codes?.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-6 text-center text-slate-500">No promo codes yet.</td></tr>
            )}
            {codes?.map((p) => {
              const st = status(p);
              return (
                <tr key={p.code}>
                  <td className="px-4 py-3 font-mono font-bold text-slate-900">
                    {p.code}
                    {p.featured && p.active && (
                      <span className="ml-2 font-sans text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-700 text-white">On homepage</span>
                    )}
                  </td>
                  <td className="px-4 py-3">{p.freeMonths} {p.freeMonths === 1 ? 'month' : 'months'} free</td>
                  <td className="px-4 py-3">{p.cardRequired ? 'Required' : 'No card'}</td>
                  <td className="px-4 py-3">{p.uses}{p.maxUses !== null ? ` of ${p.maxUses}` : ''}</td>
                  <td className="px-4 py-3">{p.validUntil ? shortDate(p.validUntil) : 'No end'}</td>
                  <td className="px-4 py-3 text-slate-600 max-w-[16rem] truncate" title={p.note}>{p.note}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${st.cls}`}>{st.label}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => void toggle(p)}
                      className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 inline-flex items-center gap-1 cursor-pointer min-h-[36px]"
                    >
                      {p.active ? <><Pause className="w-3.5 h-3.5" /> Pause</> : <><Play className="w-3.5 h-3.5" /> Restart</>}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-500">
        Pausing a code stops new sellers from using it. Listings that already used it keep their free months.
      </p>
    </div>
  );
};
