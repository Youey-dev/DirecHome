import React from 'react';
import { Mail, ShieldCheck, Flag, HelpCircle } from 'lucide-react';
import { NavLink } from '../components/NavLink';
import { LISTING_FEE_LABEL } from '../lib/commissionCalc';

export const CONTACT_EMAIL = 'hello@ownersmarket.ca';
export const PRIVACY_EMAIL = 'privacy@ownersmarket.ca';

interface AboutPageProps {
  onNavigate: (tab: string) => void;
}

const ContactCard: React.FC<{ icon: React.ReactNode; title: string; children: React.ReactNode }> = ({ icon, title, children }) => (
  <div className="bg-white rounded-[10px] border border-slate-200 p-6 flex flex-col gap-3">
    <div className="flex items-center gap-3">
      <span className="w-10 h-10 shrink-0 rounded-lg bg-white ring-1 ring-emerald-200 text-emerald-800 flex items-center justify-center">{icon}</span>
      <h3 className="font-bold text-[18px] text-slate-900">{title}</h3>
    </div>
    <div className="text-[16px] text-slate-700 leading-relaxed">{children}</div>
  </div>
);

export const AboutPage: React.FC<AboutPageProps> = ({ onNavigate }) => (
  <div className="text-slate-900">
    {/* About */}
    <section className="max-w-[900px] mx-auto px-4 sm:px-6 pt-12 sm:pt-16 pb-12 flex flex-col gap-5">
      <p className="text-sm font-bold text-emerald-700">About and contact</p>
      <h1 className="font-display font-bold text-[44px] sm:text-[60px] leading-[0.95]">About OwnersMarket</h1>
      <p className="text-lg text-slate-700 leading-relaxed">
        OwnersMarket is a Canadian website where homeowners advertise their own homes for sale, and buyers contact them directly to book a viewing.
        It’s run from British Columbia and open across Canada, except Québec for now.
      </p>
      <p className="text-[17px] text-slate-700 leading-relaxed">
        We started it for owners whose homes are ready to show: good photos do most of the selling, they can open the door for viewings, and a
        lawyer or notary handles the contract, as with any home sale. Paying a large commission isn’t the only way to sell. A flat {LISTING_FEE_LABEL}{' '}
        a month per listing gets your home in front of buyers, with free printable signs and a feature sheet to bring people to it.
      </p>
      <div className="rounded-[10px] bg-fern p-5 text-[16px] text-slate-800 leading-relaxed">
        <b>What we are, and aren’t.</b> OwnersMarket is an advertising site, not a real estate brokerage. We don’t represent buyers or sellers,
        advise on prices, negotiate, or handle contracts or deposits. Every listing is reviewed for spam, scams and inappropriate content before it
        goes live; we don’t verify ownership.{' '}
        <NavLink to="how-it-works" onNavigate={onNavigate} className="text-emerald-800 font-semibold underline underline-offset-2">
          How it works
        </NavLink>
      </div>
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

    {/* Contact */}
    <section className="bg-slate-50 border-y border-slate-200">
      <div className="max-w-[1100px] mx-auto px-4 sm:px-6 py-14 flex flex-col gap-8">
        <div className="flex flex-col gap-3 max-w-[40em]">
          <h2 className="font-display font-bold text-[38px] sm:text-[44px] leading-none" id="contact">
            Contact us
          </h2>
          <p className="text-[17px] text-slate-700 leading-relaxed">
            A real person reads every email. We aim to reply within a couple of business days.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <ContactCard icon={<Mail className="w-5 h-5" />} title="Questions and help">
            Help with your listing, billing, your account or anything else:
            <br />
            <a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold text-emerald-800 underline underline-offset-2">
              {CONTACT_EMAIL}
            </a>
          </ContactCard>
          <ContactCard icon={<ShieldCheck className="w-5 h-5" />} title="Privacy requests">
            To see, correct or delete your personal information:
            <br />
            <a href={`mailto:${PRIVACY_EMAIL}`} className="font-semibold text-emerald-800 underline underline-offset-2">
              {PRIVACY_EMAIL}
            </a>
            <br />
            <span className="text-sm text-slate-600">
              You can also download or delete your data yourself from{' '}
              <NavLink to="notifications" onNavigate={onNavigate} className="underline underline-offset-2">
                your account settings
              </NavLink>
              .
            </span>
          </ContactCard>
          <ContactCard icon={<Flag className="w-5 h-5" />} title="Report a listing">
            If a listing looks wrong, misleading or like a scam, use the <b>Report</b> link on that listing so we can review it quickly. Never send
            money or a deposit to anyone through a message.
          </ContactCard>
          <ContactCard icon={<HelpCircle className="w-5 h-5" />} title="Before you email">
            Our free guides answer most questions about{' '}
            <NavLink to="guide-selling" onNavigate={onNavigate} className="underline underline-offset-2">
              selling without a realtor
            </NavLink>{' '}
            and{' '}
            <NavLink to="guide-buying" onNavigate={onNavigate} className="underline underline-offset-2">
              buying a home for sale by owner
            </NavLink>
            . We can’t give legal or pricing advice; your lawyer or notary is the right person for that.
          </ContactCard>
        </div>
      </div>
    </section>
  </div>
);
