import React from 'react';
import { Listing } from '../types/listing';
import { formatCAD } from '../lib/commissionCalc';
import { Heart } from 'lucide-react';
import { priceDrop, shortDay, timeRange, upcomingOpenHouses } from '../lib/listingNews';

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
  const openHouse = upcomingOpenHouses(listing)[0];
  const drop = priceDrop(listing);

  const typeWord = typeLabel.charAt(0).toUpperCase() + typeLabel.slice(1);
  const town = [listing.city, listing.province].filter(Boolean).join(', ');
  const badge = 'bg-white/95 text-slate-900 text-[13px] font-medium px-2.5 py-1 rounded-full';

  return (
    <article
      onClick={() => onSelect(listing.id)}
      className="group relative flex flex-col gap-3.5 cursor-pointer text-slate-900"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[14px] bg-fern">
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
          <div className="absolute top-3 left-3 bg-sign text-slate-900 text-[13px] font-semibold px-2.5 py-1 rounded-full">
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
          aria-pressed={isFavorited}
          className="absolute z-10 top-2.5 right-2.5 w-11 h-11 rounded-full bg-white/95 text-slate-900 hover:text-rose-700 flex items-center justify-center transition-transform active:scale-90 cursor-pointer"
        >
          <Heart className={`w-5 h-5 ${isFavorited ? 'fill-rose-600 text-rose-600' : ''}`} aria-hidden="true" />
        </button>
        )}

        {listing.status !== 'live' && !listing.isExample && (
          <div className="absolute top-3 left-3 bg-slate-900 text-white text-[13px] font-medium px-2.5 py-1 rounded-full">
            {listing.status === 'in_review' ? 'In review' : listing.status}
          </div>
        )}

        <div className="absolute bottom-3 left-3 right-3 flex flex-wrap gap-1.5">
          {openHouse && (
            <span className={badge}>
              Open house {shortDay(openHouse.startsAt, listing.province)} · {timeRange(openHouse, listing.province)}
            </span>
          )}
          {drop && (
            <span className={`${badge} !text-red-800`}>Price reduced {formatCAD(drop.amount)}</span>
          )}
          {listing.offersCashback && listing.cashbackAmount > 0 && (
            <span className={badge}>
              {formatCAD(listing.cashbackAmount)} cash back
            </span>
          )}
          {listing.agentsWelcome && (
            <span className={badge}>Agents welcome</span>
          )}
          {listing.photos.length > 0 && !openHouse && !drop && !(listing.offersCashback && listing.cashbackAmount > 0) && !listing.agentsWelcome && (
            <span className={badge}>
              {listing.photos.length} {listing.photos.length === 1 ? 'photo' : 'photos'}
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex items-baseline justify-between gap-4">
          <h3 className="flex items-baseline gap-2 flex-wrap min-w-0">
            {/* The whole card is one link: this link is stretched over it, so ctrl/cmd-click opens a new tab */}
            <a
              href={listing.isExample ? `/example/${listing.id.replace(/^example-/, '')}` : `/listing/${listing.id}`}
              onClick={(e) => {
                // Let the card's own click open the listing in the app; ctrl/cmd-click opens a new tab.
                if (e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) e.preventDefault();
              }}
              className="om-stretched focus-visible:outline-none text-[24px] font-semibold tracking-[-0.02em] leading-tight tabular-nums text-slate-900 after:absolute after:inset-0 after:rounded-[14px] focus-visible:after:outline-2 focus-visible:after:outline-offset-4 focus-visible:after:outline-slate-900"
            >
              {formatCAD(listing.price)}
              <span className="sr-only">, {listing.headline}, {place}</span>
            </a>
            {drop && <span className="text-[15px] text-slate-600 line-through tabular-nums">{formatCAD(drop.from)}</span>}
          </h3>
          <span className="text-[16px] text-slate-600 text-right truncate shrink min-w-0">{town}</span>
        </div>
        <span className="text-[16px] text-slate-600">
          {typeWord}, {listing.bedrooms} bed, {listing.bathrooms} bath{listing.sqft ? `, ${listing.sqft.toLocaleString()} sq ft` : ''}
        </span>
      </div>
    </article>
  );
};
