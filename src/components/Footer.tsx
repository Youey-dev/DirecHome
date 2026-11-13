import React from 'react';
import { NavLink } from './NavLink';
import { analyticsAvailable, openCookieSettings } from '../lib/analytics';
import { PROVINCE_PAGES } from '../../netlify/edge-functions/lib/regions.ts';

const FooterLink: React.FC<{ to: string; id?: string; onNavigate: (tab: string, id?: string) => void; children: React.ReactNode }> = ({
  to,
  id,
  onNavigate,
  children,
}) => (
  <li>
    <NavLink
      to={to}
      listingId={id}
      onNavigate={onNavigate}
      className="inline-flex items-center text-left text-slate-900 hover:text-emerald-700 underline-offset-4 hover:underline transition-colors min-h-[32px]"
    >
      {children}
    </NavLink>
  </li>
);

export const Footer: React.FC<{ onNavigate: (tab: string, id?: string) => void }> = ({ onNavigate }) => {
  return (
    <footer className="bg-white text-slate-600 text-sm mt-24">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6">
      <div className="pt-12 pb-10 border-t border-hairline">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr] gap-10">
          <div className="space-y-4">
            <div className="flex items-center gap-2.5">
              <img src="/logo.png" alt="" width={26} height={26} className="w-[26px] h-[26px]" />
              <span className="font-semibold text-[18px] tracking-[-0.01em] leading-none text-slate-900">OwnersMarket</span>
            </div>
            <p className="leading-relaxed max-w-[36em]">
              OwnersMarket is an advertising platform, not a real estate brokerage, and does not give real estate advice. Every listing is reviewed before publishing; ownership is not verified. Buyers and sellers should talk to their own lawyer or notary before signing anything.
            </p>
            <p className="leading-relaxed max-w-[36em]">
              No commission. A flat $24.99 a month per active listing. Exact addresses stay private until the owner confirms a viewing, unless the owner chooses to show them.
            </p>
          </div>

          <nav aria-label="Marketplace">
            <ul className="space-y-2">
              <FooterLink to="browse" onNavigate={onNavigate}>Browse homes</FooterLink>
              <FooterLink to="wizard" onNavigate={onNavigate}>List your home</FooterLink>
              <FooterLink to="calculator" onNavigate={onNavigate}>Savings estimator</FooterLink>
              <FooterLink to="how-it-works" onNavigate={onNavigate}>How it works</FooterLink>
              <FooterLink to="pricing" onNavigate={onNavigate}>Pricing</FooterLink>
              <FooterLink to="regions" onNavigate={onNavigate}>For sale by owner by province</FooterLink>
              <FooterLink to="about" onNavigate={onNavigate}>About and contact</FooterLink>
              <FooterLink to="guides" onNavigate={onNavigate}>All seller guides</FooterLink>
              <FooterLink to="guide-selling" onNavigate={onNavigate}>Selling without a realtor</FooterLink>
              <FooterLink to="guide-bc" onNavigate={onNavigate}>Selling without a realtor in BC</FooterLink>
              <FooterLink to="guide-buying" onNavigate={onNavigate}>Buying a house for sale by owner</FooterLink>
              <FooterLink to="dashboard" onNavigate={onNavigate}>My dashboard and messages</FooterLink>
            </ul>
          </nav>

          {/* Every province page, so search engines (and people) can reach them from any page */}
          <nav aria-label="For sale by owner by province">
            <ul className="space-y-2">
              {PROVINCE_PAGES.map((p) => (
                <FooterLink key={p.slug} to="province" id={p.slug} onNavigate={onNavigate}>
                  For sale by owner in {p.name}
                </FooterLink>
              ))}
            </ul>
          </nav>

          <nav aria-label="Legal">
            <ul className="space-y-2">
              <FooterLink to="terms" onNavigate={onNavigate}>Terms of use</FooterLink>
              <FooterLink to="privacy" onNavigate={onNavigate}>Privacy policy</FooterLink>
              <FooterLink to="rules" onNavigate={onNavigate}>Community and listing rules</FooterLink>
              <FooterLink to="cashback" onNavigate={onNavigate}>How cash back works</FooterLink>
              <FooterLink to="notifications" onNavigate={onNavigate}>Email preferences (CASL)</FooterLink>
              {analyticsAvailable && (
                <li>
                  <button type="button" onClick={openCookieSettings} className="text-sm text-slate-900 hover:text-emerald-700 underline-offset-2 hover:underline min-h-[32px]">
                    Cookie settings
                  </button>
                </li>
              )}
            </ul>
          </nav>
        </div>

        <div className="mt-12 pt-6 border-t border-hairline text-[13px] text-slate-600 flex flex-col sm:flex-row sm:justify-between gap-2">
          <span>© {new Date().getFullYear()} OwnersMarket. Made in British Columbia.</span>
          <span>
            Questions?{' '}
            <a href="mailto:hello@ownersmarket.ca" className="text-slate-900 hover:text-emerald-700 underline underline-offset-2">
              hello@ownersmarket.ca
            </a>
          </span>
        </div>
      </div>
      </div>
    </footer>
  );
};
