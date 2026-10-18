'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  Calendar,
  Users,
  MapPin,
  Star,
  MessageSquare,
  ShieldCheck,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Briefcase,
  Package as PackageIcon,
  RotateCcw,
  Sparkles,
  Heart,
  SlidersHorizontal,
  ChevronDown,
  ArrowRight,
  X,
  Compass,
  Building,
  Globe,
  Tag,
  Eye,
  DollarSign
} from 'lucide-react';
import { PackageListing } from '@/lib/discoveryEngine';
import { getDbInstance } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import TravelAgentsRealMap, { MapPinData } from './TravelAgentsRealMap';
import {
  resolveDestinationWithAutocorrect,
  isAgencyMatchingKeywords,
  isPackageMatchingKeywords,
  prioritizeAgencyPackages,
  CanonicalDestination,
} from '@/lib/destinationResolver';
import { useModalBackHandler } from '@/hooks/useModalHistory';

export interface AgencyData {
  id: string;
  name: string;
  companyName?: string;
  agencyName?: string;
  email?: string;
  phone?: string;
  logoUrl?: string | null;
  avatarUrl?: string | null;
  agencyLogo?: string | null;
  city?: string;
  state?: string;
  country?: string;
  location?: string;
  businessLocation?: string;
  officeAddress?: string;
  fullAddress?: string;
  pincode?: string;
  operatingFromOffice?: boolean;
  operatingFromHome?: boolean;
  verified?: boolean;
  approved?: boolean;
  rating?: number;
  reviewCount?: number;
  experienceYears?: number | string;
  happyTravelersCount?: number | string;
  description?: string;
  bio?: string;
  tagline?: string;
  specialties?: string[];
  destinations?: string[];
  tripTypes?: string[];
  languages?: string[];
  packageImages?: string[];
  packageCount?: number;
  packages?: PackageListing[];
  featured?: boolean;
  latitude?: number;
  longitude?: number;
}

interface DestinationAgentsSearchViewProps {
  destination: string;
  listings?: PackageListing[];
  initialAgencies?: any[];
  onInitiateChat: (data: any) => void;
  onViewAgencyProfile?: (agency: AgencyData) => void;
  onViewListing?: (listing: PackageListing) => void;
  onNavigateHome?: () => void;
  onSearchDestination?: (dest: string) => void;
  wishlist?: string[];
  onWishlistToggle?: (id: string) => void;
}

const TRIP_TYPES = [
  'Family Trip',
  'Honeymoon',
  'Group Tour',
  'Adventure',
  'Pilgrimage',
  'Custom Trip',
];

const TRIP_DURATIONS = [
  { id: '1-3', label: '1–3 Days', min: 1, max: 3 },
  { id: '4-6', label: '4–6 Days', min: 4, max: 6 },
  { id: '7-10', label: '7–10 Days', min: 7, max: 10 },
  { id: '10+', label: '10+ Days', min: 10, max: 99 },
];

const SERVICES_INCLUDED = [
  'Sightseeing',
  'Hotel Stay',
  'Transport',
  'Meals',
  'Guide',
  'Adventure Activities',
];

const RATING_FILTER_OPTIONS = [
  { minRating: 5.0, starsFilled: 5, label: '& above' },
  { minRating: 4.0, starsFilled: 4, label: '& above' },
  { minRating: 3.0, starsFilled: 3, label: '& above' },
  { minRating: 2.0, starsFilled: 2, label: '& above' },
];

// In-memory module cache to persist verified agency users
let globalAgencyUsersCache: any[] = [];

export default function DestinationAgentsSearchView({
  destination,
  listings = [],
  initialAgencies = [],
  onInitiateChat,
  onViewAgencyProfile,
  onViewListing,
  onNavigateHome,
  onSearchDestination,
  wishlist = [],
  onWishlistToggle,
}: DestinationAgentsSearchViewProps) {
  // Autocorrect and destination resolution
  const resolvedDest = useMemo(() => {
    return resolveDestinationWithAutocorrect(destination || 'Kashmir');
  }, [destination]);

  const [currentSearch, setCurrentSearch] = useState(resolvedDest.displayName);
  const [selectedDates, setSelectedDates] = useState('Any Dates');
  const [selectedTravelers, setSelectedTravelers] = useState('2 Travelers');

  // Keep search bar in sync if destination prop changes
  useEffect(() => {
    if (destination) {
      const res = resolveDestinationWithAutocorrect(destination);
      setCurrentSearch(res.displayName);
    }
  }, [destination]);

  // Firestore Agencies
  const [firestoreAgencies, setFirestoreAgencies] = useState<any[]>(() => {
    if (initialAgencies && initialAgencies.length > 0) {
      globalAgencyUsersCache = initialAgencies;
      return initialAgencies;
    }
    if (globalAgencyUsersCache.length > 0) {
      return globalAgencyUsersCache;
    }
    return [];
  });

  // Filters State
  const [selectedDestinations, setSelectedDestinations] = useState<string[]>([]);
  const [destSearchQuery, setDestSearchQuery] = useState('');
  const [selectedTripTypes, setSelectedTripTypes] = useState<string[]>([]);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [selectedRatings, setSelectedRatings] = useState<number[]>([]);
  const [sortBy, setSortBy] = useState('recommended');
  const [showMap, setShowMap] = useState(true);
  const [selectedMapCity, setSelectedMapCity] = useState<string | null>(null);
  const [activePhotoIndexes, setActivePhotoIndexes] = useState<Record<string, number>>({});
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [mobileViewMode, setMobileViewMode] = useState<'list' | 'map'>('list');

  // Handle hardware Back button for mobile filter bottom sheet drawer
  useModalBackHandler(mobileFilterOpen, () => setMobileFilterOpen(false), 'destination_agents_mobile_filter');

  // Handle hardware Back button when mobile map view is open so user returns to list view
  useModalBackHandler(mobileViewMode === 'map', () => setMobileViewMode('list'), 'destination_agents_mobile_map');

  // Prevent background scrolling when mobile filter drawer is open
  useEffect(() => {
    if (mobileFilterOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [mobileFilterOpen]);

  const handlePrevPhoto = (agencyId: string, count: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setActivePhotoIndexes((prev) => ({
      ...prev,
      [agencyId]: (prev[agencyId] ? prev[agencyId] - 1 + count : count - 1) % count,
    }));
  };

  const handleNextPhoto = (agencyId: string, count: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setActivePhotoIndexes((prev) => ({
      ...prev,
      [agencyId]: ((prev[agencyId] || 0) + 1) % count,
    }));
  };

  // Load Firestore Agencies
  useEffect(() => {
    let isMounted = true;
    async function loadAgencies() {
      if (globalAgencyUsersCache.length > 0) return;
      try {
        const dbInstance = getDbInstance();
        if (!dbInstance) return;
        const q = query(collection(dbInstance, 'users'), where('role', '==', 'agency'));
        const snap = await getDocs(q);
        if (isMounted) {
          const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          if (list.length > 0) {
            globalAgencyUsersCache = list;
            setFirestoreAgencies(list);
          }
        }
      } catch (err) {
        console.warn('Could not fetch agency users from Firestore:', err);
      }
    }
    loadAgencies();
    return () => {
      isMounted = false;
    };
  }, []);

  const destInfo = resolvedDest.meta;
  const formattedDestName = resolvedDest.displayName;
  const keywords = resolvedDest.keywords;

  // Helper to extract photos from listings
  const extractImages = (listing: any): string[] => {
    const urls: string[] = [];
    const pushIfValid = (val: any) => {
      if (typeof val === 'string' && val.trim().startsWith('http') && !urls.includes(val.trim())) {
        urls.push(val.trim());
      }
    };
    if (Array.isArray(listing.images)) listing.images.forEach(pushIfValid);
    if (Array.isArray(listing.imageUrls)) listing.imageUrls.forEach(pushIfValid);
    if (Array.isArray(listing.photos)) listing.photos.forEach(pushIfValid);
    pushIfValid(listing.image);
    pushIfValid(listing.coverImage);
    pushIfValid(listing.thumbnail);
    if (Array.isArray(listing.itinerary)) {
      listing.itinerary.forEach((day: any) => {
        pushIfValid(day?.imageUrl);
        if (Array.isArray(day?.imageUrls)) day.imageUrls.forEach(pushIfValid);
        pushIfValid(day?.image);
      });
    }
    if (Array.isArray(listing.placesCovered)) {
      listing.placesCovered.forEach((place: any) => {
        pushIfValid(place?.image);
        pushIfValid(place?.imageUrl);
        if (Array.isArray(place?.imageUrls)) place.imageUrls.forEach(pushIfValid);
      });
    }
    return urls;
  };

  // Build full agencies list strictly with REAL data from Firestore and Listings
  const allAgencies = useMemo<AgencyData[]>(() => {
    const map = new Map<string, AgencyData>();
    const seenNames = new Set<string>();

    firestoreAgencies.forEach((userDoc: any) => {
      if (userDoc.role && userDoc.role !== 'agency') return;
      const id = userDoc.id;
      if (!id) return;

      const name =
        userDoc.companyName ||
        userDoc.agencyName ||
        userDoc.name ||
        userDoc.displayName ||
        '';

      if (!name || name.toLowerCase() === 'admin' || name.toLowerCase() === 'travel agency') return;
      const normName = name.trim().toLowerCase();
      if (seenNames.has(normName)) return;
      seenNames.add(normName);

      const logo =
        userDoc.logoUrl ||
        userDoc.agencyLogo ||
        userDoc.avatarUrl ||
        userDoc.photoURL ||
        null;

      // Smart location resolution from registered agency onboarding data
      const sanitizeAddr = (t: string) => (t || '')
        .replace(/https?:\/\/[^\s,]+/gi, '')
        .replace(/www\.[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+(?:\/[^\s,]*)?/gi, '')
        .replace(/\b[a-zA-Z0-9-]+\.(?:com|in|co\.in|org|net|io|co|biz|info|travel|online|site|store)(?:\/[^\s,]*)?/gi, '')
        .replace(/^[,\s\-–:;]+/, '')
        .replace(/[,\s\-–:;]+$/, '')
        .replace(/,\s*,+/g, ', ')
        .replace(/\s{2,}/g, ' ')
        .trim();

      const rawBusinessLoc = sanitizeAddr(userDoc.businessLocation || '');
      const rawOfficeAddr = sanitizeAddr(userDoc.officeAddress || '');
      const rawFullAddr = sanitizeAddr(userDoc.fullAddress || '');
      const rawLocation = sanitizeAddr(userDoc.location || '');
      const rawAddress = rawOfficeAddr || rawFullAddr || rawLocation;

      // Extract 6-digit Indian PIN code if present
      let extractedPincode = (userDoc.pincode || '').trim();
      if (!extractedPincode && rawAddress) {
        const pinMatch = rawAddress.match(/\b([1-9][0-9]{5})\b/);
        if (pinMatch) extractedPincode = pinMatch[1];
      }

      // Resolve City and State
      let city = (userDoc.city || '').trim();
      let state = (userDoc.state || '').trim();

      if (rawBusinessLoc) {
        const parts = rawBusinessLoc.split(',').map((p: string) => p.trim()).filter(Boolean);
        if (parts.length >= 2) {
          if (!city) city = parts[0];
          if (!state) state = parts[1];
        } else if (parts.length === 1 && !city) {
          city = parts[0];
        }
      }

      if (!city || !state) {
        if (rawAddress) {
          const parts = rawAddress.split(',').map((p: string) => p.trim()).filter(Boolean);
          if (parts.length >= 2) {
            const lastPart = parts[parts.length - 1].replace(/\b[1-9][0-9]{5}\b/g, '').replace(/[-–]/g, '').trim();
            const secondLast = parts[parts.length - 2].replace(/\b[1-9][0-9]{5}\b/g, '').trim();
            if (!state && lastPart && !['india', 'bharat'].includes(lastPart.toLowerCase())) {
              state = lastPart;
            }
            if (!city && secondLast) {
              city = secondLast;
            }
          } else if (parts.length === 1 && !city) {
            city = parts[0].replace(/\b[1-9][0-9]{5}\b/g, '').trim();
          }
        }
      }

      // Fallback defaults without hardcoding
      if (!city) {
        city = (rawLocation?.split(',')[0]?.trim()) || state || 'India';
      }
      if (!state) {
        state = (rawLocation?.split(',')[1]?.trim()) || (city !== 'India' ? 'India' : '');
      }
      const country = userDoc.country || 'India';

      const displayLocation = rawBusinessLoc || (city && state && city.toLowerCase() !== state.toLowerCase() ? `${city}, ${state}` : city || 'India');

      const directPhotos: string[] = [];
      if (Array.isArray(userDoc.photos)) userDoc.photos.forEach((p: any) => typeof p === 'string' && p.trim().startsWith('http') && directPhotos.push(p.trim()));
      if (Array.isArray(userDoc.packageImages)) userDoc.packageImages.forEach((p: any) => typeof p === 'string' && p.trim().startsWith('http') && directPhotos.push(p.trim()));
      if (userDoc.coverImage && typeof userDoc.coverImage === 'string' && userDoc.coverImage.trim().startsWith('http')) directPhotos.push(userDoc.coverImage.trim());

      map.set(id, {
        id,
        name,
        companyName: userDoc.companyName || name,
        agencyName: userDoc.agencyName || name,
        email: userDoc.email,
        phone: userDoc.phone,
        logoUrl: logo,
        city,
        state,
        country,
        location: displayLocation,
        businessLocation: rawBusinessLoc,
        officeAddress: rawOfficeAddr,
        fullAddress: rawFullAddr,
        pincode: extractedPincode,
        operatingFromOffice: Boolean(userDoc.operatingFromOffice),
        operatingFromHome: Boolean(userDoc.operatingFromHome),
        verified: userDoc.approved !== false,
        approved: userDoc.approved !== false,
        rating: typeof userDoc.rating === 'number' && userDoc.rating > 0 ? userDoc.rating : 4.8,
        reviewCount: typeof userDoc.reviewCount === 'number' && userDoc.reviewCount > 0 ? userDoc.reviewCount : 0,
        experienceYears: userDoc.experienceYears || undefined,
        happyTravelersCount: userDoc.happyTravelersCount || undefined,
        description: userDoc.description || userDoc.bio || '',
        specialties: Array.isArray(userDoc.specialties) ? userDoc.specialties : [],
        destinations: Array.isArray(userDoc.destinations) ? userDoc.destinations : [],
        tripTypes: Array.isArray(userDoc.tripTypes) ? userDoc.tripTypes : [],
        languages: Array.isArray(userDoc.languages) ? userDoc.languages : ['English', 'Hindi'],
        packageImages: directPhotos,
        packageCount: 0,
        packages: [],
        featured: !!userDoc.featured,
      });
    });

    const hasRegisteredAgencies = map.size > 0;

    // Populate real packages from listings
    listings.forEach((listing: any) => {
      const listingImages = extractImages(listing);
      const listingAgencyId = listing.agencyId || listing.userId;
      const listingAgencyName = listing.agencyName || listing.companyName || listing.createdBy || '';
      const agencyNameKey = listingAgencyName.toLowerCase().trim();

      let targetAgency: AgencyData | undefined;
      if (listingAgencyId) {
        targetAgency = map.get(listingAgencyId);
      }
      if (!targetAgency && agencyNameKey) {
        for (const ag of map.values()) {
          if (
            ag.id === listingAgencyId ||
            ag.name.toLowerCase().trim() === agencyNameKey ||
            ag.companyName?.toLowerCase().trim() === agencyNameKey ||
            ag.agencyName?.toLowerCase().trim() === agencyNameKey
          ) {
            targetAgency = ag;
            break;
          }
        }
      }

      // If registered agencies exist, do not fabricate unknown agencies, but if no registered agencies, attach
      if (!targetAgency && !hasRegisteredAgencies && listingAgencyName) {
        const fallbackId = listingAgencyId || `agency_${agencyNameKey.replace(/\s+/g, '_')}`;
        targetAgency = {
          id: fallbackId,
          name: listingAgencyName,
          companyName: listingAgencyName,
          agencyName: listingAgencyName,
          logoUrl: listing.agencyLogo || null,
          city: listing.city || 'India',
          state: listing.state || '',
          country: 'India',
          location: listing.location || `${listing.city || 'India'}`,
          verified: true,
          approved: true,
          rating: typeof listing.rating === 'number' ? listing.rating : 4.8,
          reviewCount: typeof listing.reviewsCount === 'number' ? listing.reviewsCount : 0,
          description: listing.overview || listing.description || '',
          specialties: [],
          destinations: [],
          tripTypes: [],
          languages: ['English', 'Hindi'],
          packageImages: [],
          packageCount: 0,
          packages: [],
          featured: !!listing.isFeatured,
        };
        map.set(fallbackId, targetAgency);
      }

      if (targetAgency) {
        targetAgency.packages = targetAgency.packages || [];
        if (!targetAgency.packages.some((p) => p.id === listing.id)) {
          targetAgency.packages.push(listing);
          targetAgency.packageCount = targetAgency.packages.length;
        }
        if (listingImages.length > 0) {
          targetAgency.packageImages = targetAgency.packageImages || [];
          listingImages.forEach((img) => {
            if (!targetAgency!.packageImages!.includes(img)) {
              targetAgency!.packageImages!.push(img);
            }
          });
        }
      }
    });

    return Array.from(map.values());
  }, [firestoreAgencies, listings]);

  // Filter Agencies strictly matching this destination and active sidebar filters
  const filteredAgencies = useMemo(() => {
    return allAgencies.filter((ag) => {
      // Must operate in or have packages for this destination
      const matchesDest = isAgencyMatchingKeywords(ag, keywords);
      if (!matchesDest) return false;

      // Filter by map city pin if clicked
      if (selectedMapCity) {
        const cityLower = selectedMapCity.toLowerCase();
        const cityMatch =
          (ag.city || '').toLowerCase().includes(cityLower) ||
          (ag.location || '').toLowerCase().includes(cityLower) ||
          ag.packages?.some((p: any) =>
            (p.title || p.destination || p.city || p.location || '').toLowerCase().includes(cityLower)
          );
        if (!cityMatch) return false;
      }

      // Filter by Destination Expertise
      if (selectedDestinations.length > 0) {
        const matchesDestExp = selectedDestinations.some((sd) =>
          (ag.destinations || []).some((d) => d.toLowerCase().includes(sd.toLowerCase())) ||
          (ag.location || '').toLowerCase().includes(sd.toLowerCase()) ||
          (ag.name || '').toLowerCase().includes(sd.toLowerCase()) ||
          (ag.packages || []).some((p) => (p.title || p.destination || p.city || '').toLowerCase().includes(sd.toLowerCase()))
        );
        if (!matchesDestExp) return false;
      }

      // Filter by Location
      if (selectedLocations.length > 0) {
        const isInternational = (ag.country || '').toLowerCase() !== 'india' && (ag.country || '') !== '';
        const matchesLoc = selectedLocations.some((loc) => {
          if (loc.toLowerCase() === 'international') return isInternational;
          if (loc.toLowerCase() === 'india') return !isInternational;
          return (ag.location || '').toLowerCase().includes(loc.toLowerCase());
        });
        if (!matchesLoc) return false;
      }

      // Filter by Trip Type
      if (selectedTripTypes.length > 0) {
        const hasTripType = selectedTripTypes.some((tt) =>
          ag.tripTypes?.some((t) => t.toLowerCase().includes(tt.toLowerCase())) ||
          ag.specialties?.some((s) => s.toLowerCase().includes(tt.toLowerCase())) ||
          ag.packages?.some((p) => (p.tourCategories || []).some((tc: string) => tc.toLowerCase().includes(tt.toLowerCase())))
        );
        if (!hasTripType) return false;
      }

      // Filter by Rating
      if (selectedRatings.length > 0) {
        const agRating = ag.rating || 4.5;
        const matchesRating = selectedRatings.some((r) => agRating >= r);
        if (!matchesRating) return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'rating') return (b.rating || 0) - (a.rating || 0);
      if (sortBy === 'packages') return (b.packageCount || 0) - (a.packageCount || 0);

      // Default / Recommended:
      // Count packages specifically matching this destination
      const aDestPkgs = (a.packages || []).filter((p: any) => isPackageMatchingKeywords(p, keywords)).length;
      const bDestPkgs = (b.packages || []).filter((p: any) => isPackageMatchingKeywords(p, keywords)).length;
      const aPhotos = a.packageImages?.length || 0;
      const bPhotos = b.packageImages?.length || 0;

      const getTier = (destPkgs: number, totalPkgs: number, photos: number) => {
        if (destPkgs > 0 && photos > 0) return 4;
        if (destPkgs > 0) return 3;
        if (totalPkgs > 0 && photos > 0) return 2;
        if (totalPkgs > 0) return 1;
        return 0;
      };

      const aTier = getTier(aDestPkgs, a.packages?.length || 0, aPhotos);
      const bTier = getTier(bDestPkgs, b.packages?.length || 0, bPhotos);

      if (aTier !== bTier) {
        return bTier - aTier; // Higher tier comes first
      }

      // Within same tier, more destination packages first
      if (bDestPkgs !== aDestPkgs) return bDestPkgs - aDestPkgs;
      if ((b.packageCount || 0) !== (a.packageCount || 0)) return (b.packageCount || 0) - (a.packageCount || 0);
      return (b.rating || 0) - (a.rating || 0);
    });
  }, [allAgencies, keywords, selectedMapCity, selectedDestinations, selectedLocations, selectedTripTypes, selectedRatings, sortBy]);

  // Map pins data
  const mapPins: MapPinData[] = useMemo(() => {
    return destInfo.pins.map((p) => ({
      city: p.city,
      count: p.count,
      lat: p.lat,
      lng: p.lng,
    }));
  }, [destInfo]);

  // Reset all filters
  const [showMoreDestinations, setShowMoreDestinations] = useState(false);
  const [showMoreTripTypes, setShowMoreTripTypes] = useState(false);

  const destinationOptions = useMemo(() => {
    let list = destInfo.popularSearches;
    if (destSearchQuery.trim()) {
      list = list.filter((d) => d.toLowerCase().includes(destSearchQuery.toLowerCase().trim()));
    } else if (!showMoreDestinations) {
      list = list.slice(0, 4);
    }
    return list;
  }, [destInfo, destSearchQuery, showMoreDestinations]);

  const visibleTripTypes = useMemo(() => {
    return showMoreTripTypes ? TRIP_TYPES : TRIP_TYPES.slice(0, 4);
  }, [showMoreTripTypes]);

  // Top 3 destinations by agents for right sidebar
  const topDestinationsByAgents = useMemo(() => {
    const counts: Record<string, { count: number; image?: string }> = {};
    allAgencies.forEach((ag) => {
      const dests = ag.destinations && ag.destinations.length > 0 ? ag.destinations : [ag.city || formattedDestName];
      dests.forEach((d) => {
        const key = d.split(',')[0].trim();
        if (key) {
          if (!counts[key]) {
            counts[key] = { count: 0, image: ag.packageImages?.[0] };
          }
          counts[key].count += 1;
          if (!counts[key].image && ag.packageImages?.[0]) {
            counts[key].image = ag.packageImages[0];
          }
        }
      });
    });

    return Object.entries(counts)
      .map(([dest, info]) => ({
        dest,
        count: Math.max(info.count, 1),
        image: info.image,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
  }, [allAgencies, formattedDestName]);

  const handleResetFilters = () => {
    setSelectedDestinations([]);
    setSelectedTripTypes([]);
    setSelectedLocations([]);
    setSelectedRatings([]);
    setSelectedMapCity(null);
    setDestSearchQuery('');
  };

  const activeFiltersCount =
    selectedDestinations.length +
    selectedTripTypes.length +
    selectedLocations.length +
    selectedRatings.length +
    (selectedMapCity ? 1 : 0);

  const renderFilterControls = () => (
    <>
      {/* Filter Group 1: Destination Expertise */}
      <div className="py-1.5 border-b border-slate-100">
        <h4 className="text-[11px] font-bold text-slate-900 uppercase tracking-wider mb-1">
          Destination Expertise
        </h4>
        {/* Mini Search inside destinations */}
        <div className="relative mb-1.5">
          <Search className="h-3 w-3 text-slate-400 absolute left-2 top-1.5" />
          <input
            type="text"
            value={destSearchQuery}
            onChange={(e) => setDestSearchQuery(e.target.value)}
            placeholder="Search destination..."
            className="w-full bg-slate-50 border border-slate-200 pl-6.5 pr-2 py-0.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-orange-400"
            style={{ borderRadius: '4px' }}
          />
        </div>
        <div className="space-y-0.5 max-h-48 overflow-y-auto">
          {destinationOptions.map((dest) => {
            const isChecked = selectedDestinations.includes(dest);
            return (
              <label
                key={dest}
                className="flex items-center gap-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 cursor-pointer select-none py-0.5"
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggleSelection(dest, selectedDestinations, setSelectedDestinations)}
                  className="rounded-xs border-slate-300 text-[#FF5500] focus:ring-orange-500 h-3.5 w-3.5 accent-[#FF5500] cursor-pointer"
                />
                <span>{dest}</span>
              </label>
            );
          })}
        </div>
        {destInfo.popularSearches.length > 4 && !destSearchQuery && (
          <button
            type="button"
            onClick={() => setShowMoreDestinations(!showMoreDestinations)}
            className="mt-1 text-[11px] font-semibold text-[#FF5500] hover:underline cursor-pointer"
          >
            {showMoreDestinations ? 'Show less' : 'Show more ⌵'}
          </button>
        )}
      </div>

      {/* Filter Group 2: Trip Type */}
      <div className="py-1.5 border-b border-slate-100">
        <h4 className="text-[11px] font-bold text-slate-900 uppercase tracking-wider mb-1">
          Trip Type
        </h4>
        <div className="space-y-0.5">
          {visibleTripTypes.map((type) => {
            const isChecked = selectedTripTypes.includes(type);
            return (
              <label
                key={type}
                className="flex items-center gap-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 cursor-pointer select-none py-0.5"
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggleSelection(type, selectedTripTypes, setSelectedTripTypes)}
                  className="rounded-xs border-slate-300 text-[#FF5500] focus:ring-orange-500 h-3.5 w-3.5 accent-[#FF5500] cursor-pointer"
                />
                <span>{type}</span>
              </label>
            );
          })}
        </div>
        {TRIP_TYPES.length > 4 && (
          <button
            type="button"
            onClick={() => setShowMoreTripTypes(!showMoreTripTypes)}
            className="mt-1 text-[11px] font-semibold text-[#FF5500] hover:underline cursor-pointer"
          >
            {showMoreTripTypes ? 'Show less' : 'Show more ⌵'}
          </button>
        )}
      </div>

      {/* Filter Group 3: Agent Location */}
      <div className="py-1.5 border-b border-slate-100">
        <h4 className="text-[11px] font-bold text-slate-900 uppercase tracking-wider mb-1">
          Agent Location
        </h4>
        <div className="space-y-0.5">
          {['India', 'International'].map((loc) => {
            const isChecked = selectedLocations.includes(loc);
            return (
              <label
                key={loc}
                className="flex items-center gap-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 cursor-pointer select-none py-0.5"
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggleSelection(loc, selectedLocations, setSelectedLocations)}
                  className="rounded-xs border-slate-300 text-[#FF5500] focus:ring-orange-500 h-3.5 w-3.5 accent-[#FF5500] cursor-pointer"
                />
                <span>{loc}</span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Filter Group 4: Rating */}
      <div className="pt-1">
        <h4 className="text-[11px] font-bold text-slate-900 uppercase tracking-wider mb-1">
          Rating
        </h4>
        <div className="space-y-0.5">
          {RATING_FILTER_OPTIONS.map((opt) => {
            const isChecked = selectedRatings.includes(opt.minRating);
            return (
              <label
                key={opt.minRating}
                className="flex items-center gap-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 cursor-pointer select-none py-0.5"
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => {
                    if (selectedRatings.includes(opt.minRating)) {
                      setSelectedRatings(selectedRatings.filter((r) => r !== opt.minRating));
                    } else {
                      setSelectedRatings([...selectedRatings, opt.minRating]);
                    }
                  }}
                  className="rounded-xs border-slate-300 text-[#FF5500] focus:ring-orange-500 h-3.5 w-3.5 accent-[#FF5500] cursor-pointer"
                />
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((starIdx) => (
                    <Star
                      key={starIdx}
                      className={`w-3 h-3 ${
                        starIdx <= opt.starsFilled
                          ? 'fill-amber-400 text-amber-400'
                          : 'fill-slate-200 text-slate-200'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-[11px] text-slate-600 font-medium ml-0.5">{opt.label}</span>
              </label>
            );
          })}
        </div>
      </div>
    </>
  );

  const handleSearchFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentSearch.trim()) {
      const resolved = resolveDestinationWithAutocorrect(currentSearch.trim());
      setCurrentSearch(resolved.displayName);
      if (onSearchDestination) {
        onSearchDestination(resolved.displayName);
      }
    }
  };

  const toggleSelection = (item: string, list: string[], setList: (l: string[]) => void) => {
    if (list.includes(item)) {
      setList(list.filter((i) => i !== item));
    } else {
      setList([...list, item]);
    }
  };

  return (
    <div className="w-full bg-white text-slate-900 min-h-screen">
      {/* ─── 1. TOP SEARCH STRIP (Centered in Middle with Proper Vertical Spacing - Hidden on Phone) ─── */}
      <div className="hidden sm:block bg-white border-b border-slate-100 py-3 sm:py-3.5 shadow-2xs">
        <div className="w-full max-w-3xl mx-auto px-4 sm:px-6">
          {/* Centered Search Bar Form */}
          <form
            onSubmit={handleSearchFormSubmit}
            className="flex flex-col md:flex-row items-stretch md:items-center gap-1.5 bg-white border border-slate-200/90 p-1 sm:p-1.5 shadow-xs"
            style={{ borderRadius: '6px' }}
          >
            {/* Field 1: Destination Search Input with Autocorrect */}
            <div className="flex-1 flex items-center px-2.5 py-1 min-w-0">
              <Search className="h-4 w-4 text-slate-400 shrink-0 mr-2" />
              <input
                type="text"
                value={currentSearch}
                onChange={(e) => setCurrentSearch(e.target.value)}
                placeholder="Search destination..."
                className="w-full bg-transparent text-xs sm:text-[13px] font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none"
              />
              {currentSearch && (
                <button
                  type="button"
                  onClick={() => setCurrentSearch('')}
                  className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer mr-1"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Submit Search Button */}
            <button
              type="submit"
              className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 active:scale-95 text-white font-bold px-5 py-2 text-xs sm:text-[13px] shadow-xs transition-all cursor-pointer shrink-0 border border-amber-400/50"
              style={{ borderRadius: '6px' }}
            >
              Search
            </button>
          </form>
        </div>
      </div>

      {/* ─── 2. MAIN 3-COLUMN LAYOUT (Single Window Compact Fit) ─── */}
      <div className="w-full max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 py-5">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* ══════════════════════════════════════════════════════════════════
              LEFT SIDEBAR: FILTERS (Direct on Page - No Container Box)
             ══════════════════════════════════════════════════════════════════ */}
          <aside
            className="hidden lg:block lg:col-span-3 xl:col-span-2 bg-transparent p-0 lg:sticky lg:top-20 space-y-2 max-h-[calc(100vh-6.5rem)] overflow-y-auto scrollbar-hide border-none shadow-none"
          >
            {/* Header: Filters + Reset */}
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
              <div className="flex items-center gap-1.5">
                <SlidersHorizontal className="h-3.5 w-3.5 text-slate-700" />
                <h3 className="text-xs sm:text-sm font-bold text-slate-900">Filters</h3>
              </div>
              {activeFiltersCount > 0 && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="text-[11px] font-semibold text-[#FF5500] hover:underline cursor-pointer flex items-center gap-1"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>Reset</span>
                </button>
              )}
            </div>

            {renderFilterControls()}
          </aside>

          {/* Mobile Map View when Map toggle is selected */}
          {mobileViewMode === 'map' && (
            <div className="lg:hidden col-span-1 w-full pb-24">
              <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm mb-4">
                <div className="flex items-center gap-1.5 mb-2">
                  <MapPin className="h-4 w-4 text-[#FF5500]" />
                  <h3 className="text-sm font-bold text-slate-900">Travel Agents on Map</h3>
                </div>
                <div className="h-[420px] w-full rounded-lg overflow-hidden border border-slate-200">
                  <TravelAgentsRealMap
                    pins={mapPins}
                    selectedCity={selectedMapCity}
                    onSelectCity={setSelectedMapCity}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              CENTER COLUMN: DESTINATION TRAVEL AGENTS LIST (Scrollable Feed)
             ══════════════════════════════════════════════════════════════════ */}
          <main className={`lg:col-span-6 xl:col-span-7 space-y-4 pb-24 lg:pb-0 ${mobileViewMode === 'map' ? 'hidden lg:block' : 'block'}`}>
            {/* Header: Title + Autocorrect notification + Agent Count + Sort Dropdown */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 mb-2 border-b border-slate-200">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  {formattedDestName} Travel Agents
                </h2>
                
                {/* Autocorrect Notice Banner */}
                {resolvedDest.wasCorrected && resolvedDest.correctedFrom && (
                  <div
                    className="mt-1.5 inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 border border-amber-200 text-amber-900 text-xs font-medium"
                    style={{ borderRadius: '5px' }}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>
                      Showing results for <strong>{formattedDestName}</strong>
                      {' '}(auto-corrected from <span className="italic line-through text-amber-700">"{resolvedDest.correctedFrom}"</span>)
                    </span>
                  </div>
                )}

                <p className="text-xs sm:text-sm text-slate-500 mt-1 font-normal">
                  {filteredAgencies.length} verified travel agents offering {formattedDestName} packages. Chat, compare and customize directly.
                </p>
              </div>

              {/* Sort By Dropdown */}
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-semibold text-slate-500">Sort by:</span>
                <div className="relative inline-flex items-center">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="appearance-none bg-white border border-slate-200 pl-3 pr-8 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-orange-500 cursor-pointer shadow-xs hover:border-slate-300 transition-colors"
                    style={{ borderRadius: '6px' }}
                  >
                    <option value="recommended">Recommended</option>
                    <option value="rating">Highest Rated</option>
                    <option value="packages">Most Packages</option>
                  </select>
                  <ChevronDown className="h-3.5 w-3.5 text-slate-400 pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>
            </div>

            {/* Active City Filter Tag (if map pin clicked) */}
            {selectedMapCity && (
              <div
                className="bg-orange-50 border border-orange-200 px-3 py-2 flex items-center justify-between text-xs text-orange-900 font-semibold"
                style={{ borderRadius: '6px' }}
              >
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-[#FF5500]" />
                  <span>Filtered by region: <strong>{selectedMapCity}</strong></span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedMapCity(null)}
                  className="text-orange-700 hover:text-orange-900 font-bold underline cursor-pointer"
                >
                  Clear region
                </button>
              </div>
            )}

            {/* Travel Agency Cards List */}
            {filteredAgencies.length === 0 ? (
              <div
                className="bg-white p-8 sm:p-10 border border-slate-200 text-center shadow-xs"
                style={{ borderRadius: '8px' }}
              >
                <div className="w-14 h-14 bg-orange-50 text-[#FF5500] rounded-full flex items-center justify-center mx-auto mb-3 shadow-2xs">
                  <Compass className="h-7 w-7 text-[#FF5500]" />
                </div>
                <h3 className="text-base sm:text-lg font-black text-slate-900">
                  No Travel Agents Found for {formattedDestName}
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto mt-1 leading-relaxed">
                  We currently don't have registered travel agents or tour packages specifically for <strong>{formattedDestName}</strong>. Try exploring one of our popular destinations below!
                </p>

                {/* Popular Destinations Quick Links */}
                <div className="mt-5 pt-4 border-t border-slate-100 max-w-lg mx-auto">
                  <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5">
                    Explore Popular Destinations
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    {['Rajasthan', 'Kashmir', 'Kerala', 'Goa', 'Manali', 'Ladakh', 'Uttarakhand', 'Dubai', 'Bali', 'Thailand', 'Meghalaya', 'Sikkim'].map((popDest) => (
                      <button
                        key={popDest}
                        type="button"
                        onClick={() => {
                          setCurrentSearch(popDest);
                          if (onSearchDestination) onSearchDestination(popDest);
                        }}
                        className="px-3 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-orange-50 hover:text-[#FF5500] hover:border-orange-200 border border-slate-200 transition-colors cursor-pointer"
                        style={{ borderRadius: '6px' }}
                      >
                        {popDest}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                    style={{ borderRadius: '6px' }}
                  >
                    Reset Filters
                  </button>
                  {onNavigateHome && (
                    <button
                      type="button"
                      onClick={onNavigateHome}
                      className="px-5 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-xs shadow-md shadow-amber-500/20 transition-all cursor-pointer"
                      style={{ borderRadius: '6px' }}
                    >
                      Back to Home
                    </button>
                  )}
                </div>
              </div>
            ) : (
              filteredAgencies.map((agency) => {
                const rawAgencyPackages = Array.isArray(agency.packages) ? agency.packages : [];
                const sortedAgencyPackages = prioritizeAgencyPackages(rawAgencyPackages, keywords);
                const packageCount = rawAgencyPackages.length;
                const photoIndex = activePhotoIndexes[agency.id] || 0;

                // Prioritize images from packages matching this destination
                const matchingPkgImages: string[] = [];
                rawAgencyPackages.forEach((pkg: any) => {
                  if (isPackageMatchingKeywords(pkg, keywords)) {
                    const pkgImgs = extractImages(pkg);
                    pkgImgs.forEach((img) => {
                      if (!matchingPkgImages.includes(img)) matchingPkgImages.push(img);
                    });
                  }
                });

                const rawImages = agency.packageImages || [];
                const combinedImages = Array.from(new Set([...matchingPkgImages, ...rawImages]));
                const hasImages = combinedImages.length > 0;
                const currentImg = hasImages ? (combinedImages[photoIndex] || combinedImages[0]) : null;

                const isWishlisted = wishlist.includes(agency.id);

                return (
                  <div
                    key={agency.id}
                    className="relative group flex flex-col md:flex-row pb-6 sm:pb-7 gap-5 sm:gap-6 items-stretch border-b border-slate-200 last:border-b-0 last:pb-0"
                  >
                    {/* Left: Real Package Photo for this agency OR Clean Verified Agency Badge */}
                    <div
                      className="relative w-full md:w-64 xl:w-72 h-52 sm:h-56 md:h-[220px] max-h-[220px] overflow-hidden shrink-0 bg-slate-100 flex items-center justify-center border border-slate-100 shadow-2xs"
                      style={{ borderRadius: '6px' }}
                    >
                      {hasImages && currentImg ? (
                        <>
                          <img
                            src={currentImg}
                            alt={`${agency.name} tour`}
                            className="w-full h-full object-cover object-center transition-transform duration-300 group-hover:scale-105"
                          />

                          {/* Featured Badge */}
                          {agency.featured && (
                            <div
                              className="absolute top-2.5 left-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-bold px-2 py-0.5 shadow-xs z-10"
                              style={{ borderRadius: '4px' }}
                            >
                              <Sparkles className="h-2.5 w-2.5 inline mr-1" />
                              <span>Featured</span>
                            </div>
                          )}

                          {/* Photo Count Badge */}
                          <div
                            className="absolute bottom-2 left-2 bg-slate-900/80 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 z-10"
                            style={{ borderRadius: '4px' }}
                          >
                            {combinedImages.length} {combinedImages.length === 1 ? 'photo' : 'photos'}
                          </div>

                          {/* Carousel Arrow Buttons (if multiple package photos) */}
                          {combinedImages.length > 1 && (
                            <>
                              <button
                                type="button"
                                onClick={(e) => handlePrevPhoto(agency.id, combinedImages.length, e)}
                                className="absolute left-1.5 top-1/2 -translate-y-1/2 w-6 h-6 bg-slate-900/60 hover:bg-slate-900/90 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer z-10"
                                style={{ borderRadius: '4px' }}
                                aria-label="Previous photo"
                              >
                                <ChevronLeft className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => handleNextPhoto(agency.id, combinedImages.length, e)}
                                className="absolute right-1.5 top-1/2 -translate-y-1/2 w-6 h-6 bg-slate-900/60 hover:bg-slate-900/90 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer z-10"
                                style={{ borderRadius: '4px' }}
                                aria-label="Next photo"
                              >
                                <ChevronRight className="h-3.5 w-3.5" />
                              </button>
                            </>
                          )}
                        </>
                      ) : (
                        /* Clean modern agency fallback badge when agency has no uploaded package photos */
                        <div
                          className="w-full h-full min-h-[180px] bg-gradient-to-br from-slate-50 via-orange-50/40 to-slate-100 flex flex-col items-center justify-center p-4 text-center relative overflow-hidden"
                          style={{ borderRadius: '6px' }}
                        >
                          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#FF5500_1px,transparent_1px)] [background-size:12px_12px]" />
                          <div className="relative z-10 flex flex-col items-center">
                            {agency.logoUrl ? (
                              <img
                                src={agency.logoUrl}
                                alt={agency.name}
                                className="max-h-12 max-w-[120px] object-contain mb-2 drop-shadow-2xs"
                              />
                            ) : (
                              <div
                                className="w-12 h-12 bg-[#FF5500]/10 text-[#FF5500] font-black text-lg flex items-center justify-center mb-2 shadow-2xs"
                                style={{ borderRadius: '6px' }}
                              >
                                {agency.name.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <span className="text-xs font-bold text-slate-800 line-clamp-1">{agency.name}</span>
                            <span className="text-[10px] text-slate-500 mt-0.5">Verified Travel Agency</span>
                          </div>
                        </div>
                      )}

                      {/* Wishlist Heart Button on top right of photo */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onWishlistToggle) onWishlistToggle(agency.id);
                        }}
                        className="absolute top-2.5 right-2.5 w-7 h-7 bg-white/90 hover:bg-white text-slate-700 hover:text-rose-500 rounded-full flex items-center justify-center shadow-md transition-colors cursor-pointer z-20"
                        aria-label="Wishlist agency"
                      >
                        <Heart className={`h-4 w-4 ${isWishlisted ? 'fill-rose-500 text-rose-500' : ''}`} />
                      </button>
                    </div>

                    {/* Right: Agency Details, Clean Subtitle, Action Buttons & Popular Packages Row */}
                    <div className="flex-1 flex flex-col justify-between min-w-0 py-0.5">
                      <div>
                        {/* Row 1: Logo & Name + Action Buttons */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                          <div
                            className="flex items-center gap-3 min-w-0 cursor-pointer"
                            onClick={() => {
                              if (onViewAgencyProfile) onViewAgencyProfile(agency);
                            }}
                          >
                            {/* Agency Logo */}
                            {agency.logoUrl ? (
                              <div
                                className="h-10 min-w-[44px] max-w-[120px] px-2 py-0.5 bg-white border border-slate-200 flex items-center justify-center shrink-0 shadow-2xs"
                                style={{ borderRadius: '6px' }}
                              >
                                <img
                                  src={agency.logoUrl}
                                  alt={agency.name}
                                  className="max-h-8 max-w-full object-contain"
                                />
                              </div>
                            ) : (
                              <div
                                className="w-10 h-10 bg-orange-50 border border-orange-200 text-[#FF5500] font-black text-base flex items-center justify-center shrink-0 shadow-2xs"
                                style={{ borderRadius: '6px' }}
                              >
                                {agency.name.charAt(0).toUpperCase()}
                              </div>
                            )}

                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <h3 className="text-base font-black text-slate-900 truncate">
                                  {agency.name}
                                </h3>
                                {agency.verified && (
                                  <CheckCircle2 className="h-4 w-4 text-emerald-500 fill-emerald-100 shrink-0" />
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Action Buttons (Top Right of Card) */}
                          <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
                            <button
                              type="button"
                              onClick={() => {
                                const firstPkg = sortedAgencyPackages[0] || rawAgencyPackages[0];
                                const firstPrice = firstPkg?.cost || firstPkg?.price || firstPkg?.startingPrice || firstPkg?.pricing;
                                onInitiateChat({
                                  agencyId: agency.id,
                                  agencyName: agency.name,
                                  ...(firstPkg || {}),
                                  id: firstPkg?.id,
                                  title: firstPkg?.title,
                                  duration: firstPkg?.duration ? String(firstPkg.duration) : undefined,
                                  price: firstPrice,
                                });
                              }}
                              className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 active:scale-95 text-white font-bold py-2 px-4 text-xs shadow-md shadow-amber-500/25 flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-amber-400/50"
                              style={{ borderRadius: '6px' }}
                            >
                              <MessageSquare className="h-3.5 w-3.5" />
                              <span>Chat with Agent</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                if (onViewAgencyProfile) onViewAgencyProfile(agency);
                              }}
                              className="bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 hover:text-slate-900 text-slate-700 font-bold py-2 px-4 text-xs transition-all cursor-pointer shadow-2xs"
                              style={{ borderRadius: '6px' }}
                            >
                              <span>View Profile</span>
                            </button>
                          </div>
                        </div>

                        {/* Clean Tour Tags Row (No Clutter) */}
                        {agency.tripTypes && agency.tripTypes.length > 0 && (
                          <div className="mt-2.5 flex flex-wrap gap-1.5">
                            {agency.tripTypes.slice(0, 4).map((tt, i) => (
                              <span
                                key={i}
                                className="px-2 py-0.5 text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200/60"
                                style={{ borderRadius: '4px' }}
                              >
                                {tt}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Packages Count Row */}
                        <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-700 font-semibold">
                          <PackageIcon className="h-3.5 w-3.5 text-[#FF5500] shrink-0" />
                          <span>
                            {packageCount} {packageCount === 1 ? 'Package Listed' : 'Packages Listed'}
                          </span>
                        </div>

                        {/* Agency Bio */}
                        {agency.description && (
                          <p className="mt-1.5 text-xs text-slate-600 line-clamp-2 leading-relaxed">
                            {agency.description}
                          </p>
                        )}
                      </div>

                      {/* Bottom Section: Packages by [Agency Name] - Scrollable Row (Prioritizing Destination Packages) */}
                      {sortedAgencyPackages.length > 0 && (
                        <div className="mt-3 pt-2.5 border-t border-slate-100">
                          <div className="flex items-center justify-between mb-1.5">
                            <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                              Popular Packages by {agency.name} ({sortedAgencyPackages.length})
                            </h4>
                            {sortedAgencyPackages.length > 2 && (
                              <span className="text-[10px] text-slate-400 font-medium">
                                Scroll to view all →
                              </span>
                            )}
                          </div>

                          {/* Horizontally Scrollable Packages Row */}
                          <div className="flex items-center gap-2.5 overflow-x-auto pb-1.5 pt-0.5 scrollbar-thin scrollbar-thumb-slate-200 hover:scrollbar-thumb-slate-300 -mx-0.5 px-0.5">
                            {sortedAgencyPackages.map((pkg: any, idx: number) => {
                              const pkgImg =
                                pkg.image ||
                                (Array.isArray(pkg.images) ? pkg.images[0] : null) ||
                                (Array.isArray(pkg.photos) ? pkg.photos[0] : null) ||
                                pkg.coverImage ||
                                pkg.thumbnail;

                              // Extract Price with all fallbacks
                              const rawPrice =
                                pkg.cost ||
                                pkg.price ||
                                pkg.startingPrice ||
                                pkg.pricing ||
                                pkg.rates ||
                                pkg.amount ||
                                pkg.budget ||
                                pkg.discountedPrice;
                              let formattedPrice = '';
                              const currencySymbol = pkg.packageType === 'international' ? '$' : '₹';

                              if (rawPrice !== undefined && rawPrice !== null && rawPrice !== '' && rawPrice !== 'N/A') {
                                if (typeof rawPrice === 'number') {
                                  formattedPrice = `${currencySymbol}${Math.round(rawPrice).toLocaleString('en-IN')}`;
                                } else if (typeof rawPrice === 'string') {
                                  const cleaned = rawPrice.replace(/[^0-9.]/g, '');
                                  const num = Number(cleaned);
                                  if (!isNaN(num) && num > 0) {
                                    formattedPrice = `${currencySymbol}${Math.round(num).toLocaleString('en-IN')}`;
                                  } else if (rawPrice.trim()) {
                                    formattedPrice = rawPrice.startsWith('₹') || rawPrice.startsWith('$') ? rawPrice : `${currencySymbol}${rawPrice}`;
                                  }
                                }
                              }

                              // Extract Duration / Days with all fallbacks
                              let pkgDuration = '';
                              if (pkg.duration && typeof pkg.duration === 'string' && (pkg.duration.toLowerCase().includes('d') || pkg.duration.toLowerCase().includes('n') || pkg.duration.toLowerCase().includes('day') || pkg.duration.toLowerCase().includes('night'))) {
                                pkgDuration = pkg.duration.trim();
                              } else if (pkg.duration && !isNaN(Number(pkg.duration))) {
                                const d = Number(pkg.duration);
                                const n = d > 1 ? d - 1 : 0;
                                pkgDuration = n > 0 ? `${d}D/${n}N` : `${d} Days`;
                              } else if (pkg.days || pkg.durationDays) {
                                const d = Number(pkg.days || pkg.durationDays);
                                const n = Number(pkg.nights || pkg.durationNights) || (d > 1 ? d - 1 : 0);
                                pkgDuration = n > 0 ? `${d}D/${n}N` : `${d} Days`;
                              } else if (Array.isArray(pkg.itinerary) && pkg.itinerary.length > 0) {
                                const d = pkg.itinerary.length;
                                const n = d > 1 ? d - 1 : 0;
                                pkgDuration = n > 0 ? `${d}D/${n}N` : `${d} Days`;
                              }

                              const isMatchingCurrentDest = isPackageMatchingKeywords(pkg, keywords);

                              return (
                                <div
                                  key={pkg.id || `pkg-${idx}`}
                                  onClick={() => {
                                    if (onViewListing && (pkg.id || pkg.title)) {
                                      onViewListing(pkg);
                                    } else if (onViewAgencyProfile) {
                                      onViewAgencyProfile(agency);
                                    }
                                  }}
                                  className={`min-w-[210px] sm:min-w-[230px] max-w-[260px] shrink-0 flex items-center gap-2 p-2 border transition-all cursor-pointer group/pkg shadow-2xs ${
                                    isMatchingCurrentDest
                                      ? 'bg-orange-50/50 border-orange-200/90 hover:border-[#FF5500]'
                                      : 'bg-slate-50 border-slate-200/80 hover:border-orange-300 hover:bg-orange-50/40'
                                  }`}
                                  style={{ borderRadius: '6px' }}
                                >
                                  {pkgImg ? (
                                    <img
                                      src={pkgImg}
                                      alt={pkg.title || 'Tour Package'}
                                      className="w-11 h-11 object-cover shrink-0 rounded"
                                    />
                                  ) : (
                                    <div className="w-11 h-11 bg-orange-100/70 text-[#FF5500] flex items-center justify-center rounded shrink-0">
                                      <PackageIcon className="w-5 h-5 text-[#FF5500]" />
                                    </div>
                                  )}
                                  <div className="min-w-0 flex-1">
                                    <h5 className="text-[11px] font-bold text-slate-900 group-hover/pkg:text-[#FF5500] truncate">
                                      {pkg.title || 'Tour Package'}
                                    </h5>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                      {formattedPrice ? (
                                        <span className="text-[10px] text-[#FF5500] font-bold">
                                          {formattedPrice}
                                        </span>
                                      ) : null}
                                      {pkgDuration ? (
                                        <span className="text-[9px] font-medium text-slate-500 bg-slate-200/70 px-1 py-0.5 rounded leading-none">
                                          {pkgDuration}
                                        </span>
                                      ) : null}
                                      {formattedPrice && !pkgDuration ? (
                                        <span className="text-[9px] text-slate-400 font-normal">per person</span>
                                      ) : null}
                                    </div>
                                  </div>
                                  <ChevronRight className="h-3.5 w-3.5 text-slate-400 group-hover/pkg:text-[#FF5500] group-hover/pkg:translate-x-0.5 transition-all shrink-0" />
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </main>

          {/* ══════════════════════════════════════════════════════════════════
              RIGHT SIDEBAR: MAP & TOP DESTINATIONS (Single Page View - Compact & Sticky)
             ══════════════════════════════════════════════════════════════════ */}
          <aside className="hidden lg:block lg:col-span-3 space-y-4 lg:sticky lg:top-20 max-h-[calc(100vh-6.5rem)] overflow-y-auto scrollbar-hide border-none shadow-none">
            {/* 1. REAL MAP WIDGET */}
            <div className="bg-transparent p-0">
              {/* Map Title & Toggle */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-[#FF5500]" />
                  <h3 className="text-xs font-bold text-slate-900">
                    Travel Agents on Map
                  </h3>
                </div>
                {/* Toggle Switch */}
                <button
                  type="button"
                  onClick={() => setShowMap(!showMap)}
                  className={`w-8 h-4.5 flex items-center p-0.5 cursor-pointer transition-colors ${
                    showMap ? 'bg-[#FF5500]' : 'bg-slate-300'
                  }`}
                  style={{ borderRadius: '4px' }}
                  aria-label="Toggle map view"
                >
                  <div
                    className={`bg-white w-3.5 h-3.5 shadow-md transform transition-transform ${
                      showMap ? 'translate-x-3.5' : 'translate-x-0'
                    }`}
                    style={{ borderRadius: '3px' }}
                  />
                </button>
              </div>

              {/* Real Leaflet Map Component with OpenStreetMap Tiles */}
              {showMap && (
                <div className="mt-1">
                  <TravelAgentsRealMap
                    pins={mapPins}
                    selectedCity={selectedMapCity}
                    onSelectCity={setSelectedMapCity}
                  />
                </div>
              )}
            </div>

            {/* 2. TOP DESTINATIONS BY AGENTS WIDGET (Direct on page with clean separator) */}
            {topDestinationsByAgents.length > 0 && (
              <div className="bg-transparent p-0 pt-3 border-t border-slate-200">
                <h3 className="text-[11px] font-bold text-slate-900 uppercase tracking-wider mb-2">
                  Top Destinations by Agents
                </h3>
                <div className="space-y-1.5">
                  {topDestinationsByAgents.map((destItem, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        if (selectedDestinations.includes(destItem.dest)) {
                          setSelectedDestinations(selectedDestinations.filter((d) => d !== destItem.dest));
                        } else {
                          setSelectedDestinations([destItem.dest]);
                        }
                      }}
                      className={`w-full flex items-center justify-between p-1.5 border transition-all text-left cursor-pointer group ${
                        selectedDestinations.includes(destItem.dest)
                          ? 'bg-orange-50/80 border-orange-300'
                          : 'bg-white border-slate-100 hover:border-orange-200 hover:bg-slate-50/70'
                      }`}
                      style={{ borderRadius: '6px' }}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {destItem.image ? (
                          <img
                            src={destItem.image}
                            alt={destItem.dest}
                            className="w-8 h-8 object-cover shrink-0"
                            style={{ borderRadius: '4px' }}
                          />
                        ) : (
                          <div
                            className="w-8 h-8 bg-orange-100 text-[#FF5500] font-bold text-xs flex items-center justify-center shrink-0"
                            style={{ borderRadius: '4px' }}
                          >
                            <MapPin className="h-3.5 w-3.5" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-slate-900 group-hover:text-[#FF5500] transition-colors truncate">
                            {destItem.dest}
                          </h4>
                          <p className="text-[10px] text-slate-500 font-medium">
                            {destItem.count} {destItem.count === 1 ? 'Travel Agent' : 'Travel Agents'}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-[#FF5500] group-hover:translate-x-0.5 transition-all shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 3. WHY BOOK ON TRIPDM? (Direct on page with clean separator) */}
            <div className="bg-transparent p-0 pt-3 border-t border-slate-200">
              <h3 className="text-[11px] font-bold text-slate-900 uppercase tracking-wider mb-2">
                Why Book on TripDM?
              </h3>
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <MessageSquare className="h-3.5 w-3.5 text-[#FF5500] shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Direct Chat & Custom Plans</h4>
                    <p className="text-[10px] text-slate-500 leading-tight">Chat with verified travel agents to tailor itineraries.</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <DollarSign className="h-3.5 w-3.5 text-[#FF5500] shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">0% Commission / Local Rates</h4>
                    <p className="text-[10px] text-slate-500 leading-tight">Pay agents directly with zero platform markup.</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <ShieldCheck className="h-3.5 w-3.5 text-[#FF5500] shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">100% Verified Agencies</h4>
                    <p className="text-[10px] text-slate-500 leading-tight">All agencies are verified for quality and service.</p>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* ─── MOBILE FLOATING ACTION PILL (FILTERS & MAP/LIST) ─── */}
      <div className="lg:hidden fixed bottom-18 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5 bg-slate-900/95 text-white backdrop-blur-md px-4 py-2 rounded-full shadow-[0_8px_25px_rgba(0,0,0,0.35)] border border-white/15 select-none">
        <button
          type="button"
          onClick={() => setMobileFilterOpen(true)}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold text-white hover:text-orange-400 transition-colors cursor-pointer"
        >
          <SlidersHorizontal className="w-3.5 h-3.5 text-orange-400" />
          <span>Filters</span>
          {activeFiltersCount > 0 && (
            <span className="bg-[#FF5500] text-white text-[10px] font-black px-1.5 py-0.2 rounded-full ml-0.5">
              {activeFiltersCount}
            </span>
          )}
        </button>
        <div className="w-[1px] h-4 bg-white/20" />
        <button
          type="button"
          onClick={() => setMobileViewMode(mobileViewMode === 'list' ? 'map' : 'list')}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold text-white hover:text-orange-400 transition-colors cursor-pointer"
        >
          {mobileViewMode === 'list' ? (
            <>
              <Compass className="w-3.5 h-3.5 text-orange-400" />
              <span>Map</span>
            </>
          ) : (
            <>
              <Users className="w-3.5 h-3.5 text-orange-400" />
              <span>List</span>
            </>
          )}
        </button>
      </div>

      {/* ─── MOBILE FILTERS BOTTOM SHEET MODAL ─── */}
      {mobileFilterOpen && (
        <div className="lg:hidden fixed inset-0 z-[140] flex flex-col justify-end">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-200 touch-none"
            onClick={() => setMobileFilterOpen(false)}
          />

          {/* Bottom Sheet Modal */}
          <div className="relative z-10 bg-white rounded-t-2xl shadow-2xl max-h-[85vh] flex flex-col animate-in slide-in-from-bottom duration-200 border-t border-slate-200">
            {/* Drag Pill */}
            <div className="w-full flex items-center justify-center pt-2.5 pb-1 shrink-0">
              <div className="w-10 h-1 rounded-full bg-slate-300" />
            </div>

            {/* Header */}
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-[#FF5500]" />
                <h3 className="text-sm font-bold text-slate-900">Filter Travel Agents</h3>
                {activeFiltersCount > 0 && (
                  <span className="bg-orange-100 text-orange-700 text-xs font-bold px-2 py-0.5 rounded-full">
                    {activeFiltersCount}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                {activeFiltersCount > 0 && (
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="text-xs font-semibold text-[#FF5500] hover:underline cursor-pointer"
                  >
                    Reset
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setMobileFilterOpen(false)}
                  className="w-7 h-7 rounded-md hover:bg-slate-100 text-slate-500 flex items-center justify-center cursor-pointer"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Scrollable Filters Content */}
            <div className="p-4 overflow-y-auto space-y-3 flex-1 overscroll-contain touch-pan-y">
              {renderFilterControls()}
            </div>

            {/* Sticky Action Button - Above mobile navigation with safe area padding */}
            <div className="p-4 pb-[max(1rem,env(safe-area-inset-bottom))] border-t border-slate-100 bg-white shrink-0 shadow-[0_-4px_16px_rgba(0,0,0,0.05)]">
              <button
                type="button"
                onClick={() => setMobileFilterOpen(false)}
                className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 active:scale-[0.98] text-white font-bold text-sm rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center"
              >
                Show {filteredAgencies.length} Travel {filteredAgencies.length === 1 ? 'Agent' : 'Agents'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
