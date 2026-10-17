import React from 'react';
import { CASHBACK_LENDER_NOTICE, CONTRACT_NOTICE } from '../lib/legalText';
import { LISTING_FEE_LABEL } from '../lib/commissionCalc';
import { NavLink } from '../components/NavLink';
import {
  BellRing,
  Camera,
  CheckCircle2,
  ClipboardCheck,
  EyeOff,
  FileText,
  Globe2,
  KeyRound,
  LayoutGrid,
  MessageSquare,
  QrCode,
  Search,
  Share2,
  ShieldCheck,
  TrendingUp,
  XCircle,
} from 'lucide-react';

interface HowItWorksPageProps {
  onNavigate: (tab: string) => void;
}

const Feature: React.FC<{ icon: React.ReactNode; title: string; children: React.ReactNode }> = ({ icon, title, children }) => (
  <li className="flex gap-4 items-start">
    <span className="w-10 h-10 shrink-0 rounded-lg bg-white ring-1 ring-emerald-200 text-emerald-800 flex items-center justify-center">{icon}</span>
    <span className="text-[16px] leading-relaxed text-slate-700">
      <b className="block text-slate-900 text-[17px]">{title}</b>
      {children}
    </span>
  </li>
);

/** A small drawing of the one-page feature sheet (the real one is made from the listing). */
const FeatureSheetMock: React.FC = () => (
  <div
    aria-hidden="true"
    className="bg-white rounded-md shadow-lg ring-1 ring-slate-200 p-4 flex flex-col gap-2.5 aspect-[8.5/11] w-full"
  >
    <div className="flex justify-between items-center">
      <span className="font-display font-bold text-emerald-700 text-[15px]">OwnersMarket</span>
    </div>
    <div className="rounded bg-[linear-gradient(160deg,#BCD3C3,#6A9476)] h-[34%]" />
    <div className="grid grid-cols-3 gap-1.5 h-[11%]">
      <div className="rounded bg-emerald-100" />
      <div className="rounded bg-slate-200" />
      <div className="rounded bg-emerald-200" />
    </div>
    <div className="font-display font-bold text-[clamp(16px,4.5vw,24px)] leading-none text-slate-900">$849,000</div>
    <div className="text-[10px] text-slate-600">3 bed · 2 bath · 1,640 sq ft</div>
    <div className="flex flex-col gap-1">
      <div className="h-1.5 rounded bg-slate-200 w-full" />
      <div className="h-1.5 rounded bg-slate-200 w-5/6" />
      <div className="h-1.5 rounded bg-slate-200 w-4/6" />
    </div>
    <div className="mt-auto flex items-end justify-between gap-2">
      <span className="text-[9px] leading-tight text-slate-600 max-w-[60%]">Scan for all photos and to book a viewing</span>
      <QrCode className="w-10 h-10 sm:w-12 sm:h-12 shrink-0 text-slate-900" strokeWidth={1.4} />
    </div>
  </div>
);

const STEPS: { title: string; text: string; icon: React.ReactNode }[] = [
  {
    title: 'Create your listing',
    text: 'Add 10 to 40 photos from your phone and the basics: price, rooms, size and taxes. Most owners finish in about 15 minutes, and your progress saves as you go.',
    icon: <Camera className="w-5 h-5" />,
  },
  {
    title: 'Quick review',
    text: 'We check every listing for spam, scams and anything inappropriate, usually within a day. If something needs changing, we tell you what.',
    icon: <ShieldCheck className="w-5 h-5" />,
  },
  {
    title: 'Go live',
    text: `Start your ${LISTING_FEE_LABEL} monthly plan. Your home appears on OwnersMarket right away. Cancel any time; it stays up until the end of the month you paid for.`,
    icon: <Globe2 className="w-5 h-5" />,
  },
  {
    title: 'Get the word out',
    text: 'Download your lawn sign, window sign and feature sheet, each with a QR code to your listing. Share your listing link with friends, neighbours and local groups.',
    icon: <QrCode className="w-5 h-5" />,
  },
  {
    title: 'Show your home',
    text: 'Buyers message you and request viewing times. You accept the ones that suit you. Your exact address is only shared once you confirm a viewing.',
    icon: <KeyRound className="w-5 h-5" />,
  },
  {
    title: 'Offer and closing',
    text: 'When a buyer makes an offer, your lawyer or notary takes it from there. Mark your listing sold in your dashboard when it’s done.',
    icon: <ClipboardCheck className="w-5 h-5" />,
  },
];

const FAQ: { q: string; a: React.ReactNode }[] = [
  {
    q: 'Is OwnersMarket a licensed real estate brokerage?',
    a: 'No. OwnersMarket is an advertising website. We don’t represent buyers or sellers, we don’t advise on prices or negotiation, and we don’t hold deposits. Contracts and closings happen between the buyer and seller, each with their own lawyer or notary.',
  },
  {
    q: 'Who will see my listing?',
    a: 'Anyone browsing OwnersMarket, in search results and on the map (which shows an approximate location, not your address). Your listing also has its own page that search engines like Google can find, and a link you can share anywhere. How many people see it depends on your area, your price and how widely you share it; we can’t promise a number of buyers.',
  },
  {
    q: 'Is my home on MLS?',
    a: 'No. MLS is the system real estate agents use, and only licensed agents can list homes on it. Your home is listed on OwnersMarket, and your signs, feature sheet and shared link bring buyers to it.',
  },
  {
    q: 'Where do I print the signs and feature sheet?',
    a: 'Download them from your dashboard once your listing is live. The lawn sign (24 × 18 in) can be printed on corrugated plastic with a wire stake at most print and copy shops. The window sign and feature sheet print on regular letter-size paper at home. The downloads are free; you only pay for printing.',
  },
  {
    q: 'How does the buyer receive cash back?',
    a: (
      <>
        If the buyer and seller agree to cash back, it must be written into the purchase contract. {CONTRACT_NOTICE} How the credit is applied at
        completion is handled by their lawyers or notaries. {CASHBACK_LENDER_NOTICE}
      </>
    ),
  },
  {
    q: 'What if a buyer has their own agent?',
    a: 'That agent may ask you to pay their commission. You can agree, negotiate an amount, or only deal with buyers who don’t have an agent. It’s your choice, and it’s best to decide before your first viewing.',
  },
  {
    q: 'Can I cancel?',
    a: 'Yes, any time, from your dashboard. Your listing stays up until the end of the month you paid for. There’s no commission or fee when you sell.',
  },
];

export const HowItWorksPage: React.FC<HowItWorksPageProps> = ({ onNavigate }) => {
  return (
    <div className="text-slate-900">
      {/* Intro */}
      <section className="max-w-[1100px] mx-auto px-4 sm:px-6 pt-12 sm:pt-16 pb-12 flex flex-col gap-5">
        <p className="text-sm font-bold text-emerald-700">How OwnersMarket works</p>
        <h1 className="font-display font-bold text-[44px] sm:text-[60px] leading-[0.95] max-w-[14em]">
          Everything you need to sell it yourself, for {LISTING_FEE_LABEL} a month
        </h1>
        <p className="text-lg text-slate-700 leading-relaxed max-w-[38em]">
          Your home gets its own listing on OwnersMarket, signs and a feature sheet with a QR code that sends people straight to it, and the tools
          to handle buyers yourself. No commission, and you stay in charge from first photo to keys.
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
      </section>

      {/* 1. Exposure */}
      <section className="bg-white border-y border-slate-200">
        <div className="max-w-[1100px] mx-auto px-4 sm:px-6 py-16 sm:py-20 grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          <div className="flex flex-col gap-4">
            <p className="text-sm font-bold text-emerald-700">1 · Exposure</p>
            <h2 className="font-display font-bold text-[38px] sm:text-[44px] leading-none">Your home, in front of buyers</h2>
            <p className="text-[17px] text-slate-700 leading-relaxed">
              Your listing is built around your photos, so buyers can get a real feel for the home before they ask to see it.
            </p>
          </div>
          <ul className="flex flex-col gap-6">
            <Feature icon={<LayoutGrid className="w-5 h-5" />} title="A full listing page">
              Up to 40 photos, price, rooms, size, taxes and strata fees, upgrades, what’s included and notes on the neighbourhood.
            </Feature>
            <Feature icon={<Search className="w-5 h-5" />} title="Found in search and on the map">
              Buyers find you by city, neighbourhood, postal code, price and home type. The map shows an approximate location, never your address.
            </Feature>
            <Feature icon={<Globe2 className="w-5 h-5" />} title="Its own page on the web">
              Each listing has its own address that search engines like Google can find, and a good-looking preview when it’s shared on Facebook or
              by text.
            </Feature>
            <Feature icon={<Share2 className="w-5 h-5" />} title="Easy to share">
              Send your link to friends, family, neighbours and local buy-and-sell groups. Shared links are often how private sales find their buyer.
            </Feature>
            <Feature icon={<TrendingUp className="w-5 h-5" />} title="See the interest">
              Your dashboard shows how many people viewed and saved your listing, and how many got in touch.
            </Feature>
          </ul>
        </div>
      </section>

      {/* 2. Marketing materials */}
      <section className="max-w-[1100px] mx-auto px-4 sm:px-6 py-16 sm:py-20 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        <div className="order-2 lg:order-1 flex flex-col gap-5">
          <figure className="flex flex-col gap-2">
            <img
              src="/sign-preview-lawn.webp"
              alt="The OwnersMarket lawn sign: For sale by owner, with a QR code to the listing"
              width={1200}
              height={900}
              loading="lazy"
              className="w-full h-auto rounded-md shadow-lg ring-1 ring-slate-200"
            />
            <figcaption className="text-sm text-slate-600">Lawn sign</figcaption>
          </figure>
          <div className="grid grid-cols-2 gap-5 items-end">
            <figure className="flex flex-col gap-2">
              <img
                src="/sign-preview-window.webp"
                alt="The OwnersMarket window sign"
                width={560}
                height={725}
                loading="lazy"
                className="w-full h-auto rounded-md shadow-lg ring-1 ring-slate-200"
              />
              <figcaption className="text-sm text-slate-600">Window sign</figcaption>
            </figure>
            <figure className="flex flex-col gap-2">
              <FeatureSheetMock />
              <figcaption className="text-sm text-slate-600">Feature sheet</figcaption>
            </figure>
          </div>
        </div>
        <div className="flex flex-col gap-4 order-1 lg:order-2">
          <p className="text-sm font-bold text-emerald-700">2 · Marketing materials</p>
          <h2 className="font-display font-bold text-[38px] sm:text-[44px] leading-none">Signs and a feature sheet, ready to print</h2>
          <p className="text-[17px] text-slate-700 leading-relaxed">
            Made from your listing in one click. Each one has a QR code: people scan it with their phone camera and land on your photos, price and
            the button to book a viewing.
          </p>
          <ul className="flex flex-col gap-6 pt-2">
            <Feature icon={<QrCode className="w-5 h-5" />} title="Lawn sign, 24 × 18 in">
              For everyone who walks or drives past. Print it on corrugated plastic with a wire stake at a print shop.
            </Feature>
            <Feature icon={<QrCode className="w-5 h-5" />} title="Window sign, letter size">
              For a front window, a condo lobby or a community board. Print it at home.
            </Feature>
            <Feature icon={<FileText className="w-5 h-5" />} title="Feature sheet, one page">
              Your best photos, price and key facts, to hand out at viewings or leave on the kitchen counter during an open house.
            </Feature>
            <Feature icon={<EyeOff className="w-5 h-5" />} title="No phone number, no street address">
              Buyers reach you through OwnersMarket, so your number stays private and you only share the address once you confirm a viewing.
            </Feature>
          </ul>
          <p className="text-sm text-slate-600">Included with every live listing. Free to download; you only pay for printing.</p>
        </div>
      </section>

      {/* 3. Tools */}
      <section className="bg-fern">
        <div className="max-w-[1100px] mx-auto px-4 sm:px-6 py-16 sm:py-20 flex flex-col gap-10">
          <div className="flex flex-col gap-4 max-w-[40em]">
            <p className="text-sm font-bold text-emerald-700">3 · Tools to run your sale</p>
            <h2 className="font-display font-bold text-[38px] sm:text-[44px] leading-none">Handle buyers on your own terms</h2>
          </div>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-7">
            <Feature icon={<MessageSquare className="w-5 h-5" />} title="Messages and viewing requests">
              Buyers write to you and request times. You accept, decline or suggest another time, all in one place.
            </Feature>
            <Feature icon={<BellRing className="w-5 h-5" />} title="Email when something happens">
              We email you when a buyer messages you or asks for a viewing, so you don’t miss anyone. You can turn these emails off.
            </Feature>
            <Feature icon={<ClipboardCheck className="w-5 h-5" />} title="A seller checklist">
              Ten steps from hiring your lawyer to handling offers, ticked off as you go, with links to our free guides.
            </Feature>
            <Feature icon={<CheckCircle2 className="w-5 h-5" />} title="Tips to improve your listing">
              While you create your listing, we point out what buyers usually ask about, like taxes, strata fees or a missing photo.
            </Feature>
            <Feature icon={<TrendingUp className="w-5 h-5" />} title="Optional cash back for the buyer">
              You can offer part of what you save on commission as cash back at closing. It’s your choice and paid by you, and it’s written into
              the contract by the lawyers.
            </Feature>
            <Feature icon={<ShieldCheck className="w-5 h-5" />} title="Reviewed listings and a report button">
              Every listing is reviewed before it goes live, and anyone can report a listing that looks wrong.
            </Feature>
          </ul>
        </div>
      </section>

      {/* Steps */}
      <section className="max-w-[1100px] mx-auto px-4 sm:px-6 py-16 sm:py-20 flex flex-col gap-10">
        <h2 className="font-display font-bold text-[38px] sm:text-[44px] leading-none">From listing to sold</h2>
        <ol className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-10">
          {STEPS.map((s, i) => (
            <li key={s.title} className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <span className="font-display font-bold text-[40px] leading-none text-sign [-webkit-text-stroke:1px_#16261D]">{i + 1}</span>
                <span className="w-9 h-9 rounded-full bg-emerald-700 text-white flex items-center justify-center">{s.icon}</span>
              </div>
              <h3 className="font-bold text-[19px]">{s.title}</h3>
              <p className="text-[16px] text-slate-700 leading-relaxed">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* What we don't do */}
      <section className="bg-white border-y border-slate-200">
        <div className="max-w-[1100px] mx-auto px-4 sm:px-6 py-16 grid grid-cols-1 lg:grid-cols-[1fr_1.4fr] gap-10">
          <div className="flex flex-col gap-4">
            <h2 className="font-display font-bold text-[38px] sm:text-[44px] leading-none">What OwnersMarket doesn’t do</h2>
            <p className="text-[17px] text-slate-700 leading-relaxed">
              We’re an advertising site, not a real estate brokerage. If you want someone to do these for you, a full-service agent is the better fit.
            </p>
          </div>
          <ul className="flex flex-col gap-4 text-[16px] text-slate-700">
            {[
              'Set or advise on your price. Your assessment and recent sales nearby are the place to start; our seller guide shows how.',
              'Negotiate with buyers or handle offers, contracts or deposits. Your lawyer or notary does that.',
              'Put your home on MLS, the agents’ system.',
              'Verify ownership. Buyers should confirm the title with their lawyer or notary before any deal.',
              'Promise a number of buyers or a sale date.',
            ].map((t) => (
              <li key={t} className="flex gap-3 items-start">
                <XCircle className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Comparison */}
      <section className="max-w-[1100px] mx-auto px-4 sm:px-6 py-16 sm:py-20 flex flex-col gap-6">
        <h2 className="font-display font-bold text-[38px] sm:text-[44px] leading-none">Listing with an agent vs. listing on OwnersMarket</h2>
        <div className="overflow-x-auto bg-white rounded-[10px] border border-slate-200">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="py-3 px-4 font-semibold"> </th>
                <th className="py-3 px-4 font-semibold">Listing with an agent</th>
                <th className="py-3 px-4 font-bold text-emerald-800 bg-emerald-50">OwnersMarket</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {[
                ['What you pay', 'A commission when it sells. It varies by brokerage and is negotiable', `${LISTING_FEE_LABEL} a month per active listing, no commission`],
                ['Where buyers find it', 'MLS and the sites that show MLS listings', 'OwnersMarket, search engines, your signs, feature sheet and shared link'],
                ['Contact with the owner', 'Usually through the listing agent', 'Buyers message the owner directly'],
                ['Viewings', 'Booked and hosted by the agent', 'You choose the times and show the home'],
                ['For-sale sign', 'The brokerage’s sign, with the agent’s name and number', 'Free printable lawn and window signs with a QR code to your listing'],
                ['Pricing and negotiation', 'The agent advises and negotiates', 'You decide, with your own research and your lawyer'],
                ['Cash back to the buyer', 'Not usually offered', 'Optional, set by each seller'],
                ['Contract and closing', 'Prepared by the parties’ agents and lawyers or notaries', 'Prepared by your own lawyer or notary (OwnersMarket provides no contracts)'],
              ].map(([label, agent, om]) => (
                <tr key={label}>
                  <td className="py-3 px-4 font-semibold text-slate-900">{label}</td>
                  <td className="py-3 px-4">{agent}</td>
                  <td className="py-3 px-4 font-semibold text-emerald-800 bg-emerald-50/60">{om}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-sm text-slate-600">
          If your buyer uses an agent, that agent may ask you to pay their commission. Commissions vary by province and are always negotiable.
        </p>
      </section>

      {/* FAQ */}
      <section className="bg-white border-t border-slate-200">
        <div className="max-w-[900px] mx-auto px-4 sm:px-6 py-16 flex flex-col gap-6">
          <h2 className="font-display font-bold text-[38px] sm:text-[44px] leading-none">Questions people ask</h2>
          <div className="flex flex-col divide-y divide-slate-200 border-y border-slate-200">
            {FAQ.map((f) => (
              <details key={f.q} className="group py-4">
                <summary className="cursor-pointer list-none flex justify-between gap-4 font-semibold text-[17px] text-slate-900">
                  {f.q}
                  <span className="text-emerald-700 group-open:rotate-45 transition-transform text-2xl leading-none" aria-hidden="true">
                    +
                  </span>
                </summary>
                <p className="pt-3 text-[16px] text-slate-700 leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
          <p className="text-sm text-slate-600">
            More detail in our free guides:{' '}
            <NavLink to="guide-selling" onNavigate={onNavigate} className="text-emerald-700 underline underline-offset-2">
              selling without a realtor
            </NavLink>{' '}
            and{' '}
            <NavLink to="guide-buying" onNavigate={onNavigate} className="text-emerald-700 underline underline-offset-2">
              buying a home for sale by owner
            </NavLink>
            .
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-[1100px] mx-auto px-4 sm:px-6 py-16">
        <div className="rounded-[10px] bg-emerald-900 text-white p-8 sm:p-12 flex flex-col md:flex-row md:items-center gap-6">
          <div className="flex-1 flex flex-col gap-2">
            <h2 className="font-display font-bold text-[34px] sm:text-[40px] leading-none">Ready to list your home?</h2>
            <p className="text-emerald-100 text-[16px]">
              Most owners finish in about 15 minutes. Every listing gets a quick review before it goes live, and your signs and feature sheet are
              ready the moment it does.
            </p>
          </div>
          <button
            onClick={() => onNavigate('wizard')}
            className="px-6 py-3.5 bg-white text-emerald-950 font-semibold rounded-md hover:bg-emerald-50 cursor-pointer min-h-[48px] shrink-0"
          >
            List your home
          </button>
        </div>
      </section>
    </div>
  );
};
