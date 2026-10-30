import React, { useState } from 'react';
import {
  calculateBCCommission,
  COMMISSION_TAX,
  commissionTax,
  DEFAULT_TAX_PROVINCE,
  formatCAD,
  formatCADCents,
  LISTING_FEE_CAD_PER_MONTH,
  LISTING_FEE_LABEL,
} from '../lib/commissionCalc';
import { CASHBACK_LENDER_NOTICE } from '../lib/legalText';
import { NavLink } from './NavLink';
import { DollarSign, CheckCircle2, Info, ArrowRight, Sparkles } from 'lucide-react';

interface SavingsCalculatorProps {
  initialPrice?: number;
  initialCashback?: number;
  onApplyToListing?: (price: number, cashback: number) => void;
  compact?: boolean;
  /** Province code for the GST/HST on the commission. Defaults to the last province page visited, or BC. */
  initialProvince?: string;
  /** When given, the result links to the province's "cost to sell" guide (BC, Ontario, Alberta). */
  onNavigate?: (tab: string, id?: string) => void;
}

/** The "cost to sell a house" guide for each province that has one. */
const COST_GUIDES: Record<string, string> = {
  BC: 'cost-to-sell-a-house-in-bc',
  ON: 'cost-to-sell-a-house-in-ontario',
  AB: 'cost-to-sell-a-house-in-alberta',
};

const LAST_PROVINCE_KEY = 'om-last-province';

/** Remember the province page a visitor last looked at, so the calculator can start there. */
export function rememberProvince(code: string) {
  try {
    window.sessionStorage.setItem(LAST_PROVINCE_KEY, code);
  } catch {
    // Storage blocked (private window, preview): the calculator falls back to BC
  }
}

function startingProvince(initial?: string): string {
  const known = (code: string | null | undefined) => (code && COMMISSION_TAX.some((t) => t.code === code) ? code : null);
  if (known(initial)) return initial!;
  if (typeof window === 'undefined') return DEFAULT_TAX_PROVINCE;
  try {
    const fromUrl = new URLSearchParams(window.location.search).get('province')?.toUpperCase();
    return known(fromUrl) ?? known(window.sessionStorage.getItem(LAST_PROVINCE_KEY)) ?? DEFAULT_TAX_PROVINCE;
  } catch {
    return DEFAULT_TAX_PROVINCE;
  }
}

export const SavingsCalculator: React.FC<SavingsCalculatorProps> = ({
  initialPrice = 1250000,
  initialCashback = 15000,
  onApplyToListing,
  compact = false,
  initialProvince,
  onNavigate,
}) => {
  const [price, setPrice] = useState<number>(initialPrice);
  const [province, setProvince] = useState<string>(() => startingProvince(initialProvince));
  const tax = commissionTax(province);
  const costGuide = COST_GUIDES[tax.code];
  const [offersCashback, setOffersCashback] = useState<boolean>(true);
  const [cashbackType, setCashbackType] = useState<'fixed' | 'percentage'>('fixed');
  const [cashbackValue, setCashbackValue] = useState<number>(initialCashback);

  const [monthsListed, setMonthsListed] = useState<number>(3);

  const breakdown = calculateBCCommission(price, offersCashback, cashbackType, cashbackValue, tax.code);
  const listingFees = LISTING_FEE_CAD_PER_MONTH * monthsListed;
  const estimatedNet = Math.max(0, breakdown.netSellerSavingsWithCashback - listingFees);

  return (
    <div className={`bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm ${compact ? 'p-5' : 'p-6 sm:p-8'}`}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Commission and cash-back estimator (estimates only)</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
            See what you could keep, and what you could offer buyers
          </h3>
          <p className="text-sm text-slate-500 mt-0.5">
            Without a listing brokerage, you could avoid a large commission. You may offer part of it as a cash-back to buyers. All figures are estimates.
          </p>
        </div>

        {/* Quick presets for common home prices */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs text-slate-400 mr-1">Quick values:</span>
          {[500000, 750000, 1100000, 1500000].map((val) => (
            <button
              key={val}
              type="button"
              onClick={() => setPrice(val)}
              className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors cursor-pointer ${
                price === val 
                  ? 'bg-emerald-100 text-emerald-800 font-semibold' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              ${(val / 1000000).toFixed(val % 1000000 === 0 ? 0 : 2)}M
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Interactive Controls */}
        <div className="lg:col-span-6 space-y-6">
          {/* Province: sets the GST or HST on the commission */}
          <div>
            <label htmlFor="calculator-province" className="text-sm font-semibold text-slate-900 block mb-2">
              Your province or territory
            </label>
            <select
              id="calculator-province"
              value={tax.code}
              onChange={(e) => setProvince(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-[15px] bg-white text-slate-900"
            >
              {COMMISSION_TAX.map((t) => (
                <option key={t.code} value={t.code}>
                  {t.name} ({t.label} on commission)
                </option>
              ))}
            </select>
          </div>

          {/* Price Input */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label htmlFor="calculator-asking-price" className="text-sm font-semibold text-slate-900">
                Your estimated home asking price
              </label>
              <span className="text-lg font-bold text-slate-900 tabular-nums">
                {formatCAD(price)}
              </span>
            </div>
            <input
              id="calculator-asking-price"
              type="range"
              min="400000"
              max="3500000"
              step="25000"
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
              className="w-full h-2.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-700"
            />
            <div className="flex justify-between text-[11px] text-slate-400 mt-1">
              <span>$400k (Condo)</span>
              <span>$1.2M (Townhouse/Detached)</span>
              <span>$3.5M+ (Luxury/Acreage)</span>
            </div>
          </div>

          {/* Cash-back toggle */}
          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <div>
                <span className="text-sm font-semibold text-slate-900 block">
                  Offer a buyer cash back at closing?
                </span>
                <span className="text-xs text-slate-500">
                  Paid by you, the seller, at closing. OwnersMarket does not fund or guarantee it.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setOffersCashback(!offersCashback)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none ${
                  offersCashback ? 'bg-emerald-700' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out mt-0.5 ml-0.5 ${
                    offersCashback ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {offersCashback && (
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="flex rounded-lg bg-slate-200 p-0.5 text-xs font-medium">
                    <button
                      type="button"
                      onClick={() => {
                        setCashbackType('fixed');
                        setCashbackValue(15000);
                      }}
                      className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                        cashbackType === 'fixed' ? 'bg-white text-slate-900 shadow-sm font-semibold' : 'text-slate-600'
                      }`}
                    >
                      Fixed amount ($)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCashbackType('percentage');
                        setCashbackValue(1.0);
                      }}
                      className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                        cashbackType === 'percentage' ? 'bg-white text-slate-900 shadow-sm font-semibold' : 'text-slate-600'
                      }`}
                    >
                      Percentage (%)
                    </button>
                  </div>

                  <span className="text-xs text-slate-500 ml-auto">
                    {cashbackType === 'fixed' 
                      ? `${formatCAD(cashbackValue)} credit` 
                      : `${cashbackValue}% = ${formatCAD(breakdown.offeredCashback)}`}
                  </span>
                </div>

                {cashbackType === 'fixed' ? (
                  <div>
                    <input
                      type="range"
                      min="2500"
                      max="50000"
                      step="2500"
                      value={cashbackValue}
                      onChange={(e) => setCashbackValue(Number(e.target.value))}
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-700"
                    />
                    <div className="flex justify-between text-[11px] text-slate-400 mt-1">
                      <span>$2,500</span>
                      <span>$15,000 (Popular)</span>
                      <span>$50,000</span>
                    </div>
                  </div>
                ) : (
                  <div>
                    <input
                      type="range"
                      min="0.5"
                      max="3.0"
                      step="0.25"
                      value={cashbackValue}
                      onChange={(e) => setCashbackValue(Number(e.target.value))}
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-700"
                    />
                    <div className="flex justify-between text-[11px] text-slate-400 mt-1">
                      <span>0.5%</span>
                      <span>1.0% to 1.5%</span>
                      <span>3.0%</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-start gap-2.5 text-xs text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-200/80">
            <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <p>
              <strong>Example commission rate used for this estimate:</strong> 7% on the first $100k + 2.5% on the balance, plus {tax.label} on the commission in {tax.name}. This is an example only, not a standard or required rate. Commissions in Canada are negotiable, vary by brokerage and province, and are not set by law. This estimate assumes no real estate agent is involved. If your buyer uses an agent, that agent may ask you to pay their commission, which would reduce your savings.
            </p>
          </div>
        </div>

        {/* Right: Results Comparison Panel */}
        <div className="lg:col-span-6 bg-slate-50 rounded-2xl p-6 border border-slate-200">
          <div className="text-xs font-semibold text-slate-400 mb-4">
            Estimated Comparison for {formatCAD(price)}
          </div>

          {/* Traditional Cost */}
          <div className="flex items-center justify-between py-2.5 border-b border-slate-200 text-sm">
            <span className="text-slate-600">Estimated commission at example rate (7% / 2.5% + {tax.label})</span>
            <span className="font-semibold text-rose-700 tabular-nums">
              {formatCAD(breakdown.traditionalTotalCommission)}
            </span>
          </div>

          {/* OwnersMarket cost */}
          <div className="flex items-center justify-between py-2.5 border-b border-slate-200 text-sm">
            <span className="text-slate-600">OwnersMarket commission</span>
            <span className="font-semibold text-emerald-800 tabular-nums">
              $0.00
            </span>
          </div>

          {/* OwnersMarket listing fee */}
          <div className="flex items-center justify-between gap-3 py-2.5 border-b border-slate-200 text-sm">
            <span className="text-slate-600">
              OwnersMarket listing fee: {LISTING_FEE_LABEL}/month ×{' '}
              <label htmlFor="calculator-months" className="sr-only">Months listed</label>
              <select
                id="calculator-months"
                value={monthsListed}
                onChange={(e) => setMonthsListed(Number(e.target.value))}
                className="border border-slate-300 rounded-md px-1 py-0.5 text-sm bg-white"
              >
                {[1, 2, 3, 4, 6, 9, 12].map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>{' '}
              {monthsListed === 1 ? 'month' : 'months'} listed
            </span>
            <span className="font-semibold text-slate-900 tabular-nums">
              -{formatCADCents(listingFees)}
            </span>
          </div>

          {/* Gross savings */}
          <div className="flex items-center justify-between py-2.5 border-b border-slate-200 text-sm font-medium">
            <span className="text-slate-800">Estimated commission avoided</span>
            <span className="font-bold text-emerald-800 tabular-nums">
              +{formatCAD(breakdown.traditionalTotalCommission)}
            </span>
          </div>

          {/* Cash-back to buyer */}
          {offersCashback && (
            <div className="flex items-center justify-between py-2.5 border-b border-slate-200 text-sm">
              <span className="text-slate-600 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                <span>Offered cash back to buyer at closing</span>
              </span>
              <span className="font-bold text-slate-900 tabular-nums">
                -{formatCAD(breakdown.offeredCashback)}
              </span>
            </div>
          )}

          {/* NET HERO SAVINGS */}
          <div className="mt-5 p-4 rounded-xl bg-emerald-50 border border-emerald-200/80">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-emerald-900 block">
                  Estimated amount you could keep
                </span>
                <span className="text-[11px] text-emerald-700">
                  Estimate after {formatCAD(breakdown.offeredCashback)} buyer cash-back and {formatCADCents(listingFees)} in listing fees
                </span>
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-emerald-800 tabular-nums">
                {formatCAD(estimatedNet)}
              </div>
            </div>

            {offersCashback && (
              <div className="mt-3 pt-3 border-t border-emerald-200/60 flex items-center justify-between text-xs text-emerald-900">
                <span>Buyer closing incentive:</span>
                <span className="font-bold text-emerald-800 tabular-nums">
                  +{formatCAD(breakdown.buyerBenefit)} closing credit
                </span>
              </div>
            )}
          </div>

          {/* Legal / Not a quote note */}
          <div className="mt-4 p-3 bg-white rounded-xl border border-slate-200 text-[11px] text-slate-600 leading-relaxed space-y-1">
            <div className="font-semibold text-slate-800">Legal terms and assumptions:</div>
            <p>
              * All figures are estimates, not quotes. Your actual costs and any commission you would otherwise pay depend on your situation and are negotiable.
            </p>
            <p>
              * Any cash-back represents the seller's voluntary offer, not a platform guarantee. OwnersMarket does not fund, pay or guarantee it. It must be documented in the purchase contract.
            </p>
            <p className="font-medium text-slate-800">* {CASHBACK_LENDER_NOTICE}</p>
          </div>

          {onNavigate && costGuide && (
            <p className="mt-4 text-sm text-slate-700">
              <NavLink to="article" listingId={costGuide} onNavigate={onNavigate} className="font-semibold text-emerald-800 underline underline-offset-2">
                Every cost of selling a house in {tax.code === 'BC' ? 'BC' : tax.name}
              </NavLink>
              : commission, your lawyer, your mortgage and who pays which taxes.
            </p>
          )}

          {onApplyToListing && (
            <button
              onClick={() => onApplyToListing(price, breakdown.offeredCashback)}
              className="mt-4 w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-sm rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Use these numbers in my listing</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
