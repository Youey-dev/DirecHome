import React from 'react';
import { Listing } from '../types/listing';
import { ListingCard } from '../components/ListingCard';
import { Heart, Compass, ArrowRight } from 'lucide-react';

interface SavedPageProps {
  listings: Listing[];
  savedIds: string[];
  onToggleFavorite: (e: React.MouseEvent, id: string) => void;
  onSelectListing: (id: string) => void;
  onNavigate: (tab: string) => void;
}

export const SavedPage: React.FC<SavedPageProps> = ({
  listings,
  savedIds,
  onToggleFavorite,
  onSelectListing,
  onNavigate
}) => {
  const savedListings = listings.filter((l) => savedIds.includes(l.id));

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-6 pb-20 space-y-6">
      <div className="border-b border-slate-200 pb-4">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-rose-600">
          <Heart className="w-4 h-4 fill-rose-500" />
          <span>Your Shortlist</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
          Saved Homes
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Keep track of homes you want to tour or monitor for price & cash-back updates.
        </p>
      </div>

      {savedListings.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-md mx-auto space-y-4">
          <div className="w-14 h-14 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center mx-auto">
            <Heart className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">No saved homes yet</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Tap the heart on any listing to save it to your shortlist.
          </p>
          <button
            onClick={() => onNavigate('browse')}
            className="px-6 py-3 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 mx-auto cursor-pointer min-h-[44px]"
          >
            <Compass className="w-4 h-4" />
            <span>Browse Homes Now</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {savedListings.map((listing) => (
            <ListingCard
              key={listing.id}
              listing={listing}
              isFavorited={true}
              onToggleFavorite={onToggleFavorite}
              onSelect={onSelectListing}
            />
          ))}
        </div>
      )}
    </div>
  );
};
