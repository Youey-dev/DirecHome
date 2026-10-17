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
          What OwnersMarket does, what it doesn’t, and how a private sale works from listing to keys.
        </p>
      </div>

      {/* The 4 Core Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Pillar 1 */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 space-y-3 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center">
            1
          </div>
          <h3 className="text-lg font-bold text-slate-900">Every listing is reviewed first</h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            Every listing gets a quick review by our team for spam, scams and inappropriate content before it can be published. Sellers confirm they own the home or are authorized to sell it; OwnersMarket does not verify ownership, so buyers should confirm title with a lawyer or notary before any deal.
          </p>
          <div className="pt-2 text-xs text-emerald-800 font-medium flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" />
            <span>Screened for spam and scams</span>
          </div>
        </div>

        {/* Pillar 2 */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 space-y-3 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center">
            2
          </div>
          <h3 className="text-lg font-bold text-slate-900">No commission, and optional cash back</h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            OwnersMarket charges no commission, just a flat $24.99 a month per active listing. A seller who would otherwise pay a listing commission (for example 7% on the first $100,000 and 2.5% on the rest; commissions are negotiable and vary by province) could save a large amount, and may choose to offer part of it to the buyer as cash back at closing. If the buyer uses an agent, that agent may ask the seller to pay their commission, which would reduce the savings.
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
          <h3 className="text-lg font-bold text-slate-900">Buyers message you directly</h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            Buyers request viewings and message you through OwnersMarket. You accept the times that suit you, and your exact address stays private until you confirm a viewing.
          </p>
          <div className="pt-2 text-xs text-emerald-800 font-medium flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" />
            <span>Buyers reach you through OwnersMarket, not your phone</span>
          </div>
        </div>

        {/* Pillar 4 */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 space-y-3 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center">
            4
          </div>
          <h3 className="text-lg font-bold text-slate-900">Your lawyer or notary closes the sale</h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            {CONTRACT_NOTICE} Each side hires their own lawyer, or a notary where the province allows it, to prepare the contract, move the money and register the title.
          </p>
          <div className="pt-2 text-xs text-emerald-800 font-medium flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" />
            <span>Your own lawyer or notary handles the contract</span>
          </div>
        </div>
      </div>

      {/* Brokerage vs OwnersMarket Table */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-4">
        <h3 className="text-lg font-bold text-slate-900">Listing with an agent vs. listing on OwnersMarket</h3>
        
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-semibold">
                <th className="py-3 px-4">Feature</th>
                <th className="py-3 px-4">Listing with an agent</th>
                <th className="py-3 px-4 text-emerald-800 font-bold bg-emerald-50/50 rounded-t-lg">OwnersMarket</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              <tr>
                <td className="py-3 px-4 font-semibold text-slate-900">Listing commission</td>
                <td className="py-3 px-4 text-slate-500">Varies by brokerage and is negotiable</td>
                <td className="py-3 px-4 font-bold text-emerald-800 bg-emerald-50/50">No commission. A flat $24.99 a month per active listing</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-semibold text-slate-900">Cash back to the buyer</td>
                <td className="py-3 px-4 text-slate-500">Not usually offered</td>
                <td className="py-3 px-4 font-bold text-emerald-800 bg-emerald-50/50">Optional, set by each seller</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-semibold text-slate-900">Contact with the owner</td>
                <td className="py-3 px-4 text-slate-500">Usually through the listing agent</td>
                <td className="py-3 px-4 font-bold text-emerald-800 bg-emerald-50/50">Buyers message the owner directly</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-semibold text-slate-900">For-sale sign</td>
                <td className="py-3 px-4 text-slate-500">The brokerage’s sign, with the agent’s name and number</td>
                <td className="py-3 px-4 font-bold text-emerald-800 bg-emerald-50/50">Free printable lawn and window signs with a QR code to your listing</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-semibold text-slate-900">Listing check</td>
                <td className="py-3 px-4 text-slate-500">Listed by a licensed agent</td>
                <td className="py-3 px-4 font-bold text-emerald-800 bg-emerald-50/50">Every listing reviewed before it goes live</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-semibold text-slate-900">Contract and closing</td>
                <td className="py-3 px-4 text-slate-500">Prepared by the parties' agents and lawyers or notaries</td>
                <td className="py-3 px-4 font-bold text-emerald-800 bg-emerald-50/50">Prepared by your own lawyer or notary (OwnersMarket provides no contracts)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Frequently Asked Questions */}
      <div className="space-y-4">
        <h3 className="text-xl font-bold text-slate-900">Questions people ask</h3>
        <div className="space-y-3">
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <h4 className="text-sm font-bold text-slate-900 mb-1">
              Is OwnersMarket a licensed real estate brokerage?
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              No. OwnersMarket is an advertising website. We don’t represent buyers or sellers, we don’t advise on prices or negotiation, and we don’t hold deposits. Contracts and closings happen between the buyer and seller, each with their own lawyer or notary.
            </p>
          </div>

          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <h4 className="text-sm font-bold text-slate-900 mb-1">
              How does the buyer receive cash back?
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              If the buyer and seller agree to cash back, it must be written into the purchase contract. {CONTRACT_NOTICE} How the credit is applied at completion is handled by their lawyers or notaries. {CASHBACK_LENDER_NOTICE}
            </p>
          </div>

          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <h4 className="text-sm font-bold text-slate-900 mb-1">
              What if a buyer has their own agent?
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              That agent may ask you to pay their commission. You can agree, negotiate an amount, or only deal with buyers who don’t have an agent. It’s your choice, and it’s best to decide before your first viewing.
            </p>
          </div>
        </div>
      </div>

      {/* Ready CTA */}
      <div className="p-8 rounded-3xl bg-emerald-900 text-white text-center space-y-4">
        <h3 className="text-2xl font-bold">Ready to list your home?</h3>
        <p className="text-emerald-100 text-sm max-w-md mx-auto">
          Most owners finish in about 15 minutes. Your progress saves as you go, and every listing gets a quick review before it goes live.
        </p>
        <button
          onClick={() => onNavigate('wizard')}
          className="px-6 py-3 bg-white text-emerald-950 font-bold rounded-xl text-sm shadow-md hover:bg-emerald-50 cursor-pointer min-h-[44px]"
        >
          List your home
        </button>
      </div>
    </div>
  );
};
