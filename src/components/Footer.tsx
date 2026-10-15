import React from 'react';
import { NavLink } from './NavLink';

const FooterLink: React.FC<{ to: string; onNavigate: (tab: string) => void; children: React.ReactNode }> = ({
  to,
  onNavigate,
  children,
}) => (
  <li>
    <NavLink
      to={to}
      onNavigate={onNavigate}
      className="inline-flex items-center text-left text-white hover:text-sign underline-offset-4 hover:underline transition-colors min-h-[32px]"
    >
      {children}
    </NavLink>
  </li>
);

export const Footer: React.FC<{ onNavigate: (tab: string) => void }> = ({ onNavigate }) => {
  return (
    <footer className="bg-slate-900 text-slate-300 text-sm mt-20">
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 py-14">
        <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr] gap-10">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="w-11 h-11 rounded-md bg-white flex items-center justify-center shrink-0">
                <img src="/logo.png" alt="" width={36} height={36} className="w-9 h-9" />
              </span>
              <span className="font-display font-bold text-[28px] leading-none text-white">OwnersMarket</span>
            </div>
            <p className="leading-relaxed max-w-[36em]">
              OwnersMarket is an advertising platform, not a real estate brokerage, and does not give real estate advice. Every listing is reviewed before publishing; ownership is not verified. Buyers and sellers should talk to their own lawyer or notary before signing anything.
            </p>
            <p className="leading-relaxed max-w-[36em]">
              No commission. A flat $24.99 a month per active listing. Exact addresses stay private until the owner confirms a viewing.
            </p>
          </div>

          <nav aria-label="Marketplace">
            <ul className="space-y-2">
              <FooterLink to="browse" onNavigate={onNavigate}>Browse homes</FooterLink>
              <FooterLink to="wizard" onNavigate={onNavigate}>List your home</FooterLink>
              <FooterLink to="calculator" onNavigate={onNavigate}>Savings estimator</FooterLink>
              <FooterLink to="how-it-works" onNavigate={onNavigate}>How it works</FooterLink>
              <FooterLink to="guide-selling" onNavigate={onNavigate}>Selling without a realtor</FooterLink>
              <FooterLink to="guide-bc" onNavigate={onNavigate}>Selling without a realtor in BC</FooterLink>
              <FooterLink to="guide-buying" onNavigate={onNavigate}>Buying a house for sale by owner</FooterLink>
              <FooterLink to="dashboard" onNavigate={onNavigate}>My dashboard and messages</FooterLink>
            </ul>
          </nav>

          <nav aria-label="Legal">
            <ul className="space-y-2">
              <FooterLink to="terms" onNavigate={onNavigate}>Terms of use</FooterLink>
              <FooterLink to="privacy" onNavigate={onNavigate}>Privacy policy</FooterLink>
              <FooterLink to="rules" onNavigate={onNavigate}>Community and listing rules</FooterLink>
              <FooterLink to="cashback" onNavigate={onNavigate}>How cash back works</FooterLink>
              <FooterLink to="notifications" onNavigate={onNavigate}>Email preferences (CASL)</FooterLink>
            </ul>
          </nav>
        </div>

        <div className="mt-12 pt-6 border-t border-slate-700 text-xs text-slate-400">
          © {new Date().getFullYear()} OwnersMarket. Made in British Columbia.
        </div>
      </div>
    </footer>
  );
};
