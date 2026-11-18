import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from './ui/badge';
import { useComparison } from '@/contexts/ComparisonContext';
import { Star, MapPin, Calendar, DollarSign, Users, Eye, Edit, Trash2, Heart, Scale, CheckCircle2, Camera, Bus, Bed, Utensils, ChevronLeft, ChevronRight, ShieldCheck, Building2 } from 'lucide-react';
import { optimizeImageUrl, generateBlurPlaceholder, preloadImage } from '@/lib/imageOptimization';
import { injectImageStyles } from '@/lib/imageStyles';
import Link from 'next/link';
import { event } from '@/lib/gtag';
import { getDbInstance } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

// In-memory cache for agency profiles across cards to prevent duplicate queries
const agencyProfileCache = new Map<string, any>();

interface ListingCardProps {
  listing: any;
  onView?: (listing: any) => void;
  onEdit?: (listing: any) => void;
  onDelete?: (listingId: string) => void;
  onBook?: (listing: any) => void;
  onChat?: (listing: any) => void;
  onWishlist?: (listingId: string) => void;
  isWishlisted?: boolean;
  showActions?: boolean;
  variant?: 'user' | 'agency';
  showCompare?: boolean;
}

export default function ListingCard({ 
  listing, 
  onView, 
  onEdit, 
  onDelete, 
  onBook, 
  onChat, 
  onWishlist,
  isWishlisted,
  showActions = true,
  variant = 'user',
  showCompare = true
}: ListingCardProps) {
  const { addToComparison, removeFromComparison, isInComparison, canAddMore } = useComparison();
  const [showCompareToast, setShowCompareToast] = useState(false);
  const [compareToastMessage, setCompareToastMessage] = useState('');

  // Get all images for listing card carousel (deduplicated by base URL)
  // Prioritize Day-by-day itinerary photos in order, then dedicated photos & placesCovered
  const getAllImages = () => {
    const imagesSet = new Set<string>();
    const seenBaseUrls = new Set<string>();

    const addImage = (rawUrl: string) => {
      if (!rawUrl || typeof rawUrl !== 'string') return;
      const trimmed = rawUrl.trim();
      if (!trimmed) return;
      
      const baseUrl = trimmed.split('?')[0].toLowerCase();
      if (!seenBaseUrls.has(baseUrl)) {
        seenBaseUrls.add(baseUrl);
        imagesSet.add(trimmed);
      }
    };
    
    // Priority 1: Day-by-day itinerary photos (shows the trip journey sequentially)
    if (listing.itinerary && Array.isArray(listing.itinerary)) {
      listing.itinerary.forEach((day: any) => {
        if (day?.imageUrls && Array.isArray(day.imageUrls)) {
          day.imageUrls.forEach(addImage);
        } else if (day?.imageUrl) {
          addImage(day.imageUrl);
        }
      });
    }

    // Priority 2: Primary dedicated photos if uploaded directly to package
    if (listing.photos && Array.isArray(listing.photos)) {
      listing.photos.forEach(addImage);
    }
    const dedicatedPhotoObj = Array.isArray(listing.placesCovered)
      ? listing.placesCovered.find((p: any) => p?.id === 'photos')
      : null;
    if (dedicatedPhotoObj?.imageUrls && Array.isArray(dedicatedPhotoObj.imageUrls)) {
      dedicatedPhotoObj.imageUrls.forEach(addImage);
    }

    // Priority 3: Photos from placesCovered
    if (listing.placesCovered && Array.isArray(listing.placesCovered)) {
      listing.placesCovered.forEach((place: any) => {
        if (place?.imageUrls && Array.isArray(place.imageUrls)) {
          place.imageUrls.forEach(addImage);
        } else if (place?.imageUrl) {
          addImage(place.imageUrl);
        } else if (place?.image) {
          addImage(place.image);
        }
      });
    }

    // Priority 4: Direct listing imageUrls or imageUrl
    if (listing.imageUrls && Array.isArray(listing.imageUrls)) {
      listing.imageUrls.forEach(addImage);
    } else if (listing.imageUrl) {
      addImage(listing.imageUrl);
    }

    return Array.from(imagesSet);
  };

  const allImages = getAllImages();

  // Get main image from itinerary, placesCovered, photos, or listing imageUrl
  const getMainImage = () => {
    if (allImages.length > 0) return allImages[0];
    if (listing.itinerary && Array.isArray(listing.itinerary)) {
      for (const day of listing.itinerary) {
        if (day?.imageUrls && day.imageUrls.length > 0 && day.imageUrls[0]) return day.imageUrls[0];
        if (day?.imageUrl) return day.imageUrl;
      }
    }
    if (listing.placesCovered && listing.placesCovered.length > 0 && 
        listing.placesCovered[0].imageUrls && listing.placesCovered[0].imageUrls.length > 0) {
      return listing.placesCovered[0].imageUrls[0];
    }
    if (listing.photos && listing.photos.length > 0) {
      return listing.photos[0];
    }
    if (listing.imageUrls && listing.imageUrls.length > 0) {
      return listing.imageUrls[0];
    }
    if (listing.imageUrl) return listing.imageUrl;
    return null;
  };

  const mainImage = getMainImage();
  const duration = listing.itinerary?.length || 0;
  const nights = duration > 0 ? duration - 1 : 0;
  let rawPrice = listing.cost || listing.price || 'N/A';
  if (rawPrice !== 'N/A') {
    const numPrice = Number(rawPrice);
    if (!isNaN(numPrice)) {
      rawPrice = Math.round(numPrice).toString();
    }
  }
  const price = rawPrice;
  const packageType = listing.packageType === 'international' ? 'International' : 'Domestic';
  const currencySymbol = listing.packageType === 'international' ? '$' : '₹';
  const location = listing.packageType === 'international' 
    ? (listing.countryName || 'Country not specified')
    : (listing.stateName || 'State not specified');

  const packageCode = listing.id ? listing.id.slice(-4).toUpperCase() : '1045';
  const pickupLocation = listing.pickUpLocation || listing.placesCovered?.[0]?.name?.trim() || listing.stateName || 'Delhi';
  const dropLocation = listing.dropLocation || listing.placesCovered?.[listing.placesCovered.length - 1]?.name?.trim() || listing.stateName || 'Delhi';
  const cardTitle = listing.title || (listing.packageType === 'international' ? listing.countryName : listing.stateName) || `${packageType} Package`;
  const locationName = listing.packageType === 'international' ? listing.countryName : listing.stateName;

  // Calculate real rating & review count dynamically
  const getRatingInfo = () => {
    if (Array.isArray(listing.reviews) && listing.reviews.length > 0) {
      const validRatings = listing.reviews.map((r: any) => Number(r.rating)).filter((r: number) => !isNaN(r) && r > 0);
      if (validRatings.length > 0) {
        const sum = validRatings.reduce((a: number, b: number) => a + b, 0);
        return {
          rating: sum / validRatings.length,
          reviewsCount: listing.reviews.length,
          source: 'Real Reviews'
        };
      }
    }

    if (typeof listing.rating === 'number' && listing.rating > 0) {
      return {
        rating: listing.rating,
        reviewsCount: listing.reviewsCount || 0,
        source: 'Rating'
      };
    }

    const agencyRating = listing.agencyData?.googleRating || listing.agencyData?.rating;
    if (typeof agencyRating === 'number' && agencyRating > 0) {
      return {
        rating: agencyRating,
        reviewsCount: listing.agencyData?.googleReviewsCount || listing.agencyData?.reviewsCount || 0,
        source: 'Google Rating'
      };
    }

    return {
      rating: null,
      reviewsCount: 0,
      source: null
    };
  };

  const ratingInfo = getRatingInfo();
  const placesText = listing.placesCovered && listing.placesCovered.length > 0 
    ? listing.placesCovered.map((p: any) => p.name?.trim()).filter(Boolean).join(' | ') 
    : location;

  const renderFormattedTitle = (titleStr: string) => {
    if (!titleStr) return null;
    const match = titleStr.match(/^(.*?)\s*(\(.*?\))\s*$/);
    if (match && match[1] && match[2]) {
      return (
        <div className="flex flex-col justify-center w-full">
          <span className="font-bold text-[16px] text-gray-900 leading-tight truncate" title={match[1].trim()}>
            {match[1].trim()}
          </span>
          <span className="text-[12.5px] font-semibold text-slate-600 leading-snug truncate mt-0.5" title={match[2].trim()}>
            {match[2].trim()}
          </span>
        </div>
      );
    }
    return (
      <span className="font-bold text-[16px] text-gray-900 leading-[1.3] line-clamp-2" title={titleStr}>
        {titleStr}
      </span>
    );
  };

  // Generate optimized image URL with caching parameters
  const optimizedImageUrl = mainImage ? optimizeImageUrl(mainImage, {
    width: 600,
    quality: 80,
    format: 'auto',
    cacheBust: false
  }) : null;

  // Image loading states
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const handleImageLoad = () => {
    setImageLoaded(true);
  };

  const handleImageError = () => {
    setImageError(true);
    setImageLoaded(true); // Stop showing loading state
  };

  // Preload only the next image in the carousel on demand, rather than all images across all cards
  const preloadNextImage = () => {
    if (allImages.length > currentImageIndex + 1) {
      const nextImg = optimizeImageUrl(allImages[currentImageIndex + 1], {
        width: 600,
        quality: 80,
        format: 'auto',
        cacheBust: false,
      });
      preloadImage(nextImg).catch(() => {});
    }
  };

  // Generate a blur placeholder SVG
  const blurPlaceholder = generateBlurPlaceholder(400, 300, '#f3f4f6');

  // Dynamic Agency resolution with memory cache
  const agencyId = listing.agencyId || listing.userId || listing.agencyData?.id || '';

  const getInitialAgencyName = () => {
    const direct = listing.agencyName || listing.agencyData?.companyName || listing.companyName || listing.agencyData?.name || listing.agencyData?.displayName;
    if (direct && direct !== 'Travel Agency' && direct !== 'Verified Agency' && direct !== 'Unknown Agency' && direct !== 'Travel Partner') {
      return direct;
    }
    if (agencyId && agencyProfileCache.has(agencyId)) {
      const cached = agencyProfileCache.get(agencyId);
      const cachedName = cached?.companyName || cached?.name || cached?.displayName || cached?.agencyName;
      if (cachedName) return cachedName;
    }
    return direct || 'Travel Agency';
  };

  const getInitialAgencyLogo = () => {
    const directLogo = listing.agencyLogo || listing.logoUrl || listing.agencyData?.logoUrl || listing.agencyData?.agencyLogo || listing.agencyData?.avatarUrl || listing.agencyData?.logo;
    if (directLogo) return directLogo;
    if (agencyId && agencyProfileCache.has(agencyId)) {
      const cached = agencyProfileCache.get(agencyId);
      const cachedLogo = cached?.logoUrl || cached?.agencyLogo || cached?.avatarUrl || cached?.logo;
      if (cachedLogo) return cachedLogo;
    }
    return null;
  };

  const getInitialAgencyData = () => {
    if (listing.agencyData && Object.keys(listing.agencyData).length > 0) {
      return listing.agencyData;
    }
    if (agencyId && agencyProfileCache.has(agencyId)) {
      return agencyProfileCache.get(agencyId);
    }
    return null;
  };

  const [agencyData, setAgencyData] = useState<any>(getInitialAgencyData);
  const [agencyName, setAgencyName] = useState<string>(getInitialAgencyName);
  const [agencyLogo, setAgencyLogo] = useState<string | null>(getInitialAgencyLogo);

  useEffect(() => {
    const name = getInitialAgencyName();
    const logo = getInitialAgencyLogo();
    const data = getInitialAgencyData();
    if (name && name !== 'Travel Agency') setAgencyName(name);
    if (logo) setAgencyLogo(logo);
    if (data) setAgencyData(data);
  }, [listing.id, listing.agencyId, listing.agencyName, listing.agencyLogo, listing.agencyData]);

  useEffect(() => {
    let isMounted = true;
    if (!agencyId) return;

    const hasValidName = agencyName && agencyName !== 'Travel Agency' && agencyName !== 'Verified Agency' && agencyName !== 'Unknown Agency';
    const hasLogo = !!agencyLogo;
    if (hasValidName && hasLogo && agencyData) {
      if (!agencyProfileCache.has(agencyId)) {
        agencyProfileCache.set(agencyId, agencyData);
      }
      return;
    }

    if (agencyProfileCache.has(agencyId)) {
      const cached = agencyProfileCache.get(agencyId);
      if (isMounted) {
        const resolvedName = cached?.companyName || cached?.name || cached?.displayName || cached?.agencyName || agencyName;
        const resolvedLogo = cached?.logoUrl || cached?.agencyLogo || cached?.avatarUrl || cached?.logo || agencyLogo;
        if (resolvedName) setAgencyName(resolvedName);
        if (resolvedLogo) setAgencyLogo(resolvedLogo);
        setAgencyData(cached);
      }
      return;
    }

    async function fetchAgencyProfile() {
      try {
        const dbInstance = getDbInstance();
        if (!dbInstance) return;
        const agencyDoc = await getDoc(doc(dbInstance, 'users', agencyId));
        if (agencyDoc.exists()) {
          const data = agencyDoc.data();
          agencyProfileCache.set(agencyId, data);
          if (isMounted) {
            const resolvedName = data.companyName || data.name || data.displayName || data.agencyName || agencyName;
            const resolvedLogo = data.logoUrl || data.agencyLogo || data.avatarUrl || data.logo || null;
            if (resolvedName) setAgencyName(resolvedName);
            if (resolvedLogo) setAgencyLogo(resolvedLogo);
            setAgencyData(data);
          }
        }
      } catch (err) {
        console.warn('Error fetching agency info for card:', err);
      }
    }

    fetchAgencyProfile();

    return () => {
      isMounted = false;
    };
  }, [agencyId, agencyName, agencyLogo, agencyData]);

  const isAgencyVerified = !!(agencyData?.verified || listing.agencyData?.verified || listing.verified);

  const handleCompareToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isInComparison(listing.id)) {
      removeFromComparison(listing.id);
      setCompareToastMessage('Removed from compare');
      setShowCompareToast(true);
      setTimeout(() => setShowCompareToast(false), 2000);
    } else if (!canAddMore) {
      setCompareToastMessage('Max 3 packages allowed');
      setShowCompareToast(true);
      setTimeout(() => setShowCompareToast(false), 2000);
    } else {
      addToComparison({
        id: listing.id,
        title: cardTitle,
        description: listing.description,
        cost: listing.cost,
        price: listing.price,
        packageType: listing.packageType,
        stateName: listing.stateName,
        countryName: listing.countryName,
        duration: listing.duration,
        itinerary: listing.itinerary,
        placesCovered: listing.placesCovered,
        hotelTypes: listing.hotelTypes,
        inclusions: listing.inclusions,
        exclusions: listing.exclusions,
        agencyName: agencyName || listing.agencyName || listing.agencyData?.companyName || listing.companyName || listing.agencyData?.name || '',
        agencyId: agencyId || listing.agencyId || listing.userId || '',
        agencyData: agencyData || listing.agencyData,
        photos: listing.photos,
        rating: listing.rating,
        reviewsCount: listing.reviewsCount,
        tourCategories: listing.tourCategories,
      });
      window.dispatchEvent(new CustomEvent('floating-effect', {
        detail: { x: e.clientX, y: e.clientY, type: 'compare' }
      }));
      setCompareToastMessage('Added to compare!');
      setShowCompareToast(true);
      setTimeout(() => setShowCompareToast(false), 2000);
    }
  };

  return (
    <div
      onMouseEnter={preloadNextImage}
      className="bg-white/95 backdrop-blur-sm shadow-[0_4px_20px_rgba(0,0,0,0.04)] hover:shadow-[0_16px_36px_rgba(0,0,0,0.1)] transition-all duration-300 hover:-translate-y-1 relative overflow-hidden group flex flex-col h-full w-full max-w-[420px] mx-auto border border-slate-100/90 min-w-0"
      style={{ borderRadius: '6px' }}
    >
      {/* Compare Toast */}
      {showCompareToast && (
        <div className="absolute top-4 right-4 z-30 animate-in fade-in duration-200 pointer-events-none">
          <div className="bg-gray-900/90 backdrop-blur-sm text-white text-xs px-3 py-1.5 shadow-lg" style={{ borderRadius: '6px' }}>
            {compareToastMessage}
          </div>
        </div>
      )}

      {/* Top Right Action & Badges Overlay */}
      <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5">
        {/* Status Badge */}
        {!listing.approved && (
          <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200 shadow-sm px-2 py-0.5" style={{ borderRadius: '6px' }}>
            Pending
          </Badge>
        )}

        {/* Verification badge */}
        {isAgencyVerified && listing.approved && (
          <Badge variant="outline" className="bg-white/90 backdrop-blur-md text-emerald-700 border-white/40 text-[10px] px-2 py-1 shadow-sm flex items-center gap-1" style={{ borderRadius: '6px' }}>
            <ShieldCheck className="h-3 w-3 text-emerald-600" />
            Verified
          </Badge>
        )}

        {/* Compare Button on Card */}
        {variant === 'user' && showCompare && (
          <button
            onClick={handleCompareToggle}
            className={`p-1.5 backdrop-blur-md transition-all duration-200 border shadow-sm flex items-center justify-center cursor-pointer active:scale-90 ${
              isInComparison(listing.id)
                ? 'bg-blue-600 text-white border-blue-500 shadow-blue-500/30 ring-2 ring-blue-300'
                : 'bg-white/85 hover:bg-white text-slate-700 hover:text-blue-600 border-white/60 hover:shadow'
            }`}
            style={{ borderRadius: '6px' }}
            title={isInComparison(listing.id) ? 'In Comparison (Click to remove)' : 'Add to Compare'}
            aria-label={isInComparison(listing.id) ? 'In Comparison' : 'Add to Compare'}
          >
            <Scale className="h-3.5 w-3.5" />
          </button>
        )}

        {/* Wishlist Button on Card */}
        {variant === 'user' && onWishlist && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onWishlist(listing.id);
            }}
            className={`p-1.5 backdrop-blur-md transition-all duration-200 border shadow-sm flex items-center justify-center cursor-pointer active:scale-90 ${
              isWishlisted
                ? 'bg-rose-500 text-white border-rose-400 shadow-rose-500/30'
                : 'bg-white/85 hover:bg-white text-slate-700 hover:text-rose-500 border-white/60 hover:shadow'
            }`}
            style={{ borderRadius: '6px' }}
            title={isWishlisted ? 'Remove from Wishlist' : 'Add to Wishlist'}
            aria-label={isWishlisted ? 'Remove from Wishlist' : 'Add to Wishlist'}
          >
            <Heart className={`h-3.5 w-3.5 ${isWishlisted ? 'fill-current text-white' : ''}`} />
          </button>
        )}
      </div>

      {/* Image Section (Top, full width) */}
      <div className="relative w-full h-[190px] sm:h-[220px] bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden">
        {/* Pills overlay */}
        <div className="absolute top-3 left-3 z-20 flex flex-wrap gap-1.5 max-w-[calc(100%-85px)]">
          {/* Domestic/International badge */}
          <span
            className="bg-[#DCEBF4]/90 backdrop-blur-md text-[#1a5f7a] px-2.5 py-0.5 sm:px-3 sm:py-1 text-[10px] sm:text-[11px] font-semibold shadow-sm border border-white/20 truncate max-w-[120px] sm:max-w-none"
            style={{ borderRadius: '6px' }}
          >
            {packageType}
          </span>
          {/* Tour Categories badge */}
          {listing.tourCategories && listing.tourCategories.length > 0 && (
            <span
              className="bg-[#F8E7C0]/90 backdrop-blur-md text-[#8C6D1F] px-2.5 py-0.5 sm:px-3 sm:py-1 text-[10px] sm:text-[11px] font-semibold shadow-sm border border-white/20 truncate max-w-[130px] sm:max-w-none"
              style={{ borderRadius: '6px' }}
            >
              {listing.tourCategories[0]} Tour
            </span>
          )}
        </div>

        {/* Loading Skeleton */}
        {!imageLoaded && (
          <div className="absolute inset-0 bg-gray-200 animate-pulse">
            <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300"></div>
          </div>
        )}

        {/* Error State */}
        {imageError && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
            <Camera className="h-8 w-8 text-gray-400" />
          </div>
        )}

        {/* Image content */}
        {allImages.length > 1 ? (
          <div className="relative w-full h-full group/image overflow-hidden">
            <div 
              className="flex w-full h-full transition-transform duration-300 ease-out"
              style={{ transform: `translateX(-${currentImageIndex * 100}%)` }}
            >
              {allImages.map((imgUrl, idx) => (
                <div key={idx} className="w-full h-full shrink-0 relative overflow-hidden">
                  <img
                    src={optimizeImageUrl(imgUrl, {
                      width: 600,
                      quality: 80,
                      format: 'auto',
                      cacheBust: false
                    })}
                    alt={locationName ? `${locationName} - ${cardTitle} - Photo ${idx + 1}` : `${cardTitle} photo ${idx + 1}`}
                    className="w-full h-full object-cover transition-transform duration-700 ease-out scale-100 group-hover/image:scale-105"
                    loading={idx === 0 ? "eager" : "lazy"}
                    decoding="async"
                    onLoad={idx === currentImageIndex ? handleImageLoad : undefined}
                    onError={idx === currentImageIndex ? handleImageError : undefined}
                  />
                </div>
              ))}
            </div>
            
            {/* Navigation Arrows */}
            {currentImageIndex > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentImageIndex((prev) => Math.max(0, prev - 1));
                }}
                className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-800 p-1.5 shadow-sm hover:shadow transition-all duration-200 opacity-100 sm:opacity-0 sm:group-hover/image:opacity-100 hover:scale-110 active:scale-95 focus:outline-none z-20 cursor-pointer"
                style={{ borderRadius: '6px' }}
                aria-label="Previous image"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}
            
            {currentImageIndex < allImages.length - 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentImageIndex((prev) => Math.min(allImages.length - 1, prev + 1));
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-800 p-1.5 shadow-sm hover:shadow transition-all duration-200 opacity-100 sm:opacity-0 sm:group-hover/image:opacity-100 hover:scale-110 active:scale-95 focus:outline-none z-20 cursor-pointer"
                style={{ borderRadius: '6px' }}
                aria-label="Next image"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            )}

            {/* Pagination Dots */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 bg-black/30 backdrop-blur-[2px] px-2 py-1 opacity-100 sm:opacity-0 sm:group-hover/image:opacity-100 transition-all duration-200 z-20" style={{ borderRadius: '6px' }}>
              {allImages.map((_, idx) => (
                <button
                  key={idx}
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentImageIndex(idx);
                  }}
                  className={`h-1.5 rounded-[2px] transition-all duration-200 ${
                    idx === currentImageIndex 
                      ? 'w-4 bg-white' 
                      : 'w-1.5 bg-white/60 hover:bg-white/80'
                  }`}
                  aria-label={`Go to slide ${idx + 1}`}
                />
              ))}
            </div>
          </div>
        ) : optimizedImageUrl && !imageError ? (
          <>
            {!imageLoaded && (
              <img
                src={blurPlaceholder}
                alt=""
                className="absolute inset-0 w-full h-full object-cover blur-sm"
                style={{ filter: 'blur(5px)' }}
              />
            )}
            <img
              src={optimizedImageUrl}
              alt={locationName ? `${locationName} - ${cardTitle}` : cardTitle}
              className={`w-full h-full object-cover transition-transform duration-700 ease-out ${
                imageLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-105'
              } group-hover:scale-105`}
              onLoad={handleImageLoad}
              onError={handleImageError}
              loading="lazy"
              decoding="async"
            />
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-50 text-gray-400 text-sm">
            No image available
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="p-3 sm:p-4 flex-1 flex flex-col justify-between gap-2.5 sm:gap-3.5 min-w-0">
        
        {/* Top Content: Agency Header + Title + Location + Rating */}
        <div className="flex flex-col gap-1.5 sm:gap-2 min-w-0">
          
          {/* Agency Name with Logo Header */}
          <div className="flex items-center justify-between gap-2 min-w-0 pb-1.5 border-b border-slate-100">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              {/* Agency Logo Avatar */}
              <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full overflow-hidden border border-slate-200/90 bg-gradient-to-br from-amber-50 to-orange-100 shrink-0 flex items-center justify-center shadow-2xs">
                {agencyLogo ? (
                  <img
                    src={optimizeImageUrl(agencyLogo, { width: 48, quality: 80, format: 'auto', cacheBust: false })}
                    alt={agencyName}
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                ) : (
                  <Building2 className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-amber-600" />
                )}
              </div>

              {/* Agency Name */}
              <span
                className="text-[12px] sm:text-[12.5px] font-bold text-slate-800 tracking-tight truncate"
                title={agencyName}
              >
                {agencyName}
              </span>

              {/* Verified Shield Badge next to name */}
              {isAgencyVerified && (
                <span className="inline-flex items-center text-emerald-600 shrink-0" title="Verified Agency">
                  <ShieldCheck className="h-3.5 w-3.5" />
                </span>
              )}
            </div>
          </div>

          {/* Title and Rating */}
          <div className="flex flex-col gap-0.5 sm:gap-1 min-w-0">
            <div className="min-h-[42px] sm:min-h-[48px] flex items-center overflow-hidden w-full">
              {renderFormattedTitle(cardTitle)}
            </div>
            <div className="h-[20px] flex items-center">
              {listing.title && location && (
                <div className="flex items-center text-[11.5px] sm:text-[12px] font-bold tracking-wide text-slate-700 truncate w-full">
                  <span className="truncate" style={{ fontFamily: 'var(--font-outfit), var(--font-jakarta), sans-serif' }} title={location}>{location}</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5 min-h-[20px] flex-wrap">
              {ratingInfo.rating ? (
                <>
                  <span className="font-bold text-[12px] sm:text-[12.5px] text-gray-900 leading-none">
                    {ratingInfo.rating.toFixed(1)}
                  </span>
                  <div className="flex items-center">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star 
                        key={s} 
                        className={`h-[12px] w-[12px] sm:h-[13px] sm:w-[13px] ${
                          s <= Math.round(ratingInfo.rating!) ? 'fill-[#FFC107] text-[#FFC107]' : 'text-gray-200'
                        }`} 
                      />
                    ))}
                  </div>
                  <span className="text-gray-500 font-medium text-[11px] sm:text-[11.5px] truncate">
                    {ratingInfo.reviewsCount > 0 
                      ? `(${ratingInfo.reviewsCount} ${ratingInfo.reviewsCount === 1 ? 'review' : 'reviews'})`
                      : (ratingInfo.source || 'Rating')}
                  </span>
                </>
              ) : (
                <span className="text-slate-400 text-[11px] sm:text-[11.5px] font-medium flex items-center gap-1">
                  <Star className="h-3 w-3 text-slate-300 fill-slate-300" />
                  No reviews yet
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Icons Row - 4 equal columns grid for clean mobile responsiveness */}
        <div className="grid grid-cols-4 items-center gap-1 px-0.5 py-0.5 w-full">
          <div className="flex flex-col items-center text-center gap-1 min-w-0">
            <Camera className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600 stroke-[1.5] shrink-0" />
            <span className="text-[10px] sm:text-[12px] font-medium text-gray-700 truncate w-full">Sightseeing</span>
          </div>
          <div className="flex flex-col items-center text-center gap-1 min-w-0">
            <Bus className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600 stroke-[1.5] shrink-0" />
            <span className="text-[10px] sm:text-[12px] font-medium text-gray-700 truncate w-full">Transport</span>
          </div>
          <div className="flex flex-col items-center text-center gap-1 min-w-0">
            <Bed className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600 stroke-[1.5] shrink-0" />
            <span className="text-[10px] sm:text-[12px] font-medium text-gray-700 truncate w-full">Hotel Stay</span>
          </div>
          <div className="flex flex-col items-center text-center gap-1 min-w-0">
            <Utensils className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600 stroke-[1.5] shrink-0" />
            <span className="text-[10px] sm:text-[12px] font-medium text-gray-700 truncate w-full">Meals</span>
          </div>
        </div>

        {/* Divider */}
        <hr className="border-gray-200 w-full" />

        {/* Details Section */}
        <div className="flex flex-col gap-2 px-0.5 min-w-0">
          {/* Duration Row */}
          <div className="flex items-center justify-between">
            <span className="text-[11.5px] sm:text-[12px] text-gray-500 font-medium">
              Duration
            </span>
            <span className="font-semibold text-gray-900 text-[12px] sm:text-[12.5px]">
              {duration}D | {nights}N
            </span>
          </div>

          {/* Pick-up & Drop 2 Columns */}
          <div className="grid grid-cols-2 divide-x divide-gray-200 items-start pt-1.5 border-t border-gray-100">
            <div className="flex flex-col text-left min-w-0 pr-2 sm:pr-3">
              <span className="text-[10.5px] sm:text-[11px] text-gray-500 font-medium mb-0.5">Pick-up</span>
              <span className="text-[11px] sm:text-[12px] text-gray-900 font-medium leading-snug break-words [overflow-wrap:anywhere]" title={pickupLocation}>
                {(pickupLocation || '').replace(/\s*\/\s*/g, ' / ')}
              </span>
            </div>
            <div className="flex flex-col text-left min-w-0 pl-2 sm:pl-3">
              <span className="text-[10.5px] sm:text-[11px] text-gray-500 font-medium mb-0.5">Drop</span>
              <span className="text-[11px] sm:text-[12px] text-gray-900 font-medium leading-snug break-words [overflow-wrap:anywhere]" title={dropLocation}>
                {(dropLocation || '').replace(/\s*\/\s*/g, ' / ')}
              </span>
            </div>
          </div>
        </div>

        {/* Divider */}
        <hr className="border-gray-200 w-full" />

        {/* Bottom Actions Row - Fluid & Responsive across all phone sizes */}
        <div className="flex items-end justify-between pt-1 gap-2 min-w-0">
          {/* Price Column */}
          <div className="flex flex-col shrink-0 self-stretch justify-end pb-0.5 sm:pb-1 min-w-0">
            <span className="text-[10.5px] sm:text-[12px] text-gray-500 whitespace-nowrap">Starting from</span>
            {price && price !== 'N/A' && price !== '' ? (
              <div className="flex flex-col mt-0.5">
                <span className="text-[18px] sm:text-[22px] font-bold text-gray-900 leading-none tracking-tight mb-0.5 sm:mb-1 whitespace-nowrap">
                  {currencySymbol}{price}
                </span>
                <span className="text-[10.5px] sm:text-[12px] text-gray-500 leading-none whitespace-nowrap">per person</span>
              </div>
            ) : (
              <span className="text-[13px] sm:text-[14px] font-bold text-gray-900 mt-1 whitespace-nowrap">Contact Agent</span>
            )}
          </div>

          {/* Buttons Column */}
          {showActions && (
            <div className="flex items-center gap-1.5 sm:gap-2 flex-1 max-w-[280px] justify-end min-w-0">
              {variant === 'user' ? (
                <>
                  <Link 
                    href={`/package/${listing.id}`} 
                    className="block flex-1 min-w-0"
                    onClick={(e) => {
                      event({
                        action: 'package_view_click',
                        category: 'package',
                        label: cardTitle || listing.title || listing.id,
                      });
                      if (onView) {
                        e.preventDefault();
                        onView(listing);
                        if (typeof window !== 'undefined') {
                          window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
                        }
                      }
                    }}
                  >
                    <Button 
                      className="w-full h-[40px] sm:h-[44px] px-2 sm:px-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold text-[12.5px] sm:text-[13.5px] shadow-sm hover:shadow transition-all truncate border border-amber-400/40 active:scale-[0.98]"
                      style={{ borderRadius: '6px' }}
                    >
                      View Details
                    </Button>
                  </Link>
                  
                  {/* Chat Button - Responsive compact icon on small mobile, expanded with label on larger screens */}
                  <Button 
                    className="h-[40px] sm:h-[44px] w-[40px] sm:w-[120px] px-0 sm:px-2 bg-[#D84315] hover:bg-[#BF360C] text-white font-semibold text-[11.5px] sm:text-[12px] shadow-sm hover:shadow transition-all flex items-center justify-center gap-1.5 shrink-0 active:scale-[0.98]"
                    style={{ borderRadius: '6px' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      event({
                        action: 'chat_agent_click',
                        category: 'chat',
                        label: agencyName || listing.agencyName || cardTitle || listing.id,
                      });
                      onChat?.({
                        ...listing,
                        agencyName: agencyName || listing.agencyName,
                        agencyData: agencyData || listing.agencyData,
                        agencyLogo: agencyLogo || listing.agencyLogo || listing.logoUrl,
                      });
                    }}
                    title="Chat with Agency"
                    aria-label="Chat with Agency"
                  >
                    <div className="h-5 w-5 shrink-0 flex items-center justify-center">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 sm:w-5 sm:h-5">
                        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
                        <path d="M8 12h.01" />
                        <path d="M12 12h.01" />
                        <path d="M16 12h.01" />
                      </svg>
                    </div>
                    <span className="hidden sm:inline text-left leading-[1.15]">Chat with<br/>Agency</span>
                  </Button>
                </>
              ) : (
                <>
                  <Button 
                    className="flex-1 h-[40px] sm:h-[44px] bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold text-[12.5px] sm:text-[13.5px] shadow-sm transition-all min-w-0 truncate" 
                    style={{ borderRadius: '6px' }}
                    onClick={() => onView?.(listing)}
                  >
                    View Details
                  </Button>
                  <div className="flex flex-col gap-1 sm:gap-1.5 w-[75px] sm:w-[88px] shrink-0">
                    <Button
                      variant="outline"
                      className="flex-1 h-[19px] sm:h-[21px] border-[#1961CA] text-[#1961CA] hover:bg-[#F0F6FF] font-medium text-[10px] sm:text-[11px] transition-colors px-1"
                      style={{ borderRadius: '6px' }}
                      onClick={() => onEdit?.(listing)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 h-[19px] sm:h-[21px] border-[#E53935] text-[#E53935] hover:bg-[#FFEBEE] font-medium text-[10px] sm:text-[11px] transition-colors px-1"
                      style={{ borderRadius: '6px' }}
                      onClick={() => onDelete?.(listing.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}