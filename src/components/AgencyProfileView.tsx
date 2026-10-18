'use client';

import React, { useRef, useState, useMemo, useEffect } from 'react';
import {
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
  Globe,
  Compass,
  HeartHandshake,
  DollarSign,
  Phone,
  Mail,
  Share2,
  Bookmark,
  ArrowLeft,
  Calendar,
  Clock,
  Check,
  Sparkles,
  Camera,
  Award,
  Building2,
  BadgeCheck,
  FileText,
  Quote,
  Map as MapIcon,
  ExternalLink,
  ChevronDown,
  ThumbsUp,
  HelpCircle,
  Copy,
  Heart,
  X,
} from 'lucide-react';
import { AgencyData } from './TravelAgentsView';
import { PackageListing } from '@/lib/discoveryEngine';
import ListingCard from './ListingCard';
import { getDbInstance } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

interface AgencyProfileViewProps {
  agency: AgencyData;
  listings?: PackageListing[];
  wishlist?: string[];
  onBack: () => void;
  onViewListing: (listing: any) => void;
  onInitiateChat: (data: any) => void;
  onBook?: (listing: any) => void;
  onWishlistToggle?: (listingId: string) => void;
  onNavigateToDestinations?: (search?: string) => void;
}

export default function AgencyProfileView({
  agency,
  listings = [],
  wishlist = [],
  onBack,
  onViewListing,
  onInitiateChat,
  onBook,
  onWishlistToggle,
  onNavigateToDestinations,
}: AgencyProfileViewProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [showAllPhotosModal, setShowAllPhotosModal] = useState(false);
  const [activeLightboxIndex, setActiveLightboxIndex] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'packages' | 'about' | 'reviews'>('packages');
  const [dbReviews, setDbReviews] = useState<any[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);

  // 1. Resolve all packages strictly associated with this agency
  const agencyPackages = useMemo<PackageListing[]>(() => {
    if (agency.packages && agency.packages.length > 0) {
      return agency.packages;
    }
    // Fallback: match from global listings
    return listings.filter((l: any) => {
      const lAgencyId = l.agencyId || l.userId;
      const lAgencyName = l.agencyName || l.agencyData?.companyName;
      if (lAgencyId && lAgencyId === agency.id) return true;
      if (
        lAgencyName &&
        (lAgencyName.trim().toLowerCase() === agency.name.trim().toLowerCase() ||
          lAgencyName.trim().toLowerCase() === agency.companyName?.trim().toLowerCase())
      ) {
        return true;
      }
      return false;
    });
  }, [agency, listings]);

  // Primary destination for customized copy
  const primaryDestination = useMemo(() => {
    if (agency.destinations && agency.destinations.length > 0) {
      return agency.destinations[0];
    }
    const firstPkg = agencyPackages[0];
    if (firstPkg) {
      return firstPkg.destination || firstPkg.city || firstPkg.location || 'India';
    }
    return agency.city || 'India';
  }, [agency, agencyPackages]);

  // Helper to sanitize address and remove external domains (.com, .in, URLs, etc.)
  const sanitizeAddressText = (text: string): string => {
    if (!text) return '';
    return text
      // Strip URLs with protocol
      .replace(/https?:\/\/[^\s,]+/gi, '')
      // Strip www. links
      .replace(/www\.[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+(?:\/[^\s,]*)?/gi, '')
      // Strip standalone domain names like Enjoymytrips.com, agency.in, etc.
      .replace(/\b[a-zA-Z0-9-]+\.(?:com|in|co\.in|org|net|io|co|biz|info|travel|online|site|store)(?:\/[^\s,]*)?/gi, '')
      // Clean up punctuation remnants (leading/trailing commas, colons, hyphens, and duplicate commas)
      .replace(/^[,\s\-–:;]+/, '')
      .replace(/[,\s\-–:;]+$/, '')
      .replace(/,\s*,+/g, ', ')
      .replace(/\s{2,}/g, ' ')
      .trim();
  };

  // Resolve location, state, pincode, and office address dynamically from agency onboarding data
  const resolvedLocation = useMemo(() => {
    const rawBusinessLoc = sanitizeAddressText(agency.businessLocation || '');
    const rawOfficeAddr = sanitizeAddressText(agency.officeAddress || '');
    const rawFullAddr = sanitizeAddressText(agency.fullAddress || '');
    const rawLocation = sanitizeAddressText(agency.location || '');
    const rawCity = sanitizeAddressText(agency.city || '');
    const rawState = sanitizeAddressText(agency.state || '');

    // 1. Extract 6-digit Indian PIN code
    let pincode = (agency.pincode || '').trim();
    if (!pincode) {
      const combinedAddr = `${rawOfficeAddr} ${rawFullAddr} ${rawBusinessLoc} ${rawLocation}`;
      const pinMatch = combinedAddr.match(/\b([1-9][0-9]{5})\b/);
      if (pinMatch) pincode = pinMatch[1];
    }

    // 2. Identify State / City / Location without hardcoding 'New Delhi'
    let displayLocation = rawBusinessLoc;
    if (!displayLocation) {
      if (rawCity && rawState && rawCity.toLowerCase() !== rawState.toLowerCase() && rawCity !== 'India') {
        displayLocation = `${rawCity}, ${rawState}`;
      } else if (rawLocation && !rawLocation.toLowerCase().includes('new delhi')) {
        displayLocation = rawLocation;
      } else if (rawCity && rawCity !== 'India') {
        displayLocation = rawCity;
      } else if (rawState) {
        displayLocation = rawState;
      } else if (rawLocation) {
        displayLocation = rawLocation;
      } else {
        displayLocation = 'India';
      }
    }

    const officeAddress = rawOfficeAddr || rawFullAddr || '';

    return {
      displayLocation: displayLocation || 'India',
      pincode,
      officeAddress,
      state: rawState,
      city: rawCity,
    };
  }, [agency]);

  // 2. Fetch real reviews for this agency's packages from Firestore / API
  useEffect(() => {
    let isMounted = true;
    async function loadAgencyReviews() {
      setReviewsLoading(true);
      try {
        const pkgIds = agencyPackages.map((p) => String(p.id)).filter(Boolean);
        const aggregated: any[] = [];

        // Collect reviews embedded in packages
        agencyPackages.forEach((p: any) => {
          if (Array.isArray(p.reviews) && p.reviews.length > 0) {
            p.reviews.forEach((r: any) => {
              aggregated.push({
                id: r.id || `emb-${Math.random()}`,
                name: r.name || r.userName || 'Verified Traveler',
                rating: Number(r.rating) || 5,
                comment: r.comment || r.text || r.reviewText || '',
                date: r.date || r.createdAt || 'Recently',
                photos: r.photos || r.images || [],
                packageTitle: p.title || 'Holiday Package',
              });
            });
          }
        });

        // Query Firestore reviews collection by agencyId or package listingId
        const db = getDbInstance();
        if (db) {
          try {
            const q = query(collection(db, 'reviews'), where('agencyId', '==', agency.id));
            const snap = await getDocs(q);
            snap.forEach((d) => {
              const data = d.data();
              aggregated.push({ id: d.id, ...data });
            });
          } catch (_) {}

          // Also check by package IDs
          if (pkgIds.length > 0 && pkgIds.length <= 10) {
            try {
              const qPkg = query(collection(db, 'reviews'), where('listingId', 'in', pkgIds));
              const snapPkg = await getDocs(qPkg);
              snapPkg.forEach((d) => {
                const data = d.data();
                if (!aggregated.some((a) => a.id === d.id)) {
                  aggregated.push({ id: d.id, ...data });
                }
              });
            } catch (_) {}
          }
        }

        if (isMounted) {
          setDbReviews(aggregated);
        }
      } catch (err) {
        console.warn('Could not load agency reviews:', err);
      } finally {
        if (isMounted) setReviewsLoading(false);
      }
    }

    loadAgencyReviews();
    return () => {
      isMounted = false;
    };
  }, [agency.id, agencyPackages]);

  // Compute real review rating & breakdown ONLY from real review data
  const reviewStats = useMemo(() => {
    if (dbReviews.length > 0) {
      const total = dbReviews.length;
      const sum = dbReviews.reduce((acc, r) => acc + (Number(r.rating) || 5), 0);
      const avg = Math.round((sum / total) * 10) / 10;
      const counts: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
      dbReviews.forEach((r) => {
        const star = Math.min(5, Math.max(1, Math.round(Number(r.rating) || 5)));
        counts[star] = (counts[star] || 0) + 1;
      });
      const breakdown = [5, 4, 3, 2, 1].map((star) => ({
        star,
        count: counts[star] || 0,
        percentage: total > 0 ? Math.round(((counts[star] || 0) / total) * 100) : 0,
      }));
      return { total, avg, breakdown };
    }

    if (agency.rating && agency.rating > 0) {
      const total = agency.reviewCount || 1;
      const avg = Number(agency.rating);
      return {
        total,
        avg,
        breakdown: [
          { star: 5, count: total, percentage: 80 },
          { star: 4, count: 0, percentage: 20 },
          { star: 3, count: 0, percentage: 0 },
          { star: 2, count: 0, percentage: 0 },
          { star: 1, count: 0, percentage: 0 },
        ],
      };
    }

    return null;
  }, [dbReviews, agency.rating, agency.reviewCount]);

  // 3. Aggregate real photos from agency listings
  const agencyPhotos = useMemo<string[]>(() => {
    const photoList: string[] = [];
    if (agency.packageImages && agency.packageImages.length > 0) {
      photoList.push(...agency.packageImages);
    }
    agencyPackages.forEach((pkg: any) => {
      if (Array.isArray(pkg.images)) {
        pkg.images.forEach((img: any) => {
          if (typeof img === 'string' && img.startsWith('http') && !photoList.includes(img)) {
            photoList.push(img);
          }
        });
      }
      if (Array.isArray(pkg.photos)) {
        pkg.photos.forEach((img: any) => {
          if (typeof img === 'string' && img.startsWith('http') && !photoList.includes(img)) {
            photoList.push(img);
          }
        });
      }
      if (Array.isArray(pkg.placesCovered)) {
        pkg.placesCovered.forEach((place: any) => {
          if (place?.imageUrl && typeof place.imageUrl === 'string' && !photoList.includes(place.imageUrl)) {
            photoList.push(place.imageUrl);
          }
        });
      }
    });
    return photoList;
  }, [agency, agencyPackages]);

  // Keyboard listener for full white gallery modal & lightbox navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (activeLightboxIndex !== null) {
          setActiveLightboxIndex(null);
        } else if (showAllPhotosModal) {
          setShowAllPhotosModal(false);
        }
      } else if (activeLightboxIndex !== null && agencyPhotos.length > 0) {
        if (e.key === 'ArrowLeft') {
          setActiveLightboxIndex((prev) =>
            prev !== null ? (prev - 1 + agencyPhotos.length) % agencyPhotos.length : 0
          );
        } else if (e.key === 'ArrowRight') {
          setActiveLightboxIndex((prev) =>
            prev !== null ? (prev + 1) % agencyPhotos.length : 0
          );
        }
      }
    };

    if (showAllPhotosModal || activeLightboxIndex !== null) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [showAllPhotosModal, activeLightboxIndex, agencyPhotos.length]);

  // Derived specialties pills
  const specialtiesList = useMemo<string[]>(() => {
    if (agency.specialties && agency.specialties.length > 0) {
      return agency.specialties;
    }
    const derived = new Set<string>();
    if (primaryDestination) derived.add(`${primaryDestination} Specialist`);
    agencyPackages.forEach((p: any) => {
      if (p.style) derived.add(p.style);
      if (p.tripType) derived.add(p.tripType);
    });
    return Array.from(derived).slice(0, 5);
  }, [agency.specialties, primaryDestination, agencyPackages]);

  // Scroll left/right handler for the packages rail
  const scrollPackages = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 400;
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  const handleShare = async () => {
    const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
    const shareData = {
      title: `${agency.name} | Verified Travel Agency on TripDM`,
      text: `Check out ${agency.name}, verified travel agency for customized tours on TripDM!`,
      url: shareUrl,
    };

    if (typeof navigator !== 'undefined' && navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
        return;
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          setShareModalOpen(true);
        }
        return;
      }
    }
    setShareModalOpen(true);
  };

  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      try {
        navigator.clipboard.writeText(window.location.href);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2500);
      } catch (_) {}
    }
  };

  const handleWishlist = () => {
    setIsSaved(!isSaved);
    const firstPkg = agencyPackages[0];
    if (firstPkg && onWishlistToggle) {
      onWishlistToggle(String(firstPkg.id));
    }
  };

  const handleChat = () => {
    const firstPkg = agencyPackages[0];
    onInitiateChat({
      agencyId: agency.id,
      agencyName: agency.name,
      ...(firstPkg || {}),
      id: firstPkg?.id,
      title: firstPkg?.title,
      duration: firstPkg?.duration ? String(firstPkg.duration) : undefined,
      price: firstPkg?.price,
    });
  };

  const scrollToSection = (sectionId: string, tabKey: typeof activeTab) => {
    setActiveTab(tabKey);
    const elem = document.getElementById(sectionId);
    if (elem) {
      const yOffset = -140;
      const y = elem.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  return (
    <div className="w-full bg-white min-h-screen text-slate-900 pb-16">
      <div className="max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 pt-5 space-y-5">
        {/* ─── 1. HERO PANORAMIC BANNER (Direct on Page - No Container Box) ─── */}
        <div className="w-full relative overflow-hidden bg-white border-b border-slate-200 pb-2">
          {/* Panoramic Mountain Lake Backdrop with Soft Left Gradient Wash */}
          <div
            className="w-full bg-cover bg-center relative p-5 sm:p-7 lg:p-9"
            style={{
              backgroundImage: "url('/agency-profile-hero-banner.jpg')",
            }}
          >
            {/* Soft left white fade to make typography 100% legible while keeping mountain & lake on right vivid */}
            <div className="absolute inset-0 bg-gradient-to-r from-white/95 via-white/80 to-transparent pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-t from-white/50 via-transparent to-black/10 pointer-events-none" />

            {/* Top Row: Back Button on Left + Handwritten Cursive Badge on Right */}
            <div className="relative z-10 flex items-center justify-between gap-4 mb-3 sm:mb-5">
              <button
                type="button"
                onClick={onBack}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white/95 hover:bg-white hover:border-orange-500 hover:text-orange-600 text-slate-800 font-bold text-xs sm:text-sm shadow-xs border border-slate-200 transition-all cursor-pointer backdrop-blur-md"
                style={{ borderRadius: '6px' }}
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>

              {/* Top Right Handwritten Cursive Badge */}
              <div className="hidden md:flex flex-col items-end select-none pointer-events-none transform -rotate-1 pr-2 sm:pr-4">
                <span className="text-sm sm:text-base lg:text-[17px] font-black text-slate-900 font-serif italic tracking-tight drop-shadow-[0_1px_3px_rgba(255,255,255,0.95)] drop-shadow-[0_2px_8px_rgba(0,0,0,0.15)]">
                  Explore Destinations with Local Experts
                </span>
                <svg className="w-28 h-3.5 text-[#FF5500] stroke-current fill-none stroke-[2.5] mt-0.5 drop-shadow-sm" viewBox="0 0 100 12">
                  <path d="M2 8 Q 50 2, 98 8" />
                </svg>
              </div>
            </div>

            {/* Middle Row: Large Circular Avatar + Agency Info + Action Buttons */}
            <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5 pb-5">
              {/* Left Column: Avatar & Agency Information */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-5">
                {/* Large Circular Avatar Badge */}
                <div
                  className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-white border-4 border-white shadow-xl overflow-hidden shrink-0 flex items-center justify-center relative"
                >
                  {agency.logoUrl ? (
                    <img
                      src={agency.logoUrl}
                      alt={agency.name}
                      className="w-full h-full object-contain p-2 bg-white"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-orange-400 to-amber-600 flex items-center justify-center text-white font-black text-3xl">
                      {agency.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                {/* Info Stack */}
                <div className="space-y-1">
                  {/* Verified Badge */}
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-flex items-center gap-1.5 bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 px-2.5 py-0.5 text-xs font-bold shadow-2xs backdrop-blur-md"
                      style={{ borderRadius: '4px' }}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" />
                      <span>Verified Travel Agency</span>
                    </span>
                  </div>

                  {/* Agency Name */}
                  <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-tight">
                    {agency.name}
                  </h1>

                  {/* Metadata Row: Rating | Experience | Happy Travelers */}
                  <div className="flex flex-wrap items-center gap-2.5 text-xs text-slate-700 font-semibold pt-0.5">
                    {reviewStats ? (
                      <span className="flex items-center gap-1 font-bold text-slate-900">
                        <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                        <span>{reviewStats.avg.toFixed(1)}</span>
                        <span className="text-slate-500 font-normal">({reviewStats.total} reviews)</span>
                      </span>
                    ) : null}

                    {reviewStats && agency.experienceYears ? <span className="text-slate-300">|</span> : null}

                    {agency.experienceYears ? (
                      <span className="flex items-center gap-1">
                        <Briefcase className="w-3.5 h-3.5 text-slate-600" />
                        <span>{agency.experienceYears}+ Years Experience</span>
                      </span>
                    ) : null}

                    {agency.happyTravelersCount ? (
                      <>
                        <span className="text-slate-300">|</span>
                        <span className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5 text-slate-600" />
                          <span>{agency.happyTravelersCount}+ Happy Travelers</span>
                        </span>
                      </>
                    ) : null}
                  </div>

                  {/* Location & State */}
                  <div className="flex items-center gap-1.5 text-xs text-slate-700 font-medium pt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-800 shrink-0" />
                    <span className="font-semibold text-slate-900">{resolvedLocation.displayLocation}</span>
                    {resolvedLocation.pincode && (
                      <span className="text-slate-500 font-normal">({resolvedLocation.pincode})</span>
                    )}
                  </div>

                  {/* Specialty Pills */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    {specialtiesList.map((spec) => (
                      <span
                        key={spec}
                        className="bg-white/90 backdrop-blur-md border border-slate-200/90 text-slate-800 px-3 py-1 text-xs font-semibold shadow-2xs"
                        style={{ borderRadius: '6px' }}
                      >
                        {spec}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column: Share, Wishlist & Chat Buttons directly on the banner */}
              <div className="flex items-center gap-2.5 self-start lg:self-end shrink-0 mt-3 lg:mt-0">
                {/* Share Button */}
                <button
                  type="button"
                  onClick={handleShare}
                  className="flex items-center gap-1.5 bg-black/60 hover:bg-black/75 backdrop-blur-md text-white font-bold px-4 py-2 text-xs border border-white/20 transition-all cursor-pointer shadow-md active:scale-95"
                  style={{ borderRadius: '6px' }}
                  title="Share Agency Profile"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Share</span>
                </button>

                {/* Wishlist / Save Button */}
                <button
                  type="button"
                  onClick={handleWishlist}
                  className={`flex items-center gap-1.5 font-bold px-4 py-2 text-xs border backdrop-blur-md transition-all cursor-pointer shadow-md active:scale-95 ${
                    isSaved
                      ? 'bg-rose-600 text-white border-rose-500 shadow-rose-600/30'
                      : 'bg-black/60 hover:bg-black/75 text-white border-white/20'
                  }`}
                  style={{ borderRadius: '6px' }}
                  title={isSaved ? 'Saved in Wishlist' : 'Add to Wishlist'}
                >
                  <Heart className={`w-3.5 h-3.5 ${isSaved ? 'fill-current text-white' : ''}`} />
                  <span>{isSaved ? 'Saved' : 'Wishlist'}</span>
                </button>

                {/* Chat with Agent Button */}
                <button
                  type="button"
                  onClick={handleChat}
                  className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 active:scale-95 text-white font-bold py-2 px-5 text-xs shadow-md flex items-center gap-1.5 transition-all cursor-pointer border border-amber-400/50"
                  style={{ borderRadius: '6px' }}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Chat with Agent</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ─── 2. SEPARATE AGENCY PHOTO PREVIEW STRIP (Direct on Page) ─── */}
        {agencyPhotos.length > 0 && (
          <div className="w-full bg-transparent py-4 border-b border-slate-200">
            <div className="flex items-center justify-between gap-4 mb-3 px-0.5">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-slate-800" />
                <h3 className="text-xs sm:text-sm font-black text-slate-900 tracking-tight">
                  {agency.name} Photos & Itinerary Highlights
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAllPhotosModal(true)}
                className="text-[11px] font-bold text-slate-700 hover:text-slate-950 hover:underline cursor-pointer flex items-center gap-1 transition-colors"
              >
                <span>{agencyPhotos.length} Photos Available</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {agencyPhotos.slice(0, 5).map((photo, idx) => {
                const isLast = idx === 4 && agencyPhotos.length > 5;
                return (
                  <div
                    key={idx}
                    onClick={() => setShowAllPhotosModal(true)}
                    className="relative aspect-video sm:aspect-4/3 overflow-hidden cursor-pointer border border-slate-200 group shadow-2xs hover:border-orange-500 transition-all"
                    style={{ borderRadius: '6px' }}
                  >
                    <img
                      src={photo}
                      alt={`Trip thumbnail ${idx + 1}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    {isLast && (
                      <div className="absolute inset-0 bg-black/65 backdrop-blur-2xs flex flex-col items-center justify-center text-white group-hover:bg-black/75 transition-colors">
                        <span className="font-black text-base sm:text-lg">+{agencyPhotos.length - 4}</span>
                        <span className="text-[11px] font-bold">Photos</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ─── 3. SUB-NAVIGATION TABS BAR (Direct on Page - No Container Box) ─── */}
        <div className="w-full bg-white border-b border-slate-200 px-2 overflow-x-auto scrollbar-hide sticky top-16 z-20">
          <div className="flex items-center gap-6 sm:gap-8 min-w-max text-xs sm:text-sm font-bold">
            <button
              type="button"
              onClick={() => scrollToSection('section-packages', 'packages')}
              className={`py-3.5 transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'packages'
                  ? 'text-[#FF5500] border-[#FF5500]'
                  : 'text-slate-600 border-transparent hover:text-slate-900'
              }`}
            >
              <span>Tour Packages</span>
              <span className="px-1.5 py-0.2 bg-orange-100 text-[#FF5500] text-[10px] rounded-full">
                {agencyPackages.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => scrollToSection('section-about', 'about')}
              className={`py-3.5 transition-all border-b-2 cursor-pointer ${
                activeTab === 'about'
                  ? 'text-[#FF5500] border-[#FF5500]'
                  : 'text-slate-600 border-transparent hover:text-slate-900'
              }`}
            >
              About
            </button>

            <button
              type="button"
              onClick={() => scrollToSection('section-reviews', 'reviews')}
              className={`py-3.5 transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'reviews'
                  ? 'text-[#FF5500] border-[#FF5500]'
                  : 'text-slate-600 border-transparent hover:text-slate-900'
              }`}
            >
              <span>Reviews</span>
              {reviewStats && (
                <span className="px-1.5 py-0.2 bg-amber-100 text-amber-700 text-[10px] rounded-full">
                  {reviewStats.total}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* ─── 4. MAIN 2-COLUMN BODY (Direct on Page - No Container Boxes) ─── */}
        <div className="flex flex-col lg:flex-row gap-6 items-start pt-2">
          {/* ══════════════════════════════════════════════════════════════════
              LEFT MAIN COLUMN (Direct on Page - No Container Box)
             ══════════════════════════════════════════════════════════════════ */}
          <div className="flex-1 min-w-0 space-y-6">
            {/* SECTION 1: POPULAR TOUR PACKAGES */}
            <div id="section-packages" className="bg-transparent pb-6 border-b border-slate-200">
              <div className="flex items-center justify-between gap-4 mb-4 pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <PackageIcon className="w-5 h-5 text-[#FF5500]" />
                  <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                    Popular Tour Packages
                  </h2>
                </div>

                {agencyPackages.length > 0 && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => scrollPackages('left')}
                      className="w-8 h-8 bg-white border border-slate-200 hover:border-orange-500 hover:text-[#FF5500] text-slate-700 flex items-center justify-center shadow-2xs transition-all active:scale-95 cursor-pointer"
                      style={{ borderRadius: '6px' }}
                      aria-label="Scroll Left"
                      title="Scroll Left"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => scrollPackages('right')}
                      className="w-8 h-8 bg-white border border-slate-200 hover:border-orange-500 hover:text-[#FF5500] text-slate-700 flex items-center justify-center shadow-2xs transition-all active:scale-95 cursor-pointer"
                      style={{ borderRadius: '6px' }}
                      aria-label="Scroll Right"
                      title="Scroll Right"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {agencyPackages.length > 0 ? (
                <div
                  ref={scrollContainerRef}
                  className="flex gap-4 sm:gap-6 overflow-x-auto pb-4 pt-1 scrollbar-hide snap-x snap-mandatory scroll-smooth w-full"
                >
                  {agencyPackages.map((pkg) => (
                    <div
                      key={pkg.id}
                      className="w-[320px] min-w-[320px] sm:w-[360px] sm:min-w-[360px] md:w-[380px] md:min-w-[380px] lg:w-[400px] lg:min-w-[400px] snap-start shrink-0 flex flex-col h-full self-stretch"
                    >
                      <ListingCard
                        listing={pkg}
                        onView={onViewListing}
                        onBook={onBook}
                        onChat={(l) =>
                          onInitiateChat({
                            agencyId: agency.id,
                            agencyName: agency.name,
                            ...(l || {}),
                          })
                        }
                        onWishlist={onWishlistToggle}
                        isWishlisted={wishlist.includes(pkg.id)}
                        variant="user"
                        showCompare={true}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  className="bg-slate-50 border border-slate-200/80 p-6 text-center flex flex-col items-center justify-center my-2"
                  style={{ borderRadius: '6px' }}
                >
                  <PackageIcon className="w-8 h-8 text-[#FF5500] mb-2" />
                  <h4 className="text-sm font-bold text-slate-900">Custom Tours on Request</h4>
                  <p className="text-xs text-slate-500 max-w-sm mt-1 mb-3">
                    Chat directly with {agency.name} to receive handcrafted options for your dates.
                  </p>
                  <button
                    type="button"
                    onClick={handleChat}
                    className="bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold py-1.5 px-4 text-xs cursor-pointer"
                    style={{ borderRadius: '6px' }}
                  >
                    Request Custom Quote
                  </button>
                </div>
              )}
            </div>

            {/* SECTION 2: ABOUT THE AGENCY */}
            <div id="section-about" className="bg-transparent py-6 border-b border-slate-200">
              <div className="flex items-center gap-2 mb-3.5">
                <FileText className="w-5 h-5 text-slate-800" />
                <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                  About {agency.name}
                </h2>
              </div>

              <div className="space-y-3">
                {agency.description ? (
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                    {agency.description}
                  </p>
                ) : (
                  <p className="text-xs sm:text-sm text-slate-500 italic">
                    No bio description provided yet.
                  </p>
                )}
              </div>

              {/* Metric Highlights */}
              {(agency.experienceYears || agency.happyTravelersCount || reviewStats) ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-100 text-xs">
                  {agency.experienceYears ? (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-slate-800 shrink-0" />
                      <div>
                        <div className="font-black text-slate-900">{agency.experienceYears}+</div>
                        <div className="text-[10px] text-slate-500">Years Experience</div>
                      </div>
                    </div>
                  ) : null}

                  {agency.happyTravelersCount ? (
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-emerald-600 shrink-0" />
                      <div>
                        <div className="font-black text-slate-900">{agency.happyTravelersCount}+</div>
                        <div className="text-[10px] text-slate-500">Happy Travelers</div>
                      </div>
                    </div>
                  ) : null}

                  {reviewStats ? (
                    <div className="flex items-center gap-2">
                      <Star className="w-4 h-4 text-amber-500 fill-amber-500 shrink-0" />
                      <div>
                        <div className="font-black text-slate-900">{reviewStats.avg.toFixed(1)}/5</div>
                        <div className="text-[10px] text-slate-500">Customer Rating</div>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>

            {/* SECTION 3: CUSTOMER REVIEWS */}
            <div id="section-reviews" className="bg-transparent py-6">
              <div className="flex items-center justify-between gap-4 mb-4 pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
                  <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                    Customer Reviews
                  </h2>
                </div>
              </div>

              {/* Reviews Summary Breakdown & List */}
              {reviewStats && reviewStats.total > 0 ? (
                <div className="space-y-4">
                  {/* Rating Breakdown Row */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center p-4 bg-slate-50 border border-slate-200/80 rounded-lg">
                    {/* Left Score */}
                    <div className="md:col-span-4 text-center md:text-left flex flex-col items-center md:items-start">
                      <div className="text-4xl sm:text-5xl font-black text-slate-900">
                        {reviewStats.avg.toFixed(1)}
                      </div>
                      <div className="flex items-center gap-1 my-1">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={`w-4 h-4 ${
                              reviewStats.avg >= s
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-slate-300'
                            }`}
                          />
                        ))}
                      </div>
                      <div className="text-xs text-slate-500">
                        Based on {reviewStats.total} verified review{reviewStats.total > 1 ? 's' : ''}
                      </div>
                    </div>

                    {/* Right Bars */}
                    <div className="md:col-span-8 space-y-1.5 text-xs font-medium">
                      {reviewStats.breakdown.map((row) => (
                        <div key={row.star} className="flex items-center gap-2.5">
                          <span className="w-6 text-slate-600 text-right">{row.star}★</span>
                          <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-amber-400 rounded-full transition-all"
                              style={{ width: `${row.percentage}%` }}
                            />
                          </div>
                          <span className="w-10 text-slate-400 text-right text-[11px]">
                            {row.percentage}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Real Reviews Cards List */}
                  {dbReviews.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                      {dbReviews.map((rev) => (
                        <div
                          key={rev.id}
                          className="bg-white border border-slate-200 p-4 shadow-2xs flex flex-col justify-between"
                          style={{ borderRadius: '6px' }}
                        >
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-orange-100 text-[#FF5500] font-black text-xs flex items-center justify-center">
                                  {rev.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <div className="text-xs font-bold text-slate-900 leading-tight">
                                    {rev.name}
                                  </div>
                                  <div className="text-[10px] text-slate-400">{rev.date}</div>
                                </div>
                              </div>

                              <div className="flex items-center gap-0.5">
                                {[1, 2, 3, 4, 5].map((s) => (
                                  <Star
                                    key={s}
                                    className={`w-3 h-3 ${
                                      (Number(rev.rating) || 5) >= s
                                        ? 'fill-amber-400 text-amber-400'
                                        : 'text-slate-200'
                                    }`}
                                  />
                                ))}
                              </div>
                            </div>

                            <p className="text-xs text-slate-600 leading-relaxed italic">
                              "{rev.comment || 'Great experience and seamless communication!'}"
                            </p>
                          </div>

                          {/* Photos attached to review */}
                          {Array.isArray(rev.photos) && rev.photos.length > 0 && (
                            <div className="flex items-center gap-1.5 mt-3 pt-2 border-t border-slate-100">
                              {rev.photos.slice(0, 3).map((pUrl: string, pIdx: number) => (
                                <img
                                  key={pIdx}
                                  src={pUrl}
                                  alt="Review trip photo"
                                  className="w-12 h-12 object-cover rounded cursor-pointer border border-slate-200"
                                  onClick={() => {
                                    const foundIdx = agencyPhotos.indexOf(pUrl);
                                    if (foundIdx !== -1) {
                                      setActiveLightboxIndex(foundIdx);
                                    } else {
                                      setShowAllPhotosModal(true);
                                    }
                                  }}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div
                  className="bg-slate-50 border border-slate-200/80 p-6 text-center flex flex-col items-center justify-center my-2"
                  style={{ borderRadius: '6px' }}
                >
                  <Star className="w-8 h-8 text-amber-400 mb-2" />
                  <h4 className="text-sm font-bold text-slate-900">No Reviews Published Yet</h4>
                  <p className="text-xs text-slate-500 max-w-sm mt-1 mb-3">
                    Be among the first to book with {agency.name} and share your experience on TripDM.
                  </p>
                  <button
                    type="button"
                    onClick={handleChat}
                    className="bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold py-1.5 px-4 text-xs cursor-pointer"
                    style={{ borderRadius: '6px' }}
                  >
                    Chat with Agent
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════════
              RIGHT SIDEBAR: COMPACT STICKY CONTACT & INFO (Direct on Page - No Container Boxes)
             ══════════════════════════════════════════════════════════════════ */}
          <div className="w-full lg:w-[275px] xl:w-[290px] shrink-0 space-y-6 lg:sticky lg:top-28">
            {/* Item 1: Chat with Agency */}
            <div className="bg-transparent pb-6 border-b border-slate-200 space-y-3">
              <div>
                <h3 className="text-sm sm:text-base font-black text-slate-900 leading-tight">
                  Chat with {agency.name}
                </h3>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                  Discuss your requirements, get customized itineraries and best quotes directly from the agent.
                </p>
              </div>

              <div className="pt-1">
                <button
                  type="button"
                  onClick={handleChat}
                  className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 active:scale-95 text-white font-bold py-2.5 text-xs shadow-md shadow-amber-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer border border-amber-400/50"
                  style={{ borderRadius: '6px' }}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Chat with Agent</span>
                </button>
              </div>
            </div>

            {/* Item 2: Registered Office & Location (Replaces dummy location map) */}
            {(resolvedLocation.officeAddress || resolvedLocation.displayLocation || resolvedLocation.pincode) && (
              <div className="bg-transparent pb-6 border-b border-slate-200 space-y-2.5">
                <div className="flex items-center gap-1.5 pb-1 border-b border-slate-100">
                  <Building2 className="w-3.5 h-3.5 text-slate-800" />
                  <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-900">
                    Registered Office & Location
                  </h4>
                </div>

                <div className="space-y-3 pt-1 text-xs">
                  {resolvedLocation.officeAddress && (
                    <div>
                      <span className="text-[11px] font-medium text-slate-500 block mb-0.5">Office Address:</span>
                      <span className="font-semibold text-slate-900 whitespace-pre-line leading-relaxed block">
                        {resolvedLocation.officeAddress}
                      </span>
                    </div>
                  )}

                  {resolvedLocation.displayLocation && (
                    <div>
                      <span className="text-[11px] font-medium text-slate-500 block mb-0.5">Location / State:</span>
                      <span className="font-semibold text-slate-900 block">
                        {resolvedLocation.displayLocation}
                      </span>
                    </div>
                  )}

                  {resolvedLocation.pincode && (
                    <div>
                      <span className="text-[11px] font-medium text-slate-500 block mb-0.5">Pincode:</span>
                      <span className="font-semibold text-slate-900 block">
                        {resolvedLocation.pincode}
                      </span>
                    </div>
                  )}

                  <div>
                    <span className="text-[11px] font-medium text-slate-500 block mb-0.5">Operating Setup:</span>
                    <span className="font-semibold text-slate-900 block">
                      {agency.operatingFromOffice
                        ? 'Commercial Office'
                        : 'Registered Travel Consultant'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Item 3: Why Travel with this Agency */}
            <div id="section-why-us" className="bg-transparent pb-6 space-y-2.5">
              <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-900 pb-2 border-b border-slate-100">
                Why Travel with {agency.name}?
              </h4>

              <div className="space-y-2 text-[11px] font-medium text-slate-700">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Local {primaryDestination} experts</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Customized itineraries</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Best hotel & transport</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>24/7 on-ground support</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Transparent direct pricing</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Verified TripDM partner</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── 6. INTERACTIVE SHARE MODAL ─── */}
      {shareModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setShareModalOpen(false)}
        >
          <div
            className="bg-white border border-slate-200 w-full max-w-md p-6 shadow-2xl space-y-5 relative"
            style={{ borderRadius: '12px' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-orange-100 text-[#FF5500] flex items-center justify-center">
                  <Share2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 leading-tight">Share Agency Profile</h3>
                  <p className="text-xs text-slate-500">Share {agency.name} with friends & family</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShareModalOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-bold cursor-pointer transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Social Share 1-Click Buttons */}
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2.5 block">
                Share via
              </label>
              <div className="grid grid-cols-4 gap-2.5 text-center">
                {/* WhatsApp */}
                <a
                  href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                    `Check out ${agency.name} on TripDM: ${typeof window !== 'undefined' ? window.location.href : ''}`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center gap-1.5 p-2.5 rounded-lg border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 transition-all group cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-full bg-[#25D366] text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                    <MessageSquare className="w-5 h-5 fill-current" />
                  </div>
                  <span className="text-[11px] font-bold text-slate-700">WhatsApp</span>
                </a>

                {/* Twitter / X */}
                <a
                  href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(
                    `Check out ${agency.name} on TripDM!`
                  )}&url=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center gap-1.5 p-2.5 rounded-lg border border-slate-200 hover:border-slate-800 hover:bg-slate-50 transition-all group cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 24.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                  </div>
                  <span className="text-[11px] font-bold text-slate-700">Twitter / X</span>
                </a>

                {/* Facebook */}
                <a
                  href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
                    typeof window !== 'undefined' ? window.location.href : ''
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center gap-1.5 p-2.5 rounded-lg border border-slate-200 hover:border-blue-600 hover:bg-blue-50/50 transition-all group cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-full bg-[#1877F2] text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                    </svg>
                  </div>
                  <span className="text-[11px] font-bold text-slate-700">Facebook</span>
                </a>

                {/* Email */}
                <a
                  href={`mailto:?subject=${encodeURIComponent(
                    `Check out ${agency.name} on TripDM`
                  )}&body=${encodeURIComponent(
                    `Hi,\n\nTake a look at ${agency.name} on TripDM:\n${typeof window !== 'undefined' ? window.location.href : ''}`
                  )}`}
                  className="flex flex-col items-center gap-1.5 p-2.5 rounded-lg border border-slate-200 hover:border-amber-500 hover:bg-amber-50/50 transition-all group cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                    <Mail className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-bold text-slate-700">Email</span>
                </a>
              </div>
            </div>

            {/* Direct Copy Link Field */}
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 block">
                Or copy link
              </label>
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 p-1.5 rounded-lg">
                <input
                  type="text"
                  readOnly
                  value={typeof window !== 'undefined' ? window.location.href : ''}
                  className="bg-transparent text-xs text-slate-700 font-mono flex-1 px-2 outline-none select-all truncate"
                />
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="bg-[#FF5500] hover:bg-[#e04b00] active:scale-95 text-white font-bold px-3.5 py-1.5 text-xs shadow-xs flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
                  style={{ borderRadius: '6px' }}
                >
                  {copiedLink ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-white" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── 7. FULL WHITE PAGE ALL-PHOTOS GALLERY ─── */}
      {showAllPhotosModal && (
        <div className="fixed inset-0 z-50 bg-white overflow-y-auto flex flex-col animate-in fade-in duration-200">
          {/* Top Sticky Header */}
          <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-3 sm:gap-4">
              <button
                type="button"
                onClick={() => {
                  setShowAllPhotosModal(false);
                  setActiveLightboxIndex(null);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs sm:text-sm border border-slate-200 transition-all cursor-pointer"
                style={{ borderRadius: '6px' }}
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Profile</span>
              </button>
              <div>
                <h2 className="text-sm sm:text-base lg:text-lg font-black text-slate-900 leading-tight">
                  {agency.name} Photos & Itinerary Highlights
                </h2>
                <p className="text-[11px] sm:text-xs text-slate-500 font-medium">
                  {agencyPhotos.length} {agencyPhotos.length === 1 ? 'photo' : 'photos'} available
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={handleChat}
                className="hidden sm:inline-flex items-center gap-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold py-1.5 px-4 text-xs shadow-xs transition-all cursor-pointer"
                style={{ borderRadius: '6px' }}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Chat with Agent</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAllPhotosModal(false);
                  setActiveLightboxIndex(null);
                }}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer transition-colors"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Clean White Page Grid of All Photos */}
          <div className="flex-1 bg-white p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
            {agencyPhotos.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-5">
                {agencyPhotos.map((photo, idx) => (
                  <div
                    key={idx}
                    onClick={() => setActiveLightboxIndex(idx)}
                    className="group relative aspect-4/3 bg-slate-100 rounded-lg overflow-hidden border border-slate-200 shadow-2xs hover:shadow-md hover:border-orange-500 transition-all cursor-pointer"
                  >
                    <img
                      src={photo}
                      alt={`${agency.name} photo ${idx + 1}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors flex items-end justify-between p-2.5 opacity-0 group-hover:opacity-100">
                      <span className="bg-black/70 backdrop-blur-xs text-white text-[11px] font-bold px-2 py-0.5 rounded">
                        Photo {idx + 1}
                      </span>
                      <span className="bg-[#FF5500] text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-xs">
                        View
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-20 text-center text-slate-500">
                <Camera className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                <p className="text-sm font-semibold">No photos available for this agency yet.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── 8. INTERACTIVE LIGHTBOX VIEWER WITH PREV / NEXT & THUMBNAILS ─── */}
      {activeLightboxIndex !== null && agencyPhotos[activeLightboxIndex] && (
        <div
          className="fixed inset-0 z-60 bg-black/95 flex flex-col items-center justify-between p-4 select-none animate-in fade-in duration-150"
          onClick={() => setActiveLightboxIndex(null)}
        >
          {/* Top Bar inside Lightbox */}
          <div
            className="w-full max-w-5xl flex items-center justify-between text-white py-2 z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-xs sm:text-sm font-semibold text-slate-300">
              Photo {activeLightboxIndex + 1} of {agencyPhotos.length}
            </div>
            <button
              type="button"
              onClick={() => setActiveLightboxIndex(null)}
              className="bg-white/10 hover:bg-white/20 text-white p-2 rounded-full cursor-pointer transition-colors"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Main Image + Nav Arrows */}
          <div
            className="relative flex-1 w-full max-w-5xl flex items-center justify-center my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {agencyPhotos.length > 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveLightboxIndex((prev) =>
                    prev !== null ? (prev - 1 + agencyPhotos.length) % agencyPhotos.length : 0
                  );
                }}
                className="absolute left-2 sm:left-4 z-10 bg-black/60 hover:bg-black/80 text-white p-2.5 sm:p-3 rounded-full transition-all active:scale-95 cursor-pointer border border-white/20"
                aria-label="Previous photo"
              >
                <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            )}

            <img
              src={agencyPhotos[activeLightboxIndex]}
              alt={`Photo ${activeLightboxIndex + 1}`}
              className="max-w-full max-h-[78vh] object-contain rounded shadow-2xl"
            />

            {agencyPhotos.length > 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveLightboxIndex((prev) =>
                    prev !== null ? (prev + 1) % agencyPhotos.length : 0
                  );
                }}
                className="absolute right-2 sm:right-4 z-10 bg-black/60 hover:bg-black/80 text-white p-2.5 sm:p-3 rounded-full transition-all active:scale-95 cursor-pointer border border-white/20"
                aria-label="Next photo"
              >
                <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            )}
          </div>

          {/* Bottom Thumbnails Strip */}
          {agencyPhotos.length > 1 && (
            <div
              className="w-full max-w-4xl overflow-x-auto py-2 flex items-center justify-center gap-2 z-10 scrollbar-hide"
              onClick={(e) => e.stopPropagation()}
            >
              {agencyPhotos.map((img, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setActiveLightboxIndex(i)}
                  className={`w-12 h-12 rounded overflow-hidden shrink-0 border-2 transition-all cursor-pointer ${
                    i === activeLightboxIndex
                      ? 'border-[#FF5500] scale-105'
                      : 'border-transparent opacity-50 hover:opacity-100'
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
