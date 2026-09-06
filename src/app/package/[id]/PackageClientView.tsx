'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, User, Menu, X, Heart, Scale, MessageSquare, Palmtree, ChevronRight, LogOut, FileText, Briefcase, Shield } from 'lucide-react';
import PackageDetailView from '@/components/PackageDetailView';
import AuthModal from '@/components/AuthModal';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useComparison } from '@/contexts/ComparisonContext';
import { getDbInstance } from '@/lib/firebase';
import { doc, getDoc, onSnapshot, updateDoc } from 'firebase/firestore';


export default function PackageClientView({ listing }: { listing: any }) {
  const router = useRouter();
  const { user, userData, signIn, register, signInWithGoogle, signOut } = useAuth();
  const { comparisonList } = useComparison();
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [enrichedListing, setEnrichedListing] = useState(listing);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  useEffect(() => {
    if (!user) return;
    const dbInstance = getDbInstance();
    if (!dbInstance) return;

    const unsubscribe = onSnapshot(doc(dbInstance, 'users', user.uid), (docSnapshot) => {
      if (docSnapshot.exists()) {
        const userData = docSnapshot.data();
        const wishlistData = userData.wishlist && Array.isArray(userData.wishlist)
          ? userData.wishlist
          : [];
        setWishlist(wishlistData);
        
        if (!userData.wishlist) {
          updateDoc(doc(dbInstance, 'users', user.uid), {
            wishlist: []
          }).catch(console.error);
        }
      }
    });

    return () => unsubscribe();
  }, [user]);

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
      alert("Please login to add packages to your wishlist.");
      return;
    }
    setWishlist(prev => {
      const newWishlist = prev.includes(listingId)
        ? prev.filter(id => id !== listingId)
        : [...prev, listingId];
      updateWishlistInFirestore(newWishlist);
      return newWishlist;
    });
  };
  
  // Auto-redirect to chat after user logs in if a pending chat target was saved
  useEffect(() => {
    if (user) {
      try {
        const pendingRaw = sessionStorage.getItem('pending_chat_target');
        if (pendingRaw) {
          const pending = JSON.parse(pendingRaw);
          if (pending && pending.agencyId) {
            router.push(`/?action=chat&agencyId=${pending.agencyId}&agencyName=${encodeURIComponent(pending.agencyName || 'Travel Agency')}`);
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
              {user && userData ? (
                <div className="flex items-center gap-3">
                  {userData.avatarUrl ? (
                    <img src={userData.avatarUrl} alt="Profile" className="w-11 h-11 rounded-full object-cover border-2 border-white shadow-sm" />
                  ) : (
                    <div className="w-11 h-11 bg-orange-500 text-white rounded-full flex items-center justify-center font-bold text-base shadow-sm">
                      {userData.name ? userData.name.charAt(0).toUpperCase() : 'U'}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-500 font-medium">Signed in as</p>
                    <h4 className="text-sm font-bold text-slate-900 truncate">{userData.name || 'User'}</h4>
                    <p className="text-[11px] text-slate-400 truncate">{userData.email}</p>
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

              {/* Explore Packages */}
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  router.push('/');
                }}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-all"
              >
                <div className="flex items-center gap-3">
                  <Palmtree className="h-4 w-4 text-orange-500" />
                  <span>Explore All Packages</span>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-300" />
              </button>

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
                <ChevronRight className="h-4 w-4 text-slate-300" />
              </button>

              {/* Wishlist */}
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  router.push('/?section=wishlist');
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

              {/* Messages */}
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
                {userData?.role === 'agency' && (
                  <a
                    href="/agencytripdm"
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                  >
                    <div className="flex items-center gap-3">
                      <Briefcase className="h-4 w-4 text-slate-500" />
                      <span>For Travel Agencies</span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-300" />
                  </a>
                )}
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
      <header className="sticky top-0 z-[100] bg-white/95 backdrop-blur-md text-slate-800 h-16 flex items-center border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 px-3 sm:px-4 w-full h-full">
          {/* Left: Mobile Hamburger & Logo */}
          <div className="flex items-center gap-2 sm:gap-4 h-full">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 -ml-1 text-slate-700 hover:text-slate-900 hover:bg-slate-100 active:bg-slate-200 rounded-xl transition-colors"
              aria-label="Open menu"
            >
              <Menu className="h-6 w-6" />
            </button>
            <div 
              className="flex items-center gap-1 sm:gap-2 font-black tracking-tight cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => router.push('/')}
            >
              <img src="/tripdm-logo.png" alt="TripDM Logo" className="h-10 sm:h-12 md:h-16 w-auto object-contain py-1" />
            </div>
          </div>

          {/* Right Links - Desktop & Mobile */}
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Explore Link */}
            <button
              onClick={() => router.push('/')}
              className="hidden sm:inline-flex text-xs font-bold text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Explore Packages
            </button>

            {/* Compare Link */}
            <button
              onClick={() => router.push('/?section=compare')}
              className="hidden sm:inline-flex text-xs font-bold text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors items-center gap-1.5"
            >
              <Scale className="h-3.5 w-3.5 text-slate-600" />
              <span>Compare</span>
              {comparisonList.length > 0 && (
                <span className="bg-slate-900 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full ml-0.5">
                  {comparisonList.length}
                </span>
              )}
            </button>

            {user && userData ? (
              <div className="flex items-center gap-2 sm:gap-3">
                {userData.role === 'agency' && (
                  <a
                    href="/agencytripdm"
                    className="cursor-pointer transition-all text-xs font-semibold flex items-center gap-1.5 text-slate-700 hover:text-slate-900 px-2.5 py-1.5 rounded-md hover:bg-slate-100 transition-colors"
                  >
                    <Briefcase className="h-3.5 w-3.5 text-slate-500" />
                    <span className="hidden sm:inline">Agency Portal</span>
                  </a>
                )}
                <div
                  className="flex items-center gap-2 cursor-pointer transition-all text-sm font-semibold hover:text-slate-900 text-slate-800"
                  onClick={() => router.push('/?section=profile')}
                >
                  {userData.avatarUrl ? (
                    <img src={userData.avatarUrl} alt="Profile" className="w-7 h-7 rounded-full object-cover border border-gray-200" />
                  ) : (
                    <div className="w-7 h-7 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 border border-gray-200 text-xs font-bold">
                      {userData?.name ? userData.name.charAt(0).toUpperCase() : 'U'}
                    </div>
                  )}
                  <span className="hidden sm:inline">Hi, {userData?.name ? userData.name.split(' ')[0] : 'User'}</span>
                </div>
                
                <span
                  className="text-xs text-slate-500 hover:text-rose-600 cursor-pointer border-l border-gray-200 pl-3 transition-colors font-medium hidden sm:inline"
                  onClick={() => signOut?.()}
                >
                  Sign Out
                </span>
              </div>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                className="px-3 py-1.5 text-xs sm:text-sm font-bold text-orange-600 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors flex items-center gap-1.5"
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
          onBack={() => router.push('/')}
          onBook={() => router.push(`/?action=book&packageId=${enrichedListing.id}`)}
          onChat={() => {
            const agencyId = enrichedListing.agencyId || enrichedListing.userId;
            const agencyName = enrichedListing.agencyName || 'Travel Agency';
            if (!user) {
              sessionStorage.setItem('pending_chat_target', JSON.stringify({
                agencyId,
                agencyName,
                packageTitle: enrichedListing.title || ''
              }));
              setShowAuthModal(true);
              return;
            }
            router.push(`/?action=chat&agencyId=${agencyId}&agencyName=${encodeURIComponent(agencyName)}`);
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
