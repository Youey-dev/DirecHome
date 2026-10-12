import React from 'react';
import { Listing } from '../types/listing';
import { formatCAD } from '../lib/commissionCalc';
import { Heart, Sparkles, MapPin, Eye } from 'lucide-react';

interface ListingCardProps {
  listing: Listing;
  isFavorited: boolean;
  onToggleFavorite: (e: React.MouseEvent, id: string) => void;
  onSelect: (id: string) => void;
}

export const ListingCard: React.FC<ListingCardProps> = ({
  listing,
  isFavorited,
  onToggleFavorite,
  onSelect
}) => {
  const coverPhoto = listing.photos.find((p) => p.isCover) || listing.photos[0];

  return (
    <article
      onClick={() => onSelect(listing.id)}
      className="group bg-white rounded-2xl border border-slate-200 overflow-hidden cursor-pointer transition-all duration-200 hover:shadow-md hover:border-slate-300 flex flex-col focus-within:ring-2 focus-within:ring-emerald-700"
    >
      {/* 4:3 Aspect Ratio Cover Photo Container */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100">
        <img
          src={coverPhoto?.thumbnailUrl || coverPhoto?.url}
          alt={`${listing.headline} - ${listing.city}, BC`}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          loading="lazy"
        />

        {/* Gradient scrim for top overlays */}
        <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/50 to-transparent pointer-events-none" />

        {/* Favorite Button (44px min tap area) */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(e, listing.id);
          }}
          aria-label={isFavorited ? 'Remove from saved' : 'Save this listing'}
          className="absolute top-2.5 right-2.5 w-11 h-11 rounded-full bg-white/90 backdrop-blur-sm text-slate-700 hover:text-rose-600 flex items-center justify-center shadow-sm transition-all active:scale-90"
        >
          <Heart
            className={`w-5 h-5 transition-colors ${
              isFavorited ? 'fill-rose-500 text-rose-500' : 'text-slate-700'
            }`}
          />
        </button>

        {/* Status indicator if not live (e.g. In Review, Paused, Sold) */}
        {listing.status !== 'live' && (
          <div className="absolute top-3 left-3 bg-slate-900/90 text-white text-[11px] font-semibold px-2.5 py-1 rounded-md uppercase tracking-wider backdrop-blur-sm">
            {listing.status === 'in_review' ? 'In Review' : listing.status}
          </div>
        )}

        {/* Cash-back green pill on photo bottom-left when offered */}
        {listing.offersCashback && listing.cashbackAmount > 0 && (
          <div className="absolute bottom-3 left-3 bg-emerald-50 text-emerald-800 border border-emerald-200/90 shadow-sm px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>Cash-back {formatCAD(listing.cashbackAmount)}</span>
          </div>
        )}
      </div>

      {/* Card Body */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
        <div>
          {/* Price & Property Type */}
          <div className="flex items-baseline justify-between gap-2 mb-1.5">
            <div className="text-xl sm:text-2xl font-bold text-slate-900 tabular-nums">
              {formatCAD(listing.price)}
            </div>
            <div className="text-xs text-slate-500 font-medium truncate">
              {listing.propertyType}
            </div>
          </div>

          {/* Clean Unboxed Metadata with · separator */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600 mb-2 font-medium">
            <span>{listing.bedrooms} bds</span>
            <span aria-hidden="true">·</span>
            <span>{listing.bathrooms} ba</span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">{listing.sqft.toLocaleString()} sqft</span>
            {listing.lotAcres && (
              <>
                <span aria-hidden="true">·</span>
                <span>{listing.lotAcres} ac</span>
              </>
            )}
          </div>

          {/* Location & Neighborhood */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500 truncate mb-1">
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate">
              {listing.neighborhood}, {listing.city}
            </span>
          </div>

          {/* Headline */}
          <h4 className="text-sm font-semibold text-slate-900 line-clamp-1 group-hover:text-emerald-800 transition-colors">
            {listing.headline}
          </h4>
        </div>

        {/* Bottom micro-footer: Seller Direct marker & savings */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
          <span className="text-emerald-800 font-medium">
            Direct from Owner · No Listing Agent
          </span>
          <span className="tabular-nums">
            {listing.viewsCount} views
          </span>
        </div>
      </div>
    </article>
  );
};
