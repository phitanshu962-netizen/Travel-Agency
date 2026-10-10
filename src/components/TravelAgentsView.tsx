'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useModalBackHandler } from '@/hooks/useModalHistory';
import {
  Search,
  MapPin,
  Star,
  Users,
  MessageSquare,
  ShieldCheck,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Briefcase,
  Package as PackageIcon,
  RotateCcw,
  Sparkles,
  Globe,
  Compass,
  HeartHandshake,
  Heart,
  DollarSign,
  Tag,
  Building,
  SlidersHorizontal,
  X,
  Plus,
  Minus,
  ChevronDown
} from 'lucide-react';
import { PackageListing } from '@/lib/discoveryEngine';
import { getDbInstance } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import TravelAgentsRealMap, { MapPinData } from './TravelAgentsRealMap';

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
  verified?: boolean;
  approved?: boolean;
  rating?: number;
  reviewCount?: number;
  experienceYears?: number | string;
  happyTravelersCount?: number | string;
  description?: string;
  bio?: string;
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

// In-memory module cache to persist verified agency users across route transitions with zero latency
let globalAgencyUsersCache: any[] = [];

interface TravelAgentsViewProps {
  listings?: PackageListing[];
  initialAgencies?: any[];
  wishlist?: string[];
  onWishlistToggle?: (id: string, e?: React.MouseEvent) => void;
  onInitiateChat: (data: any) => void;
  onViewAgencyPackages?: (agencyId: string, agencyName: string) => void;
  onViewAgencyProfile?: (agency: AgencyData) => void;
  onViewListing?: (listing: PackageListing) => void;
}

// Canonical State & Regional Hub Coordinates for India (Precise geo-coordinates & zero overlap)
const CITY_COORDINATES: Record<string, { lat: number; lng: number; x: number; y: number; label: string }> = {
  // Jammu & Kashmir Hub
  'kashmir': { lat: 34.0837, lng: 74.7973, x: 28, y: 12, label: 'Kashmir' },
  'srinagar': { lat: 34.0837, lng: 74.7973, x: 28, y: 12, label: 'Kashmir' },
  'gulmarg': { lat: 34.0837, lng: 74.7973, x: 28, y: 12, label: 'Kashmir' },
  'pahalgam': { lat: 34.0837, lng: 74.7973, x: 28, y: 12, label: 'Kashmir' },
  'sonamarg': { lat: 34.0837, lng: 74.7973, x: 28, y: 12, label: 'Kashmir' },

  // Ladakh Hub
  'ladakh': { lat: 34.1800, lng: 77.5800, x: 38, y: 10, label: 'Ladakh' },
  'leh': { lat: 34.1800, lng: 77.5800, x: 38, y: 10, label: 'Ladakh' },
  'nubra': { lat: 34.1800, lng: 77.5800, x: 38, y: 10, label: 'Ladakh' },
  'pangong': { lat: 34.1800, lng: 77.5800, x: 38, y: 10, label: 'Ladakh' },

  // Himachal Pradesh Hub
  'himachal': { lat: 31.9000, lng: 77.1500, x: 35, y: 20, label: 'Himachal' },
  'manali': { lat: 31.9000, lng: 77.1500, x: 35, y: 20, label: 'Himachal' },
  'shimla': { lat: 31.9000, lng: 77.1500, x: 35, y: 20, label: 'Himachal' },
  'kullu': { lat: 31.9000, lng: 77.1500, x: 35, y: 20, label: 'Himachal' },
  'dharamshala': { lat: 31.9000, lng: 77.1500, x: 35, y: 20, label: 'Himachal' },
  'spiti': { lat: 31.9000, lng: 77.1500, x: 35, y: 20, label: 'Himachal' },

  // Uttarakhand Hub
  'uttarakhand': { lat: 30.1500, lng: 78.7000, x: 42, y: 24, label: 'Uttarakhand' },
  'rishikesh': { lat: 30.1500, lng: 78.7000, x: 42, y: 24, label: 'Uttarakhand' },
  'dehradun': { lat: 30.1500, lng: 78.7000, x: 42, y: 24, label: 'Uttarakhand' },
  'nainital': { lat: 30.1500, lng: 78.7000, x: 42, y: 24, label: 'Uttarakhand' },
  'mussoorie': { lat: 30.1500, lng: 78.7000, x: 42, y: 24, label: 'Uttarakhand' },

  // New Delhi / NCR Hub
  'delhi': { lat: 28.6139, lng: 77.2090, x: 37, y: 28, label: 'New Delhi' },
  'new delhi': { lat: 28.6139, lng: 77.2090, x: 37, y: 28, label: 'New Delhi' },
  'ncr': { lat: 28.6139, lng: 77.2090, x: 37, y: 28, label: 'New Delhi' },
  'gurgaon': { lat: 28.6139, lng: 77.2090, x: 37, y: 28, label: 'New Delhi' },
  'noida': { lat: 28.6139, lng: 77.2090, x: 37, y: 28, label: 'New Delhi' },

  // Rajasthan Hub
  'rajasthan': { lat: 26.8000, lng: 74.5000, x: 30, y: 34, label: 'Rajasthan' },
  'jaipur': { lat: 26.8000, lng: 74.5000, x: 30, y: 34, label: 'Rajasthan' },
  'udaipur': { lat: 26.8000, lng: 74.5000, x: 30, y: 34, label: 'Rajasthan' },
  'jodhpur': { lat: 26.8000, lng: 74.5000, x: 30, y: 34, label: 'Rajasthan' },
  'jaisalmer': { lat: 26.8000, lng: 74.5000, x: 30, y: 34, label: 'Rajasthan' },
  'pushkar': { lat: 26.8000, lng: 74.5000, x: 30, y: 34, label: 'Rajasthan' },

  // Goa Hub
  'goa': { lat: 15.3500, lng: 74.0500, x: 28, y: 72, label: 'Goa' },
  'panaji': { lat: 15.3500, lng: 74.0500, x: 28, y: 72, label: 'Goa' },

  // Kerala Hub
  'kerala': { lat: 10.1000, lng: 76.4000, x: 38, y: 88, label: 'Kerala' },
  'kochi': { lat: 10.1000, lng: 76.4000, x: 38, y: 88, label: 'Kerala' },
  'munnar': { lat: 10.1000, lng: 76.4000, x: 38, y: 88, label: 'Kerala' },
  'alleppey': { lat: 10.1000, lng: 76.4000, x: 38, y: 88, label: 'Kerala' },
  'wayanad': { lat: 10.1000, lng: 76.4000, x: 38, y: 88, label: 'Kerala' },

  // Karnataka Hub
  'bengaluru': { lat: 12.9716, lng: 77.5946, x: 42, y: 78, label: 'Karnataka' },
  'bangalore': { lat: 12.9716, lng: 77.5946, x: 42, y: 78, label: 'Karnataka' },
  'karnataka': { lat: 12.9716, lng: 77.5946, x: 42, y: 78, label: 'Karnataka' },

  // Tamil Nadu Hub
  'chennai': { lat: 13.0827, lng: 80.2707, x: 50, y: 76, label: 'Tamil Nadu' },
  'tamil nadu': { lat: 13.0827, lng: 80.2707, x: 50, y: 76, label: 'Tamil Nadu' },

  // Maharashtra Hub
  'mumbai': { lat: 19.0760, lng: 73.2000, x: 24, y: 58, label: 'Maharashtra' },
  'pune': { lat: 19.0760, lng: 73.2000, x: 24, y: 58, label: 'Maharashtra' },
  'maharashtra': { lat: 19.0760, lng: 73.2000, x: 24, y: 58, label: 'Maharashtra' },

  // West Bengal Hub
  'kolkata': { lat: 22.5726, lng: 88.3639, x: 72, y: 46, label: 'West Bengal' },
  'west bengal': { lat: 22.5726, lng: 88.3639, x: 72, y: 46, label: 'West Bengal' },

  // Andaman & Nicobar Hub
  'andaman': { lat: 11.6234, lng: 92.7265, x: 86, y: 82, label: 'Andaman' },
  'port blair': { lat: 11.6234, lng: 92.7265, x: 86, y: 82, label: 'Andaman' },
};

const CATEGORY_TABS = [
  { id: 'all', label: 'All Agents', icon: Users },
  { id: 'india', label: 'India', icon: Building },
  { id: 'international', label: 'International', icon: Globe },
  { id: 'adventure', label: 'Adventure Specialists', icon: Compass },
  { id: 'family', label: 'Family Tour Experts', icon: HeartHandshake },
  { id: 'honeymoon', label: 'Honeymoon Specialists', icon: Sparkles },
];

const POPULAR_DESTINATIONS_FILTER = [
  'Kashmir',
  'Manali',
  'Rajasthan',
  'Kerala',
  'Andaman',
  'Goa',
  'Ladakh',
  'Shimla',
  'Dubai',
  'Bali',
  'Singapore',
  'Thailand',
];

const TRIP_TYPES = [
  'Family Trip',
  'Honeymoon',
  'Group Tour',
  'Adventure',
  'Pilgrimage',
  'Solo Travel',
  'Custom Trip',
];

const RATING_FILTER_OPTIONS = [
  { minRating: 4.5, starsFilled: 5, label: '& above' },
  { minRating: 4.0, starsFilled: 4, label: '& above' },
  { minRating: 3.0, starsFilled: 3, label: '& above' },
];

const DESTINATION_KEYWORDS: Record<string, string[]> = {
  kashmir: ['kashmir', 'srinagar', 'gulmarg', 'pahalgam', 'sonamarg', 'dal lake', 'jammu & kashmir', 'jammu and kashmir', 'j&k', 'yusmarg', 'doodhpathri', 'gurez'],
  manali: ['manali', 'kullu', 'solang', 'rohtang', 'kasol', 'himachal', 'shimla', 'dharamshala', 'dalhousie', 'spiti', 'jibhi', 'tirthan'],
  rajasthan: ['rajasthan', 'jaipur', 'udaipur', 'jodhpur', 'jaisalmer', 'pushkar', 'bikaner', 'mount abu', 'ranthambore', 'chittorgarh', 'ajmer', 'kumbhalgarh'],
  kerala: ['kerala', 'kochi', 'cochin', 'munnar', 'alleppey', 'alappuzha', 'thekkady', 'wayanad', 'kovalam', 'varkala', 'kumarakom', 'poovar', 'athirappilly'],
  andaman: ['andaman', 'port blair', 'havelock', 'neil island', 'swaraj dweep', 'shaheed dweep', 'ross island', 'baratang', 'radhanagar'],
  goa: ['goa', 'north goa', 'south goa', 'panaji', 'calangute', 'baga', 'candolim', 'anjuna', 'vagator', 'colva', 'palolem', 'dudhsagar'],
  ladakh: ['ladakh', 'leh', 'nubra', 'pangong', 'khardung', 'zanskar', 'kargil', 'tso moriri', 'changla', 'magnetic hill', 'hemis'],
  shimla: ['shimla', 'kufri', 'chail', 'mashobra', 'narkanda', 'himachal'],
  dubai: ['dubai', 'abu dhabi', 'sharjah', 'uae', 'emirates', 'burj'],
  bali: ['bali', 'ubud', 'kuta', 'seminyak', 'nusa penida', 'canggu', 'denpasar', 'indonesia'],
  singapore: ['singapore', 'sentosa', 'marinabay'],
  thailand: ['thailand', 'bangkok', 'phuket', 'pattaya', 'krabi', 'koh samui'],
};

function agencyMatchesDestination(agency: AgencyData, targetQuery: string): boolean {
  if (!targetQuery || !targetQuery.trim()) return true;
  const normQuery = targetQuery.trim().toLowerCase();
  const keywords = DESTINATION_KEYWORDS[normQuery] || [normQuery];

  const checkText = (text?: string | null) => {
    if (!text || typeof text !== 'string') return false;
    const lower = text.toLowerCase();
    return keywords.some((kw) => lower.includes(kw));
  };

  // Direct agency properties
  if (checkText(agency.name)) return true;
  if (checkText(agency.companyName)) return true;
  if (checkText(agency.agencyName)) return true;
  if (checkText(agency.city)) return true;
  if (checkText(agency.state)) return true;
  if (checkText(agency.location)) return true;
  if (checkText(agency.description)) return true;

  if (agency.destinations?.some((d) => checkText(d))) return true;
  if (agency.specialties?.some((s) => checkText(s))) return true;
  if (agency.tripTypes?.some((t) => checkText(t))) return true;

  // Check all packages of this agency
  if (Array.isArray(agency.packages)) {
    for (const p of agency.packages) {
      if (checkText(p.title)) return true;
      if (checkText(p.destination)) return true;
      if (checkText(p.city)) return true;
      if (checkText(p.state)) return true;
      if (checkText(p.location)) return true;
      if (checkText(p.overview)) return true;
      if (checkText(p.description)) return true;
      if (Array.isArray(p.destinations) && p.destinations.some((d: any) => checkText(typeof d === 'string' ? d : d?.name))) return true;
      if (Array.isArray(p.placesCovered) && p.placesCovered.some((pl: any) => checkText(typeof pl === 'string' ? pl : pl?.name))) return true;
      if (Array.isArray(p.tourCategories) && p.tourCategories.some((tc: any) => checkText(tc))) return true;
      if (Array.isArray(p.itinerary)) {
        for (const day of p.itinerary) {
          const d = day as any;
          if (checkText(d?.title)) return true;
          if (checkText(d?.description)) return true;
          if (checkText(d?.place)) return true;
          if (checkText(d?.placeName)) return true;
          if (Array.isArray(d?.places) && d.places.some((pl: any) => checkText(typeof pl === 'string' ? pl : pl?.name))) return true;
        }
      }
    }
  }

  return false;
}

function getEffectiveAgencyRating(ag: AgencyData): number {
  if (typeof ag.rating === 'number' && ag.rating > 0) return ag.rating;
  if (Array.isArray(ag.packages) && ag.packages.length > 0) {
    const validRatings = ag.packages
      .map((p: any) => (typeof p.rating === 'number' ? p.rating : parseFloat(p.rating)))
      .filter((r: number) => !isNaN(r) && r > 0);
    if (validRatings.length > 0) {
      return validRatings.reduce((a: number, b: number) => a + b, 0) / validRatings.length;
    }
  }
  return 4.8;
}

// Helper to extract strictly valid image URLs from a listing (NO static placeholders)
function extractImagesFromListing(listing: any): string[] {
  const urls: string[] = [];
  const pushIfValid = (val: any) => {
    if (typeof val === 'string' && val.trim().length > 10 && val.trim().startsWith('http')) {
      const clean = val.trim();
      if (!urls.includes(clean)) {
        urls.push(clean);
      }
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
}

export default function TravelAgentsView({
  listings = [],
  initialAgencies = [],
  wishlist = [],
  onWishlistToggle,
  onInitiateChat,
  onViewAgencyPackages,
  onViewAgencyProfile,
  onViewListing,
}: TravelAgentsViewProps) {
  // Initialize state with SSR initialAgencies or memory/session cache to eliminate 7->18 jumping
  const [firestoreAgencies, setFirestoreAgencies] = useState<any[]>(() => {
    if (initialAgencies && initialAgencies.length > 0) {
      globalAgencyUsersCache = initialAgencies;
      return initialAgencies;
    }
    if (globalAgencyUsersCache.length > 0) {
      return globalAgencyUsersCache;
    }
    if (typeof window !== 'undefined') {
      try {
        const saved = sessionStorage.getItem('tripdm_agency_users_cache');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            globalAgencyUsersCache = parsed;
            return parsed;
          }
        }
      } catch (_) {}
    }
    return [];
  });

  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [destSearchQuery, setDestSearchQuery] = useState('');
  const [selectedDestinations, setSelectedDestinations] = useState<string[]>([]);
  const [selectedTripTypes, setSelectedTripTypes] = useState<string[]>([]);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [selectedRatings, setSelectedRatings] = useState<number[]>([]);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState('relevant');
  const [showMoreDestinations, setShowMoreDestinations] = useState(false);
  const [showMoreTripTypes, setShowMoreTripTypes] = useState(false);
  const [showMap, setShowMap] = useState(true);
  const [mapZoom, setMapZoom] = useState(1);
  const [selectedMapCity, setSelectedMapCity] = useState<string | null>(null);
  const [activePhotoIndexes, setActivePhotoIndexes] = useState<Record<string, number>>({});
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [mobileViewMode, setMobileViewMode] = useState<'list' | 'map'>('list');

  // Handle hardware Back button for mobile filter bottom sheet drawer
  useModalBackHandler(mobileFilterOpen, () => setMobileFilterOpen(false), 'travel_agents_mobile_filter');

  // Sync initialAgencies prop if parent passes updated list
  useEffect(() => {
    if (initialAgencies && initialAgencies.length > 0) {
      globalAgencyUsersCache = initialAgencies;
      setFirestoreAgencies(initialAgencies);
      try {
        sessionStorage.setItem('tripdm_agency_users_cache', JSON.stringify(initialAgencies));
      } catch (_) {}
    }
  }, [initialAgencies]);

  // Fetch registered agencies from Firestore users collection in background to keep data live
  useEffect(() => {
    let isMounted = true;
    async function loadAgencies() {
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
            try {
              sessionStorage.setItem('tripdm_agency_users_cache', JSON.stringify(list));
            } catch (_) {}
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

  // Aggregate and merge all agencies strictly with REAL data
  const allAgencies = useMemo<AgencyData[]>(() => {
    const map = new Map<string, AgencyData>();

    // 1. Populate strictly from registered Firestore agency user profiles
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

      const city = userDoc.city || (userDoc.location?.split(',')[0]?.trim()) || 'New Delhi';
      const state = userDoc.state || (userDoc.location?.split(',')[1]?.trim()) || 'India';
      const country = userDoc.country || 'India';

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
        location: userDoc.location || `${city}, ${state}`,
        verified: userDoc.approved !== false,
        approved: userDoc.approved !== false,
        rating: typeof userDoc.rating === 'number' && userDoc.rating > 0 ? userDoc.rating : undefined,
        reviewCount: typeof userDoc.reviewCount === 'number' && userDoc.reviewCount > 0 ? userDoc.reviewCount : undefined,
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

    // 2. Associate listings with agencies and extract real package images
    listings.forEach((listing: any) => {
      const listingImages = extractImagesFromListing(listing);
      const style = listing.style || listing.tripType || listing.category;
      const listingAgencyId = listing.agencyId || listing.userId;
      const listingAgencyName = listing.agencyName || listing.agencyData?.companyName;

      // Find matching agency
      let agency: AgencyData | undefined;

      if (listingAgencyId) {
        agency = map.get(listingAgencyId);
        if (!agency) {
          for (const [id, ag] of map.entries()) {
            if (id.toLowerCase() === String(listingAgencyId).toLowerCase()) {
              agency = ag;
              break;
            }
          }
        }
      }

      if (!agency && listingAgencyName) {
        const nameToMatch = listingAgencyName.trim().toLowerCase();
        if (
          nameToMatch &&
          !['travel agency', 'verified agency', 'verified travel agency', 'unknown agency', 'admin', 'unknown'].includes(nameToMatch)
        ) {
          for (const ag of map.values()) {
            const agName = ag.name?.trim().toLowerCase();
            const agCompany = ag.companyName?.trim().toLowerCase();
            const agAgencyName = ag.agencyName?.trim().toLowerCase();
            if (
              agName === nameToMatch ||
              agCompany === nameToMatch ||
              agAgencyName === nameToMatch ||
              (agName && nameToMatch.includes(agName)) ||
              (agCompany && nameToMatch.includes(agCompany))
            ) {
              agency = ag;
              break;
            }
          }
        }
      }

      // If registered agencies exist, never create a ghost 12th agency from unmatched/admin listing
      if (!agency) {
        if (hasRegisteredAgencies) {
          return;
        }
        const fallbackId = listingAgencyId || `agency_${(listingAgencyName || 'unknown').toLowerCase().replace(/\s+/g, '_')}`;
        const name = listingAgencyName || 'Verified Travel Agency';
        const logo = listing.agencyLogo || listing.agencyData?.logoUrl || listing.agencyData?.avatarUrl || null;
        const city = listing.agencyData?.city || listing.city || (listing.destination?.split(',')[0]?.trim()) || 'India';
        const state = listing.agencyData?.state || listing.state || 'India';

        agency = {
          id: fallbackId,
          name,
          companyName: listingAgencyName,
          agencyName: listingAgencyName,
          logoUrl: logo,
          city,
          state,
          country: 'India',
          location: listing.agencyData?.location || (city ? `${city}, India` : 'India'),
          verified: true,
          approved: true,
          rating: typeof listing.rating === 'number' && listing.rating > 0 ? listing.rating : undefined,
          reviewCount: typeof listing.reviewsCount === 'number' && listing.reviewsCount > 0 ? listing.reviewsCount : undefined,
          experienceYears: listing.agencyData?.experienceYears || undefined,
          happyTravelersCount: undefined,
          description: listing.agencyData?.description || '',
          specialties: [],
          destinations: [],
          tripTypes: [],
          languages: ['English', 'Hindi'],
          packageImages: [],
          packageCount: 0,
          packages: [],
          featured: !!listing.isFeatured,
        };
        map.set(fallbackId, agency);
      }

      // Add listing to agency's package list
      agency.packages = agency.packages || [];
      agency.packages.push(listing);
      agency.packageCount = (agency.packageCount || 0) + 1;

      // Add real package images strictly from this agency's listing
      agency.packageImages = agency.packageImages || [];
      listingImages.forEach((img) => {
        if (!agency!.packageImages!.includes(img)) {
          agency!.packageImages!.push(img);
        }
      });

      // Collect real destinations from listing
      agency.destinations = agency.destinations || [];
      const addDestItem = (raw: any) => {
        if (!raw || typeof raw !== 'string') return;
        raw.split(/[,/&-]/).forEach((part) => {
          const clean = part.trim();
          if (
            clean &&
            clean.length > 2 &&
            !['india', 'tour', 'tours', 'package', 'packages', 'trip', 'trips', 'holidays', 'holiday'].includes(clean.toLowerCase()) &&
            !agency!.destinations!.some((d) => d.toLowerCase() === clean.toLowerCase())
          ) {
            agency!.destinations!.push(clean);
          }
        });
      };

      if (listing.destination) addDestItem(listing.destination);
      if (listing.city) addDestItem(listing.city);
      if (listing.state) addDestItem(listing.state);
      if (listing.location) addDestItem(listing.location);
      if (Array.isArray(listing.destinations)) {
        listing.destinations.forEach((d: any) => addDestItem(typeof d === 'string' ? d : d?.name));
      }
      if (Array.isArray(listing.placesCovered)) {
        listing.placesCovered.forEach((pl: any) => addDestItem(typeof pl === 'string' ? pl : pl?.name));
      }
      Object.keys(DESTINATION_KEYWORDS).forEach((key) => {
        if (listing.title && typeof listing.title === 'string' && listing.title.toLowerCase().includes(key)) {
          const formatted = key.charAt(0).toUpperCase() + key.slice(1);
          if (!agency!.destinations!.some((d) => d.toLowerCase() === formatted.toLowerCase())) {
            agency!.destinations!.push(formatted);
          }
        }
      });

      // Collect real trip types & specialties from packages
      if (style) {
        agency.tripTypes = agency.tripTypes || [];
        if (!agency.tripTypes.includes(style)) {
          agency.tripTypes.push(style);
        }
      }

      if (Array.isArray(listing.tourCategories)) {
        agency.specialties = agency.specialties || [];
        listing.tourCategories.forEach((cat: string) => {
          if (
            cat &&
            !cat.toLowerCase().includes('fix departure') &&
            !cat.toLowerCase().includes('fixed departure') &&
            !agency!.specialties!.includes(cat)
          ) {
            agency!.specialties!.push(cat);
          }
        });
      }
    });

    // Also ensure agencies with destination in their name get that destination tag
    Array.from(map.values()).forEach((ag) => {
      const dests = ag.destinations || [];
      ag.destinations = dests;
      Object.keys(DESTINATION_KEYWORDS).forEach((key) => {
        const matchesName =
          (ag.name && ag.name.toLowerCase().includes(key)) ||
          (ag.companyName && ag.companyName.toLowerCase().includes(key)) ||
          (ag.agencyName && ag.agencyName.toLowerCase().includes(key));
        if (matchesName) {
          const formatted = key.charAt(0).toUpperCase() + key.slice(1);
          if (!dests.some((d) => d.toLowerCase() === formatted.toLowerCase())) {
            dests.push(formatted);
          }
        }
      });
    });

    return Array.from(map.values());
  }, [firestoreAgencies, listings]);

  // Extract all dynamic destination hubs & agency cities in TripDM for the real map
  const mapPins = useMemo<MapPinData[]>(() => {
    const cityMap: Record<string, MapPinData & { agencies: AgencyData[] }> = {};

    allAgencies.forEach((ag) => {
      // Gather all locations where this agency operates or has packages
      const places = new Set<string>();
      if (ag.city) places.add(ag.city.trim());
      if (ag.location) {
        const locCity = ag.location.split(',')[0].trim();
        if (locCity) places.add(locCity);
      }
      if (Array.isArray(ag.destinations)) {
        ag.destinations.forEach((d) => {
          if (d && typeof d === 'string') {
            places.add(d.split(',')[0].trim());
          }
        });
      }

      // Add each package's destination
      if (Array.isArray(ag.packages)) {
        ag.packages.forEach((pkg: any) => {
          if (pkg.destination) places.add(pkg.destination.split(',')[0].trim());
          if (pkg.city) places.add(pkg.city.split(',')[0].trim());
          if (pkg.stateName) places.add(pkg.stateName.split(',')[0].trim());
        });
      }

      places.forEach((place) => {
        const cleanPlace = place.toLowerCase().trim();
        const matchedKey = Object.keys(CITY_COORDINATES).find(
          (k) => cleanPlace.includes(k) || k.includes(cleanPlace)
        );

        if (matchedKey) {
          const coord = CITY_COORDINATES[matchedKey];
          const label = coord.label;

          if (!cityMap[label]) {
            cityMap[label] = {
              city: label,
              count: 0,
              lat: coord.lat,
              lng: coord.lng,
              agencies: [],
            };
          }
          if (!cityMap[label].agencies.some((a) => a.id === ag.id)) {
            cityMap[label].count += 1;
            cityMap[label].agencies.push(ag);
          }
        }
      });
    });

    return Object.values(cityMap).map(({ city, count, lat, lng }) => ({
      city,
      count,
      lat,
      lng,
    }));
  }, [allAgencies]);

  // Extract top destinations by agency counts with real photos from listings
  const topDestinationsByAgents = useMemo(() => {
    const counts: Record<string, { count: number; image?: string }> = {};

    allAgencies.forEach((ag) => {
      const dests = ag.destinations && ag.destinations.length > 0 ? ag.destinations : [ag.city || 'India'];
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
  }, [allAgencies]);

  // Destination filter options (compact initial count for single-page viewport fit)
  const destinationOptions = useMemo(() => {
    const availableDests = new Set<string>();
    POPULAR_DESTINATIONS_FILTER.forEach((d) => availableDests.add(d));
    allAgencies.forEach((ag) => {
      ag.destinations?.forEach((d) => availableDests.add(d));
    });

    const fullList = Array.from(availableDests);
    if (destSearchQuery.trim()) {
      return fullList.filter((d) => d.toLowerCase().includes(destSearchQuery.toLowerCase()));
    }
    return showMoreDestinations ? fullList : fullList.slice(0, 4);
  }, [allAgencies, showMoreDestinations, destSearchQuery]);

  // Trip Type filter options (compact initial count)
  const visibleTripTypes = useMemo(() => {
    return showMoreTripTypes ? TRIP_TYPES : TRIP_TYPES.slice(0, 4);
  }, [showMoreTripTypes]);

  // Filtering Logic
  const filteredAgencies = useMemo(() => {
    return allAgencies.filter((ag) => {
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = ag.name.toLowerCase().includes(q);
        const matchesLoc = ag.location?.toLowerCase().includes(q) || ag.city?.toLowerCase().includes(q);
        const matchesDest = ag.destinations?.some((d) => d.toLowerCase().includes(q));
        const matchesSpec = ag.specialties?.some((s) => s.toLowerCase().includes(q));
        const matchesDesc = ag.description?.toLowerCase().includes(q);
        if (!matchesName && !matchesLoc && !matchesDest && !matchesSpec && !matchesDesc) {
          return false;
        }
      }

      // Category tab
      if (activeTab === 'india') {
        const isIndia = ag.country?.toLowerCase() === 'india' || !ag.country || ag.destinations?.some((d) => !['dubai', 'singapore', 'bali', 'thailand', 'vietnam'].includes(d.toLowerCase()));
        if (!isIndia) return false;
      } else if (activeTab === 'international') {
        const isIntl = ag.specialties?.some((s) => s.toLowerCase().includes('international')) || ag.destinations?.some((d) => ['dubai', 'singapore', 'bali', 'thailand', 'vietnam', 'europe', 'maldives'].includes(d.toLowerCase()));
        if (!isIntl) return false;
      } else if (activeTab === 'adventure') {
        const isAdv = ag.specialties?.some((s) => s.toLowerCase().includes('adventure') || s.toLowerCase().includes('trek')) || ag.tripTypes?.some((t) => t.toLowerCase().includes('adventure'));
        if (!isAdv) return false;
      } else if (activeTab === 'family') {
        const isFam = ag.specialties?.some((s) => s.toLowerCase().includes('family')) || ag.tripTypes?.some((t) => t.toLowerCase().includes('family'));
        if (!isFam) return false;
      } else if (activeTab === 'honeymoon') {
        const isHoney = ag.specialties?.some((s) => s.toLowerCase().includes('honeymoon')) || ag.tripTypes?.some((t) => t.toLowerCase().includes('honeymoon'));
        if (!isHoney) return false;
      } else if (activeTab === 'budget') {
        const isBudget = ag.specialties?.some((s) => s.toLowerCase().includes('budget') || s.toLowerCase().includes('best rates'));
        if (!isBudget) return false;
      }

      // Selected Destinations Checkboxes
      if (selectedDestinations.length > 0) {
        const matchesSelectedDest = selectedDestinations.some((sd) =>
          agencyMatchesDestination(ag, sd)
        );
        if (!matchesSelectedDest) return false;
      }

      // Selected Trip Types Checkboxes
      if (selectedTripTypes.length > 0) {
        const matchesTripType = selectedTripTypes.some((st) =>
          ag.tripTypes?.some((t) => t.toLowerCase().includes(st.toLowerCase())) ||
          ag.specialties?.some((s) => s.toLowerCase().includes(st.toLowerCase()))
        );
        if (!matchesTripType) return false;
      }

      // Selected Agent Location
      if (selectedLocations.length > 0) {
        const matchesLoc = selectedLocations.some((loc) => {
          if (loc === 'India') return ag.country?.toLowerCase() === 'india' || !ag.country;
          if (loc === 'International') return ag.country?.toLowerCase() !== 'india';
          return true;
        });
        if (!matchesLoc) return false;
      }

      // Selected Rating Checkboxes
      if (selectedRatings.length > 0) {
        const agRating = getEffectiveAgencyRating(ag);
        const minReq = Math.min(...selectedRatings);
        if (agRating < minReq) return false;
      }

      // Selected Language
      if (selectedLanguages.length > 0) {
        const matchesLang = selectedLanguages.some((lang) =>
          ag.languages?.some((l) => l.toLowerCase().includes(lang.toLowerCase()))
        );
        if (!matchesLang) return false;
      }

      // Map City Filter
      if (selectedMapCity) {
        const qCity = selectedMapCity.toLowerCase();
        const matchesMapCity =
          ag.city?.toLowerCase().includes(qCity) ||
          ag.location?.toLowerCase().includes(qCity) ||
          ag.destinations?.some((d) => d.toLowerCase().includes(qCity)) ||
          ag.packages?.some((p) => p.destination?.toLowerCase().includes(qCity) || p.city?.toLowerCase().includes(qCity));
        if (!matchesMapCity) return false;
      }

      return true;
    }).sort((a, b) => {
      // 1. Visually complete agencies with tour photos come first
      const aHasImages = (a.packageImages && a.packageImages.length > 0) ? 1 : 0;
      const bHasImages = (b.packageImages && b.packageImages.length > 0) ? 1 : 0;
      if (aHasImages !== bHasImages) {
        return bHasImages - aHasImages;
      }

      if (sortBy === 'packages') return (b.packageCount || 0) - (a.packageCount || 0);
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'rating') return (b.rating || 0) - (a.rating || 0);
      // Most Relevant (Featured first, then packages count)
      if (a.featured && !b.featured) return -1;
      if (!a.featured && b.featured) return 1;
      return (b.packageCount || 0) - (a.packageCount || 0);
    });
  }, [
    allAgencies,
    searchQuery,
    activeTab,
    selectedDestinations,
    selectedTripTypes,
    selectedLocations,
    selectedRatings,
    selectedLanguages,
    selectedMapCity,
    sortBy,
  ]);

  // Reset all filters
  const handleResetFilters = () => {
    setSelectedDestinations([]);
    setSelectedTripTypes([]);
    setSelectedLocations([]);
    setSelectedRatings([]);
    setSelectedLanguages([]);
    setSearchQuery('');
    setDestSearchQuery('');
    setActiveTab('all');
    setSelectedMapCity(null);
    setSortBy('relevant');
  };

  // Toggle checkbox helper
  const toggleSelection = (item: string, list: string[], setList: (l: string[]) => void) => {
    if (list.includes(item)) {
      setList(list.filter((i) => i !== item));
    } else {
      setList([...list, item]);
    }
  };

  // Photo carousel navigation
  const handlePrevPhoto = (agencyId: string, max: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setActivePhotoIndexes((prev) => {
      const cur = prev[agencyId] || 0;
      return { ...prev, [agencyId]: cur === 0 ? max - 1 : cur - 1 };
    });
  };

  const handleNextPhoto = (agencyId: string, max: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setActivePhotoIndexes((prev) => {
      const cur = prev[agencyId] || 0;
      return { ...prev, [agencyId]: cur === max - 1 ? 0 : cur + 1 };
    });
  };

  const activeFiltersCount =
    selectedDestinations.length +
    selectedTripTypes.length +
    selectedLocations.length +
    selectedRatings.length +
    selectedLanguages.length +
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
        {POPULAR_DESTINATIONS_FILTER.length > 4 && !destSearchQuery && (
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
      <div className="pt-1.5">
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

  return (
    <div className="w-full bg-white text-slate-900 min-h-screen">
      {/* ─── 1. TOP HERO SECTION FOR TRAVEL AGENTS (Clean layout with centered search) ─── */}
      <div className="relative w-full bg-white border-b border-slate-100 pt-6 sm:pt-8 pb-7 overflow-hidden">
        {/* Background Banner Image on the right side with seamless smooth fade to white */}
        <div
          className="absolute inset-y-0 right-0 w-full sm:w-[85%] md:w-[70%] lg:w-[60%] bg-cover bg-no-repeat bg-right pointer-events-none"
          style={{
            backgroundImage: "url('/travel-agents-hero-banner.jpg')",
            maskImage: 'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.15) 20%, rgba(0,0,0,0.7) 45%, black 100%)',
            WebkitMaskImage: 'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.15) 20%, rgba(0,0,0,0.7) 45%, black 100%)',
          }}
        >
          {/* Subtle bottom fade to seamlessly blend with the page */}
          <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent pointer-events-none opacity-80" />
        </div>

        <div className="relative z-10 w-full max-w-[1720px] mx-auto px-6 sm:px-10 lg:px-14 xl:px-20">
          {/* Top Row: Left Title & Right Sticker Text */}
          <div className="relative flex flex-col md:flex-row items-start justify-between min-h-[110px]">
            <div className="max-w-xl pl-2 sm:pl-4 lg:pl-6 z-10">
              {/* Main Headline */}
              <h1 className="text-3xl sm:text-4xl md:text-[40px] lg:text-[44px] font-black text-slate-900 tracking-tight leading-none">
                Travel Agents
              </h1>

              {/* Tagline: Orange Verified Travel Agents + Slate Directly on TripDM */}
              <h2 className="text-base sm:text-lg md:text-xl font-bold mt-2 leading-tight">
                <span className="text-[#FF5500]">Verified Travel Agents.</span>{' '}
                <span className="text-slate-900">Directly on TripDM.</span>
              </h2>

              {/* Description Subtitle */}
              <p className="text-xs sm:text-sm text-slate-600 font-normal leading-relaxed mt-2 max-w-lg">
                Discover and connect with verified travel agencies across India and worldwide. Chat, compare and customize your trip — with no commission on package price.
              </p>
            </div>

            {/* Stylish Handwritten Sticker Badge in Sky next to Mountain View */}
            <div className="hidden lg:flex flex-col items-start select-none pointer-events-none transform -rotate-3 mt-2 mr-36 xl:mr-56">
              <span className="text-xs sm:text-[13px] font-bold text-slate-800 font-serif italic tracking-tight drop-shadow-2xs">
                Multiple Travel Agents.
              </span>
              <span className="text-xs sm:text-[13px] font-bold text-slate-800 font-serif italic tracking-tight drop-shadow-2xs">
                More Options.
              </span>
              <span className="text-xs sm:text-[13px] font-extrabold text-[#FF5500] font-serif italic tracking-tight drop-shadow-2xs flex items-center gap-1">
                Your Perfect Trip.
                <svg className="w-3.5 h-3.5 text-[#FF5500] transform rotate-12 inline-block" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </div>
          </div>

          {/* Middle Row: Standard Centered Search Bar */}
          <div className="mt-4 sm:mt-5 max-w-xl mx-auto relative z-20">
            <form
              onSubmit={(e) => e.preventDefault()}
              className="bg-white/95 backdrop-blur-sm p-1 sm:p-1.5 shadow-sm border border-slate-200/90 flex items-center gap-1.5"
              style={{ borderRadius: '6px' }}
            >
              <div className="flex-1 flex items-center pl-2.5 sm:pl-3">
                <Search className="h-4 w-4 text-slate-400 shrink-0 mr-2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search travel agents (e.g. Kashmir, Bali, Adventure...)"
                  className="w-full bg-transparent text-xs sm:text-[13px] text-slate-900 placeholder:text-slate-400 focus:outline-none font-medium"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer mr-1"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <button
                type="submit"
                className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 active:scale-95 text-white font-bold px-4 sm:px-5 py-2 text-xs sm:text-[13px] shadow-xs transition-all cursor-pointer shrink-0 border border-amber-400/50"
                style={{ borderRadius: '6px' }}
              >
                Search Agents
              </button>
            </form>
          </div>

          {/* Bottom Row: Category Nav Buttons (Direct on banner - No outer container box) */}
          <div className="mt-6 w-full flex items-center justify-center">
            <div className="flex flex-wrap gap-2 sm:gap-2.5 items-center justify-center px-1 max-w-full">
              {CATEGORY_TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
                      isActive
                        ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-sm shadow-amber-500/20 border border-amber-400/50'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300 shadow-2xs'
                    }`}
                    style={{ borderRadius: '6px' }}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ─── 2. MAIN 3-COLUMN CONTENT SECTION (Widescreen Full Layout) ─── */}
      <div className="w-full max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
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

          {/* ══════════════════════════════════════════════════════════════════
              CENTER COLUMN: TRAVEL AGENTS LIST (Larger, Spacious Focus)
             ══════════════════════════════════════════════════════════════════ */}
          <main className="lg:col-span-6 xl:col-span-7 space-y-4 pb-24 lg:pb-0">
            {/* Center Header: Count + Sort Dropdown (Clean typography on page background) */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 mb-2 border-b border-slate-200">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  {filteredAgencies.length} Verified Travel {filteredAgencies.length === 1 ? 'Agent' : 'Agents'}
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5 font-normal">
                  Connect directly with trusted travel agencies and get the best travel experiences.
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
                    <option value="relevant">Most Relevant</option>
                    <option value="packages">Most Packages</option>
                    <option value="name">Agency Name</option>
                  </select>
                  <ChevronDown className="h-3.5 w-3.5 text-slate-400 pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>
            </div>

            {/* Active City Filter Tag (if user clicked a map pin) */}
            {selectedMapCity && (
              <div
                className="bg-orange-50 border border-orange-200 px-3 py-2 flex items-center justify-between text-xs text-orange-900 font-semibold"
                style={{ borderRadius: '6px' }}
              >
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-[#FF5500]" />
                  <span>Filtered by city/region: <strong>{selectedMapCity}</strong></span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedMapCity(null)}
                  className="text-orange-700 hover:text-orange-900 font-bold underline cursor-pointer"
                >
                  Clear city
                </button>
              </div>
            )}

            {/* Mobile View: Real Map Component when user switches to Map mode */}
            {mobileViewMode === 'map' && (
              <div className="lg:hidden w-full bg-white rounded-xl border border-slate-200 p-2 shadow-xs mb-4">
                <div className="flex items-center justify-between px-2 py-1.5 mb-1.5 border-b border-slate-100">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#FF5500]" />
                    Agents on Map
                  </span>
                  <button
                    type="button"
                    onClick={() => setMobileViewMode('list')}
                    className="text-xs font-bold text-orange-600 hover:underline cursor-pointer"
                  >
                    Switch to List View →
                  </button>
                </div>
                <TravelAgentsRealMap
                  pins={mapPins}
                  selectedCity={selectedMapCity}
                  onSelectCity={setSelectedMapCity}
                />
              </div>
            )}

            {/* Travel Agency Cards List (hidden on mobile if user explicitly switched to Map mode) */}
            <div className={mobileViewMode === 'map' ? 'hidden lg:block space-y-4' : 'space-y-4'}>
            {filteredAgencies.length === 0 ? (
              <div
                className="bg-white p-8 border border-slate-200 text-center"
                style={{ borderRadius: '8px' }}
              >
                <Users className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                <h3 className="text-sm font-bold text-slate-800">No travel agents match your filters</h3>
                <p className="text-xs text-slate-500 mt-1">Try resetting some of your filters or search keywords.</p>
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="mt-3 px-4 py-1.5 bg-[#FF5500] text-white font-bold text-xs hover:bg-[#E04B00] transition-colors cursor-pointer"
                  style={{ borderRadius: '6px' }}
                >
                  Reset All Filters
                </button>
              </div>
            ) : (
              filteredAgencies.map((agency) => {
                const photoIndex = activePhotoIndexes[agency.id] || 0;
                const images = agency.packageImages || [];
                const hasImages = images.length > 0;
                const currentImg = hasImages ? (images[photoIndex] || images[0]) : null;

                return (
                  <div
                    key={agency.id}
                    className="relative group flex flex-col md:flex-row pb-6 sm:pb-7 gap-5 sm:gap-6 items-stretch border-b border-slate-200 last:border-b-0 last:pb-0"
                  >
                    {/* Left: Real Package Photos from this Agency (Standardized uniform aspect ratio) */}
                    <div
                      className="relative w-full md:w-64 xl:w-72 h-52 sm:h-56 md:h-[220px] max-h-[220px] overflow-hidden shrink-0 bg-slate-100 flex items-center justify-center border border-slate-100 shadow-2xs"
                      style={{ borderRadius: '6px' }}
                    >
                      {hasImages && currentImg ? (
                        <>
                          <img
                            src={currentImg}
                            alt={`${agency.name} tour package`}
                            className="w-full h-full object-cover object-center transition-transform duration-300 group-hover:scale-105"
                          />

                          {/* Featured Badge */}
                          {agency.featured && (
                            <div
                              className="absolute top-2 left-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-bold px-2 py-0.5 shadow-xs"
                              style={{ borderRadius: '4px' }}
                            >
                              <Sparkles className="h-2.5 w-2.5" />
                              <span>Featured</span>
                            </div>
                          )}

                          {/* Photo Count Badge */}
                          <div
                            className="absolute bottom-2 left-2 bg-slate-900/80 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5"
                            style={{ borderRadius: '4px' }}
                          >
                            {images.length} {images.length === 1 ? 'photo' : 'photos'}
                          </div>

                          {/* Carousel Arrow Buttons (if multiple package photos) */}
                          {images.length > 1 && (
                            <>
                              <button
                                type="button"
                                onClick={(e) => handlePrevPhoto(agency.id, images.length, e)}
                                className="absolute left-1.5 top-1/2 -translate-y-1/2 w-6 h-6 bg-slate-900/60 hover:bg-slate-900/90 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                style={{ borderRadius: '4px' }}
                                aria-label="Previous photo"
                              >
                                <ChevronLeft className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => handleNextPhoto(agency.id, images.length, e)}
                                className="absolute right-1.5 top-1/2 -translate-y-1/2 w-6 h-6 bg-slate-900/60 hover:bg-slate-900/90 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                style={{ borderRadius: '4px' }}
                                aria-label="Next photo"
                              >
                                <ChevronRight className="h-3.5 w-3.5" />
                              </button>
                            </>
                          )}
                        </>
                      ) : (
                        /* Clean modern agency fallback badge */
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
                    </div>

                    {/* Right: Agency Details & TripDM Action Buttons */}
                    <div className="flex-1 flex flex-col justify-between min-w-0 py-0.5">
                      <div>
                        {/* Row 1: Agency Logo & Name + Status Badge */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                          <div
                            className="flex items-center gap-3.5 min-w-0 cursor-pointer"
                            onClick={() => {
                              if (onViewAgencyProfile) onViewAgencyProfile(agency);
                            }}
                          >
                            {/* Company Logo Display (Properly sized container for wide & rectangular logos) */}
                            {agency.logoUrl ? (
                              <div
                                className="h-12 min-w-[50px] max-w-[150px] px-2.5 py-1 bg-white border border-slate-200 flex items-center justify-center shrink-0 shadow-2xs"
                                style={{ borderRadius: '6px' }}
                              >
                                <img
                                  src={agency.logoUrl}
                                  alt={agency.name}
                                  className="max-h-10 max-w-full object-contain"
                                />
                              </div>
                            ) : (
                              <div
                                className="w-12 h-12 bg-orange-50 border border-orange-200 text-[#FF5500] font-black text-lg flex items-center justify-center shrink-0 shadow-2xs"
                                style={{ borderRadius: '6px' }}
                              >
                                {agency.name.charAt(0).toUpperCase()}
                              </div>
                            )}

                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <h3 className="text-base sm:text-lg font-black text-slate-900 truncate">
                                  {agency.name}
                                </h3>
                                {agency.verified && (
                                  <CheckCircle2 className="h-4 w-4 text-emerald-500 fill-emerald-100 shrink-0" />
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 text-slate-500 text-xs mt-0.5">
                                <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                <span className="truncate font-medium">{agency.location || `${agency.city || 'India'}, India`}</span>
                              </div>
                            </div>
                          </div>

                          {/* Real Rating Badge OR Verified Partner Badge (Zero fake ratings) */}
                          {agency.rating && agency.rating > 0 ? (
                            <div
                              className="flex items-center gap-1.5 shrink-0 bg-amber-50 border border-amber-200 px-2.5 py-1 shadow-2xs"
                              style={{ borderRadius: '6px' }}
                            >
                              <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                              <span className="text-xs sm:text-sm font-bold text-slate-900">
                                {Number(agency.rating).toFixed(1)}
                              </span>
                              {agency.reviewCount ? (
                                <span className="text-xs text-slate-500 font-medium">
                                  ({agency.reviewCount})
                                </span>
                              ) : null}
                            </div>
                          ) : agency.verified ? (
                            <div
                              className="flex items-center gap-1.5 shrink-0 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold px-2.5 py-1 shadow-2xs"
                              style={{ borderRadius: '6px' }}
                            >
                              <ShieldCheck className="h-4 w-4 text-emerald-600" />
                              <span>Verified Partner</span>
                            </div>
                          ) : null}
                        </div>

                        {/* Specialty Tags (Theme pills only) */}
                        {agency.specialties && agency.specialties.filter((s) => !s.toLowerCase().includes('fix departure') && !s.toLowerCase().includes('fixed departure')).length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {agency.specialties
                              .filter((s) => !s.toLowerCase().includes('fix departure') && !s.toLowerCase().includes('fixed departure'))
                              .slice(0, 5)
                              .map((spec, i) => (
                                <span
                                  key={i}
                                  className="px-2.5 py-1 text-[11px] sm:text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200/60"
                                  style={{ borderRadius: '4px' }}
                                >
                                  {spec}
                                </span>
                              ))}
                          </div>
                        )}

                        {/* Real Stats Row */}
                        <div className="mt-3 flex flex-wrap items-center gap-5 py-2.5 border-t border-b border-slate-100 text-xs sm:text-[13px] text-slate-600">
                          <div className="flex items-center gap-1.5">
                            <PackageIcon className="h-4 w-4 text-[#FF5500] shrink-0" />
                            <span className="font-bold text-slate-900">
                              {agency.packageCount || 0} {agency.packageCount === 1 ? 'Package Listed' : 'Packages Listed'}
                            </span>
                          </div>

                          {agency.experienceYears ? (
                            <div className="flex items-center gap-1.5">
                              <Briefcase className="h-4 w-4 text-[#FF5500] shrink-0" />
                              <span className="font-medium text-slate-700">
                                {agency.experienceYears} Years Exp
                              </span>
                            </div>
                          ) : null}
                        </div>

                        {/* Description (Only shown if real bio exists) */}
                        {agency.description ? (
                          <p className="mt-2.5 text-xs sm:text-[13px] text-slate-600 line-clamp-2 leading-relaxed font-normal">
                            {agency.description}
                          </p>
                        ) : null}
                      </div>

                      {/* Bottom: Rectangle Action Buttons */}
                      <div className="mt-4 pt-2 flex items-center justify-end gap-2.5">
                        {/* Wishlist Toggle Button */}
                        {onWishlistToggle && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onWishlistToggle(agency.id, e);
                              const pkgIds = (agency.packages || []).map((p: any) => p.id);
                              pkgIds.forEach((pid: string) => {
                                if (wishlist.includes(pid)) onWishlistToggle(pid, e);
                              });
                            }}
                            className={`p-2.5 transition-all cursor-pointer shadow-2xs flex items-center justify-center border ${
                              wishlist.includes(agency.id) || agency.packages?.some((p: any) => wishlist.includes(p.id))
                                ? 'bg-rose-50 border-rose-200 text-rose-600'
                                : 'bg-white/80 border-slate-200/80 text-slate-500 hover:text-rose-600 hover:border-rose-200'
                            }`}
                            style={{ borderRadius: '6px' }}
                            title={wishlist.includes(agency.id) || agency.packages?.some((p: any) => wishlist.includes(p.id)) ? "Saved in Wishlist" : "Save to Wishlist"}
                          >
                            <Heart className={`h-4 w-4 ${wishlist.includes(agency.id) || agency.packages?.some((p: any) => wishlist.includes(p.id)) ? 'fill-rose-600 text-rose-600' : 'text-slate-500 hover:text-rose-600'}`} />
                          </button>
                        )}

                        {/* Button 1: Chat with Agent (Primary Rectangular Button) */}
                        <button
                          type="button"
                          onClick={() => {
                            const firstPkg = agency.packages?.[0];
                            onInitiateChat({
                              agencyId: agency.id,
                              agencyName: agency.name,
                              ...(firstPkg || {}),
                              id: firstPkg?.id,
                              title: firstPkg?.title,
                              duration: firstPkg?.duration ? String(firstPkg.duration) : undefined,
                              price: firstPkg?.price,
                            });
                          }}
                          className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 active:scale-95 text-white font-bold py-2.5 px-6 text-xs sm:text-sm shadow-md shadow-amber-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer border border-amber-400/50"
                          style={{ borderRadius: '6px' }}
                        >
                          <MessageSquare className="h-4 w-4" />
                          <span>Chat with Agent</span>
                        </button>

                        {/* Button 2: View Profile / Packages (Secondary Rectangular Button) */}
                        <button
                          type="button"
                          onClick={() => {
                            if (onViewAgencyProfile) {
                              onViewAgencyProfile(agency);
                            } else if (onViewAgencyPackages) {
                              onViewAgencyPackages(agency.id, agency.name);
                            } else if (agency.packages && agency.packages.length > 0 && onViewListing) {
                              onViewListing(agency.packages[0]);
                            }
                          }}
                          className="bg-white/80 border border-slate-200/80 hover:bg-white hover:border-orange-500 hover:text-orange-600 text-slate-700 font-bold py-2.5 px-6 text-xs sm:text-sm transition-all cursor-pointer shadow-2xs"
                          style={{ borderRadius: '6px' }}
                        >
                          <span>View Profile</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            </div>
          </main>

          {/* ══════════════════════════════════════════════════════════════════
              RIGHT SIDEBAR: MAP & TOP DESTINATIONS (Single Page View - Compact & Sticky)
             ══════════════════════════════════════════════════════════════════ */}
          <aside className="hidden lg:block lg:col-span-3 space-y-4 lg:sticky lg:top-20 max-h-[calc(100vh-6.5rem)] overflow-y-auto scrollbar-hide border-none shadow-none">
            {/* 1. REAL DYNAMIC TRAVEL AGENTS MAP WIDGET */}
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

              {/* Real Leaflet Map Component with OpenStreetMap Tiles & Real Dynamic Pins */}
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

            {/* 3. WHY BOOK WITH TRAVEL AGENTS ON TRIPDM? (Direct on page with clean separator) */}
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
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity duration-200"
            onClick={() => setMobileFilterOpen(false)}
          />

          {/* Bottom Sheet Modal */}
          <div className="relative z-10 bg-white rounded-t-2xl shadow-2xl max-h-[85vh] flex flex-col animate-in slide-in-from-bottom duration-200 border-t border-slate-200">
            {/* Drag Pill */}
            <div className="w-full flex items-center justify-center pt-2.5 pb-1">
              <div className="w-10 h-1 rounded-full bg-slate-300" />
            </div>

            {/* Header */}
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
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
            <div className="p-4 overflow-y-auto space-y-3 flex-1">
              {renderFilterControls()}
            </div>

            {/* Sticky Action Button */}
            <div className="p-4 border-t border-slate-100 bg-white">
              <button
                type="button"
                onClick={() => setMobileFilterOpen(false)}
                className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-sm rounded-xl shadow-md transition-all active:scale-[0.98] cursor-pointer"
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
