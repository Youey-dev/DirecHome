import React from 'react';
import {
  BellRing,
  CheckCircle2,
  Globe2,
  KeyRound,
  LayoutGrid,
  MessageSquare,
  QrCode,
  Search,
  TrendingUp,
} from 'lucide-react';
import { NavLink } from '../components/NavLink';
import { calculateBCCommission, formatCAD, formatCADCents, LISTING_FEE_CAD_PER_MONTH, LISTING_FEE_LABEL } from '../lib/commissionCalc';

interface PricingPageProps {
  onNavigate: (tab: string) => void;
}

/** Example used in the comparison; the same one the homepage and savings estimator use. */
const EXAMPLE_PRICE = 750000;
const EXAMPLE_MONTHS = 3;

const INCLUDED: { icon: React.ReactNode; title: string; text: string }[] = [
  {
    icon: <LayoutGrid className="w-5 h-5" />,
    title: 'A full listing page',
    text: 'Up to 40 photos, your price, rooms, size, taxes and strata fees, upgrades, what’s included and notes on the neighbourhood.',
  },
  {
    icon: <Search className="w-5 h-5" />,
    title: 'Found in search and on the map',
    text: 'Buyers find your home by city, neighbourhood, postal code, price and home type. The map shows an approximate location.',
  },
  {
    icon: <Globe2 className="w-5 h-5" />,
    title: 'Its own page on the web',
    text: 'A link search engines like Google can find, with a good-looking preview when you share it by text, email or on social media.',
  },
  {
    icon: <QrCode className="w-5 h-5" />,
    title: 'Free printable signs',
    text: 'A lawn sign, a window sign and a feature sheet, each with a QR code that takes people straight to your listing. You only pay for printing.',
  },
  {
    icon: <MessageSquare className="w-5 h-5" />,
    title: 'Messages and viewing requests',
    text: 'Buyers write to you in one inbox and request viewing times. You accept the ones that suit you.',
  },
  {
    icon: <KeyRound className="w-5 h-5" />,
    title: 'Your address stays private',
    text: 'Your exact address is shared only once you confirm a viewing, unless you choose to show it on your listing.',
  },
  {
    icon: <BellRing className="w-5 h-5" />,
    title: 'Email alerts',
    text: 'We email you when a buyer messages you or asks for a viewing, so you don’t miss anyone.',
  },
  {
    icon: <TrendingUp className="w-5 h-5" />,
    title: 'See the interest',
    text: 'Your dashboard shows how many people viewed and saved your listing, and how many got in touch.',
  },
];

const BILLING: { title: string; text: string }[] = [
  {
    title: 'Create your listing for free',
    text: 'Add your photos and details and preview your listing at no cost. You only pay once it has been reviewed and approved, usually within a day.',
  },
  {
    title: 'Billed monthly through Stripe',
    text: `Activating your listing starts a ${LISTING_FEE_LABEL} monthly plan, paid by card through Stripe. Your card details go to Stripe and never reach us.`,
  },
  {
    title: 'Cancel any time',
    text: 'Cancel from your dashboard whenever you like. Your listing stays up until the end of the month you paid for, and you won’t be charged again.',
  },
  {
    title: 'Nothing to pay when it sells',
    text: 'No commission and no success fee. When you sell, mark your listing sold and your plan ends.',
  },
  {
    title: 'One plan per listing',
    text: `Selling more than one property? Each listing has its own ${LISTING_FEE_LABEL} monthly plan, so you can cancel one without touching the others.`,
  },
  {
    title: 'Have a promo code?',
    text: 'Enter it on the payment page when you activate your listing.',
  },
];

const FAQ: { q: string; a: string }[] = [
  {
    q: 'Does OwnersMarket take a commission when my home sells?',
    a: `No. You pay a flat ${LISTING_FEE_LABEL} a month while your listing is up, and nothing when it sells. The fee doesn’t depend on your price or whether your home sells.`,
  },
  {
    q: 'What else will I pay to sell my home?',
    a: 'You’ll hire your own lawyer or notary for the contract and closing, as with any home sale. If your buyer uses an agent, that agent may ask you to pay their commission; you can decide up front whether to welcome agents and what you’d pay. Printing your sign is up to you.',
  },
  {
    q: 'What happens if a payment fails?',
    a: 'Your listing is hidden from buyers a day after a failed payment, until the payment goes through. You can update your card from your dashboard.',
  },
  {
    q: 'Do I pay to create or preview my listing?',
    a: 'No. You can create your listing, add photos and preview it for free. You only pay when you activate it after it has been approved.',
  },
];

export const PricingPage: React.FC<PricingPageProps> = ({ onNavigate }) => {
  const example = calculateBCCommission(EXAMPLE_PRICE, false);
  const exampleFees = LISTING_FEE_CAD_PER_MONTH * EXAMPLE_MONTHS;
  const exampleKeep = example.traditionalTotalCommission - exampleFees;

  return (
    <div className="text-slate-900">
      {/* Price */}
      <section className="bg-mist">
        <div className="max-w-[1100px] mx-auto px-4 sm:px-6 pt-12 sm:pt-16 pb-14 grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-10 lg:gap-14 items-center">
          <div className="flex flex-col gap-5">
            <p className="text-sm font-bold text-emerald-700">Pricing</p>
            <h1 className="font-display font-bold text-[48px] sm:text-[64px] leading-[0.95]">One flat price. No commission.</h1>
            <p className="text-lg text-slate-700 leading-relaxed max-w-[34em]">
              List your home on OwnersMarket for a flat monthly fee, with no commission when it sells. Buyers message you directly to book a
              viewing, and your own lawyer or notary handles the contract.
            </p>
            <div className="flex flex-wrap gap-3 pt-1">
              <button
                onClick={() => onNavigate('wizard')}
                className="px-6 py-3.5 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-md cursor-pointer min-h-[48px]"
              >
                List your home
              </button>
              <NavLink
                to="browse"
                onNavigate={onNavigate}
                className="px-6 py-3.5 border border-slate-300 bg-white hover:border-slate-500 font-semibold rounded-md min-h-[48px] inline-flex items-center"
              >
                Browse homes for sale
              </NavLink>
            </div>
          </div>

          <div className="bg-white rounded-[10px] border-[5px] border-emerald-700 p-7 sm:p-8 flex flex-col gap-5">
            <div className="flex flex-col gap-1">
              <span className="text-base font-semibold text-slate-700">Per active listing</span>
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span className="font-display font-bold text-[64px] sm:text-[84px] leading-none text-emerald-700">{LISTING_FEE_LABEL}</span>
                <span className="text-lg text-slate-700 whitespace-nowrap">CAD a month</span>
              </div>
            </div>
            <ul className="flex flex-col gap-3 text-[16px] text-slate-800">
              {['No commission when it sells', 'Pay only after your listing is approved', 'Cancel any time', 'Free printable lawn sign'].map((t) => (
                <li key={t} className="flex gap-3 items-start">
                  <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* What's included */}
      <section className="max-w-[1100px] mx-auto px-4 sm:px-6 py-16 sm:py-20 flex flex-col gap-10">
        <h2 className="font-display font-bold text-[38px] sm:text-[44px] leading-none">What you get</h2>
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-7">
          {INCLUDED.map((f) => (
            <li key={f.title} className="flex gap-4 items-start">
              <span className="w-10 h-10 shrink-0 rounded-lg ring-1 ring-emerald-200 text-emerald-800 flex items-center justify-center">{f.icon}</span>
              <div className="flex flex-col gap-1">
                <h3 className="font-bold text-[18px]">{f.title}</h3>
                <p className="text-[16px] text-slate-700 leading-relaxed">{f.text}</p>
              </div>
            </li>
          ))}
        </ul>
        <NavLink
          to="how-it-works"
          onNavigate={onNavigate}
          className="self-start font-semibold text-emerald-700 underline underline-offset-4 min-h-[44px] inline-flex items-center"
        >
          See how it all works
        </NavLink>
      </section>

      {/* Compared with a commission */}
      <section className="bg-white border-y border-slate-200">
        <div className="max-w-[1100px] mx-auto px-4 sm:px-6 py-16 sm:py-20 flex flex-col lg:flex-row gap-12 items-center">
          <div className="flex-1 flex flex-col gap-4 min-w-0">
            <h2 className="font-display font-bold text-[38px] sm:text-[44px] leading-none">Compared with a commission</h2>
            <p className="text-[17px] text-slate-700 leading-relaxed">
              On a {formatCAD(EXAMPLE_PRICE)} home, an example commission of 7% on the first $100,000 and 2.5% on the rest, plus 5% GST, comes to
              about {formatCAD(example.traditionalTotalCommission)}. Rates vary by province and are always negotiable, and HST provinces pay more
              tax, so treat this as an estimate.
            </p>
            <NavLink
              to="calculator"
              onNavigate={onNavigate}
              className="self-start font-semibold text-emerald-700 underline underline-offset-4 min-h-[44px] inline-flex items-center"
            >
              Estimate it with your own price
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
              <span className="font-display font-bold text-[52px] leading-none text-sign">{formatCAD(exampleKeep)}</span>
            </div>
            <span className="text-[13px] text-slate-300">
              An estimate, before your lawyer or notary fees. If your buyer uses an agent, that agent may ask you to pay their commission.
            </span>
          </div>
        </div>
      </section>

      {/* How billing works */}
      <section className="max-w-[1100px] mx-auto px-4 sm:px-6 py-16 sm:py-20 flex flex-col gap-10">
        <h2 className="font-display font-bold text-[38px] sm:text-[44px] leading-none">How billing works</h2>
        <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {BILLING.map((b) => (
            <li key={b.title} className="flex flex-col gap-2 border-t-[3px] border-emerald-700 pt-4">
              <h3 className="font-bold text-[18px]">{b.title}</h3>
              <p className="text-[16px] text-slate-700 leading-relaxed">{b.text}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* Questions */}
      <section className="bg-slate-50 border-y border-slate-200">
        <div className="max-w-[820px] mx-auto px-4 sm:px-6 py-16 sm:py-20 flex flex-col gap-2">
          <h2 className="font-display font-bold text-[38px] sm:text-[44px] leading-none mb-4">Pricing questions</h2>
          {FAQ.map((f) => (
            <div key={f.q} className="border-b border-slate-200 py-5">
              <h3 className="text-[19px] font-semibold">{f.q}</h3>
              <p className="mt-2 text-[16px] text-slate-700 leading-relaxed">{f.a}</p>
            </div>
          ))}
          <p className="pt-5 text-[15px] text-slate-600 leading-relaxed">
            OwnersMarket is an advertising site, not a real estate brokerage. Full details are in our{' '}
            <NavLink to="terms" onNavigate={onNavigate} className="text-emerald-800 underline underline-offset-2">
              Terms of use
            </NavLink>
            .
          </p>
        </div>
      </section>

      {/* Call to action */}
      <section className="max-w-[1100px] mx-auto px-4 sm:px-6 py-16 sm:py-20 flex flex-col md:flex-row md:items-center gap-6">
        <h2 className="flex-1 font-display font-bold text-[40px] sm:text-[52px] leading-[0.98]">
          Start your listing free. Pay only once it’s approved.
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
