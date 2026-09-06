import React, { useState } from 'react';
import ListingCard from '@/components/ListingCard';
import { event } from '@/lib/gtag';
import {
  PackageListing,
  getCategoryCollections,
  getPopularDestinations,
  getRegionalDestinations,
  getRecentlyAddedPackages,
  getIntentRails,
  getStateStories,
  getDynamicExperiences,
  getDynamicDestinationSections,
  getDiscoveredDestinationPills,
  EXPERIENCE_TAGLINES,
} from '@/lib/discoveryEngine';
import {
  ChevronLeft,
  ChevronRight,
  MapPin,
  Compass,
  ArrowRight,
  Globe,
  Map,
  Users,
  Heart,
  Mountain,
  Trees,
  Landmark,
  Camera,
  Car,
  Sparkles,
  Search,
  MessageSquare,
  BadgePercent,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';

interface LandingDiscoveryProps {
  listings: PackageListing[];
  onView: (listing: PackageListing) => void;
  onBook: (listing: PackageListing) => void;
  onChat: (listing: PackageListing) => void;
  onWishlist: (listingId: string) => void;
  wishlist: string[];
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  allDestinations: string[];
  onSelectCategoryFilter: (filter: { category: string; subcategory?: string; title: string }) => void;
  initialPackageTypeTab?: 'all' | 'domestic' | 'international';
}

export default function LandingDiscovery({
  listings,
  onView,
  onBook,
  onChat,
  onWishlist,
  wishlist,
  searchTerm,
  setSearchTerm,
  allDestinations,
  onSelectCategoryFilter,
  initialPackageTypeTab,
}: LandingDiscoveryProps) {
  // Tab state for Domestic vs International
  const [packageTypeTab, setPackageTypeTab] = useState<'all' | 'domestic' | 'international'>(
    initialPackageTypeTab || 'all'
  );

  React.useEffect(() => {
    if (initialPackageTypeTab) {
      setPackageTypeTab(initialPackageTypeTab);
    }
  }, [initialPackageTypeTab]);

  // Counts
  const approvedListings = listings.filter((l) => l.approved !== false);
  const domesticCount = approvedListings.filter((l) => l.packageType !== 'international').length;
  const intlCount = approvedListings.filter((l) => l.packageType === 'international').length;

  const [aiStories, setAiStories] = useState<any[]>([]);

  React.useEffect(() => {
    async function loadPublishedStories() {
      try {
        const res = await fetch('/api/admin/destination-stories');
        const data = await res.json();
        if (data.success && Array.isArray(data.stories)) {
          const publishedOnly = data.stories.filter((s: any) => s.published !== false);
          if (publishedOnly.length > 0) {
            setAiStories(publishedOnly);
          }
        }
      } catch (err) {
        console.warn('Could not load custom AI destination stories:', err);
      }
    }
    loadPublishedStories();
  }, []);

  // Dynamic auto-created destination sections & navigation pills
  const destinationSections = getDynamicDestinationSections(listings, packageTypeTab);
  const destinationPills = getDiscoveredDestinationPills(listings, packageTypeTab);

  // Data collections
  const popularDestinations = getPopularDestinations(listings, 1);
  const regionalDestinations = getRegionalDestinations(listings, 1);
  const [activeRegionId, setActiveRegionId] = useState<string>('north');

  React.useEffect(() => {
    if (regionalDestinations.length > 0 && !regionalDestinations.some((r) => r.id === activeRegionId)) {
      setActiveRegionId(regionalDestinations[0].id);
    }
  }, [regionalDestinations, activeRegionId]);

  const displayStories = aiStories;
  const categoryCollections = getCategoryCollections(listings);
  const dynamicExperiences = getDynamicExperiences(listings);
  const recentlyAdded = getRecentlyAddedPackages(listings, 12);
  const intentRails = getIntentRails(listings);

  // Horizontal scroll helper
  const scrollRail = (railId: string, direction: 'left' | 'right') => {
    const el = document.getElementById(railId);
    if (el) {
      const scrollAmount = direction === 'left' ? -380 : 380;
      el.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  // Thumbnail helper
  const getThumbnail = (pkg: PackageListing) => {
    if (pkg.placesCovered?.[0]?.imageUrls?.[0]) return pkg.placesCovered[0].imageUrls[0];
    if (pkg.photos?.[0]) return pkg.photos[0];
    if (pkg.itinerary?.[0]?.imageUrl) return pkg.itinerary[0].imageUrl;
    return null;
  };

  // Price formatting helper
  const formatPrice = (rawCost: any) => {
    if (!rawCost) return null;
    const num = parseFloat(String(rawCost).replace(/[^0-9.]/g, ''));
    if (isNaN(num) || num <= 0) return null;
    return `₹${num.toLocaleString('en-IN')}`;
  };

  return (
    <div className="w-full bg-white text-slate-900 font-sans pb-16 pt-2">
      {/* ==========================================
          TOP DESTINATION PILLS STRIP (THRILLOPHILIA STYLE)
          ========================================== */}
      {/* {packageTypeTab !== 'all' && destinationPills.length > 0 && (
        <div className="w-full bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-2xs py-2.5 px-4 sm:px-8 mb-6">
          <div className="max-w-[1600px] mx-auto flex items-center gap-3 overflow-x-auto scrollbar-hide py-0.5">
            <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider shrink-0">
              Top Destinations:
            </span>
            {destinationPills.map((pill) => (
              <button
                key={pill.name}
                onClick={() => {
                  const secId = `section-dest-${pill.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
                  const el = document.getElementById(secId);
                  if (el) {
                    el.scrollIntoView({ behavior: 'smooth' });
                  } else {
                    setSearchTerm(pill.name);
                  }
                }}
                className="px-3.5 py-1.5 rounded-full bg-slate-50 hover:bg-orange-500 hover:text-white text-slate-800 text-xs font-bold transition-all shrink-0 border border-slate-200/80 shadow-2xs hover:shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <span>{pill.name}</span>
                <span className="text-[10px] opacity-75 font-mono px-1.5 py-0.2 bg-black/5 rounded-full">
                  {pill.count}
                </span>
              </button>
            ))}
          </div>
        </div>
      )} */}

      {/* ==========================================
          DYNAMIC DESTINATION SECTIONS (THRILLOPHILIA STYLE)
          Only rendered when user clicks Domestic or International!
          Auto-created whenever agency posts a listing (Assam, Europe, Kashmir, Goa, etc.)
          ========================================== */}
      {packageTypeTab !== 'all' && destinationSections.length > 0 && (
        <div className="space-y-4 border-b border-slate-200/80 pb-8 mb-6">
          <div className="px-4 sm:px-8 lg:px-12 w-full max-w-[1600px] mx-auto pt-2 flex items-center justify-between">
            <div>
              {/* <span className="text-xs font-extrabold text-orange-600 uppercase tracking-wider">
                {packageTypeTab === 'domestic' ? '🇮🇳 Domestic Destination Cards' : '✈️ International Destination Cards'}
              </span> */}
              {/* <h2 
                className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-0.5"
                style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}
              >
                Packages by Destination ({destinationSections.length} Locations)
              </h2> */}
            </div>
          </div>
          {destinationSections.map((sec) => (
            <section
              key={sec.id}
              id={`section-${sec.id}`}
              className="py-8 px-4 sm:px-8 lg:px-12 w-full max-w-[1600px] mx-auto border-b border-slate-100 scroll-mt-28"
            >
              {/* Section Header: Unique Font for State / Country Name */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <h2 
                    className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight drop-shadow-xs"
                    style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}
                  >
                    {sec.name}
                  </h2>
                  {/* <span className="bg-gradient-to-r from-orange-50 to-amber-50 text-orange-700 text-[11px] font-extrabold px-3 py-1 rounded-full border border-orange-200/80 shadow-2xs flex items-center gap-1">
                    <span>{sec.packageType === 'international' ? '✈️ Country' : '🇮🇳 State'}</span>
                    <span>•</span>
                    <span>{sec.packageCount} {sec.packageCount === 1 ? 'Package' : 'Packages'}</span>
                  </span> */}
                </div>

                <button
                  onClick={() => setSearchTerm(sec.name)}
                  className="flex items-center gap-2 text-xs font-extrabold text-orange-600 hover:text-orange-700 bg-orange-50 hover:bg-orange-100 px-4 py-2 rounded-full transition-all group border border-orange-200/60 shadow-2xs"
                >
                  <span>View All</span>
                  <div className="w-5 h-5 rounded-full bg-orange-500 text-white flex items-center justify-center group-hover:translate-x-0.5 transition-transform shadow-xs">
                    <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </button>
              </div>

              {/* Horizontal Scroll Rail / Carousel */}
              <div className="relative group/rail">
                {sec.listings.length > 3 && (
                  <>
                    <button
                      onClick={() => scrollRail(`rail-${sec.id}`, 'left')}
                      className="absolute -left-4 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full bg-white shadow-md border border-slate-200 text-slate-700 hover:bg-orange-500 hover:text-white flex items-center justify-center transition-all opacity-0 group-hover/rail:opacity-100 hover:scale-110 active:scale-95"
                      aria-label="Scroll left"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => scrollRail(`rail-${sec.id}`, 'right')}
                      className="absolute -right-4 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full bg-white shadow-md border border-slate-200 text-slate-700 hover:bg-orange-500 hover:text-white flex items-center justify-center transition-all opacity-0 group-hover/rail:opacity-100 hover:scale-110 active:scale-95"
                      aria-label="Scroll right"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </>
                )}

                <div
                  id={`rail-${sec.id}`}
                  className="flex gap-4 sm:gap-6 overflow-x-auto pb-4 pt-1 scrollbar-hide snap-x snap-mandatory scroll-smooth w-full"
                >
                  {sec.listings.map((pkg) => (
                    <div key={pkg.id} className="w-full min-w-full sm:w-[calc(50%-12px)] sm:min-w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)] lg:min-w-[calc(33.333%-16px)] snap-start shrink-0 flex flex-col h-full self-stretch">
                      <ListingCard
                        listing={pkg}
                        onView={onView}
                        onBook={onBook}
                        onChat={onChat}
                        onWishlist={onWishlist}
                        isWishlisted={wishlist.includes(pkg.id)}
                        variant="user"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Empty state when Domestic or International has 0 packages */}
      {packageTypeTab !== 'all' && destinationSections.length === 0 && (
        <div className="py-16 px-4 text-center flex flex-col items-center justify-center bg-slate-50/60 rounded-3xl border border-slate-200 border-dashed my-8 max-w-4xl mx-auto">
          <div className="w-16 h-16 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mb-4 shadow-xs">
            <Globe className="w-8 h-8 text-orange-500" />
          </div>
          <h3 className="text-xl font-black text-slate-900 mb-2">
            No {packageTypeTab === 'international' ? 'International' : 'Domestic'} Packages Posted Yet
          </h3>
          <p className="text-sm text-slate-500 max-w-md mb-6">
            Agencies have not added any {packageTypeTab === 'international' ? 'international' : 'domestic'} package listings yet. Switch tabs to discover available packages!
          </p>
          <button
            onClick={() => setPackageTypeTab(packageTypeTab === 'international' ? 'domestic' : 'all')}
            className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-xs rounded-full shadow-sm transition-all cursor-pointer"
          >
            Explore {packageTypeTab === 'international' ? 'Domestic Packages' : 'All Packages'}
          </button>
        </div>
      )}

      {/* Generic Categories Page Sections — Only shown when 'Explore All' (Categories) tab is active */}
      {packageTypeTab === 'all' && (
        <>
          {/* ==========================================
              SECTION 1 — Interactive Regional Destination Hub (Option 1)
              ========================================== */}
          {regionalDestinations.length > 0 && (() => {
            const activeGroup =
              regionalDestinations.find((g) => g.id === activeRegionId) || regionalDestinations[0];
            const destinations = activeGroup?.destinations || [];
            const heroDest = destinations[0];
            const otherDests = destinations.slice(1);

            const currentRegionIndex = regionalDestinations.findIndex((g) => g.id === activeGroup.id);
            const hasPrev = currentRegionIndex > 0;
            const hasNext = currentRegionIndex < regionalDestinations.length - 1;
            const prevRegion = hasPrev ? regionalDestinations[currentRegionIndex - 1] : null;
            const nextRegion = hasNext ? regionalDestinations[currentRegionIndex + 1] : null;

            // Representative package cover image from this active region
            const bannerImage =
              heroDest?.coverImage ||
              destinations.find((d) => d.coverImage)?.coverImage ||
              null;

            return (
              <section className="py-10 px-4 sm:px-8 lg:px-12 w-full max-w-[1600px] mx-auto border-b border-slate-100">
                {/* Section Header */}
                <div className="text-center max-w-3xl mx-auto mb-6">
                  <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight mb-2">
                    Explore Popular Destinations
                  </h2>
                  <p className="text-slate-500 text-xs sm:text-sm font-medium">
                    Handpicked holiday regions across India and worldwide with verified local operators
                  </p>
                </div>

                {/* Mobile: Elegant Slightly Faded Package Image Banner with Big Region Text & Navigation Arrow */}
                <div className="sm:hidden relative w-full rounded-2xl overflow-hidden mb-6 shadow-md border border-slate-200/80 bg-slate-950 transition-all duration-500">
                  {/* Package background photo */}
                  {bannerImage ? (
                    <img
                      src={bannerImage}
                      alt={activeGroup.label}
                      className="absolute inset-0 w-full h-full object-cover opacity-75 transition-all duration-700"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950" />
                  )}

                  {/* Elegant fade gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/65 to-slate-950/40 backdrop-blur-[1px]" />

                  {/* Banner Content */}
                  <div className="relative z-10 p-5 flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-sm">{activeGroup.icon}</span>
                        <span className="text-[10px] font-extrabold uppercase tracking-widest text-orange-400">
                          Region
                        </span>
                      </div>
                      <h3
                        className="text-2xl sm:text-3xl font-black text-white tracking-tight drop-shadow-md leading-tight"
                        style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}
                      >
                        {activeGroup.label}
                      </h3>
                      <p className="text-[11px] text-slate-300/90 font-medium mt-0.5 truncate max-w-[210px]">
                        {activeGroup.subtitle || 'Handpicked holiday destinations'}
                      </p>
                    </div>

                    {/* Navigation: Right arrow (and left) with boundary checks (no left on 1st, no right on last) */}
                    {regionalDestinations.length > 1 && (
                      <div className="flex items-center gap-1.5 shrink-0">
                        {hasPrev && prevRegion && (
                          <button
                            onClick={() => setActiveRegionId(prevRegion.id)}
                            aria-label={`Previous region: ${prevRegion.label}`}
                            className={!hasNext
                              ? "flex items-center gap-1.5 pl-2 pr-3 py-1.5 rounded-full bg-white/25 hover:bg-white/35 active:scale-95 text-white backdrop-blur-md border border-white/30 font-bold text-xs shadow-md transition-all cursor-pointer group"
                              : "w-8 h-8 rounded-full bg-black/35 hover:bg-black/55 active:scale-90 text-white backdrop-blur-md border border-white/20 flex items-center justify-center transition-all cursor-pointer shadow-xs"
                            }
                          >
                            <div className={!hasNext ? "w-5 h-5 rounded-full bg-orange-500 text-white flex items-center justify-center shadow-xs group-hover:-translate-x-0.5 transition-transform" : ""}>
                              <ChevronLeft className="w-3.5 h-3.5 stroke-[3]" />
                            </div>
                            {!hasNext && (
                              <span className="text-[11px] font-bold text-white tracking-wide max-w-[130px] truncate">
                                {prevRegion.label}
                              </span>
                            )}
                          </button>
                        )}

                        {hasNext && nextRegion && (
                          <button
                            onClick={() => setActiveRegionId(nextRegion.id)}
                            aria-label={`Next region: ${nextRegion.label}`}
                            className="flex items-center gap-1.5 pl-3 pr-2 py-1.5 rounded-full bg-white/25 hover:bg-white/35 active:scale-95 text-white backdrop-blur-md border border-white/30 font-bold text-xs shadow-md transition-all cursor-pointer group"
                          >
                            <span className="text-[11px] font-bold text-white tracking-wide max-w-[130px] truncate">
                              {nextRegion.label}
                            </span>
                            <div className="w-5 h-5 rounded-full bg-orange-500 text-white flex items-center justify-center shadow-xs group-hover:translate-x-0.5 transition-transform">
                              <ChevronRight className="w-3.5 h-3.5 stroke-[3]" />
                            </div>
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Region Progress Indicator Dots */}
                  {regionalDestinations.length > 1 && (
                    <div className="relative z-10 px-5 pb-3 flex items-center gap-1.5">
                      {regionalDestinations.map((r, idx) => (
                        <button
                          key={r.id}
                          onClick={() => setActiveRegionId(r.id)}
                          className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                            idx === currentRegionIndex
                              ? 'w-6 bg-orange-400'
                              : 'w-1.5 bg-white/30 hover:bg-white/50'
                          }`}
                          aria-label={`Go to ${r.label}`}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Desktop: Classic Underlined Text Tabs */}
                <div className="hidden sm:flex items-center justify-center gap-6 sm:gap-8 overflow-x-auto pb-1 pt-1 scrollbar-hide mb-8 w-full border-b border-slate-100">
                  {regionalDestinations.map((group) => {
                    const isActive = activeRegionId === group.id;
                    return (
                      <button
                        key={group.id}
                        onClick={() => setActiveRegionId(group.id)}
                        className={`pb-3 text-sm sm:text-base font-bold transition-all duration-200 cursor-pointer flex items-center gap-2 whitespace-nowrap shrink-0 relative ${
                          isActive
                            ? 'text-slate-900 font-black'
                            : 'text-slate-400 hover:text-slate-700'
                        }`}
                      >
                        <span className="text-base">{group.icon}</span>
                        <span>{group.label}</span>
                        {isActive && (
                          <span className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-orange-500 rounded-full" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Active Region Showcase Grid */}
                {destinations.length > 0 && (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                    {/* Hero Spotlight Card (Left side: 5 cols on desktop, or full if only 1 destination) */}
                    {heroDest && (
                      <div
                        onClick={() => setSearchTerm(heroDest.name)}
                        className={`${
                          otherDests.length > 0 ? 'lg:col-span-5' : 'lg:col-span-12'
                        } group cursor-pointer relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-200/90 shadow-sm hover:shadow-xl transition-all duration-300 min-h-[340px] sm:min-h-[400px] flex flex-col justify-between p-6 sm:p-8`}
                      >
                        {heroDest.coverImage ? (
                          <img
                            src={heroDest.coverImage}
                            alt={heroDest.name}
                            className="absolute inset-0 w-full h-full object-cover opacity-85 group-hover:scale-105 transition-transform duration-700"
                          />
                        ) : (
                          <div className="absolute inset-0 bg-slate-800 flex items-center justify-center text-slate-500">
                            <MapPin className="w-12 h-12" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-900/40 to-transparent opacity-90 group-hover:opacity-80 transition-opacity" />

                        {/* Top Badges */}
                        <div className="relative z-10 flex items-center justify-between gap-2" />

                        {/* Bottom Info */}
                        <div className="relative z-10">
                          <h3 className="text-2xl sm:text-4xl font-black text-white tracking-tight drop-shadow-sm mb-2">
                            {heroDest.name}
                          </h3>

                          {/* Discovered Highlights / City Chips */}
                          {heroDest.discoveredPlaces && heroDest.discoveredPlaces.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mb-4">
                              {heroDest.discoveredPlaces.map((place) => (
                                <span
                                  key={place}
                                  className="text-[11px] font-bold bg-white/20 backdrop-blur-sm text-white px-2.5 py-0.5 rounded-md border border-white/10"
                                >
                                  {place}
                                </span>
                              ))}
                            </div>
                          )}

                          <div className="flex items-center justify-between pt-3 border-t border-white/15">
                            {heroDest.startingPrice ? (
                              <div>
                                <p className="text-[10px] uppercase tracking-wider text-slate-300 font-bold">Starting from</p>
                                <p className="text-base sm:text-lg font-black text-amber-300">
                                  ₹{heroDest.startingPrice.toLocaleString('en-IN')}
                                </p>
                              </div>
                            ) : (
                              <span className="text-xs text-slate-300 font-bold">Verified Packages</span>
                            )}
                            <span className="text-xs font-black text-white bg-white/20 group-hover:bg-orange-500 px-4 py-2 rounded-full transition-all flex items-center gap-1.5 shadow-xs">
                              <span>Explore Packages</span>
                              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Secondary Destinations Grid (Right side: 7 cols on desktop) */}
                    {otherDests.length > 0 && (
                      <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                        {otherDests.slice(0, 4).map((dest) => (
                          <div
                            key={dest.name}
                            onClick={() => setSearchTerm(dest.name)}
                            className="group cursor-pointer relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-200/80 shadow-2xs hover:shadow-lg transition-all duration-300 h-44 sm:h-48 flex flex-col justify-between p-5"
                          >
                            {dest.coverImage ? (
                              <img
                                src={dest.coverImage}
                                alt={dest.name}
                                className="absolute inset-0 w-full h-full object-cover opacity-85 group-hover:scale-108 transition-transform duration-500"
                              />
                            ) : (
                              <div className="absolute inset-0 bg-slate-800 flex items-center justify-center text-slate-500">
                                <MapPin className="w-8 h-8" />
                              </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-900/35 to-transparent opacity-85 group-hover:opacity-75 transition-opacity" />

                            {/* Top Badge */}
                            <div className="relative z-10 flex items-center justify-between" />

                            {/* Bottom Info */}
                            <div className="relative z-10">
                              <h4 className="text-lg sm:text-xl font-black text-white tracking-tight drop-shadow-sm line-clamp-1 mb-1">
                                {dest.name}
                              </h4>
                              {dest.discoveredPlaces && dest.discoveredPlaces.length > 0 && (
                                <p className="text-[11px] font-semibold text-slate-200/85 line-clamp-1 mb-2">
                                  {dest.discoveredPlaces.join(' • ')}
                                </p>
                              )}
                              <div className="flex items-center justify-between pt-1.5 border-t border-white/10">
                                {dest.startingPrice ? (
                                  <p className="text-xs font-bold text-amber-300">
                                    From ₹{dest.startingPrice.toLocaleString('en-IN')}
                                  </p>
                                ) : (
                                  <span className="text-[10px] text-slate-300">Verified</span>
                                )}
                                <span className="text-[11px] font-bold text-white group-hover:text-orange-400 flex items-center gap-1 transition-colors">
                                  <span>View</span>
                                  <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* If more than 5 destinations in this region, show an extra horizontal rail below */}
                {otherDests.length > 4 && (
                  <div className="mt-6 pt-6 border-t border-slate-100">
                    <p className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3">
                      More Destinations in {activeGroup.label}
                    </p>
                    <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide snap-x scroll-smooth w-full">
                      {otherDests.slice(4).map((dest) => (
                        <div
                          key={dest.name}
                          onClick={() => setSearchTerm(dest.name)}
                          className="min-w-[220px] max-w-[240px] snap-start shrink-0 group cursor-pointer relative rounded-xl overflow-hidden bg-slate-900 border border-slate-200/80 shadow-2xs hover:shadow-md transition-all duration-300 h-36 flex flex-col justify-end p-4"
                        >
                          {dest.coverImage ? (
                            <img
                              src={dest.coverImage}
                              alt={dest.name}
                              className="absolute inset-0 w-full h-full object-cover opacity-85 group-hover:scale-105 transition-transform duration-500"
                            />
                          ) : (
                            <div className="absolute inset-0 bg-slate-800 flex items-center justify-center text-slate-500">
                              <MapPin className="w-6 h-6" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-900/30 to-transparent opacity-85 group-hover:opacity-75 transition-opacity" />

                          <div className="relative z-10">
                            <h5 className="text-sm font-black text-white line-clamp-1">{dest.name}</h5>
                            {dest.startingPrice && (
                              <p className="text-[11px] font-bold text-amber-300 mt-0.5">
                                From ₹{dest.startingPrice.toLocaleString('en-IN')}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            );
          })()}

      {/* ==========================================
          SECTION 2 — State → Story → Places → Experiences (Editorial Storytelling)
          ========================================== */}
      {displayStories.length > 0 && (
        <>
          {/* Schema.org JSON-LD Structured Data for Google Indexing */}
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "ItemList",
                "name": "Featured Destination Stories",
                "description": "Curated travel stories, guides and itineraries generated from verified packages.",
                "itemListElement": displayStories.map((story: any, idx: number) => ({
                  "@type": "ListItem",
                  "position": idx + 1,
                  "item": {
                    "@type": "TouristDestination",
                    "name": story.title || story.stateName,
                    "description": story.narrative,
                    "image": story.coverImage || undefined,
                    "address": {
                      "@type": "PostalAddress",
                      "addressRegion": story.stateName,
                      "addressCountry": "India"
                    },
                    "keywords": Array.isArray(story.seoKeywords) ? story.seoKeywords.join(', ') : undefined
                  }
                }))
              })
            }}
          />

          <section className="py-12 px-4 sm:px-8 lg:px-12 w-full max-w-[1600px] mx-auto border-b border-slate-100">
            <div className="text-center max-w-3xl mx-auto mb-10">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight">
                Destination Stories
              </h2>
            </div>

            <div className="space-y-12">
            {displayStories.map((story: any, index: number) => (
              <div
                key={story.id || story.stateName || index}
                className="py-4"
              >
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                  {/* Left Column: Visual Photography */}
                  <div className="lg:col-span-5 relative aspect-[16/10] sm:aspect-[4/3] rounded-md overflow-hidden bg-slate-200 border border-slate-200/80 shadow-inner group">
                    {story.coverImage ? (
                      <img
                        src={story.coverImage}
                        alt={story.title || story.stateName}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400">
                        <Compass className="w-12 h-12" />
                      </div>
                    )}
                  </div>

                  {/* Right Column: State Story Details */}
                  <div className="lg:col-span-7 flex flex-col justify-between">
                    <div>
                      <h3 className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight mb-4">
                        {story.title || story.stateName}
                      </h3>

                      <div className="text-xs sm:text-sm text-slate-600 font-medium mb-6 leading-relaxed space-y-2">
                        {(story.narrative || story.description || `Explore verified itineraries across ${story.stateName} covering major cultural landmarks, scenic routes, and local experiences.`)
                          .split('\n\n')
                          .map((paragraph: string, pIdx: number) => (
                            <p key={pIdx}>{paragraph}</p>
                          ))}
                      </div>
                    </div>

                    {/* CTA Button */}
                    <div>
                      <button
                        onClick={() => {
                          setSearchTerm(story.stateName);
                          if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="px-6 py-3 rounded-md bg-slate-900 hover:bg-orange-600 text-white text-xs font-extrabold transition-all shadow-sm flex items-center gap-2 group/btn"
                      >
                        <span>Explore {story.stateName} Packages</span>
                        <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </>
    )}

      {/* ==========================================
          SECTION 3 — Unified Experience & Theme Explorer (Asymmetric Bento Grid)
          ========================================== */}
      {dynamicExperiences.length > 0 && (() => {
        const topTwo = dynamicExperiences.slice(0, 2);
        const middleThree = dynamicExperiences.slice(2, 5);
        const bottomRemaining = dynamicExperiences.slice(5, 8);

        const getExperienceIcon = (name: string) => {
          switch (name) {
            case 'Family Vacations':
              return <Users className="w-3.5 h-3.5 text-amber-400" />;
            case 'Friends':
              return <Users className="w-3.5 h-3.5 text-sky-400" />;
            case 'Honeymoon & Couples':
              return <Heart className="w-3.5 h-3.5 text-rose-400 fill-rose-400/40" />;
            case 'Spiritual & Heritage':
              return <Landmark className="w-3.5 h-3.5 text-amber-400" />;
            case 'Adventure & Outdoors':
              return <Mountain className="w-3.5 h-3.5 text-emerald-400" />;
            case 'Nature & Wildlife':
              return <Trees className="w-3.5 h-3.5 text-emerald-400" />;
            case 'Weekend Escapes':
              return <Car className="w-3.5 h-3.5 text-indigo-400" />;
            case 'Sightseeing & Local Tours':
              return <Camera className="w-3.5 h-3.5 text-cyan-400" />;
            case 'Group Departures':
              return <Compass className="w-3.5 h-3.5 text-orange-400" />;
            default:
              return <Sparkles className="w-3.5 h-3.5 text-amber-400" />;
          }
        };

        return (
          <section className="py-12 px-4 sm:px-8 lg:px-12 w-full max-w-[1600px] mx-auto border-b border-slate-100">
            {/* Centered Section Header */}
            <div className="text-center max-w-3xl mx-auto mb-10">
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Find Trips by Experience
              </h2>
            </div>

            {/* Row 1: Top 2 Hero Spotlight Cards (50% / 50%) */}
            {topTwo.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-6">
                {topTwo.map((exp) => (
                  <div
                    key={exp.name}
                    onClick={() => setSearchTerm(exp.name)}
                    className="md:col-span-6 group cursor-pointer relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-200/80 shadow-xs hover:shadow-xl transition-all duration-300 h-64 sm:h-72 lg:h-80 flex flex-col justify-end p-6 sm:p-8"
                  >
                    {exp.coverImage ? (
                      <img
                        src={exp.coverImage}
                        alt={exp.name}
                        className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-700"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-slate-800 flex items-center justify-center text-slate-500">
                        <Compass className="w-12 h-12" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-900/40 to-transparent opacity-85 group-hover:opacity-75 transition-opacity" />

                    {/* Tag Badge */}
                    <div className="absolute top-5 left-5 z-10">
                      <span className="bg-slate-900/85 backdrop-blur-md text-white text-xs font-black px-3.5 py-1.5 rounded-full border border-white/20 shadow-xs flex items-center gap-2">
                        {getExperienceIcon(exp.name)}
                        <span>{exp.name}</span>
                      </span>
                    </div>

                    {/* Content */}
                    <div className="relative z-10">
                      <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight drop-shadow-sm mb-1">
                        {exp.name}
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-200/90 line-clamp-1 mb-3">
                        {EXPERIENCE_TAGLINES[exp.name] || 'Curated packages tailored for this travel style'}
                      </p>
                      <div className="flex items-center justify-between pt-2.5 border-t border-white/10">
                        {exp.startingPrice ? (
                          <p className="text-sm font-bold text-amber-300">
                            From ₹{exp.startingPrice.toLocaleString('en-IN')}
                          </p>
                        ) : (
                          <span className="text-xs text-slate-300">Verified Itineraries</span>
                        )}
                        <span className="text-xs font-extrabold text-white bg-white/20 group-hover:bg-orange-500 px-3.5 py-1.5 rounded-full transition-all flex items-center gap-1 shadow-xs">
                          <span>Explore</span>
                          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Row 2: Middle 3 Medium Cards (33% / 33% / 33%) */}
            {middleThree.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-6 mb-6">
                {middleThree.map((exp) => (
                  <div
                    key={exp.name}
                    onClick={() => setSearchTerm(exp.name)}
                    className="lg:col-span-4 group cursor-pointer relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-200/80 shadow-xs hover:shadow-xl transition-all duration-300 h-56 sm:h-64 flex flex-col justify-end p-5 sm:p-6"
                  >
                    {exp.coverImage ? (
                      <img
                        src={exp.coverImage}
                        alt={exp.name}
                        className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-700"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-slate-800 flex items-center justify-center text-slate-500">
                        <Compass className="w-10 h-10" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-900/40 to-transparent opacity-85 group-hover:opacity-75 transition-opacity" />

                    <div className="absolute top-4 left-4 z-10">
                      <span className="bg-slate-900/85 backdrop-blur-md text-white text-[11px] font-extrabold px-3 py-1 rounded-full border border-white/20 shadow-xs flex items-center gap-1.5">
                        {getExperienceIcon(exp.name)}
                        <span>{exp.name}</span>
                      </span>
                    </div>

                    <div className="relative z-10">
                      <h3 className="text-xl font-black text-white tracking-tight drop-shadow-sm mb-0.5">
                        {exp.name}
                      </h3>
                      <p className="text-xs text-slate-200/90 line-clamp-1 mb-2.5">
                        {EXPERIENCE_TAGLINES[exp.name] || 'Curated packages tailored for this travel style'}
                      </p>
                      <div className="flex items-center justify-between pt-2 border-t border-white/10">
                        {exp.startingPrice ? (
                          <p className="text-xs font-bold text-amber-300">
                            From ₹{exp.startingPrice.toLocaleString('en-IN')}
                          </p>
                        ) : (
                          <span className="text-xs text-slate-300">Verified Itineraries</span>
                        )}
                        <span className="text-[11px] font-extrabold text-white bg-white/20 group-hover:bg-orange-500 px-3 py-1 rounded-full transition-all flex items-center gap-1 shadow-xs">
                          <span>Explore</span>
                          <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Row 3: Bottom Panoramic / Balanced Row (1 to 3 cards) */}
            {bottomRemaining.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-6">
                {bottomRemaining.map((exp) => {
                  const colSpan = bottomRemaining.length === 1 ? 'lg:col-span-12' : bottomRemaining.length === 2 ? 'lg:col-span-6' : 'lg:col-span-4';
                  return (
                    <div
                      key={exp.name}
                      onClick={() => setSearchTerm(exp.name)}
                      className={`${colSpan} group cursor-pointer relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-200/80 shadow-xs hover:shadow-xl transition-all duration-300 h-56 sm:h-64 flex flex-col justify-end p-5 sm:p-6`}
                    >
                      {exp.coverImage ? (
                        <img
                          src={exp.coverImage}
                          alt={exp.name}
                          className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-700"
                        />
                      ) : (
                        <div className="absolute inset-0 bg-slate-800 flex items-center justify-center text-slate-500">
                          <Compass className="w-10 h-10" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-900/40 to-transparent opacity-85 group-hover:opacity-75 transition-opacity" />

                      <div className="absolute top-4 left-4 z-10">
                        <span className="bg-slate-900/85 backdrop-blur-md text-white text-[11px] font-extrabold px-3 py-1 rounded-full border border-white/20 shadow-xs flex items-center gap-1.5">
                          {getExperienceIcon(exp.name)}
                          <span>{exp.name}</span>
                        </span>
                      </div>

                      <div className="relative z-10">
                        <h3 className="text-lg sm:text-xl font-black text-white tracking-tight drop-shadow-sm mb-0.5 line-clamp-1">
                          {exp.name}
                        </h3>
                        <p className="text-xs text-slate-200/90 line-clamp-1 mb-2.5">
                          {EXPERIENCE_TAGLINES[exp.name] || 'Curated packages tailored for this travel style'}
                        </p>
                        <div className="flex items-center justify-between pt-2 border-t border-white/10">
                          {exp.startingPrice ? (
                            <p className="text-xs sm:text-sm font-bold text-amber-300">
                              From ₹{exp.startingPrice.toLocaleString('en-IN')}
                            </p>
                          ) : (
                            <span className="text-xs text-slate-300">Verified Itineraries</span>
                          )}
                          <span className="text-[11px] sm:text-xs font-extrabold text-white bg-white/20 group-hover:bg-orange-500 px-3 py-1 rounded-full transition-all flex items-center gap-1 shadow-xs">
                            <span>Explore</span>
                            <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        );
      })()}

      {/* ==========================================
          SECTION 5 — Marketplace Product Rails (Weekend Getaways, Group Escapes, etc.)
          ========================================== */}
      {intentRails.map((rail) => (
        <section key={rail.id} className="py-12 px-4 sm:px-8 lg:px-12 w-full max-w-[1600px] mx-auto border-b border-slate-100">
          <div className="flex items-end justify-between mb-6">
            <div>
             
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-1">
                {rail.title}
              </h2>
            </div>
            {rail.listings.length > 3 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => scrollRail(`rail-${rail.id}`, 'left')}
                  className="w-9 h-9 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 flex items-center justify-center transition-colors shadow-xs hover:border-orange-300"
                  aria-label="Scroll left"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={() => scrollRail(`rail-${rail.id}`, 'right')}
                  className="w-9 h-9 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 flex items-center justify-center transition-colors shadow-xs hover:border-orange-300"
                  aria-label="Scroll right"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>

          <div
            id={`rail-${rail.id}`}
            className="flex gap-4 sm:gap-6 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory scroll-smooth w-full"
          >
            {rail.listings.map((pkg) => (
              <div key={pkg.id} className="w-full min-w-full sm:w-[calc(50%-12px)] sm:min-w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)] lg:min-w-[calc(33.333%-16px)] snap-start shrink-0 flex flex-col h-full self-stretch">
                <ListingCard
                  listing={pkg}
                  onView={onView}
                  onBook={onBook}
                  onChat={onChat}
                  onWishlist={onWishlist}
                  isWishlisted={wishlist.includes(pkg.id)}
                  variant="user"
                />
              </div>
            ))}
          </div>
        </section>
      ))}

      {/* ==========================================
          SECTION 6 — "Recently Added Packages" Rail
          ========================================== */}
      {recentlyAdded.length > 0 && (
        <section className="py-12 px-4 sm:px-8 lg:px-12 w-full max-w-[1600px] mx-auto">
          <div className="flex items-end justify-between mb-6">
            <div>
              
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-1">
                Recently Added Packages
              </h2>
            
            </div>
            {recentlyAdded.length > 3 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => scrollRail('rail-recently-added', 'left')}
                  className="w-9 h-9 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 flex items-center justify-center transition-colors shadow-xs hover:border-orange-300"
                  aria-label="Scroll left"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={() => scrollRail('rail-recently-added', 'right')}
                  className="w-9 h-9 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 flex items-center justify-center transition-colors shadow-xs hover:border-orange-300"
                  aria-label="Scroll right"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>

          <div
            id="rail-recently-added"
            className="flex gap-4 sm:gap-6 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory scroll-smooth w-full"
          >
            {recentlyAdded.map((pkg) => (
              <div key={pkg.id} className="w-full min-w-full sm:w-[calc(50%-12px)] sm:min-w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)] lg:min-w-[calc(33.333%-16px)] snap-start shrink-0 flex flex-col h-full self-stretch">
                <ListingCard
                  listing={pkg}
                  onView={onView}
                  onBook={onBook}
                  onChat={onChat}
                  onWishlist={onWishlist}
                  isWishlisted={wishlist.includes(pkg.id)}
                  variant="user"
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ==========================================
          SECTION 7 — How TripDM Works & Why Book Direct (Clean Travel Marketplace Style)
          ========================================== */}
      <section className="py-16 sm:py-20 px-4 sm:px-8 lg:px-12 w-full max-w-[1600px] mx-auto border-t border-slate-100">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-14">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight mb-2.5">
            How TripDM Works
          </h2>
          <p className="text-slate-500 text-sm sm:text-base font-medium">
            Plan and book custom holidays directly with verified local tour operators in 3 simple steps
          </p>
        </div>

        {/* 3-Step Connected Travel Journey Flow */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12 relative mb-16">
          {/* Connector Line for Desktop */}
          <div className="hidden md:block absolute top-10 left-[20%] right-[20%] h-[2px] border-t-2 border-dashed border-slate-200 z-0" />

          {/* Step 1 */}
          <div className="relative z-10 flex flex-col items-center text-center">
            <div className="w-20 h-20 rounded-full bg-orange-50 border-2 border-orange-500/30 text-orange-600 flex items-center justify-center mb-5 shadow-xs bg-white">
              <Search className="w-8 h-8 text-orange-500" />
            </div>
            <span className="text-xs font-black uppercase tracking-wider text-orange-600 mb-1">Step 1</span>
            <h3 className="text-lg sm:text-xl font-black text-slate-900 mb-2">
              Explore & Compare Itineraries
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-xs">
              Browse handpicked tour packages across top destinations. Compare quotes, hotels, and day-by-day itineraries side-by-side.
            </p>
          </div>

          {/* Step 2 */}
          <div className="relative z-10 flex flex-col items-center text-center">
            <div className="w-20 h-20 rounded-full bg-orange-50 border-2 border-orange-500/30 text-orange-600 flex items-center justify-center mb-5 shadow-xs bg-white">
              <MessageSquare className="w-8 h-8 text-orange-500" />
            </div>
            <span className="text-xs font-black uppercase tracking-wider text-orange-600 mb-1">Step 2</span>
            <h3 className="text-lg sm:text-xl font-black text-slate-900 mb-2">
              Chat Directly with Local Planners
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-xs">
              Connect 1-on-1 with the actual tour agency. Customize dates, modify hotel categories, and request special add-ons without bots.
            </p>
          </div>

          {/* Step 3 */}
          <div className="relative z-10 flex flex-col items-center text-center">
            <div className="w-20 h-20 rounded-full bg-orange-50 border-2 border-orange-500/30 text-orange-600 flex items-center justify-center mb-5 shadow-xs bg-white">
              <ShieldCheck className="w-8 h-8 text-orange-500" />
            </div>
            <span className="text-xs font-black uppercase tracking-wider text-orange-600 mb-1">Step 3</span>
            <h3 className="text-lg sm:text-xl font-black text-slate-900 mb-2">
              Book at 0% Commission & Travel
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-xs">
              Pay genuine ground operator rates with zero middleman fees. Receive instant booking confirmation and dedicated on-trip support.
            </p>
          </div>
        </div>
      </section>
        </>
      )}
    </div>
  );
}
