import React, { useEffect, useState } from 'react';
import { Listing, UserProfile } from '../types/listing';
import { ListingGallery } from '../components/ListingGallery';
import { MapLibreMap } from '../components/LazyMap';
import { ViewingModal } from '../components/ViewingModal';
import { MessageModal } from '../components/MessageModal';
import { ReportModal } from '../components/ReportModal';
import { formatCAD } from '../lib/commissionCalc';
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
} from 'lucide-react';

interface ListingDetailPageProps {
  listing: Listing;
  activeUser: UserProfile;
  isFavorited: boolean;
  onToggleFavorite: (e: React.MouseEvent, id: string) => void;
  onBack: () => void;
  onOpenAuth?: (mode?: 'signin' | 'signup') => void;
}

export const ListingDetailPage: React.FC<ListingDetailPageProps> = ({
  listing,
  activeUser,
  isFavorited,
  onToggleFavorite,
  onBack,
  onOpenAuth
}) => {
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
    if (listing.status === 'live' && !isOwner) db.incrementViews(listing.id);
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
          <span>Back to all homes</span>
        </button>

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
      </div>

      {/* Photo Gallery (Desktop Grid & Mobile Carousel) */}
      <ListingGallery photos={listing.photos} title={listing.headline} />

      {/* Main Content Split: Details Left (8 cols) & Action Card Right (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Details */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* Title, Address & Price Header */}
          <div className="space-y-2 border-b border-slate-200 pb-6">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="font-semibold text-emerald-800">{listing.propertyType}</span>
              <span aria-hidden="true">·</span>
              <span>Built in {listing.yearBuilt}</span>
              <span aria-hidden="true">·</span>
              <span className="flex items-center gap-1 text-slate-700">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                <span>Ownership document verified</span>
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">
              {listing.headline}
            </h1>

            <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm text-slate-600">
              <div className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                <span>
                  {hasApprovedViewing 
                    ? `${listing.streetAddress}${listing.unitNumber ? ` #${listing.unitNumber}` : ''}, ${listing.neighborhood}, ${listing.city}, BC ${listing.postalCode ?? ''}`
                    : `${listing.neighborhood}, ${listing.city}, BC ${listing.postalFsa ?? ''} ***`}
                </span>
              </div>

              {hasApprovedViewing ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200 w-fit">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Exact Civic Address Unlocked
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200 w-fit" title="Exact street number is unlocked upon seller viewing confirmation">
                  <span>🔒 Civic number hidden until viewing confirmed</span>
                </span>
              )}
            </div>

            <div className="pt-2 text-3xl sm:text-4xl font-extrabold text-slate-900 tabular-nums">
              {formatCAD(listing.price)}
            </div>
          </div>

          {/* Cash-Back Seller's Offer Explainer Banner */}
          {listing.offersCashback && listing.cashbackAmount > 0 && (
            <div className="p-5 sm:p-6 rounded-2xl bg-emerald-50 border border-emerald-200/90 space-y-2.5">
              <div className="flex items-center gap-2 text-emerald-900 font-bold text-base">
                <Sparkles className="w-5 h-5 text-emerald-700 shrink-0" />
                <span>Seller's Cash-Back Offer: {formatCAD(listing.cashbackAmount)}</span>
              </div>
              <p className="text-xs sm:text-sm text-emerald-950/90 leading-relaxed">
                The homeowner is offering to credit <strong>{formatCAD(listing.cashbackAmount)}</strong> to the buyer at completion, funded from their listing commission savings. 
              </p>
              <div className="p-3 bg-white/80 rounded-xl border border-emerald-200 text-xs text-emerald-950 space-y-1">
                <div className="font-semibold text-emerald-900 flex items-center gap-1.5">
                  <FileCheck className="w-4 h-4 text-emerald-700" />
                  <span>Important Terms: Seller's Offer (Not a Guarantee)</span>
                </div>
                <p className="text-[11px] leading-relaxed text-slate-700">
                  This cash-back is an offer by the seller, not a platform guarantee. To take effect, this term <strong>must be formally documented in the standard BC Contract of Purchase and Sale</strong> and will be credited on the Statement of Adjustments by your conveyancing lawyer or notary at closing.
                </p>
              </div>
            </div>
          )}

          {/* Key Facts Metric Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-xs text-slate-500 font-medium">Bedrooms</div>
              <div className="text-xl font-bold text-slate-900 mt-1 tabular-nums">{listing.bedrooms}</div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-xs text-slate-500 font-medium">Bathrooms</div>
              <div className="text-xl font-bold text-slate-900 mt-1 tabular-nums">{listing.bathrooms}</div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-xs text-slate-500 font-medium">Interior Size</div>
              <div className="text-xl font-bold text-slate-900 mt-1 tabular-nums">{listing.sqft.toLocaleString()} sqft</div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-xs text-slate-500 font-medium">
                {listing.lotAcres ? 'Lot Size (Acres)' : 'Lot Size (SqFt)'}
              </div>
              <div className="text-xl font-bold text-slate-900 mt-1 tabular-nums">
                {listing.lotAcres ? `${listing.lotAcres} ac` : listing.lotSqft ? `${listing.lotSqft.toLocaleString()} sqft` : 'N/A'}
              </div>
            </div>
          </div>

          {/* Secondary Property Details Table */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Property Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2.5 gap-x-6 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Property Type</span>
                <span className="font-semibold text-slate-900">{listing.propertyType}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Year Built</span>
                <span className="font-semibold text-slate-900 tabular-nums">{listing.yearBuilt}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Parking</span>
                <span className="font-semibold text-slate-900">{listing.parkingSpaces} stalls</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Annual Property Taxes</span>
                <span className="font-semibold text-slate-900 tabular-nums">
                  {listing.propertyTaxesAnnual ? formatCAD(listing.propertyTaxesAnnual) : 'Contact Owner'}
                </span>
              </div>
              {listing.strataFee && listing.strataFee > 0 ? (
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Monthly Strata Fee</span>
                  <span className="font-semibold text-slate-900 tabular-nums">{formatCAD(listing.strataFee)} / mo</span>
                </div>
              ) : null}
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Listing Status</span>
                <span className="font-semibold text-emerald-800 uppercase tracking-wider">Active Direct</span>
              </div>
            </div>
          </div>

          {/* Description Prose */}
          <div className="space-y-3">
            <h3 className="text-base font-bold text-slate-900">About this Home</h3>
            <p className="text-sm sm:text-base text-slate-700 leading-relaxed whitespace-pre-line">
              {listing.description}
            </p>
          </div>

          {/* Recent Upgrades & Inclusions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {listing.recentUpgrades && listing.recentUpgrades.length > 0 && (
              <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Recent Upgrades & Features
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
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Included in Purchase
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
              <h3 className="text-base font-bold text-slate-900">Neighborhood & Community</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                {listing.neighborhoodHighlights}
              </p>
            </div>
          )}

          {/* Approximate Location Map */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">Location & Area</h3>
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

          {/* Report Listing Link */}
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
        </div>

        {/* Right Column: Sticky Contact & Viewing Booking Card (Desktop) */}
        <div className="hidden lg:block lg:col-span-4 sticky top-20">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-md space-y-6">
            
            {/* Homeowner Profile Card */}
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
              <div className="w-12 h-12 rounded-full bg-emerald-800 text-white font-bold flex items-center justify-center text-base shadow-sm">
                {(listing.sellerName || 'H').charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="text-sm font-bold text-slate-900">{listing.sellerName}</div>
                <div className="text-xs text-emerald-800 font-medium flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Verified Homeowner</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">Typically replies in under 1 hour</div>
              </div>
            </div>

            {/* Price & Cash-Back Summary */}
            <div className="space-y-1">
              <div className="text-xs text-slate-500 font-medium">Asking Price</div>
              <div className="text-3xl font-extrabold text-slate-900 tabular-nums">
                {formatCAD(listing.price)}
              </div>
              {listing.offersCashback && (
                <div className="text-xs text-emerald-800 font-semibold pt-1">
                  Includes {formatCAD(listing.cashbackAmount)} buyer cash-back credit
                </div>
              )}
            </div>

            {/* Actions */}
            {isOwner ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-950 space-y-1.5">
                <div className="font-bold text-sm">This is your listing</div>
                <p>Buyer messages and viewing requests for this home appear in your dashboard.</p>
              </div>
            ) : (
            <div className="space-y-3">
              <button
                onClick={handleOpenViewing}
                className="w-full py-3.5 bg-emerald-700 hover:bg-emerald-800 active:scale-[0.98] text-white font-bold text-sm rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer min-h-[48px]"
              >
                <Calendar className="w-4 h-4" />
                <span>Request a Private Viewing</span>
              </button>

              <button
                onClick={handleOpenMessage}
                className="w-full py-3.5 bg-slate-100 hover:bg-slate-200 active:scale-[0.98] text-slate-800 font-semibold text-sm rounded-xl transition-all border border-slate-200 flex items-center justify-center gap-2 cursor-pointer min-h-[48px]"
              >
                <MessageSquare className="w-4 h-4 text-slate-600" />
                <span>Message Homeowner</span>
              </button>
            </div>
            )}

            {/* Verbatim Statutory Brokerage Notice */}
            <div className="bg-slate-50 p-4 rounded-xl text-xs text-slate-600 leading-relaxed border border-slate-200/80 space-y-1.5">
              <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                <FileCheck className="w-4 h-4 text-emerald-700" />
                <span>Notice to Buyers & Sellers</span>
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
          <div className="text-xs text-slate-500">Asking Price</div>
          <div className="text-lg font-bold text-slate-900 truncate tabular-nums">
            {formatCAD(listing.price)}
          </div>
        </div>

        {!isOwner && (
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleOpenMessage}
            className="p-3 bg-slate-100 text-slate-700 rounded-xl font-semibold text-xs border border-slate-200 min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
            aria-label="Message Homeowner"
          >
            <MessageSquare className="w-5 h-5" />
          </button>

          <button
            onClick={handleOpenViewing}
            className="px-5 py-3 bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-sm min-h-[44px] flex items-center gap-1.5 cursor-pointer"
          >
            <Calendar className="w-4 h-4" />
            <span>Request Viewing</span>
          </button>
        </div>
        )}
      </div>

      {/* Modals */}
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
    </div>
  );
};
