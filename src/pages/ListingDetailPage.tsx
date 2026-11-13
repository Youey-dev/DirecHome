import React, { useEffect, useState } from 'react';
import { AGENT_OFFER_NOTICE, describeAgentCommission } from '../lib/agentCommission';
import { FormattedText } from '../components/FormattedText';
import { Listing, UserProfile } from '../types/listing';
import { ListingGallery } from '../components/ListingGallery';
import { MapLibreMap } from '../components/LazyMap';
import { GoogleEmbedMap, GOOGLE_EMBED_KEY } from '../components/GoogleEmbedMap';
import { ViewingModal } from '../components/ViewingModal';
import { MessageModal } from '../components/MessageModal';
import { ReportModal } from '../components/ReportModal';
import { OfferModal } from '../components/OfferModal';
import { OpenHouseCard } from '../components/OpenHouseCard';
import { CostCalculator } from '../components/CostCalculator';
import { priceDrop } from '../lib/listingNews';
import { formatCAD } from '../lib/commissionCalc';
import { viewsLabel } from '../lib/viewCount';
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
, Handshake, BadgeDollarSign } from 'lucide-react';

/** Plain words for the town line ("House in Cedar Valley, Mission, BC") */
const TYPE_WORD: Record<string, string> = {
  'Single Family Detached': 'House',
  Townhouse: 'Townhouse',
  'Condo / Apartment': 'Condo',
  'Duplex / Half-Duplex': 'Duplex',
  'Acreage / Farm': 'Acreage',
};

interface ListingDetailPageProps {
  listing: Listing;
  activeUser: UserProfile;
  isFavorited: boolean;
  onToggleFavorite: (e: React.MouseEvent, id: string) => void;
  onBack: () => void;
  onOpenAuth?: (mode?: 'signin' | 'signup', opts?: { title?: string; subtitle?: string }) => void;
  /** Example listings only: where "List your home" goes. */
  onListYourHome?: () => void;
  /** The seller's own preview while creating a listing: nothing is clickable or counted. */
  previewMode?: boolean;
}

export const ListingDetailPage: React.FC<ListingDetailPageProps> = ({
  listing,
  activeUser,
  isFavorited,
  onToggleFavorite,
  onBack,
  onOpenAuth,
  onListYourHome,
  previewMode
}) => {
  // Example listings show how a home looks on OwnersMarket; they are not for sale.
  // A seller's preview behaves the same way (no buttons, no view counting) with its own wording.
  const isPreview = !!previewMode;
  const isExample = !!listing.isExample || isPreview;
  const [viewingModalOpen, setViewingModalOpen] = useState(false);
  const [messageModalOpen, setMessageModalOpen] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [offerOpen, setOfferOpen] = useState(false);
  const [offerSent, setOfferSent] = useState(false);
  const drop = isExample ? null : priceDrop(listing);

  const isOwnerOrAdmin = activeUser.role === 'admin' || listing.userId === activeUser.id;
  const isOwner = listing.userId === activeUser.id;
  // The exact address is only sent by the database to the owner, admins, and buyers with a confirmed viewing.
  const addressUnlocked = !!listing.streetAddress;
  const hasApprovedViewing = addressUnlocked;

  useEffect(() => {
    if (listing.status === 'live' && !isOwner && !isExample) db.incrementViews(listing.id);
  }, [listing.id]);

  // Visitors can write their message first; they create an account to send it
  const handleOpenMessage = () => setMessageModalOpen(true);

  const handleOpenViewing = () => {
    if (isGuestUser(activeUser)) onOpenAuth?.('signin');
    else setViewingModalOpen(true);
  };

  const handleOpenOffer = () => {
    if (isGuestUser(activeUser))
      onOpenAuth?.('signup', { title: 'Create a free account to make an offer', subtitle: 'The owner sees your offer in their dashboard and replies to you here.' });
    else setOfferOpen(true);
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
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 pt-2 pb-28 md:pb-16 space-y-8">
      
      {/* Top Breadcrumb & Action Strip */}
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={onBack}
          className="text-[15px] font-medium text-slate-600 hover:text-slate-900 underline-offset-[3px] hover:underline transition-colors cursor-pointer min-h-[44px] py-1"
        >
          <span>{isPreview ? "Back to editing" : "Back to homes"}</span>
        </button>

        {!isExample && (
        <div className="flex items-center gap-2">
          {/* Share Button */}
          <button
            onClick={handleShare}
            className="om-chip"
            title="Copy listing link"
          >
            {copiedLink ? <Check className="w-4 h-4 text-emerald-700" aria-hidden="true" /> : <Share2 className="w-4 h-4" aria-hidden="true" />}
            <span aria-live="polite">{copiedLink ? 'Link copied' : 'Share'}</span>
          </button>

          {/* Favorite Button */}
          <button
            onClick={(e) => onToggleFavorite(e, listing.id)}
            aria-pressed={isFavorited}
            className="om-chip !bg-white !text-slate-900"
          >
            <Heart className={`w-4 h-4 ${isFavorited ? 'fill-rose-600 text-rose-600' : ''}`} aria-hidden="true" />
            <span>{isFavorited ? 'Saved' : 'Save'}</span>
          </button>
        </div>
        )}
      </div>

      {isPreview && (
        <div role="note" className="rounded-2xl bg-sign/25 p-4 sm:p-5">
          <div className="text-base font-semibold text-slate-900">Preview: this is how buyers will see your listing</div>
          <p className="text-sm text-slate-700 mt-1">
            {listing.showAddress
              ? 'You chose to show your exact address, so buyers see it and your home’s spot on the map.'
              : 'Your exact address stays private; buyers see the neighbourhood and city until you confirm a viewing.'}
          </p>
        </div>
      )}

      {isExample && !isPreview && (
        <div role="note" className="rounded-2xl bg-sign/25 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1">
            <div className="text-base font-semibold text-slate-900">Example listing: not a real home, not for sale</div>
            <p className="text-sm text-slate-700 mt-1">
              This page shows how a home looks on OwnersMarket. The home, price and details are made up, and the photos are stock photos.
            </p>
          </div>
          <button
            onClick={onListYourHome}
            className="shrink-0 om-btn om-btn-dark"
          >
            List your home
          </button>
        </div>
      )}

      {/* Photo Gallery (Desktop Grid & Mobile Carousel) */}
      <ListingGallery photos={listing.photos} title={listing.headline} />
      {isExample && !isPreview && listing.photoCredits && (
        <p className="-mt-6 text-[13px] text-slate-600">
          Example photos from Unsplash by {listing.photoCredits.join(', ')}.
        </p>
      )}

      {/* Main Content Split: Details Left (8 cols) & Action Card Right (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start pt-2">
        
        {/* Left Column: Details */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* Price, town and headline */}
          <div className="space-y-2.5">
            {isExample && !isPreview && <div className="text-[15px] text-slate-600">Example price</div>}
            <div className="text-[44px] sm:text-[56px] lg:text-[68px] leading-none font-semibold tracking-[-0.035em] text-slate-900 tabular-nums">
              {formatCAD(listing.price)}
            </div>
            {drop && (
              <div className="flex items-center gap-2 flex-wrap text-[15px]">
                <span className="font-semibold text-red-800">Price reduced {formatCAD(drop.amount)}</span>
                <span className="text-slate-600">
                  Was <span className="line-through">{formatCAD(drop.from)}</span>
                </span>
              </div>
            )}

            <p className="text-[18px] sm:text-[20px] leading-snug text-slate-700">
              {TYPE_WORD[listing.propertyType] ?? listing.propertyType} in{' '}
              {hasApprovedViewing
                ? `${listing.streetAddress}${listing.unitNumber ? ` #${listing.unitNumber}` : ''}, ${listing.neighborhood}, ${listing.city}, ${listing.province} ${listing.postalCode ?? ''}`
                : `${listing.neighborhood}, ${listing.city}, ${listing.province}`}
            </p>

            <h1 className="text-[18px] sm:text-[20px] font-semibold leading-snug text-slate-900 pt-1">
              {listing.headline}
            </h1>

            {listing.showAddress ? null : hasApprovedViewing ? (
              <p className="inline-flex items-center gap-1.5 text-[15px] font-medium text-emerald-700">
                <ShieldCheck className="w-4 h-4" aria-hidden="true" />
                Exact address shared with you
              </p>
            ) : (
              <p className="text-[15px] text-slate-600">Exact address shared once a viewing is confirmed.</p>
            )}

            {/* Views: the owner and admins only, never buyers */}
            {isOwnerOrAdmin && !isExample && (
              <div className="text-[15px] text-slate-600">
                {viewsLabel(listing)} <span className="text-slate-600">· only you{isOwner ? '' : ' and the owner'} can see this</span>
              </div>
            )}
          </div>

          {/* Key facts */}
          <dl className="flex flex-wrap gap-x-12 gap-y-4 py-6 border-y border-hairline">
            {[
              { label: 'Bedrooms', value: String(listing.bedrooms) },
              { label: 'Bathrooms', value: String(listing.bathrooms) },
              { label: 'Square feet', value: listing.sqft.toLocaleString() },
              { label: 'Year built', value: String(listing.yearBuilt) },
            ].map((fact) => (
              <div key={fact.label} className="flex flex-col-reverse gap-0.5">
                <dt className="text-[15px] text-slate-600">{fact.label}</dt>
                <dd className="text-[26px] font-semibold tracking-[-0.02em] leading-tight text-slate-900 tabular-nums">{fact.value}</dd>
              </div>
            ))}
          </dl>

          {/* Description Prose */}
          <div className="space-y-3.5">
            <h2 className="text-[22px] font-semibold tracking-[-0.02em] text-slate-900">From the owner</h2>
            <FormattedText text={listing.description} className="text-[18px] text-slate-700 leading-[1.6] max-w-[38em] break-words" />
          </div>

          {/* Cash-Back Seller's Offer Explainer Banner */}
          {listing.offersCashback && listing.cashbackAmount > 0 && (
            <div className="p-5 sm:p-6 rounded-2xl bg-mist space-y-2.5">
              <div className="flex items-center gap-2 text-slate-900 font-semibold text-[17px]">
                <span>Seller's cash-back offer: {formatCAD(listing.cashbackAmount)}</span>
              </div>
              <p className="text-[15px] text-slate-700 leading-relaxed">
                The homeowner is offering a <strong>{formatCAD(listing.cashbackAmount)}</strong> credit to the buyer at completion. This is the seller's own voluntary offer. 
              </p>
              <div className="p-3.5 bg-white rounded-xl text-[13px] text-slate-700 space-y-1">
                <div className="font-semibold text-slate-900">
                  <span>Important terms: seller's offer (not a guarantee)</span>
                </div>
                <p className="text-[13px] leading-relaxed text-slate-700">{CASHBACK_SELLER_OFFER_NOTICE} To apply, it must be included in the purchase contract. {CONTRACT_NOTICE}</p>
                <p className="text-[13px] leading-relaxed text-slate-900 font-medium">{CASHBACK_LENDER_NOTICE}</p>
              </div>
            </div>
          )}

          {/* Agents welcome: the seller's buyer's agent commission offer */}
          {listing.agentsWelcome && !listing.isExample && (
            <div className="p-5 sm:p-6 rounded-2xl bg-white border border-hairline space-y-2">
              <div className="flex items-center gap-2 font-semibold text-[17px] text-slate-900">
                <span>Agents welcome</span>
              </div>
              <p className="text-sm text-slate-700 leading-relaxed">
                The owner will pay a buyer's agent commission of <strong>{describeAgentCommission(listing)}</strong> to the agent's brokerage if
                the agent's client buys this home.
              </p>
              <p className="text-[13px] text-slate-600 leading-relaxed">
                Agents: message the owner to confirm the commission in writing before you book a showing. The owner is selling without an agent of
                their own, so follow your regulator's rules for dealing with an unrepresented seller. {AGENT_OFFER_NOTICE}
              </p>
            </div>
          )}

          {/* Secondary Property Details Table */}
          <div className="space-y-3">
            <h2 className="text-[22px] font-semibold tracking-[-0.02em] text-slate-900">Details</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 text-[15px]">
              <div className="flex justify-between py-1.5 border-b border-hairline">
                <span className="text-slate-600">Property type</span>
                <span className="font-semibold text-slate-900">{listing.propertyType}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-hairline">
                <span className="text-slate-600">Year built</span>
                <span className="font-semibold text-slate-900 tabular-nums">{listing.yearBuilt}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-hairline">
                <span className="text-slate-600">Parking</span>
                <span className="font-semibold text-slate-900">{listing.parkingSpaces} {listing.parkingSpaces === 1 ? 'spot' : 'spots'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-hairline">
                <span className="text-slate-600">Lot size</span>
                <span className="font-semibold text-slate-900 tabular-nums">
                  {listing.lotAcres ? `${listing.lotAcres} acres` : listing.lotSqft ? `${listing.lotSqft.toLocaleString()} sq ft` : 'Not listed'}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-hairline">
                <span className="text-slate-600">Annual property taxes</span>
                <span className="font-semibold text-slate-900 tabular-nums">
                  {listing.propertyTaxesAnnual ? formatCAD(listing.propertyTaxesAnnual) : 'Contact Owner'}
                </span>
              </div>
              {listing.strataFee && listing.strataFee > 0 ? (
                <div className="flex justify-between py-1.5 border-b border-hairline">
                  <span className="text-slate-600">Monthly strata fee</span>
                  <span className="font-semibold text-slate-900 tabular-nums">{formatCAD(listing.strataFee)} / mo</span>
                </div>
              ) : null}
              <div className="flex justify-between py-1.5 border-b border-hairline">
                <span className="text-slate-600">Listed by</span>
                <span className="font-semibold text-emerald-800">{isExample && !isPreview ? "Example (no seller)" : "The owner"}</span>
              </div>
            </div>
          </div>

          {/* Monthly cost and closing costs (not for sold homes) */}
          {listing.status !== 'sold' && listing.price > 0 && (
            <CostCalculator
              key={listing.id}
              price={listing.price}
              province={listing.province || 'BC'}
              city={listing.city}
              propertyTaxYear={listing.propertyTaxesAnnual || undefined}
              strataMonth={listing.strataFee || undefined}
            />
          )}

          {/* Recent Upgrades & Inclusions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {listing.recentUpgrades && listing.recentUpgrades.length > 0 && (
              <div className="p-5 bg-mist rounded-2xl space-y-3">
                <h3 className="text-[16px] font-semibold text-slate-900">
                  Recent upgrades and features
                </h3>
                <ul className="space-y-2 text-[15px] text-slate-700">
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
              <div className="p-5 bg-mist rounded-2xl space-y-3">
                <h3 className="text-[16px] font-semibold text-slate-900">
                  Included in purchase
                </h3>
                <ul className="space-y-2 text-[15px] text-slate-700">
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
              <h2 className="text-[22px] font-semibold tracking-[-0.02em] text-slate-900">The neighbourhood</h2>
              <FormattedText text={listing.neighborhoodHighlights} className="text-[16px] text-slate-700 leading-relaxed max-w-[40em] break-words" />
            </div>
          )}

          {/* Approximate Location Map (examples have no location) */}
          {!isExample && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-[22px] font-semibold tracking-[-0.02em] text-slate-900">Around the home</h2>
              <span className="text-[15px] text-slate-600">
                {listing.neighborhood}, {listing.city}
              </span>
            </div>
            {GOOGLE_EMBED_KEY ? (
              <GoogleEmbedMap
                listing={listing}
                approximate={!hasApprovedViewing}
                heightClass="h-[340px]"
              />
            ) : (
              <MapLibreMap
                listings={[listing]}
                singleListing={listing}
                approximateMode={!hasApprovedViewing}
                heightClass="h-[340px]"
              />
            )}
          </div>
          )}

          {/* Report Listing Link */}
          {!isExample && (
          <div className="pt-4 border-t border-hairline flex items-center justify-between gap-4 text-[13px] text-slate-600">
            <span>Listing ID: {listing.id}</span>
            <button
              onClick={handleOpenReport}
              className="text-slate-600 hover:text-rose-700 underline underline-offset-2 flex items-center gap-1 cursor-pointer transition-colors min-h-[44px]"
            >
              <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Report this listing</span>
            </button>
          </div>
          )}
        </div>

        {/* Right column: "Talk to the owner" (sticks beside the details on wide screens) */}
        <aside aria-label="Talk to the owner" className="lg:col-span-4 lg:sticky lg:top-6">
          <div className="bg-white rounded-2xl border-[1.5px] border-slate-900 p-6 sm:p-7 space-y-4">
            
            <div className="space-y-2">
              <h2 className="text-[20px] font-semibold tracking-[-0.02em] text-slate-900">
                {isExample && !isPreview ? 'Selling a home like this?' : 'Talk to the owner'}
              </h2>
              {!(isExample && !isPreview) && (
                <p className="text-[16px] leading-normal text-slate-600">
                  This home is listed by the person who owns it{!isExample && listing.sellerName && listing.sellerName !== 'Homeowner' ? `, ${listing.sellerName}` : ''}. There’s no agent in between.
                </p>
              )}
              {listing.offersCashback && (
                <p className="text-[15px] text-emerald-700 font-medium">
                  Includes {formatCAD(listing.cashbackAmount)} buyer cash-back credit
                </p>
              )}
            </div>

            {!isExample && (
              <OpenHouseCard
                listing={listing}
                activeUser={activeUser}
                isOwner={isOwner}
                onSignIn={() =>
                  onOpenAuth?.('signup', {
                    title: 'Create a free account to come to the open house',
                    subtitle: 'We’ll send you the address and a reminder a few hours before.',
                  })
                }
              />
            )}

            {/* Actions */}
            {isPreview ? (
              <div className="rounded-xl bg-mist p-4 text-[15px] text-slate-700 space-y-1.5">
                <div className="font-semibold text-slate-900">Buyers see “Request a viewing” and “Message the owner” here.</div>
                <p>You choose which viewing times to accept, and messages arrive in your dashboard and by email.</p>
              </div>
            ) : isExample ? (
              <div className="space-y-3">
                <div className="rounded-xl bg-sign/25 p-4 text-[15px] text-slate-900">
                  <b className="font-semibold">Example listing.</b> Not a real home and not for sale, so it can’t be viewed or messaged.
                </div>
                <p className="text-[16px] text-slate-600">List yours for $24.99 a month, no commission. Buyers message you directly to book a viewing.</p>
                <button
                  onClick={onListYourHome}
                  className="w-full om-btn om-btn-dark !min-h-[54px] !text-[17px]"
                >
                  List your home
                </button>
              </div>
            ) : isOwner ? (
              <div className="rounded-xl bg-fern p-4 text-[15px] text-slate-900 space-y-1.5">
                <div className="font-semibold">This is your listing</div>
                <p>Buyer messages and viewing requests for this home appear in your dashboard.</p>
              </div>
            ) : (
            <div className="space-y-3">
              <p className="text-[15px] text-slate-600">
                {listing.showAddress
                  ? 'Pick a time that suits you, and the owner confirms it.'
                  : 'Pick a time that suits you. The owner confirms, then the exact address is shared with you.'}
              </p>
              <button
                onClick={handleOpenViewing}
                className="w-full om-btn om-btn-primary !min-h-[54px] !text-[17px]"
              >
                Request a viewing
              </button>

              <button
                onClick={handleOpenMessage}
                className="w-full om-btn om-btn-outline !min-h-[54px] !text-[17px]"
              >
                Message the owner
              </button>

              <div className="flex items-center justify-center gap-x-6 flex-wrap">
                <button
                  onClick={handleOpenOffer}
                  className="text-[16px] font-semibold text-emerald-700 hover:text-slate-900 underline underline-offset-[3px] min-h-[44px] cursor-pointer"
                >
                  Make an offer
                </button>
                <button
                  onClick={(e) => onToggleFavorite(e, listing.id)}
                  aria-pressed={isFavorited}
                  className="text-[16px] font-semibold text-emerald-700 hover:text-slate-900 underline underline-offset-[3px] min-h-[44px] cursor-pointer"
                >
                  {isFavorited ? 'Saved' : 'Save this home'}
                </button>
              </div>
              {offerSent && (
                <p className="text-[15px] text-slate-900 bg-fern rounded-xl p-3.5" role="status">
                  Your offer was sent. The owner can accept, counter or decline, and you’ll see their answer in your dashboard under Offers.
                </p>
              )}
            </div>
            )}

            {/* Verbatim Statutory Brokerage Notice */}
            <div className="pt-4 border-t border-hairline text-[13px] text-slate-600 leading-relaxed space-y-1">
              <div className="font-semibold text-slate-900">
                <span>Notice to buyers and sellers</span>
              </div>
              <p>
                This site is an advertising platform. We are not a real estate brokerage and do not provide real estate advice. Sellers and buyers should consult a lawyer or notary before signing any agreement.
              </p>
            </div>
          </div>
        </aside>
      </div>

      {/* Mobile Sticky Bottom CTA Bar (< lg) */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-hairline px-4 py-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[13px] text-slate-600">{isExample && !isPreview ? 'Example · not for sale' : 'Asking price'}</div>
          <div className="text-[22px] font-semibold tracking-[-0.02em] leading-tight text-slate-900 truncate tabular-nums">
            {formatCAD(listing.price)}
          </div>
        </div>

        {isExample && !isPreview && (
          <button
            onClick={onListYourHome}
            className="om-btn om-btn-dark shrink-0 !px-5"
          >
            List your home
          </button>
        )}
        {!isOwner && !isExample && (
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleOpenMessage}
            className="om-btn om-btn-outline !px-0 min-w-[48px]"
            aria-label="Message the owner"
          >
            <MessageSquare className="w-5 h-5" aria-hidden="true" />
          </button>

          <button
            onClick={handleOpenViewing}
            className="om-btn om-btn-primary !px-5"
          >
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
        onRequireAuth={() =>
          onOpenAuth?.('signup', {
            title: 'Create a free account to send your message',
            subtitle: 'Your message is saved. Once you’re signed in, we send it to the owner.',
          })
        }
      />

      <ReportModal
        listing={listing}
        isOpen={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
      />

      <OfferModal listing={listing} isOpen={offerOpen} onClose={() => setOfferOpen(false)} onSent={() => setOfferSent(true)} />
      </>
      )}
    </div>
  );
};
