import React, { useState, useMemo } from 'react';
import { Listing, PropertyType } from '../types/listing';
import { ListingCard } from '../components/ListingCard';
import { MapLibreMap } from '../components/MapLibreMap';
import { BC_CITIES } from '../data/mockListings';
import { 
  Filter, 
  Map as MapIcon, 
  List, 
  Columns, 
  Search, 
  Sparkles, 
  RotateCcw,
  SlidersHorizontal,
  X
} from 'lucide-react';

interface BrowsePageProps {
  listings: Listing[];
  savedIds: string[];
  onToggleFavorite: (e: React.MouseEvent, id: string) => void;
  onSelectListing: (id: string) => void;
}

export const BrowsePage: React.FC<BrowsePageProps> = ({
  listings,
  savedIds,
  onToggleFavorite,
  onSelectListing
}) => {
  const [viewMode, setViewMode] = useState<'split' | 'list' | 'map'>('split');
  const [selectedListingId, setSelectedListingId] = useState<string | undefined>(undefined);
  
  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('All Cities');
  const [propertyType, setPropertyType] = useState<string>('All');
  const [minPrice, setMinPrice] = useState<number | ''>('');
  const [maxPrice, setMaxPrice] = useState<number | ''>('');
  const [minBeds, setMinBeds] = useState<number>(0);
  const [minBaths, setMinBaths] = useState<number>(0);
  const [cashbackOnly, setCashbackOnly] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<'newest' | 'price_asc' | 'price_desc' | 'cashback_desc'>('newest');
  
  // Mobile filter drawer state
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Filter listings
  const filteredListings = useMemo(() => {
    return listings
      .filter((l) => l.status === 'live')
      .filter((l) => {
        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const match = 
            l.streetAddress.toLowerCase().includes(q) ||
            l.city.toLowerCase().includes(q) ||
            l.neighborhood.toLowerCase().includes(q) ||
            l.headline.toLowerCase().includes(q);
          if (!match) return false;
        }

        // City
        if (selectedCity !== 'All Cities' && l.city !== selectedCity) {
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
    selectedCity,
    propertyType,
    minPrice,
    maxPrice,
    minBeds,
    minBaths,
    cashbackOnly,
    sortBy
  ]);

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedCity('All Cities');
    setPropertyType('All');
    setMinPrice('');
    setMaxPrice('');
    setMinBeds(0);
    setMinBaths(0);
    setCashbackOnly(false);
    setSortBy('newest');
  };

  const hasActiveFilters = 
    selectedCity !== 'All Cities' ||
    propertyType !== 'All' ||
    minPrice !== '' ||
    maxPrice !== '' ||
    minBeds > 0 ||
    minBaths > 0 ||
    cashbackOnly ||
    searchQuery.trim() !== '';

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-6 space-y-6">
      
      {/* Top Search & Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by neighborhood, street, or city (e.g. Willoughby, Langley, Kitsilano)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:bg-white transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Quick Dropdowns (Desktop) */}
          <div className="hidden lg:flex items-center gap-3">
            {/* City Dropdown */}
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-700"
            >
              {BC_CITIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            {/* Property Type Dropdown */}
            <select
              value={propertyType}
              onChange={(e) => setPropertyType(e.target.value)}
              className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-700"
            >
              <option value="All">All Property Types</option>
              <option value="Single Family Detached">Detached House</option>
              <option value="Townhouse">Townhouse</option>
              <option value="Condo / Apartment">Condo / Apartment</option>
              <option value="Acreage / Farm">Acreage / Farm</option>
            </select>

            {/* Beds Dropdown */}
            <select
              value={minBeds}
              onChange={(e) => setMinBeds(Number(e.target.value))}
              className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-700"
            >
              <option value={0}>Any Beds</option>
              <option value={1}>1+ Beds</option>
              <option value={2}>2+ Beds</option>
              <option value={3}>3+ Beds</option>
              <option value={4}>4+ Beds</option>
            </select>

            {/* Cash-back toggle button */}
            <button
              onClick={() => setCashbackOnly(!cashbackOnly)}
              className={`px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border ${
                cashbackOnly
                  ? 'bg-emerald-50 text-emerald-900 border-emerald-300 ring-1 ring-emerald-600'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>Cash-Back Offered Only</span>
            </button>
          </div>

          {/* View Mode Segmented Control (Desktop) & Mobile Filter Button */}
          <div className="flex items-center justify-between lg:justify-end gap-3">
            <button
              onClick={() => setMobileFiltersOpen(true)}
              className="lg:hidden px-3.5 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-2 border border-slate-200"
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span>Filters {hasActiveFilters ? '(Active)' : ''}</span>
            </button>

            {/* View Switcher */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80">
              <button
                onClick={() => setViewMode('split')}
                className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  viewMode === 'split' ? 'bg-white text-slate-900 shadow-sm font-semibold' : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Split Map & List"
              >
                <Columns className="w-3.5 h-3.5" />
                <span>Split</span>
              </button>

              <button
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  viewMode === 'list' ? 'bg-white text-slate-900 shadow-sm font-semibold' : 'text-slate-600 hover:text-slate-900'
                }`}
                title="List View"
              >
                <List className="w-3.5 h-3.5" />
                <span>List</span>
              </button>

              <button
                onClick={() => setViewMode('map')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  viewMode === 'map' ? 'bg-white text-slate-900 shadow-sm font-semibold' : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Map View"
              >
                <MapIcon className="w-3.5 h-3.5" />
                <span>Map</span>
              </button>
            </div>
          </div>
        </div>

        {/* Results summary and Sort Strip */}
        <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-800 tabular-nums">
              {filteredListings.length} {filteredListings.length === 1 ? 'home' : 'homes'} available
            </span>
            <span>in Fraser Valley & Lower Mainland</span>
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="ml-2 text-emerald-800 hover:underline flex items-center gap-1 font-medium cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset filters</span>
              </button>
            )}
          </div>

          {/* Sort dropdown */}
          <div className="flex items-center gap-2">
            <span>Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-transparent font-medium text-slate-800 border-none focus:outline-none cursor-pointer"
            >
              <option value="newest">Newest Listed</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="cashback_desc">Highest Cash-Back</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {filteredListings.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-md mx-auto space-y-4">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Search className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">No matching homes found</h3>
          <p className="text-sm text-slate-500">
            Try broadening your price range, clearing city filters, or searching a different Fraser Valley neighborhood.
          </p>
          <button
            onClick={resetFilters}
            className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold rounded-xl transition-all cursor-pointer"
          >
            Clear All Filters
          </button>
        </div>
      ) : (
        <>
          {/* View Mode: Split Screen */}
          {viewMode === 'split' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Listings column (7 cols) */}
              <div className="lg:col-span-7 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              <div className="hidden lg:block lg:col-span-5 sticky top-20 h-[calc(100vh-100px)]">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
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
            <div className="w-full h-[calc(100vh-200px)]">
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

      {/* Mobile Filters Drawer */}
      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex justify-end animate-fadeIn">
          <div className="bg-white w-full max-w-sm h-full p-6 overflow-y-auto space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-lg font-bold text-slate-900">Filter Homes</h3>
              <button
                onClick={() => setMobileFiltersOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* City */}
            <div>
              <label htmlFor="mobile-city-filter" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                City / Region
              </label>
              <select
                id="mobile-city-filter"
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm"
              >
                {BC_CITIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Property Type */}
            <div>
              <label htmlFor="mobile-prop-type-filter" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                Property Type
              </label>
              <select
                id="mobile-prop-type-filter"
                value={propertyType}
                onChange={(e) => setPropertyType(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm"
              >
                <option value="All">All Types</option>
                <option value="Single Family Detached">Single Family Detached</option>
                <option value="Townhouse">Townhouse</option>
                <option value="Condo / Apartment">Condo / Apartment</option>
                <option value="Acreage / Farm">Acreage / Farm</option>
              </select>
            </div>

            {/* Minimum Bedrooms */}
            <div>
              <span className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                Bedrooms
              </span>
              <div className="grid grid-cols-5 gap-1.5">
                {[0, 1, 2, 3, 4].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setMinBeds(num)}
                    className={`py-2 rounded-xl text-xs font-semibold border min-h-[44px] ${
                      minBeds === num 
                        ? 'bg-emerald-700 text-white border-emerald-700' 
                        : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    {num === 0 ? 'Any' : `${num}+`}
                  </button>
                ))}
              </div>
            </div>

            {/* Cash-back Toggle */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-slate-900">Cash-Back Offered</div>
                <div className="text-xs text-slate-500">Only homes with closing credits</div>
              </div>
              <input
                type="checkbox"
                checked={cashbackOnly}
                onChange={(e) => setCashbackOnly(e.target.checked)}
                className="w-5 h-5 accent-emerald-700 rounded cursor-pointer"
              />
            </div>

            <div className="pt-4 border-t border-slate-100 flex gap-3">
              <button
                onClick={resetFilters}
                className="flex-1 py-3 text-sm font-semibold text-slate-600 bg-slate-100 rounded-xl"
              >
                Reset
              </button>
              <button
                onClick={() => setMobileFiltersOpen(false)}
                className="flex-1 py-3 text-sm font-semibold text-white bg-emerald-700 rounded-xl"
              >
                Show Results
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
