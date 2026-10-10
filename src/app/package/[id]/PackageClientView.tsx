'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, User, Menu, X, Heart, Scale, MessageSquare, Palmtree, ChevronRight, LogOut, FileText, Briefcase, Shield, Building2, Sparkles, MapPin } from 'lucide-react';
import PackageDetailView from '@/components/PackageDetailView';
import AuthModal from '@/components/AuthModal';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useComparison } from '@/contexts/ComparisonContext';
import { getDbInstance } from '@/lib/firebase';
import { doc, getDoc, onSnapshot, updateDoc } from 'firebase/firestore';
import { useModalBackHandler } from '@/hooks/useModalHistory';

export default function PackageClientView({ listing }: { listing: any }) {
  const router = useRouter();
  const { user, userData, signIn, register, signInWithGoogle, signOut } = useAuth();
  const { comparisonList } = useComparison();
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [enrichedListing, setEnrichedListing] = useState(listing);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Modal & Drawer history handlers
  useModalBackHandler(mobileMenuOpen, () => setMobileMenuOpen(false), 'package_mobile_menu');
  useModalBackHandler(showAuthModal, () => setShowAuthModal(false), 'package_auth_modal');

  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1 && document.referrer.includes(window.location.host)) {
      router.back();
    } else {
      router.push('/');
    }
  };

  // User name helpers matching HomeClient.tsx
  const userFirstName =
    userData?.name?.trim()?.split(' ')[0] ||
    userData?.companyName?.trim()?.split(' ')[0] ||
    user?.displayName?.trim()?.split(' ')[0] ||
    (user?.email
      ? user.email.split('@')[0].charAt(0).toUpperCase() + user.email.split('@')[0].slice(1)
      : 'User');

  const userFullName =
    userData?.name?.trim() ||
    userData?.companyName?.trim() ||
    user?.displayName?.trim() ||
    (user?.email ? user.email.split('@')[0] : 'User');

  const userInitial = userFirstName.charAt(0).toUpperCase() || 'U';
  const userAvatar = (typeof userData?.avatarUrl === 'string' && userData.avatarUrl.trim() !== '') ? userData.avatarUrl.trim() : null;

  // Lock background scroll when mobile sidebar drawer is open & handle Escape key
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') setMobileMenuOpen(false);
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        document.body.style.overflow = '';
        window.removeEventListener('keydown', handleKeyDown);
      };
    } else {
      document.body.style.overflow = '';
    }
  }, [mobileMenuOpen]);

  useEffect(() => {
    async function fetchAgency() {
      if (listing.agencyId && !listing.agencyData) {
        const dbInstance = getDbInstance();
        if (dbInstance) {
          try {
            const agencyDoc = await getDoc(doc(dbInstance, 'users', listing.agencyId));
            if (agencyDoc.exists()) {
              const agencyData = agencyDoc.data();
              setEnrichedListing({
                ...listing,
                agencyData,
                agencyName: agencyData.companyName || 'Unknown Agency'
              });
            }
          } catch (e) {
            console.error("Error fetching agency client-side:", e);
          }
        }
      }
    }
    fetchAgency();
  }, [listing]);

  // Hydrate wishlist from localStorage on initial mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('tripdm_wishlist');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setWishlist(parsed);
        }
      }
    } catch (e) {
      console.warn('Could not hydrate wishlist from localStorage in PackageClientView:', e);
    }
  }, []);

  useEffect(() => {
    if (!user?.uid) return;
    const dbInstance = getDbInstance();
    if (!dbInstance) return;

    const unsubscribe = onSnapshot(doc(dbInstance, 'users', user.uid), (docSnapshot) => {
      if (docSnapshot.exists()) {
        const userData = docSnapshot.data();
        let wishlistData = userData.wishlist && Array.isArray(userData.wishlist)
          ? userData.wishlist
          : [];
        
        // Check for pending wishlist item saved before login
        const pendingWishlist = sessionStorage.getItem('pending_wishlist_target');
        if (pendingWishlist) {
          sessionStorage.removeItem('pending_wishlist_target');
          if (!wishlistData.includes(pendingWishlist)) {
            wishlistData = [...wishlistData, pendingWishlist];
            updateDoc(doc(dbInstance, 'users', user.uid), {
              wishlist: wishlistData
            }).catch(console.error);
          }
        }

        setWishlist(wishlistData);
        try {
          localStorage.setItem('tripdm_wishlist', JSON.stringify(wishlistData));
        } catch (e) {
          // ignore
        }
        
        if (!userData.wishlist && !pendingWishlist) {
          updateDoc(doc(dbInstance, 'users', user.uid), {
            wishlist: []
          }).catch(console.error);
        }
      }
    });

    return () => unsubscribe();
  }, [user?.uid]);

  const updateWishlistInFirestore = async (newWishlist: string[]) => {
    if (!user) return;
    const dbInstance = getDbInstance();
    if (!dbInstance) return;
    try {
      await updateDoc(doc(dbInstance, 'users', user.uid), {
        wishlist: newWishlist
      });
    } catch (error) {
      console.error('Error updating wishlist:', error);
    }
  };

  const handleWishlistToggle = (listingId: string) => {
    if (!user) {
      sessionStorage.setItem('pending_wishlist_target', listingId);
      setShowAuthModal(true);
      return;
    }
    setWishlist(prev => {
      const newWishlist = prev.includes(listingId)
        ? prev.filter(id => id !== listingId)
        : [...prev, listingId];
      try {
        localStorage.setItem('tripdm_wishlist', JSON.stringify(newWishlist));
      } catch (e) {
        // ignore
      }
      updateWishlistInFirestore(newWishlist);
      return newWishlist;
    });
  };
  
  // Auto-redirect to chat after user logs in if a pending chat target was saved
  useEffect(() => {
    if (user) {
      setShowAuthModal(false);
      try {
        const pendingRaw = sessionStorage.getItem('pending_chat_target');
        if (pendingRaw) {
          sessionStorage.removeItem('pending_chat_target');
          const pending = JSON.parse(pendingRaw);
          if (pending && pending.agencyId) {
            const pkgQuery = pending.packageId ? `&packageId=${encodeURIComponent(pending.packageId)}&packageTitle=${encodeURIComponent(pending.packageTitle || '')}&packageDuration=${encodeURIComponent(pending.packageDuration || '')}&packagePrice=${encodeURIComponent(pending.packagePrice || '')}` : '';
            router.push(`/?action=chat&agencyId=${pending.agencyId}&agencyName=${encodeURIComponent(pending.agencyName || 'Travel Agency')}${pkgQuery}`);
          }
        }
      } catch (e) {
        console.error('Error redirecting pending chat in PackageClientView:', e);
      }
    }
  }, [user, router]);

  return (
    <div className="min-h-screen flex flex-col relative">
      {/* Mobile Slide-in Navigation Sidebar Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[150] md:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer Panel */}
          <div className="fixed inset-y-0 left-0 w-[85vw] max-w-[340px] bg-white shadow-2xl flex flex-col z-[160] transition-transform duration-300 ease-out">
            {/* Drawer Top / Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div
                className="flex items-center gap-2 cursor-pointer"
                onClick={() => {
                  setMobileMenuOpen(false);
                  router.push('/');
                }}
              >
                <img src="/tripdm-logo.png" alt="TripDM Logo" className="h-10 w-auto object-contain" />
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 rounded-xl transition-colors"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* User Status Card */}
            <div className="p-4 bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent border-b border-slate-100">
              {user ? (
                <div className="flex items-center gap-3">
                  {userAvatar ? (
                    <img
                      src={userAvatar}
                      alt="Profile"
                      className="w-11 h-11 rounded-full object-cover border-2 border-white shadow-sm ring-1 ring-slate-200"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  ) : (
                    <div className="w-11 h-11 bg-gray-100 rounded-full flex items-center justify-center text-slate-600 border border-gray-200 shadow-xs">
                      <User className="h-6 w-6" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-500 font-medium">Signed in as</p>
                    <h4 className="text-sm font-bold text-slate-900 truncate">{userFullName}</h4>
                    <p className="text-[11px] text-slate-400 truncate">{user.email || userData?.email || ''}</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Welcome to TripDM</h4>
                    <p className="text-xs text-slate-500">Direct Message with verified travel agents</p>
                  </div>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setShowAuthModal(true);
                    }}
                    className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold text-xs py-2 h-9 rounded-xl shadow-sm flex items-center justify-center gap-1.5"
                  >
                    <User className="h-4 w-4" /> Sign In / Register
                  </button>
                </div>
              )}
            </div>

            {/* Navigation Links Scrollable Area */}
            <div className="flex-1 overflow-y-auto py-3 px-3 space-y-1 sidebar-scroll">
              <p className="text-[10px] uppercase font-bold text-slate-400 px-3 pt-1 pb-1 tracking-wider">Navigation</p>

              {/* Destinations */}
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  router.push('/?section=destinations');
                }}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-all"
              >
                <div className="flex items-center gap-3">
                  <MapPin className="h-4 w-4 text-orange-500" />
                  <span>Destinations</span>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-300" />
              </button>

              {/* Travel Agents */}
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  router.push('/?section=agents');
                }}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-all"
              >
                <div className="flex items-center gap-3">
                  <Building2 className="h-4 w-4 text-blue-500" />
                  <span>Travel Agents</span>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-300" />
              </button>

              {/* How It Works */}
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  router.push('/?section=how-it-works');
                }}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-all"
              >
                <div className="flex items-center gap-3">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  <span>How It Works</span>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-300" />
              </button>

              {/* Travel Stories */}
              <a
                href="/blog"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-all"
              >
                <div className="flex items-center gap-3">
                  <FileText className="h-4 w-4 text-purple-500" />
                  <span>Travel Stories</span>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-300" />
              </a>

              {/* Compare Packages */}
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  router.push('/?section=compare');
                }}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-all"
              >
                <div className="flex items-center gap-3">
                  <Scale className="h-4 w-4 text-blue-500" />
                  <span>Compare Packages</span>
                </div>
                <div className="flex items-center gap-2">
                  {comparisonList.length > 0 && (
                    <span className="bg-slate-900 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                      {comparisonList.length}
                    </span>
                  )}
                  <ChevronRight className="h-4 w-4 text-slate-300" />
                </div>
              </button>

              {/* Wishlist */}
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  if (!user) {
                    setShowAuthModal(true);
                  } else {
                    router.push('/?section=wishlist');
                  }
                }}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-all"
              >
                <div className="flex items-center gap-3">
                  <Heart className="h-4 w-4 text-rose-500" />
                  <span>My Wishlist</span>
                </div>
                <div className="flex items-center gap-2">
                  {wishlist.length > 0 && (
                    <span className="bg-rose-100 text-rose-600 text-xs font-bold px-2 py-0.5 rounded-full">
                      {wishlist.length}
                    </span>
                  )}
                  <ChevronRight className="h-4 w-4 text-slate-300" />
                </div>
              </button>

              {/* Messages (Only for non-agency users / travelers) */}
              {(!userData || userData.role !== 'agency') && (
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    if (!user) {
                      setShowAuthModal(true);
                    } else {
                      router.push('/?section=chat');
                    }
                  }}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <MessageSquare className="h-4 w-4 text-emerald-500" />
                    <span>Messages & Enquiries</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-300" />
                </button>
              )}

              {/* Profile */}
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  if (!user) {
                    setShowAuthModal(true);
                  } else {
                    router.push('/?section=profile');
                  }
                }}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-all"
              >
                <div className="flex items-center gap-3">
                  <User className="h-4 w-4 text-purple-500" />
                  <span>My Profile & Bookings</span>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-300" />
              </button>

              <div className="pt-4">
                <p className="text-[10px] uppercase font-bold text-slate-400 px-3 pb-1 tracking-wider">Explore More</p>
                <a
                  href="/blog"
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4 text-amber-500" />
                    <span>Travel Guides & Stories</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-300" />
                </a>
                <Link
                  href="/agencytripdm"
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    userData?.role === 'agency'
                      ? 'bg-orange-50 text-orange-600 font-bold border border-orange-200'
                      : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Briefcase className="h-4 w-4 text-orange-500" />
                    <span>{userData?.role === 'agency' ? 'Agency Portal Dashboard' : 'For Travel Agencies'}</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-300" />
                </Link>
                <a
                  href="/policies/conditions-of-use"
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                >
                  <div className="flex items-center gap-3">
                    <Shield className="h-4 w-4 text-slate-400" />
                    <span>Policies & Terms</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-300" />
                </a>
              </div>
            </div>

            {/* Drawer Footer */}
            {user && (
              <div className="p-3 border-t border-slate-100 bg-slate-50/70">
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    signOut?.();
                  }}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                >
                  <LogOut className="h-4 w-4" /> Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Top Header */}
      <header className="header-transition text-gray-900 z-[100] sticky top-0 bg-white/95 backdrop-blur-md shadow-sm border-b border-gray-200">
        {/* Desktop Header Layout */}
        <div className="hidden md:flex max-w-7xl mx-auto items-center justify-between gap-4 lg:gap-8 px-4 sm:px-6 h-16 md:h-[70px] w-full">
          {/* Logo */}
          <div
            className="flex items-center cursor-pointer shrink-0 py-1"
            onClick={() => router.push('/')}
          >
            <img src="/tripdm-logo.png" alt="TripDM Logo" className="h-12 sm:h-[54px] md:h-[60px] w-auto object-contain" />
          </div>

          {/* Center Navigation Links */}
          <nav className="flex items-center gap-5 lg:gap-8 shrink-0">
            <button
              type="button"
              onClick={() => router.push('/?section=destinations')}
              className="text-[15px] font-semibold whitespace-nowrap text-slate-800 hover:text-slate-950 transition-colors cursor-pointer"
            >
              Destinations
            </button>

            <button
              type="button"
              onClick={() => router.push('/?section=agents')}
              className="text-[15px] font-semibold whitespace-nowrap text-slate-800 hover:text-slate-950 transition-colors cursor-pointer"
            >
              Travel Agents
            </button>

            <button
              type="button"
              onClick={() => router.push('/?section=how-it-works')}
              className="text-[15px] font-semibold whitespace-nowrap text-slate-800 hover:text-slate-950 transition-colors cursor-pointer"
            >
              How It Works
            </button>

            <a
              href="/blog"
              className="text-[15px] font-semibold whitespace-nowrap text-slate-800 hover:text-slate-950 transition-colors cursor-pointer"
            >
              Travel Stories
            </a>
          </nav>

          {/* Right Action Icons & Profile / Login */}
          <div className="flex items-center gap-4 lg:gap-5 shrink-0">
            {/* Messages (Only for non-agency users / travelers) */}
            {(!userData || userData.role !== 'agency') && (
              <button
                type="button"
                className="cursor-pointer text-slate-700 hover:text-slate-950 relative p-1.5 transition-colors"
                style={{ borderRadius: '6px' }}
                onClick={() => {
                  if (!user) {
                    setShowAuthModal(true);
                    return;
                  }
                  router.push('/?section=chat');
                }}
                aria-label="Messages"
              >
                <MessageSquare className="h-5 w-5" />
              </button>
            )}

            {/* Profile / Sign In */}
            {user && userData ? (
              <div className="flex items-center gap-3 ml-1 border-l border-gray-200 pl-4">
                {/* ONLY VISIBLE TO LOGGED-IN AGENCIES */}
                {userData.role === 'agency' && (
                  <Link
                    href="/agencytripdm"
                    className="cursor-pointer text-[14px] font-semibold flex items-center gap-1.5 text-slate-800 hover:text-slate-950 shrink-0"
                    title="Go to Agency Portal"
                  >
                    <Building2 className="h-4 w-4 text-slate-600" />
                    <span>Agency Portal</span>
                  </Link>
                )}
                {userData.role === 'admin' && (
                  <a
                    href="/admin"
                    className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold bg-slate-800 text-white shadow-sm shrink-0"
                    style={{ borderRadius: '6px' }}
                    title="Go to Admin Dashboard"
                  >
                    <Shield className="h-3.5 w-3.5" />
                    <span>Admin Portal</span>
                  </a>
                )}

                <div
                  className="flex items-center gap-2 cursor-pointer text-[14px] font-semibold text-slate-800"
                  onClick={() => router.push('/?section=profile')}
                >
                  {userAvatar ? (
                    <img
                      src={userAvatar}
                      alt="Profile"
                      className="w-7 h-7 rounded-full object-cover ring-1 ring-slate-200"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  ) : (
                    <div className="w-7 h-7 bg-slate-100 text-slate-600 rounded-full flex items-center justify-center border border-slate-200">
                      <User className="w-4 h-4 text-slate-600" />
                    </div>
                  )}
                  <span>
                    Hi, {userFirstName}
                  </span>
                </div>
                
                <span
                  className="text-[13px] text-slate-600 hover:text-rose-600 cursor-pointer transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    signOut?.();
                  }}
                >
                  Sign Out
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-3 ml-1 border-l border-gray-200 pl-4">
                <Link
                  href="/agencytripdm"
                  className="cursor-pointer text-[14px] font-semibold flex items-center gap-1.5 text-slate-800 hover:text-slate-950 shrink-0"
                  title="Go to Agency Portal"
                >
                  <Building2 className="h-4 w-4 text-slate-600" />
                  <span>Agency Portal</span>
                </Link>
                <button
                  type="button"
                  onClick={() => setShowAuthModal(true)}
                  className="cursor-pointer text-[15px] font-semibold text-slate-800 flex items-center gap-1.5 ml-1 select-none hover:text-[#FF5500] transition-colors"
                >
                  <User className="h-4 w-4 text-slate-700" />
                  <span>Login</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Header Layout */}
        <div className="flex md:hidden items-center justify-between px-3 sm:px-4 h-16 w-full">
          {/* Left: Back Button, Hamburger Menu & Logo */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={handleBack}
              className="p-2 -ml-1 text-slate-700 hover:text-slate-900 hover:bg-slate-100 active:bg-slate-200 rounded-xl transition-colors focus:outline-none"
              aria-label="Go back"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>

            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 text-slate-700 hover:text-slate-900 hover:bg-slate-100 active:bg-slate-200 rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-slate-300"
              aria-label="Open navigation menu"
            >
              <Menu className="h-6 w-6" />
            </button>

            <div
              className="cursor-pointer flex items-center"
              onClick={() => router.push('/')}
            >
              <img src="/tripdm-logo.png" alt="TripDM Logo" className="h-10 sm:h-[48px] w-auto object-contain py-0.5" />
            </div>
          </div>

          {/* Right: Quick Action Icons */}
          <div className="flex items-center gap-1 sm:gap-1.5">
            {/* Compare Icon with Badge */}
            <button
              onClick={() => router.push('/?section=compare')}
              className="p-2 text-slate-700 hover:bg-slate-100 rounded-xl transition-colors relative"
              aria-label="Compare packages"
            >
              <Scale className="h-5 w-5" />
              {comparisonList.length > 0 && (
                <span className="absolute top-1 right-1 bg-slate-900 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center ring-2 ring-white">
                  {comparisonList.length}
                </span>
              )}
            </button>

            {/* Messages Icon (Only for non-agency users / travelers) */}
            {(!userData || userData.role !== 'agency') && (
              <button
                onClick={() => {
                  if (!user) {
                    setShowAuthModal(true);
                    return;
                  }
                  router.push('/?section=chat');
                }}
                className="p-2 text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
                aria-label="View messages"
              >
                <MessageSquare className="h-5 w-5" />
              </button>
            )}

            {/* Profile / Login Avatar */}
            {user && userData ? (
              <div className="flex items-center gap-1.5">
                {userData.role === 'agency' && (
                  <Link
                    href="/agencytripdm"
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-200 transition-all shrink-0"
                    title="Go to Agency Portal"
                  >
                    <Building2 className="h-3.5 w-3.5 text-gray-600" />
                    <span>Portal</span>
                  </Link>
                )}
                {userData.role === 'admin' && (
                  <a
                    href="/admin"
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-800 text-white shadow-sm shrink-0"
                    title="Go to Admin Dashboard"
                  >
                    <Shield className="h-3 w-3" />
                    <span>Admin</span>
                  </a>
                )}
                <button
                  onClick={() => router.push('/?section=profile')}
                  className="p-1 rounded-full hover:ring-2 hover:ring-orange-500/20 transition-all"
                  aria-label="User Profile"
                >
                  {userAvatar ? (
                    <img
                      src={userAvatar}
                      alt="Profile"
                      className="w-7 h-7 rounded-full object-cover ring-1 ring-slate-200"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center border border-slate-200">
                      <User className="w-4 h-4 text-slate-600" />
                    </div>
                  )}
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                className="px-3 py-1.5 text-xs font-semibold text-orange-600 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors flex items-center gap-1.5"
                aria-label="Login"
              >
                <User className="h-4 w-4 text-orange-500" /> Login
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="flex-1 bg-gray-50">
        <PackageDetailView 
          listing={enrichedListing} 
          onBack={handleBack}
          onBook={() => router.push(`/?action=book&packageId=${enrichedListing.id}`)}
          onChat={() => {
            const agencyId = enrichedListing.agencyId || enrichedListing.userId;
            const agencyName = enrichedListing.agencyName || 'Travel Agency';
            const rawPrice = enrichedListing.cost || enrichedListing.price || '';
            let packagePrice = '';
            if (rawPrice !== undefined && rawPrice !== null && rawPrice !== '' && rawPrice !== 'N/A') {
              const numPrice = Number(rawPrice);
              if (!isNaN(numPrice) && numPrice > 0) {
                packagePrice = Math.round(numPrice).toString();
              } else {
                packagePrice = String(rawPrice);
              }
            }
            let packageDuration = '';
            if (enrichedListing.duration && typeof enrichedListing.duration === 'string') {
              packageDuration = enrichedListing.duration;
            } else if (Array.isArray(enrichedListing.itinerary) && enrichedListing.itinerary.length > 0) {
              const d = enrichedListing.itinerary.length;
              const n = d > 1 ? d - 1 : 0;
              packageDuration = n > 0 ? `${d}D/${n}N` : `${d} Days`;
            } else if (enrichedListing.days) {
              const d = Number(enrichedListing.days);
              const n = enrichedListing.nights || (d > 1 ? d - 1 : 0);
              packageDuration = n > 0 ? `${d}D/${n}N` : `${d} Days`;
            }

            if (!user) {
              sessionStorage.setItem('pending_chat_target', JSON.stringify({
                agencyId,
                agencyName,
                packageId: enrichedListing.id,
                packageTitle: enrichedListing.title || '',
                packageDuration,
                packagePrice
              }));
              setShowAuthModal(true);
              return;
            }
            const durParam = packageDuration ? `&packageDuration=${encodeURIComponent(packageDuration)}` : '';
            const priceParam = packagePrice ? `&packagePrice=${encodeURIComponent(packagePrice)}` : '';
            router.push(`/?action=chat&agencyId=${agencyId}&agencyName=${encodeURIComponent(agencyName)}&packageId=${enrichedListing.id}&packageTitle=${encodeURIComponent(enrichedListing.title || '')}${durParam}${priceParam}`);
          }}
          onWishlist={handleWishlistToggle}
          isWishlisted={wishlist.includes(enrichedListing?.id)}
          onRequireLogin={() => setShowAuthModal(true)}
        />
      </div>

      {showAuthModal && (
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          onLogin={signIn}
          onRegister={register}
          onGoogleSignIn={signInWithGoogle}
          googleUser={user}
        />
      )}
    </div>
  );
}
