import React, { useState, useMemo } from 'react';
import { Listing, PropertyType, isListingLive } from '../types/listing';
import { ListingCard } from '../components/ListingCard';
import { RecentlySold } from '../components/RecentlySold';
import { AlertBox } from '../components/AlertBox';
import { MapLibreMap } from '../components/LazyMap';
import { OPEN_PROVINCES, ALL_PROVINCES, provinceName } from '../data/cities';
import { SlidersHorizontal, X } from 'lucide-react';

interface BrowsePageProps {
  listings: Listing[];
  savedIds: string[];
  onToggleFavorite: (e: React.MouseEvent, id: string) => void;
  onSelectListing: (id: string) => void;
  /** Filters handed over from the homepage search box. */
  initialFilters?: BrowseFilters;
  /** Signed in: alerts save in one tap. Otherwise the alert box asks to sign in. */
  signedIn?: boolean;
  onSignIn?: () => void;
}

export interface BrowseFilters {
  query?: string;
  province?: string;
  propertyType?: string;
  minPrice?: number;
  maxPrice?: number;
  minBeds?: number;
  minBaths?: number;
}

export const BrowsePage: React.FC<BrowsePageProps> = ({
  listings,
  savedIds,
  onToggleFavorite,
  onSelectListing,
  initialFilters,
  signedIn = false,
  onSignIn
}) => {
  const [viewMode, setViewMode] = useState<'split' | 'list' | 'map'>('split');
  const [selectedListingId, setSelectedListingId] = useState<string | undefined>(undefined);
  
  // Filter States
  const [searchQuery, setSearchQuery] = useState(initialFilters?.query ?? '');
  const [selectedProvince, setSelectedProvince] = useState(initialFilters?.province || ALL_PROVINCES);
  const [propertyType, setPropertyType] = useState<string>(initialFilters?.propertyType || 'All');
  const [minPrice, setMinPrice] = useState<number | ''>(initialFilters?.minPrice ?? '');
  const [maxPrice, setMaxPrice] = useState<number | ''>(initialFilters?.maxPrice ?? '');
  const [minBeds, setMinBeds] = useState<number>(initialFilters?.minBeds ?? 0);
  const [minBaths, setMinBaths] = useState<number>(initialFilters?.minBaths ?? 0);
  const [cashbackOnly, setCashbackOnly] = useState<boolean>(false);
  const [agentsOnly, setAgentsOnly] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<'newest' | 'price_asc' | 'price_desc' | 'cashback_desc'>('newest');
  
  // Mobile filter drawer state
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const realLiveCount = listings.filter((l) => isListingLive(l) && !l.isExample).length;

  // Filter listings
  const filteredListings = useMemo(() => {
    return listings
      .filter((l) => isListingLive(l))
      .filter((l) => {
        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const match = 
            (l.postalFsa ?? '').toLowerCase().includes(q) ||
            l.city.toLowerCase().includes(q) ||
            provinceName(l.province).toLowerCase().includes(q) ||
            l.neighborhood.toLowerCase().includes(q) ||
            l.headline.toLowerCase().includes(q);
          if (!match) return false;
        }

        // Province or territory
        if (selectedProvince !== ALL_PROVINCES && (l.province || 'BC') !== selectedProvince) {
          return false;
        }

        // Property Type
        if (propertyType !== 'All' && l.propertyType !== propertyType) {
          return false;
        }

        // Price range
        if (minPrice !== '' && l.price < minPrice) return false;
        if (maxPrice !== '' && l.price > maxPrice) return false;

        // Bedrooms
        if (minBeds > 0 && l.bedrooms < minBeds) return false;

        // Bathrooms
        if (minBaths > 0 && l.bathrooms < minBaths) return false;

        // Cash-back available
        if (cashbackOnly && (!l.offersCashback || l.cashbackAmount <= 0)) {
          return false;
        }

        // Owner welcomes buyer's agents (pays a buyer's agent commission)
        if (agentsOnly && !l.agentsWelcome) return false;

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'price_asc') return a.price - b.price;
        if (sortBy === 'price_desc') return b.price - a.price;
        if (sortBy === 'cashback_desc') return (b.cashbackAmount || 0) - (a.cashbackAmount || 0);
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [
    listings,
    searchQuery,
    selectedProvince,
    propertyType,
    minPrice,
    maxPrice,
    minBeds,
    minBaths,
    cashbackOnly,
    agentsOnly,
    sortBy
  ]);

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedProvince(ALL_PROVINCES);
    setPropertyType('All');
    setMinPrice('');
    setMaxPrice('');
    setMinBeds(0);
    setMinBaths(0);
    setCashbackOnly(false);
    setAgentsOnly(false);
    setSortBy('newest');
  };

  const hasActiveFilters = 
    selectedProvince !== ALL_PROVINCES ||
    propertyType !== 'All' ||
    minPrice !== '' ||
    maxPrice !== '' ||
    minBeds > 0 ||
    minBaths > 0 ||
    cashbackOnly ||
    agentsOnly ||
    searchQuery.trim() !== '';

  const where = selectedProvince === ALL_PROVINCES ? 'across Canada' : `in ${provinceName(selectedProvince)}`;
  const viewChip = (mode: 'split' | 'list' | 'map', label: string, extra = '') => (
    <button
      type="button"
      onClick={() => setViewMode(mode)}
      aria-pressed={viewMode === mode}
      className={`om-chip ${extra}`}
    >
      {label}
    </button>
  );

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 pt-2 sm:pt-4 pb-6 flex flex-col gap-8">
      {/* Search */}
      <form
        role="search"
        aria-label="Search homes"
        onSubmit={(e) => e.preventDefault()}
        className="w-full max-w-[560px] flex items-center gap-1.5 p-[5px] border-[1.5px] border-slate-900 rounded-[14px] bg-white focus-within:ring-2 focus-within:ring-emerald-700 focus-within:ring-offset-2"
      >
        <label className="relative flex-1 min-w-0 flex">
          <span className="sr-only">City, neighbourhood or postal code</span>
          <input
            type="text"
            placeholder="City or postal code"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="om-bare flex-1 min-w-0 h-11 border-0 bg-transparent pl-3 pr-10 text-[17px] text-slate-900 placeholder:text-slate-600 focus:outline-none"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label="Clear search"
              className="absolute right-0 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center text-slate-600 hover:text-slate-900 cursor-pointer"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          )}
        </label>
        <button
          type="submit"
          className="flex-none h-11 px-5 rounded-[9px] bg-emerald-700 hover:bg-emerald-800 text-white text-[16px] font-semibold cursor-pointer"
        >
          Search
        </button>
      </form>

      {/* Result heading and filters */}
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
          <h1 className="text-[28px] sm:text-[40px] leading-[1.1] font-semibold tracking-[-0.03em] text-slate-900">
            <span className="tabular-nums">{filteredListings.length}</span> {filteredListings.length === 1 ? 'home' : 'homes'} for sale by owner {where}
          </h1>
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="text-[15px] font-semibold text-emerald-700 hover:text-slate-900 underline underline-offset-[3px] min-h-[44px] cursor-pointer"
            >
              Reset filters
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Phones and tablets: the full filter list opens in a panel */}
          <button
            type="button"
            onClick={() => setMobileFiltersOpen(true)}
            className={`om-chip lg:hidden ${hasActiveFilters ? 'om-chip-on' : ''}`}
          >
            <SlidersHorizontal className="w-4 h-4" aria-hidden="true" />
            Filters{hasActiveFilters ? ' (on)' : ''}
          </button>

          <select
            aria-label="Province or territory"
            value={selectedProvince}
            onChange={(e) => setSelectedProvince(e.target.value)}
            className="om-chip hidden lg:inline-flex"
          >
            <option value={ALL_PROVINCES}>{ALL_PROVINCES}</option>
            {OPEN_PROVINCES.map((p) => (
              <option key={p.code} value={p.code}>{p.name}</option>
            ))}
          </select>

          <select
            aria-label="Maximum price"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value === '' ? '' : Number(e.target.value))}
            className="om-chip hidden lg:inline-flex"
          >
            <option value="">Any price</option>
            {[500000, 750000, 1000000, 1500000, 2000000].map((v) => (
              <option key={v} value={v}>Up to ${v.toLocaleString('en-CA')}</option>
            ))}
            {maxPrice !== '' && ![500000, 750000, 1000000, 1500000, 2000000].includes(maxPrice) && (
              <option value={maxPrice}>Up to ${maxPrice.toLocaleString('en-CA')}</option>
            )}
          </select>

          <select
            aria-label="Bedrooms"
            value={minBeds}
            onChange={(e) => setMinBeds(Number(e.target.value))}
            className="om-chip hidden lg:inline-flex"
          >
            <option value={0}>Bedrooms</option>
            <option value={1}>1+ beds</option>
            <option value={2}>2+ beds</option>
            <option value={3}>3+ beds</option>
            <option value={4}>4+ beds</option>
          </select>

          <select
            aria-label="Home type"
            value={propertyType}
            onChange={(e) => setPropertyType(e.target.value)}
            className="om-chip hidden lg:inline-flex"
          >
            <option value="All">Home type</option>
            <option value="Single Family Detached">Detached house</option>
            <option value="Townhouse">Townhouse</option>
            <option value="Condo / apartment">Condo / Apartment</option>
            <option value="Acreage / farm">Acreage / Farm</option>
          </select>

          <button
            type="button"
            onClick={() => setCashbackOnly(!cashbackOnly)}
            aria-pressed={cashbackOnly}
            className="om-chip hidden lg:inline-flex"
          >
            Cash back offered
          </button>
          <button
            type="button"
            onClick={() => setAgentsOnly(!agentsOnly)}
            aria-pressed={agentsOnly}
            className="om-chip hidden lg:inline-flex"
          >
            Agents welcome
          </button>

          <select
            aria-label="Sort by"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="om-chip"
          >
            <option value="newest">Newest first</option>
            <option value="price_asc">Price: low to high</option>
            <option value="price_desc">Price: high to low</option>
            <option value="cashback_desc">Highest cash back</option>
          </select>

          {/* Views */}
          <div role="group" aria-label="View" className="flex items-center gap-2 lg:ml-auto">
            {/* On phones the list-and-map view shows the list only, so "List" reads as chosen */}
            {viewChip('list', 'List', viewMode === 'split' ? 'max-md:!bg-slate-900 max-md:!text-white max-md:!border-slate-900' : '')}
            {viewChip('split', 'List and map', 'hidden md:inline-flex')}
            {viewChip('map', 'Map')}
          </div>
        </div>
      </div>

      {/* New-listing alert for this search */}
      {onSignIn && (
        <AlertBox
          signedIn={signedIn}
          onSignIn={onSignIn}
          criteria={{
            query: searchQuery.trim() || null,
            province: selectedProvince !== ALL_PROVINCES ? selectedProvince : null,
            propertyType: propertyType !== 'All' ? propertyType : null,
            minPrice: minPrice === '' ? null : minPrice,
            maxPrice: maxPrice === '' ? null : maxPrice,
            minBeds: minBeds || null,
            minBaths: minBaths || null,
          }}
        />
      )}

      {/* Main Content Area */}
      {filteredListings.length === 0 ? (
        <div className="py-16 text-center max-w-md mx-auto flex flex-col items-center gap-3">
          <h2 className="text-[24px] font-semibold tracking-[-0.02em] text-slate-900">{realLiveCount === 0 ? 'The first homes are going up now' : 'No matching homes found'}</h2>
          <p className="text-[16px] text-slate-600">
            {realLiveCount === 0
              ? 'Check back soon: new homes are listed by their owners every week.'
              : 'Try a wider price range, a different province, or another city or neighbourhood.'}
          </p>
          {realLiveCount > 0 && <button
            onClick={resetFilters}
            className="mt-2 om-btn om-btn-outline"
          >
            Clear all filters
          </button>}
        </div>
      ) : (
        <>
          {/* View Mode: Split Screen */}
          {viewMode === 'split' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Listings column (7 cols) */}
              <div className="lg:col-span-7">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-10">
                  {filteredListings.map((listing) => (
                    <div
                      key={listing.id}
                      onMouseEnter={() => setSelectedListingId(listing.id)}
                    >
                      <ListingCard
                        listing={listing}
                        isFavorited={savedIds.includes(listing.id)}
                        onToggleFavorite={onToggleFavorite}
                        onSelect={onSelectListing}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Sticky Map column (5 cols) */}
              <div className="hidden lg:block lg:col-span-5 sticky top-6 h-[calc(100vh-48px)] rounded-2xl overflow-hidden">
                <MapLibreMap
                  listings={filteredListings}
                  selectedListingId={selectedListingId}
                  onSelectListing={onSelectListing}
                  heightClass="h-full"
                />
              </div>
            </div>
          )}

          {/* View Mode: List Only (12 cols grid) */}
          {viewMode === 'list' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-7 gap-y-11">
              {filteredListings.map((listing) => (
                <ListingCard
                  key={listing.id}
                  listing={listing}
                  isFavorited={savedIds.includes(listing.id)}
                  onToggleFavorite={onToggleFavorite}
                  onSelect={onSelectListing}
                />
              ))}
            </div>
          )}

          {/* View Mode: Map Only */}
          {viewMode === 'map' && (
            <div className="w-full h-[calc(100vh-200px)] min-h-[420px] rounded-2xl overflow-hidden">
              <MapLibreMap
                listings={filteredListings}
                selectedListingId={selectedListingId}
                onSelectListing={onSelectListing}
                heightClass="h-full"
              />
            </div>
          )}
        </>
      )}

      {/* Up to three real homes their owners sold (hidden until there are some) */}
      <RecentlySold />

      {/* Mobile Filters Drawer */}
      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex justify-end animate-fadeIn" role="dialog" aria-modal="true" aria-labelledby="filters-title">
          <div className="bg-white w-full max-w-sm h-full p-6 overflow-y-auto space-y-6 rounded-l-2xl">
            <div className="flex items-center justify-between pb-2">
              <h2 id="filters-title" className="text-[22px] font-semibold tracking-[-0.02em] text-slate-900">Filter homes</h2>
              <button
                onClick={() => setMobileFiltersOpen(false)}
                aria-label="Close filters"
                className="p-2 text-slate-600 hover:text-slate-900 rounded-full min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            {/* City */}
            <div>
              <label htmlFor="mobile-province-filter" className="block text-[15px] font-medium text-slate-900 mb-2">
                Province or territory
              </label>
              <select
                id="mobile-province-filter"
                value={selectedProvince}
                onChange={(e) => setSelectedProvince(e.target.value)}
                className="w-full h-12 px-3 bg-white border border-hairline-strong rounded-xl text-[16px]"
              >
                <option value={ALL_PROVINCES}>{ALL_PROVINCES}</option>
                {OPEN_PROVINCES.map((p) => (
                  <option key={p.code} value={p.code}>{p.name}</option>
                ))}
              </select>
            </div>

            {/* Maximum price */}
            <div>
              <label htmlFor="mobile-price-filter" className="block text-[15px] font-medium text-slate-900 mb-2">
                Maximum price
              </label>
              <select
                id="mobile-price-filter"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full h-12 px-3 bg-white border border-hairline-strong rounded-xl text-[16px]"
              >
                <option value="">Any price</option>
                {[500000, 750000, 1000000, 1500000, 2000000].map((v) => (
                  <option key={v} value={v}>Up to ${v.toLocaleString('en-CA')}</option>
                ))}
                {maxPrice !== '' && ![500000, 750000, 1000000, 1500000, 2000000].includes(maxPrice) && (
                  <option value={maxPrice}>Up to ${maxPrice.toLocaleString('en-CA')}</option>
                )}
              </select>
            </div>

            {/* Property Type */}
            <div>
              <label htmlFor="mobile-prop-type-filter" className="block text-[15px] font-medium text-slate-900 mb-2">
                Property type
              </label>
              <select
                id="mobile-prop-type-filter"
                value={propertyType}
                onChange={(e) => setPropertyType(e.target.value)}
                className="w-full h-12 px-3 bg-white border border-hairline-strong rounded-xl text-[16px]"
              >
                <option value="All">All types</option>
                <option value="Detached house">Single Family Detached</option>
                <option value="Townhouse">Townhouse</option>
                <option value="Condo / apartment">Condo / Apartment</option>
                <option value="Acreage / farm">Acreage / Farm</option>
              </select>
            </div>

            {/* Minimum Bedrooms */}
            <div>
              <span className="block text-[15px] font-medium text-slate-900 mb-2">
                Bedrooms
              </span>
              <div className="grid grid-cols-5 gap-1.5">
                {[0, 1, 2, 3, 4].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setMinBeds(num)}
                    aria-pressed={minBeds === num}
                    className="om-chip justify-center !px-0"
                  >
                    {num === 0 ? 'Any' : `${num}+`}
                  </button>
                ))}
              </div>
            </div>

            {/* Cash-back Toggle */}
            <div className="pt-4 border-t border-hairline flex items-center justify-between gap-4">
              <div>
                <div className="text-[15px] font-medium text-slate-900">Cash back offered</div>
                <div className="text-[13px] text-slate-600">Only homes with closing credits</div>
              </div>
              <input
                type="checkbox"
                checked={cashbackOnly}
                onChange={(e) => setCashbackOnly(e.target.checked)}
                className="w-5 h-5 accent-emerald-700 rounded cursor-pointer"
              />
            </div>

            {/* Agents welcome Toggle */}
            <div className="pt-4 border-t border-hairline flex items-center justify-between gap-4">
              <div>
                <div className="text-[15px] font-medium text-slate-900">Agents welcome</div>
                <div className="text-[13px] text-slate-600">Owner pays a buyer's agent commission</div>
              </div>
              <input
                type="checkbox"
                checked={agentsOnly}
                onChange={(e) => setAgentsOnly(e.target.checked)}
                className="w-5 h-5 accent-emerald-700 rounded cursor-pointer"
              />
            </div>

            <div className="pt-4 border-t border-hairline flex gap-3">
              <button
                onClick={resetFilters}
                className="flex-1 om-btn om-btn-outline"
              >
                Reset
              </button>
              <button
                onClick={() => setMobileFiltersOpen(false)}
                className="flex-1 om-btn om-btn-primary"
              >
                Show results
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
