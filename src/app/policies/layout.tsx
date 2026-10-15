'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { User, Scale, Heart, MessageSquare, Shield, Search, Menu, X, Palmtree, ChevronRight, LogOut, FileText, Briefcase } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import Footer from '@/components/Footer';
import AuthModal from '@/components/AuthModal';

export default function PoliciesLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, userData, signIn, signInWithGoogle, register, signOut } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<'login' | 'signup'>('login');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  const handleAuthModalRegister = async (emailArg: string, passwordArg: string, role: 'user', data: { name: string; phone?: string }) => {
    if (register) {
      await register(emailArg, passwordArg, role, data);
    }
  };

  const tabs = [
    { name: 'About Us', href: '/policies/about' },
    { name: 'Terms & Conditions', href: '/policies/conditions-of-use' },
    { name: 'Privacy Policy', href: '/policies/privacy-notice' },
    { name: 'Copyright Policies', href: '/policies/internet-based-policy' },
  ];

  const isTabActive = (href: string) => {
    if (!pathname) return false;
    return pathname.replace(/\/$/, '') === href.replace(/\/$/, '');
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
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
            <div className="p-4 bg-slate-50/70 border-b border-slate-100">
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
                    className="w-full bg-white hover:bg-slate-50 text-slate-800 hover:text-slate-950 font-bold text-xs py-2 h-9 border border-slate-300 shadow-2xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    style={{ borderRadius: '6px' }}
                  >
                    <User className="h-4 w-4 text-slate-700" />
                    <span>Sign In / Register</span>
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
                  <Palmtree className="h-4 w-4 text-slate-700" />
                  <span>Explore Packages</span>
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
                  <Scale className="h-4 w-4 text-slate-700" />
                  <span>Compare Packages</span>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-300" />
              </button>

              {/* Wishlist */}
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  if (!user) {
                    setAuthModalTab('login');
                    setShowAuthModal(true);
                  } else {
                    router.push('/?section=wishlist');
                  }
                }}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-all"
              >
                <div className="flex items-center gap-3">
                  <Heart className="h-4 w-4 text-slate-700" />
                  <span>My Wishlist</span>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-300" />
              </button>

              {/* Messages (Only for non-agency users / travelers) */}
              {(!userData || userData.role !== 'agency') && (
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    router.push('/?section=chat');
                  }}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <MessageSquare className="h-4 w-4 text-slate-700" />
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
                  <User className="h-4 w-4 text-slate-700" />
                  <span>My Profile & Bookings</span>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-300" />
              </button>

              <div className="pt-4">
                <p className="text-[10px] uppercase font-bold text-slate-400 px-3 pb-1 tracking-wider">Policy Tabs</p>
                {tabs.map((tab) => (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                      isTabActive(tab.href)
                        ? 'bg-slate-100 text-slate-900 font-bold'
                        : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Shield className="h-4 w-4 text-slate-700" />
                      <span>{tab.name}</span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-300" />
                  </Link>
                ))}
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

      {/* Global Header */}
      <header className="header-transition bg-white/95 backdrop-blur-md text-gray-900 z-[100] sticky top-0 shadow-sm border-b border-gray-200">
        {/* Desktop Header Layout */}
        <div className="hidden md:flex max-w-7xl mx-auto items-center justify-between gap-4 lg:gap-6 px-4 h-16 w-full">
          {/* Logo */}
          <div 
            className="flex items-center gap-1 sm:gap-2 font-black tracking-tight cursor-pointer hover:opacity-90 transition-opacity shrink-0"
            onClick={() => router.push('/')}
          >
            <img src="/tripdm-logo.png" alt="TripDM Logo" className="h-16 md:h-20 w-auto object-contain py-1" />
          </div>
          
          {/* Search Bar */}
          <div className="flex-1 max-w-2xl mx-2 lg:mx-6">
            <div className="relative w-full">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <input 
                type="text" 
                placeholder="Search your Holiday Destination" 
                className="w-full pl-10 pr-4 py-1.5 rounded-full text-slate-900 bg-slate-50 border border-slate-200 text-sm h-10 shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    router.push('/');
                  }
                }}
              />
            </div>
          </div>

          {/* Right Links */}
          <div className="flex items-center gap-4 lg:gap-6 shrink-0">
            {/* Compare */}
            <span
              className="cursor-pointer text-[15px] font-medium text-slate-800 flex items-center gap-1.5 select-none"
              onClick={() => router.push('/?section=compare')}
            >
              <Scale className="h-4 w-4 text-slate-600" /> Compare
            </span>

            {/* Wishlist */}
            <span
              className="cursor-pointer text-[15px] font-medium text-slate-800 flex items-center gap-1.5 select-none"
              onClick={() => {
                if (!user) {
                  setAuthModalTab('login');
                  setShowAuthModal(true);
                  return;
                }
                router.push('/?section=wishlist');
              }}
            >
              <Heart className="h-4 w-4 text-slate-600" /> Wishlist
            </span>

            {/* Messages (Only for non-agency users / travelers) */}
            {(!userData || userData.role !== 'agency') && (
              <span
                className="cursor-pointer text-[15px] font-medium text-slate-800 flex items-center gap-1.5 select-none"
                onClick={() => router.push('/?section=chat')}
              >
                <MessageSquare className="h-4 w-4 text-slate-600" /> Messages
              </span>
            )}

            {/* Profile / Sign In */}
            {user ? (
              <div className="flex items-center gap-3 ml-2 border-l border-gray-200 pl-4">
                {userData?.role === 'agency' && (
                  <Link
                    href="/agencytripdm"
                    className="cursor-pointer text-[15px] font-medium flex items-center gap-1.5 text-slate-800 shrink-0"
                  >
                    <Briefcase className="h-4 w-4 text-slate-600" />
                    <span>Agency Portal</span>
                  </Link>
                )}
                <div
                  className="flex items-center gap-2 cursor-pointer text-[15px] font-medium text-slate-800"
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
                    <div className="w-7 h-7 bg-gray-100 rounded-full flex items-center justify-center text-slate-600 border border-gray-200">
                      <User className="h-4 w-4" />
                    </div>
                  )}
                  <span>Hi, {userFirstName}</span>
                </div>
                
                <span
                  className="text-[13px] text-slate-600 cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    signOut?.();
                  }}
                >
                  Sign Out
                </span>
              </div>
            ) : (
              <span
                onClick={() => { setAuthModalTab('login'); setShowAuthModal(true); }}
                className="cursor-pointer text-[15px] font-medium text-slate-800 flex items-center gap-1.5 ml-2 border-l border-gray-200 pl-4"
              >
                <User className="h-4 w-4 text-slate-600" /> Login
              </span>
            )}
          </div>
        </div>

        {/* Mobile Header Layout */}
        <div className="flex md:hidden items-center justify-between px-3 sm:px-4 h-16 w-full">
          {/* Left: Hamburger & Logo */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 -ml-1 text-slate-700 hover:text-orange-500 hover:bg-slate-100 active:bg-slate-200 rounded-xl transition-colors"
              aria-label="Open navigation menu"
            >
              <Menu className="h-6 w-6" />
            </button>
            <div 
              className="cursor-pointer flex items-center"
              onClick={() => router.push('/')}
            >
              <img src="/tripdm-logo.png" alt="TripDM Logo" className="h-10 sm:h-12 w-auto object-contain py-1" />
            </div>
          </div>

          {/* Right: Quick Action Links */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push('/')}
              className="text-xs font-bold text-slate-600 hover:text-orange-500 px-2.5 py-1 rounded-lg bg-slate-100"
            >
              Explore
            </button>

            {user ? (
              <button
                onClick={() => router.push('/?section=profile')}
                className="p-0.5 rounded-full ring-2 ring-orange-400"
                aria-label="User profile"
              >
                {userAvatar ? (
                  <img src={userAvatar} alt="Profile" className="w-7 h-7 rounded-full object-cover" />
                ) : (
                  <div className="w-7 h-7 bg-orange-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                    {userInitial}
                  </div>
                )}
              </button>
            ) : (
              <button
                onClick={() => { setAuthModalTab('login'); setShowAuthModal(true); }}
                className="px-3 py-1.5 text-xs font-bold text-slate-800 hover:text-slate-950 bg-white hover:bg-slate-50 border border-slate-300 shadow-2xs transition-colors"
                style={{ borderRadius: '6px' }}
              >
                Login
              </button>
            )}
          </div>
        </div>
      </header>
      {/* Top Policy Navigation Tabs Bar */}
      <div className="border-b border-slate-200 bg-white sticky top-16 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-10 overflow-x-auto hide-scrollbar" aria-label="Tabs">
            {tabs.map((tab) => {
              const isActive = isTabActive(tab.href);
              return (
                <Link
                  key={tab.name}
                  href={tab.href}
                  className={`
                    whitespace-nowrap py-3.5 px-0 border-b-2 text-sm sm:text-[15px] font-semibold transition-all cursor-pointer
                    ${
                      isActive
                        ? 'border-orange-500 text-orange-600 font-bold'
                        : 'border-transparent text-slate-600 hover:text-orange-500 hover:border-orange-400'
                    }
                  `}
                >
                  {tab.name}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Page Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14 flex-1 w-full">
        {children}
      </div>

      <Footer />

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        initialTab={authModalTab}
        onLogin={signIn || (async () => {})}
        onRegister={handleAuthModalRegister}
        onGoogleSignIn={signInWithGoogle || (async () => {})}
        googleUser={user}
      />
    </div>
  );
}
