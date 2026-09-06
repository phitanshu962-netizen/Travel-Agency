import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useComparison } from '@/contexts/ComparisonContext';
import { optimizeImageUrl, preloadImage } from '@/lib/imageOptimization';
import { getDbInstance } from '@/lib/firebase';
import { collection, query, where, getDocs, addDoc, doc, getDoc } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { event } from '@/lib/gtag';
import {
  Star,
  Share2,
  Scale,
  Heart,
  MapPin,
  Calendar,
  ChevronRight,
  ChevronLeft,
  Camera,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  MessageCircle,
  CheckCircle2,
  AlertCircle,
  Building2,
  ShieldCheck,
  Banknote,
  Plus,
  Utensils,
  Home,
  Tag,
  Sunrise,
  Compass,
  Hotel,
  Clock,
  Globe,
  Users,
  User,
} from 'lucide-react';

interface PackageDetailViewProps {
  listing: any;
  onBack: () => void;
  onBook?: (listing: any) => void;
  onChat?: (listing: any) => void;
  onWishlist?: (listingId: string) => void;
  isWishlisted?: boolean;
  isPreview?: boolean;
  onRequireLogin?: () => void;
}

// Sample FAQ data
const defaultFAQs = [
  {
    question: "What is the best time to visit?",
    answer: "The best time to visit depends on the destination. Generally, spring (March-May) and autumn (September-November) offer pleasant weather for most locations."
  },
  {
    question: "Is travel insurance included?",
    answer: "Travel insurance is not included by default but can be added as an optional extra during booking. We recommend all travelers have comprehensive travel insurance."
  },
  {
    question: "Can I customize the itinerary?",
    answer: "Yes! We offer flexible itineraries. You can discuss customization options with our travel experts after booking. Additional charges may apply for major changes."
  },
  {
    question: "What is the cancellation policy?",
    answer: "Cancellations made 30+ days before departure receive a full refund. 15-30 days: 75% refund. 7-14 days: 50% refund. Less than 7 days: no refund."
  },
  {
    question: "Are meals included in the package?",
    answer: "Meal inclusions vary by package. Please check the Tour Inclusion section for specific meal plan details for this package."
  }
];

const CITY_ALIASES: Record<string, string> = {
  'ahemdabad': 'Ahmedabad',
  'ahemedabad': 'Ahmedabad',
  'ahmadabad': 'Ahmedabad',
  'ahmedabad': 'Ahmedabad',
  'bengaluru': 'Bengaluru',
  'bangalore': 'Bengaluru',
  'bombay': 'Mumbai',
  'mumbai': 'Mumbai',
  'calcutta': 'Kolkata',
  'kolkata': 'Kolkata',
  'madras': 'Chennai',
  'chennai': 'Chennai',
  'gurgaon': 'Gurugram',
  'gurugram': 'Gurugram',
  'pondicherry': 'Puducherry',
  'puducherry': 'Puducherry',
  'banaras': 'Varanasi',
  'benares': 'Varanasi',
  'kashi': 'Varanasi',
  'varanasi': 'Varanasi',
  'allahabad': 'Prayagraj',
  'prayagraj': 'Prayagraj',
  'cochin': 'Kochi',
  'kochi': 'Kochi',
  'trivandrum': 'Thiruvananthapuram',
  'thiruvananthapuram': 'Thiruvananthapuram',
  'baroda': 'Vadodara',
  'vadodara': 'Vadodara',
  'vizag': 'Visakhapatnam',
  'visakhapatnam': 'Visakhapatnam',
  'ooty': 'Ooty',
  'ootacamund': 'Ooty',
  'udagamandalam': 'Ooty',
  'mysore': 'Mysore',
  'mysuru': 'Mysore',
  'coorg': 'Coorg',
  'kodagu': 'Coorg',
  'pondichery': 'Puducherry',
};

const cleanPlaceNameForSEO = (name: string) => {
  if (!name) return '';
  const parts = name.split(/[\s\-\–\—→\u2192⇒\u21d2·•\/\\|,\.\(\)]+/);
  const noiseWords = /^(full|half|guided|scenic|enroute|en-route|leisure|free|optional|morning|afternoon|evening|today|start|end|return|back|arrival|departure|transfer|sightseeing|local|tour|visit|trip|journey|welcome|explore|in|at|from|to|for|via|by|towards|of|and|&|an|a|the|airport|station|railway|hotel|resort|day|night|nights|days|excursion|drive|activities|stay|overnight|tourist|spot|spots)$/i;
  const cleanedParts = parts.filter(part => part && !noiseWords.test(part));
  if (cleanedParts.length === 0) return '';
  return cleanedParts.map(w => {
    const lower = w.toLowerCase();
    return CITY_ALIASES[lower] || (w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
  }).join(' ');
};

export const cleanDayPrefix = (text: string): string => {
  if (!text) return '';
  let cleaned = text.replace(/^(?:day\s*(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s*[:\-\.]*\s*)+/i, '').trim();
  if (cleaned.length > 0) {
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }
  return cleaned;
};

// Pure Real Review Data Processor (No Static / Mock Reviews)
function getReviewsData(listing: any, userDbReviews: any[]) {
  const locationName = listing?.packageType === 'international' ? listing?.countryName : listing?.stateName;
  const packageTitle = listing?.title || locationName || 'Travel Package';
  const embeddedReviews = Array.isArray(listing?.reviews) ? listing.reviews : [];

  // Combine real user reviews from Firestore database & embedded listing reviews
  const allRawUserReviews = [...userDbReviews, ...embeddedReviews];

  const formattedUserReviews = allRawUserReviews.map((r, i) => ({
    id: r.id || `user-rev-${i}`,
    name: r.name || r.userName || "Verified Traveller",
    date: r.createdAt
      ? `Reviewed: ${new Date(r.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`
      : (r.date ? `Reviewed: ${r.date}` : "Reviewed recently"),
    rating: Number(r.rating) || 5.0,
    booked: packageTitle,
    travelledFrom: r.travelledFrom || "",
    text: r.comment || r.text || r.reviewText || "",
    images: r.photos || r.images || []
  }));

  const totalReviewsCount = formattedUserReviews.length;

  // Calculate real average rating
  let avgRating = 0;
  if (totalReviewsCount > 0) {
    const totalSum = formattedUserReviews.reduce((acc, r) => acc + r.rating, 0);
    avgRating = Math.round((totalSum / totalReviewsCount) * 10) / 10;
  }

  // Calculate real rating breakdown
  const breakdownCounts: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  formattedUserReviews.forEach(r => {
    const star = Math.min(5, Math.max(1, Math.round(r.rating)));
    breakdownCounts[star] = (breakdownCounts[star] || 0) + 1;
  });

  const ratingBreakdown = [5, 4, 3, 2, 1].map(stars => {
    const count = breakdownCounts[stars] || 0;
    const percentage = totalReviewsCount > 0 ? Math.round((count / totalReviewsCount) * 100) : 0;
    return { stars, count, percentage };
  });

  // Extract traveller photos uploaded in real reviews
  const travellerImages: string[] = [];
  formattedUserReviews.forEach(r => {
    if (Array.isArray(r.images) && r.images.length > 0) {
      travellerImages.push(...r.images);
    }
  });

  return {
    packageTitle,
    userReviews: formattedUserReviews,
    totalReviewsCount,
    avgRating,
    ratingBreakdown,
    travellerImages
  };
}

// Helper to format hotel types beautifully
const getFormattedHotelTypes = (types: any) => {
  if (!types) return 'Standard';
  if (Array.isArray(types)) {
    if (types.length === 0) return 'Standard';
    return types.map((h: string) => {
      if (typeof h !== 'string') return String(h);
      return h.charAt(0).toUpperCase() + h.slice(1).toLowerCase();
    }).join(' | ');
  }
  if (typeof types === 'string') {
    return types.split(',')
      .map(t => t.trim())
      .filter(Boolean)
      .map(t => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase())
      .join(' | ');
  }
  return 'Standard';
};

// Helper to format meal plans beautifully
const getFormattedMealPlan = (plan: any) => {
  const formatSingle = (m: string) => {
    if (m === 'breakfast-dinner') return 'Breakfast & Dinner';
    if (m === 'breakfast-lunch') return 'Breakfast & Lunch';
    if (m === 'lunch-dinner') return 'Lunch & Dinner';
    if (m === 'all-meals') return 'All Meals';
    if (m === 'no-meal') return 'No Meal';
    return m.charAt(0).toUpperCase() + m.slice(1).toLowerCase();
  };

  if (!plan) return 'No Meals';
  if (Array.isArray(plan)) {
    if (plan.length === 0) return 'No Meals';
    return plan.map((m: string) => formatSingle(m)).join(' | ');
  }
  if (typeof plan === 'string') {
    return plan.split(',')
      .map(t => t.trim())
      .filter(Boolean)
      .map(m => formatSingle(m))
      .join(' | ');
  }
  return 'No Meals';
};

function DayImageGallery({ images, altText }: { images: string[]; altText: string }) {
  const [activeIdx, setActiveIdx] = useState(0);

  if (!images || images.length === 0) return null;

  if (images.length === 1) {
    return (
      <div className="rounded-lg overflow-hidden relative shadow-sm border border-stone-200" style={{ height: '200px' }}>
        <img
          src={optimizeImageUrl(images[0], { width: 600, quality: 85, format: 'auto', cacheBust: false })}
          alt={altText}
          className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
          loading="lazy"
        />
      </div>
    );
  }

  return (
    <div className="rounded-lg overflow-hidden relative group shadow-sm border border-stone-200" style={{ height: '200px' }}>
      {/* Images container with smooth slide/fade */}
      <div className="relative w-full h-full">
        {images.map((imgUrl, idx) => (
          <img
            key={idx}
            src={optimizeImageUrl(imgUrl, { width: 600, quality: 85, format: 'auto', cacheBust: false })}
            alt={`${altText} - Photo ${idx + 1}`}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
              idx === activeIdx ? 'opacity-100 z-10' : 'opacity-0 z-0'
            }`}
            loading="lazy"
          />
        ))}
      </div>

      {/* Dark gradient overlay at bottom */}
      <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/60 to-transparent z-20 pointer-events-none" />

      {/* Top right count badge */}
      <div className="absolute top-2 right-2 z-20 bg-black/60 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5 rounded-full border border-white/20">
        {activeIdx + 1} / {images.length}
      </div>

      {/* Prev / Next Arrows */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setActiveIdx((prev) => (prev === 0 ? images.length - 1 : prev - 1));
        }}
        className="absolute left-1.5 top-1/2 -translate-y-1/2 z-30 bg-black/60 hover:bg-black/80 text-white p-1.5 rounded-full opacity-80 hover:opacity-100 transition-all cursor-pointer shadow-md"
        aria-label="Previous image"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setActiveIdx((prev) => (prev + 1) % images.length);
        }}
        className="absolute right-1.5 top-1/2 -translate-y-1/2 z-30 bg-black/60 hover:bg-black/80 text-white p-1.5 rounded-full opacity-80 hover:opacity-100 transition-all cursor-pointer shadow-md"
        aria-label="Next image"
      >
        <ChevronRight className="h-4 w-4" />
      </button>

      {/* Dot Indicators */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5">
        {images.map((_, idx) => (
          <button
            key={idx}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setActiveIdx(idx);
            }}
            className={`transition-all duration-300 rounded-full cursor-pointer ${
              idx === activeIdx ? 'w-4 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/50 hover:bg-white'
            }`}
          />
        ))}
      </div>
    </div>
  );
}

export default function PackageDetailView({
  listing,
  onBack,
  onBook,
  onChat,
  onWishlist,
  isWishlisted,
  isPreview = false,
  onRequireLogin
}: PackageDetailViewProps) {
  const { user } = useAuth();
  const [expandedDays, setExpandedDays] = useState<number[]>([]);
  const [expandedFAQs, setExpandedFAQs] = useState<number[]>([]);
  const [showAllPhotos, setShowAllPhotos] = useState(false);
  const [showCompareToast, setShowCompareToast] = useState(false);
  const [compareToastMessage, setCompareToastMessage] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(true);
  const [showStickyBar, setShowStickyBar] = useState(false);
  const [selectedGalleryImage, setSelectedGalleryImage] = useState<string | null>(null);

  const offeredByRef = useRef<HTMLDivElement>(null);
  const autoSlideRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Review specific states
  const [userDbReviews, setUserDbReviews] = useState<any[]>([]);
  const [showWriteReviewModal, setShowWriteReviewModal] = useState(false);
  const [newReview, setNewReview] = useState({
    name: '',
    travelledFrom: '',
    rating: 5,
    tripType: 'Family',
    comment: '',
    photoUrl: ''
  });
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  const handleRequireLogin = () => {
    if (onRequireLogin) {
      onRequireLogin();
    } else {
      window.dispatchEvent(new CustomEvent('tripdm:open-auth', { detail: { tab: 'login' } }));
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      handleRequireLogin();
      return;
    }
    const listingId = listing?.id || listing?.docId;
    if (!listingId || !newReview.comment.trim()) return;

    setIsSubmittingReview(true);
    try {
      const reviewPayload = {
        listingId,
        packageTitle: listing.title || 'Travel Package',
        userId: user.uid,
        author: newReview.name.trim() || user.displayName || user.email?.split('@')[0] || 'Verified Traveller',
        location: newReview.travelledFrom.trim() || 'India',
        rating: Number(newReview.rating) || 5,
        tripType: newReview.tripType || 'Family',
        text: newReview.comment.trim(),
        date: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        verified: true,
        createdAt: Date.now(),
        images: newReview.photoUrl ? [newReview.photoUrl] : []
      };

      const db = getDbInstance();
      if (db) {
        await addDoc(collection(db, 'reviews'), reviewPayload);
        setUserDbReviews(prev => [reviewPayload, ...prev]);
      }
      setShowWriteReviewModal(false);
      setNewReview({
        name: '',
        travelledFrom: '',
        rating: 5,
        tripType: 'Family',
        comment: '',
        photoUrl: ''
      });
      alert('Thank you! Your review has been submitted.');
    } catch (error) {
      console.error('Error submitting review:', error);
      alert('Failed to submit review. Please try again.');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // Sticky bar observer: trigger as soon as "Offered By" section scrolls out of view
  useEffect(() => {
    if (listing?.id) {
      event({
        action: 'package_view',
        category: 'package',
        label: listing.title || listing.stateName || listing.countryName || listing.id,
      });
    }
  }, [listing?.id]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setShowStickyBar(!entry.isIntersecting && entry.boundingClientRect.top <= 0);
      },
      { threshold: 0 }
    );
    if (offeredByRef.current) observer.observe(offeredByRef.current);
    return () => {
      if (offeredByRef.current) observer.unobserve(offeredByRef.current);
    };
  }, []);

  // Fetch reviews
  useEffect(() => {
    const fetchPackageReviews = async () => {
      const listingId = listing?.id || listing?.docId;
      if (!listingId) return;
      try {
        const res = await fetch(`/api/reviews?listingId=${encodeURIComponent(listingId)}`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.reviews)) { setUserDbReviews(data.reviews); return; }
        }
        const db = getDbInstance();
        if (db) {
          const q = query(collection(db, 'reviews'), where('listingId', '==', listingId));
          const querySnapshot = await getDocs(q);
          const fetched: any[] = [];
          querySnapshot.forEach((doc) => { fetched.push({ id: doc.id, ...doc.data() }); });
          setUserDbReviews(fetched);
        }
      } catch (error) { console.error('Error fetching package reviews:', error); }
    };
    fetchPackageReviews();
  }, [listing?.id, listing?.docId]);

  // Dynamic Agency resolution
  const [fetchedAgencyData, setFetchedAgencyData] = useState<any>(listing?.agencyData || null);
  const [fetchedAgencyName, setFetchedAgencyName] = useState<string>(
    listing?.agencyName || listing?.agencyData?.companyName || listing?.companyName || ''
  );

  useEffect(() => {
    setFetchedAgencyData(listing?.agencyData || null);
    setFetchedAgencyName(listing?.agencyName || listing?.agencyData?.companyName || listing?.companyName || '');
  }, [listing?.id, listing?.agencyId, listing?.agencyName, listing?.agencyData]);

  useEffect(() => {
    async function fetchAgency() {
      const agencyId = listing?.agencyId || listing?.userId;
      if (!agencyId) return;
      const dbInstance = getDbInstance();
      if (dbInstance) {
        try {
          const agencyDoc = await getDoc(doc(dbInstance, 'users', agencyId));
          if (agencyDoc.exists()) {
            const data = agencyDoc.data();
            setFetchedAgencyData(data);
            const resolvedName = data.companyName || data.name || data.agencyName || data.displayName || '';
            if (resolvedName) {
              setFetchedAgencyName(resolvedName);
            }
          }
        } catch (e) {
          console.error('Error fetching agency in PackageDetailView:', e);
        }
      }
    }

    if (!fetchedAgencyName || fetchedAgencyName === 'Travel Agency' || fetchedAgencyName === 'Verified Agency' || !fetchedAgencyData) {
      fetchAgency();
    }
  }, [listing?.id, listing?.agencyId, listing?.userId, fetchedAgencyName, fetchedAgencyData]);

  const activeAgencyData = fetchedAgencyData || listing?.agencyData;
  const activeAgencyName = (fetchedAgencyName && fetchedAgencyName !== 'Travel Agency' && fetchedAgencyName !== 'Verified Agency')
    ? fetchedAgencyName
    : (activeAgencyData?.companyName || activeAgencyData?.name || activeAgencyData?.displayName || listing?.agencyName || 'Travel Agency');

  // Get all images from placesCovered, photos, and itinerary (deduplicated by base URL)
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

    // 1. Day-by-day itinerary photos first (ensures top banner starts with Day 1 and follows chronological tour sequence)
    if (listing.itinerary && Array.isArray(listing.itinerary)) {
      listing.itinerary.forEach((day: any) => {
        if (day?.imageUrls && Array.isArray(day.imageUrls)) {
          day.imageUrls.forEach(addImage);
        } else if (day?.imageUrl) {
          addImage(day.imageUrl);
        }
      });
    }

    // 2. Dedicated package photos (if uploaded directly)
    if (listing.photos && Array.isArray(listing.photos)) {
      listing.photos.forEach(addImage);
    }
    const dedicatedPhotoObj = Array.isArray(listing.placesCovered)
      ? listing.placesCovered.find((p: any) => p?.id === 'photos')
      : null;
    if (dedicatedPhotoObj?.imageUrls && Array.isArray(dedicatedPhotoObj.imageUrls)) {
      dedicatedPhotoObj.imageUrls.forEach(addImage);
    }

    // 3. Any additional photos from placesCovered
    if (listing.placesCovered && Array.isArray(listing.placesCovered)) {
      listing.placesCovered.forEach((place: any) => {
        if (place?.imageUrls && Array.isArray(place.imageUrls)) {
          place.imageUrls.forEach(addImage);
        }
      });
    }
    return Array.from(imagesSet);
  };
  const allImages = getAllImages();

  // Create loop array for smooth 2-up sliding carousel (1-2, 2-3, 3-4, 4-5, 5-1)
  const loopImages = useMemo(() => {
    if (allImages.length <= 1) return allImages;
    return [...allImages, allImages[0], allImages[1] || allImages[0]];
  }, [allImages]);

  // Auto-slide every 4 seconds, infinite loop
  useEffect(() => {
    if (allImages.length <= 1) return;
    autoSlideRef.current = setInterval(() => {
      setCurrentIndex(prev => prev + 1);
    }, 4000);
    return () => {
      if (autoSlideRef.current) clearInterval(autoSlideRef.current);
    };
  }, [allImages.length]);

  // Handle infinite loop transitions seamlessly
  useEffect(() => {
    if (currentIndex >= allImages.length) {
      const timer = setTimeout(() => {
        setIsTransitioning(false);
        setCurrentIndex(0);
      }, 800);
      return () => clearTimeout(timer);
    } else {
      setIsTransitioning(true);
    }
  }, [currentIndex, allImages.length]);

  const displayImageIndex = allImages.length > 0 ? (currentIndex % allImages.length) : 0;

  const handleNext = () => {
    if (allImages.length <= 1) return;
    setCurrentIndex(prev => prev + 1);
  };

  const handlePrev = () => {
    if (allImages.length <= 1) return;
    if (currentIndex === 0) {
      setIsTransitioning(false);
      setCurrentIndex(allImages.length);
      setTimeout(() => {
        setIsTransitioning(true);
        setCurrentIndex(allImages.length - 1);
      }, 50);
    } else {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const handleDotClick = (idx: number) => {
    setIsTransitioning(true);
    setCurrentIndex(idx);
  };

  // Preload all listing images on mount
  useEffect(() => {
    if (allImages.length > 0) {
      allImages.forEach(imgUrl => {
        const optimized = optimizeImageUrl(imgUrl, { width: 1200, quality: 85, format: 'auto', cacheBust: false });
        preloadImage(optimized).catch(() => {});
      });
    }
  }, [allImages]);

  const handleAddReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReview.comment.trim()) return;
    setIsSubmittingReview(true);
    const listingId = listing?.id || listing?.docId || 'default-package';
    const reviewData = {
      listingId,
      name: newReview.name.trim() || 'Verified Traveller',
      travelledFrom: newReview.travelledFrom.trim() || 'Guest',
      rating: newReview.rating,
      tripType: newReview.tripType || 'Family',
      comment: newReview.comment.trim(),
      photos: newReview.photoUrl.trim() ? [newReview.photoUrl.trim()] : [],
      createdAt: new Date().toISOString()
    };
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reviewData)
      });
      if (!res.ok) {
        const db = getDbInstance();
        if (db) await addDoc(collection(db, 'reviews'), reviewData);
      }
    } catch (error) { console.warn('API review submission fallback:', error); }
    finally {
      setUserDbReviews(prev => [reviewData, ...prev]);
      setShowWriteReviewModal(false);
      setNewReview({ name: '', travelledFrom: '', rating: 5, tripType: 'Family', comment: '', photoUrl: '' });
      setCompareToastMessage('Thank you! Your review has been submitted.');
      setShowCompareToast(true);
      setTimeout(() => setShowCompareToast(false), 3000);
      setIsSubmittingReview(false);
    }
  };

  const reviewsData = getReviewsData(listing, userDbReviews);
  const { addToComparison, removeFromComparison, isInComparison, canAddMore, comparisonList } = useComparison();

  const duration = listing.itinerary?.length || listing.duration || 0;
  const nights = duration > 0 ? duration - 1 : 0;

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: listing.title || 'Travel Package',
          text: `Check out this amazing travel package: ${listing.title || 'Travel Package'}!`,
          url: window.location.href,
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        setCompareToastMessage('Link copied to clipboard!');
        setShowCompareToast(true);
        setTimeout(() => setShowCompareToast(false), 3000);
      }
    } catch (err) { console.error('Error sharing:', err); }
  };

  // Parse inclusions and exclusions into arrays
  const parseList = (input: any) => {
    if (!input) return [];
    if (Array.isArray(input)) return input.filter(item => typeof item === 'string' && item.trim() !== '');
    return String(input).split('\n').filter(item => item.trim() !== '');
  };

  const inclusions = parseList(listing.inclusions);
  const exclusions = parseList(listing.exclusions);

  const toggleDay = (day: number) => {
    setExpandedDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
  };

  const toggleFAQ = (index: number) => {
    setExpandedFAQs(prev => prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]);
  };

  // Get unique places/cities to display (filtering out activity descriptions & noise sentences)
  const getDisplayPlaces = () => {
    const STANDALONE_NOISE = new Set([
      'end', 'ends', 'start', 'starts', 'return', 'back', 'arrival', 'departure',
      'transfer', 'sightseeing', 'local', 'tour', 'visit', 'trip', 'journey',
      'welcome', 'explore', 'day', 'night', 'nights', 'days', 'excursion',
      'drive', 'activities', 'stay', 'overnight', 'pickup', 'drop', 'checkin',
      'checkout', 'flight', 'airport', 'station', 'railway', 'hotel', 'resort',
      'tourist', 'spot', 'spots', 'city', 'temple', 'temples', 'museum', 'museums',
      'experience', 'experiences', 'birthplace', 'overview', 'service', 'services',
      'package', 'destination', 'destinations', 'full', 'half', 'guided', 'scenic',
      'leisure', 'free', 'optional', 'morning', 'afternoon', 'evening', 'today',
      'waterfall', 'waterfalls', 'fall', 'falls', 'lake', 'lakes', 'river', 'rivers',
      'cave', 'caves', 'canyon', 'canyons', 'valley', 'valleys', 'viewpoint', 'viewpoints',
      'peak', 'peaks', 'hill', 'hills', 'boating', 'safari', 'trek', 'trekking',
      'beach', 'beaches', 'park', 'parks', 'sanctuary', 'sanctuaries', 'garden', 'gardens',
      'fort', 'forts', 'palace', 'palaces', 'monument', 'monuments', 'shrine', 'shrines',
      'bridge', 'bridges', 'pass', 'passes', 'dam', 'dams', 'cinema', 'cinemas',
      'film', 'films', 'studio', 'studios', 'wonderland', 'kingdom', 'wild', 'wildlife',
      'expedition', 'discovery', 'adventure', 'escape', 'retreat', 'gateway', 'haven',
      'into', 'through', 'magic', 'wonders', 'essence', 'beauty', 'glimpse'
    ]);

    const isNoisePlace = (text: string): boolean => {
      if (!text) return true;
      const lower = text.toLowerCase().trim();
      
      if (STANDALONE_NOISE.has(lower)) return true;

      // Filter out activity, attraction, and description keywords
      const NOISE_PATTERN = /\b(museums?|temples?|experiences?|birthplace|ends?|starts?|city|activities|sightseeings?|attractions?|shopping|photography|local|tourist\s+spots?|overview|checkin|checkout|transfer|departure|arrival|itinerary|day\s+\d+|night\s+\d+|special|service|services|package|waterfalls?|falls?|lakes?|rivers?|caves?|canyons?|valleys?|viewpoints?|peaks?|hills?|boating|safari|trekking|beaches?|parks?|sanctuary|gardens?|forts?|palaces?|monuments?|shrines?|bridges?|dams?|cinemas?|films?|studios?|wonderland|kingdom|world\s+of|wild|wildlife|expedition|discovery|adventure|escape|retreat|gateway|haven|into\s+the|heart\s+of|land\s+of)\b/i;
      
      if (NOISE_PATTERN.test(lower)) return true;
      
      // Filter out overly long sentence phrases (> 3 words)
      const words = lower.split(/\s+/).filter(Boolean);
      if (words.length > 3) return true;

      return false;
    };

    const cleanPlaceName = (rawName: string): string[] => {
      if (!rawName) return [];
      
      // Normalize separators: dash, en-dash, em-dash, arrows, slash, dot, comma, parenthesis
      const normalized = rawName
        .replace(/[\-–—→\u2192⇒\u21d2·•\/\\|,\.\(\)]/g, ',')
        .replace(/\b(to|towards|via|and|&)\b/gi, ',');
      
      const result: string[] = [];
      const leadingNoise = /^(full|half|guided|scenic|enroute|en-route|leisure|free|optional|morning|afternoon|evening|today|start|end|return|back|arrival|departure|transfer|sightseeing|local|tour|visit|trip|journey|welcome|explore|day|night|nights|days|excursion|drive|activities|stay|overnight|pickup|drop|checkin|checkout|flight|at|from|in|to|for|via|by|towards|of|and|&|an|a|the|airport|station|railway|hotel|resort|tourist|spot|spots)\b\s*/i;
      const trailingNoise = /\s*\b(full|half|guided|scenic|enroute|en-route|leisure|free|optional|morning|afternoon|evening|today|start|end|return|back|arrival|departure|transfer|sightseeing|local|tour|visit|trip|journey|welcome|explore|day|night|nights|days|excursion|drive|activities|stay|overnight|pickup|drop|checkin|checkout|flight|at|from|in|to|for|via|by|towards|of|and|&|an|a|the|airport|station|railway|hotel|resort|tourist|spot|spots)$/i;

      normalized.split(',').forEach(part => {
        let cleaned = part.trim();
        let prev = '';
        while (cleaned !== prev) {
          prev = cleaned;
          cleaned = cleaned.replace(/^[^a-zA-Z0-9\s]+/g, '').trim();
          cleaned = cleaned.replace(/[^a-zA-Z0-9\s]+$/g, '').trim();
          cleaned = cleaned.replace(leadingNoise, '').trim();
          cleaned = cleaned.replace(trailingNoise, '').trim();
        }
        
        if (cleaned && !isNoisePlace(cleaned)) {
          const lower = cleaned.toLowerCase();
          const capitalized = CITY_ALIASES[lower] || cleaned.split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
          result.push(capitalized);
        }
      });
      return result;
    };

    let rawPlaces: string[] = [];
    const covered = listing.placesCovered?.map((p: any) => p.name?.trim()).filter((name: any) => name && name !== 'photos') || [];
    if (covered.length > 0 && !(covered.length === 1 && covered[0] === '')) {
      rawPlaces = covered;
    } else {
      rawPlaces = listing.itinerary?.map((d: any) => d.placeName?.trim()).filter(Boolean) || [];
    }
    
    const cleanedPlaces = new Set<string>();
    rawPlaces.forEach((place: string) => {
      cleanPlaceName(place).forEach(c => cleanedPlaces.add(c));
    });
    
    const finalPlaces = Array.from(cleanedPlaces);
    if (finalPlaces.length > 0) return finalPlaces;

    // Fallback to pickUpLocation or state/country if placesCovered contained only activity noise phrases
    if (listing.pickUpLocation) {
      cleanPlaceName(listing.pickUpLocation).forEach(c => cleanedPlaces.add(c));
    }
    if (cleanedPlaces.size === 0 && (listing.stateName || listing.countryName)) {
      const loc = listing.stateName || listing.countryName || '';
      if (loc) cleanedPlaces.add(loc);
    }

    return Array.from(cleanedPlaces);
  };

  // Generate breadcrumb
  const getBreadcrumb = () => {
    const parts: string[] = ['Home'];
    if (listing.packageType === 'domestic') {
      parts.push('Domestic');
      const states = listing.stateNames && listing.stateNames.length > 0 ? listing.stateNames.join(', ') : listing.stateName;
      if (states) parts.push(states);
    } else {
      parts.push('International');
      const countries = listing.countryNames && listing.countryNames.length > 0 ? listing.countryNames.join(', ') : listing.countryName;
      if (countries) parts.push(countries);
    }
    const locationName = listing.packageType === 'international' ? listing.countryName : listing.stateName;
    const cleanTitle = (listing.title || locationName || 'Package').replace(/\s*\(.*?\)\s*$/, '').trim();
    parts.push(cleanTitle || 'Package');
    return parts;
  };

  const locationName = listing.packageType === 'international' ? listing.countryName : listing.stateName;
  const detailTitle = listing.title || locationName || 'Travel Package';
  const breadcrumb = getBreadcrumb();
  const packageCode = `PKG${listing.id?.slice(-4).toUpperCase() || '0000'}`;

  // Helper to parse and format experience types with proper commas
  const parseExperienceTypes = (expInput: string[] | string | undefined | null): string[] => {
    if (!expInput) return [];

    const splitSingleString = (trimmed: string): string[] => {
      if (!trimmed) return [];
      if (trimmed.includes(',') || trimmed.includes(';') || trimmed.includes('|') || trimmed.includes('\n')) {
        return trimmed.split(/[,;|\n]+/).map(s => s.trim()).filter(Boolean);
      }

      const KNOWN_PHRASES = [
        'Wildlife Zoo & Safari',
        'Wildlife Zoo and Safari',
        'Heritage Museum Tour',
        'Heritage Museum',
        'Religious Spiritual Tour',
        'Spiritual Tour',
        'Temple Tour',
        'Cultural Tour',
        'Heritage Tour',
        'Wildlife Safari',
        'Local Sightseeing',
        'Family Vacation',
        'Family Tour',
        'Friends Trip',
        'Friends Tour',
        'Water Sports',
        'Hill Station',
        'Religious',
        'Pilgrimage',
        'Shopping',
        'Photography',
        'Trekking',
        'Adventure',
        'Wildlife',
        'Cultural',
        'Honeymoon',
        'Beach',
        'Snow'
      ];

      let textToParse = trimmed;
      const matched: string[] = [];
      const sortedPhrases = [...KNOWN_PHRASES].sort((a, b) => b.length - a.length);

      for (const phrase of sortedPhrases) {
        const regex = new RegExp(`\\b${phrase.replace(/&/g, '\\&')}\\b`, 'gi');
        if (regex.test(textToParse)) {
          matched.push(phrase);
          textToParse = textToParse.replace(regex, ' ').trim();
        }
      }

      if (matched.length > 0) {
        const remaining = textToParse.split(/\s+/).filter(Boolean);
        return [...matched, ...remaining];
      }

      return [trimmed];
    };

    let rawList: string[] = [];
    if (Array.isArray(expInput)) {
      expInput.forEach(item => {
        if (typeof item === 'string') {
          rawList.push(...splitSingleString(item.trim()));
        }
      });
    } else if (typeof expInput === 'string') {
      rawList = splitSingleString(expInput.trim());
    }

    const uniqueCleaned = new Set<string>();
    rawList.forEach(item => {
      if (!item) return;
      const cleaned = item
        .trim()
        .split(/\s+/)
        .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ')
        .replace(/\bAnd\b/gi, '&');
      if (cleaned) uniqueCleaned.add(cleaned);
    });

    return Array.from(uniqueCleaned);
  };

  const parsedExpTypes = parseExperienceTypes(listing.experienceType);

  // Gather all tags for the badge row
  const tags: string[] = [];
  if (Array.isArray(listing.tourCategories) && listing.tourCategories.length > 0) {
    listing.tourCategories.forEach((c: string) => tags.push(`${c} Tour`));
  } else {
    tags.push('Family Tour');
  }
  if (parsedExpTypes.length > 0) {
    tags.push(...parsedExpTypes);
  }
  if (listing.season) {
    tags.push(listing.season === 'all-seasons' ? 'All Seasons' : `${listing.season} Season`);
  }

  const currencySymbol = listing.packageType === 'international' ? '$' : '₹';

  // Round price to remove .99 decimals (same logic as ListingCard)
  const rawCost = listing.cost || listing.price;
  const displayPrice = rawCost
    ? (!isNaN(Number(rawCost)) ? Math.round(Number(rawCost)).toString() : String(rawCost))
    : null;

  // Compact info items for sidebar (all 7 required fields)
  const infoItems = [
    {
      icon: Tag,
      label: 'Tour Category',
      value: parseExperienceTypes(listing.tourCategories).join(', ') || 'General'
    },
    {
      icon: Sunrise,
      label: 'Seasonal',
      value: listing.season
        ? (listing.season === 'all-seasons' ? 'All Seasons' : listing.season.charAt(0).toUpperCase() + listing.season.slice(1))
        : 'All Year'
    },
    {
      icon: Compass,
      label: 'Experience Type',
      value: parsedExpTypes.length > 0 ? parsedExpTypes.join(', ') : 'Adventure'
    },
    {
      icon: Utensils,
      label: 'Meal Plan',
      value: getFormattedMealPlan(listing.mealPlan)
    },
    {
      icon: Clock,
      label: 'Duration',
      value: `${duration}D / ${nights}N`
    },
    {
      icon: MapPin,
      label: 'City',
      value: getDisplayPlaces().join(', ') || 'N/A'
    },
    {
      icon: Hotel,
      label: 'Hotel Type',
      value: getFormattedHotelTypes(listing.hotelTypes)
    },
    ...(listing.packageType === 'domestic' ? [{
      icon: Globe,
      label: 'State(s)',
      value: listing.stateNames && listing.stateNames.length > 0 ? listing.stateNames.join(', ') : (listing.stateName || 'N/A')
    }] : [{
      icon: Globe,
      label: 'Country/Countries',
      value: listing.countryNames && listing.countryNames.length > 0 ? listing.countryNames.join(', ') : (listing.countryName || 'N/A')
    }])
  ];

  return (
    <div className="min-h-screen pb-36 md:pb-12" style={{ background: '#ffffff', fontFamily: "var(--font-inter, 'Inter', sans-serif)" }}>

      {/* ─── HERO IMAGE SECTION ─────────────────────────────────── */}
      <div className="relative w-full h-[400px] sm:h-[460px] md:h-[520px]">
        {allImages.length > 0 ? (
          <div className="absolute inset-0 overflow-hidden">
            {allImages.length === 1 ? (
              <img
                src={optimizeImageUrl(allImages[0], { width: 1400, quality: 90, format: 'auto', cacheBust: false })}
                alt={locationName ? `${locationName} - ${listing.title || 'Travel Package'}` : (listing.title || 'Travel Package')}
                className="w-full h-full object-cover"
                loading="eager"
              />
            ) : (
              <div 
                className="flex h-full"
                style={{
                  width: `${loopImages.length * 50}%`,
                  transform: `translateX(-${(100 / loopImages.length) * currentIndex}%)`,
                  transition: isTransitioning ? 'transform 800ms cubic-bezier(0.16, 1, 0.3, 1)' : 'none',
                }}
              >
                {loopImages.map((img: string, idx: number) => (
                  <div 
                    key={idx} 
                    style={{ width: `${100 / loopImages.length}%` }} 
                    className="h-full relative px-[2px] bg-stone-900"
                  >
                    <img
                      src={optimizeImageUrl(img, { width: 1000, quality: 90, format: 'auto', cacheBust: false })}
                      alt={locationName ? `${locationName} - ${listing.title || 'Travel Package'} - Photo ${idx + 1}` : `${listing.title} photo ${idx + 1}`}
                      className="w-full h-full object-cover"
                      loading={idx < 2 ? 'eager' : 'lazy'}
                    />
                  </div>
                ))}
              </div>
            )}
            {/* Gradient overlay with top white shadow gradient without black top shadow */}
            <div
              className="absolute inset-0 z-10 pointer-events-none"
              style={{ background: 'linear-gradient(to bottom, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.05) 20%, rgba(0,0,0,0.2) 60%, rgba(0,0,0,0.75) 100%)' }}
            />
          </div>
        ) : (
          <div className="absolute inset-0 bg-stone-800 flex items-center justify-center">
            <Camera className="h-20 w-20 text-stone-500" />
          </div>
        )}

        {/* Hero content overlay */}
        <div className="relative z-20 h-full flex flex-col justify-between px-3.5 sm:px-6 pt-3.5 sm:pt-6 pb-4 sm:pb-5 max-w-7xl mx-auto">
          {/* Top row: breadcrumb + action buttons */}
          <div className="flex items-center justify-between gap-2">
            {/* Breadcrumb (Desktop) & Back Button */}
            <div className="flex items-center gap-3">
              <button
                onClick={onBack}
                className="flex items-center gap-1.5 text-white bg-black/40 hover:bg-black/60 active:scale-95 backdrop-blur-md px-3 py-1.5 rounded-full text-xs font-semibold transition-all border border-white/25 shadow-sm"
                aria-label="Go back"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back</span>
              </button>

              <nav className="hidden md:flex items-center gap-1.5 text-xs text-white/80">
                <button onClick={onBack} className="hover:text-white transition-colors flex items-center gap-1">
                  <Home className="h-3.5 w-3.5" /> Home
                </button>
                {breadcrumb.slice(1).map((part, i) => (
                  <React.Fragment key={i}>
                    <ChevronRight className="h-3 w-3 text-white/50" />
                    <span className={i === breadcrumb.length - 2 ? 'text-white font-medium' : 'hover:text-white cursor-pointer transition-colors'}>{part}</span>
                  </React.Fragment>
                ))}
              </nav>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              {!isPreview && (
                <>
                  <button
                    onClick={handleShare}
                    className="flex items-center justify-center gap-1.5 text-white bg-black/40 hover:bg-black/60 active:scale-90 backdrop-blur-md p-2 sm:px-3 sm:py-1.5 rounded-full text-xs font-medium transition-all border border-white/25 shadow-sm min-w-[34px] min-h-[34px]"
                    title="Share"
                    aria-label="Share package"
                  >
                    <Share2 className="h-4 w-4" />
                    <span className="hidden sm:inline">Share</span>
                  </button>
                  <button
                    onClick={() => onWishlist?.(listing.id)}
                    className={`flex items-center justify-center gap-1.5 backdrop-blur-md p-2 sm:px-3 sm:py-1.5 rounded-full text-xs font-medium transition-all border active:scale-90 shadow-sm min-w-[34px] min-h-[34px] ${isWishlisted ? 'bg-red-500 text-white border-red-400' : 'text-white bg-black/40 hover:bg-black/60 border-white/25'}`}
                    title={isWishlisted ? 'Saved' : 'Save'}
                    aria-label={isWishlisted ? 'Saved to wishlist' : 'Save to wishlist'}
                  >
                    <Heart className={`h-4 w-4 ${isWishlisted ? 'fill-current text-white' : ''}`} />
                    <span className="hidden sm:inline">{isWishlisted ? 'Saved' : 'Save'}</span>
                  </button>
                  <button
                    onClick={() => {
                      if (isInComparison(listing.id)) {
                        removeFromComparison(listing.id);
                        setCompareToastMessage('Removed from comparison');
                        setShowCompareToast(true);
                        setTimeout(() => setShowCompareToast(false), 3000);
                      } else if (!canAddMore) {
                        setCompareToastMessage('You can only compare up to 3 packages. Remove one to add this.');
                        setShowCompareToast(true);
                        setTimeout(() => setShowCompareToast(false), 3000);
                      } else {
                        const success = addToComparison({
                          id: listing.id,
                          title: listing.title,
                          description: listing.description,
                          cost: listing.cost,
                          price: listing.price,
                          packageType: listing.packageType,
                          stateName: listing.stateName,
                          countryName: listing.countryName,
                          stateNames: listing.stateNames,
                          countryNames: listing.countryNames,
                          duration: listing.duration,
                          itinerary: listing.itinerary,
                          placesCovered: listing.placesCovered,
                          hotelTypes: listing.hotelTypes,
                          inclusions: listing.inclusions,
                          exclusions: listing.exclusions,
                          agencyName: listing.agencyName || listing.agencyData?.companyName || listing.companyName || '',
                          agencyId: listing.agencyId || listing.userId || '',
                          agencyData: listing.agencyData,
                          photos: listing.photos,
                          rating: listing.rating,
                          reviewsCount: listing.reviewsCount,
                          tourCategories: listing.tourCategories,
                        });
                        if (success) {
                          setCompareToastMessage(`Added to comparison! (${comparisonList.length + 1}/3 packages)`);
                          setShowCompareToast(true);
                          setTimeout(() => setShowCompareToast(false), 3000);
                        }
                      }
                    }}
                    className={`flex items-center justify-center gap-1.5 backdrop-blur-md p-2 sm:px-3 sm:py-1.5 rounded-full text-xs font-medium transition-all border active:scale-90 shadow-sm min-w-[34px] min-h-[34px] ${isInComparison(listing.id) ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-500/30' : 'text-white bg-black/40 hover:bg-black/60 border-white/25'}`}
                    title={isInComparison(listing.id) ? 'Comparing (Click to remove)' : 'Compare'}
                    aria-label={isInComparison(listing.id) ? 'Comparing package' : 'Compare package'}
                  >
                    <Scale className="h-4 w-4" />
                    <span className="hidden sm:inline">{isInComparison(listing.id) ? 'Comparing' : 'Compare'}</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Bottom: title, tags, image indicators */}
          <div>
            {/* Location Tagline (if custom title is present) */}
            {listing.title && locationName && (
              <div className="text-[11px] sm:text-[12px] font-bold uppercase tracking-widest text-orange-400 mb-1.5" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.6)' }}>
                {locationName}
              </div>
            )}

            {/* Package Title */}
            {(() => {
              const match = detailTitle.match(/^(.*?)\s*(\(.*?\))\s*$/);
              if (match && match[1] && match[2]) {
                return (
                  <div className="mb-2.5 sm:mb-3">
                    <h1
                      className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white leading-tight"
                      style={{ fontFamily: "var(--font-playfair, 'Playfair Display', Georgia, serif)", textShadow: '0 2px 10px rgba(0,0,0,0.6)' }}
                    >
                      {match[1].trim()}
                    </h1>
                    <div
                      className="text-base sm:text-xl md:text-2xl lg:text-3xl font-semibold text-white/95 mt-1 leading-snug tracking-wide"
                      style={{ fontFamily: "var(--font-playfair, 'Playfair Display', Georgia, serif)", textShadow: '0 2px 8px rgba(0,0,0,0.6)' }}
                    >
                      {match[2].trim()}
                    </div>
                  </div>
                );
              }
              return (
                <h1
                  className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-2.5 sm:mb-3 leading-tight"
                  style={{ fontFamily: "var(--font-playfair, 'Playfair Display', Georgia, serif)", textShadow: '0 2px 10px rgba(0,0,0,0.6)' }}
                >
                  {detailTitle}
                </h1>
              );
            })()}

            {/* Places, duration, rating row */}
            <div className="flex items-center flex-wrap gap-2 sm:gap-3 text-white/90 text-xs mb-3 sm:mb-4">
              <span className="flex items-center gap-1.5 text-[11px] sm:text-xs bg-black/40 backdrop-blur-md px-2.5 sm:px-3 py-1 rounded-full border border-white/20 font-semibold" style={{ fontFamily: "var(--font-playfair, 'Playfair Display', Georgia, serif)" }}>
                <MapPin className="h-3.5 w-3.5 text-orange-400" />
                {getDisplayPlaces().join(' · ') || 'Multiple Destinations'}
              </span>
              <span className="flex items-center gap-1.5 text-[11px] sm:text-xs bg-black/40 backdrop-blur-md px-2.5 sm:px-3 py-1 rounded-full border border-white/20">
                <Clock className="h-3.5 w-3.5" />
                {duration}D / {nights}N
              </span>
              {!isPreview && reviewsData.totalReviewsCount > 0 && (
                <span className="flex items-center gap-1.5 text-[11px] sm:text-xs bg-amber-500/90 backdrop-blur-md px-2.5 sm:px-3 py-1 rounded-full border border-amber-400/50 font-medium">
                  <Star className="h-3.5 w-3.5 fill-current" />
                  {reviewsData.avgRating.toFixed(1)} · {reviewsData.totalReviewsCount} reviews
                </span>
              )}
            </div>

            {/* Image dot indicators & View All Photos button */}
            {allImages.length > 1 && (
              <div className="flex items-center gap-2">
                {allImages.slice(0, 6).map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleDotClick(idx)}
                    className={`transition-all duration-300 rounded-full ${idx === displayImageIndex ? 'w-5 sm:w-6 h-1.5 sm:h-2 bg-white' : 'w-1.5 sm:w-2 h-1.5 sm:h-2 bg-white/50 hover:bg-white/75'}`}
                  />
                ))}
                <span className="text-white/75 text-[11px] sm:text-xs ml-1 font-medium">{displayImageIndex + 1}/{allImages.length}</span>
                <button
                  onClick={() => setShowAllPhotos(true)}
                  className="ml-auto flex items-center gap-1.5 text-white bg-black/40 hover:bg-black/60 active:scale-95 backdrop-blur-md px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-medium transition-all border border-white/25 shadow-sm"
                >
                  <Camera className="h-3.5 w-3.5" /> View All ({allImages.length})
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Prev/Next arrows on hero */}
        {allImages.length > 1 && (
          <>
            <button
              onClick={handlePrev}
              className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-20 bg-black/35 hover:bg-black/60 active:scale-90 backdrop-blur-md text-white rounded-full p-1.5 sm:p-2.5 transition-all border border-white/30 shadow-md cursor-pointer"
              aria-label="Previous image"
            >
              <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
            <button
              onClick={handleNext}
              className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-20 bg-black/35 hover:bg-black/60 active:scale-90 backdrop-blur-md text-white rounded-full p-1.5 sm:p-2.5 transition-all border border-white/30 shadow-md cursor-pointer"
              aria-label="Next image"
            >
              <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
          </>
        )}
      </div>

      {/* ─── MAIN CONTENT ────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* ── LEFT / MAIN COLUMN ───────────────────────────────── */}
          <div className="lg:col-span-2 space-y-7">

            {/* Description */}
            {listing.description && (
              <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-6 md:p-8">
                <p className="text-gray-700 leading-relaxed text-base">
                  {listing.description}
                </p>
              </div>
            )}

            {/* ── ITINERARY ── magazine editorial layout */}
            <div>
              <div className="py-6 border-b border-stone-100 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: '#b84814' }}>
                  <Calendar className="h-4 w-4 text-white" />
                </div>
                <h2 className="text-xl font-bold text-gray-900" style={{ fontFamily: "var(--font-playfair, 'Playfair Display', Georgia, serif)" }}>Itinerary</h2>
              </div>

              {listing.itinerary && listing.itinerary.length > 0 ? (
                <div className="divide-y divide-stone-100">
                  {listing.itinerary.map((day: any, index: number) => {
                    // Convert number to ordinal word (one, two, three…)
                    const dayWords = ['ONE','TWO','THREE','FOUR','FIVE','SIX','SEVEN','EIGHT','NINE','TEN',
                      'ELEVEN','TWELVE','THIRTEEN','FOURTEEN','FIFTEEN','SIXTEEN','SEVENTEEN','EIGHTEEN','NINETEEN','TWENTY'];
                    const dayLabel = dayWords[(day.day || index + 1) - 1] || `${day.day || index + 1}`;

                    // Gather all images for this day (without random fallback for days with no images)
                    let dayImages: string[] = [];
                    if (Array.isArray(day.imageUrls) && day.imageUrls.length > 0) {
                      dayImages = day.imageUrls.filter(Boolean);
                    } else if (day.imageUrl) {
                      dayImages = [day.imageUrl];
                    } else if (Array.isArray(day.images) && day.images.length > 0) {
                      dayImages = day.images.map((f: any) => (typeof f === 'string' ? f : (f.url || ''))).filter(Boolean);
                    }

                    if (dayImages.length === 0 && listing.placesCovered) {
                      const matchedPlace = listing.placesCovered.find(
                        (p: any) => p.name?.trim().toLowerCase() === (day.placeName || '').trim().toLowerCase()
                      );
                      if (matchedPlace?.imageUrls?.length > 0) {
                        dayImages = matchedPlace.imageUrls.filter(Boolean);
                      }
                    }

                    const hasDayImages = dayImages.length > 0;

                    return (
                      <div key={day.id || index} className="py-8">
                        {/* Day label with dot */}
                        <div className="flex items-center gap-2.5 mb-3">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ background: '#b84814' }}
                          />
                          <span
                            className="text-[11px] font-bold uppercase tracking-[0.2em]"
                            style={{ color: '#b84814', fontFamily: "var(--font-playfair, 'Playfair Display', Georgia, serif)" }}
                          >
                            Day {dayLabel}
                          </span>
                        </div>

                        {/* Title */}
                        <h3
                          className="text-2xl md:text-3xl font-bold text-gray-900 leading-tight mb-5"
                          style={{ fontFamily: "var(--font-playfair, 'Playfair Display', Georgia, serif)" }}
                        >
                          {cleanDayPrefix(day.placeName) || `Day ${day.day} Activities`}
                        </h3>

                        {/* 2-column: text left, image right */}
                        <div className={`flex gap-6 ${hasDayImages ? 'flex-col md:flex-row' : ''}`}>
                          {/* Description */}
                          <div className={hasDayImages ? 'md:flex-1 md:max-w-[55%]' : 'w-full'}>
                            <p className="text-gray-600 leading-relaxed text-[15px]">
                              {cleanDayPrefix(day.description) || 'Detailed itinerary for this day will be shared upon booking confirmation.'}
                            </p>
                          </div>

                          {/* Image Gallery (1 photo, multi-photo auto-carousel, or none) */}
                          {hasDayImages && (
                            <div className="md:w-[42%] shrink-0">
                              <DayImageGallery
                                images={dayImages}
                                altText={locationName && day.placeName ? `${locationName} - ${cleanPlaceNameForSEO(day.placeName)}` : (day.placeName || `Day ${day.day}`)}
                              />
                            </div>
                          )}
                        </div>

                        {/* Italic tip/note — shown when day has a tip/note field, otherwise a gentle quote */}
                        {(day.tip || day.note || day.highlight) && (
                          <div className="mt-5 pl-5 border-l-2 border-stone-200">
                            <p className="text-sm text-stone-400 italic leading-relaxed">
                              "{day.tip || day.note || day.highlight}"
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-10 text-center text-gray-400">
                  <Calendar className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  <p className="text-sm">Detailed itinerary will be available soon.</p>
                </div>
              )}
            </div>


          </div>

          {/* ── RIGHT SIDEBAR ────────────────────────────────────── */}
          <div className="lg:col-span-1" style={{ fontFamily: "var(--font-dm-sans, 'DM Sans', 'Inter', sans-serif)" }}>
            <div className="space-y-0">

              {/* ── Price block — floats on page, no card ── */}
              <div className="pb-5 border-b border-stone-200">
                <p
                  className="text-[11px] uppercase tracking-[0.2em] text-slate-900 font-bold mb-1.5"
                  style={{ fontFamily: "var(--font-playfair, 'Playfair Display', Georgia, serif)" }}
                >
                  Starting From
                </p>
                <div className="flex items-baseline gap-2">
                  <span
                    className="text-4xl font-black text-slate-900 leading-none tracking-tight"
                    style={{ fontFamily: "var(--font-outfit, 'Outfit', sans-serif)" }}
                  >
                    {currencySymbol}{displayPrice || '—'}
                  </span>
                  <span
                    className="text-sm font-bold text-slate-800 italic"
                    style={{ fontFamily: "var(--font-playfair, 'Playfair Display', Georgia, serif)" }}
                  >
                    / person
                  </span>
                </div>
              </div>

              {/* ── Info rows — clean label/value list, no box ── */}
              <div className="py-2 border-b border-stone-200 space-y-0">
                {infoItems.map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex items-center gap-3 py-3 border-b border-stone-100 last:border-0">
                    <div className="w-7 h-7 rounded-full bg-orange-50 flex items-center justify-center shrink-0">
                      <Icon className="h-3.5 w-3.5 text-orange-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-[9px] uppercase tracking-[0.15em] text-stone-400 leading-none mb-0.5"
                        style={{ fontFamily: "'DM Sans', sans-serif" }}
                      >
                        {label}
                      </p>
                      <p
                        className="text-[13px] font-semibold text-gray-800 capitalize leading-snug"
                        style={{ fontFamily: "'DM Sans', sans-serif" }}
                        title={value}
                      >
                        {value}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* ── Agency — no card, just open block ── */}
              <div ref={offeredByRef} className="py-5 border-b border-stone-200">
                <p
                  className="text-[9px] uppercase tracking-[0.18em] text-stone-400 mb-4"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  Offered By
                </p>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full border border-stone-200 overflow-hidden shrink-0 bg-orange-50 flex items-center justify-center">
                    {(activeAgencyData?.logoUrl || activeAgencyData?.agencyLogo || activeAgencyData?.avatarUrl || listing.agencyLogo || listing.logoUrl) ? (
                      <img
                        src={activeAgencyData?.logoUrl || activeAgencyData?.agencyLogo || activeAgencyData?.avatarUrl || listing.agencyLogo || listing.logoUrl}
                        alt={activeAgencyName}
                        className="w-full h-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    ) : (
                      <Building2 className="h-6 w-6 text-orange-400" />
                    )}
                  </div>
                  <div>
                    <p
                      className="font-bold text-gray-900 text-[15px] leading-tight"
                      style={{ fontFamily: "'DM Sans', sans-serif" }}
                    >
                      {activeAgencyName}
                    </p>
                    {activeAgencyData?.verified && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full mt-1">
                        <ShieldCheck className="h-3 w-3" /> Verified Agency
                      </span>
                    )}
                  </div>
                </div>
                {!isPreview && onChat && (
                  <button
                    onClick={() => {
                      onChat({
                        ...listing,
                        agencyName: activeAgencyName,
                        agencyData: activeAgencyData,
                        agencyId: listing.agencyId || listing.userId,
                      });
                    }}
                    className="btn-wavy-chat w-full flex items-center justify-center gap-2.5 text-white font-bold py-3 text-sm cursor-pointer border border-amber-300/40 rounded-lg shadow-lg"
                    style={{ fontFamily: "'DM Sans', sans-serif" }}
                  >
                    <MessageCircle className="h-4 w-4 icon-wavy" />
                    <span>Chat with Agency</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── FULL WIDTH INCLUSIONS, EXCLUSIONS, REVIEWS & FAQ ── */}
        {!isPreview && (
          <div className="mt-10 space-y-6">

            {/* ── FULL WIDTH INCLUSIONS & EXCLUSIONS ── */}
            <div className="bg-white border border-stone-200 overflow-hidden shadow-sm" style={{ borderRadius: '6px' }}>
              <div className="px-6 py-5 border-b border-stone-100 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900" style={{ fontFamily: "var(--font-playfair, 'Playfair Display', Georgia, serif)" }}>Inclusions & Exclusions</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-stone-100">
                {/* Inclusions */}
                <div className="p-6 md:p-8">
                  <h3 className="flex items-center gap-2 text-sm font-bold text-emerald-700 mb-4 uppercase tracking-wide">
                    <CheckCircle2 className="h-4 w-4" /> What's Included
                  </h3>
                  {inclusions.length > 0 ? (
                    <ul className="space-y-3">
                      {inclusions.map((item: string, i: number) => (
                        <li key={i} className="flex items-start gap-3">
                          <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <Check className="h-3 w-3 text-emerald-600" strokeWidth={2.5} />
                          </div>
                          <span className="text-sm text-gray-700 leading-relaxed">{item}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-stone-400 italic">Inclusions will be listed here.</p>
                  )}
                </div>
                {/* Exclusions */}
                <div className="p-6 md:p-8">
                  <h3 className="flex items-center gap-2 text-sm font-bold text-red-600 mb-4 uppercase tracking-wide">
                    <X className="h-4 w-4" strokeWidth={2.5} /> Not Included
                  </h3>
                  {exclusions.length > 0 ? (
                    <ul className="space-y-3">
                      {exclusions.map((item: string, i: number) => (
                        <li key={i} className="flex items-start gap-3">
                          <div className="w-5 h-5 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <X className="h-3 w-3 text-red-500" strokeWidth={2.5} />
                          </div>
                          <span className="text-sm text-gray-700 leading-relaxed">{item}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-stone-400 italic">Exclusions will be listed here.</p>
                  )}
                </div>
              </div>
            </div>

          {/* Reviews Section */}
          <div className="bg-white border border-stone-200 overflow-hidden shadow-sm" style={{ borderRadius: '6px' }}>
            <div className="px-6 py-5 border-b border-stone-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
                  <Star className="h-4 w-4 text-amber-500 fill-current" />
                </div>
                <h2 className="text-xl font-bold text-gray-900" style={{ fontFamily: "var(--font-playfair, 'Playfair Display', Georgia, serif)" }}>
                  Guest Reviews <span className="text-stone-400 text-base font-normal">({reviewsData.totalReviewsCount})</span>
                </h2>
              </div>
              {user ? (
                <button
                  onClick={() => setShowWriteReviewModal(true)}
                  className="flex items-center gap-1.5 text-sm font-semibold text-white px-4 py-2 rounded-lg cursor-pointer transition-all hover:opacity-90"
                  style={{ background: '#b84814' }}
                >
                  <Plus className="h-4 w-4" /> Write a Review
                </button>
              ) : (
                <button
                  onClick={handleRequireLogin}
                  className="flex items-center gap-1.5 text-sm font-semibold text-orange-600 bg-orange-50 hover:bg-orange-100 px-4 py-2 rounded-lg cursor-pointer transition-all"
                >
                  <User className="h-4 w-4" /> Please login to review
                </button>
              )}
            </div>

            <div className="p-6">
              {/* Rating overview */}
              <div className="flex flex-col md:flex-row gap-8 mb-8 p-6 bg-stone-50 border border-stone-100" style={{ borderRadius: '6px' }}>
                <div className="flex flex-col items-center justify-center shrink-0 px-4">
                  {reviewsData.totalReviewsCount > 0 ? (
                    <>
                      <div className="text-6xl font-bold text-gray-900 mb-1">{reviewsData.avgRating.toFixed(1)}</div>
                      <div className="flex text-amber-400 mb-1">
                        {[1, 2, 3, 4, 5].map(s => (
                          <Star key={s} className={`h-5 w-5 ${reviewsData.avgRating >= s ? 'fill-current' : 'text-stone-300'}`} />
                        ))}
                      </div>
                      <div className="text-xs text-stone-500">Based on {reviewsData.totalReviewsCount} review{reviewsData.totalReviewsCount > 1 ? 's' : ''}</div>
                    </>
                  ) : (
                    <>
                      <div className="flex text-stone-300 mb-2">{[1, 2, 3, 4, 5].map(s => <Star key={s} className="h-5 w-5" />)}</div>
                      <div className="text-base font-bold text-stone-400">No ratings yet</div>
                      <div className="text-xs text-stone-400">Be the first to review</div>
                    </>
                  )}
                </div>
                <div className="flex-1 flex flex-col justify-center space-y-2 md:border-l md:pl-8 border-stone-200">
                  {reviewsData.ratingBreakdown.map(row => (
                    <div key={row.stars} className="flex items-center gap-3">
                      <div className="flex items-center w-8 text-xs text-stone-500">
                        {row.stars} <Star className="h-3 w-3 fill-current text-amber-400 ml-0.5" />
                      </div>
                      <div className="flex-1 h-1.5 bg-stone-200 rounded-full overflow-hidden">
                        <div className="h-full bg-amber-400 rounded-full transition-all" style={{ width: `${row.percentage}%` }} />
                      </div>
                      <div className="w-6 text-right text-xs text-stone-400">{row.count}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Inline write review form */}
              {showWriteReviewModal && (
                <div className="mb-8 border border-orange-200 overflow-hidden animate-in fade-in duration-200" style={{ borderRadius: '6px' }}>
                  <div className="bg-orange-50 border-b border-orange-100 p-5 flex justify-between items-center">
                    <div>
                      <h4 className="text-base font-bold text-gray-900 flex items-center gap-2">
                        <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
                        Write a Review for {reviewsData.packageTitle}
                      </h4>
                      <p className="text-xs text-stone-500 mt-0.5">Share your authentic travel experience to guide future travellers</p>
                    </div>
                    <button onClick={() => setShowWriteReviewModal(false)} className="text-stone-400 hover:text-stone-700 p-1 rounded transition-colors cursor-pointer">
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  <div className="p-6 bg-white space-y-5">
                    <form onSubmit={handleAddReviewSubmit} className="space-y-5">
                      {/* Rating */}
                      <div className="bg-stone-50 p-4 rounded-lg border border-stone-200">
                        <Label className="text-sm font-semibold text-gray-800">Overall Rating</Label>
                        <div className="flex items-center gap-4 mt-2">
                          <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map(star => (
                              <button type="button" key={star} onClick={() => setNewReview({ ...newReview, rating: star })} className="p-1 hover:scale-110 transition-transform focus:outline-none cursor-pointer">
                                <Star className={`h-8 w-8 ${newReview.rating >= star ? 'fill-amber-400 text-amber-400' : 'text-stone-300'}`} />
                              </button>
                            ))}
                          </div>
                          <Badge className="bg-amber-100 text-amber-800 text-xs font-semibold px-3 py-1 rounded-full border border-amber-200">
                            {newReview.rating === 5 ? '5.0 - Excellent' : newReview.rating === 4 ? '4.0 - Very Good' : newReview.rating === 3 ? '3.0 - Average' : newReview.rating === 2 ? '2.0 - Fair' : '1.0 - Poor'}
                          </Badge>
                        </div>
                      </div>
                      {/* Trip type */}
                      <div>
                        <Label className="text-sm font-semibold text-gray-800">Who did you travel with?</Label>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {['Family', 'Couples', 'Friends', 'Solo', 'Business'].map(type => (
                            <button type="button" key={type} onClick={() => setNewReview({ ...newReview, tripType: type })} className={`px-4 py-1.5 text-xs font-medium rounded-full border transition-colors cursor-pointer ${newReview.tripType === type ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-700 border-stone-300 hover:bg-stone-50'}`}>
                              {type}
                            </button>
                          ))}
                        </div>
                      </div>
                      {/* Name & city */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="rev-name" className="text-xs font-semibold text-gray-700">Your Full Name *</Label>
                          <Input id="rev-name" required placeholder="e.g. Amit Kumar" value={newReview.name} onChange={e => setNewReview({ ...newReview, name: e.target.value })} className="mt-1 rounded-lg" />
                        </div>
                        <div>
                          <Label htmlFor="rev-city" className="text-xs font-semibold text-gray-700">City / Origin *</Label>
                          <Input id="rev-city" required placeholder="e.g. Mumbai, Delhi, London..." value={newReview.travelledFrom} onChange={e => setNewReview({ ...newReview, travelledFrom: e.target.value })} className="mt-1 rounded-lg" />
                        </div>
                      </div>
                      {/* Detailed review */}
                      <div>
                        <Label htmlFor="rev-comment" className="text-xs font-semibold text-gray-700">Detailed Review *</Label>
                        <Textarea id="rev-comment" required rows={4} placeholder="Tell us about your experience: hotel stay, sightseeing highlights, driver/guide assistance, and overall value..." value={newReview.comment} onChange={e => setNewReview({ ...newReview, comment: e.target.value })} className="mt-1 leading-relaxed rounded-lg" />
                      </div>
                      {/* Photo URL */}
                      <div>
                        <Label htmlFor="rev-photo" className="text-xs font-semibold text-gray-700">Attach Trip Photo URL (Optional)</Label>
                        <Input id="rev-photo" placeholder="https://images.unsplash.com/..." value={newReview.photoUrl} onChange={e => setNewReview({ ...newReview, photoUrl: e.target.value })} className="mt-1 text-xs rounded-lg" />
                      </div>
                      {/* Actions */}
                      <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-100">
                        <button type="button" onClick={() => setShowWriteReviewModal(false)} className="px-6 py-2 text-sm font-medium text-stone-600 hover:text-stone-900 border border-stone-300 rounded-lg transition-colors cursor-pointer">
                          Cancel
                        </button>
                        <button type="submit" disabled={isSubmittingReview || !newReview.comment.trim() || !newReview.name.trim()} className="px-8 py-2 text-sm font-semibold text-white rounded-lg transition-all disabled:opacity-50 cursor-pointer" style={{ background: '#b84814' }}>
                          {isSubmittingReview ? 'Posting Review...' : 'Submit Review'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* Traveller Image Gallery */}
              {reviewsData.travellerImages.length > 0 && (
                <div className="mb-8">
                  <h4 className="font-bold text-gray-900 mb-3 text-sm">Traveller Photos</h4>
                  <div className="grid grid-cols-4 gap-2" style={{ height: '260px' }}>
                    <div
                      className="col-span-2 row-span-2 relative rounded-lg overflow-hidden group cursor-pointer"
                      onClick={() => setSelectedGalleryImage(reviewsData.travellerImages[0])}
                    >
                      <img src={reviewsData.travellerImages[0]} alt="Traveller 1" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      {reviewsData.travellerImages.length > 1 && (
                        <button
                          onClick={e => { e.stopPropagation(); setSelectedGalleryImage(reviewsData.travellerImages[0]); }}
                          className="absolute bottom-3 left-3 bg-black/55 backdrop-blur-md text-white border border-white/30 px-3 py-1 rounded-lg text-xs font-medium hover:bg-black/70 transition-colors cursor-pointer"
                        >
                          View all ({reviewsData.travellerImages.length})
                        </button>
                      )}
                    </div>
                    {reviewsData.travellerImages.slice(1, 5).map((img, idx) => (
                      <div
                        key={idx}
                        className="rounded-lg overflow-hidden group cursor-pointer"
                        onClick={() => setSelectedGalleryImage(img)}
                      >
                        <img src={img} alt={`Traveller ${idx + 2}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Real User Reviews List */}
              <div className="space-y-4">
                {reviewsData.totalReviewsCount > 0 ? (
                  reviewsData.userReviews.map((review: any) => (
                    <div key={review.id} className="border border-stone-200 p-5 bg-white hover:border-stone-300 transition-colors" style={{ borderRadius: '6px' }}>
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center font-bold text-sm">
                            {review.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900 text-sm">{review.name}</h4>
                            <p className="text-xs text-stone-400">{review.date}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 text-sm font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                          <Star className="h-3.5 w-3.5 fill-current" /> {review.rating}/5
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stone-500 border-y border-stone-100 py-2 my-3">
                        <span>Booked: <span className="text-orange-600 font-medium">{review.booked}</span></span>
                        {review.travelledFrom && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-stone-400" />
                            From: <span className="font-medium text-gray-700 ml-0.5">{review.travelledFrom}</span>
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-700 leading-relaxed">{review.text}</p>
                      {review.images && review.images.length > 0 && (
                        <div className="flex gap-2 overflow-x-auto pt-3 pb-1">
                          {review.images.map((img: string, i: number) => (
                            <div
                              key={i}
                              className="w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden cursor-pointer border border-stone-200"
                              onClick={() => setSelectedGalleryImage(img)}
                            >
                              <img src={img} alt={`Review image ${i + 1}`} className="w-full h-full object-cover hover:scale-105 transition-transform" />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="border-2 border-dashed border-stone-200 p-10 text-center" style={{ borderRadius: '6px' }}>
                    <div className="w-12 h-12 rounded-full bg-orange-50 text-orange-400 flex items-center justify-center mx-auto mb-3">
                      <MessageCircle className="h-6 w-6" />
                    </div>
                    <h4 className="font-bold text-gray-800 text-base mb-1">No reviews yet for this package</h4>
                    <p className="text-xs text-stone-400 max-w-sm mx-auto mb-4">
                      Have you travelled on this trip? Be the first traveller to write an authentic review!
                    </p>
                    {user ? (
                      <button
                        onClick={() => setShowWriteReviewModal(true)}
                        className="inline-flex items-center gap-2 text-sm font-semibold text-white px-5 py-2.5 rounded-lg cursor-pointer transition-all hover:opacity-90"
                        style={{ background: '#b84814' }}
                      >
                        <Plus className="h-4 w-4" /> Write a Review
                      </button>
                    ) : (
                      <button
                        onClick={handleRequireLogin}
                        className="inline-flex items-center gap-2 text-sm font-semibold text-orange-600 bg-orange-50 hover:bg-orange-100 px-5 py-2.5 rounded-lg cursor-pointer transition-all"
                      >
                        <User className="h-4 w-4" /> Please login to review
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* FAQ Section */}
          <div className="bg-white border border-stone-200 overflow-hidden shadow-sm" style={{ borderRadius: '6px' }}>
            <div className="px-6 py-5 border-b border-stone-100 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
                <MessageCircle className="h-4 w-4 text-blue-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900" style={{ fontFamily: "var(--font-playfair, 'Playfair Display', Georgia, serif)" }}>Frequently Asked Questions</h2>
            </div>
            <div className="divide-y divide-stone-100">
              {defaultFAQs.map((faq, index) => (
                <div key={index}>
                  <button
                    className="w-full flex items-center justify-between p-5 text-left hover:bg-stone-50 transition-colors cursor-pointer"
                    onClick={() => toggleFAQ(index)}
                  >
                    <span className="font-semibold text-gray-900 text-sm pr-4">{faq.question}</span>
                    {expandedFAQs.includes(index)
                      ? <ChevronUp className="h-4 w-4 text-stone-400 shrink-0" />
                      : <ChevronDown className="h-4 w-4 text-stone-400 shrink-0" />
                    }
                  </button>
                  {expandedFAQs.includes(index) && (
                    <div className="px-5 pb-5 border-t border-stone-50 bg-stone-50/30">
                      <p className="text-sm text-gray-600 leading-relaxed pt-3">{faq.answer}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
        )}
      </div>

      {/* ─── PERSISTENT MOBILE BOTTOM BAR (OFFERED BY + CHAT WITH AGENCY) ─────────── */}
      {!isPreview && (
        <div className="fixed bottom-0 left-0 right-0 z-[140] md:hidden bg-white/95 backdrop-blur-md border-t border-stone-200/90 shadow-[0_-4px_25px_rgba(0,0,0,0.15)] px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {/* Top Row: Agency info & Price */}
          <div className="flex items-center justify-between gap-3 mb-2.5">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="w-9 h-9 rounded-full border border-stone-200 overflow-hidden shrink-0 bg-orange-50 flex items-center justify-center shadow-xs">
                {(activeAgencyData?.logoUrl || activeAgencyData?.agencyLogo || activeAgencyData?.avatarUrl || listing.agencyLogo || listing.logoUrl) ? (
                  <img
                    src={activeAgencyData?.logoUrl || activeAgencyData?.agencyLogo || activeAgencyData?.avatarUrl || listing.agencyLogo || listing.logoUrl}
                    alt={activeAgencyName}
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                ) : (
                  <Building2 className="h-4 w-4 text-orange-500" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <span
                  className="text-[9px] uppercase tracking-[0.14em] font-extrabold text-stone-400 leading-none block mb-0.5"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  Offered By
                </span>
                <span
                  className="font-bold text-gray-900 text-xs sm:text-sm leading-tight truncate block"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  {activeAgencyName}
                </span>
              </div>
            </div>

            {displayPrice && (
              <div className="text-right shrink-0">
                <span className="text-sm font-extrabold text-orange-600 block leading-tight">
                  {currencySymbol}{displayPrice}
                </span>
                <span className="text-[9px] text-stone-500 block leading-none font-medium">/ person</span>
              </div>
            )}
          </div>

          {/* Bottom Row: Full-width Chat with Agency Button with Wavy Animation */}
          <button
            onClick={() => {
              event({
                action: 'chat_agent_click',
                category: 'chat',
                label: activeAgencyName || listing.title || listing.id,
              });
              if (onChat) {
                onChat({
                  ...listing,
                  agencyName: activeAgencyName,
                  agencyData: activeAgencyData,
                  agencyId: listing.agencyId || listing.userId,
                });
              } else {
                window.location.href = `/?action=chat&agencyId=${listing.agencyId || listing.userId}&agencyName=${encodeURIComponent(activeAgencyName)}`;
              }
            }}
            className="btn-wavy-chat w-full flex items-center justify-center gap-2 text-white font-bold py-3 px-4 text-sm border border-amber-300/40 cursor-pointer rounded-xl"
            style={{
              fontFamily: "'DM Sans', sans-serif"
            }}
          >
            <MessageCircle className="h-4 w-4 shrink-0 icon-wavy" />
            <span className="tracking-wide">Chat with Agency</span>
          </button>
        </div>
      )}

      {/* ─── DESKTOP SCROLL-TRIGGERED FLOATING CHAT POPUP WITH AGENCY LOGO ───────────────────── */}
      {!isPreview && onChat && (
        <div
          className={`hidden md:block fixed bottom-6 right-6 z-[150] transition-all duration-500 ease-out ${
            showStickyBar ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-12 opacity-0 scale-90 pointer-events-none'
          }`}
        >
          <button
            onClick={() => {
              event({
                action: 'chat_agent_click',
                category: 'chat',
                label: activeAgencyName || listing.title || listing.id,
              });
              onChat({
                ...listing,
                agencyName: activeAgencyName,
                agencyData: activeAgencyData,
                agencyId: listing.agencyId || listing.userId,
              });
            }}
            className="btn-wavy-chat group flex items-center gap-3 text-white p-2 pr-5 border border-amber-300/50 shadow-[0_10px_30px_rgba(234,88,12,0.45)] backdrop-blur-xl cursor-pointer rounded-lg"
          >
            {/* Agency Logo Avatar */}
            <div className="w-10 h-10 rounded border-2 border-white/90 bg-white shrink-0 flex items-center justify-center shadow-md overflow-hidden" style={{ borderRadius: '6px' }}>
              {(activeAgencyData?.logoUrl || activeAgencyData?.agencyLogo || activeAgencyData?.avatarUrl || listing.agencyLogo || listing.logoUrl) ? (
                <img
                  src={activeAgencyData?.logoUrl || activeAgencyData?.agencyLogo || activeAgencyData?.avatarUrl || listing.agencyLogo || listing.logoUrl}
                  alt={activeAgencyName}
                  className="w-full h-full object-cover object-center"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              ) : (
                <Building2 className="h-5 w-5 text-orange-500" />
              )}
            </div>

            {/* Professional Agency & Action Text */}
            <div className="flex flex-col text-left">
              <span className="text-[11px] font-extrabold text-amber-100 truncate max-w-[130px] leading-tight">
                {activeAgencyName}
              </span>
              <span className="text-xs font-black text-white flex items-center gap-1.5 leading-snug drop-shadow-sm">
                <span>Chat with Agency</span>
                <MessageCircle className="h-3.5 w-3.5 text-amber-200 group-hover:translate-x-0.5 transition-transform icon-wavy" />
              </span>
            </div>
          </button>
        </div>
      )}

      {/* ─── COMPARE TOAST NOTIFICATION ─────────────────────────── */}
      {showCompareToast && (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2 fade-in duration-300">
          <div className={`flex items-center gap-2 px-4 py-3 rounded-xl shadow-xl text-white text-sm font-medium ${compareToastMessage.includes('already') || compareToastMessage.includes('only compare') ? 'bg-amber-500' : 'bg-emerald-500'}`}>
            {compareToastMessage.includes('already') || compareToastMessage.includes('only compare')
              ? <AlertCircle className="h-4 w-4" />
              : <CheckCircle2 className="h-4 w-4" />
            }
            <span>{compareToastMessage}</span>
          </div>
        </div>
      )}

      {/* ─── FULL SCREEN PHOTO GALLERY MODAL ────────────────────── */}
      {showAllPhotos && (
        <div className="fixed inset-0 bg-white z-[200] flex flex-col animate-in fade-in zoom-in-95 duration-200">
          <div className="sticky top-0 bg-white border-b border-stone-200 z-10 px-4 md:px-8 py-3 flex items-center shadow-sm">
            <button
              className="flex items-center gap-2 text-gray-900 font-bold hover:bg-stone-100 px-3 md:px-4 py-2 rounded-lg transition-colors"
              onClick={() => setShowAllPhotos(false)}
            >
              <ArrowLeft className="h-5 w-5" /> Back
            </button>
            <div className="flex-1 flex justify-center overflow-x-auto">
              <div className="flex items-center gap-6 md:gap-10 text-sm font-medium text-stone-500 whitespace-nowrap">
                <button className="text-orange-600 border-b-2 border-orange-500 pb-1 px-2">
                  All Images ({allImages.length})
                </button>
                <button className="hover:text-stone-900 pb-1 px-2 transition-colors">Destinations</button>
                <button className="hover:text-stone-900 pb-1 px-2 transition-colors">Activities</button>
                <button className="hover:text-stone-900 pb-1 px-2 transition-colors">Stays</button>
              </div>
            </div>
            <div className="w-[100px] hidden md:block" />
          </div>

          <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-stone-50">
            <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4">
              {allImages.map((image, index) => (
                <div
                  key={index}
                  className="aspect-video rounded-xl overflow-hidden bg-stone-200 group cursor-pointer"
                  onClick={() => setSelectedGalleryImage(image)}
                >
                  <img
                    src={optimizeImageUrl(image, { width: 1200, quality: 85, format: 'auto', cacheBust: false })}
                    alt={locationName ? `${locationName} - ${listing.title || 'Travel Package'} - Gallery Image ${index + 1}` : `Gallery Image ${index + 1}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                    loading={index < 4 ? 'eager' : 'lazy'}
                    decoding="async"
                  />
                </div>
              ))}
            </div>
            {allImages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-64 text-stone-400">
                <Camera className="h-16 w-16 mb-4 opacity-40" />
                <p className="text-lg">No photos available for this package.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── TRAVELLER PHOTO LIGHTBOX MODAL ─────────────────────── */}
      {selectedGalleryImage && (
        <div
          className="fixed inset-0 bg-black/92 z-[300] flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setSelectedGalleryImage(null)}
        >
          <div className="max-w-4xl max-h-[85vh] overflow-hidden rounded-xl" onClick={e => e.stopPropagation()}>
            <img src={selectedGalleryImage} alt={locationName ? `${locationName} - ${listing.title || 'Travel Package'} - Full size photo` : "Full size photo"} className="w-full h-full object-contain" />
          </div>
        </div>
      )}

      {/* ─── WRITE REVIEW MODAL ─────────────────────────────────── */}
      {showWriteReviewModal && (
        <div className="fixed inset-0 z-[250] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-5 border border-stone-200 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-stone-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Write a Review</h3>
                <p className="text-xs text-stone-500 mt-0.5">{listing.title || 'Travel Package'}</p>
              </div>
              <button
                onClick={() => setShowWriteReviewModal(false)}
                className="text-stone-400 hover:text-stone-600 p-1.5 rounded-lg hover:bg-stone-100 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitReview} className="space-y-4">
              {/* Rating Star Selector */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Rating</label>
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setNewReview(prev => ({ ...prev, rating: star }))}
                      className="p-1 hover:scale-110 transition-transform cursor-pointer"
                    >
                      <Star
                        className={`h-7 w-7 ${
                          newReview.rating >= star
                            ? 'text-amber-400 fill-amber-400'
                            : 'text-stone-200'
                        }`}
                      />
                    </button>
                  ))}
                  <span className="text-xs font-bold text-amber-600 ml-2">
                    {newReview.rating} out of 5
                  </span>
                </div>
              </div>

              {/* Trip Type */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Your Name</label>
                  <input
                    type="text"
                    value={newReview.name}
                    onChange={e => setNewReview(prev => ({ ...prev, name: e.target.value }))}
                    placeholder={user?.displayName || 'Your Name'}
                    className="w-full text-xs px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Trip Type</label>
                  <select
                    value={newReview.tripType}
                    onChange={e => setNewReview(prev => ({ ...prev, tripType: e.target.value }))}
                    className="w-full text-xs px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-orange-500 bg-white"
                  >
                    <option value="Family">Family</option>
                    <option value="Couple">Couple</option>
                    <option value="Friends">Friends</option>
                    <option value="Solo">Solo</option>
                    <option value="Business">Business</option>
                  </select>
                </div>
              </div>

              {/* Review Text */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Your Review</label>
                <textarea
                  required
                  rows={4}
                  value={newReview.comment}
                  onChange={e => setNewReview(prev => ({ ...prev, comment: e.target.value }))}
                  placeholder="Share details about the tour, hotels, driver, food, and overall itinerary experience..."
                  className="w-full text-xs p-3 border border-stone-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-orange-500 resize-none leading-relaxed"
                />
              </div>

              {/* Buttons */}
              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowWriteReviewModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReview || !newReview.comment.trim()}
                  className="px-5 py-2 text-xs font-bold text-white bg-orange-600 hover:bg-orange-700 rounded-lg shadow-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingReview ? 'Submitting...' : 'Submit Review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
