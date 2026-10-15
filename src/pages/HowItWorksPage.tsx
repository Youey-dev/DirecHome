import React from 'react';
import { CASHBACK_LENDER_NOTICE, CONTRACT_NOTICE } from '../lib/legalText';
import { 
  Building2, 
  ShieldCheck, 
  CheckCircle2, 
  Scale, 
  FileCheck, 
  DollarSign, 
  Sparkles, 
  ArrowRight,
  HelpCircle,
  AlertCircle
} from 'lucide-react';
import { formatCAD } from '../lib/commissionCalc';

interface HowItWorksPageProps {
  onNavigate: (tab: string) => void;
}

export const HowItWorksPage: React.FC<HowItWorksPageProps> = ({ onNavigate }) => {
  return (
    <div className="max-w-[1000px] mx-auto px-4 sm:px-6 py-6 pb-20 space-y-12">
      
      {/* Title */}
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-semibold border border-emerald-200">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
          <span>Selling directly, done right</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          How OwnersMarket works
        </h1>
        <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
          The legal, financial, and practical breakdown of selling and buying homes directly in Canada without listing brokerages.
        </p>
      </div>

      {/* The 4 Core Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Pillar 1 */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 space-y-3 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center">
            1
          </div>
          <h3 className="text-lg font-bold text-slate-900">Listing Review First</h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            Every listing gets a quick review by our team for spam, scams and inappropriate content before it can be published. Sellers confirm they own the home or are authorized to sell it; OwnersMarket does not verify ownership, so buyers should confirm title with a lawyer or notary before any deal.
          </p>
          <div className="pt-2 text-xs text-emerald-800 font-medium flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" />
            <span>Spam &amp; scam screening</span>
          </div>
        </div>

        {/* Pillar 2 */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 space-y-3 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center">
            2
          </div>
          <h3 className="text-lg font-bold text-slate-900">The Buyer Cash-Back Mechanism</h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            OwnersMarket charges no commission — just a flat $24.99/month per active listing. A seller who would otherwise pay a commission (for example, 7% on the first $100k and 2.5% on the balance, used here only as an example; commissions are negotiable) could save a significant amount, and may choose to offer part of it to the buyer as a cash-back credit at completion.
          </p>
          <div className="pt-2 text-xs text-emerald-800 font-medium flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" />
            <span>Seller's voluntary offer, written into the contract</span>
          </div>
        </div>

        {/* Pillar 3 */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 space-y-3 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center">
            3
          </div>
          <h3 className="text-lg font-bold text-slate-900">Direct In-App Communication</h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            Buyers request viewings and message homeowners directly through the platform. Homeowners approve appointments that suit their family schedule, keeping full control of their home access.
          </p>
          <div className="pt-2 text-xs text-emerald-800 font-medium flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" />
            <span>No unsolicited agent sales calls</span>
          </div>
        </div>

        {/* Pillar 4 */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 space-y-3 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center">
            4
          </div>
          <h3 className="text-lg font-bold text-slate-900">Closing with your own lawyer or notary</h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            {CONTRACT_NOTICE} Both sides retain their own notary public or real estate lawyer to prepare the contract, transfer funds and register the title.
          </p>
          <div className="pt-2 text-xs text-emerald-800 font-medium flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" />
            <span>Your own lawyer or notary handles the contract</span>
          </div>
        </div>
      </div>

      {/* Brokerage vs OwnersMarket Table */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-4">
        <h3 className="text-lg font-bold text-slate-900">Traditional brokerage vs. OwnersMarket</h3>
        
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Feature</th>
                <th className="py-3 px-4">Traditional Brokerage</th>
                <th className="py-3 px-4 text-emerald-800 font-bold bg-emerald-50/50 rounded-t-lg">OwnersMarket</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              <tr>
                <td className="py-3 px-4 font-semibold text-slate-900">Listing Commission</td>
                <td className="py-3 px-4 text-rose-700">Varies by brokerage and is negotiable</td>
                <td className="py-3 px-4 font-bold text-emerald-800 bg-emerald-50/50">No commission — flat $24.99/month per active listing</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-semibold text-slate-900">Buyer Cash-Back</td>
                <td className="py-3 px-4 text-slate-500">Rare or none</td>
                <td className="py-3 px-4 font-bold text-emerald-800 bg-emerald-50/50">Optional, set by each seller</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-semibold text-slate-900">Direct Contact with Owner</td>
                <td className="py-3 px-4 text-slate-500">Blocked by listing agent</td>
                <td className="py-3 px-4 font-bold text-emerald-800 bg-emerald-50/50">Direct & instant in-app messaging</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-semibold text-slate-900">Listing Screening</td>
                <td className="py-3 px-4 text-slate-500">MLS agent check</td>
                <td className="py-3 px-4 font-bold text-emerald-800 bg-emerald-50/50">Every listing reviewed before publishing</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-semibold text-slate-900">Contract & Closing</td>
                <td className="py-3 px-4 text-slate-500">Prepared by the parties' agents and lawyers or notaries</td>
                <td className="py-3 px-4 font-bold text-emerald-800 bg-emerald-50/50">Prepared by your own lawyer or notary (OwnersMarket provides no contracts)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Frequently Asked Questions */}
      <div className="space-y-4">
        <h3 className="text-xl font-bold text-slate-900">Frequently Asked Questions</h3>
        <div className="space-y-3">
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <h4 className="text-sm font-bold text-slate-900 mb-1">
              Is OwnersMarket a licensed real estate brokerage?
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              No. OwnersMarket is strictly an online advertising marketplace and software platform. We do not represent buyers or sellers, we do not advise on prices or negotiating terms, and we do not hold deposit funds. All transaction contracts and completions occur directly between the parties with their independent legal professionals.
            </p>
          </div>

          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <h4 className="text-sm font-bold text-slate-900 mb-1">
              How does the buyer actually receive the cash-back?
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              If the buyer and seller agree to a cash-back, it must be included in the purchase contract. {CONTRACT_NOTICE} How the credit is applied at completion is handled by their lawyers or notaries. {CASHBACK_LENDER_NOTICE}
            </p>
          </div>

          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <h4 className="text-sm font-bold text-slate-900 mb-1">
              What if a buyer is already represented by their own Realtor?
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Sellers can choose whether they are willing to pay a cooperating buyer-agent commission (an amount you negotiate) or work exclusively with direct unrepresented buyers. You remain in complete control.
            </p>
          </div>
        </div>
      </div>

      {/* Ready CTA */}
      <div className="p-8 rounded-3xl bg-emerald-900 text-white text-center space-y-4">
        <h3 className="text-2xl font-bold">Ready to list your home in under 15 minutes?</h3>
        <p className="text-emerald-100 text-sm max-w-md mx-auto">
          Autosaved progress, photo resizing in browser, and a quick listing review. You could keep more of your equity.
        </p>
        <button
          onClick={() => onNavigate('wizard')}
          className="px-6 py-3 bg-white text-emerald-950 font-bold rounded-xl text-sm shadow-md hover:bg-emerald-50 cursor-pointer min-h-[44px]"
        >
          Start Your Free Listing
        </button>
      </div>
    </div>
  );
};
