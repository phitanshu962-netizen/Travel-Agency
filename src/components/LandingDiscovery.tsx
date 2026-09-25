import React, { useState } from 'react';
import ListingCard from '@/components/ListingCard';
import LandingPhoneChatSection from '@/components/LandingPhoneChatSection';
import DestinationStoryDetail from '@/components/DestinationStoryDetail';
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
  Snowflake,
  Waves,
  Sun,
  Tent,
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
  selectedStory?: any | null;
  onSelectStory?: (story: any | null) => void;
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
  selectedStory: controlledSelectedStory,
  onSelectStory,
}: LandingDiscoveryProps) {
  // Tab state for Domestic vs International
  const [packageTypeTab, setPackageTypeTab] = useState<'all' | 'domestic' | 'international'>(
    initialPackageTypeTab || 'all'
  );

  const effectivePackageTypeTab = initialPackageTypeTab || packageTypeTab || 'all';

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
  const [internalSelectedStory, setInternalSelectedStory] = useState<any | null>(null);
  const activeStory = controlledSelectedStory !== undefined ? controlledSelectedStory : internalSelectedStory;

  const handleSelectStory = (story: any | null) => {
    if (onSelectStory) {
      onSelectStory(story);
    } else {
      setInternalSelectedStory(story);
    }
    if (typeof window !== 'undefined') window.scrollTo(0, 0);
  };

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
  const destinationSections = getDynamicDestinationSections(listings, effectivePackageTypeTab);
  const destinationPills = getDiscoveredDestinationPills(listings, effectivePackageTypeTab);

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

  // If a story is selected, display the full dedicated story experience
  if (activeStory) {
    return (
      <DestinationStoryDetail
        story={activeStory}
        listings={listings}
        onBack={() => {
          handleSelectStory(null);
        }}
        onView={onView}
        onBook={onBook}
        onChat={onChat}
        onWishlist={onWishlist}
        wishlist={wishlist}
      />
    );
  }

  return (
    <div className="w-full bg-white text-slate-900 font-sans pb-16 pt-0">
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
        <div className="space-y-4 pb-8 mb-6">
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
              className="py-8 px-4 sm:px-8 lg:px-12 w-full max-w-[1600px] mx-auto scroll-mt-28"
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
                </div>

                <button
                  onClick={() => setSearchTerm(sec.name)}
                  className="flex items-center gap-2 text-xs font-extrabold text-orange-600 hover:text-orange-700 bg-orange-50 hover:bg-orange-100 px-3.5 py-1.5 transition-all group border border-orange-200/60 shadow-2xs"
                  style={{ borderRadius: '6px' }}
                >
                  <span>View All</span>
                  <div className="w-4 h-4 bg-orange-500 text-white flex items-center justify-center group-hover:translate-x-0.5 transition-transform shadow-xs" style={{ borderRadius: '3px' }}>
                    <ChevronRight className="w-3 h-3" />
                  </div>
                </button>
              </div>

              {/* Horizontal Scroll Rail / Carousel */}
              <div className="relative group/rail">
                {sec.listings.length > 3 && (
                  <>
                    <button
                      onClick={() => scrollRail(`rail-${sec.id}`, 'left')}
                      className="absolute -left-4 top-1/2 -translate-y-1/2 z-30 w-9 h-9 bg-white shadow-md border border-slate-200 text-slate-700 hover:bg-orange-500 hover:text-white flex items-center justify-center transition-all opacity-0 group-hover/rail:opacity-100 hover:scale-110 active:scale-95"
                      style={{ borderRadius: '6px' }}
                      aria-label="Scroll left"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => scrollRail(`rail-${sec.id}`, 'right')}
                      className="absolute -right-4 top-1/2 -translate-y-1/2 z-30 w-9 h-9 bg-white shadow-md border border-slate-200 text-slate-700 hover:bg-orange-500 hover:text-white flex items-center justify-center transition-all opacity-0 group-hover/rail:opacity-100 hover:scale-110 active:scale-95"
                      style={{ borderRadius: '6px' }}
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

              {/* Gradient Divider: Fades on edges, darker in center */}
              <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-8 pt-10">
                <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-slate-300 to-transparent" />
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
              <section className="pt-1 sm:pt-2 pb-10 px-4 sm:px-8 lg:px-12 w-full max-w-[1600px] mx-auto">
                {/* Section Header */}
                <div className="text-center max-w-3xl mx-auto mb-6">
                  <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight mb-2">
                    Explore Popular Destinations
                  </h2>
                  <p className="text-slate-500 text-xs sm:text-sm font-medium">
                    Handpicked holiday regions across India and worldwide with verified local operators
                  </p>
                </div>

                {/* Mobile View: Render all regional destination sections stacked vertically */}
                <div className="sm:hidden space-y-10 mb-8">
                  {regionalDestinations.map((group) => {
                    const destinations = group.destinations || [];
                    if (destinations.length === 0) return null;
                    const heroDest = destinations[0];
                    const otherDests = destinations.slice(1);

                    return (
                      <div key={group.id} className="pt-4 border-t border-slate-100 first:border-t-0 first:pt-0">
                        {/* Mobile Region Header (Center Aligned) */}
                        <div className="text-center mb-4">
                          <div className="flex items-center justify-center gap-2 mb-1">
                            <span className="text-xl">{group.icon}</span>
                            <h3
                              className="text-xl font-black text-slate-900 tracking-tight"
                              style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}
                            >
                              {group.label}
                            </h3>
                          </div>
                          {group.subtitle && (
                            <p className="text-[11px] text-slate-500 font-medium">{group.subtitle}</p>
                          )}
                        </div>

                        {/* Region Destinations */}
                        <div className="space-y-3">
                          {/* Hero Card */}
                          {heroDest && (
                            <div
                              onClick={() => setSearchTerm(heroDest.name)}
                              className="group cursor-pointer relative overflow-hidden bg-slate-900 border border-slate-200/90 shadow-sm min-h-[260px] flex flex-col justify-end p-5"
                              style={{ borderRadius: '6px' }}
                            >
                              {heroDest.coverImage ? (
                                <img
                                  src={heroDest.coverImage}
                                  alt={heroDest.name}
                                  className="absolute inset-0 w-full h-full object-cover opacity-85 group-hover:scale-105 transition-transform duration-500"
                                />
                              ) : (
                                <div className="absolute inset-0 bg-slate-800 flex items-center justify-center text-slate-500">
                                  <MapPin className="w-10 h-10" />
                                </div>
                              )}
                              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-900/40 to-transparent opacity-90" />

                              <div className="relative z-10">
                                <h4 className="text-2xl font-black text-white tracking-tight drop-shadow-sm mb-1">
                                  {heroDest.name}
                                </h4>

                                {heroDest.discoveredPlaces && heroDest.discoveredPlaces.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mb-3">
                                    {heroDest.discoveredPlaces.slice(0, 3).map((place) => (
                                      <span
                                        key={place}
                                        className="text-[10px] font-bold bg-white/20 backdrop-blur-sm text-white px-2 py-0.5 rounded-md border border-white/10"
                                      >
                                        {place}
                                      </span>
                                    ))}
                                  </div>
                                )}

                                <div className="flex items-center justify-between pt-2 border-t border-white/15">
                                  {heroDest.startingPrice ? (
                                    <div>
                                      <p className="text-[9px] uppercase tracking-wider text-slate-300 font-bold">Starting from</p>
                                      <p className="text-base font-black text-amber-300">
                                        ₹{heroDest.startingPrice.toLocaleString('en-IN')}
                                      </p>
                                    </div>
                                  ) : (
                                    <span className="text-xs text-slate-300 font-bold">Verified Packages</span>
                                  )}
                                  <span
                                    className="text-xs font-black text-white bg-orange-500 px-3.5 py-1.5 flex items-center gap-1 shadow-xs"
                                    style={{ borderRadius: '6px' }}
                                  >
                                    <span>Explore</span>
                                    <ArrowRight className="w-3.5 h-3.5" />
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Secondary destinations in this region */}
                          {otherDests.length > 0 && (
                            <div className="grid grid-cols-2 gap-3">
                              {otherDests.map((dest) => (
                                <div
                                  key={dest.name}
                                  onClick={() => setSearchTerm(dest.name)}
                                  className="group cursor-pointer relative overflow-hidden bg-slate-900 border border-slate-200/80 shadow-2xs h-36 flex flex-col justify-end p-3.5"
                                  style={{ borderRadius: '6px' }}
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
                                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-900/35 to-transparent opacity-85" />

                                  <div className="relative z-10">
                                    <h5 className="text-sm font-black text-white tracking-tight drop-shadow-sm line-clamp-1 mb-0.5">
                                      {dest.name}
                                    </h5>
                                    {dest.startingPrice ? (
                                      <p className="text-[11px] font-bold text-amber-300">
                                        From ₹{dest.startingPrice.toLocaleString('en-IN')}
                                      </p>
                                    ) : (
                                      <span className="text-[10px] text-slate-300">Verified</span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
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

                {/* Active Region Showcase Grid (Desktop Only - Smart Adaptive Grid) */}
                {destinations.length > 0 && (() => {
                  // Scenario A: Exactly 5 destinations -> 1 Tall Hero (5 cols) + 4 Cards in 2x2 Grid (7 cols)
                  if (destinations.length === 5) {
                    const hero = destinations[0];
                    const gridDests = destinations.slice(1);
                    return (
                      <div className="hidden sm:grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                        {/* Hero Spotlight Card */}
                        <div
                          onClick={() => setSearchTerm(hero.name)}
                          className="lg:col-span-5 group cursor-pointer relative overflow-hidden bg-slate-900 border border-slate-200/90 shadow-sm hover:shadow-xl transition-all duration-300 min-h-[380px] sm:min-h-[420px] flex flex-col justify-between p-6 sm:p-8"
                          style={{ borderRadius: '6px' }}
                        >
                          {hero.coverImage ? (
                            <img
                              src={hero.coverImage}
                              alt={hero.name}
                              className="absolute inset-0 w-full h-full object-cover opacity-85 group-hover:scale-105 transition-transform duration-700"
                            />
                          ) : (
                            <div className="absolute inset-0 bg-slate-800 flex items-center justify-center text-slate-500">
                              <MapPin className="w-12 h-12" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-900/40 to-transparent opacity-90 group-hover:opacity-80 transition-opacity" />

                          <div className="relative z-10 flex items-center justify-between gap-2" />

                          <div className="relative z-10">
                            <h3 className="text-2xl sm:text-4xl font-black text-white tracking-tight drop-shadow-sm mb-2">
                              {hero.name}
                            </h3>

                            {hero.discoveredPlaces && hero.discoveredPlaces.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 mb-4">
                                {hero.discoveredPlaces.map((place) => (
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
                              {hero.startingPrice ? (
                                <div>
                                  <p className="text-[10px] uppercase tracking-wider text-slate-300 font-bold">Starting from</p>
                                  <p className="text-base sm:text-lg font-black text-amber-300">
                                    ₹{hero.startingPrice.toLocaleString('en-IN')}
                                  </p>
                                </div>
                              ) : (
                                <span className="text-xs text-slate-300 font-bold">Verified Packages</span>
                              )}
                              <span
                                className="text-xs font-black text-white bg-white/20 group-hover:bg-orange-500 px-4 py-2 transition-all flex items-center gap-1.5 shadow-xs"
                                style={{ borderRadius: '6px' }}
                              >
                                <span>Explore Packages</span>
                                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* 4 Cards in 2x2 Grid */}
                        <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                          {gridDests.map((dest) => (
                            <div
                              key={dest.name}
                              onClick={() => setSearchTerm(dest.name)}
                              className="group cursor-pointer relative overflow-hidden bg-slate-900 border border-slate-200/80 shadow-2xs hover:shadow-lg transition-all duration-300 h-44 sm:h-48 flex flex-col justify-between p-5"
                              style={{ borderRadius: '6px' }}
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

                              <div className="relative z-10 flex items-center justify-between" />

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
                                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  }

                  // Scenario B: Exactly 4 destinations -> 4-Column Balanced Grid
                  if (destinations.length === 4) {
                    return (
                      <div className="hidden sm:grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
                        {destinations.map((dest) => (
                          <div
                            key={dest.name}
                            onClick={() => setSearchTerm(dest.name)}
                            className="group cursor-pointer relative overflow-hidden bg-slate-900 border border-slate-200/80 shadow-2xs hover:shadow-xl transition-all duration-300 h-52 sm:h-60 flex flex-col justify-between p-5"
                            style={{ borderRadius: '6px' }}
                          >
                            {dest.coverImage ? (
                              <img
                                src={dest.coverImage}
                                alt={dest.name}
                                className="absolute inset-0 w-full h-full object-cover opacity-85 group-hover:scale-108 transition-transform duration-700"
                              />
                            ) : (
                              <div className="absolute inset-0 bg-slate-800 flex items-center justify-center text-slate-500">
                                <MapPin className="w-10 h-10" />
                              </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-900/35 to-transparent opacity-85 group-hover:opacity-75 transition-opacity" />

                            <div className="relative z-10 flex items-center justify-between" />

                            <div className="relative z-10">
                              <h4 className="text-lg sm:text-xl font-black text-white tracking-tight drop-shadow-sm line-clamp-1 mb-1.5">
                                {dest.name}
                              </h4>
                              {dest.discoveredPlaces && dest.discoveredPlaces.length > 0 && (
                                <p className="text-xs font-semibold text-slate-200/90 line-clamp-1 mb-3">
                                  {dest.discoveredPlaces.join(' • ')}
                                </p>
                              )}
                              <div className="flex items-center justify-between pt-2.5 border-t border-white/15">
                                {dest.startingPrice ? (
                                  <div>
                                    <p className="text-[9px] uppercase tracking-wider text-slate-300 font-bold">Starting from</p>
                                    <p className="text-sm sm:text-base font-black text-amber-300">
                                      ₹{dest.startingPrice.toLocaleString('en-IN')}
                                    </p>
                                  </div>
                                ) : (
                                  <span className="text-[11px] text-slate-300 font-bold">Verified Packages</span>
                                )}
                                <span
                                  className="text-xs font-bold text-white bg-white/20 group-hover:bg-orange-500 px-3.5 py-1.5 transition-all flex items-center gap-1.5 shadow-xs"
                                  style={{ borderRadius: '6px' }}
                                >
                                  <span>Explore</span>
                                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  }

                  // Scenario C: 6 destinations, 3 destinations, or other counts -> Uniform 3-Column Balanced Grid
                  return (
                    <div className="hidden sm:grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
                      {destinations.map((dest) => (
                        <div
                          key={dest.name}
                          onClick={() => setSearchTerm(dest.name)}
                          className="group cursor-pointer relative overflow-hidden bg-slate-900 border border-slate-200/80 shadow-2xs hover:shadow-xl transition-all duration-300 h-52 sm:h-60 flex flex-col justify-between p-6"
                          style={{ borderRadius: '6px' }}
                        >
                          {dest.coverImage ? (
                            <img
                              src={dest.coverImage}
                              alt={dest.name}
                              className="absolute inset-0 w-full h-full object-cover opacity-85 group-hover:scale-108 transition-transform duration-700"
                            />
                          ) : (
                            <div className="absolute inset-0 bg-slate-800 flex items-center justify-center text-slate-500">
                              <MapPin className="w-10 h-10" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-900/35 to-transparent opacity-85 group-hover:opacity-75 transition-opacity" />

                          <div className="relative z-10 flex items-center justify-between" />

                          <div className="relative z-10">
                            <h4 className="text-xl sm:text-2xl font-black text-white tracking-tight drop-shadow-sm line-clamp-1 mb-1.5">
                              {dest.name}
                            </h4>
                            {dest.discoveredPlaces && dest.discoveredPlaces.length > 0 && (
                              <p className="text-xs font-semibold text-slate-200/90 line-clamp-1 mb-3">
                                {dest.discoveredPlaces.join(' • ')}
                              </p>
                            )}
                            <div className="flex items-center justify-between pt-2.5 border-t border-white/15">
                              {dest.startingPrice ? (
                                <div>
                                  <p className="text-[9px] uppercase tracking-wider text-slate-300 font-bold">Starting from</p>
                                  <p className="text-sm sm:text-base font-black text-amber-300">
                                    ₹{dest.startingPrice.toLocaleString('en-IN')}
                                  </p>
                                </div>
                              ) : (
                                <span className="text-[11px] text-slate-300 font-bold">Verified Packages</span>
                              )}
                              <span
                                className="text-xs font-bold text-white bg-white/20 group-hover:bg-orange-500 px-3.5 py-1.5 transition-all flex items-center gap-1.5 shadow-xs"
                                style={{ borderRadius: '6px' }}
                              >
                                <span>Explore</span>
                                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}

                {/* Gradient Divider */}
                <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-8 pt-12 sm:pt-14">
                  <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-slate-300 to-transparent" />
                </div>
              </section>
            );
          })()}

      {/* ==========================================
          SECTION 2 — Unified Experience & Theme Explorer (Portrait Carousel with Alternating Stagger)
          ========================================== */}
      {dynamicExperiences.length > 0 && (() => {
        const getExperienceIcon = (name: string) => {
          const lower = name.toLowerCase();
          if (lower.includes('family') || lower.includes('group') || lower.includes('friend')) return <Users className="w-3.5 h-3.5 text-amber-400" />;
          if (lower.includes('honey') || lower.includes('couple') || lower.includes('romantic')) return <Heart className="w-3.5 h-3.5 text-rose-400 fill-rose-400/40" />;
          if (lower.includes('spirit') || lower.includes('temple') || lower.includes('pilgrim') || lower.includes('heritage') || lower.includes('cultur')) return <Landmark className="w-3.5 h-3.5 text-amber-400" />;
          if (lower.includes('trek') || lower.includes('hike') || lower.includes('mountain') || lower.includes('adventure') || lower.includes('hill') || lower.includes('valley')) return <Mountain className="w-3.5 h-3.5 text-emerald-400" />;
          if (lower.includes('wild') || lower.includes('safari') || lower.includes('nature')) return <Trees className="w-3.5 h-3.5 text-emerald-400" />;
          if (lower.includes('snow') || lower.includes('winter') || lower.includes('ski')) return <Snowflake className="w-3.5 h-3.5 text-sky-300" />;
          if (lower.includes('water') || lower.includes('beach') || lower.includes('island') || lower.includes('scuba') || lower.includes('sea') || lower.includes('lake') || lower.includes('backwater') || lower.includes('boat')) return <Waves className="w-3.5 h-3.5 text-cyan-400" />;
          if (lower.includes('camp')) return <Tent className="w-3.5 h-3.5 text-amber-500" />;
          if (lower.includes('desert') || lower.includes('sun') || lower.includes('dune')) return <Sun className="w-3.5 h-3.5 text-orange-400" />;
          if (lower.includes('weekend') || lower.includes('road') || lower.includes('bike') || lower.includes('drive') || lower.includes('scenic')) return <Car className="w-3.5 h-3.5 text-indigo-400" />;
          if (lower.includes('sight') || lower.includes('city') || lower.includes('photo')) return <Camera className="w-3.5 h-3.5 text-cyan-400" />;
          return <Sparkles className="w-3.5 h-3.5 text-amber-400" />;
        };

        return (
          <section className="py-12 px-4 sm:px-8 lg:px-12 w-full max-w-[1600px] mx-auto scroll-mt-32">
            {/* Section Header Centered in the Middle */}
            <div className="flex items-center justify-center mb-8">
              <div className="text-center max-w-2xl mx-auto px-4">
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  Find Trips by Experience
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  Discover curated journeys designed for your preferred travel style
                </p>
              </div>
            </div>

            {/* Horizontal Scroll Rail with Staggered Portrait Cards */}
            <div className="relative group/rail">
              {/* Floating Side Arrows for Desktop */}
              <button
                onClick={() => scrollRail('rail-experiences', 'left')}
                className="hidden lg:flex absolute -left-4 top-1/2 -translate-y-1/2 z-30 w-11 h-11 rounded-full bg-white shadow-xl border border-slate-200 text-slate-700 hover:bg-orange-500 hover:text-white items-center justify-center transition-all opacity-0 group-hover/rail:opacity-100 hover:scale-110 active:scale-95 cursor-pointer"
                aria-label="Scroll left"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => scrollRail('rail-experiences', 'right')}
                className="hidden lg:flex absolute -right-4 top-1/2 -translate-y-1/2 z-30 w-11 h-11 rounded-full bg-white shadow-xl border border-slate-200 text-slate-700 hover:bg-orange-500 hover:text-white items-center justify-center transition-all opacity-0 group-hover/rail:opacity-100 hover:scale-110 active:scale-95 cursor-pointer"
                aria-label="Scroll right"
              >
                <ChevronRight className="w-5 h-5" />
              </button>

              <div
                id="rail-experiences"
                className="flex items-start gap-4 sm:gap-6 overflow-x-auto pt-2 pb-4 scrollbar-hide snap-x snap-mandatory scroll-smooth w-full px-1"
              >
                {dynamicExperiences
                  .filter((exp) => !/\b(photography|photo|shopping|shop|fort|palace|waterfall|monument|temple)\b/i.test(exp.name))
                  .map((exp) => {
                  return (
                    <div
                      key={exp.name}
                      className="snap-start shrink-0"
                    >
                      <div
                        onClick={() => {
                          setSearchTerm(exp.name);
                          if (typeof window !== 'undefined') window.scrollTo(0, 0);
                        }}
                        className="w-[260px] sm:w-[290px] lg:w-[310px] h-[410px] sm:h-[450px] lg:h-[470px] group cursor-pointer relative overflow-hidden bg-slate-900 border border-slate-200/80 shadow-xs hover:shadow-2xl transition-all duration-500 flex flex-col justify-end p-5 sm:p-6 select-none"
                        style={{ borderRadius: '6px' }}
                      >
                        {/* Background Cover Photography */}
                        {exp.coverImage ? (
                          <img
                            src={exp.coverImage}
                            alt={exp.name}
                            className="absolute inset-0 w-full h-full object-cover opacity-95 group-hover:scale-108 transition-transform duration-700 ease-out"
                          />
                        ) : (
                          <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center text-slate-500">
                            <Compass className="w-14 h-14" />
                          </div>
                        )}

                        {/* Smooth Bottom Gradient Scrim for Flawless Text Legibility */}
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/50 to-transparent opacity-90 group-hover:opacity-80 transition-opacity duration-500" />

                        {/* Bottom Information */}
                        <div className="relative z-10">
                          <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-snug drop-shadow-md group-hover:text-amber-300 transition-colors mb-1.5">
                            {exp.name}
                          </h3>
                          <p className="text-xs sm:text-[13px] text-slate-200/90 font-normal line-clamp-2 leading-relaxed mb-4 drop-shadow-xs">
                            {exp.tagline || EXPERIENCE_TAGLINES[exp.name] || 'Curated packages tailored for this travel style'}
                          </p>

                          <div className="flex items-center justify-between pt-3 border-t border-white/15">
                            <div>
                              {exp.startingPrice ? (
                                <div>
                                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-300/90 block">
                                    From
                                  </span>
                                  <p className="text-sm sm:text-base font-extrabold text-amber-300 drop-shadow-xs">
                                    ₹{exp.startingPrice.toLocaleString('en-IN')}
                                  </p>
                                </div>
                              ) : (
                                <span className="text-xs font-semibold text-slate-200">
                                  Verified Packages
                                </span>
                              )}
                            </div>

                            <span
                              className="text-xs font-extrabold text-white bg-white/20 backdrop-blur-md group-hover:bg-orange-500 px-3.5 py-2 transition-all flex items-center gap-1.5 shadow-md"
                              style={{ borderRadius: '6px' }}
                            >
                              <span>Explore</span>
                              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Gradient Divider */}
            <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-8 pt-12">
              <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-slate-300 to-transparent" />
            </div>
          </section>
        );
      })()}

      {/* ==========================================
          SECTION 3 — State → Story → Places → Experiences (Editorial Storytelling)
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

          <section className="py-12 px-4 sm:px-8 lg:px-12 w-full max-w-[1600px] mx-auto">
            {/* Centered Header with Title */}
            <div className="flex items-center justify-center mb-8">
              <div className="text-center max-w-2xl mx-auto px-4">
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight">
                  Destination Stories
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
                  Immersive narratives and verified itineraries across India&apos;s most captivating states.
                </p>
              </div>
            </div>

            {/* Horizontal Scroll Rail of TripDM Modern Editorial Magazine Cards */}
            <div className="relative group/rail">
              {/* Floating Side Arrows for Desktop */}
              <button
                onClick={() => scrollRail('rail-destination-stories', 'left')}
                className="hidden lg:flex absolute -left-4 top-1/2 -translate-y-1/2 z-30 w-11 h-11 rounded-full bg-white shadow-xl border border-slate-200 text-slate-700 hover:bg-orange-500 hover:text-white items-center justify-center transition-all opacity-0 group-hover/rail:opacity-100 hover:scale-110 active:scale-95 cursor-pointer"
                aria-label="Scroll left"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => scrollRail('rail-destination-stories', 'right')}
                className="hidden lg:flex absolute -right-4 top-1/2 -translate-y-1/2 z-30 w-11 h-11 rounded-full bg-white shadow-xl border border-slate-200 text-slate-700 hover:bg-orange-500 hover:text-white items-center justify-center transition-all opacity-0 group-hover/rail:opacity-100 hover:scale-110 active:scale-95 cursor-pointer"
                aria-label="Scroll right"
              >
                <ChevronRight className="w-5 h-5" />
              </button>

              <div
                id="rail-destination-stories"
                className="flex gap-5 sm:gap-6 overflow-x-auto scrollbar-hide scroll-smooth pb-4 pt-1 -mx-4 px-4 sm:-mx-8 sm:px-8 lg:-mx-12 lg:px-12"
              >
                {displayStories.map((story: any, index: number) => {
                  const placesList: string[] = Array.isArray(story.places)
                    ? story.places.map((p: any) => p?.name || p).filter(Boolean)
                    : (Array.isArray(story.discoveredPlaces) ? story.discoveredPlaces.filter(Boolean) : []);

                  const storyTeaser = story.narrative || story.description || (placesList.length > 0
                    ? `Explore verified travel itineraries, scenic places, and local experiences across ${story.stateName}.`
                    : 'Curated travel narrative and verified destination itinerary.');

                  return (
                    <div
                      key={story.id || story.stateName || index}
                      onClick={() => {
                        handleSelectStory(story);
                      }}
                      className="w-[290px] sm:w-[320px] lg:w-[340px] shrink-0 h-[430px] sm:h-[445px] relative overflow-hidden bg-white border border-slate-200/90 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_16px_36px_rgba(0,0,0,0.09)] hover:-translate-y-1.5 transition-all duration-300 group cursor-pointer flex flex-col select-none"
                      style={{ borderRadius: '6px' }}
                    >
                      {/* Top Balanced Image Section (~50% of card) */}
                      <div className="relative w-full h-[200px] sm:h-[215px] shrink-0 overflow-hidden bg-slate-100">
                        {story.coverImage ? (
                          <img
                            src={story.coverImage}
                            alt={story.title || story.stateName}
                            className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-106"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-slate-400">
                            <Compass className="w-12 h-12" />
                          </div>
                        )}
                      </div>

                      {/* Bottom Editorial Content Area */}
                      <div className="p-4 sm:p-5 flex flex-col justify-between flex-1 bg-white">
                        {/* Title & Excerpt */}
                        <div>
                          <h3 className="text-[15.5px] sm:text-[16.5px] font-bold text-slate-900 leading-snug line-clamp-2 group-hover:text-orange-600 transition-colors">
                            {story.title || `${story.stateName} Odyssey`}
                          </h3>
                          <p className="text-xs text-slate-500 font-normal line-clamp-2 leading-relaxed mt-2">
                            {storyTeaser}
                          </p>
                        </div>

                        {/* Bottom Bar: Locations & Read Story Button */}
                        <div className="pt-3 border-t border-slate-100 mt-2 space-y-2.5">
                          <div className="flex items-center text-[11.5px] text-slate-400 font-medium truncate">
                            <MapPin className="w-3.5 h-3.5 mr-1 text-slate-400 shrink-0" />
                            <span className="truncate">
                              {placesList.length > 0 ? placesList.slice(0, 3).join(' • ') : story.stateName}
                            </span>
                          </div>

                          <div
                            className="w-full py-2 px-3 text-xs font-bold text-slate-700 bg-slate-50 group-hover:bg-gradient-to-r group-hover:from-amber-500 group-hover:to-orange-500 group-hover:text-white group-hover:border-amber-400/50 border border-slate-200/90 transition-all duration-200 flex items-center justify-between shadow-2xs"
                            style={{ borderRadius: '6px' }}
                          >
                            <span>Read Story</span>
                            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Gradient Divider */}
            <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-8 pt-12">
              <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-slate-300 to-transparent" />
            </div>
          </section>
        </>
      )}

      {/* ==========================================
          SECTION 5 — Marketplace Product Rails (Weekend Getaways, Group Escapes, etc.)
          ========================================== */}
      {intentRails.map((rail) => (
        <section key={rail.id} className="py-12 px-4 sm:px-8 lg:px-12 w-full max-w-[1600px] mx-auto">
          <div className="mb-6">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-1">
              {rail.title}
            </h2>
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

          {/* Gradient Divider */}
          <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-8 pt-12">
            <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-slate-300 to-transparent" />
          </div>
        </section>
      ))}

      {/* ==========================================
          SECTION 6 — Interactive TripDM AI & Direct Agent Chat Simulation
          ========================================== */}
      <div>
        <LandingPhoneChatSection
          onChat={onChat}
          onView={onView}
          listings={listings}
        />
        {/* Gradient Divider */}
        <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-8 py-2">
          <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-slate-300 to-transparent" />
        </div>
      </div>

      {/* ==========================================
          SECTION 6.5 — "Recently Added Packages" Rail
          ========================================== */}
      {recentlyAdded.length > 0 && (
        <section className="py-12 px-4 sm:px-8 lg:px-12 w-full max-w-[1600px] mx-auto">
          <div className="mb-6">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-1">
              Recently Added Packages
            </h2>
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

          {/* Gradient Divider */}
          <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-8 pt-12">
            <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-slate-300 to-transparent" />
          </div>
        </section>
      )}

      {/* ==========================================
          SECTION 7 — How TripDM Works & Why Book Direct (Clean Travel Marketplace Style)
          ========================================== */}
      <section className="py-16 sm:py-20 px-4 sm:px-8 lg:px-12 w-full max-w-[1600px] mx-auto">
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

        {/* Gradient Divider */}
        <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-8 pt-12">
          <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-slate-300 to-transparent" />
        </div>
      </section>
        </>
      )}
    </div>
  );
}
