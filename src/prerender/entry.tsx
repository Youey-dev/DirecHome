/**
 * Pre-built page HTML for search engines and link previews.
 *
 * At publish time (scripts/prerender.mjs) each public content page below is rendered to plain
 * HTML. The Netlify edge function (link-previews.ts) puts it inside <div id="root"> when the
 * page is requested, so crawlers that don't run JavaScript still see the full text and links.
 * In a browser, the app starts as usual and replaces it.
 *
 * Only pages that need no account, database or browser APIs to draw are listed here.
 */
import React from 'react';
import { renderToString } from 'react-dom/server';
import { LandingPage } from '../pages/LandingPage';
import { HowItWorksPage } from '../pages/HowItWorksPage';
import { GuidePage } from '../pages/GuidePage';
import { SavingsCalculator } from '../components/SavingsCalculator';
import { BC_SELLER_GUIDE, BUYER_GUIDE, SELLER_GUIDE } from '../data/guides';
import { TAB_PATHS } from '../lib/routes';

const noop = () => {};

const NAV: [string, string][] = [
  ['/browse', 'Browse homes'],
  ['/sell', 'List your home'],
  ['/how-it-works', 'How it works'],
  ['/calculator', 'Savings estimator'],
  ['/guides/selling-your-home', 'Selling without a realtor'],
  ['/guides/buying-a-home', 'Buying a home for sale by owner'],
  ['/about', 'About and contact'],
];

/** A plain header and footer so crawlers can follow links between pages. */
const Shell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="min-h-screen flex flex-col bg-white text-slate-900">
    <header className="border-b border-slate-200">
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 h-[68px] flex items-center gap-6">
        <a href="/" className="font-display font-bold text-[26px] leading-none text-slate-900">
          OwnersMarket
        </a>
        <nav aria-label="Main" className="hidden lg:flex gap-5 text-sm text-slate-600">
          {NAV.slice(0, 4).map(([href, label]) => (
            <a key={href} href={href}>
              {label}
            </a>
          ))}
        </nav>
      </div>
    </header>
    <main className="flex-1">{children}</main>
    <footer className="bg-slate-900 text-slate-200">
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 py-10 flex flex-col gap-4 text-sm">
        <p>OwnersMarket is an advertising platform, not a real estate brokerage, and does not give real estate advice.</p>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2">
          {[...NAV, ['/terms', 'Terms of use'], ['/privacy', 'Privacy policy'], ['/rules', 'Community and listing rules']].map(([href, label]) => (
            <a key={href} href={href} className="underline-offset-2 hover:underline">
              {label}
            </a>
          ))}
        </nav>
      </div>
    </footer>
  </div>
);

const PAGES: Record<string, () => React.ReactElement> = {
  [TAB_PATHS.landing]: () => (
    <LandingPage listings={[]} savedIds={[]} onToggleFavorite={noop} onSelectListing={noop} onNavigate={noop} onSearch={noop} />
  ),
  [TAB_PATHS['how-it-works']]: () => <HowItWorksPage onNavigate={noop} />,
  [TAB_PATHS.calculator]: () => (
    <div className="max-w-[1000px] mx-auto px-4 sm:px-6 py-8">
      <div className="mb-6">
        <h1 className="font-display text-5xl font-bold text-slate-900 leading-none">Real estate commission calculator</h1>
        <p className="text-base text-slate-600 mt-3 max-w-[40em]">
          Estimate what you could save using an example commission rate, and how much closing cash back you could offer. Commission rates vary
          by province and are negotiable. All figures are estimates.
        </p>
      </div>
      <SavingsCalculator onApplyToListing={noop} />
    </div>
  ),
  [TAB_PATHS['guide-selling']]: () => <GuidePage guide={SELLER_GUIDE} onNavigate={noop} />,
  [TAB_PATHS['guide-bc']]: () => <GuidePage guide={BC_SELLER_GUIDE} onNavigate={noop} />,
  [TAB_PATHS['guide-buying']]: () => <GuidePage guide={BUYER_GUIDE} onNavigate={noop} />,
};

export const PRERENDER_PATHS = Object.keys(PAGES);

export function render(path: string): string | null {
  const page = PAGES[path];
  return page ? renderToString(<Shell>{page()}</Shell>) : null;
}
