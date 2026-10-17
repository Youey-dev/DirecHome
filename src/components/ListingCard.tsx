import React from 'react';
import { Listing } from '../types/listing';
import { formatCAD } from '../lib/commissionCalc';
import { Heart } from 'lucide-react';

interface ListingCardProps {
  listing: Listing;
  isFavorited: boolean;
  onToggleFavorite: (e: React.MouseEvent, id: string) => void;
  onSelect: (id: string) => void;
}

const TYPE_LABEL: Record<string, string> = {
  'Single Family Detached': 'house',
  Townhouse: 'townhouse',
  'Condo / Apartment': 'condo',
  'Duplex / Half-Duplex': 'duplex',
  'Acreage / Farm': 'acreage',
};

export const ListingCard: React.FC<ListingCardProps> = ({
  listing,
  isFavorited,
  onToggleFavorite,
  onSelect
}) => {
  const coverPhoto = listing.photos.find((p) => p.isCover) || listing.photos[0];
  const place = [listing.neighborhood, listing.city, listing.province].filter(Boolean).join(', ');
  const typeLabel = TYPE_LABEL[listing.propertyType] ?? listing.propertyType.toLowerCase();

  return (
    <article
      onClick={() => onSelect(listing.id)}
      className="group flex flex-col gap-3 cursor-pointer text-slate-900"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-slate-200">
        {coverPhoto ? (
          <img
            src={coverPhoto.thumbnailUrl || coverPhoto.url}
            alt={`${listing.headline}, ${listing.city}`}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            loading="lazy"
          />
        ) : null}

        {listing.isExample ? (
          <div className="absolute top-3 left-3 bg-sign text-slate-900 text-xs font-bold px-2.5 py-1 rounded shadow-sm">
            Example · not for sale
          </div>
        ) : (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(e, listing.id);
          }}
          aria-label={isFavorited ? 'Remove from saved' : 'Save this listing'}
          className="absolute top-2.5 right-2.5 w-11 h-11 rounded-full bg-white text-slate-700 hover:text-rose-600 flex items-center justify-center shadow-sm transition-transform active:scale-90"
        >
          <Heart className={`w-5 h-5 ${isFavorited ? 'fill-rose-500 text-rose-500' : 'text-slate-700'}`} />
        </button>
        )}

        {listing.status !== 'live' && !listing.isExample && (
          <div className="absolute top-3 left-3 bg-slate-900 text-white text-xs font-semibold px-2.5 py-1 rounded">
            {listing.status === 'in_review' ? 'In review' : listing.status}
          </div>
        )}

        <div className="absolute bottom-3 left-3 flex flex-wrap gap-2">
          {listing.photos.length > 0 && (
            <span className="bg-white text-slate-900 text-xs font-semibold px-2.5 py-1 rounded">
              {listing.photos.length} {listing.photos.length === 1 ? 'photo' : 'photos'}
            </span>
          )}
          {listing.offersCashback && listing.cashbackAmount > 0 && (
            <span className="bg-sign text-slate-900 text-xs font-semibold px-2.5 py-1 rounded">
              {formatCAD(listing.cashbackAmount)} cash back
            </span>
          )}
          {listing.agentsWelcome && (
            <span className="bg-emerald-700 text-white text-xs font-semibold px-2.5 py-1 rounded">Agents welcome</span>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-0.5">
        <span className="font-display font-bold text-[30px] leading-none tabular-nums">
          {formatCAD(listing.price)}
        </span>
        <span className="text-[15px] font-medium pt-1">
          {listing.bedrooms} bed, {listing.bathrooms} bath {typeLabel}, {listing.sqft.toLocaleString()} sq ft
        </span>
        <span className="text-[15px] text-slate-600 truncate">{place}</span>
        <h3 className="text-sm font-semibold text-emerald-700 pt-1 line-clamp-1 group-hover:underline underline-offset-4">
          <a
            href={listing.isExample ? `/example/${listing.id.replace(/^example-/, '')}` : `/listing/${listing.id}`}
            onClick={(e) => {
              // Let the card's own click open the listing in the app; ctrl/cmd-click opens a new tab.
              if (e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) e.preventDefault();
            }}
          >
            {listing.headline}
          </a>
        </h3>
      </div>
    </article>
  );
};
