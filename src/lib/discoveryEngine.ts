/**
 * Discovery & Merchandising Engine for Travel Marketplace
 * Uses strictly real package fields existing in the codebase schema.
 * Zero hardcoded package IDs, zero fake counts, zero fake data signals.
 */

export interface PackageListing {
  id: string;
  title: string;
  description?: string;
  cost?: string | number;
  price?: string | number;
  duration?: string | number;
  destination?: string;
  packageType?: 'international' | 'domestic';
  countryName?: string;
  stateName?: string;
  countryNames?: string[];
  stateNames?: string[];
  pickUpLocation?: string;
  dropLocation?: string;
  placesCovered?: Array<{ name?: string; imageUrls?: string[]; image?: string }>;
  tourCategories?: string[];
  hotelTypes?: string[] | string;
  mealPlan?: string[] | string;
  itinerary?: Array<{ dayNumber?: number; title?: string; placeName?: string; imageUrl?: string; imageUrls?: string[] }>;
  inclusions?: string[];
  exclusions?: string[];
  experienceType?: string[] | string;
  discountCategory?: string;
  isTrending?: boolean;
  season?: string;
  eventType?: string;
  photos?: string[];
  rating?: number;
  reviewsCount?: number;
  createdAt?: any;
  agencyId?: string;
  agencyName?: string;
  approved?: boolean;
  [key: string]: any;
}

/**
 * Calculates a data-driven discovery score based strictly on real available listing fields.
 */
export function calculateDiscoveryScore(listing: PackageListing): number {
  let score = 0;

  if (typeof listing.rating === 'number' && listing.rating > 0) {
    score += listing.rating * 10;
  }
  if (typeof listing.reviewsCount === 'number' && listing.reviewsCount > 0) {
    score += Math.min(listing.reviewsCount, 50) * 1.5;
  }
  if (listing.isTrending === true) {
    score += 15;
  }

  const photosCount = Array.isArray(listing.photos) ? listing.photos.length : 0;
  const placesCount = Array.isArray(listing.placesCovered) ? listing.placesCovered.length : 0;
  const itineraryCount = Array.isArray(listing.itinerary) ? listing.itinerary.length : 0;
  const inclusionsCount = Array.isArray(listing.inclusions) ? listing.inclusions.length : 0;

  score += Math.min(photosCount, 5) * 3;
  score += Math.min(placesCount, 5) * 2;
  score += Math.min(itineraryCount, 7) * 2;
  if (inclusionsCount > 0) score += 5;

  if (listing.createdAt) {
    try {
      let createdMs = 0;
      if (typeof listing.createdAt === 'number') {
        createdMs = listing.createdAt;
      } else if (listing.createdAt?.seconds) {
        createdMs = listing.createdAt.seconds * 1000;
      } else if (typeof listing.createdAt === 'string') {
        createdMs = new Date(listing.createdAt).getTime();
      }

      if (createdMs > 0) {
        const daysOld = (Date.now() - createdMs) / (1000 * 60 * 60 * 24);
        if (daysOld < 7) score += 20;
        else if (daysOld < 30) score += 10;
        else if (daysOld < 90) score += 5;
      }
    } catch {
      // fallback
    }
  }

  return score;
}

/**
 * Regional category definitions and metadata for destination grouping.
 */
export const REGION_METADATA: Record<string, { label: string; shortLabel: string; icon: string; subtitle: string }> = {
  north: {
    label: 'North India',
    shortLabel: 'North India',
    icon: '',
    subtitle: 'Himalayas, Royal Heritage & Mountain Valleys',
  },
  south: {
    label: 'South India',
    shortLabel: 'South India',
    icon: '',
    subtitle: 'Serene Backwaters, Ancient Temples & Coastlines',
  },
  east_northeast: {
    label: 'East & North-East India',
    shortLabel: 'East & North-East India',
    icon: '',
    subtitle: 'Lush Hills, Living Roots, Tea Gardens & Culture',
  },
  west_central: {
    label: 'West & Central India',
    shortLabel: 'West & Central India',
    icon: '',
    subtitle: 'Historic Forts, Wildlife Safaris & Coastal Escapes',
  },
  international: {
    label: 'International',
    shortLabel: 'International',
    icon: '',
    subtitle: 'Iconic Global Getaways, Tropical Islands & Wonders',
  },
};

/**
 * Maps a destination name (state/city/country) and its associated listings to a regional bucket.
 */
export function getRegionForDestination(name: string, sampleListings: PackageListing[] = []): string {
  const isIntl = sampleListings.some((l) => l.packageType === 'international');
  const cleanName = name.trim().toLowerCase();

  // If flagged as international or clearly an international destination
  const intlKeywords = [
    'dubai', 'uae', 'united arab emirates', 'thailand', 'bangkok', 'phuket', 'pattaya', 'krabi',
    'bali', 'indonesia', 'maldives', 'singapore', 'malaysia', 'kuala lumpur', 'vietnam', 'hanoi',
    'da nang', 'sri lanka', 'colombo', 'europe', 'switzerland', 'paris', 'france', 'london', 'uk',
    'united kingdom', 'italy', 'rome', 'greece', 'turkey', 'mauritius', 'egypt', 'japan', 'tokyo',
    'nepal', 'kathmandu', 'bhutan', 'thimphu', 'georgia', 'baku', 'azerbaijan', 'australia',
    'new zealand', 'usa', 'canada', 'germany', 'spain', 'austria', 'netherlands', 'amsterdam',
    'oman', 'qatar', 'kenya', 'south africa', 'seychelles', 'multi country'
  ];
  if (isIntl || intlKeywords.some((k) => cleanName === k || cleanName.includes(k))) {
    return 'international';
  }

  // North India
  const northKeywords = [
    'jammu', 'kashmir', 'srinagar', 'gulmarg', 'pahalgam', 'sonamarg', 'ladakh', 'leh', 'nubra',
    'himachal', 'manali', 'shimla', 'dharamshala', 'dalhousie', 'spiti', 'kasol', 'kullu', 'bir billing',
    'uttarakhand', 'uttaranchal', 'rishikesh', 'haridwar', 'nainital', 'mussoorie', 'kedarnath', 'badrinath',
    'char dham', 'jim corbett', 'dehradun', 'auli', 'rajasthan', 'jaipur', 'udaipur', 'jodhpur', 'jaisalmer',
    'pushkar', 'bikaner', 'mount abu', 'ranthambore', 'delhi', 'new delhi', 'punjab', 'amritsar', 'haryana',
    'chandigarh', 'uttar pradesh', 'up', 'agra', 'varanasi', 'banaras', 'kashi', 'ayodhya', 'mathura', 'vrindavan', 'lucknow'
  ];
  if (northKeywords.some((k) => cleanName === k || cleanName.includes(k))) {
    return 'north';
  }

  // South India
  const southKeywords = [
    'kerala', 'munnar', 'alleppey', 'alappuzha', 'wayanad', 'kochi', 'cochin', 'kovalam', 'varkala', 'thekkady',
    'karnataka', 'bangalore', 'bengaluru', 'coorg', 'mysore', 'mysuru', 'hampi', 'gokarna', 'chikmagalur', 'kabini',
    'tamil nadu', 'ooty', 'kodaikanal', 'chennai', 'rameswaram', 'madurai', 'kanyakumari', 'coimbatore', 'mahabalipuram',
    'telangana', 'hyderabad', 'warangal', 'andhra pradesh', 'andhra', 'visakhapatnam', 'vizag', 'tirupati', 'aruku',
    'goa', 'north goa', 'south goa', 'puducherry', 'pondicherry', 'andaman', 'nicobar', 'port blair', 'havelock', 'neil island', 'lakshadweep'
  ];
  if (southKeywords.some((k) => cleanName === k || cleanName.includes(k))) {
    return 'south';
  }

  // East & North-East India
  const eastKeywords = [
    'assam', 'kaziranga', 'guwahati', 'majuli', 'manas', 'meghalaya', 'shillong', 'cherrapunji', 'cherrapunjee', 'dawki',
    'sikkim', 'gangtok', 'pelling', 'lachung', 'yumthang', 'arunachal', 'arunachal pradesh', 'tawang', 'ziro',
    'nagaland', 'kohima', 'manipur', 'imphal', 'mizoram', 'aizawl', 'tripura', 'agartala',
    'odisha', 'orissa', 'puri', 'bhubaneswar', 'konark', 'chilika',
    'west bengal', 'bengal', 'kolkata', 'darjeeling', 'kalimpong', 'sundarbans', 'digha', 'dooars',
    'bihar', 'patna', 'gaya', 'bodhgaya', 'nalanda', 'jharkhand', 'ranchi', 'jamshedpur'
  ];
  if (eastKeywords.some((k) => cleanName === k || cleanName.includes(k))) {
    return 'east_northeast';
  }

  // West & Central India
  const westKeywords = [
    'maharashtra', 'mumbai', 'pune', 'lonavala', 'khandala', 'mahabaleshwar', 'matheran', 'alibaug', 'shirdi', 'nashik', 'aurangabad', 'ajanta', 'ellora', 'tadoba',
    'gujarat', 'ahmedabad', 'kutch', 'rann of kutch', 'gir', 'somnath', 'dwarka', 'statue of unity', 'vadodara', 'surat', 'saputara',
    'madhya pradesh', 'mp', 'bhopal', 'indore', 'ujjain', 'khajuraho', 'gwalior', 'kanha', 'bandhavgarh', 'panchmarhi', 'jabalpur',
    'chhattisgarh', 'raipur', 'bastar', 'daman', 'diu', 'dadra'
  ];
  if (westKeywords.some((k) => cleanName === k || cleanName.includes(k))) {
    return 'west_central';
  }

  // Check stateName/countryName of listings as fallback
  for (const l of sampleListings) {
    const s = (l.stateName || '').toLowerCase();
    const c = (l.countryName || '').toLowerCase();
    if (northKeywords.some((k) => s.includes(k) || c.includes(k))) return 'north';
    if (southKeywords.some((k) => s.includes(k) || c.includes(k))) return 'south';
    if (eastKeywords.some((k) => s.includes(k) || c.includes(k))) return 'east_northeast';
    if (westKeywords.some((k) => s.includes(k) || c.includes(k))) return 'west_central';
  }

  return 'north';
}

/**
 * Normalizes destination / state names, combining synonyms and canonicalizing
 * names like "Kashmir", "Jammu and Kashmir", "Jammu & Kashmir", "J&K" -> "Jammu & Kashmir".
 */
export function normalizeDestinationName(raw: string): string {
  if (!raw) return '';
  const trimmed = raw.trim();
  const lower = trimmed.toLowerCase();

  // Jammu & Kashmir / Kashmir normalization
  if (
    lower === 'kashmir' ||
    lower === 'jammu' ||
    lower === 'jammu & kashmir' ||
    lower === 'jammu and kashmir' ||
    lower === 'j&k' ||
    lower === 'j & k'
  ) {
    return 'Jammu & Kashmir';
  }

  // Andaman & Nicobar
  if (
    lower === 'andaman' ||
    lower === 'nicobar' ||
    lower === 'andaman & nicobar' ||
    lower === 'andaman and nicobar' ||
    lower === 'andaman and nicobar islands' ||
    lower === 'andaman & nicobar islands'
  ) {
    return 'Andaman & Nicobar';
  }

  // Daman & Diu
  if (
    lower === 'daman' ||
    lower === 'diu' ||
    lower === 'daman and diu' ||
    lower === 'daman & diu'
  ) {
    return 'Daman & Diu';
  }

  // Uttarakhand / Uttaranchal
  if (lower === 'uttaranchal') {
    return 'Uttarakhand';
  }

  // Odisha / Orissa
  if (lower === 'orissa') {
    return 'Odisha';
  }

  // Proper Title Case
  return trimmed
    .split(' ')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Splits raw destination/state strings safely without breaking compound names like "Jammu and Kashmir" or "Andaman and Nicobar"
 */
export function splitDestinationTokens(raw: string): string[] {
  if (!raw) return [];
  // Mask compound names with 'and' or '&' so splitting on 'and' doesn't break them apart
  const safeStr = raw
    .replace(/\bjammu\s+(?:and|&)\s+kashmir\b/gi, 'Jammu & Kashmir')
    .replace(/\bandaman\s+(?:and|&)\s+nicobar(?:\s+islands)?\b/gi, 'Andaman & Nicobar')
    .replace(/\bdaman\s+(?:and|&)\s+diu\b/gi, 'Daman & Diu')
    .replace(/\btrinidad\s+(?:and|&)\s+tobago\b/gi, 'Trinidad and Tobago')
    .replace(/\bbosnia\s+(?:and|&)\s+herzegovina\b/gi, 'Bosnia and Herzegovina');

  // Split by commas, slashes, or standalone 'and'
  const parts = safeStr.split(/,|\/|(?:\s+and\s+)/i).map((p) => p.trim());
  return parts.filter(Boolean);
}

/**
 * Extracts and calculates popular destinations dynamically from real database listings.
 */
export interface DestinationCard {
  name: string;
  type: 'state' | 'country' | 'city';
  packageCount: number;
  coverImage: string | null;
  startingPrice: number | null;
  region: string;
  regionLabel: string;
  discoveredPlaces: string[];
  listings: PackageListing[];
}

export function getPopularDestinations(listings: PackageListing[], minCount = 1): DestinationCard[] {
  const destMap = new Map<string, { displayName: string; listings: PackageListing[] }>();

  listings.forEach((listing) => {
    if (listing.approved === false) return;

    const names = new Set<string>();

    const addCleanName = (raw: string, isCountry = false) => {
      if (!raw) return;
      const parts = splitDestinationTokens(raw);
      parts.forEach((p) => {
        if (p.length > 2 && !/package|tour|trip|holiday/i.test(p)) {
          // If it's domestic and the name is "India", skip it as a destination card to avoid redundant country-level card
          if (isCountry && /^india$/i.test(p) && listing.packageType !== 'international') {
            return;
          }
          const normalized = normalizeDestinationName(p);
          names.add(normalized);
        }
      });
    };

    if (listing.stateName) addCleanName(listing.stateName);
    if (listing.countryName) addCleanName(listing.countryName, true);
    if (Array.isArray(listing.stateNames)) listing.stateNames.forEach((s) => addCleanName(s));
    if (Array.isArray(listing.countryNames)) listing.countryNames.forEach((c) => addCleanName(c, true));
    if (listing.destination) addCleanName(listing.destination);

    names.forEach((name) => {
      const key = name.toLowerCase();
      if (!destMap.has(key)) {
        destMap.set(key, { displayName: name, listings: [] });
      }
      const entry = destMap.get(key)!;
      if (!entry.listings.some((p) => p.id === listing.id)) {
        entry.listings.push(listing);
      }
    });
  });

  const destinations: DestinationCard[] = [];

  destMap.forEach((entry) => {
    const pkgList = entry.listings;
    if (pkgList.length < minCount) return;

    const displayName = entry.displayName;

    let coverImage: string | null = null;
    let minPrice: number | null = null;
    const placesSet = new Set<string>();

    pkgList.forEach((pkg) => {
      if (!coverImage) {
        if (pkg.itinerary?.[0]?.imageUrls?.[0]) coverImage = pkg.itinerary[0].imageUrls[0];
        else if (pkg.itinerary?.[0]?.imageUrl) coverImage = pkg.itinerary[0].imageUrl;
        else if (pkg.placesCovered?.[0]?.imageUrls?.[0]) coverImage = pkg.placesCovered[0].imageUrls[0];
        else if (pkg.photos?.[0]) coverImage = pkg.photos[0];
      }

      const rawPrice = pkg.cost || pkg.price;
      if (rawPrice) {
        const pNum = parseFloat(String(rawPrice).replace(/[^0-9.]/g, ''));
        if (!isNaN(pNum) && pNum > 0) {
          if (minPrice === null || pNum < minPrice) {
            minPrice = pNum;
          }
        }
      }

      if (Array.isArray(pkg.placesCovered)) {
        pkg.placesCovered.forEach((p) => {
          if (p?.name && p.name.trim().length > 2 && p.name.trim().toLowerCase() !== displayName.toLowerCase()) {
            placesSet.add(p.name.trim());
          }
        });
      }
    });

    const regionKey = getRegionForDestination(displayName, pkgList);
    const regionMeta = REGION_METADATA[regionKey];

    destinations.push({
      name: displayName,
      type: 'state',
      packageCount: pkgList.length,
      coverImage: coverImage || null,
      startingPrice: minPrice,
      region: regionKey,
      regionLabel: regionMeta ? regionMeta.label : 'Popular Destination',
      discoveredPlaces: Array.from(placesSet).slice(0, 4),
      listings: pkgList,
    });
  });

  return destinations.sort((a, b) => b.packageCount - a.packageCount);
}

/**
 * Regional Destination Group structure for category rows & tab filters.
 */
export interface RegionalDestinationGroup {
  id: string; // 'north' | 'south' | 'east_northeast' | 'west_central' | 'international'
  label: string;
  shortLabel: string;
  icon: string;
  subtitle: string;
  destinations: DestinationCard[];
  totalPackages: number;
}

export function getRegionalDestinations(listings: PackageListing[], minCount = 1): RegionalDestinationGroup[] {
  const allDestinations = getPopularDestinations(listings, minCount);

  const groups: Record<string, DestinationCard[]> = {
    north: [],
    south: [],
    east_northeast: [],
    west_central: [],
    international: [],
  };

  allDestinations.forEach((dest) => {
    if (groups[dest.region]) {
      groups[dest.region].push(dest);
    } else {
      groups.north.push(dest);
    }
  });

  const orderedRegionKeys = ['north', 'south', 'east_northeast', 'west_central', 'international'];

  return orderedRegionKeys
    .map((key) => {
      const meta = REGION_METADATA[key] || {
        label: key,
        shortLabel: key,
        icon: '📍',
        subtitle: 'Explore packages in this region',
      };
      const dests = groups[key] || [];
      const totalPackages = dests.reduce((acc, d) => acc + d.packageCount, 0);

      return {
        id: key,
        label: meta.label,
        shortLabel: meta.shortLabel,
        icon: meta.icon,
        subtitle: meta.subtitle,
        destinations: dests,
        totalPackages,
      };
    })
    .filter((group) => group.destinations.length > 0);
}

/**
 * Editorial State Story Model (STATE -> STORY -> PLACES -> EXPERIENCES -> PACKAGES)
 * Extracted 100% dynamically from real database listings.
 */
export interface StateStory {
  stateName: string;
  packageCount: number;
  coverImage: string | null;
  startingPrice: number | null;
  discoveredPlaces: string[];
  experienceTags: string[];
  listings: PackageListing[];
}

export function getStateStories(listings: PackageListing[]): StateStory[] {
  const stateMap = new Map<string, { displayName: string; listings: PackageListing[] }>();

  listings.forEach((listing) => {
    if (listing.approved === false) return;

    const states = new Set<string>();
    if (listing.stateName && listing.stateName.trim()) {
      splitDestinationTokens(listing.stateName).forEach((s) => states.add(normalizeDestinationName(s)));
    }
    if (Array.isArray(listing.stateNames)) {
      listing.stateNames.forEach((s) => s && splitDestinationTokens(s).forEach((sub) => states.add(normalizeDestinationName(sub))));
    }

    states.forEach((state) => {
      const key = state.toLowerCase();
      if (!stateMap.has(key)) stateMap.set(key, { displayName: state, listings: [] });
      const entry = stateMap.get(key)!;
      if (!entry.listings.some((p) => p.id === listing.id)) {
        entry.listings.push(listing);
      }
    });
  });

  const stories: StateStory[] = [];

  stateMap.forEach((entry) => {
    const pkgList = entry.listings;
    if (pkgList.length === 0) return;

    const stateName = entry.displayName;

    let coverImage: string | null = null;
    let minPrice: number | null = null;
    const placesSet = new Set<string>();
    const expSet = new Set<string>();

    pkgList.forEach((pkg) => {
      if (!coverImage) {
        if (pkg.itinerary?.[0]?.imageUrls?.[0]) coverImage = pkg.itinerary[0].imageUrls[0];
        else if (pkg.itinerary?.[0]?.imageUrl) coverImage = pkg.itinerary[0].imageUrl;
        else if (pkg.placesCovered?.[0]?.imageUrls?.[0]) coverImage = pkg.placesCovered[0].imageUrls[0];
        else if (pkg.photos?.[0]) coverImage = pkg.photos[0];
      }

      const rawPrice = pkg.cost || pkg.price;
      if (rawPrice) {
        const pNum = parseFloat(String(rawPrice).replace(/[^0-9.]/g, ''));
        if (!isNaN(pNum) && pNum > 0) {
          if (minPrice === null || pNum < minPrice) minPrice = pNum;
        }
      }

      // Collect real places covered
      if (Array.isArray(pkg.placesCovered)) {
        pkg.placesCovered.forEach((p) => {
          if (p?.name && p.name.trim().length > 2) placesSet.add(p.name.trim());
        });
      }

      // Collect real experiences
      if (pkg.experienceType) {
        const raw = Array.isArray(pkg.experienceType) ? pkg.experienceType.join(',') : String(pkg.experienceType);
        raw.split(/[,;\n]+/).forEach((e) => {
          const trimmed = e.trim();
          if (trimmed && trimmed.length < 30) expSet.add(trimmed);
        });
      }
      if (Array.isArray(pkg.tourCategories)) {
        pkg.tourCategories.forEach((tc) => {
          if (tc) {
            String(tc).split(/[,;\n]+/).forEach((t) => {
              const trimmed = t.trim();
              if (trimmed && trimmed.length < 30) expSet.add(trimmed);
            });
          }
        });
      }
    });

    stories.push({
      stateName,
      packageCount: pkgList.length,
      coverImage: coverImage || null,
      startingPrice: minPrice,
      discoveredPlaces: Array.from(placesSet).slice(0, 6),
      experienceTags: Array.from(expSet).slice(0, 4),
      listings: pkgList,
    });
  });

  return stories.sort((a, b) => b.packageCount - a.packageCount);
}

/**
 * Dynamic Attribute-Based Category Collection Engine
 * Groups listings into real attribute collections for 2x2 multi-item cards.
 */
export interface CategoryCollection {
  id: string;
  title: string;
  description: string;
  categoryKey: string;
  subcategoryKey?: string;
  badgeText?: string;
  listings: PackageListing[];
}

export function getCategoryCollections(listings: PackageListing[]): CategoryCollection[] {
  const approvedListings = listings.filter((l) => l.approved !== false);
  const collections: CategoryCollection[] = [];

  const matchCategory = (filterFn: (pkg: PackageListing) => boolean) => {
    return approvedListings.filter(filterFn);
  };

  // 1. Family Vacations
  const familyListings = matchCategory((pkg) => {
    const cats = Array.isArray(pkg.tourCategories) ? pkg.tourCategories : [];
    const title = (pkg.title || '').toLowerCase();
    const desc = (pkg.description || '').toLowerCase();
    return cats.some((c) => /family/i.test(c)) || title.includes('family') || desc.includes('family');
  });
  if (familyListings.length >= 2) {
    collections.push({
      id: 'family-holidays',
      title: 'Family Vacations',
      description: 'Curated packages designed for memorable family trips',
      categoryKey: 'tourCategory',
      subcategoryKey: 'Family Tour',
      badgeText: `${familyListings.length} Packages`,
      listings: familyListings,
    });
  }

  // 2. Honeymoon & Romantic
  const honeymoonListings = matchCategory((pkg) => {
    const cats = Array.isArray(pkg.tourCategories) ? pkg.tourCategories : [];
    const title = (pkg.title || '').toLowerCase();
    const desc = (pkg.description || '').toLowerCase();
    return cats.some((c) => /honeymoon|romantic/i.test(c)) || title.includes('honeymoon') || desc.includes('honeymoon');
  });
  if (honeymoonListings.length >= 2) {
    collections.push({
      id: 'honeymoon-couples',
      title: 'Honeymoon & Couples',
      description: 'Romantic getaways and private holiday retreats',
      categoryKey: 'tourCategory',
      subcategoryKey: 'Honeymoon Tour',
      badgeText: `${honeymoonListings.length} Packages`,
      listings: honeymoonListings,
    });
  }

  // 3. Adventure & Outdoors
  const adventureListings = matchCategory((pkg) => {
    const exp = Array.isArray(pkg.experienceType)
      ? pkg.experienceType.join(' ')
      : String(pkg.experienceType || '');
    const title = (pkg.title || '').toLowerCase();
    const type = (pkg.type || '').toLowerCase();
    return /trekking|adventure|snow|water|mountain/i.test(exp) || /adventure|trek/i.test(title) || type === 'adventure';
  });
  if (adventureListings.length >= 2) {
    collections.push({
      id: 'adventure-outdoors',
      title: 'Adventure & Outdoors',
      description: 'Thrilling treks, outdoor activities, and nature tours',
      categoryKey: 'experiences',
      subcategoryKey: 'Adventure',
      badgeText: `${adventureListings.length} Packages`,
      listings: adventureListings,
    });
  }

  // 4. Spiritual & Heritage
  const spiritualListings = matchCategory((pkg) => {
    const cats = Array.isArray(pkg.tourCategories) ? pkg.tourCategories : [];
    const title = (pkg.title || '').toLowerCase();
    const desc = (pkg.description || '').toLowerCase();
    return cats.some((c) => /religious|spiritual|pilgrimage/i.test(c)) || /temple|darshan|char dham|spiritual|heritage/i.test(title) || /spiritual|pilgrimage/i.test(desc);
  });
  if (spiritualListings.length >= 2) {
    collections.push({
      id: 'spiritual-cultural',
      title: 'Spiritual & Heritage',
      description: 'Sacred pilgrimages, temple tours, and cultural journeys',
      categoryKey: 'tourCategory',
      subcategoryKey: 'Religious Tour',
      badgeText: `${spiritualListings.length} Packages`,
      listings: spiritualListings,
    });
  }

  // 5. Domestic Journeys
  const domesticListings = matchCategory((pkg) => pkg.packageType === 'domestic');
  if (domesticListings.length >= 2) {
    collections.push({
      id: 'domestic-packages',
      title: 'Domestic Journeys',
      description: 'Explore incredible destinations across the country',
      categoryKey: 'domestic',
      badgeText: `${domesticListings.length} Packages`,
      listings: domesticListings,
    });
  }

  // 6. International Holidays
  const intlListings = matchCategory((pkg) => pkg.packageType === 'international');
  if (intlListings.length >= 2) {
    collections.push({
      id: 'international-packages',
      title: 'International Holidays',
      description: 'Unforgettable journeys to top global destinations',
      categoryKey: 'international',
      badgeText: `${intlListings.length} Packages`,
      listings: intlListings,
    });
  }

  return collections;
}

/**
 * Dynamic Experience Discovery Engine
 * Scans real listings for experience attributes and returns only experience groups supported by real package data.
 */
export const EXPERIENCE_THEME_IMAGES: Record<string, string> = {
  'Heritage & Culture': 'https://images.unsplash.com/photo-1599661046289-e31897846e41?auto=format&fit=crop&q=80&w=1200', // Iconic Amber Fort & Rajasthan royal palace architecture
  'Nature & Wildlife': 'https://images.unsplash.com/photo-1516426122078-c23e76319801?auto=format&fit=crop&q=80&w=1200', // Majestic safari elephants in wild natural sanctuary
  'Trekking & Mountains': 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&q=80&w=1200', // High mountain ridge trekking & panoramic alpine trail
  'Spiritual & Pilgrimage': 'https://images.unsplash.com/photo-1681797849305-206966d6a5bf?auto=format&fit=crop&q=80&w=1200', // Sacred Varanasi ancient temples & holy Ganga ghats
  'Honeymoon & Couples': 'https://images.unsplash.com/photo-1510312305653-8ed496efae75?auto=format&fit=crop&q=80&w=1200', // Romantic couple sunset escape
  'Snow & Winter': 'https://images.unsplash.com/photo-1548777123-e216912df7d8?auto=format&fit=crop&q=80&w=1200', // Pristine snow-blanketed alpine pine trees & winter mountains
  'Beach & Coastal': 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=1200', // Turquoise ocean waves, tropical sandy shores & backwaters
  'Adventure & Outdoors': 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&q=80&w=1200', // Starlit outdoor campfire & camping under pine forest
  'Sightseeing & Local Tours': 'https://images.unsplash.com/photo-1524492412937-b28074a5d7da?auto=format&fit=crop&q=80&w=1200', // Iconic city landmarks & cultural sightseeing
  'Desert Safari': 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&q=80&w=1200', // Golden sand dunes & sunset camel safari
  'Weekend Escapes': 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&q=80&w=1200', // Quick scenic road trip getaway
};

export const EXPERIENCE_TAGLINES: Record<string, string> = {
  'Heritage & Culture': 'Centuries of royal palaces, historic forts, timeless art & architecture',
  'Nature & Wildlife': 'Jungle safaris, national parks & pristine natural landscapes',
  'Trekking & Mountains': 'High-altitude Himalayan passes, scenic pine valleys & breathtaking alpine trails',
  'Spiritual & Pilgrimage': 'Sacred pilgrimage circuits, ancient temple darshans & holy waters',
  'Honeymoon & Couples': 'Private candlelit retreats, scenic hideaways & romantic getaways',
  'Snow & Winter': 'Snow-blanketed alpine valleys, frozen lakes & winter wonderland adventures',
  'Beach & Coastal': 'Pristine shores, turquoise ocean waves, tranquil backwaters & tropical bliss',
  'Adventure & Outdoors': 'Thrilling outdoor expeditions, camping, rafting & rugged trails',
  'Sightseeing & Local Tours': 'City highlights, cultural landmarks & hidden scenic gems',
  'Desert Safari': 'Golden dune bashing, starlit desert camps & royal camel safaris',
  'Weekend Escapes': 'Quick 2 to 4-day short recharge trips with easy departures',
};

export interface DynamicExperience {
  name: string;
  tagKey: string;
  packageCount: number;
  startingPrice?: number | null;
  coverImage: string | null;
  tagline: string;
  listings: PackageListing[];
}

// Unwanted structural filters or non-experience noise
const EXCLUDED_EXPERIENCE_TAGS = new Set([
  'domestic',
  'international',
  'budget',
  'deluxe',
  'standard',
  'luxury',
  '50-off',
  '10-off',
  '50% off',
  '10% off',
  'flash-deals',
  'flash deals',
  'packages under 10k',
  'none',
  'n/a',
  'all',
  'general',
  'other',
  'flight',
  'hotel',
  'cab',
  'meal',
  'breakfast',
  'dinner',
  'undefined',
  'null',
  'photography',
  'photo',
  'shopping',
  'shop',
  'pickup',
  'drop',
  'arrival',
  'departure',
  'transfer',
  'taxi',
  'station',
  'airport',
  'fort',
  'forts',
  'palace',
  'palaces',
  'waterfall',
  'waterfalls',
  'monument',
  'monuments',
  'castle',
  'museum',
  'temple',
  'temples',
  'ghat',
  'ghats',
]);

/**
 * Normalizes an experience tag string into a clean Display Name.
 * Strictly excludes sights, places, and non-travel noise (fort, waterfall, shopping, photography).
 * Combines lakes & backwaters with beach & coastal as water experiences.
 */
export function normalizeExperienceName(tag: string): string | null {
  if (!tag) return null;
  const raw = tag.trim();
  if (raw.length < 2) return null;

  const lower = raw.toLowerCase();
  if (EXCLUDED_EXPERIENCE_TAGS.has(lower)) return null;

  // Strictly exclude places, stops, sights and non-experience activities per user request
  if (/\b(forts?|palaces?|monuments?|castles?|museums?|waterfalls?|shopping|shop|photography|photo|airports?|stations?|pickups?|drops?|arrivals?|departures?|transfers?|hotels?|resorts?|cabs?|taxis?|temples?|ghats?)\b/i.test(lower)) {
    return null;
  }

  // 1. Honeymoon & Couples
  if (/honeymoon|couple|romantic|romance|candlelight/i.test(lower)) {
    return 'Honeymoon & Couples';
  }

  // 2. Snow & Winter
  if (/snow|winter|ski|skiing|glacier|ice/i.test(lower)) {
    return 'Snow & Winter';
  }

  // 3. Beach & Coastal (includes lakes, backwaters, houseboat, shikara, water sports as water experiences)
  if (/beach|coastal|island|sea|ocean|scuba|snorkeling|houseboat|shikara|backwater|lakes?(\s*side)?|boating|river\s*cruise|water[\s-]?sports?/i.test(lower)) {
    return 'Beach & Coastal';
  }

  // 4. Heritage & Culture (Culture, Cultural, Heritage, History)
  if (/heritage|cultur(e|al)?|historic(al)?|tradition/i.test(lower)) {
    return 'Heritage & Culture';
  }

  // 5. Nature & Wildlife (Wildlife, Safari, Jungle, National Park, Nature, Flora, Fauna, Forest)
  if (/wildlife|safari|jungle|national\s*park|nature|flora|fauna|forest|sanctuary|biosphere/i.test(lower)) {
    return 'Nature & Wildlife';
  }

  // 6. Trekking & Mountains (Trek, Trekking, Hike, Hiking, Mountains, Hill Station, Valleys, Hills)
  if (/trek|trekking|hike|hiking|mountain(s|ous)?|hill\s*station|valleys?|highland|hills?\b/i.test(lower)) {
    return 'Trekking & Mountains';
  }

  // 7. Spiritual & Pilgrimage (Pilgrimage, Darshan, Char Dham, Spiritual, Holy)
  if (/spiritual|pilgrimage|religious|darshan|char\s*dham|jyotirlinga|tirtha|holy|ashram/i.test(lower)) {
    return 'Spiritual & Pilgrimage';
  }

  // 8. Desert Safari (Desert, Dunes, Camel Safari, Sam Dunes)
  if (/desert|dunes?|camel\s*safari|sam\s*dunes|thar/i.test(lower)) {
    return 'Desert Safari';
  }

  // 9. Adventure & Outdoors (Adventure, Camping, Glamping, Rafting, Paragliding)
  if (/adventure|outdoors?|camping|glamping|paraglid|rock\s*climb|rafting|bungee/i.test(lower)) {
    return 'Adventure & Outdoors';
  }

  // 10. Sightseeing & Local Tours (Sightseeing, City Tours, Scenic Drives, Road Trips)
  if (/sightseeing|city[\s-]?tour|local[\s-]?tour|scenic(\s*drives?|\s*routes?|\s*tours?)?|road[\s-]?trip|drive/i.test(lower)) {
    return 'Sightseeing & Local Tours';
  }

  // 11. Weekend Escapes
  if (/weekend|short[\s-]?trip/i.test(lower)) {
    return 'Weekend Escapes';
  }

  // ANY OTHER DYNAMIC EXPERIENCE FROM PACKAGES:
  let cleaned = raw
    .replace(/^(tour|package|trip)\s+/i, '')
    .replace(/\s+(tour|package|trip|holiday)s?$/i, '')
    .trim();

  if (!cleaned || cleaned.length < 3) return null;

  // If the custom tag is a known place or sight, do NOT make a card
  const cleanedLower = cleaned.toLowerCase();
  if (/\b(fort|palace|waterfall|shopping|shop|photo|photography|airport|station|pickup|drop|hotel|resort|cab|taxi|temple|ghat|monument|museum)\b/i.test(cleanedLower)) {
    return null;
  }

  // Normalize plurals (e.g. "Drives" -> "Drive")
  if (cleaned.endsWith('s') && !cleaned.endsWith('ss') && cleaned.length > 4) {
    cleaned = cleaned.slice(0, -1);
  }

  // Convert to clean Title Case
  const words = cleaned.split(/\s+/).map((word) => {
    const wLower = word.toLowerCase();
    if (['and', '&', 'of', 'the', 'in'].includes(wLower)) return wLower === '&' ? '&' : wLower;
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  });

  return words.join(' ');
}

export function getDynamicExperiences(listings: PackageListing[]): DynamicExperience[] {
  const approvedListings = listings.filter((l) => l.approved !== false);
  const expMap = new Map<string, { name: string; packages: PackageListing[] }>();

  approvedListings.forEach((pkg) => {
    const rawTagCandidates: string[] = [];

    const collectTags = (val: any) => {
      if (!val) return;
      if (Array.isArray(val)) {
        val.forEach(collectTags);
        return;
      }
      if (typeof val === 'string') {
        const trimmed = val.trim();
        if (!trimmed) return;
        if (/[,;|/\n]/.test(trimmed)) {
          trimmed.split(/[,;|/\n]+/).forEach((part) => collectTags(part));
          return;
        }
        rawTagCandidates.push(trimmed);
      }
    };

    // STRICTLY extract experience tags ONLY from the package's experienceType field.
    collectTags(pkg.experienceType);

    // Track matched canonical keys for THIS package to prevent duplicate assignment to the same experience
    const packageMatchedKeys = new Set<string>();

    rawTagCandidates.forEach((rawTag) => {
      const normalizedName = normalizeExperienceName(rawTag);
      if (!normalizedName) return;

      const canonicalKey = normalizedName.toLowerCase();
      if (packageMatchedKeys.has(canonicalKey)) return;
      packageMatchedKeys.add(canonicalKey);

      if (!expMap.has(canonicalKey)) {
        expMap.set(canonicalKey, { name: normalizedName, packages: [] });
      }

      const entry = expMap.get(canonicalKey)!;
      if (!entry.packages.some((p) => p.id === pkg.id)) {
        entry.packages.push(pkg);
      }
    });
  });

  const experiences: DynamicExperience[] = [];

  // Sort experience groups by packageCount descending (most packages first)
  const sortedEntries = Array.from(expMap.values()).sort(
    (a, b) => b.packages.length - a.packages.length
  );

  // Track assigned cover images to prevent repetition across cards
  const usedImages = new Set<string>();

  sortedEntries.forEach(({ name, packages: pkgList }) => {
    // Strictly skip any experience that has 0 packages (NO fake / static cards)
    if (pkgList.length === 0) return;

    // Canonical themes show if they have >= 1 verified package.
    // Custom non-canonical tags require >= 2 packages to prevent 1-package clutter.
    const isCanonical = Boolean(EXPERIENCE_THEME_IMAGES[name] || EXPERIENCE_TAGLINES[name]);
    if (!isCanonical && pkgList.length < 2) return;

    // 1. Cover Image:
    // For canonical themes, prioritize the curated high-resolution theme hero image
    // so themes like "Snow & Winter", "Lakes & Backwaters", "Nature & Wildlife" ALWAYS have
    // spectacular, 100% theme-accurate photography, avoiding summer fountains or airport photos!
    let coverImage: string | null = EXPERIENCE_THEME_IMAGES[name] || null;

    // If it's a custom experience without a curated theme image, find a real photo from packages
    if (!coverImage) {
      for (const pkg of pkgList) {
        const candidatePhotos: string[] = [];
        if (Array.isArray(pkg.placesCovered)) {
          for (const pl of pkg.placesCovered) {
            const plName = (pl?.name || '').toLowerCase();
            if (plName.includes('airport') || plName.includes('station') || plName.includes('pickup')) continue;
            if (pl.imageUrls?.[0]) candidatePhotos.push(pl.imageUrls[0]);
            else if (pl.image) candidatePhotos.push(pl.image);
          }
        }
        if (Array.isArray(pkg.photos)) candidatePhotos.push(...pkg.photos);
        if (Array.isArray(pkg.itinerary)) {
          for (const it of pkg.itinerary) {
            if (it.imageUrls?.[0]) candidatePhotos.push(it.imageUrls[0]);
            else if (it.imageUrl) candidatePhotos.push(it.imageUrl);
          }
        }
        if (Array.isArray(pkg.imageUrls)) candidatePhotos.push(...pkg.imageUrls);

        for (const url of candidatePhotos) {
          if (!url || typeof url !== 'string') continue;
          if (usedImages.has(url)) continue;
          if (url.toLowerCase().includes('airport')) continue;
          coverImage = url;
          break;
        }
        if (coverImage) break;
      }
    }

    if (coverImage) {
      usedImages.add(coverImage);
    }

    // 2. Starting Price: calculated strictly from actual packages
    let minPrice: number | null = null;
    pkgList.forEach((pkg) => {
      const rawCost = pkg.cost || pkg.price;
      if (rawCost) {
        const num = parseFloat(String(rawCost).replace(/[^0-9.]/g, ''));
        if (!isNaN(num) && num > 0) {
          if (minPrice === null || num < minPrice) minPrice = num;
        }
      }
    });

    // 3. Tagline: Use curated tagline or generate clean destination string
    let tagline = EXPERIENCE_TAGLINES[name] || '';
    if (!tagline) {
      const destinations = new Set<string>();
      const destLowerSet = new Set<string>();

      const addDest = (val?: string) => {
        if (!val) return;
        const trimmed = val.trim();
        const lower = trimmed.toLowerCase();
        if (trimmed.length > 2 && !destLowerSet.has(lower) && !['india', 'domestic', 'international'].includes(lower)) {
          destLowerSet.add(lower);
          destinations.add(trimmed);
        }
      };

      pkgList.forEach((p) => {
        addDest(p.stateName);
        addDest(p.destination);
        if (Array.isArray(p.placesCovered)) {
          p.placesCovered.forEach((place) => addDest(place?.name));
        }
      });

      const destList = Array.from(destinations).slice(0, 3);
      if (destList.length > 0) {
        tagline = `Curated itineraries covering ${destList.join(', ')}`;
      } else {
        tagline = `Curated ${name.toLowerCase()} journeys from verified ground operators`;
      }
    }

    experiences.push({
      name,
      tagKey: name.toLowerCase(),
      packageCount: pkgList.length,
      startingPrice: minPrice,
      coverImage: coverImage || null,
      tagline,
      listings: pkgList,
    });
  });

  // Return all experiences that actually exist in packages (up to 20 for carousel)
  return experiences.slice(0, 20);
}

/**
 * Returns Recently Added packages sorted by createdAt timestamp (newest to oldest).
 */
export function getRecentlyAddedPackages(listings: PackageListing[], limit = 10): PackageListing[] {
  return [...listings]
    .filter((l) => l.approved !== false)
    .sort((a, b) => {
      const getMs = (l: PackageListing) => {
        if (typeof l.createdAt === 'number') return l.createdAt;
        if (l.createdAt?.seconds) return l.createdAt.seconds * 1000;
        if (typeof l.createdAt === 'string') return new Date(l.createdAt).getTime();
        return 0;
      };
      return getMs(b) - getMs(a);
    })
    .slice(0, limit);
}

/**
 * Intent Rails: Returns customized rails for horizontal browsing based on real attributes.
 */
export interface IntentRail {
  id: string;
  title: string;
  subtitle: string;
  listings: PackageListing[];
}

export function getIntentRails(listings: PackageListing[]): IntentRail[] {
  const approved = listings.filter((l) => l.approved !== false);
  const rails: IntentRail[] = [];

  // Rail 1: Weekend Getaways & Short Escapes (duration <= 4 days/nights)
  const shortTrips = approved.filter((l) => {
    const dur = parseInt(String(l.duration || '0')) || (Array.isArray(l.itinerary) ? l.itinerary.length : 0);
    const ev = (l.eventType || '').toLowerCase();
    return (dur > 0 && dur <= 4) || ev === 'weekend';
  });
  if (shortTrips.length >= 2) {
    rails.push({
      id: 'weekend-escapes',
      title: 'Weekend Getaways & Short Escapes',
      subtitle: 'Quick 2 to 4-day trips perfect for a weekend recharge',
      listings: shortTrips,
    });
  }

  // Rail 2: Fixed Departure & Group Escapes
  const fixDepartures = approved.filter((l) => {
    const cats = Array.isArray(l.tourCategories) ? l.tourCategories : [];
    return cats.some((c) => /fix departure|group|friends/i.test(c));
  });
  if (fixDepartures.length >= 2) {
    rails.push({
      id: 'fix-departures',
      title: 'Fixed Departure & Group Escapes',
      subtitle: 'Guaranteed departures with curated itineraries for group travel',
      listings: fixDepartures,
    });
  }

  return rails;
}

/**
 * Dynamic Destination Section Auto-Creation Engine (Thrillophilia Style)
 * Groups listings by destination (State for Domestic, Country/Region for International).
 * Automatically creates a section (e.g., "Assam", "Europe", "Kashmir") whenever listings exist for that location.
 */
export interface DestinationSection {
  id: string;
  name: string;
  packageType: 'domestic' | 'international';
  packageCount: number;
  coverImage: string | null;
  startingPrice: number | null;
  listings: PackageListing[];
}

export function getDynamicDestinationSections(
  listings: PackageListing[],
  packageTypeFilter: 'all' | 'domestic' | 'international' = 'all'
): DestinationSection[] {
  const approvedListings = listings.filter((l) => l.approved !== false);
  const destMap = new Map<string, { name: string; packageType: 'domestic' | 'international'; listings: PackageListing[] }>();

  approvedListings.forEach((listing) => {
    const isIntl = listing.packageType === 'international';
    const pkgType: 'domestic' | 'international' = isIntl ? 'international' : 'domestic';

    const locationNames = new Set<string>();

    const cleanAndAdd = (raw: string) => {
      if (!raw) return;
      const parts = splitDestinationTokens(raw);
      parts.forEach((p) => {
        if (p.length > 2 && !/package|tour|trip|holiday|deal|special/i.test(p)) {
          const formatted = normalizeDestinationName(p);
          locationNames.add(formatted);
        }
      });
    };

    // Check if package covers multiple states or countries
    const isMultiState = !isIntl && (
      (Array.isArray(listing.stateNames) && listing.stateNames.filter(Boolean).length > 1) ||
      (typeof listing.stateName === 'string' && splitDestinationTokens(listing.stateName).length > 1)
    );

    const isMultiCountry = isIntl && (
      (Array.isArray(listing.countryNames) && listing.countryNames.filter(Boolean).length > 1) ||
      (typeof listing.countryName === 'string' && splitDestinationTokens(listing.countryName).length > 1)
    );

    if (isMultiState) {
      locationNames.add("Multi State");
    } else if (isMultiCountry) {
      locationNames.add("Multi Country");
    } else if (isIntl) {
      if (listing.countryName) cleanAndAdd(listing.countryName);
      if (Array.isArray(listing.countryNames)) listing.countryNames.forEach(cleanAndAdd);
      if (listing.destination) cleanAndAdd(listing.destination);
    } else {
      if (listing.stateName) cleanAndAdd(listing.stateName);
      if (Array.isArray(listing.stateNames)) listing.stateNames.forEach(cleanAndAdd);
      if (listing.destination) cleanAndAdd(listing.destination);
    }

    // Fallback if no specific state/country was provided
    if (locationNames.size === 0) {
      if (listing.stateName) cleanAndAdd(listing.stateName);
      if (listing.countryName) cleanAndAdd(listing.countryName);
      if (listing.destination) cleanAndAdd(listing.destination);
    }

    locationNames.forEach((name) => {
      const key = name.toLowerCase();
      if (!destMap.has(key)) {
        destMap.set(key, { name, packageType: pkgType, listings: [] });
      }
      const item = destMap.get(key)!;
      if (!item.listings.some((p) => p.id === listing.id)) {
        item.listings.push(listing);
      }
    });
  });

  const sections: DestinationSection[] = [];

  destMap.forEach((group, key) => {
    if (group.listings.length === 0) return;

    // Filter by packageTypeFilter if requested
    if (packageTypeFilter === 'domestic' && group.packageType !== 'domestic') return;
    if (packageTypeFilter === 'international' && group.packageType !== 'international') return;

    let coverImage: string | null = null;
    let minPrice: number | null = null;

    group.listings.forEach((pkg) => {
      if (!coverImage) {
        if (pkg.itinerary?.[0]?.imageUrls?.[0]) coverImage = pkg.itinerary[0].imageUrls[0];
        else if (pkg.itinerary?.[0]?.imageUrl) coverImage = pkg.itinerary[0].imageUrl;
        else if (pkg.placesCovered?.[0]?.imageUrls?.[0]) coverImage = pkg.placesCovered[0].imageUrls[0];
        else if (pkg.photos?.[0]) coverImage = pkg.photos[0];
      }

      const rawPrice = pkg.cost || pkg.price;
      if (rawPrice) {
        const pNum = parseFloat(String(rawPrice).replace(/[^0-9.]/g, ''));
        if (!isNaN(pNum) && pNum > 0) {
          if (minPrice === null || pNum < minPrice) minPrice = pNum;
        }
      }
    });

    const safeId = `dest-${key.replace(/[^a-z0-9]/g, '-')}`;

    sections.push({
      id: safeId,
      name: group.name,
      packageType: group.packageType,
      packageCount: group.listings.length,
      coverImage,
      startingPrice: minPrice,
      listings: group.listings,
    });
  });

  return sections.sort((a, b) => b.packageCount - a.packageCount);
}

/**
 * Returns list of distinct discovered destination names for tab pills navigation
 */
export function getDiscoveredDestinationPills(
  listings: PackageListing[],
  packageTypeFilter: 'all' | 'domestic' | 'international' = 'all'
): Array<{ name: string; packageType: 'domestic' | 'international'; count: number }> {
  const sections = getDynamicDestinationSections(listings, packageTypeFilter);
  return sections.map((s) => ({
    name: s.name,
    packageType: s.packageType,
    count: s.packageCount,
  }));
}

