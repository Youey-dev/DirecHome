import { rememberPromo, type HomepagePromo } from '../lib/promo';
import React, { useState } from 'react';
import { Listing, isListingLive } from '../types/listing';
import { ListingCard } from '../components/ListingCard';
import { calculateBCCommission, formatCAD, formatCADCents, LISTING_FEE_CAD_PER_MONTH } from '../lib/commissionCalc';
import type { BrowseFilters } from './BrowsePage';
import { NavLink } from '../components/NavLink';

/** Example used in the savings section; kept in step with the savings estimator. */
const EXAMPLE_PRICE = 750000;
const EXAMPLE_MONTHS = 3;

interface LandingPageProps {
  listings: Listing[];
  savedIds: string[];
  onToggleFavorite: (e: React.MouseEvent, id: string) => void;
  onSelectListing: (id: string) => void;
  onNavigate: (tab: string, listingId?: string) => void;
  /** The offer chosen in Admin → Promotions → Homepage offer, if any */
  promo?: HomepagePromo | null;
  onSearch?: (filters: BrowseFilters) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  listings,
  savedIds,
  onToggleFavorite,
  onSelectListing,
  onNavigate,
  promo = null,
  onSearch
}) => {
  const liveListings = listings.filter((l) => isListingLive(l));
  const shownListings = liveListings.slice(0, 6);

  const [query, setQuery] = useState('');

  const example = calculateBCCommission(EXAMPLE_PRICE, false);
  const exampleFees = LISTING_FEE_CAD_PER_MONTH * EXAMPLE_MONTHS;
  const exampleKeep = example.traditionalTotalCommission - exampleFees;

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const filters: BrowseFilters = { query: query.trim() || undefined };
    if (onSearch) onSearch(filters);
    else onNavigate('browse');
  };

  const startListing = () => {
    if (promo) rememberPromo(promo.code);
    onNavigate('wizard');
  };

  const h2 = 'text-[28px] sm:text-[34px] leading-[1.1] font-semibold tracking-[-0.03em] text-slate-900';
  const link = 'font-semibold text-emerald-700 hover:text-slate-900 underline underline-offset-[3px]';

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6">
      {/* One question */}
      <section className="mx-auto max-w-[760px] pt-12 pb-16 sm:pt-24 sm:pb-24 lg:pt-[120px] lg:pb-[112px] flex flex-col items-center gap-7 sm:gap-9 text-center">
        <h1 className="text-[40px] sm:text-[60px] lg:text-[76px] leading-[1.02] font-semibold tracking-[-0.035em] text-slate-900 text-balance">
          Where do you want to live?
        </h1>
        <form
          aria-label="Search homes"
          role="search"
          onSubmit={submitSearch}
          className="w-full max-w-[640px] flex items-center gap-2 p-1.5 sm:p-2 border-[1.5px] border-slate-900 rounded-2xl bg-white focus-within:ring-2 focus-within:ring-emerald-700 focus-within:ring-offset-2"
        >
          <label className="flex-1 min-w-0 flex">
            <span className="sr-only">City or postal code</span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="City or postal code"
              autoComplete="off"
              className="om-bare flex-1 min-w-0 h-[52px] border-0 bg-transparent px-3 sm:px-3.5 text-[17px] sm:text-[19px] text-slate-900 placeholder:text-slate-600 focus:outline-none focus-visible:outline-none"
            />
          </label>
          <button
            type="submit"
            className="flex-none h-[52px] px-5 sm:px-7 rounded-[10px] bg-emerald-700 hover:bg-emerald-800 text-white text-[17px] font-semibold cursor-pointer"
          >
            Search
          </button>
        </form>
        <p className="text-[17px] sm:text-[18px] leading-normal text-slate-600 text-balance">
          Homes for sale by their owners, across Canada.{' '}
          <NavLink to="wizard" onNavigate={onNavigate} className={link}>
            Selling yours?
          </NavLink>
        </p>
      </section>

      {/* Real homes */}
      <section aria-label="Homes for sale" className="flex flex-col items-center gap-10">
        {shownListings.length > 0 && (
          <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-7 gap-y-10">
            {shownListings.map((listing) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                isFavorited={savedIds.includes(listing.id)}
                onToggleFavorite={onToggleFavorite}
                onSelect={onSelectListing}
              />
            ))}
          </div>
        )}
        <NavLink to="browse" onNavigate={onNavigate} className={`${link} text-[17px] min-h-[44px] inline-flex items-center`}>
          {liveListings.length > 0 ? 'See all homes' : 'Browse homes for sale'}
        </NavLink>
      </section>

      {/* One quiet seller row */}
      <section
        aria-labelledby="sell-heading"
        className="mt-20 sm:mt-28 py-12 sm:py-14 border-t border-hairline flex flex-col md:flex-row md:items-center md:justify-between gap-7 md:gap-12"
      >
        <div className="flex flex-col gap-2.5 max-w-[40em]">
          <h2 id="sell-heading" className={h2}>Selling? List it yourself.</h2>
          <p className="text-[17px] sm:text-[18px] leading-normal text-slate-600">
            Add your photos and price, and buyers message you directly. No commission
            {promo ? `, and ${promo.months === 1 ? 'your first month is' : `your first ${promo.months} months are`} free.` : '.'}
          </p>
        </div>
        <button
          onClick={startListing}
          className="self-start md:self-auto flex-none inline-flex items-center h-14 px-[30px] rounded-xl bg-slate-900 hover:bg-slate-950 text-white text-[17px] font-semibold cursor-pointer"
        >
          List your home
        </button>
      </section>

      {/* The details, kept quiet: how it works for buyers and sellers, what it could save, and the guides */}
      <section aria-labelledby="how-heading" className="py-12 sm:py-14 border-t border-hairline flex flex-col gap-10">
        <h2 id="how-heading" className={h2}>How it works</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16">
          {[
            {
              title: 'Buying from an owner',
              steps: [
                'Message the owner to ask questions and request a viewing time. No agent in the middle.',
                'The owner confirms a time and shares the exact address with you.',
                'Your lawyer or notary prepares the offer and handles the deposit and closing.',
              ],
              more: { to: 'guide-buying', label: 'Read the buyer’s guide' },
            },
            {
              title: 'Selling yours',
              steps: [
                'Take 10 to 25 photos on your phone and add the basics: price, rooms, size and taxes. Most owners finish in about 15 minutes.',
                'We review every listing for spam, scams and anything inappropriate, usually within a day, before it goes live on a flat monthly plan.',
                'Buyers message you and request viewing times; you accept the ones that suit you. A free printable for-sale sign with a QR code comes with every listing.',
              ],
              more: { to: 'how-it-works', label: 'See how selling works' },
            },
          ].map((col) => (
            <div key={col.title} className="flex flex-col gap-4">
              <h3 className="text-[20px] font-semibold text-slate-900">{col.title}</h3>
              <ol className="flex flex-col gap-3 text-[16px] leading-relaxed text-slate-600 list-decimal pl-5 marker:text-slate-900 marker:font-semibold">
                {col.steps.map((t) => (
                  <li key={t} className="pl-1">{t}</li>
                ))}
              </ol>
              <NavLink to={col.more.to} onNavigate={onNavigate} className={`${link} self-start min-h-[44px] inline-flex items-center`}>
                {col.more.label}
              </NavLink>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="save-heading" className="py-12 sm:py-14 border-t border-hairline grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16">
        <div className="flex flex-col gap-3">
          <h2 id="save-heading" className={h2}>What selling it yourself could save</h2>
          <p className="text-[16px] leading-relaxed text-slate-600">
            On a {formatCAD(EXAMPLE_PRICE)} home, an example commission of 7% on the first $100,000 and 2.5% on the rest, plus 5% GST, comes to about {formatCAD(example.traditionalTotalCommission)}. Rates vary by province and are always negotiable, and HST provinces pay more tax, so treat this as an estimate.
          </p>
          <p className="text-[16px] leading-relaxed text-slate-600">
            If you like, you can offer part of what you save to the buyer as cash back at closing, or mark your listing “Agents welcome” and say what you would pay a buyer’s agent. Both are your choice, and paid by you.
          </p>
        </div>
        <div className="flex flex-col gap-3 md:pt-1">
          <dl className="flex flex-col text-[16px]">
            <div className="flex justify-between items-baseline gap-4 py-3 border-b border-hairline">
              <dt className="text-slate-600">Example commission (estimate)</dt>
              <dd className="font-semibold text-slate-600 line-through tabular-nums">{formatCAD(example.traditionalTotalCommission)}</dd>
            </div>
            <div className="flex justify-between items-baseline gap-4 py-3 border-b border-hairline">
              <dt className="text-slate-600">OwnersMarket, listed for {EXAMPLE_MONTHS} months</dt>
              <dd className="font-semibold text-slate-900 tabular-nums">{formatCADCents(exampleFees)}</dd>
            </div>
            <div className="flex justify-between items-baseline gap-4 py-3">
              <dt className="font-semibold text-slate-900">You could keep about</dt>
              <dd className="text-[28px] font-semibold tracking-[-0.02em] text-emerald-700 tabular-nums">{formatCAD(exampleKeep)}</dd>
            </div>
          </dl>
          <p className="text-[14px] text-slate-600">
            An estimate, before your lawyer or notary fees. If your buyer uses an agent, that agent may ask you to pay their commission.
          </p>
          <div className="flex flex-wrap gap-x-6">
            <NavLink to="calculator" onNavigate={onNavigate} className={`${link} min-h-[44px] inline-flex items-center`}>
              Estimate it with your own price
            </NavLink>
            <NavLink to="pricing" onNavigate={onNavigate} className={`${link} min-h-[44px] inline-flex items-center`}>
              See pricing
            </NavLink>
          </div>
        </div>
      </section>

      <section aria-labelledby="guides-heading" className="pt-12 sm:pt-14 border-t border-hairline flex flex-col gap-6">
        <h2 id="guides-heading" className={h2}>Free step-by-step guides</h2>
        <ul className="grid grid-cols-1 md:grid-cols-3 gap-x-10 gap-y-6">
          {[
            {
              tab: 'guide-selling',
              title: 'How to sell your house without a realtor in Canada',
              text: 'Nine steps from pricing research and paperwork to safe viewings, offers and handing over the keys.',
            },
            {
              tab: 'guide-bc',
              title: 'Selling without a realtor in BC',
              text: 'What\u2019s different in British Columbia: lawyer or notary, disclosure, strata Form B, the 3-day rescission period and the flipping tax.',
            },
            {
              tab: 'guide-buying',
              title: 'How to buy a house for sale by owner in Canada',
              text: 'Eight steps from pre-approval to moving in, including how to check the title and keep your deposit safe.',
            },
          ].map((g) => (
            <li key={g.tab} className="flex flex-col gap-1.5">
              <NavLink to={g.tab} onNavigate={onNavigate} className="text-[18px] font-semibold tracking-[-0.015em] text-slate-900 hover:text-emerald-700 underline-offset-[3px] hover:underline">
                {g.title}
              </NavLink>
              <span className="text-[15px] leading-relaxed text-slate-600">{g.text}</span>
            </li>
          ))}
        </ul>
        <p className="text-[14px] text-slate-600">
          Every listing is reviewed before it goes live. OwnersMarket is an advertising site, not a brokerage.
        </p>
      </section>
    </div>
  );
};
