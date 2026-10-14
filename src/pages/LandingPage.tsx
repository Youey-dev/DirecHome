import React from 'react';
import { Listing } from '../types/listing';
import { ListingCard } from '../components/ListingCard';
import { SavingsCalculator } from '../components/SavingsCalculator';
import { 
  Building2, 
  Sparkles, 
  ArrowRight, 
  ShieldCheck, 
  CheckCircle2, 
  DollarSign, 
  Users, 
  FileText,
  Clock,
  Compass,
  MapPin
} from 'lucide-react';
import { BC_CITIES } from '../data/cities';

interface LandingPageProps {
  listings: Listing[];
  savedIds: string[];
  onToggleFavorite: (e: React.MouseEvent, id: string) => void;
  onSelectListing: (id: string) => void;
  onNavigate: (tab: string, listingId?: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  listings,
  savedIds,
  onToggleFavorite,
  onSelectListing,
  onNavigate
}) => {
  const liveListings = listings.filter((l) => l.status === 'live');

  return (
    <div className="space-y-16 sm:space-y-24">
      {/* Hero Section */}
      <section className="relative pt-8 sm:pt-16 pb-12 overflow-hidden">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            
            {/* Launch Region Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-800 text-xs font-semibold border border-emerald-200/80">
              <MapPin className="w-3.5 h-3.5 text-emerald-700" />
              <span>Now Serving Fraser Valley & Lower Mainland, BC</span>
            </div>

            {/* Hero Headline */}
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.15] text-balance">
              Sell your home yourself. <br />
              <span className="text-emerald-800">Pass cash-back to your buyer.</span>
            </h1>

            {/* Value Proposition Prose */}
            <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
              Why pay $30,000+ in listing commissions? DirectHome lets BC homeowners list verified properties directly. Offer a closing cash-back incentive to attract buyers, and keep the rest.
            </p>

            {/* Primary Action Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={() => onNavigate('wizard')}
                className="w-full sm:w-auto px-7 py-3.5 bg-emerald-700 hover:bg-emerald-800 active:scale-[0.98] text-white font-semibold text-base rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer min-h-[48px]"
              >
                <span>List Your Home for Free</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => onNavigate('browse')}
                className="w-full sm:w-auto px-7 py-3.5 bg-slate-100 hover:bg-slate-200 active:scale-[0.98] text-slate-800 font-semibold text-base rounded-xl transition-all border border-slate-200 flex items-center justify-center gap-2 cursor-pointer min-h-[48px]"
              >
                <Compass className="w-4 h-4 text-slate-600" />
                <span>Browse Local Homes</span>
              </button>
            </div>

            {/* Reassuring Legal Sub-note */}
            <p className="text-xs text-slate-400 pt-2">
              Advertising marketplace only · Not a brokerage · No pressure · Verified BC Land Title ownership
            </p>
          </div>

          {/* Fraser Valley quick pill links */}
          <div className="mt-12 pt-8 border-t border-slate-100 flex items-center justify-center gap-2 flex-wrap text-xs text-slate-500">
            <span className="font-semibold text-slate-700 mr-1">Trending Areas:</span>
            {['Langley', 'Surrey', 'Abbotsford', 'Burnaby', 'Vancouver', 'Coquitlam', 'Chilliwack'].map((city) => (
              <button
                key={city}
                onClick={() => onNavigate('browse')}
                className="px-3 py-1 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg border border-slate-200 transition-colors cursor-pointer"
              >
                {city}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Homes Showcase */}
      <section className="max-w-[1200px] mx-auto px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-emerald-800 mb-1">
              Direct From Verified Owners
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Featured Homes in Fraser Valley & Lower Mainland
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Every home offers verified title records and direct communication with the seller.
            </p>
          </div>

          <button
            onClick={() => onNavigate('browse')}
            className="text-sm font-semibold text-emerald-800 hover:text-emerald-900 flex items-center gap-1 group cursor-pointer shrink-0"
          >
            <span>Explore all {liveListings.length} homes</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {liveListings.slice(0, 3).map((listing) => (
            <ListingCard
              key={listing.id}
              listing={listing}
              isFavorited={savedIds.includes(listing.id)}
              onToggleFavorite={onToggleFavorite}
              onSelect={onSelectListing}
            />
          ))}
        </div>
      </section>

      {/* Interactive Savings Example Section */}
      <section className="max-w-[1200px] mx-auto px-4 sm:px-6">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 text-xs font-semibold mb-3">
            <DollarSign className="w-3.5 h-3.5 text-emerald-700" />
            <span>The DirectHome Financial Advantage</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-bold text-slate-900 tracking-tight text-balance">
            Where Does the Money Go?
          </h2>
          <p className="text-sm sm:text-base text-slate-600 mt-2">
            In British Columbia, typical real estate commissions consume $30,000 to $70,000+. When you sell yourself, that equity stays with the buyer and seller.
          </p>
        </div>

        <SavingsCalculator 
          initialPrice={1299000} 
          initialCashback={15000}
          onApplyToListing={() => onNavigate('wizard')}
        />
      </section>

      {/* How It Works (Short 3-Step Plain Language) */}
      <section className="max-w-[1200px] mx-auto px-4 sm:px-6 py-6">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="text-xs font-semibold uppercase tracking-wider text-emerald-800 mb-1">
            Simple & Transparent
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            How DirectHome Works in 3 Clear Steps
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            No agents in the middle. No sales pressure. Just sellers, buyers, and qualified legal closing.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Step 1 */}
          <div className="bg-slate-50 rounded-2xl p-6 sm:p-8 border border-slate-200 space-y-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-700 text-white font-bold text-lg flex items-center justify-center shadow-sm">
              1
            </div>
            <h3 className="text-lg font-bold text-slate-900">List & Verify in 15 Minutes</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Upload photos straight from your phone. Our system resizes them automatically. Upload your BC Property Tax notice to verify ownership privately before your listing goes live.
            </p>
            <div className="text-xs text-emerald-800 font-semibold flex items-center gap-1.5 pt-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>Autosaved every keystroke</span>
            </div>
          </div>

          {/* Step 2 */}
          <div className="bg-slate-50 rounded-2xl p-6 sm:p-8 border border-slate-200 space-y-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-700 text-white font-bold text-lg flex items-center justify-center shadow-sm">
              2
            </div>
            <h3 className="text-lg font-bold text-slate-900">Offer a Buyer Cash-Back</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Because you are not paying a listing agent, you can offer a $5,000 to $25,000 cash-back credit to the buyer at completion. It makes your home stand out against MLS listings.
            </p>
            <div className="text-xs text-emerald-800 font-semibold flex items-center gap-1.5 pt-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>Credited at completion</span>
            </div>
          </div>

          {/* Step 3 */}
          <div className="bg-slate-50 rounded-2xl p-6 sm:p-8 border border-slate-200 space-y-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-700 text-white font-bold text-lg flex items-center justify-center shadow-sm">
              3
            </div>
            <h3 className="text-lg font-bold text-slate-900">Show & Complete with a Notary</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Approve private viewing times directly from your dashboard. When you receive an offer, complete the standard BC Contract of Purchase and Sale through your independent conveyancing notary or lawyer.
            </p>
            <div className="text-xs text-emerald-800 font-semibold flex items-center gap-1.5 pt-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>Safe & legally binding</span>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Strip */}
      <section className="max-w-[1200px] mx-auto px-4 sm:px-6">
        <div className="bg-emerald-900 rounded-3xl p-8 sm:p-12 text-white text-center relative overflow-hidden shadow-lg">
          <div className="max-w-2xl mx-auto space-y-4 relative z-10">
            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
              Ready to take control of your home sale?
            </h2>
            <p className="text-emerald-100 text-sm sm:text-base leading-relaxed">
              Join homeowners across Langley, Surrey, Burnaby, and Abbotsford who are keeping their hard-earned equity. Zero listing fee.
            </p>
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={() => onNavigate('wizard')}
                className="w-full sm:w-auto px-8 py-3.5 bg-white hover:bg-emerald-50 text-emerald-950 font-bold text-base rounded-xl transition-all shadow-md cursor-pointer min-h-[48px]"
              >
                Start Your Listing Now
              </button>
              <button
                onClick={() => onNavigate('browse')}
                className="w-full sm:w-auto px-8 py-3.5 bg-emerald-800/80 hover:bg-emerald-800 text-white font-semibold text-base rounded-xl transition-all border border-emerald-700 cursor-pointer min-h-[48px]"
              >
                Browse Current Listings
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
