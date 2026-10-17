import React, { useEffect, useState } from 'react';
import { AGENT_OFFER_NOTICE, describeAgentCommission } from '../lib/agentCommission';
import { FormattedText } from '../components/FormattedText';
import { Listing, UserProfile } from '../types/listing';
import { ListingGallery } from '../components/ListingGallery';
import { MapLibreMap } from '../components/LazyMap';
import { ViewingModal } from '../components/ViewingModal';
import { MessageModal } from '../components/MessageModal';
import { ReportModal } from '../components/ReportModal';
import { formatCAD } from '../lib/commissionCalc';
import { CASHBACK_LENDER_NOTICE, CASHBACK_SELLER_OFFER_NOTICE, CONTRACT_NOTICE } from '../lib/legalText';
import { db, isGuestUser } from '../lib/db';
import { 
  Heart, 
  Share2, 
  ShieldCheck, 
  Calendar, 
  MessageSquare, 
  MapPin, 
  Check, 
  AlertTriangle, 
  Home, 
  ArrowLeft,
  Sparkles,
  DollarSign,
  Car,
  Layers,
  FileCheck
, Handshake } from 'lucide-react';

interface ListingDetailPageProps {
  listing: Listing;
  activeUser: UserProfile;
  isFavorited: boolean;
  onToggleFavorite: (e: React.MouseEvent, id: string) => void;
  onBack: () => void;
  onOpenAuth?: (mode?: 'signin' | 'signup') => void;
  /** Example listings only: where "List your home" goes. */
  onListYourHome?: () => void;
}

export const ListingDetailPage: React.FC<ListingDetailPageProps> = ({
  listing,
  activeUser,
  isFavorited,
  onToggleFavorite,
  onBack,
  onOpenAuth,
  onListYourHome
}) => {
  // Example listings show how a home looks on OwnersMarket; they are not for sale.
  const isExample = !!listing.isExample;
  const [viewingModalOpen, setViewingModalOpen] = useState(false);
  const [messageModalOpen, setMessageModalOpen] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const isOwnerOrAdmin = activeUser.role === 'admin' || listing.userId === activeUser.id;
  const isOwner = listing.userId === activeUser.id;
  // The exact address is only sent by the database to the owner, admins, and buyers with a confirmed viewing.
  const addressUnlocked = !!listing.streetAddress;
  const hasApprovedViewing = addressUnlocked;

  useEffect(() => {
    if (listing.status === 'live' && !isOwner && !isExample) db.incrementViews(listing.id);
  }, [listing.id]);

  const handleOpenMessage = () => {
    if (isGuestUser(activeUser)) onOpenAuth?.('signin');
    else setMessageModalOpen(true);
  };

  const handleOpenViewing = () => {
    if (isGuestUser(activeUser)) onOpenAuth?.('signin');
    else setViewingModalOpen(true);
  };

  const handleOpenReport = () => {
    if (isGuestUser(activeUser)) onOpenAuth?.('signin');
    else setReportModalOpen(true);
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-6 pb-28 md:pb-16 space-y-8">
      
      {/* Top Breadcrumb & Action Strip */}
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer min-h-[44px] py-1"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to homes</span>
        </button>

        {!isExample && (
        <div className="flex items-center gap-2">
          {/* Share Button */}
          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-all shadow-sm cursor-pointer min-h-[44px]"
            title="Copy listing link"
          >
            {copiedLink ? <Check className="w-4 h-4 text-emerald-600" /> : <Share2 className="w-4 h-4 text-slate-500" />}
            <span>{copiedLink ? 'Link Copied!' : 'Share'}</span>
          </button>

          {/* Favorite Button */}
          <button
            onClick={(e) => onToggleFavorite(e, listing.id)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-all shadow-sm cursor-pointer min-h-[44px]"
          >
            <Heart className={`w-4 h-4 ${isFavorited ? 'fill-rose-500 text-rose-500' : 'text-slate-500'}`} />
            <span>{isFavorited ? 'Saved' : 'Save'}</span>
          </button>
        </div>
        )}
      </div>

      {isExample && (
        <div role="note" className="rounded-xl border-2 border-sign bg-amber-50 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1">
            <div className="text-base font-extrabold text-slate-900">Example listing: not a real home, not for sale</div>
            <p className="text-sm text-slate-700 mt-1">
              This page shows how a home looks on OwnersMarket. The home, price and details are made up, and the photos are stock photos.
            </p>
          </div>
          <button
            onClick={onListYourHome}
            className="shrink-0 px-5 py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-md min-h-[48px] cursor-pointer"
          >
            List your home
          </button>
        </div>
      )}

      {/* Photo Gallery (Desktop Grid & Mobile Carousel) */}
      <ListingGallery photos={listing.photos} title={listing.headline} />
      {isExample && listing.photoCredits && (
        <p className="-mt-6 text-xs text-slate-500">
          Example photos from Unsplash by {listing.photoCredits.join(', ')}.
        </p>
      )}

      {/* Main Content Split: Details Left (8 cols) & Action Card Right (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Details */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* Title, Address & Price Header */}
          <div className="space-y-3">
            <div className="font-display font-bold text-[52px] sm:text-[64px] leading-[0.95] text-slate-900 tabular-nums">
              {formatCAD(listing.price)}
            </div>

            <h1 className="text-2xl font-bold text-slate-900 leading-snug">
              {listing.headline}
            </h1>

            <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm text-slate-600">
              <div className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                <span>
                  {hasApprovedViewing 
                    ? `${listing.streetAddress}${listing.unitNumber ? ` #${listing.unitNumber}` : ''}, ${listing.neighborhood}, ${listing.city}, ${listing.province} ${listing.postalCode ?? ''}`
                    : `${listing.neighborhood}, ${listing.city}, ${listing.province}`}
                </span>
              </div>

              {hasApprovedViewing ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-800 w-fit">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Exact address shared with you
                </span>
              ) : (
                <span className="text-sm text-slate-600">
                  Exact address shared once a viewing is confirmed.
                </span>
              )}
            </div>

          </div>

          {/* Cash-Back Seller's Offer Explainer Banner */}
          {listing.offersCashback && listing.cashbackAmount > 0 && (
            <div className="p-5 sm:p-6 rounded-2xl bg-emerald-50 border border-emerald-200/90 space-y-2.5">
              <div className="flex items-center gap-2 text-emerald-900 font-bold text-base">
                <Sparkles className="w-5 h-5 text-emerald-700 shrink-0" />
                <span>Seller's cash-back offer: {formatCAD(listing.cashbackAmount)}</span>
              </div>
              <p className="text-xs sm:text-sm text-emerald-950/90 leading-relaxed">
                The homeowner is offering a <strong>{formatCAD(listing.cashbackAmount)}</strong> credit to the buyer at completion. This is the seller's own voluntary offer. 
              </p>
              <div className="p-3 bg-white/80 rounded-xl border border-emerald-200 text-xs text-emerald-950 space-y-1">
                <div className="font-semibold text-emerald-900 flex items-center gap-1.5">
                  <FileCheck className="w-4 h-4 text-emerald-700" />
                  <span>Important terms: seller's offer (not a guarantee)</span>
                </div>
                <p className="text-[11px] leading-relaxed text-slate-700">{CASHBACK_SELLER_OFFER_NOTICE} To apply, it must be included in the purchase contract. {CONTRACT_NOTICE}</p>
                <p className="text-[11px] leading-relaxed text-slate-900 font-medium">{CASHBACK_LENDER_NOTICE}</p>
              </div>
            </div>
          )}

          {/* Agents welcome: the seller's buyer's agent commission offer */}
          {listing.agentsWelcome && !isExample && (
            <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-300 space-y-2">
              <div className="flex items-center gap-2 font-bold text-base text-slate-900">
                <Handshake className="w-5 h-5 text-emerald-700 shrink-0" />
                <span>Agents welcome</span>
              </div>
              <p className="text-sm text-slate-700 leading-relaxed">
                The owner will pay a buyer's agent commission of <strong>{describeAgentCommission(listing)}</strong> to the agent's brokerage if
                the agent's client buys this home.
              </p>
              <p className="text-xs text-slate-600 leading-relaxed">
                Agents: message the owner to confirm the commission in writing before you book a showing. The owner is selling without an agent of
                their own, so follow your regulator's rules for dealing with an unrepresented seller. {AGENT_OFFER_NOTICE}
              </p>
            </div>
          )}

          {/* Key Facts Metric Strip */}
          <dl className="grid grid-cols-2 sm:grid-cols-4 border-y border-slate-300">
            {[
              { label: 'Bedrooms', value: String(listing.bedrooms) },
              { label: 'Bathrooms', value: String(listing.bathrooms) },
              { label: 'Square feet', value: listing.sqft.toLocaleString() },
              { label: 'Built', value: String(listing.yearBuilt) },
            ].map((fact) => (
              <div key={fact.label} className="py-4 flex flex-col-reverse gap-0.5">
                <dt className="text-sm text-slate-600">{fact.label}</dt>
                <dd className="font-display font-bold text-[34px] leading-none text-slate-900 tabular-nums">{fact.value}</dd>
              </div>
            ))}
          </dl>

          {/* Secondary Property Details Table */}
          <div className="space-y-3">
            <h2 className="font-display font-bold text-[34px] leading-none text-slate-900">Details</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 text-[15px]">
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Property type</span>
                <span className="font-semibold text-slate-900">{listing.propertyType}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Year built</span>
                <span className="font-semibold text-slate-900 tabular-nums">{listing.yearBuilt}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Parking</span>
                <span className="font-semibold text-slate-900">{listing.parkingSpaces} {listing.parkingSpaces === 1 ? 'spot' : 'spots'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Lot size</span>
                <span className="font-semibold text-slate-900 tabular-nums">
                  {listing.lotAcres ? `${listing.lotAcres} acres` : listing.lotSqft ? `${listing.lotSqft.toLocaleString()} sq ft` : 'Not listed'}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Annual property taxes</span>
                <span className="font-semibold text-slate-900 tabular-nums">
                  {listing.propertyTaxesAnnual ? formatCAD(listing.propertyTaxesAnnual) : 'Contact Owner'}
                </span>
              </div>
              {listing.strataFee && listing.strataFee > 0 ? (
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Monthly strata fee</span>
                  <span className="font-semibold text-slate-900 tabular-nums">{formatCAD(listing.strataFee)} / mo</span>
                </div>
              ) : null}
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Listed by</span>
                <span className="font-semibold text-emerald-800">{isExample ? "Example (no seller)" : "The owner"}</span>
              </div>
            </div>
          </div>

          {/* Description Prose */}
          <div className="space-y-3">
            <h2 className="font-display font-bold text-[34px] leading-none text-slate-900">From the owner</h2>
            <FormattedText text={listing.description} className="text-[17px] text-slate-800 leading-[1.7] max-w-[40em] break-words" />
          </div>

          {/* Recent Upgrades & Inclusions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {listing.recentUpgrades && listing.recentUpgrades.length > 0 && (
              <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <h4 className="text-xs font-bold text-slate-900">
                  Recent upgrades and features
                </h4>
                <ul className="space-y-2 text-xs text-slate-700">
                  {listing.recentUpgrades.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {listing.inclusions && listing.inclusions.length > 0 && (
              <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <h4 className="text-xs font-bold text-slate-900">
                  Included in purchase
                </h4>
                <ul className="space-y-2 text-xs text-slate-700">
                  {listing.inclusions.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Neighborhood Highlights */}
          {listing.neighborhoodHighlights && (
            <div className="space-y-2">
              <h2 className="font-display font-bold text-[34px] leading-none text-slate-900">The neighbourhood</h2>
              <FormattedText text={listing.neighborhoodHighlights} className="text-[16px] text-slate-700 leading-relaxed max-w-[40em] break-words" />
            </div>
          )}

          {/* Approximate Location Map (examples have no location) */}
          {!isExample && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-display font-bold text-[34px] leading-none text-slate-900">Around the home</h2>
              <span className="text-xs text-slate-500">
                {listing.neighborhood}, {listing.city}
              </span>
            </div>
            <MapLibreMap
              listings={[listing]}
              singleListing={listing}
              approximateMode={!hasApprovedViewing}
              heightClass="h-[340px]"
            />
          </div>
          )}

          {/* Report Listing Link */}
          {!isExample && (
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
            <span>Listing ID: {listing.id}</span>
            <button
              onClick={handleOpenReport}
              className="text-slate-500 hover:text-rose-700 flex items-center gap-1 cursor-pointer transition-colors"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Report this listing</span>
            </button>
          </div>
          )}
        </div>

        {/* Right Column: Sticky Contact & Viewing Booking Card (Desktop) */}
        <div className="hidden lg:block lg:col-span-4 sticky top-20">
          <div className="bg-white rounded-[10px] border border-slate-200 p-6 space-y-5">
            
            {/* Homeowner Profile Card */}
            {!isExample && (
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
              <div className="w-12 h-12 rounded-full bg-emerald-800 text-white font-bold flex items-center justify-center text-base shadow-sm">
                {(listing.sellerName || 'H').charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="text-base font-bold text-slate-900">{listing.sellerName}</div>
                <div className="text-sm text-slate-600">The owner</div>
              </div>
            </div>
            )}

            {/* Price & Cash-Back Summary */}
            <div className="space-y-1">
              <div className="text-sm text-slate-600">{isExample ? 'Example price' : 'Asking price'}</div>
              <div className="font-display font-bold text-[40px] leading-none text-slate-900 tabular-nums">
                {formatCAD(listing.price)}
              </div>
              {listing.offersCashback && (
                <div className="text-xs text-emerald-800 font-semibold pt-1">
                  Includes {formatCAD(listing.cashbackAmount)} buyer cash-back credit
                </div>
              )}
            </div>

            {/* Actions */}
            {isExample ? (
              <div className="space-y-3">
                <div className="rounded-xl border-2 border-sign bg-amber-50 p-4 text-sm text-slate-900">
                  <b>Example listing.</b> Not a real home and not for sale, so it can’t be viewed or messaged.
                </div>
                <h2 className="font-display font-bold text-[30px] leading-none text-slate-900">Selling a home like this?</h2>
                <p className="text-sm text-slate-600">List yours for $24.99 a month, no commission. Buyers message you directly to book a viewing.</p>
                <button
                  onClick={onListYourHome}
                  className="w-full py-4 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-base rounded-md cursor-pointer min-h-[52px]"
                >
                  List your home
                </button>
              </div>
            ) : isOwner ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-950 space-y-1.5">
                <div className="font-bold text-sm">This is your listing</div>
                <p>Buyer messages and viewing requests for this home appear in your dashboard.</p>
              </div>
            ) : (
            <div className="space-y-3">
              <h2 className="font-display font-bold text-[30px] leading-none text-slate-900">Request a viewing</h2>
              <p className="text-sm text-slate-600">Pick a time that suits you. The owner confirms, then the exact address is shared with you.</p>
              <button
                onClick={handleOpenViewing}
                className="w-full py-4 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-base rounded-md flex items-center justify-center gap-2 cursor-pointer min-h-[52px]"
              >
                <Calendar className="w-4 h-4" />
                <span>Request a viewing</span>
              </button>

              <button
                onClick={handleOpenMessage}
                className="w-full py-3.5 bg-white hover:bg-slate-50 text-slate-900 font-semibold text-[15px] rounded-md border-[1.5px] border-slate-900 flex items-center justify-center gap-2 cursor-pointer min-h-[48px]"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Ask the owner a question</span>
              </button>
            </div>
            )}

            {/* Verbatim Statutory Brokerage Notice */}
            <div className="bg-slate-50 p-4 rounded-xl text-xs text-slate-600 leading-relaxed border border-slate-200/80 space-y-1.5">
              <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                <FileCheck className="w-4 h-4 text-emerald-700" />
                <span>Notice to buyers and sellers</span>
              </div>
              <p>
                This site is an advertising platform. We are not a real estate brokerage and do not provide real estate advice. Sellers and buyers should consult a lawyer or notary before signing any agreement.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Sticky Bottom CTA Bar (< lg) */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 p-3 shadow-lg flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs text-slate-600">{isExample ? 'Example · not for sale' : 'Asking price'}</div>
          <div className="font-display text-2xl font-bold leading-none text-slate-900 truncate tabular-nums">
            {formatCAD(listing.price)}
          </div>
        </div>

        {isExample && (
          <button
            onClick={onListYourHome}
            className="px-5 py-3 bg-emerald-700 text-white rounded-md font-bold text-sm min-h-[48px] cursor-pointer shrink-0"
          >
            List your home
          </button>
        )}
        {!isOwner && !isExample && (
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleOpenMessage}
            className="p-3 bg-white text-slate-900 rounded-md font-semibold text-xs border-[1.5px] border-slate-900 min-h-[48px] min-w-[48px] flex items-center justify-center cursor-pointer"
            aria-label="Ask the owner a question"
          >
            <MessageSquare className="w-5 h-5" />
          </button>

          <button
            onClick={handleOpenViewing}
            className="px-5 py-3 bg-emerald-700 text-white rounded-md font-bold text-sm min-h-[48px] flex items-center gap-1.5 cursor-pointer"
          >
            <Calendar className="w-4 h-4" />
            <span>Request a viewing</span>
          </button>
        </div>
        )}
      </div>

      {/* Modals (never for examples) */}
      {!isExample && (
      <>
      <ViewingModal
        listing={listing}
        activeUser={activeUser}
        isOpen={viewingModalOpen}
        onClose={() => setViewingModalOpen(false)}
        onSuccess={() => {}}
      />

      <MessageModal
        listing={listing}
        activeUser={activeUser}
        isOpen={messageModalOpen}
        onClose={() => setMessageModalOpen(false)}
      />

      <ReportModal
        listing={listing}
        isOpen={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
      />
      </>
      )}
    </div>
  );
};
