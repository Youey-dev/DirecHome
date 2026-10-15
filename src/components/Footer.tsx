import React from 'react';

const FooterLink: React.FC<{ onClick: () => void; children: React.ReactNode }> = ({ onClick, children }) => (
  <li>
    <button
      onClick={onClick}
      className="text-left text-white hover:text-sign underline-offset-4 hover:underline transition-colors cursor-pointer min-h-[32px]"
    >
      {children}
    </button>
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
              <span className="font-display font-bold text-[28px] leading-none text-white">DirectHome Canada</span>
            </div>
            <p className="leading-relaxed max-w-[36em]">
              DirectHome is an advertising platform, not a real estate brokerage, and does not give real estate advice. Every listing is reviewed before publishing; ownership is not verified. Buyers and sellers should talk to their own lawyer or notary before signing anything.
            </p>
            <p className="leading-relaxed max-w-[36em]">
              No commission. A flat $25 a month per active listing. Exact addresses stay private until the owner confirms a viewing.
            </p>
          </div>

          <nav aria-label="Marketplace">
            <ul className="space-y-2">
              <FooterLink onClick={() => onNavigate('browse')}>Browse homes</FooterLink>
              <FooterLink onClick={() => onNavigate('wizard')}>List your home</FooterLink>
              <FooterLink onClick={() => onNavigate('calculator')}>Savings estimator</FooterLink>
              <FooterLink onClick={() => onNavigate('how-it-works')}>How it works</FooterLink>
              <FooterLink onClick={() => onNavigate('dashboard')}>My dashboard and messages</FooterLink>
            </ul>
          </nav>

          <nav aria-label="Legal">
            <ul className="space-y-2">
              <FooterLink onClick={() => onNavigate('terms')}>Terms of use</FooterLink>
              <FooterLink onClick={() => onNavigate('privacy')}>Privacy policy</FooterLink>
              <FooterLink onClick={() => onNavigate('rules')}>Community and listing rules</FooterLink>
              <FooterLink onClick={() => onNavigate('cashback')}>How cash back works</FooterLink>
              <FooterLink onClick={() => onNavigate('notifications')}>Email preferences (CASL)</FooterLink>
            </ul>
          </nav>
        </div>

        <div className="mt-12 pt-6 border-t border-slate-700 text-xs text-slate-400">
          © {new Date().getFullYear()} DirectHome Canada. Made in British Columbia.
        </div>
      </div>
    </footer>
  );
};
