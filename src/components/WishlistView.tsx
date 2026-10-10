import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import ListingCard from '@/components/ListingCard';
import { 
  Heart, 
  Search, 
  ChevronDown, 
  ArrowRight
} from 'lucide-react';

interface WishlistViewProps {
  wishlist: string[];
  listings: any[];
  onWishlistToggle: (id: string, e?: React.MouseEvent) => void;
  onView: (listing: any) => void;
  onBook?: (listing: any) => void;
  onChat?: (listing: any) => void;
  onExplore?: () => void;
  onBack?: () => void;
}

export default function WishlistView({ 
  wishlist = [], 
  listings = [], 
  onWishlistToggle, 
  onView, 
  onBook,
  onChat,
  onExplore, 
  onBack 
}: WishlistViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('recent');

  const wishlistedItems = (listings || []).filter(listing => (wishlist || []).includes(listing?.id));

  const getNumericPrice = (item: any) => {
    const raw = item.cost || item.price || item.startingPrice || 0;
    const num = parseFloat(String(raw).replace(/[^0-9.]/g, ''));
    return isNaN(num) ? 0 : num;
  };

  const getNumericDuration = (item: any) => {
    const raw = item.duration || (item.itinerary ? item.itinerary.length : 0);
    const num = parseFloat(String(raw).replace(/[^0-9.]/g, ''));
    return isNaN(num) ? 0 : num;
  };

  const filteredItems = wishlistedItems.filter(item => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      (item?.title || '').toLowerCase().includes(query) || 
      (item?.countryName || '').toLowerCase().includes(query) ||
      (item?.stateName || '').toLowerCase().includes(query) ||
      (item?.destination || '').toLowerCase().includes(query) ||
      (item?.agencyName || '').toLowerCase().includes(query)
    );
  }).sort((a, b) => {
    if (sortBy === 'price_asc') return getNumericPrice(a) - getNumericPrice(b);
    if (sortBy === 'price_desc') return getNumericPrice(b) - getNumericPrice(a);
    if (sortBy === 'duration_asc') return getNumericDuration(a) - getNumericDuration(b);
    if (sortBy === 'duration_desc') return getNumericDuration(b) - getNumericDuration(a);
    if (sortBy === 'name_asc') return (a.title || '').localeCompare(b.title || '');
    if (sortBy === 'name_desc') return (b.title || '').localeCompare(a.title || '');
    // Default 'recent': retain wishlist order (last added first)
    const idxA = (wishlist || []).indexOf(a?.id);
    const idxB = (wishlist || []).indexOf(b?.id);
    return idxB - idxA;
  });

  return (
    <div className="w-full bg-[#fcfdfd] min-h-screen py-6 sm:py-8 px-4 sm:px-6 lg:px-8 font-sans pb-24 sm:pb-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header & Controls Strip (Rendered when wishlist has items) */}
        {wishlistedItems.length > 0 && (
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  Wishlist
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-600 text-xs font-bold">
                  {wishlistedItems.length} {wishlistedItems.length === 1 ? 'Package' : 'Packages'}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
                Save, organize, and compare your favorite travel itineraries in one place.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full md:w-auto">
              <div className="relative flex-1 sm:flex-none">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <Input 
                  placeholder="Search saved packages..." 
                  className="pl-9 pr-4 py-2 w-full sm:w-60 md:w-64 border-slate-200 bg-white shadow-2xs text-xs font-medium focus-visible:ring-orange-500"
                  style={{ borderRadius: '6px' }}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="relative inline-block shrink-0">
                <select 
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  <option value="recent">Recently Added</option>
                  <option value="price_asc">Price: Low to High</option>
                  <option value="price_desc">Price: High to Low</option>
                  <option value="duration_asc">Duration: Short to Long</option>
                  <option value="duration_desc">Duration: Long to Short</option>
                  <option value="name_asc">Name (A-Z)</option>
                  <option value="name_desc">Name (Z-A)</option>
                </select>
                <Button 
                  variant="outline" 
                  className="border-slate-200 bg-white text-slate-700 shadow-2xs text-xs font-bold hover:bg-slate-50 flex items-center gap-1.5 px-4 py-2"
                  style={{ borderRadius: '6px' }}
                >
                  <span>Sort by:</span>
                  <span className="text-orange-600">
                    {sortBy === 'recent' ? 'Recently Added' :
                     sortBy === 'price_asc' ? 'Price (Low to High)' :
                     sortBy === 'price_desc' ? 'Price (High to Low)' :
                     sortBy === 'duration_asc' ? 'Duration (Short)' :
                     sortBy === 'duration_desc' ? 'Duration (Long)' :
                     sortBy === 'name_asc' ? 'Name (A-Z)' : 'Name (Z-A)'}
                  </span>
                  <ChevronDown className="ml-1 h-3.5 w-3.5 text-slate-400" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Content Section */}
        {wishlistedItems.length === 0 ? (
          /* Clean & Open Empty Wishlist State */
          <div className="py-16 sm:py-24 px-4 flex flex-col items-center justify-center text-center max-w-2xl mx-auto">
            
            {/* Soft Heart Icon */}
            <div className="w-16 h-16 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center mb-5 shadow-xs">
              <Heart className="w-8 h-8 text-rose-500 fill-rose-500/20" />
            </div>

            {/* Title & Inspirational Subtitle */}
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight mb-3">
              Your Dream Adventures Start Here
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-normal max-w-lg leading-relaxed mb-8">
              The world is full of unforgettable journeys waiting to be explored. Save your favorite packages as you browse to organize itineraries, compare options, and keep your dream getaways ready.
            </p>

            {/* CTA Button */}
            {onExplore && (
              <Button
                onClick={onExplore}
                className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-extrabold text-xs sm:text-sm px-8 py-3 shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer flex items-center gap-2 border border-amber-400/50"
                style={{ borderRadius: '6px' }}
              >
                <span>Explore Packages</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            )}
          </div>
        ) : filteredItems.length === 0 ? (
          /* Search Results Empty State */
          <div className="py-16 text-center bg-white rounded-2xl border border-slate-200/80 p-8 max-w-md mx-auto">
            <Search className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800 mb-1">No saved packages match &quot;{searchQuery}&quot;</h3>
            <p className="text-xs text-slate-500 mb-4">Try checking for typos or searching by destination name.</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSearchQuery('')}
              className="border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold shadow-2xs"
              style={{ borderRadius: '6px' }}
            >
              Clear Search
            </Button>
          </div>
        ) : (
          /* 3-Column Responsive Listing Cards Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 w-full justify-items-center sm:justify-items-stretch">
            {filteredItems.map((pkg) => (
              <div key={pkg.id} className="w-full flex flex-col h-full self-stretch">
                <ListingCard
                  listing={pkg}
                  onView={onView}
                  onBook={onBook}
                  onChat={onChat}
                  onWishlist={(id) => onWishlistToggle(id)}
                  isWishlisted={true}
                  variant="user"
                  showCompare={true}
                />
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
