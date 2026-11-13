import React, { useMemo, useState } from 'react';
import { buyingCosts } from '../lib/buyingCosts';

const cad = (n: number) => `$${Math.round(n).toLocaleString('en-CA')}`;
const signed = (n: number) => (n < 0 ? `− ${cad(-n)}` : cad(n));

/** A whole-dollar input that shows commas and accepts only digits. */
const MoneyInput: React.FC<{ label: string; value: number; onChange: (n: number) => void; suffix?: string }> = ({ label, value, onChange, suffix }) => (
  <label className="block">
    <span className="block text-xs font-semibold text-slate-700 mb-1">{label}</span>
    <span className="relative block">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">$</span>
      <input
        inputMode="numeric"
        value={value ? value.toLocaleString('en-CA') : ''}
        onChange={(e) => onChange(Number(e.target.value.replace(/\D/g, '').slice(0, 10)) || 0)}
        className="w-full pl-7 pr-3 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700"
      />
      {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs">{suffix}</span>}
    </span>
  </label>
);

/**
 * Listing page: "What it would cost you" (monthly payment) and "Cash you'll need on closing day"
 * (down payment, transfer tax with first-time buyer relief, typical fees). Estimates; buyers can
 * change every number.
 */
export const CostCalculator: React.FC<{
  price: number;
  province: string;
  city: string;
  propertyTaxYear?: number;
  strataMonth?: number;
}> = ({ price: listPrice, province, city, propertyTaxYear, strataMonth }) => {
  const [price, setPrice] = useState(listPrice);
  const [downPct, setDownPct] = useState(listPrice >= 1_500_000 ? 20 : 10);
  const [rate, setRate] = useState('4.5');
  const [years, setYears] = useState(25);
  const [tax, setTax] = useState(propertyTaxYear ?? Math.round(listPrice * 0.005));
  const [strata, setStrata] = useState(strataMonth ?? 0);
  const [firstTime, setFirstTime] = useState(false);

  const down = Math.round((price * downPct) / 100);
  const r = useMemo(
    () =>
      buyingCosts({
        price,
        down,
        ratePct: Number(rate) || 0,
        years,
        propertyTaxYear: tax,
        strataMonth: strata,
        province,
        city,
        firstTime,
      }),
    [price, down, rate, years, tax, strata, province, city, firstTime],
  );

  const parts = [`mortgage ${cad(r.mortgageMonth)}`, `property tax ${cad(r.taxMonth)}`];
  if (r.strataMonth > 0) parts.push(`strata ${cad(r.strataMonth)}`);

  return (
    <section className="space-y-4">
      <h2 className="font-semibold text-[27px] leading-[1.1] text-slate-900">What it would cost you</h2>
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
          <div>
            <div className="flex items-baseline justify-between gap-2">
              <div className="font-semibold text-slate-900">Monthly</div>
              <span className="text-xs text-slate-500">Estimate</span>
            </div>
            <div className="font-semibold text-[35px] leading-[1.1] text-slate-900 mt-1">
              {cad(r.totalMonth)}
              <span className="text-xl text-slate-500"> / month</span>
            </div>
            <div className="text-sm text-slate-600 mt-1">{parts.join(' · ')}</div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <MoneyInput label="Price" value={price} onChange={setPrice} />
            <label className="block">
              <span className="block text-xs font-semibold text-slate-700 mb-1">Down payment</span>
              <select
                value={downPct}
                onChange={(e) => setDownPct(Number(e.target.value))}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700"
              >
                {[5, 10, 15, 20, 25, 30, 35, 40, 50].map((p) => (
                  <option key={p} value={p}>
                    {p}% · {cad((price * p) / 100)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="block text-xs font-semibold text-slate-700 mb-1">Interest rate</span>
              <span className="relative block">
                <input
                  inputMode="decimal"
                  value={rate}
                  onChange={(e) => setRate(e.target.value.replace(/[^\d.]/g, '').slice(0, 5))}
                  className="w-full pl-3 pr-7 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">%</span>
              </span>
            </label>
            <label className="block">
              <span className="block text-xs font-semibold text-slate-700 mb-1">Amortization</span>
              <select
                value={years}
                onChange={(e) => setYears(Number(e.target.value))}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700"
              >
                {[15, 20, 25, 30].map((y) => (
                  <option key={y} value={y}>
                    {y} years
                  </option>
                ))}
              </select>
            </label>
            <MoneyInput label="Property tax" value={tax} onChange={setTax} suffix="/ yr" />
            <MoneyInput label="Strata fee" value={strata} onChange={setStrata} suffix="/ mo" />
          </div>

          {r.downTooLow && (
            <p className="text-sm text-rose-700" role="alert">
              The smallest down payment allowed at this price is {cad(r.minDown)}
              {price >= 1_500_000 ? ' (20%: homes of $1.5M and over need 20% down)' : ''}.
            </p>
          )}
          <p className="text-xs text-slate-500">
            {r.premium > 0
              ? `Includes ${cad(r.premium)} of CMHC mortgage insurance, added to the mortgage because the down payment is under 20%. `
              : ''}
            {years > 25 && r.premium > 0 ? 'Insured mortgages over 25 years are for first-time buyers and new homes. ' : ''}
            Rates change often: check yours with a lender.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
          <div className="font-semibold text-slate-900">Cash you’ll need on closing day</div>
          <label className="flex items-center gap-2 text-sm text-slate-800 cursor-pointer">
            <input type="checkbox" checked={firstTime} onChange={(e) => setFirstTime(e.target.checked)} className="w-4 h-4 accent-emerald-700" />
            I’m a first-time home buyer
          </label>
          <div className="text-sm">
            {r.closing.map((l) => (
              <div key={l.label} className="py-2 border-t border-slate-100">
                <div className="flex justify-between gap-3">
                  <span className="text-slate-700">{l.label}</span>
                  <span className={`tabular-nums ${l.amount < 0 ? 'text-emerald-800 font-semibold' : 'text-slate-900'}`}>{signed(l.amount)}</span>
                </div>
                {l.note && <div className="text-xs text-slate-500 mt-0.5">{l.note}</div>}
              </div>
            ))}
            <div className="flex justify-between gap-3 py-2 border-t-2 border-slate-200 font-bold text-slate-900">
              <span>About</span>
              <span className="tabular-nums">{cad(r.cashToClose)}</span>
            </div>
          </div>
          <p className="text-xs text-slate-500">
            An estimate to help you plan, not advice. First-time buyer relief has conditions; your lawyer or notary confirms the exact
            amounts.
          </p>
        </div>
      </div>
    </section>
  );
};
