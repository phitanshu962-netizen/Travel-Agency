'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { 
  MapPin, CheckCircle, Pencil, Camera, 
  Shield, User, ChevronRight, ChevronLeft,
  Heart, MessageSquare, Building2, Trash2, Check, Mail, SlidersHorizontal,
  Star, ShieldCheck, CheckCircle2, Sparkles, Package as PackageIcon, Briefcase
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface UserProfileProps {
  user: any;
  userData: any;
  wishlist?: string[];
  listings?: any[];
  agencies?: any[];
  profileName: string;
  setProfileName: (val: string) => void;
  profilePhone: string;
  setProfilePhone: (val: string) => void;
  profilePhotoUrl: string | null;
  handleProfilePhotoChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleDeleteProfilePhoto?: () => void;
  isEditingProfile: boolean;
  setIsEditingProfile: (val: boolean) => void;
  savingProfile: boolean;
  handleSaveProfile: () => void;
  onWishlistToggle?: (id: string, e?: React.MouseEvent) => void;
  onInitiateChat?: (data: any) => void;
  onViewAgencyProfile?: (agency: any) => void;
  onViewAgencyPackages?: (agencyId: string, agencyName: string) => void;
  onViewListing?: (listing: any) => void;
  onExploreAgents?: () => void;
  onNavigateToChat?: () => void;
}

export default function UserProfile({
  user,
  userData,
  wishlist = [],
  listings = [],
  agencies = [],
  profileName,
  setProfileName,
  profilePhone,
  setProfilePhone,
  profilePhotoUrl,
  handleProfilePhotoChange,
  handleDeleteProfilePhoto,
  isEditingProfile,
  setIsEditingProfile,
  savingProfile,
  handleSaveProfile,
  onWishlistToggle,
  onInitiateChat,
  onViewAgencyProfile,
  onViewAgencyPackages,
  onViewListing,
  onExploreAgents,
  onNavigateToChat
}: UserProfileProps) {
  // Active sub-tab inside the profile page: 'profile' (Personal Info) or 'wishlist' (Saved Agencies)
  const [activeTab, setActiveTab] = useState<'profile' | 'wishlist'>('profile');
  const [activePhotoIndexes, setActivePhotoIndexes] = useState<Record<string, number>>({});
  const [realLocation, setRealLocation] = useState('');
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setImageError(false);
  }, [profilePhotoUrl]);

  const hasValidPhoto = Boolean(
    profilePhotoUrl && 
    typeof profilePhotoUrl === 'string' && 
    profilePhotoUrl.trim() !== '' && 
    !imageError
  );

  // Fetch location if not present
  useEffect(() => {
    if (userData?.city) return;

    const fetchIpLocation = async () => {
      try {
        const res = await fetch('https://ipapi.co/json/');
        const data = await res.json();
        if (data && data.city) {
          setRealLocation(`${data.city}${data.country_name ? `, ${data.country_name}` : ''}`);
        }
      } catch (e) {
        console.error('Failed to fetch location', e);
      }
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude } = position.coords;
            const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`);
            const data = await res.json();
            if (data && (data.locality || data.city)) {
              const locationName = data.locality || data.city;
              setRealLocation(`${locationName}${data.countryName ? `, ${data.countryName}` : ''}`);
            } else {
              fetchIpLocation();
            }
          } catch (err) {
            console.error('Error reverse geocoding coordinates:', err);
            fetchIpLocation();
          }
        },
        (error) => {
          console.warn('GPS location denied or timeout. Falling back to IP location:', error);
          fetchIpLocation();
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      fetchIpLocation();
    }
  }, [userData?.role, userData?.city]);

  // Compute wishlisted travel agencies directly from wishlist and available agencies/listings
  const wishlistedAgencies = useMemo(() => {
    if (!wishlist || wishlist.length === 0) return [];

    const agencyMap = new Map<string, any>();

    // 1. Scan registered agencies list
    (agencies || []).forEach((agency) => {
      const isDirectlyWishlisted = wishlist.includes(agency.id) || (agency.userId && wishlist.includes(agency.userId));
      const hasWishlistedPackage = agency.packages?.some((p: any) => wishlist.includes(p.id)) ||
        (listings || []).some((l: any) => (l.agencyId === agency.id || l.userId === agency.id) && wishlist.includes(l.id));

      if (isDirectlyWishlisted || hasWishlistedPackage) {
        const matchingPkgs = agency.packages || (listings || []).filter((l: any) => l.agencyId === agency.id || l.userId === agency.id);
        const allPkgImages = agency.packageImages || matchingPkgs.flatMap((p: any) => p.images || (p.image ? [p.image] : []));
        
        agencyMap.set(agency.id, {
          ...agency,
          name: agency.name || agency.companyName || 'Travel Agency',
          packages: matchingPkgs,
          packageCount: matchingPkgs.length,
          packageImages: allPkgImages,
        });
      }
    });

    // 2. Scan listings if agency wasn't directly in agencies list
    (listings || []).forEach((listing) => {
      if (wishlist.includes(listing.id)) {
        const agencyId = listing.agencyId || listing.userId;
        if (agencyId && !agencyMap.has(agencyId)) {
          const agencyPkgs = (listings || []).filter((l: any) => l.agencyId === agencyId || l.userId === agencyId);
          const pkgImages = agencyPkgs.flatMap((p: any) => p.images || (p.image ? [p.image] : []));
          agencyMap.set(agencyId, {
            id: agencyId,
            name: listing.agencyName || listing.agencyData?.companyName || 'Travel Agency',
            logoUrl: listing.agencyLogo || listing.agencyData?.logoUrl || null,
            location: listing.location || listing.city || 'India',
            city: listing.city || 'India',
            verified: listing.verified || listing.agencyData?.verified || true,
            rating: listing.agencyRating || listing.rating || 4.9,
            reviewCount: listing.agencyReviewsCount || listing.reviewCount || 1,
            description: listing.agencyData?.description || listing.agencyDescription || listing.description || '',
            packages: agencyPkgs,
            packageCount: agencyPkgs.length,
            packageImages: pkgImages,
          });
        }
      }
    });

    return Array.from(agencyMap.values());
  }, [wishlist, agencies, listings]);

  // Photo carousel navigation helpers
  const handlePrevPhoto = (agencyId: string, total: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setActivePhotoIndexes((prev) => ({
      ...prev,
      [agencyId]: ((prev[agencyId] || 0) - 1 + total) % total
    }));
  };

  const handleNextPhoto = (agencyId: string, total: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setActivePhotoIndexes((prev) => ({
      ...prev,
      [agencyId]: ((prev[agencyId] || 0) + 1) % total
    }));
  };

  const isAgency = userData?.role === 'agency';
  const displayLocation = userData?.city || realLocation || 'India';
  const displayName = profileName || userData?.name || 'Traveler';

  return (
    <div className="w-full max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8 pt-2 sm:pt-6 pb-32 sm:pb-16 space-y-3.5 sm:space-y-6 font-sans min-w-0 overflow-x-hidden">
      
      {/* ========================================================
          1. CLEAN PROFILE HEADER BANNER & IDENTITY (Travel Agent Page Style)
          ======================================================== */}
      <div 
        className="bg-white border border-slate-200 shadow-2xs overflow-hidden w-full max-w-full"
        style={{ borderRadius: '8px' }}
      >
        {/* Cover Image Banner */}
        <div className="h-24 sm:h-48 w-full relative overflow-hidden bg-slate-900">
          <img
            src="/profile-cover.jpg"
            alt="Profile Cover"
            className="w-full h-full object-cover object-center"
          />
          {/* Subtle natural lighting vignette */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-black/10 pointer-events-none" />
        </div>

        {/* Profile Info Row */}
        <div className="px-4 sm:px-8 pb-5 sm:pb-6 pt-0 relative flex flex-col sm:flex-row sm:items-end justify-between gap-3 sm:gap-4 min-w-0">
          
          {/* Avatar & User Details */}
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-3 sm:gap-4 -mt-12 sm:-mt-16 text-center sm:text-left min-w-0 max-w-full">
            {/* Avatar with Internal Hover Controls */}
            <div 
              className="relative group shrink-0 w-20 h-20 sm:w-28 sm:h-28 rounded-full border-4 border-white bg-slate-100 shadow-md overflow-hidden flex items-center justify-center select-none"
            >
              {hasValidPhoto ? (
                <img
                  src={profilePhotoUrl!}
                  alt="Profile"
                  onError={() => setImageError(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-500">
                  <User className="w-10 h-10 sm:w-14 sm:h-14 text-slate-500" />
                </div>
              )}

              {/* Hover overlay with Change and Delete actions */}
              {hasValidPhoto ? (
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2.5 transition-opacity z-20">
                  <label
                    title="Change profile photo"
                    className="p-2 rounded-full bg-white/20 hover:bg-white/35 text-white cursor-pointer transition-all hover:scale-110"
                  >
                    <Camera className="w-4 h-4 sm:w-5 sm:h-5" />
                    <input type="file" accept="image/*" onChange={handleProfilePhotoChange} className="hidden" />
                  </label>
                  {handleDeleteProfilePhoto && (
                    <button
                      type="button"
                      onClick={handleDeleteProfilePhoto}
                      title="Delete profile photo"
                      className="p-2 rounded-full bg-rose-600/90 hover:bg-rose-600 text-white cursor-pointer transition-all hover:scale-110 border-none"
                    >
                      <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                  )}
                </div>
              ) : (
                <label
                  title="Upload profile photo"
                  className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white cursor-pointer transition-opacity z-20"
                >
                  <Camera className="w-5 h-5 sm:w-6 sm:h-6" />
                  <input type="file" accept="image/*" onChange={handleProfilePhotoChange} className="hidden" />
                </label>
              )}
            </div>

            {/* Name & Metadata */}
            <div className="space-y-1 min-w-0 max-w-full">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 sm:gap-2">
                <h1 className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight truncate max-w-full">
                  {displayName}
                </h1>
                {isAgency ? (
                  <span 
                    className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200/80 px-2 py-0.5 shrink-0"
                    style={{ borderRadius: '4px' }}
                  >
                    <CheckCircle className="w-3 h-3 text-amber-600" />
                    Verified Agency Partner
                  </span>
                ) : (
                  <span 
                    className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80 px-2 py-0.5 shrink-0"
                    style={{ borderRadius: '4px' }}
                  >
                    <CheckCircle className="w-3 h-3 text-emerald-600" />
                    TripDM Traveler
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 sm:gap-3 text-xs text-slate-500 font-medium min-w-0">
                <span className="flex items-center gap-1 shrink-0">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  {displayLocation}
                </span>
                <span className="flex items-center gap-1 min-w-0 max-w-full truncate">
                  <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{user?.email || 'No email attached'}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons (Right) */}
          <div className="flex items-center justify-center sm:justify-end gap-2.5 pt-1 sm:pt-0 shrink-0 max-w-full">
            {isAgency && (
              <Link
                href="/agencytripdm"
                className="bg-white/80 border border-slate-200/80 hover:bg-white hover:border-orange-500 hover:text-orange-600 text-slate-700 font-bold py-2 sm:py-2.5 px-3.5 sm:px-5 text-xs sm:text-sm transition-all cursor-pointer shadow-2xs inline-flex items-center gap-1.5"
                style={{ borderRadius: '6px' }}
              >
                <Building2 className="w-3.5 h-3.5 text-slate-600" />
                <span>Agency Portal →</span>
              </Link>
            )}

            {!isEditingProfile && (
              <button
                type="button"
                onClick={() => {
                  setActiveTab('profile');
                  setIsEditingProfile(true);
                }}
                className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 active:scale-95 text-white font-bold py-2 sm:py-2.5 px-4 sm:px-6 text-xs sm:text-sm shadow-md shadow-amber-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer border border-amber-400/50"
                style={{ borderRadius: '6px' }}
              >
                <Pencil className="w-3.5 h-3.5" />
                <span>Edit Profile</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================
          2. MAIN 2-COLUMN SECTION (Sidebar Navigation on Left + Content on Right)
          ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-start w-full min-w-0">
        
        {/* ══════════════════════════════════════════════════════════
            LEFT SIDEBAR: ACTION TABS
           ══════════════════════════════════════════════════════════ */}
        <aside 
          className="lg:col-span-4 bg-white border border-slate-200 p-3 sm:p-4 shadow-2xs space-y-2 sm:space-y-2.5 lg:sticky lg:top-20 w-full min-w-0"
          style={{ borderRadius: '8px' }}
        >
          {/* Tab 1: Personal Information */}
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`w-full p-3 sm:p-3.5 flex items-center justify-between text-left transition-all cursor-pointer group border ${
              activeTab === 'profile'
                ? 'bg-slate-50 border-slate-300 shadow-2xs'
                : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
            }`}
            style={{ borderRadius: '6px' }}
          >
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <div 
                className={`w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center shrink-0 transition-transform ${
                  activeTab === 'profile'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 group-hover:bg-slate-200'
                }`}
                style={{ borderRadius: '6px' }}
              >
                <User className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0 truncate">
                <h4 className={`text-xs sm:text-sm font-bold truncate ${activeTab === 'profile' ? 'text-slate-900' : 'text-slate-700 group-hover:text-slate-900'}`}>
                  Personal Information
                </h4>
                <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
                  Profile & contact details
                </p>
              </div>
            </div>
            <ChevronRight className={`w-4 h-4 transition-all shrink-0 ml-1 ${activeTab === 'profile' ? 'text-slate-900 translate-x-0.5' : 'text-slate-400 group-hover:text-slate-600'}`} />
          </button>

          {/* Tab 2: My Wishlist (Saved Travel Agencies) */}
          <button
            type="button"
            onClick={() => setActiveTab('wishlist')}
            className={`w-full p-3 sm:p-3.5 flex items-center justify-between text-left transition-all cursor-pointer group border ${
              activeTab === 'wishlist'
                ? 'bg-slate-50 border-slate-300 shadow-2xs'
                : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
            }`}
            style={{ borderRadius: '6px' }}
          >
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <div 
                className={`w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center shrink-0 transition-transform ${
                  activeTab === 'wishlist'
                    ? 'bg-rose-500 text-white'
                    : 'bg-rose-50 border border-rose-100 text-rose-600 group-hover:scale-105'
                }`}
                style={{ borderRadius: '6px' }}
              >
                <Heart className={`w-4.5 h-4.5 sm:w-5 sm:h-5 ${activeTab === 'wishlist' ? 'fill-white text-white' : 'fill-rose-100 text-rose-600'}`} />
              </div>
              <div className="min-w-0 truncate">
                <h4 className={`text-xs sm:text-sm font-bold truncate ${activeTab === 'wishlist' ? 'text-slate-900' : 'text-slate-700 group-hover:text-slate-900'}`}>
                  My Wishlist
                </h4>
                <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
                  {wishlistedAgencies.length} saved {wishlistedAgencies.length === 1 ? 'agency' : 'agencies'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 ml-1">
              {wishlistedAgencies.length > 0 && (
                <span className="bg-rose-100 text-rose-600 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {wishlistedAgencies.length}
                </span>
              )}
              <ChevronRight className={`w-4 h-4 transition-all shrink-0 ${activeTab === 'wishlist' ? 'text-slate-900 translate-x-0.5' : 'text-slate-400 group-hover:text-slate-600'}`} />
            </div>
          </button>

          {/* Button 3: Chat with System (Travelers Only) or Agency Portal (Agencies) */}
          {!isAgency ? (
            <button
              type="button"
              onClick={onNavigateToChat}
              className="w-full p-3 sm:p-3.5 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50/50 flex items-center justify-between text-left transition-all cursor-pointer group shadow-2xs"
              style={{ borderRadius: '6px' }}
            >
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                <div 
                  className="w-9 h-9 sm:w-10 sm:h-10 bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0 group-hover:scale-105 transition-transform"
                  style={{ borderRadius: '6px' }}
                >
                  <MessageSquare className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-blue-600" />
                </div>
                <div className="min-w-0 truncate">
                  <h4 className="text-xs sm:text-sm font-bold text-slate-700 group-hover:text-slate-900 truncate">
                    Chat with System
                  </h4>
                  <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
                    Direct messages & enquiries
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 group-hover:translate-x-0.5 transition-all shrink-0 ml-1" />
            </button>
          ) : (
            <Link
              href="/agencytripdm"
              className="w-full p-3 sm:p-3.5 bg-white border border-slate-200 hover:border-orange-400 hover:bg-orange-50/20 flex items-center justify-between text-left transition-all cursor-pointer group shadow-2xs"
              style={{ borderRadius: '6px' }}
            >
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                <div 
                  className="w-9 h-9 sm:w-10 sm:h-10 bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-600 shrink-0 group-hover:scale-105 transition-transform"
                  style={{ borderRadius: '6px' }}
                >
                  <Building2 className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-orange-600" />
                </div>
                <div className="min-w-0 truncate">
                  <h4 className="text-xs sm:text-sm font-bold text-slate-700 group-hover:text-orange-600 truncate">
                    Agency Portal
                  </h4>
                  <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
                    Manage packages, chats & quotes
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-orange-600 group-hover:translate-x-0.5 transition-all shrink-0 ml-1" />
            </Link>
          )}
        </aside>

        {/* ══════════════════════════════════════════════════════════
            RIGHT / PRIMARY: PERSONAL INFO OR WISHLISTED AGENCIES
           ══════════════════════════════════════════════════════════ */}
        <div className="lg:col-span-8 space-y-4 w-full min-w-0">
          
          {/* ──────────────────────────────────────────────────────────
              VIEW A: PERSONAL INFORMATION
             ────────────────────────────────────────────────────────── */}
          {activeTab === 'profile' && (
            <div 
              className="bg-white border border-slate-200 p-4 sm:p-7 pb-6 sm:pb-7 shadow-2xs space-y-5 sm:space-y-6 animate-in fade-in duration-200 w-full min-w-0"
              style={{ borderRadius: '8px' }}
            >
              <div className="border-b border-slate-100 pb-4 flex items-center justify-between min-w-0">
                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                  <div 
                    className="w-8 h-8 sm:w-9 sm:h-9 bg-orange-50 border border-orange-200 flex items-center justify-center text-orange-600 font-bold shrink-0"
                    style={{ borderRadius: '6px' }}
                  >
                    <User className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-orange-600" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 truncate">Personal Information</h3>
                    <p className="text-xs text-slate-500 font-normal truncate">
                      Your contact credentials and verified profile details
                    </p>
                  </div>
                </div>
              </div>

              {/* Form Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4 w-full min-w-0">
                {/* Full Name */}
                <div className="space-y-1.5 min-w-0">
                  <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Full Name
                  </Label>
                  <Input
                    disabled={!isEditingProfile}
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    placeholder="Enter your full name"
                    className={`border-slate-200 text-sm font-medium h-10 w-full ${
                      !isEditingProfile ? 'bg-slate-50 text-slate-800' : 'bg-white focus-visible:ring-orange-500'
                    }`}
                    style={{ borderRadius: '6px' }}
                  />
                </div>

                {/* Phone Number */}
                <div className="space-y-1.5 min-w-0">
                  <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Phone Number
                  </Label>
                  <Input
                    disabled={!isEditingProfile}
                    value={profilePhone}
                    onChange={(e) => setProfilePhone(e.target.value)}
                    placeholder="e.g. +91 98765 43210"
                    className={`border-slate-200 text-sm font-medium h-10 w-full ${
                      !isEditingProfile ? 'bg-slate-50 text-slate-800' : 'bg-white focus-visible:ring-orange-500'
                    }`}
                    style={{ borderRadius: '6px' }}
                  />
                </div>

                {/* Email (Always Read-Only) */}
                <div className="space-y-1.5 sm:col-span-2 min-w-0">
                  <div className="flex flex-wrap items-center justify-between gap-1 min-w-0">
                    <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Email Address
                    </Label>
                    <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1 shrink-0">
                      <CheckCircle className="w-3 h-3" /> Verified Account
                    </span>
                  </div>
                  <Input
                    disabled
                    value={user?.email || ''}
                    className="border-slate-200 text-sm font-medium h-10 bg-slate-50 text-slate-600 w-full"
                    style={{ borderRadius: '6px' }}
                  />
                </div>

                {/* City / Region */}
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Location / Region
                  </Label>
                  <Input
                    disabled
                    value={displayLocation}
                    className="border-slate-200 text-sm font-medium h-10 bg-slate-50 text-slate-600 w-full"
                    style={{ borderRadius: '6px' }}
                  />
                </div>
              </div>

              {/* Inline Edit Buttons if Editing */}
              {isEditingProfile && (
                <div className="flex items-center justify-end gap-2.5 pt-4 pb-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsEditingProfile(false)}
                    className="bg-white/80 border border-slate-200/80 hover:bg-white text-slate-700 font-bold py-2.5 px-4 text-xs sm:text-sm transition-all cursor-pointer shadow-2xs"
                    style={{ borderRadius: '6px' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveProfile}
                    disabled={savingProfile}
                    className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 active:scale-95 text-white font-bold py-2.5 px-6 text-xs sm:text-sm shadow-md shadow-amber-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer border border-amber-400/50 disabled:opacity-50"
                    style={{ borderRadius: '6px' }}
                  >
                    {savingProfile ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ──────────────────────────────────────────────────────────
              VIEW B: WISHLISTED AGENCIES (Rendered right here in profile)
             ────────────────────────────────────────────────────────── */}
          {activeTab === 'wishlist' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              
              {/* Top Title & Badge */}
              <div 
                className="bg-white border border-slate-200 p-4 sm:p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                style={{ borderRadius: '8px' }}
              >
                <div className="flex items-center gap-3">
                  <div 
                    className="w-9 h-9 bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 font-bold"
                    style={{ borderRadius: '6px' }}
                  >
                    <Heart className="w-4.5 h-4.5 fill-rose-100 text-rose-600" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-slate-900">Saved Travel Agencies</h3>
                    <p className="text-xs text-slate-500 font-normal">
                      Verified agencies you saved for direct messaging, customized itineraries & quotes
                    </p>
                  </div>
                </div>

                {wishlistedAgencies.length > 0 && (
                  <span 
                    className="px-3 py-1 bg-rose-50 text-rose-700 text-xs font-bold border border-rose-200/80 self-start sm:self-auto shrink-0"
                    style={{ borderRadius: '4px' }}
                  >
                    {wishlistedAgencies.length} {wishlistedAgencies.length === 1 ? 'Agency' : 'Agencies'} Saved
                  </span>
                )}
              </div>

              {/* Wishlisted Agency Cards List */}
              {wishlistedAgencies.length > 0 ? (
                <div className="space-y-4">
                  {wishlistedAgencies.map((agency) => {
                    const photoIndex = activePhotoIndexes[agency.id] || 0;
                    const images = agency.packageImages || [];
                    const hasImages = images.length > 0;
                    const currentImg = hasImages ? (images[photoIndex] || images[0]) : null;

                    return (
                      <div
                        key={agency.id}
                        className="bg-white shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group flex flex-col md:flex-row p-4 sm:p-5 gap-5 items-stretch border border-slate-200"
                        style={{ borderRadius: '8px' }}
                      >
                        {/* Left: Package Photos Carousel or Logo Fallback */}
                        <div
                          className="relative w-full md:w-56 xl:w-64 h-48 sm:h-52 md:h-[200px] max-h-[200px] overflow-hidden shrink-0 bg-slate-100 flex items-center justify-center border border-slate-100"
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
                                  className="absolute top-2 left-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-bold px-2 py-0.5 shadow-xs flex items-center gap-1"
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

                              {/* Carousel Arrow Buttons */}
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
                            <div
                              className="w-full h-full min-h-[160px] bg-gradient-to-br from-slate-50 via-orange-50/40 to-slate-100 flex flex-col items-center justify-center p-4 text-center relative overflow-hidden"
                              style={{ borderRadius: '6px' }}
                            >
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

                        {/* Right: Agency Info & Action Buttons */}
                        <div className="flex-1 flex flex-col justify-between min-w-0 py-0.5">
                          <div>
                            {/* Row 1: Logo, Name & Verified Badges */}
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                              <div
                                className="flex items-center gap-3 min-w-0 cursor-pointer"
                                onClick={() => {
                                  if (onViewAgencyProfile) onViewAgencyProfile(agency);
                                }}
                              >
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
                                  <div className="flex items-center gap-1.5 text-slate-500 text-xs mt-0.5">
                                    <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                    <span className="truncate font-medium">{agency.location || `${agency.city || 'India'}, India`}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Rating / Partner Badge */}
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
                              ) : (
                                <div
                                  className="flex items-center gap-1.5 shrink-0 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold px-2.5 py-1 shadow-2xs"
                                  style={{ borderRadius: '6px' }}
                                >
                                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                                  <span>Verified Partner</span>
                                </div>
                              )}
                            </div>

                            {/* Stats */}
                            <div className="mt-3 flex flex-wrap items-center gap-4 py-2 border-t border-b border-slate-100 text-xs text-slate-600">
                              <div className="flex items-center gap-1.5">
                                <PackageIcon className="h-3.5 w-3.5 text-[#FF5500] shrink-0" />
                                <span className="font-bold text-slate-900">
                                  {agency.packageCount || 0} {agency.packageCount === 1 ? 'Package Listed' : 'Packages Listed'}
                                </span>
                              </div>
                              {agency.experienceYears ? (
                                <div className="flex items-center gap-1.5">
                                  <Briefcase className="h-3.5 w-3.5 text-[#FF5500] shrink-0" />
                                  <span className="font-medium text-slate-700">
                                    {agency.experienceYears} Years Exp
                                  </span>
                                </div>
                              ) : null}
                            </div>

                            {/* Description */}
                            {agency.description ? (
                              <p className="mt-2 text-xs text-slate-600 line-clamp-2 leading-relaxed font-normal">
                                {agency.description}
                              </p>
                            ) : null}
                          </div>

                          {/* Action Buttons */}
                          <div className="mt-4 pt-2 flex flex-wrap items-center justify-end gap-2 sm:gap-2.5 w-full min-w-0">
                            {/* Remove from Wishlist Toggle Button */}
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
                                className="p-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition-colors cursor-pointer shadow-2xs flex items-center gap-1.5 text-xs font-semibold"
                                style={{ borderRadius: '6px' }}
                                title="Remove from Wishlist"
                              >
                                <Heart className="h-4 w-4 fill-rose-600 text-rose-600" />
                                <span className="hidden sm:inline">Saved</span>
                              </button>
                            )}

                            {/* View Profile */}
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
                              className="bg-white/80 border border-slate-200/80 hover:bg-slate-50 hover:border-slate-300 hover:text-slate-900 text-slate-700 font-bold py-2.5 px-5 text-xs sm:text-sm transition-all cursor-pointer shadow-2xs"
                              style={{ borderRadius: '6px' }}
                            >
                              <span>View Profile</span>
                            </button>

                            {/* Chat with Agent */}
                            <button
                              type="button"
                              onClick={() => {
                                const firstPkg = agency.packages?.[0];
                                if (onInitiateChat) {
                                  onInitiateChat({
                                    agencyId: agency.id,
                                    agencyName: agency.name,
                                    ...(firstPkg || {}),
                                    id: firstPkg?.id,
                                    title: firstPkg?.title,
                                    duration: firstPkg?.duration ? String(firstPkg.duration) : undefined,
                                    price: firstPkg?.price,
                                  });
                                }
                              }}
                              className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 active:scale-95 text-white font-bold py-2.5 px-6 text-xs sm:text-sm shadow-md shadow-amber-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer border border-amber-400/50"
                              style={{ borderRadius: '6px' }}
                            >
                              <MessageSquare className="h-4 w-4" />
                              <span>Chat with Agent</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Clean Empty Wishlist State */
                <div 
                  className="bg-white border border-slate-200 p-8 sm:p-12 text-center shadow-2xs space-y-4"
                  style={{ borderRadius: '8px' }}
                >
                  <div 
                    className="w-16 h-16 bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-500 mx-auto shadow-xs"
                    style={{ borderRadius: '50%' }}
                  >
                    <Heart className="w-8 h-8 fill-rose-100 text-rose-500" />
                  </div>
                  <div className="max-w-md mx-auto space-y-1.5">
                    <h3 className="text-base sm:text-lg font-bold text-slate-900">
                      No Saved Travel Agencies Yet
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-500 leading-relaxed font-normal">
                      Explore verified travel agents across popular destinations and save your favorites here for easy direct messaging and customized packages.
                    </p>
                  </div>
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={onExploreAgents}
                      className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 active:scale-95 text-white font-bold py-2.5 px-6 text-xs sm:text-sm shadow-md shadow-amber-500/25 inline-flex items-center gap-2 transition-all cursor-pointer border border-amber-400/50"
                      style={{ borderRadius: '6px' }}
                    >
                      <Building2 className="w-4 h-4" />
                      <span>Explore Verified Travel Agents</span>
                    </button>
                  </div>
                </div>
              )}

            </div>
          )}

        </div>

      </div>

    </div>
  );
}
