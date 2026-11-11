import { rememberPromo, type HomepagePromo } from '../lib/promo';
import React, { useState } from 'react';
import { Listing, isListingLive } from '../types/listing';
import { ListingCard } from '../components/ListingCard';
import { OPEN_PROVINCES, ALL_PROVINCES } from '../data/cities';
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

const CheckIcon: React.FC = () => (
  <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true" className="shrink-0">
    <circle cx="13" cy="13" r="12" fill="#0F5A40" />
    <path d="M7.5 13.5 L11.5 17.5 L19 9.5" fill="none" stroke="#FFFFFF" strokeWidth="2.6" />
  </svg>
);

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
  const shownListings = liveListings.slice(0, 8);

  const [query, setQuery] = useState('');
  const [province, setProvince] = useState(ALL_PROVINCES);
  const [propertyType, setPropertyType] = useState('All');
  const [maxPrice, setMaxPrice] = useState('');

  const example = calculateBCCommission(EXAMPLE_PRICE, false);
  const exampleFees = LISTING_FEE_CAD_PER_MONTH * EXAMPLE_MONTHS;
  const exampleKeep = example.traditionalTotalCommission - exampleFees;

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const filters: BrowseFilters = {
      query: query.trim() || undefined,
      province: province === ALL_PROVINCES ? undefined : province,
      propertyType: propertyType === 'All' ? undefined : propertyType,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
    };
    if (onSearch) onSearch(filters);
    else onNavigate('browse');
  };

  const fieldClass =
    'w-full h-12 font-normal text-base px-3.5 border-[1.5px] border-slate-300 rounded-md bg-white text-slate-900';

  return (
    <div className="bg-mist -mb-20">
      {/* Hero: buyers first, with search */}
      <section className="max-w-[1240px] mx-auto px-4 sm:px-6 pt-8 sm:pt-14 pb-7 sm:pb-10 flex flex-col gap-4 sm:gap-5">
        <p className="text-sm font-bold text-emerald-700">For sale by owner, across Canada</p>
        <h1 className="font-display font-bold text-slate-900 text-[40px] sm:text-[64px] lg:text-[72px] leading-[0.95] tracking-[-0.5px] text-balance max-w-[13em]">
          Homes for sale, straight from the people who live in them
        </h1>
        <form
          aria-label="Search homes"
          onSubmit={submitSearch}
          className="bg-white rounded-[10px] border border-slate-200 p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[2fr_1.2fr_1fr_1fr_auto] gap-3 items-end"
        >
          <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-slate-700">
            City, neighbourhood or postal code
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Halifax, Ottawa, Calgary, Langley…"
              className={fieldClass}
            />
          </label>
          <label className="hidden sm:flex flex-col gap-1.5 text-[13px] font-semibold text-slate-700">
            Province
            <select value={province} onChange={(e) => setProvince(e.target.value)} className={fieldClass}>
              <option value={ALL_PROVINCES}>{ALL_PROVINCES}</option>
              {OPEN_PROVINCES.map((p) => (
                <option key={p.code} value={p.code}>{p.name}</option>
              ))}
            </select>
          </label>
          <label className="hidden sm:flex flex-col gap-1.5 text-[13px] font-semibold text-slate-700">
            Home type
            <select value={propertyType} onChange={(e) => setPropertyType(e.target.value)} className={fieldClass}>
              <option value="All">Any type</option>
              <option value="Single Family Detached">Detached house</option>
              <option value="Townhouse">Townhouse</option>
              <option value="Condo / Apartment">Condo or apartment</option>
              <option value="Duplex / Half-Duplex">Duplex</option>
              <option value="Acreage / Farm">Acreage or farm</option>
            </select>
          </label>
          <label className="hidden sm:flex flex-col gap-1.5 text-[13px] font-semibold text-slate-700">
            Max price
            <select value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} className={fieldClass}>
              <option value="">No max</option>
              <option value="500000">$500,000</option>
              <option value="750000">$750,000</option>
              <option value="1000000">$1,000,000</option>
              <option value="1500000">$1,500,000</option>
              <option value="2000000">$2,000,000</option>
            </select>
          </label>
          <button
            type="submit"
            className="font-semibold text-base bg-emerald-700 hover:bg-emerald-800 text-white rounded-md px-7 py-3 min-h-[48px] cursor-pointer sm:col-span-2 lg:col-span-1"
          >
            Show homes
          </button>
        </form>
        <p className="text-sm text-slate-600">
          {promo && (
            <>
              <strong className="text-slate-900">
                Selling? {promo.months === 1 ? 'Your first month is on us.' : `Your first ${promo.months} months are on us.`}
              </strong>{' '}
              <button
                onClick={() => {
                  rememberPromo(promo.code);
                  onNavigate('wizard');
                }}
                className="font-semibold text-emerald-800 underline underline-offset-2 cursor-pointer"
              >
                List your home free →
              </button>
              <span className="mx-1.5" aria-hidden="true">·</span>
            </>
          )}
          Every listing is reviewed before it goes live. OwnersMarket is an advertising site, not a brokerage.
        </p>
      </section>

      {/* Homes for sale */}
      <section aria-label="Homes for sale" className="bg-white border-t border-slate-200">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6 pt-8 sm:pt-10 pb-16 sm:pb-20">
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2 pb-5">
            <h2 className="font-display font-bold text-[34px] sm:text-[40px] leading-none text-slate-900">Newest homes</h2>
            <NavLink
              to="browse"
              onNavigate={onNavigate}
              className="ml-auto font-semibold text-base text-emerald-700 hover:text-slate-900 underline underline-offset-4 cursor-pointer"
            >
              {liveListings.length > 0 ? `See all ${liveListings.length} ${liveListings.length === 1 ? 'home' : 'homes'}` : 'Browse homes'}
            </NavLink>
          </div>
          {shownListings.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-7">
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

          {/* Sellers */}
          <div className="mt-12 bg-emerald-700 text-white rounded-[10px] p-7 sm:p-8 flex flex-col lg:flex-row lg:items-center gap-5 lg:gap-8">
            <h2 className="font-display font-bold text-[36px] sm:text-[40px] leading-none lg:flex-[1.1]">
              Selling? Put your home here, with no commission.
            </h2>
            <p className="text-base leading-relaxed text-emerald-100 lg:flex-1">
              Add your photos in about 15 minutes. Buyers message you to book a viewing, and your own lawyer or notary handles the contract.
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => onNavigate('wizard')}
                className="px-6 py-3.5 bg-sign hover:bg-[#E8B43A] text-slate-900 font-semibold rounded-md cursor-pointer min-h-[48px]"
              >
                List your home
              </button>
              <NavLink
                to="pricing"
                onNavigate={onNavigate}
                className="inline-flex items-center px-6 py-3.5 border-[1.5px] border-white text-white hover:bg-emerald-800 font-semibold rounded-md min-h-[48px]"
              >
                See pricing
              </NavLink>
            </div>
          </div>

          {/* Buyers */}
          <div className="mt-14 flex flex-col gap-7">
            <h2 className="font-display font-bold text-[34px] sm:text-[40px] leading-none text-slate-900">Buying a home for sale by owner</h2>
            <ol className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                { title: 'Message the owner', text: 'Ask questions and request a viewing time. No agent in the middle.' },
                { title: 'See the home', text: 'The owner confirms a time and shares the exact address with you.' },
                { title: 'Offer through your lawyer', text: 'Your lawyer or notary prepares the offer and handles the deposit and closing.' },
              ].map((step, i) => (
                <li key={step.title} className="flex flex-col gap-2 border-t-[3px] border-emerald-700 pt-4">
                  <span className="font-display font-bold text-[36px] leading-none text-emerald-700">{i + 1}</span>
                  <h3 className="text-[19px] font-bold text-slate-900">{step.title}</h3>
                  <p className="text-base leading-relaxed text-slate-700">{step.text}</p>
                </li>
              ))}
            </ol>
            <NavLink
              to="guide-buying"
              onNavigate={onNavigate}
              className="self-start font-semibold text-base text-emerald-700 hover:text-slate-900 underline underline-offset-4 min-h-[44px] inline-flex items-center"
            >
              Read the buyer’s guide
            </NavLink>
          </div>
        </div>
      </section>

      {/* How it works (for sellers) */}
      <section className="bg-mist border-b border-slate-200">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6 py-20 sm:py-24 flex flex-col gap-10">
          <h2 className="font-display font-bold text-[44px] sm:text-[52px] leading-none text-slate-900 max-w-[16em]">
            Three steps from photos to a sold sign
          </h2>
          <ol className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {[
              {
                title: 'Photograph your home',
                text: 'Take 10 to 25 photos on your phone in good daylight and add the basics: price, rooms, size and taxes. Most owners finish in about 15 minutes.',
              },
              {
                title: 'Go live after a quick review',
                text: `We review it for spam, scams and anything inappropriate, usually within a day. Then you activate your listing on a flat monthly plan and buyers can find it.`,
              },
              {
                title: 'Pick your viewing times',
                text: 'Buyers message you and request a time. You accept the ones that suit you. When an offer comes in, your lawyer or notary takes it from there.',
              },
            ].map((step, i) => (
              <li key={step.title} className="flex flex-col gap-2.5 border-t-[3px] border-emerald-700 pt-4">
                <span className="font-display font-bold text-[40px] leading-none text-emerald-700">{i + 1}</span>
                <h3 className="text-[21px] font-bold text-slate-900">{step.title}</h3>
                <p className="text-base leading-relaxed text-slate-700">{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Savings */}
      <section className="max-w-[1240px] mx-auto px-4 sm:px-6 py-20 sm:py-24 flex flex-col lg:flex-row gap-12 lg:gap-14 items-center">
        <div className="flex-1 flex flex-col gap-4 min-w-0">
          <h2 className="font-display font-bold text-[44px] sm:text-[52px] leading-none text-slate-900">
            What selling it yourself could save
          </h2>
          <p className="text-[17px] leading-relaxed text-slate-700 max-w-[32em]">
            On a {formatCAD(EXAMPLE_PRICE)} home, an example commission of 7% on the first $100,000 and 2.5% on the rest, plus 5% GST, comes to about {formatCAD(example.traditionalTotalCommission)}. Rates vary by province and are always negotiable, and HST provinces pay more tax, so treat this as an estimate.
          </p>
          <p className="text-[17px] leading-relaxed text-slate-700 max-w-[32em]">
            If you like, you can offer part of what you save to the buyer as cash back at closing, or mark your listing “Agents welcome” and say what you would pay a buyer’s agent. Both are your choice, and paid by you.
          </p>
          <NavLink
            to="calculator"
            onNavigate={onNavigate}
            className="self-start inline-flex items-center font-semibold text-base text-emerald-700 hover:text-slate-900 underline underline-offset-4 min-h-[44px]"
          >
            Estimate it with your own price
          </NavLink>
          <NavLink
            to="pricing"
            onNavigate={onNavigate}
            className="self-start inline-flex items-center font-semibold text-base text-emerald-700 hover:text-slate-900 underline underline-offset-4 min-h-[44px]"
          >
            See pricing
          </NavLink>
        </div>
        <div className="flex-1 w-full min-w-0 bg-slate-900 text-white rounded-[10px] p-7 sm:p-9 flex flex-col gap-5">
          <div className="flex justify-between items-baseline gap-4 border-b border-slate-700 pb-4">
            <span className="text-base text-slate-300">Example commission (estimate)</span>
            <span className="font-display font-semibold text-[34px] text-slate-300 line-through">
              {formatCAD(example.traditionalTotalCommission)}
            </span>
          </div>
          <div className="flex justify-between items-baseline gap-4 border-b border-slate-700 pb-4">
            <span className="text-base text-slate-300">OwnersMarket, listed for {EXAMPLE_MONTHS} months</span>
            <span className="font-display font-semibold text-[34px]">{formatCADCents(exampleFees)}</span>
          </div>
          <div className="flex justify-between items-baseline gap-4">
            <span className="text-[17px] font-semibold">You could keep about</span>
            <span className="font-display font-bold text-[52px] sm:text-[64px] leading-none text-sign">
              {formatCAD(exampleKeep)}
            </span>
          </div>
          <span className="text-[13px] text-slate-300">
            An estimate, before your lawyer or notary fees. If your buyer uses an agent, that agent may ask you to pay their commission.
          </span>
        </div>
      </section>

      {/* Free for-sale sign */}
      <section className="bg-white border-y border-slate-200">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6 py-20 sm:py-24 flex flex-col lg:flex-row gap-12 lg:gap-16 items-center">
          <div className="flex-1 flex flex-col gap-5 min-w-0">
            <h2 className="font-display font-bold text-[44px] sm:text-[52px] leading-none text-slate-900 max-w-[14em]">
              A free for-sale sign comes with every listing
            </h2>
            <p className="text-[17px] leading-relaxed text-slate-700 max-w-[32em]">
              A sign tells everyone who walks or drives past that your home is for sale. Once your listing is live, download your sign from your dashboard and put it on the lawn.
            </p>
            <ul className="flex flex-col gap-3.5">
              <li className="flex gap-3.5 items-start text-[17px] leading-normal text-slate-900">
                <CheckIcon />
                <span><b>A QR code to your listing.</b> Passers-by scan it to see your photos and price and book a viewing.</span>
              </li>
              <li className="flex gap-3.5 items-start text-[17px] leading-normal text-slate-900">
                <CheckIcon />
                <span><b>Lawn and window versions.</b> Print the 18 × 24 in lawn sign at any print shop, or the window sign at home.</span>
              </li>
              <li className="flex gap-3.5 items-start text-[17px] leading-normal text-slate-900">
                <CheckIcon />
                <span><b>No phone number on it.</b> Buyers reach you through OwnersMarket, and your exact address stays private until you confirm a viewing.</span>
              </li>
            </ul>
            <p className="text-sm text-slate-600">Free to download. You pay only for printing.</p>
          </div>
          <div className="flex-1 w-full min-w-0 relative pb-16 sm:pb-20 pr-6 sm:pr-16">
            <img
              src="/sign-preview-lawn.webp"
              alt="The OwnersMarket lawn sign: For sale by owner, with a QR code to scan for photos, price and to book a viewing"
              width={1200}
              height={900}
              loading="lazy"
              className="w-full h-auto rounded-md shadow-lg ring-1 ring-slate-200"
            />
            <img
              src="/sign-preview-window.webp"
              alt="The OwnersMarket window sign"
              width={560}
              height={725}
              loading="lazy"
              className="absolute right-0 bottom-0 w-[34%] h-auto rounded-md shadow-xl ring-1 ring-slate-200"
            />
          </div>
        </div>
      </section>

      {/* Who it's for */}
      <section className="bg-fern">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6 py-20 flex flex-col gap-8">
          <h2 className="font-display font-bold text-[40px] sm:text-[46px] leading-none text-slate-900">
            A good fit when your home is ready to show
          </h2>
          <ul className="grid grid-cols-1 md:grid-cols-3 gap-7">
            <li className="flex gap-3.5 items-start text-[17px] leading-normal text-slate-900">
              <CheckIcon />
              <span><b>It is move-in ready.</b> No big repairs to explain, so good photos do most of the talking.</span>
            </li>
            <li className="flex gap-3.5 items-start text-[17px] leading-normal text-slate-900">
              <CheckIcon />
              <span><b>You can open the door.</b> You are around for a few viewings on evenings or weekends.</span>
            </li>
            <li className="flex gap-3.5 items-start text-[17px] leading-normal text-slate-900">
              <CheckIcon />
              <span><b>You have a lawyer or notary.</b> They write the contract and close the sale, as with any home sale in Canada.</span>
            </li>
          </ul>
        </div>
      </section>

      {/* Guides */}
      <section className="max-w-[1240px] mx-auto px-4 sm:px-6 pt-20 sm:pt-24 flex flex-col gap-8">
        <h2 className="font-display font-bold text-[40px] sm:text-[46px] leading-none text-slate-900 max-w-[18em]">
          Free step-by-step guides
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
            <NavLink
              key={g.tab}
              to={g.tab}
              onNavigate={onNavigate}
              className="text-left rounded-[10px] border border-slate-200 hover:border-emerald-700 bg-white p-6 sm:p-7 flex flex-col gap-2.5 transition-colors"
            >
              <span className="font-display font-bold text-[28px] leading-none text-slate-900">{g.title}</span>
              <span className="text-base leading-relaxed text-slate-700">{g.text}</span>
              <span className="mt-1 font-semibold text-base text-emerald-700 underline underline-offset-4">Read the guide</span>
            </NavLink>
          ))}
        </div>
      </section>

      {/* Final call to action */}
      <section className="max-w-[1240px] mx-auto px-4 sm:px-6 py-20 sm:py-24 flex flex-col md:flex-row md:items-center gap-6">
        <h2 className="flex-1 font-display font-bold text-[48px] sm:text-[60px] leading-[0.98] text-slate-900">
          Put your sign on the lawn tonight.
        </h2>
        <button
          onClick={() => onNavigate('wizard')}
          className="self-start md:self-auto px-7 py-4 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-[17px] rounded-md cursor-pointer min-h-[52px]"
        >
          List your home
        </button>
      </section>
    </div>
  );
};
