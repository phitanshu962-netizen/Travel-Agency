'use client';

import React, { useState, useEffect, useRef, useMemo, Fragment } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import AgencyListingForm from '@/components/AgencyListingForm';
import AdminChatViewer from '@/components/AdminChatViewer';
import BulkUploadForm from '@/components/BulkUploadForm';
import SearchFilters from '@/components/SearchFilters';
import ListingCard from '@/components/ListingCard';
import PackageDetailView from '@/components/PackageDetailView';
import PackageComparison from '@/components/PackageComparison';
import AdminLoginView from '@/components/AdminLoginView';
import AgencyLoginView from '@/components/AgencyLoginView';
import Footer from '@/components/Footer';
import AutocompleteSearch from '@/components/AutocompleteSearch';
import WishlistView from '@/components/WishlistView';
import AuthModal from '@/components/AuthModal';
import FilterSidebar from '@/components/FilterSidebar';
import UserProfile from '@/components/UserProfile';
import AdminCouponManagement from '@/components/AdminCouponManagement';

import AdminItineraryPhotoManager from '@/components/AdminItineraryPhotoManager';
import AdminBlogPhotoManager from '@/components/AdminBlogPhotoManager';
import CheckoutModal from '@/components/CheckoutModal';
import LandingDiscovery from '@/components/LandingDiscovery';
import { useComparison } from '@/contexts/ComparisonContext';
import { 
  User, 
  MapPin, 
  Scale, 
  MessageSquare, 
  Shield, 
  CreditCard, 
  ShoppingCart, 
  Heart, 
  Pencil, 
  Save, 
  Plus, 
  Trash2, 
  ArrowLeft, 
  ClipboardList, 
  Wrench,
  Camera,
  Search,
  LayoutGrid,
  Palmtree,
  Mountain,
  Globe,
  Flame,
  Compass,
  CheckCircle2,
  Clock,
  XCircle,
  ChevronLeft,
  ChevronUp,
  ChevronDown,
  Calendar,
  DollarSign,
  Check,
  CheckCheck,
  X,
  Building2,
  Tag,
  Utensils,
  TrendingUp,
  Info,
  Users,
  BarChart2, 
  Building, 
  Settings, 
  SlidersHorizontal,
  Plane, 
  Map as MapIcon, 
  Sparkles, 
  AlertCircle, 
  Send, 
  Star, 
  Phone, 
  Mail, 
  Lock, 
  Laptop, 
  HelpCircle, 
  CheckCircle, 
  Package,
  Smile,
  Printer,
  Share2,
  ThumbsUp,
  FileText,
  Zap,
  Home as HomeIcon,
  Upload,
  BarChart3,
  Briefcase,
  Menu,
  LogOut,
  ChevronRight,
  Image as ImageIcon,
  BookOpen
} from 'lucide-react';
import { collection, query, where, getDocs, updateDoc, doc, getDoc, addDoc, deleteDoc, onSnapshot, orderBy, setDoc } from 'firebase/firestore';
import { getDbInstance } from '@/lib/firebase';
import { compressMultipleImages, isValidImageFile, validateFileSize } from '@/lib/imageUtils';

const BUYER_QUICK_REPLIES = [
  "Is this package still available?",
  "Can you provide more details?",
  "Are dates flexible?",
  "Do you offer group discounts?"
];

const SELLER_QUICK_REPLIES = [
  "Yes, it's available. When are you planning to travel?",
  "Would you like me to send the complete itinerary?",
  "How many people are travelling?",
  "We have a special offer going on, would you like to hear about it?"
];

// Format conversation list timestamp (e.g. 03:25 pm, Yesterday, 04 Sep)
const formatConversationTime = (timestamp: any) => {
  if (!timestamp) return '';
  const date = timestamp?.seconds ? new Date(timestamp.seconds * 1000) : new Date(timestamp);
  if (isNaN(date.getTime())) return '';
  
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  
  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();
  
  if (isToday) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  }
  if (isYesterday) {
    return 'Yesterday';
  }
  if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }
  return date.toLocaleDateString([], { day: '2-digit', month: '2-digit', year: '2-digit' });
};

// Format date pill for chat grouping (e.g. Today, Yesterday, 04 Sep 2026)
const formatChatDateDivider = (timestamp: any) => {
  if (!timestamp) return '';
  const date = timestamp?.seconds ? new Date(timestamp.seconds * 1000) : new Date(timestamp);
  if (isNaN(date.getTime())) return '';
  
  const now = new Date();
  if (date.toDateString() === now.toDateString()) return 'Today';
  
  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  
  return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
};

const getTabIcon = (id: string, className?: string) => {
  switch (id) {
    case 'all':
    case 'all_packages':
      return <Palmtree className={className || "h-4 w-4"} />;
    case 'domestic':
    case 'domestic_tab':
      return <Mountain className={className || "h-4 w-4"} />;
    case 'international':
    case 'intl_tab':
      return <Globe className={className || "h-4 w-4"} />;
    case 'all_categories':
      return <LayoutGrid className={className || "h-4 w-4"} />;
    case 'family':
    case 'family_tab':
      return <Users className={className || "h-4 w-4"} />;
    case 'trending_tab':
      return <Flame className={className || "h-4 w-4"} />;
    case 'experience_tab':
      return <Compass className={className || "h-4 w-4"} />;
    case 'honeymoon_tab':
      return <Heart className={className || "h-4 w-4 fill-current text-current"} />;
    default:
      return null;
  }
};

const calcLevenshtein = (a: string, b: string): number => {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const matrix = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  return matrix[a.length][b.length];
};

const isFuzzySearchMatch = (searchQuery: string, text: string): boolean => {
  if (!searchQuery || !text) return false;
  const q = searchQuery.trim().toLowerCase();
  const t = text.toLowerCase();
  if (t.includes(q)) return true;

  // Handle multi-word / compound queries like "Assam Meghalaya" or "Kashmir, Ladakh"
  const queryTokens = q.split(/[\s,/\-&]+|\band\b/).map((s) => s.trim()).filter((s) => s.length >= 2);
  if (queryTokens.length > 1) {
    return queryTokens.every((token) => isFuzzySearchMatch(token, text));
  }

  // Short queries (3 chars or less like "Goa", "Leh") should only match exact substring
  if (q.length <= 3) return false;

  const words = t.split(/[\s,/\-.;:()]+/).filter(Boolean);
  return words.some((w) => {
    // Length difference must not exceed 1 for medium words, or 2 for long words
    if (Math.abs(w.length - q.length) > (q.length >= 7 ? 2 : 1)) return false;
    const dist = calcLevenshtein(q, w);
    if (q.length <= 6) return dist <= 1; // Allows 1 typo (e.g. "assm" -> "assam"), ignores distant words like "sam"
    return dist <= 2; // For long words (e.g. "rajastan" -> "rajasthan")
  });
};

const categoriesConfig = [
  {
    id: 'tourCategory',
    title: 'Tour by Category',
    subcategories: ['Family Tour', 'Group Tour', 'Fix Departure Tour', 'Honeymoon Tour'],
    linkText: 'See more'
  },
  {
    id: 'domestic',
    title: 'Domestic Packages',
    subcategories: ['Kashmir', 'Himachal', 'South', 'Rajasthan', 'North East'],
    linkText: 'See more'
  },
  {
    id: 'international',
    title: 'International Packages',
    subcategories: ['Dubai', 'Europe', 'Bali', 'Turkey'],
    linkText: 'Shop now'
  },
  {
    id: 'trending',
    title: 'Trending Destinations',
    subcategories: ['Baku', 'Singapore', 'Leh Ladakh', 'Manali'],
    linkText: 'See more'
  },
  {
    id: 'seasons',
    title: 'Seasonal Escapes',
    subcategories: ['Summer Retreats', 'Monsoon Magic', 'Winter Wonderland', 'Spring Getaways'],
    linkText: 'See more'
  },
  {
    id: 'events',
    title: 'Festive & Event Specials',
    subcategories: ['New Year & Christmas', 'Diwali Specials', 'Summer Vacations', 'Long Weekend Escapes'],
    linkText: 'See more'
  },
  {
    id: 'experiences',
    title: 'Experience Travel',
    subcategories: ['Trekking', 'Snow Enjoyment', 'Adventure', 'Water Sports'],
    linkText: 'Explore all'
  }
];

const subcategoryDescriptions: { [key: string]: string } = {
  'Family Tour': 'Create Memories with family',
  'Group Tour': 'Bring your group together to travel!',
  'Fix Departure Tour': 'Join groups, make friends!',
  'Honeymoon Tour': 'Make honeymoon memories!',
  'Kashmir': 'Paradise on Earth',
  'Himachal': 'Queen of Hills',
  'South': 'Backwaters & Temples',
  'Rajasthan': 'Land of Kings',
  'North East': 'Explore the Seven Sisters',
  'Dubai': 'Modern Oasis',
  'Europe': 'Classic Romance',
  'Bali': 'Tropical Heaven',
  'Turkey': 'East meets West',
  'Baku': 'Flame Towers & Caspian Sea',
  'Singapore': 'Lion City Adventure',
  'Leh Ladakh': 'High Mountain Passes',
  'Manali': 'Snowy Peak Escapes',
  '50% Off': 'Super Saver Deals',
  '10% Off': 'Special Season Discount',
  'Packages under 10K': 'Budget friendly tours',
  'Flash Deals': 'Limited time offers',
  'Trekking': 'Mountain Trails',
  'Snow Enjoyment': 'Winter Wonderland',
  'Adventure': 'Thrill seeker choice',
  'Water Sports': 'Beaches & Oceans',
  'Summer Retreats': 'Hill stations & cool escapes',
  'Monsoon Magic': 'Lush green scenic tours',
  'Winter Wonderland': 'Snow peaks & desert camps',
  'Spring Getaways': 'Pleasant sightseeing trips',
  'New Year & Christmas': 'Beach sides & year-end parties',
  'Diwali Specials': 'Heritage tours & palace stays',
  'Summer Vacations': 'Family beach & theme parks',
  'Long Weekend Escapes': 'Quick 2-3 day getaways'
};

const HERO_IMAGES = [
  'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=80&w=2074&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1434394354979-a235cd36269d?q=80&w=2070&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1542332213-9b5a5a3fad35?q=80&w=2070&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?q=80&w=2070&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1486870591958-9b9d0d1dda99?q=80&w=2070&auto=format&fit=crop',
];


export default function HomeClient({ initialListings = [], routeMode }: { initialListings?: any[], routeMode?: string }) {
  const { user, userData, loading, signIn, signInWithGoogle, signOut, register } = useAuth();
  
  const [currentHeroImage, setCurrentHeroImage] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentHeroImage((prev) => (prev + 1) % HERO_IMAGES.length);
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [isAgencyRegistration, setIsAgencyRegistration] = useState(true);
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  // Agency Registration Fields
  const [contactNumber, setContactNumber] = useState('');
  const [businessLocation, setBusinessLocation] = useState('');
  const [fullAddress, setFullAddress] = useState('');
  const [panCard, setPanCard] = useState<File | null>(null);
  const [gstCertificate, setGstCertificate] = useState<File | null>(null);
  const [businessProof, setBusinessProof] = useState<File | null>(null);
  const [agencyDescription, setAgencyDescription] = useState('');
  const [operatingFromHome, setOperatingFromHome] = useState(false);
  const [operatingFromOffice, setOperatingFromOffice] = useState(false);
  const [officeAddress, setOfficeAddress] = useState('');
  const [uploadOfficePhotos, setUploadOfficePhotos] = useState(false);
  const [uploadBranding, setUploadBranding] = useState(false);
  const [agencyPhotos, setAgencyPhotos] = useState<File[]>([]);
  const [refundPolicy, setRefundPolicy] = useState('');
  const [declarationChecked, setDeclarationChecked] = useState(false);
  const [pendingAgencies, setPendingAgencies] = useState<any[]>([]);
  const [activeSection, setActiveSection] = useState('overview');
  const [allAgencies, setAllAgencies] = useState<any[]>([]);
  const [pendingListings, setPendingListings] = useState<any[]>([]);
  const [agencyActiveSection, setAgencyActiveSection] = useState('listings');
  const [pricingConfig, setPricingConfig] = useState({ starterPrice: 2000, premiumPrice: 5000, vipPrice: 10000, addonCreditPrice: 1 });
  const searchParams = useSearchParams();
  const sectionParam = searchParams.get('section');
  
  useEffect(() => {
    if (loading) return;
    if (sectionParam) {
      if (sectionParam === 'compare') {
        setUserActiveSection('listings');
        setShowComparison(true);
      } else if (sectionParam === 'chat' || sectionParam === 'messages') {
        if (!user) {
          setAuthModalTab('login');
          setShowAuthModal(true);
        } else {
          setUserActiveSection('chat');
        }
      } else {
        setUserActiveSection(sectionParam);
      }
      if (typeof window !== 'undefined') {
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, [sectionParam, user, loading]);

  useEffect(() => {
    const fetchPricingConfig = async () => {
      try {
        const response = await fetch('/api/admin/get-config');
        if (response.ok) {
          const data = await response.json();
          setPricingConfig(data);
        }
      } catch (e) {
        console.error('Error fetching pricing config:', e);
      }
    };
    fetchPricingConfig();
  }, []);

  const [userActiveSection, setUserActiveSection] = useState('listings');  const [fromSection, setFromSection] = useState('listings');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

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

  const [chatMessages, setChatMessages] = useState<any[]>(() => {
    try {
      if (typeof window !== 'undefined') {
        const saved = sessionStorage.getItem('user_chat_messages');
        return saved ? JSON.parse(saved) : [];
      }
    } catch {}
    return [];
  });
  const [chatInput, setChatInput] = useState('');
  const [currentChatAgency, setCurrentChatAgency] = useState<string>(() => {
    try {
      if (typeof window !== 'undefined') {
        return sessionStorage.getItem('user_current_chat_agency') || '';
      }
    } catch {}
    return '';
  });

  // Checkout Modal State for Agency Plan Upgrades
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [checkoutTargetPlan, setCheckoutTargetPlan] = useState<'starter' | 'premium' | 'vip'>('starter');
  const [checkoutPlanTitle, setCheckoutPlanTitle] = useState('Standard Plan');
  const [checkoutOriginalPrice, setCheckoutOriginalPrice] = useState(2000);

  const openUpgradeCheckout = (plan: 'starter' | 'premium' | 'vip') => {
    setCheckoutTargetPlan(plan);
    if (plan === 'starter') {
      setCheckoutPlanTitle('Standard Plan');
      setCheckoutOriginalPrice(pricingConfig.starterPrice || 2000);
    } else if (plan === 'premium') {
      setCheckoutPlanTitle('Premium Plan');
      setCheckoutOriginalPrice(pricingConfig.premiumPrice || 5000);
    } else if (plan === 'vip') {
      setCheckoutPlanTitle('VIP Plan');
      setCheckoutOriginalPrice(pricingConfig.vipPrice || 10000);
    }
    setCheckoutModalOpen(true);
  };
  const [currentChatAgencyName, setCurrentChatAgencyName] = useState<string>(() => {
    try {
      if (typeof window !== 'undefined') {
        return sessionStorage.getItem('user_current_chat_agency_name') || '';
      }
    } catch {}
    return '';
  });
  const [currentChatAgencyIsOnline, setCurrentChatAgencyIsOnline] = useState<boolean>(false);
  const [currentChatAgencyLogo, setCurrentChatAgencyLogo] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState<boolean>(false);
  const [chatSearchQuery, setChatSearchQuery] = useState<string>('');
  const [showInChatSearch, setShowInChatSearch] = useState<boolean>(false);
  const [inChatSearchQuery, setInChatSearchQuery] = useState<string>('');
  const [inChatSearchIndex, setInChatSearchIndex] = useState<number>(0);
  const [showAgencyInChatSearch, setShowAgencyInChatSearch] = useState<boolean>(false);
  const [agencyInChatSearchQuery, setAgencyInChatSearchQuery] = useState<string>('');
  const [agencyInChatSearchIndex, setAgencyInChatSearchIndex] = useState<number>(0);
  const [listings, setListings] = useState<any[]>(initialListings);

  // ─── Admin Photo Manager helpers (merged from stash) ────────────────
  const adminMissingItineraryPhotosCount = useMemo(() => {
    let count = 0;
    listings.forEach((pkg: any) => {
      if (Array.isArray(pkg.itinerary)) {
        pkg.itinerary.forEach((day: any) => {
          const hasPhoto = !!(
            (Array.isArray(day.imageUrls) && day.imageUrls.length > 0 && day.imageUrls[0]) ||
            day.imageUrl
          );
          if (!hasPhoto) count++;
        });
      }
    });
    return count;
  }, [listings]);

  const [adminBlogs, setAdminBlogs] = useState<any[]>([]);

  useEffect(() => {
    if (userData?.role === 'admin') {
      fetch('/api/blog?all=true')
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data.blogs)) {
            setAdminBlogs(data.blogs);
          }
        })
        .catch(() => {});
    }
  }, [userData?.role]);

  const adminMissingBlogPhotosCount = useMemo(() => {
    return adminBlogs.filter((b: any) => !b.coverImage || b.coverImage.trim() === '').length;
  }, [adminBlogs]);
  const [agencyListings, setAgencyListings] = useState<any[]>([]);
  const [newListing, setNewListing] = useState({
    title: '',
    description: '',
    price: '',
    duration: '',
    destination: '',
    type: 'adventure',
    photos: [] as string[],
    rating: 0,
    reviewsCount: 0
  });
  const [agencyChatMessages, setAgencyChatMessages] = useState<any[]>(() => {
    try {
      if (typeof window !== 'undefined') {
        const saved = sessionStorage.getItem('agency_chat_messages');
        return saved ? JSON.parse(saved) : [];
      }
    } catch {}
    return [];
  });
  const [agencyChatInput, setAgencyChatInput] = useState('');
  const [agencyConversations, setAgencyConversations] = useState<any[]>(() => {
    try {
      if (typeof window !== 'undefined') {
        const saved = sessionStorage.getItem('agency_conversations');
        return saved ? JSON.parse(saved) : [];
      }
    } catch {}
    return [];
  });
  const [selectedConversation, setSelectedConversation] = useState<any>(() => {
    try {
      if (typeof window !== 'undefined') {
        const saved = sessionStorage.getItem('agency_selected_conversation');
        return saved ? JSON.parse(saved) : null;
      }
    } catch {}
    return null;
  });
  const selectedConversationRef = useRef<any>(null);
  selectedConversationRef.current = selectedConversation;
  const hasManuallyClosedChatRef = useRef(false);
  // Cache for user profile data - persists across re-renders so we don't re-fetch on every message update
  const agencyUserProfileCacheRef = useRef<Map<string, { name: string; logo: string | null }>>(new Map());
  const [agencyChatSearchQuery, setAgencyChatSearchQuery] = useState<string>('');
  const [agencyListingSearchQuery, setAgencyListingSearchQuery] = useState<string>('');
  const [showAgencyEmojiPicker, setShowAgencyEmojiPicker] = useState<boolean>(false);
  const [adminBuyerReplies, setAdminBuyerReplies] = useState<string[]>([]);
  const [adminSellerReplies, setAdminSellerReplies] = useState<string[]>([]);
  const [newBuyerReplyInput, setNewBuyerReplyInput] = useState('');
  const [newSellerReplyInput, setNewSellerReplyInput] = useState('');
  const [showListingForm, setShowListingForm] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [editingListing, setEditingListing] = useState<any>(null);
  const [viewingListing, setViewingListing] = useState<any>(null);
  const [tempPhotoFiles, setTempPhotoFiles] = useState<File[]>([]);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [bookingListing, setBookingListing] = useState<any>(null);
  const [bookingStep, setBookingStep] = useState(1);
  const [bookingData, setBookingData] = useState({
    travelers: 1,
    travelDate: '',
    specialRequests: '',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    preferences: [] as string[],
    paymentMethod: 'pay_later',
    insurance: false,
    termsAccepted: false,
    emergencyContact: '',
    dietaryRestrictions: '',
    accessibilityNeeds: '',
    bookingNotes: ''
  });
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [agencyBookings, setAgencyBookings] = useState<any[]>([]);
  const [userBookings, setUserBookings] = useState<any[]>([]);
  const [userConversations, setUserConversations] = useState<any[]>(() => {
    try {
      if (typeof window !== 'undefined') {
        const saved = sessionStorage.getItem('user_conversations');
        return saved ? JSON.parse(saved) : [];
      }
    } catch {}
    return [];
  });
  // Cache for agency profile data on user chat side - persists across re-renders to prevent re-fetching
  const userAgencyProfileCacheRef = useRef<Map<string, { name: string; isOnline: boolean; logoUrl: string | null }>>(new Map());
  // Customer Support & Dispute Resolution States
  const [supportTickets, setSupportTickets] = useState<any[]>([]);
  const [submittingSupportTicket, setSubmittingSupportTicket] = useState(false);
  const [supportBookingId, setSupportBookingId] = useState('');
  const [supportReason, setSupportReason] = useState('Agency is not responding after payment');
  const [supportSubject, setSupportSubject] = useState('');
  const [supportDescription, setSupportDescription] = useState('');
  const [showJourneyModal, setShowJourneyModal] = useState(false);
  const [selectedJourneyBooking, setSelectedJourneyBooking] = useState<any>(null);
  const [viewingAgency, setViewingAgency] = useState<any>(null);
  const [viewingAdminListing, setViewingAdminListing] = useState<any>(null);
  // User Experience Enhancements
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (searchTerm && typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [searchTerm]);

  const allDestinations = useMemo(() => {
    const dests = new Set<string>();
    
    // 1. Standard Popular States & International Tourism Destinations
    const coreDestinations = [
      // Domestic States & Major Hubs
      'Kerala', 'Rajasthan', 'Goa', 'Kashmir', 'Himachal Pradesh', 'Uttarakhand', 
      'Assam', 'Meghalaya', 'Sikkim', 'Ladakh', 'Karnataka', 'Tamil Nadu', 
      'Gujarat', 'Andaman', 'Maharashtra', 'Madhya Pradesh', 'Punjab', 'Uttar Pradesh',
      'Manali', 'Shimla', 'Munnar', 'Udaipur', 'Jaipur', 'Jaisalmer', 'Srinagar', 
      'Gulmarg', 'Pahalgam', 'Ooty', 'Coorg', 'Guwahati', 'Shillong', 'Darjeeling', 
      'Rishikesh', 'Varanasi', 'Agra', 'Alleppey', 'Wayanad', 'Kovalam',
      // International Top Destinations
      'Dubai', 'Thailand', 'Bali', 'Singapore', 'Maldives', 'Vietnam', 'Sri Lanka', 
      'Malaysia', 'Mauritius', 'Europe', 'Switzerland', 'Paris', 'Japan', 'Nepal'
    ];
    coreDestinations.forEach((p) => dests.add(p));

    // 2. Clean State & Country Names from Approved Packages
    listings.forEach((l) => {
      if (l.approved === false) return;

      const addCleanedLocation = (raw: string) => {
        if (!raw) return;
        raw.split(/,|\/|\band\b|&/i).forEach((part) => {
          const trimmed = part.trim();
          if (
            trimmed.length >= 3 && 
            trimmed.length <= 25 && 
            !/[|():;0-9]/.test(trimmed) &&
            !/package|tour|trip|holiday|deal|special|excursion|drop|pickup|hotel|resort|safari|airport|station|drive|transfer/i.test(trimmed)
          ) {
            const formatted = trimmed.split(' ').map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
            dests.add(formatted);
          }
        });
      };

      if (l.stateName) addCleanedLocation(l.stateName);
      if (l.countryName && l.packageType === 'international') addCleanedLocation(l.countryName);
      if (Array.isArray(l.stateNames)) l.stateNames.forEach((s: string) => addCleanedLocation(s));
      if (Array.isArray(l.countryNames) && l.packageType === 'international') l.countryNames.forEach((c: string) => addCleanedLocation(c));
      if (l.destination) addCleanedLocation(l.destination);
      
      // Clean major places covered (e.g. Munnar, Jaipur, Gulmarg)
      if (Array.isArray(l.placesCovered)) {
        l.placesCovered.forEach((p: any) => {
          if (p?.name && typeof p.name === 'string') {
            addCleanedLocation(p.name);
          }
        });
      }
    });

    const blocklist = ['fdgdh', 'fdgh', 'test', 'asdf', 'india'];
    return Array.from(dests).filter((d) => typeof d === 'string' && d.length >= 3 && !blocklist.includes(d.toLowerCase().trim()));
  }, [listings]);

  const [advancedFilters, setAdvancedFilters] = useState({
    duration: 7,
    budget: 77000,
    budgetCategory: null as string | null,
    hotelCategory: null as string | null,
  });
  const [showFilters, setShowFilters] = useState(false);
  const [showComparison, setShowComparison] = useState(false);

  // Chat auto-scroll refs
  const userChatEndRef = useRef<HTMLDivElement>(null);
  const agencyChatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    userChatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, currentChatAgency]);

  useEffect(() => {
    agencyChatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [agencyChatMessages, selectedConversation]);

  // Persist agency chat data to sessionStorage to eliminate stale-state flash on Alt+Tab
  useEffect(() => {
    try {
      if (agencyConversations.length > 0) {
        sessionStorage.setItem('agency_conversations', JSON.stringify(agencyConversations));
      }
    } catch {}
  }, [agencyConversations]);

  useEffect(() => {
    try {
      if (agencyChatMessages.length > 0) {
        sessionStorage.setItem('agency_chat_messages', JSON.stringify(agencyChatMessages));
      }
    } catch {}
  }, [agencyChatMessages]);

  useEffect(() => {
    try {
      if (selectedConversation) {
        sessionStorage.setItem('agency_selected_conversation', JSON.stringify(selectedConversation));
      } else {
        sessionStorage.removeItem('agency_selected_conversation');
      }
    } catch {}
  }, [selectedConversation]);

  // Persist user chat data to sessionStorage to eliminate stale-state flash on tab switches / Alt+Tab
  useEffect(() => {
    try {
      if (userConversations.length > 0) {
        sessionStorage.setItem('user_conversations', JSON.stringify(userConversations));
      }
    } catch {}
  }, [userConversations]);

  useEffect(() => {
    try {
      if (chatMessages.length > 0) {
        sessionStorage.setItem('user_chat_messages', JSON.stringify(chatMessages));
      }
    } catch {}
  }, [chatMessages]);

  useEffect(() => {
    try {
      if (currentChatAgency) {
        sessionStorage.setItem('user_current_chat_agency', currentChatAgency);
        sessionStorage.setItem('user_current_chat_agency_name', currentChatAgencyName);
      } else {
        sessionStorage.removeItem('user_current_chat_agency');
        sessionStorage.removeItem('user_current_chat_agency_name');
      }
    } catch {}
  }, [currentChatAgency, currentChatAgencyName]);

  // Synchronize current chat agency details when conversations change
  useEffect(() => {
    if (currentChatAgency && userConversations.length > 0) {
      const matched = userConversations.find(c => c.agencyId === currentChatAgency);
      if (matched) {
        if (matched.agencyName && matched.agencyName !== 'Unknown Agency' && currentChatAgencyName !== matched.agencyName) {
          setCurrentChatAgencyName(matched.agencyName);
        }
        if (matched.logoUrl && matched.logoUrl !== currentChatAgencyLogo) {
          setCurrentChatAgencyLogo(matched.logoUrl || null);
        }
        if (typeof matched.isOnline === 'boolean' && matched.isOnline !== currentChatAgencyIsOnline) {
          setCurrentChatAgencyIsOnline(matched.isOnline);
        }
      }
    }
  }, [userConversations, currentChatAgency]);

  // Deep linking for Chat, Book, and Wishlist from SEO routes
  useEffect(() => {
    if (loading) return;
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const chatAgencyId = urlParams.get('chat');
      const bookListingId = urlParams.get('book');
      const wishlistListingId = urlParams.get('wishlist');
      
      let shouldCleanUrl = false;

      if (chatAgencyId) {
        if (!user) {
          sessionStorage.setItem('pending_chat_target', JSON.stringify({
            agencyId: chatAgencyId,
            agencyName: 'Travel Agency'
          }));
          setAuthModalTab('login');
          setShowAuthModal(true);
        } else {
          setUserActiveSection('chat');
          setCurrentChatAgency(chatAgencyId);
        }
        shouldCleanUrl = true;
      }
      
      if (bookListingId) {
        // Find the listing from the fetched listings
        const listingToBook = listings.find(l => l.id === bookListingId);
        if (listingToBook) {
          setBookingListing(listingToBook);
          setShowBookingForm(true);
        }
        shouldCleanUrl = true;
      }

      if (wishlistListingId) {
        // Usually wishlist logic is handled per card, but we can set the active section
        setUserActiveSection('wishlist');
        shouldCleanUrl = true;
      }

      if (shouldCleanUrl) {
        // Clean URL to prevent reopening actions on refresh
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, [listings, user, loading]);
  
  // Dynamic Scroll Listener for sticky header scroll animations
  const [isScrolled, setIsScrolled] = useState(false);
  useEffect(() => {
    const handleScroll = () => {
      const scrollContainer = document.getElementById('user-dashboard-scroll-container');
      const scrollTop = Math.max(window.scrollY, scrollContainer ? scrollContainer.scrollTop : 0);
      setIsScrolled(scrollTop > 50);
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    
    const scrollContainer = document.getElementById('user-dashboard-scroll-container');
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
    }
    
    handleScroll();
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (scrollContainer) scrollContainer.removeEventListener('scroll', handleScroll);
    };
  }, [userActiveSection]);

  // Hero Search Widget states
  const [heroSearchInput, setHeroSearchInput] = useState('');
  const [heroTypeSelect, setHeroTypeSelect] = useState<'all' | 'domestic' | 'international'>('all');

  // Reviews & Ratings
  const [reviews, setReviews] = useState<any[]>([]);
  const [newReview, setNewReview] = useState({
    listingId: '',
    rating: 5,
    comment: '',
    photos: [] as string[]
  });
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewListing, setReviewListing] = useState<any>(null);
  // Wishlist functionality
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [showWishlist, setShowWishlist] = useState(false);
  const [pincode, setPincode] = useState<string>('Pincode 400605');

  // Pincode Modal States
  const [showPincodeModal, setShowPincodeModal] = useState(false);
  const [pincodeInput, setPincodeInput] = useState('');

  // Wishlist and Compare sub-tab state


  // Floating effects queue state
  const [floatingEffects, setFloatingEffects] = useState<Array<{ id: number; x: number; y: number; type: 'wishlist' | 'compare' }>>([]);

  // Handle deep linking from PackageClientView
  useEffect(() => {
    if (loading) return;
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const view = params.get('view');
      const action = params.get('action');
      const agencyId = params.get('agencyId');
      const agencyName = params.get('agencyName');
      const returnUrl = params.get('returnUrl');
      
      if (returnUrl) {
        sessionStorage.setItem('tripdm_return_url', returnUrl);
      }

      if (action === 'chat' && agencyId) {
        if (!user) {
          sessionStorage.setItem('pending_chat_target', JSON.stringify({
            agencyId,
            agencyName: agencyName || 'Travel Agency'
          }));
          setAuthModalTab('login');
          setShowAuthModal(true);
        } else {
          setUserActiveSection('chat');
          setCurrentChatAgency(agencyId);
          setCurrentChatAgencyName(agencyName || 'Travel Agency');
        }
        window.history.replaceState({}, '', window.location.pathname);
      } else if (view === 'compare') {
        setUserActiveSection('listings');
        setShowComparison(true);
        window.history.replaceState({}, '', window.location.pathname);
      } else if (view === 'messages') {
        if (!user) {
          setAuthModalTab('login');
          setShowAuthModal(true);
        } else {
          setUserActiveSection('chat');
        }
        setShowComparison(false);
        window.history.replaceState({}, '', window.location.pathname);
      } else if (view === 'wishlist' || view === 'support' || view === 'profile') {
        if (!user && (view === 'wishlist' || view === 'profile')) {
          setAuthModalTab('login');
          setShowAuthModal(true);
        } else {
          setUserActiveSection(view);
        }
        setShowComparison(false);
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, [user, loading]);

  // Profile States
  const [profileName, setProfileName] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [profilePhotoUrl, setProfilePhotoUrl] = useState('');
  const [profileImageError, setProfileImageError] = useState(false);
  const [coTravellers, setCoTravellers] = useState<any[]>([]);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [showAddCoTraveller, setShowAddCoTraveller] = useState(false);
  const [newCoTraveller, setNewCoTraveller] = useState({
    name: '',
    contact: '',
    relationship: 'Spouse'
  });
  const [savingProfile, setSavingProfile] = useState(false);

  // Credit & Subscription System States
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [chatUnlockTarget, setChatUnlockTarget] = useState<{ agencyId: string, agencyName: string, packageTitle: string } | null>(null);
  const [isPurchasingCredits, setIsPurchasingCredits] = useState(false);
  const [purchaseStatusText, setPurchaseStatusText] = useState('');

  // Profile Sub-tab Navigation state
  const [profileTab, setProfileTab] = useState<'account' | 'credits'>('account');

  // Custom premium Toast states and wrapper
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Listen for custom floating-effect events
  useEffect(() => {
    const handleFloatingEffect = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && typeof customEvent.detail.x === 'number') {
        const { x, y, type } = customEvent.detail;
        const id = Date.now() + Math.random();
        setFloatingEffects((prev) => [...prev, { id, x, y, type }]);
        // Remove particle after animation ends (1.2s)
        setTimeout(() => {
          setFloatingEffects((prev) => prev.filter((effect) => effect.id !== id));
        }, 1200);
      }
    };
    window.addEventListener('floating-effect', handleFloatingEffect);
    return () => window.removeEventListener('floating-effect', handleFloatingEffect);
  }, []);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
  };

  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<{ category: string; subcategory?: string; title: string } | null>(null);
  const [dashboardViewMode, setDashboardViewMode] = useState<'categories' | 'all'>('categories');

  const getFilteredListingsForSubcategory = (category: string, subcategory: string) => {
    return listings.filter((listing) => {
      if (!listing.approved) return false;

      if (category === 'tourCategory') {
        const cats = listing.tourCategories || [];
        if (subcategory === 'Family Tour') return cats.includes('Family');
        if (subcategory === 'Group Tour') return cats.includes('Friends') || cats.includes('Group');
        if (subcategory === 'Fix Departure Tour') return cats.includes('Fix Departure');
        if (subcategory === 'Honeymoon Tour') return cats.includes('Honeymoon');
      }

      if (category === 'domestic') {
        if (listing.packageType !== 'domestic') return false;
        const state = (listing.stateName || '').toLowerCase();
        if (subcategory === 'Kashmir') return state.includes('kashmir') || state.includes('jammu');
        if (subcategory === 'Himachal') return state.includes('himachal');
        if (subcategory === 'South') return state.includes('kerala') || state.includes('karnataka') || state.includes('tamil') || state.includes('south') || state.includes('goa') || state.includes('andhra');
        if (subcategory === 'Rajasthan') return state.includes('rajasthan');
        if (subcategory === 'North East') return state.includes('assam') || state.includes('meghalaya') || state.includes('sikkim') || state.includes('arunachal') || state.includes('nagaland') || state.includes('manipur') || state.includes('mizoram') || state.includes('tripura') || state.includes('north east');
      }

      if (category === 'international') {
        if (listing.packageType !== 'international') return false;
        const country = (listing.countryName || '').toLowerCase();
        if (subcategory === 'Dubai') return country.includes('dubai') || country.includes('emirates') || country.includes('uae');
        if (subcategory === 'Europe') return country.includes('europe') || country.includes('switzerland') || country.includes('france') || country.includes('italy') || country.includes('germany') || country.includes('united kingdom') || country.includes('london');
        if (subcategory === 'Bali') return country.includes('bali') || country.includes('indonesia');
        if (subcategory === 'Turkey') return country.includes('turkey');
      }

      if (category === 'trending') {
        const dest = ((listing.countryName || '') + ' ' + (listing.stateName || '') + ' ' + (listing.title || '')).toLowerCase();
        if (subcategory === 'Baku') return dest.includes('baku') || dest.includes('azerbaijan');
        if (subcategory === 'Singapore') return dest.includes('singapore');
        if (subcategory === 'Leh Ladakh') return dest.includes('ladakh') || dest.includes('leh');
        if (subcategory === 'Manali') return dest.includes('manali');
      }

      if (category === 'seasons') {
        const seasonVal = (listing.season || '').toLowerCase();
        if (subcategory === 'Summer Retreats') return seasonVal === 'summer';
        if (subcategory === 'Monsoon Magic') return seasonVal === 'monsoon';
        if (subcategory === 'Winter Wonderland') return seasonVal === 'winter';
        if (subcategory === 'Spring Getaways') return seasonVal === 'spring';
      }

      if (category === 'events') {
        const ev = (listing.eventType || '').toLowerCase();
        if (subcategory === 'New Year & Christmas') return ev === 'new-year';
        if (subcategory === 'Diwali Specials') return ev === 'diwali';
        if (subcategory === 'Summer Vacations') return ev === 'summer-vacation';
        if (subcategory === 'Long Weekend Escapes') return ev === 'weekend';
      }

      if (category === 'offers') {
        const priceVal = parseFloat(listing.cost || listing.price || '0');
        if (subcategory === '50% Off') return listing.discountCategory === '50-off';
        if (subcategory === '10% Off') return listing.discountCategory === '10-off';
        if (subcategory === 'Packages under 10K') return priceVal > 0 && priceVal < 10000;
        if (subcategory === 'Flash Deals') return listing.discountCategory === 'flash-deals';
      }

      if (category === 'experiences') {
        let expArray: string[] = [];
        if (Array.isArray(listing.experienceType)) {
          expArray = listing.experienceType.map((e: string) => e.toLowerCase());
        } else if (typeof listing.experienceType === 'string' && listing.experienceType) {
          expArray = [listing.experienceType.toLowerCase()];
        }
        
        if (subcategory === 'Trekking') return expArray.includes('trekking');
        if (subcategory === 'Snow Enjoyment') return expArray.includes('snow') || expArray.includes('snow enjoyment');
        if (subcategory === 'Adventure') return expArray.includes('adventure');
        if (subcategory === 'Water Sports') return expArray.includes('water-sports') || expArray.includes('water sports');
      }

      return false;
    });
  };

  const getSubcategoryCoverImage = (category: string, subcategory: string, matchedListings: any[]) => {
    if (matchedListings && matchedListings.length > 0) {
      const firstListing = matchedListings[0];
      const image = firstListing.placesCovered?.[0]?.imageUrls?.[0] || firstListing.photos?.[0];
      if (image) return image;
    }

    const fallbacks: { [key: string]: string } = {
      'Family Tour': 'https://images.unsplash.com/photo-1543039625-14cbd3802e7d?auto=format&fit=crop&q=80&w=400',
      'Group Tour': 'https://images.unsplash.com/photo-1539635278303-d4002c07eae3?auto=format&fit=crop&q=80&w=400',
      'Fix Departure Tour': 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&q=80&w=400',
      'Honeymoon Tour': 'https://images.unsplash.com/photo-1510312305653-8ed496efae75?auto=format&fit=crop&q=80&w=400',
      'Kashmir': 'https://images.unsplash.com/photo-1566228015668-4c45dbc4e2f5?auto=format&fit=crop&q=80&w=400',
      'Himachal': 'https://images.unsplash.com/photo-1605649487212-47bdab064df7?auto=format&fit=crop&q=80&w=400',
      'South': 'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&q=80&w=400',
      'Rajasthan': 'https://images.unsplash.com/photo-1599661046289-e31897846e41?auto=format&fit=crop&q=80&w=400',
      'Dubai': 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&q=80&w=400',
      'Europe': 'https://images.unsplash.com/photo-1467269204594-9661b134dd2b?auto=format&fit=crop&q=80&w=400',
      'Bali': 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&q=80&w=400',
      'Turkey': 'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?auto=format&fit=crop&q=80&w=400',
      'Baku': 'https://images.unsplash.com/photo-1618083707368-b3823daa2726?auto=format&fit=crop&q=80&w=400',
      'Singapore': 'https://images.unsplash.com/photo-1525625293386-3f8f99389edd?auto=format&fit=crop&q=80&w=400',
      'Leh Ladakh': 'https://images.unsplash.com/photo-1621415263409-2259bdd2ac0d?auto=format&fit=crop&q=80&w=400',
      'Manali': 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&q=80&w=400',
      'Trekking': 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&q=80&w=400',
      'Snow Enjoyment': 'https://images.unsplash.com/photo-1482862549707-f63cb32c5fd9?auto=format&fit=crop&q=80&w=400',
      'Adventure': 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&q=80&w=400',
      'Water Sports': 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=400',
      'Summer Retreats': 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&q=80&w=400',
      'Monsoon Magic': 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&q=80&w=400',
      'Winter Wonderland': 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&q=80&w=400',
      'Spring Getaways': 'https://images.unsplash.com/photo-1492496913980-501348b61469?auto=format&fit=crop&q=80&w=400',
      'New Year & Christmas': 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&q=80&w=400',
      'Diwali Specials': 'https://images.unsplash.com/photo-1582650625119-3a31f8fa2699?auto=format&fit=crop&q=80&w=400',
      'Summer Vacations': 'https://images.unsplash.com/photo-1506929562872-bb421503ef21?auto=format&fit=crop&q=80&w=400',
      'Long Weekend Escapes': 'https://images.unsplash.com/photo-1501555088652-021faa106b9b?auto=format&fit=crop&q=80&w=400'
    };

    return fallbacks[subcategory] || 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&q=80&w=400';
  };

  // Shadow global alert to show premium toast notification banner
  const alert = (message: string) => {
    let type: 'success' | 'error' | 'info' = 'info';
    const lower = message.toLowerCase();
    if (
      lower.includes('success') ||
      lower.includes('complete') ||
      lower.includes('added') ||
      lower.includes('unlocked') ||
      lower.includes('approved') ||
      lower.includes('bonus') ||
      lower.includes('copied')
    ) {
      type = 'success';
    } else if (
      lower.includes('failed') ||
      lower.includes('error') ||
      lower.includes('insufficient') ||
      lower.includes('not supported') ||
      lower.includes('invalid') ||
      lower.includes('please fill')
    ) {
      type = 'error';
    }
    showToast(message, type);
  };

  // Load Profile States from userData & user
  useEffect(() => {
    if (user && userData && userData.role === 'user') {
      setProfileName(userData.name || '');
      setProfilePhone(userData.phone || userData.contactNumber || '');
      setProfileEmail(user.email || '');
      setProfilePhotoUrl(userData.avatarUrl || user.photoURL || '');
      setProfileImageError(false);
      setCoTravellers(userData.coTravellers || []);
    }
  }, [user?.uid, userData?.role, userData?.name, userData?.phone, userData?.contactNumber, userData?.avatarUrl, userData?.coTravellers]);

  // Fetch user's pincode automatically with robust API waterfall & IP fallback
  useEffect(() => {
    if (userData?.role === 'user') {
      const fetchIpPincode = async () => {
        try {
          const res = await fetch('https://ipapi.co/json/');
          const data = await res.json();
          if (data && data.postal) {
            setPincode(`Pincode ${data.postal}`);
          }
        } catch (e) {
          console.error('IP geolocation fallback error:', e);
        }
      };

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            try {
              const { latitude, longitude } = position.coords;
              let gotPincode = false;

              // 1. Try BigDataCloud (fast, reliable CORS client-side geocoding)
              try {
                const bdcResponse = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`);
                const bdcData = await bdcResponse.json();
                if (bdcData && bdcData.postcode) {
                  setPincode(`Pincode ${bdcData.postcode}`);
                  gotPincode = true;
                }
              } catch (err) {
                console.error('BigDataCloud geocoding error:', err);
              }

              // 2. Try Nominatim (secondary fallback)
              if (!gotPincode) {
                try {
                  const nomResponse = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
                  const nomData = await nomResponse.json();
                  if (nomData && nomData.address && nomData.address.postcode) {
                    setPincode(`Pincode ${nomData.address.postcode}`);
                    gotPincode = true;
                  }
                } catch (err) {
                  console.error('Nominatim geocoding error:', err);
                }
              }

              // 3. Try IP geolocation if geocoding requests failed
              if (!gotPincode) {
                await fetchIpPincode();
              }
            } catch (error) {
              console.error('Error in coordinates geocoding waterfall:', error);
              await fetchIpPincode();
            }
          },
          async (error) => {
            console.warn('Geolocation permission denied or error. Falling back to IP-based location:', error);
            await fetchIpPincode();
          },
          { timeout: 8000 }
        );
      } else {
        fetchIpPincode();
      }
    }
  }, [userData?.role]);

  // Save profile modifications to Firestore
  const handleSaveProfile = async () => {
    if (!user) return;
    const dbInstance = getDbInstance();
    if (!dbInstance) return;

    setSavingProfile(true);
    try {
      await updateDoc(doc(dbInstance, 'users', user.uid), {
        name: profileName,
        phone: profilePhone,
        coTravellers: coTravellers
      });
      setIsEditingProfile(false);
    } catch (error) {
      console.error('Error saving profile:', error);
    } finally {
      setSavingProfile(false);
    }
  };

  // Upload avatar to Firebase Storage and update user document
  const handleProfilePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !user) return;
    const selectedFile = e.target.files[0];

    if (!isValidImageFile(selectedFile)) {
      alert('Please select a valid image file (PNG, JPG, WEBP, JPEG).');
      return;
    }

    const dbInstance = getDbInstance();
    if (!dbInstance) return;

    try {
      const compressedFiles = await compressMultipleImages([selectedFile]);
      const fileToUpload = compressedFiles[0];

      const formData = new FormData();
      formData.append('file', fileToUpload);
      formData.append('category', 'avatars');
      formData.append('userId', user.uid);

      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      if (!res.ok) throw new Error('Upload failed');
      const uploadData = await res.json();
      const downloadUrl = uploadData.url;

      await updateDoc(doc(dbInstance, 'users', user.uid), {
        avatarUrl: downloadUrl
      });

      setProfilePhotoUrl(downloadUrl);
      setProfileImageError(false);
      alert('Profile picture updated successfully!');
    } catch (error) {
      console.error('Error uploading profile photo:', error);
      alert('Failed to upload profile picture.');
    }
  };

  // Agency Settings States (agencyDescription is defined at line 196)
  const [agencyCompanyName, setAgencyCompanyName] = useState('');
  const [agencyContactEmail, setAgencyContactEmail] = useState('');
  const [agencyLogoUrl, setAgencyLogoUrl] = useState('');
  const [agencyLogoError, setAgencyLogoError] = useState(false);
  const [savingAgencySettings, setSavingAgencySettings] = useState(false);
  const [agencyDefaultInclusions, setAgencyDefaultInclusions] = useState<string[]>([]);
  const [agencyDefaultExclusions, setAgencyDefaultExclusions] = useState<string[]>([]);
  const loadedAgencyUserIdRef = useRef<string | null>(null);

  // Load Agency States from userData & user (only once per user session to prevent overwriting unsaved edits on snapshot re-renders)
  useEffect(() => {
    if (user && userData && userData.role === 'agency') {
      if (loadedAgencyUserIdRef.current !== user.uid) {
        loadedAgencyUserIdRef.current = user.uid;
        setAgencyCompanyName(userData.companyName || userData.name || '');
        setAgencyContactEmail(userData.contactEmail || user.email || '');
        setAgencyDescription(userData.description || userData.agencyDescription || '');
        setAgencyLogoUrl(userData.logoUrl || userData.agencyLogo || userData.avatarUrl || '');
        
        const incls = Array.isArray(userData.defaultInclusions)
          ? userData.defaultInclusions
          : userData.defaultInclusions 
            ? userData.defaultInclusions.split('\n').filter(Boolean)
            : [];
        const excls = Array.isArray(userData.defaultExclusions)
          ? userData.defaultExclusions
          : userData.defaultExclusions 
            ? userData.defaultExclusions.split('\n').filter(Boolean)
            : [];
            
        setAgencyDefaultInclusions(incls);
        setAgencyDefaultExclusions(excls);
        setAgencyLogoError(false);
      }
    } else if (!user) {
      loadedAgencyUserIdRef.current = null;
    }
  }, [user?.uid, userData?.role]);

  // Upload Agency Logo to Firebase Storage and update user document
  const handleAgencyLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !user) return;
    const selectedFile = e.target.files[0];

    if (!isValidImageFile(selectedFile)) {
      alert('Please select a valid image file (PNG, JPG, WEBP, JPEG).');
      return;
    }

    const dbInstance = getDbInstance();
    if (!dbInstance) return;

    try {
      const compressedFiles = await compressMultipleImages([selectedFile]);
      const fileToUpload = compressedFiles[0];

      const formData = new FormData();
      formData.append('file', fileToUpload);
      formData.append('category', 'logos');
      formData.append('userId', user.uid);

      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      if (!res.ok) throw new Error('Upload failed');
      const uploadData = await res.json();
      const downloadUrl = uploadData.url;

      await updateDoc(doc(dbInstance, 'users', user.uid), {
        logoUrl: downloadUrl
      });

      setAgencyLogoUrl(downloadUrl);
      setAgencyLogoError(false);
      alert('Agency logo updated successfully!');
    } catch (error) {
      console.error('Error uploading agency logo:', error);
      alert('Failed to upload agency logo. Please try again.');
    }
  };

  // Save Agency Settings to Firestore
  const handleSaveAgencySettings = async () => {
    if (!user) return;
    const dbInstance = getDbInstance();
    if (!dbInstance) return;

    setSavingAgencySettings(true);
    try {
      const cleanInclusions = agencyDefaultInclusions.filter((item) => item.trim() !== '');
      const cleanExclusions = agencyDefaultExclusions.filter((item) => item.trim() !== '');

      await setDoc(doc(dbInstance, 'users', user.uid), {
        companyName: agencyCompanyName,
        contactEmail: agencyContactEmail,
        description: agencyDescription,
        agencyDescription: agencyDescription,
        defaultInclusions: cleanInclusions,
        defaultExclusions: cleanExclusions
      }, { merge: true });

      // Update local state to cleaned values
      setAgencyDefaultInclusions(cleanInclusions);
      setAgencyDefaultExclusions(cleanExclusions);

      alert('Agency settings saved successfully!');
    } catch (error) {
      console.error('Error saving agency settings:', error);
      alert('Failed to save agency settings. Please try again.');
    } finally {
      setSavingAgencySettings(false);
    }
  };

  // Credit system auto-migration hook for existing agencies
  useEffect(() => {
    const migrateExistingAgency = async () => {
      if (user && userData && userData.role === 'agency' && userData.plan === undefined) {
        const dbInstance = getDbInstance();
        if (!dbInstance) return;
        try {
          await updateDoc(doc(dbInstance, 'users', user.uid), {
            plan: 'free',
            credits: 0,
            freeChats: 2,
            unlockedUsers: [],
            creditHistory: [
              {
                id: 'TX-MIG',
                type: 'reset',
                amount: 2,
                description: 'Migration Bonus: Initialized Free Plan (2 Free Chats)',
                timestamp: Date.now()
              }
            ]
          });
          console.log('Agency credit system successfully migrated');
        } catch (e) {
          console.error('Migration failed:', e);
        }
      }
    };
    migrateExistingAgency();
  }, [user?.uid, userData?.role, userData?.plan]);

  // Auto-resume pending chat once user logs in
  useEffect(() => {
    if (user) {
      try {
        const pending = sessionStorage.getItem('pending_chat_target');
        if (pending) {
          sessionStorage.removeItem('pending_chat_target');
          const target = JSON.parse(pending);
          if (target.agencyId) {
            setCurrentChatAgency(target.agencyId);
            setCurrentChatAgencyName(target.agencyName || 'Travel Agency');
            const matchedConv = userConversations.find(c => c.agencyId === target.agencyId);
            setCurrentChatAgencyIsOnline(matchedConv ? matchedConv.isOnline : false);
            setUserActiveSection('chat');
            setShowComparison(false);
            setViewingListing(null);
          }
        }
      } catch (e) {
        console.error('Error opening pending chat target:', e);
      }
    }
  }, [user]);

  // Intercept chat request and direct to chat (requiring login first)
  const handleInitiateChat = (listingData: any) => {
    console.log('handleInitiateChat called with listing:', listingData);

    const agencyId = listingData?.agencyId || listingData?.userId;
    const agencyName = listingData?.agencyName || 'Travel Agency';

    // Check if user is logged in
    if (!user) {
      if (agencyId) {
        sessionStorage.setItem('pending_chat_target', JSON.stringify({
          agencyId,
          agencyName,
          packageTitle: listingData?.title || ''
        }));
      }
      setAuthModalTab('login');
      setShowAuthModal(true);
      return;
    }

    // Check if the user is logged in as an agency (agencies don't need to initiate chat with themselves)
    const isAgency = userData && userData.role !== 'user';
    if (isAgency) {
      alert('Only travelers can initiate chats with agencies.');
      return;
    }

    if (!agencyId) {
      alert('Unable to identify agency for this package.');
      return;
    }

    // Direct redirect
    setCurrentChatAgency(agencyId);
    setCurrentChatAgencyName(agencyName);
    const matchedConv = userConversations.find(c => c.agencyId === agencyId);
    setCurrentChatAgencyIsOnline(matchedConv ? matchedConv.isOnline : false);
    setUserActiveSection('chat');
    setViewingListing(null);
    setShowComparison(false);
  };

  // Deduct credits/chats and unlock the customer connection for the agency
  const unlockCustomerChat = async (userId: string, userName: string) => {
    if (!user || !userData) return;

    const dbInstance = getDbInstance();
    if (!dbInstance) return;

    const currentPlan = userData.plan || 'free';
    const currentCredits = userData.credits ?? 0;
    const unlockedList = userData.unlockedUsers || [];

    let updatedCredits = currentCredits;
    let costAmount = 0;

    // Determine cost
    if (currentPlan === 'free' || currentPlan === 'starter') {
      costAmount = 50;
    } else if (currentPlan === 'premium') {
      costAmount = 40;
    } else if (currentPlan === 'vip') {
      costAmount = 30;
    }

    if (currentCredits < costAmount) {
      alert('Insufficient credits. Please purchase a top-up pack or change your plan.');
      return;
    }

    updatedCredits = currentCredits - costAmount;

    const txId = 'TX-CH-' + Math.random().toString(36).substr(2, 9).toUpperCase();
    const newTransaction = {
      id: txId,
      type: 'deduction',
      amount: costAmount,
      description: `Unlocked chat connection with traveler: ${userName}`,
      timestamp: Date.now()
    };
    
    const expiryTimestamp = Date.now() + 15 * 24 * 60 * 60 * 1000; // 15 days
    const unlockRecord = { userId: userId, expiresAt: expiryTimestamp };

    try {
      await updateDoc(doc(dbInstance, 'users', user.uid), {
        credits: updatedCredits,
        unlockedUsers: [...unlockedList, unlockRecord],
        creditHistory: [newTransaction, ...(userData.creditHistory || [])]
      });

      alert(`Successfully unlocked connection with ${userName}!`);
    } catch (err) {
      console.error('Error unlocking chat:', err);
      alert('Failed to unlock conversation. Please try again.');
    }
  };

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if ((window as any).Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const upgradePlan = async (targetPlan: 'free' | 'starter' | 'premium' | 'vip') => {
    if (!user || !userData) return;
    
    if (targetPlan === 'free') {
      try {
        const dbInstance = getDbInstance();
        if (!dbInstance) return;
        await updateDoc(doc(dbInstance, 'users', user.uid), {
          plan: 'free',
          credits: 100,
          creditHistory: [{
            id: 'TX-PL-' + Math.random().toString(36).substr(2, 9).toUpperCase(),
            type: 'plan-change',
            amount: 0,
            description: 'Switched to Free Plan (100 credits)',
            timestamp: Date.now()
          }, ...(userData.creditHistory || [])]
        });
        alert(`Plan updated to FREE successfully!`);
      } catch (e) {
        console.error(e);
      }
      return;
    }

    let cost = 0;
    if (targetPlan === 'starter') cost = 2000;
    else if (targetPlan === 'premium') cost = 5000;
    else if (targetPlan === 'vip') cost = 10000;

    const res = await loadRazorpayScript();
    if (!res) {
      alert('Razorpay SDK failed to load. Are you online?');
      return;
    }

    try {
      const response = await fetch('/api/razorpay/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agencyId: user.uid,
          targetPlan: targetPlan,
          isAddon: false
        })
      });
      const order = await response.json();
      if (order.error) throw new Error(order.error);

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '',
        amount: order.amount,
        currency: order.currency,
        name: "Travel Agency",
        description: `Upgrade to ${targetPlan.toUpperCase()} Plan`,
        order_id: order.id,
        handler: async function (response: any) {
          try {
            const verifyRes = await fetch('/api/razorpay/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                agencyId: user.uid,
                targetPlan: targetPlan,
                isAddon: false,
                amountPaid: order.amount / 100
              })
            });
            const verifyData = await verifyRes.json();
            if (verifyData.success) {
              alert(`Payment verified! Your plan has been successfully updated to ${targetPlan.toUpperCase()}.`);
              window.location.reload(); // Reload to reflect changes
            } else {
              alert('Payment verified on Razorpay, but failed to update plan: ' + verifyData.error);
            }
          } catch (e) {
            console.error('Verification error', e);
            alert('Failed to verify payment with our servers, but payment may have succeeded.');
          }
        },
        prefill: {
          name: userData.companyName || userData.name || '',
          email: userData.email || '',
        },
        theme: {
          color: "#3B82F6"
        }
      };

      const rzp1 = new (window as any).Razorpay(options);
      rzp1.on('payment.failed', function (response: any){
        alert(response.error.description);
      });
      rzp1.open();
    } catch (e: any) {
      console.error('Failed to create order:', e);
      alert('Failed to initialize payment. Please try again.');
    }
  };

  const buyCredits = async (amount: number, price: number) => {
    if (!user || !userData) return;
    
    if (userData.plan === 'free') {
      alert('Purchase not supported on Free Plan. Please upgrade to Starter or Premium plan.');
      return;
    }

    const res = await loadRazorpayScript();
    if (!res) {
      alert('Razorpay SDK failed to load. Are you online?');
      return;
    }

    setIsPurchasingCredits(true);
    setPurchaseStatusText(`Connecting to secure gateway. Processing payment of ₹${price}...`);

    try {
      const response = await fetch('/api/razorpay/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creditsToBuy: amount,
          agencyId: user.uid,
          isAddon: true,
          targetPlan: ''
        })
      });
      const order = await response.json();
      if (order.error) throw new Error(order.error);
      setIsPurchasingCredits(false);

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '',
        amount: order.amount,
        currency: order.currency,
        name: "Travel Agency",
        description: `Purchased Credit Pack (+${amount} credits)`,
        order_id: order.id,
        handler: async function (response: any) {
          try {
            const verifyRes = await fetch('/api/razorpay/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                agencyId: user.uid,
                isAddon: true,
                creditsToBuy: amount,
                amountPaid: order.amount / 100
              })
            });
            const verifyData = await verifyRes.json();
            if (verifyData.success) {
              alert(`Payment verified! ${amount} credits have been successfully added.`);
              window.location.reload(); // Reload to reflect changes
            } else {
              alert('Payment verified on Razorpay, but failed to add credits: ' + verifyData.error);
            }
          } catch (e) {
            console.error('Verification error', e);
            alert('Failed to verify payment with our servers, but payment may have succeeded.');
          }
        },
        prefill: {
          name: userData.companyName || userData.name || '',
          email: userData.email || '',
        },
        theme: {
          color: "#3B82F6"
        }
      };

      const rzp1 = new (window as any).Razorpay(options);
      rzp1.on('payment.failed', function (response: any){
        alert(response.error.description);
      });
      rzp1.open();
    } catch (err) {
      console.error('Payment error:', err);
      setIsPurchasingCredits(false);
      alert('Transaction failed to initialize. Please try again.');
    }
  };

  // Reset helper for developers
  const simulateResetCredits = async (targetPlan: 'free' | 'starter' | 'premium') => {
    if (!user) return;
    const dbInstance = getDbInstance();
    if (!dbInstance) return;

    let initCredits = 0;
    if (targetPlan === 'free') initCredits = 100;
    else if (targetPlan === 'starter') initCredits = 2000;
    else if (targetPlan === 'premium') initCredits = 5000;
    else if (targetPlan === 'vip') initCredits = 10000;

    const txId = 'TX-RST-' + Math.random().toString(36).substr(2, 9).toUpperCase();
    const newTransaction = {
      id: txId,
      type: 'reset',
      amount: initCredits,
      description: `Developer Reset to ${targetPlan.toUpperCase()}`,
      timestamp: Date.now()
    };

    try {
      await updateDoc(doc(getDbInstance()!, 'users', user.uid), {
        plan: targetPlan,
        credits: initCredits,
        unlockedUsers: [],
        creditHistory: [newTransaction]
      });
      alert(`Developer simulation reset complete: Plan set to ${targetPlan.toUpperCase()}`);
    } catch (e) {
      console.error(e);
    }
  };

  // Comparison functionality
  const { comparisonList, removeFromComparison, clearComparison } = useComparison();

  // Fetch admin custom quick replies
  useEffect(() => {
    const dbInstance = getDbInstance();
    if (!dbInstance) return;
    const unsubscribe = onSnapshot(doc(dbInstance, 'settings', 'quick_replies'), (docSnapshot) => {
      if (docSnapshot.exists()) {
        const data = docSnapshot.data();
        setAdminBuyerReplies(Array.isArray(data.buyerReplies) ? data.buyerReplies : []);
        setAdminSellerReplies(Array.isArray(data.sellerReplies) ? data.sellerReplies : []);
      } else {
        setAdminBuyerReplies([]);
        setAdminSellerReplies([]);
      }
    }, (error) => {
      console.error('Error fetching custom quick replies:', error);
    });
    return () => unsubscribe();
  }, []);

  const handleAddQuickReply = async (type: 'buyer' | 'seller') => {
    const dbInstance = getDbInstance();
    if (!dbInstance) return;
    const inputVal = type === 'buyer' ? newBuyerReplyInput.trim() : newSellerReplyInput.trim();
    if (!inputVal) return;

    try {
      const currentList = type === 'buyer' ? [...adminBuyerReplies, inputVal] : [...adminSellerReplies, inputVal];
      await setDoc(doc(dbInstance, 'settings', 'quick_replies'), {
        [type === 'buyer' ? 'buyerReplies' : 'sellerReplies']: currentList
      }, { merge: true });

      if (type === 'buyer') setNewBuyerReplyInput('');
      else setNewSellerReplyInput('');
      alert('Quick reply added successfully!');
    } catch (error) {
      console.error('Error adding quick reply:', error);
      alert('Failed to add quick reply.');
    }
  };

  const handleRemoveQuickReply = async (type: 'buyer' | 'seller', index: number) => {
    const dbInstance = getDbInstance();
    if (!dbInstance) return;

    try {
      const currentList = type === 'buyer' ? [...adminBuyerReplies] : [...adminSellerReplies];
      currentList.splice(index, 1);
      await setDoc(doc(dbInstance, 'settings', 'quick_replies'), {
        [type === 'buyer' ? 'buyerReplies' : 'sellerReplies']: currentList
      }, { merge: true });
      alert('Quick reply removed successfully!');
    } catch (error) {
      console.error('Error removing quick reply:', error);
      alert('Failed to remove quick reply.');
    }
  };

  // Fetch user's wishlist from Firestore with real-time listener
  useEffect(() => {
    if (user && userData?.role === 'user') {
      const dbInstance = getDbInstance();
      if (!dbInstance) return;

      // Set up real-time listener for wishlist changes
      const unsubscribe = onSnapshot(doc(dbInstance, 'users', user.uid), (docSnapshot) => {
        if (docSnapshot.exists()) {
          const userData = docSnapshot.data();
          console.log('🔍 User document data:', userData);
          console.log('🔍 Wishlist field value:', userData.wishlist);
          console.log('🔍 Wishlist field type:', typeof userData.wishlist);
          console.log('🔍 Is wishlist array?', Array.isArray(userData.wishlist));

          // Safely handle wishlist field - initialize as empty array if it doesn't exist
          const wishlistData = userData.wishlist && Array.isArray(userData.wishlist)
            ? userData.wishlist
            : [];
          console.log('🎯 Final wishlist data to set:', wishlistData);
          setWishlist(wishlistData);

          // If wishlist field doesn't exist in Firestore, initialize it
          if (!userData.wishlist) {
            console.log('📝 Initializing wishlist field in Firestore');
            updateDoc(doc(dbInstance, 'users', user.uid), {
              wishlist: []
            }).then(() => {
              console.log('✅ Wishlist field initialized successfully');
              // Update the local state immediately after initializing
              setWishlist([]);
            }).catch((error) => {
              console.error('❌ Error initializing wishlist field:', error);
            });
          }
        } else {
          console.log('❌ User document does not exist');
        }
      });

      // Cleanup function to unsubscribe from the listener
      return () => unsubscribe();
    }
  }, [user?.uid, userData?.role]);

  // Function to update wishlist in Firestore
  const updateWishlistInFirestore = async (newWishlist: string[]) => {
    if (!user) return;
    const dbInstance = getDbInstance();
    if (!dbInstance) return;
    try {
      console.log('🔄 Updating wishlist in Firestore:', newWishlist);
      await updateDoc(doc(dbInstance, 'users', user.uid), {
        wishlist: newWishlist
      });
      console.log('✅ Wishlist successfully updated in Firestore');
    } catch (error) {
      console.error('❌ Error updating wishlist:', error);
    }
  };

  // Handle wishlist toggle with persistence
  const handleWishlistToggle = (listingId: string) => {
    setWishlist(prev => {
      const newWishlist = prev.includes(listingId)
        ? prev.filter(id => id !== listingId)
        : [...prev, listingId];

      // Persist to Firestore
      updateWishlistInFirestore(newWishlist);
      return newWishlist;
    });
  };

  useEffect(() => {
    // Fetch user's bookings with real-time updates
    if (user && userData?.role === 'user') {
      const dbInstance = getDbInstance();
      if (!dbInstance) return;

      // Use simple query without orderBy to avoid index requirement
      // Sorting will be done client-side
      const userBookingsQuery = query(
        collection(dbInstance, 'bookings'),
        where('userId', '==', user.uid)
      );

      // Set up real-time listener
      const unsubscribe = onSnapshot(userBookingsQuery, (snapshot) => {
        const bookingsData = snapshot.docs.map(doc => {
          const data = doc.data() as any;
          return {
            id: doc.id,
            ...data,
            // Ensure createdAt is properly formatted
            createdAtFormatted: data.createdAt?.toDate?.()
              ? data.createdAt.toDate().toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })
              : new Date(data.createdAt).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })
          };
        });

        // Sort client-side by createdAt in descending order (most recent first)
        bookingsData.sort((a, b) => {
          const dateA = (a as any).createdAt?.toDate?.() || new Date((a as any).createdAt);
          const dateB = (b as any).createdAt?.toDate?.() || new Date((b as any).createdAt);
          return dateB.getTime() - dateA.getTime();
        });

        setUserBookings(bookingsData);
      }, (error) => {
        console.error('Error fetching bookings:', error);
      });

      // Cleanup subscription
      return () => unsubscribe();
    }
  }, [user?.uid, userData?.role]);

  // Fetch user's support tickets with real-time updates
  useEffect(() => {
    if (user && userData?.role === 'user') {
      const dbInstance = getDbInstance();
      if (!dbInstance) return;

      const supportTicketsQuery = query(
        collection(dbInstance, 'support_tickets'),
        where('userId', '==', user.uid)
      );

      const unsubscribe = onSnapshot(supportTicketsQuery, (snapshot) => {
        const ticketsData = snapshot.docs.map(doc => {
          const data = doc.data() as any;
          return {
            id: doc.id,
            ...data,
            createdAtFormatted: data.createdAt?.toDate?.()
              ? data.createdAt.toDate().toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })
              : new Date(data.createdAt).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })
          };
        });

        // Sort client-side by createdAt descending
        ticketsData.sort((a, b) => {
          const dateA = (a as any).createdAt?.toDate?.() || new Date((a as any).createdAt);
          const dateB = (b as any).createdAt?.toDate?.() || new Date((b as any).createdAt);
          return dateB.getTime() - dateA.getTime();
        });

        setSupportTickets(ticketsData);
      }, (error) => {
        console.error('Error fetching support tickets:', error);
      });

      return () => unsubscribe();
    }
  }, [user?.uid, userData?.role]);

  // Reset scroll position when user switches tabs in the dashboard
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const scrollContainer = document.getElementById('user-dashboard-scroll-container');
    if (scrollContainer) {
      scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [userActiveSection]);

  useEffect(() => {
    if (user && userData?.role === 'admin') {
      const fetchPending = async () => {
        try {
          const dbInstance = getDbInstance();
          if (!dbInstance) return;
          const q = query(collection(dbInstance, 'users'), where('approved', '==', false), where('role', '==', 'agency'));
          const querySnapshot = await getDocs(q);
          const agencies = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setPendingAgencies(agencies);
        } catch (error) {
          // Ignore cancelled requests on logout
        }
      };

      const fetchAllAgencies = async () => {
        try {
          const dbInstance = getDbInstance();
          if (!dbInstance) return;
          const q = query(collection(dbInstance, 'users'), where('role', '==', 'agency'));
          const querySnapshot = await getDocs(q);
          const agencies = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setAllAgencies(agencies);
        } catch (error) {
          // Ignore cancelled requests on logout
        }
      };

      const fetchPendingListings = async () => {
        try {
          const dbInstance = getDbInstance();
          if (!dbInstance) return;
          const q = query(collection(dbInstance, 'listings'), where('approved', '==', false));
          const querySnapshot = await getDocs(q);
          const listings = await Promise.all(querySnapshot.docs.map(async (docSnapshot) => {
            const listingData = docSnapshot.data() as any;
            // Get agency name
            const agencyDoc = await getDoc(doc(dbInstance, 'users', listingData.agencyId));
            const agencyName = agencyDoc.exists() ? (agencyDoc.data() as any).companyName : 'Unknown Agency';
            return { id: docSnapshot.id, ...listingData, agencyName };
          }));
          setPendingListings(listings);
        } catch (error) {
          // Ignore cancelled requests on logout
        }
      };

      const fetchAllListings = async () => {
        try {
          const dbInstance = getDbInstance();
          if (!dbInstance) return;
          const q = query(collection(dbInstance, 'listings'));
          const querySnapshot = await getDocs(q);
          const allListingsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setAgencyListings(allListingsData);
        } catch (error) {
          // Ignore cancelled requests on logout
        }
      };

      fetchPending();
      fetchAllAgencies();
      fetchPendingListings();
      fetchAllListings();
    }
  }, [user?.uid, userData?.role]);

  useEffect(() => {
    if (user && userData?.role === 'user') {
      const dbInstance = getDbInstance();
      if (!dbInstance) return;

      // Function to process messages and update conversations
      const processMessages = async (messages: any[]) => {
        // Sort messages by timestamp
        messages.sort((a, b) => (Number(a.timestamp?.seconds ? a.timestamp.seconds * 1000 : a.timestamp) || 0) - (Number(b.timestamp?.seconds ? b.timestamp.seconds * 1000 : b.timestamp) || 0));
        setChatMessages(messages);

        const tsMs = (ts: any) => Number(ts?.seconds ? ts.seconds * 1000 : ts) || 0;

        // Identify unique other-user IDs (agencies)
        const otherAgencyIds = new Set<string>();
        for (const msg of messages) {
          const id = msg.sender === user.uid ? msg.receiverId : msg.sender;
          if (id && typeof id === 'string' && id.trim()) {
            otherAgencyIds.add(id);
          }
        }

        // Fetch agency profiles we don't have cached yet — in parallel, single batch
        const missingIds = [...otherAgencyIds].filter(id => !userAgencyProfileCacheRef.current.has(id));
        if (missingIds.length > 0) {
          await Promise.all(missingIds.map(async (id) => {
            try {
              const agencyDoc = await getDoc(doc(getDbInstance()!, 'users', id));
              const d = agencyDoc.exists() ? agencyDoc.data() as any : null;
              userAgencyProfileCacheRef.current.set(id, {
                name: d?.companyName || d?.name || d?.agencyName || 'Travel Agency',
                isOnline: Boolean(d?.isOnline || d?.is_online),
                logoUrl: d?.logoUrl || d?.agencyLogo || d?.avatarUrl || d?.photoURL || null,
              });
            } catch {
              userAgencyProfileCacheRef.current.set(id, {
                name: 'Travel Agency',
                isOnline: false,
                logoUrl: null,
              });
            }
          }));
        }

        // Build conversations map entirely from cache — synchronous, instantaneous
        const conversationsMap = new Map<string, any>();
        for (const msg of messages) {
          const otherUserId = msg.sender === user.uid ? msg.receiverId : msg.sender;
          if (!otherUserId || typeof otherUserId !== 'string' || !otherUserId.trim()) continue;

          const profile = userAgencyProfileCacheRef.current.get(otherUserId) || {
            name: 'Travel Agency',
            isOnline: false,
            logoUrl: null,
          };

          if (!conversationsMap.has(otherUserId)) {
            conversationsMap.set(otherUserId, {
              agencyId: otherUserId,
              agencyName: profile.name,
              chatId: msg.chatId,
              lastMessage: msg.text,
              lastMessageTime: msg.timestamp,
              unreadCount: 0,
              isOnline: profile.isOnline,
              logoUrl: profile.logoUrl,
            });
          }

          const existing = conversationsMap.get(otherUserId)!;
          existing.lastMessage = msg.text;
          existing.lastMessageTime = msg.timestamp;
          if (msg.sender === otherUserId && msg.status !== 'read') {
            existing.unreadCount = (existing.unreadCount || 0) + 1;
          }
          if (msg.sender === user.uid) {
            existing.unreadCount = 0;
          }
        }

        const conversations = Array.from(conversationsMap.values());
        conversations.sort((a: any, b: any) => tsMs(b.lastMessageTime) - tsMs(a.lastMessageTime));

        setUserConversations(conversations);
      };

      let webMsgs: any[] = [];
      let mobileMsgs: any[] = [];
      const combineAndProcess = () => {
        const combined = [...webMsgs, ...mobileMsgs];
        const unique = combined.filter((msg, index, self) =>
          index === self.findIndex(m => m.id === msg.id)
        );
        processMessages(unique);
      };

      // Listen to web app messages collection
      const unsubscribeWebMessages = onSnapshot(collection(dbInstance, 'messages'), (snapshot) => {
        const msgs: any[] = [];
        snapshot.forEach((doc) => {
          const msgData = doc.data();
          // Include messages where user is sender OR receiver
          if (msgData.sender === user.uid || msgData.receiverId === user.uid) {
            msgs.push({ id: doc.id, ...msgData, isWeb: true });
          }
        });
        webMsgs = msgs;
        combineAndProcess();
      });

      // Also listen to mobile app messages collection (chat_messages)
      const unsubscribeMobileMessages = onSnapshot(collection(dbInstance, 'chat_messages'), (snapshot) => {
        const msgs: any[] = [];
        snapshot.forEach((doc) => {
          const msgData = doc.data();
          // Convert mobile app format to web app format
          // Include messages where user is sender OR receiver
          if (msgData.from_user_id === user.uid || msgData.to_user_id === user.uid) {
            const chatId = [msgData.from_user_id, msgData.to_user_id].sort().join('_');
            msgs.push({
              id: doc.id,
              text: msgData.content,
              sender: msgData.from_user_id,
              receiverId: msgData.to_user_id,
              chatId: chatId,
              timestamp: msgData.timestamp,
              status: msgData.status,
              isMobile: true
            });
          }
        });
        mobileMsgs = msgs;
        combineAndProcess();
      });

      return () => {
        unsubscribeWebMessages();
        unsubscribeMobileMessages();
      };
    }
  }, [user?.uid, userData?.role]);

  useEffect(() => {
    if (user && userData?.role === 'agency') {
      const dbInstance = getDbInstance();
      if (!dbInstance) return;

      // Function to process messages and update state
      const processMessages = async (messages: any[]) => {
        // Sort messages by timestamp
        messages.sort((a, b) => (Number(a.timestamp?.seconds ? a.timestamp.seconds * 1000 : a.timestamp) || 0) - (Number(b.timestamp?.seconds ? b.timestamp.seconds * 1000 : b.timestamp) || 0));
        setAgencyChatMessages(messages);

        // --- Build conversations synchronously using the profile cache ---
        const tsMs = (ts: any) => Number(ts?.seconds ? ts.seconds * 1000 : ts) || 0;

        // Identify unique other-user IDs
        const otherUserIds = new Set<string>();
        for (const msg of messages) {
          const id = msg.sender === user.uid ? msg.receiverId : msg.sender;
          if (id && typeof id === 'string' && id.trim()) otherUserIds.add(id);
        }

        // Fetch profiles we don't have cached yet — all in parallel, one batch
        const missingIds = [...otherUserIds].filter(id => !agencyUserProfileCacheRef.current.has(id));
        if (missingIds.length > 0) {
          await Promise.all(missingIds.map(async (id) => {
            try {
              const userDoc = await getDoc(doc(getDbInstance()!, 'users', id));
              const d = userDoc.exists() ? userDoc.data() as any : null;
              agencyUserProfileCacheRef.current.set(id, {
                name: d?.name || 'Unknown User',
                logo: d?.photoURL || d?.avatarUrl || d?.profilePic || null,
              });
            } catch {
              agencyUserProfileCacheRef.current.set(id, { name: 'Unknown User', logo: null });
            }
          }));
        }

        // Now build conversations map entirely from cache — no async, no flash
        const conversationsMap = new Map<string, any>();
        for (const msg of messages) {
          const otherUserId = msg.sender === user.uid ? msg.receiverId : msg.sender;
          if (!otherUserId || typeof otherUserId !== 'string' || !otherUserId.trim()) continue;

          const profile = agencyUserProfileCacheRef.current.get(otherUserId) || { name: 'Unknown User', logo: null };

          if (!conversationsMap.has(otherUserId)) {
            conversationsMap.set(otherUserId, {
              userId: otherUserId,
              userName: profile.name,
              userLogo: profile.logo,
              chatId: msg.chatId,
              lastMessage: msg.text,
              lastMessageTime: msg.timestamp,
              unreadCount: 0,
            });
          }

          const existing = conversationsMap.get(otherUserId)!;
          existing.lastMessage = msg.text;
          existing.lastMessageTime = msg.timestamp;
          if (msg.sender === otherUserId && msg.status !== 'read') {
            existing.unreadCount = (existing.unreadCount || 0) + 1;
          }
          if (msg.sender === user.uid) {
            existing.unreadCount = 0;
          }
        }

        const conversations = Array.from(conversationsMap.values());
        conversations.sort((a: any, b: any) => tsMs(b.lastMessageTime) - tsMs(a.lastMessageTime));

        // Single atomic state update — no intermediate renders
        setAgencyConversations(conversations);

        // Auto-select first conversation if none selected
        if (!selectedConversationRef.current && conversations.length > 0 && !hasManuallyClosedChatRef.current) {
          setSelectedConversation(conversations[0]);
        }
      };

      let webMsgs: any[] = [];
      let mobileMsgs: any[] = [];
      const combineAndProcess = () => {
        const combined = [...webMsgs, ...mobileMsgs];
        const unique = combined.filter((msg, index, self) =>
          index === self.findIndex(m => m.id === msg.id)
        );
        processMessages(unique);
      };

      // Listen to web app messages collection
      const unsubscribeWebMessages = onSnapshot(collection(dbInstance, 'messages'), (snapshot) => {
        const msgs: any[] = [];
        snapshot.forEach((doc) => {
          const msgData = doc.data();
          // Include messages where agency is sender OR receiver
          if (msgData.sender === user.uid || msgData.receiverId === user.uid) {
            msgs.push({ id: doc.id, ...msgData, isWeb: true });
          }
        });
        webMsgs = msgs;
        combineAndProcess();
      });

      // Also listen to mobile app messages collection (chat_messages)
      const unsubscribeMobileMessages = onSnapshot(collection(dbInstance, 'chat_messages'), (snapshot) => {
        const msgs: any[] = [];
        snapshot.forEach((doc) => {
          const msgData = doc.data();
          // Convert mobile app format to web app format
          // Include messages where agency is sender OR receiver
          if (msgData.from_user_id === user.uid || msgData.to_user_id === user.uid) {
            const chatId = [msgData.from_user_id, msgData.to_user_id].sort().join('_');
            msgs.push({
              id: doc.id,
              text: msgData.content,
              sender: msgData.from_user_id,
              receiverId: msgData.to_user_id,
              chatId: chatId,
              timestamp: msgData.timestamp,
              status: msgData.status,
              isMobile: true
            });
          }
        });
        mobileMsgs = msgs;
        combineAndProcess();
      });

      return () => {
        unsubscribeWebMessages();
        unsubscribeMobileMessages();
      };
    }
  }, [user?.uid, userData?.role]);

  useEffect(() => {
    // Fetch listings for users - only when user is authenticated
    if (user) {
      const dbInstance = getDbInstance();
      if (!dbInstance) return;

      // Use real-time listener for listings to automatically update when admin approves
      const listingsQuery = query(collection(dbInstance, 'listings'), where('approved', '==', true));

      const unsubscribe = onSnapshot(listingsQuery, async (snapshot) => {
        const listingsData = await Promise.all(snapshot.docs.map(async (docSnapshot) => {
          const listingData = docSnapshot.data() as any;
          // Get agency name
          const agencyDoc = await getDoc(doc(dbInstance, 'users', listingData.agencyId));
          const agencyData = agencyDoc.exists() ? agencyDoc.data() as any : null;
          const agencyName = agencyData?.companyName || 'Unknown Agency';

          // Debug: Log the listing data structure
          console.log('Listing data structure:', {
            id: docSnapshot.id,
            title: listingData.title,
            packageType: listingData.packageType,
            placesCovered: listingData.placesCovered,
            photos: listingData.photos,
            hasPlacesCovered: !!listingData.placesCovered,
            placesCoveredLength: listingData.placesCovered?.length || 0,
            firstPlaceHasImages: listingData.placesCovered?.[0]?.imageUrls?.length > 0 || false,
            photosLength: listingData.photos?.length || 0
          });

          return { id: docSnapshot.id, ...listingData, agencyName, agencyData };
        }));
        setListings(listingsData);
      });

      // Cleanup function to unsubscribe from the listener
      return () => unsubscribe();
    }
  }, [user?.uid]);

  useEffect(() => {
    // Fetch agency's own listings
    if (user && userData?.role === 'agency') {
      const fetchAgencyListings = async () => {
        try {
          const dbInstance = getDbInstance();
          if (!dbInstance) return;
          const agencyListingsQuery = query(collection(dbInstance, 'listings'), where('agencyId', '==', user.uid));
          const querySnapshot = await getDocs(agencyListingsQuery);
          const listingsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setAgencyListings(listingsData);
        } catch (error) {
          // Ignore cancelled requests on logout
        }
      };
      fetchAgencyListings();
    }
  }, [user?.uid, userData?.role]);

  useEffect(() => {
    // Fetch agency's bookings
    if (user && userData?.role === 'agency') {
      const fetchAgencyBookings = async () => {
        try {
          const dbInstance = getDbInstance();
          if (!dbInstance) return;
          const bookingsQuery = query(collection(dbInstance, 'bookings'), where('agencyId', '==', user.uid));
          const querySnapshot = await getDocs(bookingsQuery);
          const bookingsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          // Sort bookings by createdAt in descending order (most recent first)
          bookingsData.sort((a, b) => new Date((b as any).createdAt).getTime() - new Date((a as any).createdAt).getTime());
          setAgencyBookings(bookingsData);
        } catch (error) {
          // Ignore cancelled requests on logout
        }
      };
      fetchAgencyBookings();
    }
  }, [user?.uid, userData?.role]);

  const approveAgency = async (id: string) => {
    try {
      const dbInstance = getDbInstance();
      if (!dbInstance) return;
      await updateDoc(doc(dbInstance, 'users', id), { approved: true });
      setPendingAgencies(prev => prev.filter(agency => agency.id !== id));
      // Refresh all agencies data
      const q = query(collection(dbInstance, 'users'), where('role', '==', 'agency'));
      const querySnapshot = await getDocs(q);
      const agencies = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAllAgencies(agencies);
      alert('Agency approved successfully!');
    } catch (error) {
      console.error('Error approving agency:', error);
      alert('Failed to approve agency. Please try again.');
    }
  };

  const handleDeletePackage = async (packageId: string) => {
    if (!window.confirm('Are you sure you want to delete this package? This action cannot be undone.')) return;
    
    try {
      const dbInstance = getDbInstance();
      if (!dbInstance) return;
      await deleteDoc(doc(dbInstance, 'listings', packageId));
      alert('Package deleted successfully');
    } catch (error) {
      console.error('Error deleting package:', error);
      alert('Failed to delete package. Please try again.');
    }
  };

  const approveListing = async (id: string) => {
    try {
      const dbInstance = getDbInstance();
      if (!dbInstance) return;
      await updateDoc(doc(dbInstance, 'listings', id), { approved: true });
      setPendingListings(prev => prev.filter(listing => listing.id !== id));
      alert('Listing approved successfully!');
    } catch (error) {
      console.error('Error approving listing:', error);
      alert('Failed to approve listing. Please try again.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isLogin) {
        await signIn(email, password);
      } else {
        const role = isAgencyRegistration ? 'agency' : 'user';

        if (isAgencyRegistration) {
          // Validate mandatory fields
          if (!declarationChecked) {
            throw new Error('Please accept the declaration to proceed with registration.');
          }

          if (!contactNumber || !businessLocation || !fullAddress || !agencyDescription || !refundPolicy) {
            throw new Error('Please fill in all required fields.');
          }

          if (operatingFromOffice && !officeAddress) {
            throw new Error('Please provide office address when operating from office.');
          }

          // Create agency data object
          const agencyData = {
            contactNumber,
            businessLocation,
            fullAddress,
            agencyDescription,
            refundPolicy,
            operatingFromHome,
            operatingFromOffice,
            officeAddress: operatingFromOffice ? officeAddress : '',
            uploadOfficePhotos,
            uploadBranding,
            // Files will be handled separately
          };

          // For now, we'll use the existing register function but pass the additional data
          // In a real implementation, you would extend the AuthContext to handle all this data
          const userDataInput = { name, companyName, ...agencyData };
          await register(email, password, role, userDataInput, file || undefined);

          // Handle file uploads (this would need to be implemented in the AuthContext)
          console.log('Agency registration data:', {
            panCard,
            gstCertificate,
            businessProof,
            agencyPhotos
          });
        } else {
          // User registration
          const userDataInput = { name };
          await register(email, password, role, userDataInput, file || undefined);
        }

        alert(`Registration successful! ${role === 'agency' ? 'Please wait for admin approval.' : ''}`);
        setIsLogin(true);
      }
      setError('');
    } catch (err: any) {
      setError(err.message);
    }
  };
  const renderMessageText = (text: string, isFreePlan: boolean) => {
    if (!isFreePlan || !text) return text;
    
    // Regex matching phone number patterns (10-13 digits, allowing country code, spaces, dashes)
    const phoneRegex = /((?:\+?\d{1,3}[-\s]?)?(?:\d{10}|\d{3}[-\s]?\d{3}[-\s]?\d{4}))/g;
    const parts = text.split(phoneRegex);
    
    return parts.map((part, index) => {
      if (!part) return null;
      
      const digits = part.replace(/\D/g, '');
      const isPhoneNumber = digits.length >= 10 && digits.length <= 13;
      
      if (isPhoneNumber) {
        return (
          <span 
            key={index} 
            className="select-none inline-block bg-gray-250/50 rounded px-1"
            style={{ filter: 'blur(4px)' }}
            title="Upgrade plan to view phone number"
          >
            [Phone Blurred]
          </span>
        );
      }
      return part;
    });
  };

  const highlightSearchMatch = (content: React.ReactNode, query: string, isActiveMatch = false): React.ReactNode => {
    if (!query || !query.trim()) return content;
    const q = query.trim();
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escaped})`, 'gi');

    if (typeof content === 'string') {
      const parts = content.split(regex);
      if (parts.length <= 1) return content;
      return parts.map((part, i) =>
        regex.test(part) ? (
          <mark 
            key={i} 
            className={`${
              isActiveMatch 
                ? 'bg-amber-400 text-gray-950 font-bold shadow-xs ring-1 ring-amber-500' 
                : 'bg-amber-200 text-gray-900 font-medium'
            } rounded-2xs px-0.5 transition-all`}
          >
            {part}
          </mark>
        ) : (
          part
        )
      );
    }

    if (Array.isArray(content)) {
      return content.map((item, idx) => (
        <React.Fragment key={idx}>{highlightSearchMatch(item, q, isActiveMatch)}</React.Fragment>
      ));
    }

    return content;
  };

  const sendMessage = async () => {
    if (!chatInput.trim()) return;
    if (!user) {
      setAuthModalTab('login');
      setShowAuthModal(true);
      return;
    }

    
    // Send to mobile app's "chat_messages" collection with correct format
    const messageData = {
      from_user_id: user.uid,
      to_user_id: currentChatAgency,
      content: chatInput,
      timestamp: Date.now(),
      status: 'sent'
    };

    const dbInstance = getDbInstance();
    if (!dbInstance) return;
    await addDoc(collection(dbInstance, 'chat_messages'), messageData);
    setChatInput('');
  };

  const sendAgencyMessage = async () => {
    if (!agencyChatInput.trim() || !user || !selectedConversation) return;

    const isFreePlan = userData?.plan === 'free' || !userData?.plan;
    if (isFreePlan) {
      const digitsOnly = agencyChatInput.replace(/\D/g, '');
      if (digitsOnly.length >= 10 || /\d{10}/.test(digitsOnly)) {
        alert('Security Warning: Sharing phone numbers or contact details is not allowed on the Free Plan. Please upgrade to Starter or Premium plan.');
        return;
      }
    }

    // Send to mobile app's "chat_messages" collection with correct format
    const messageData = {
      from_user_id: user.uid,
      to_user_id: selectedConversation.userId,
      content: agencyChatInput,
      timestamp: Date.now(),
      status: 'sent'
    };

    const dbInstance = getDbInstance();
    if (!dbInstance) return;
    await addDoc(collection(dbInstance, 'chat_messages'), messageData);
    setAgencyChatInput('');
  };

  const selectConversation = (conversation: any) => {
    setSelectedConversation(conversation);
  };

  const handleAddListing = async () => {
    if (!user || !newListing.title.trim()) return;
    try {
      // Upload photos if any
      const photoUrls: string[] = [];
      if (tempPhotoFiles.length > 0) {
        for (const file of tempPhotoFiles) {
          const formData = new FormData();
          formData.append('file', file);
          formData.append('category', 'listings');
          formData.append('userId', user.uid);
          const res = await fetch('/api/upload', { method: 'POST', body: formData });
          if (res.ok) {
            const data = await res.json();
            photoUrls.push(data.url);
          }
        }
      }

      const dbInstance = getDbInstance();
      if (!dbInstance) return;
      await addDoc(collection(dbInstance, 'listings'), {
        ...newListing,
        photos: photoUrls,
        agencyId: user.uid,
        approved: false, // Agencies need admin approval for listings
        createdAt: new Date(),
      });
      setNewListing({ title: '', description: '', price: '', duration: '', destination: '', type: 'adventure', photos: [], rating: 0, reviewsCount: 0 });
      setTempPhotoFiles([]);
      setShowListingForm(false);
      // Refresh listings
      const agencyListingsQuery = query(collection(dbInstance, 'listings'), where('agencyId', '==', user.uid));
      const querySnapshot = await getDocs(agencyListingsQuery);
      const listingsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAgencyListings(listingsData);
      alert('Listing submitted for approval!');
    } catch (error) {
      console.error('Error adding listing:', error);
      alert('Failed to add listing. Please try again.');
    }
  };

  const handleEditListing = (listing: any) => {
    setEditingListing(listing);
    setNewListing({
      title: listing.title,
      description: listing.description,
      price: listing.price,
      duration: listing.duration,
      destination: listing.destination,
      type: listing.type || 'adventure',
      photos: listing.photos || [],
      rating: listing.rating || 0,
      reviewsCount: listing.reviewsCount || 0,
    });
    setShowListingForm(true);
  };

  const handleUpdateListing = async () => {
    if (!editingListing || !newListing.title.trim()) return;
    try {
      const dbInstance = getDbInstance();
      if (!dbInstance) return;
      await updateDoc(doc(dbInstance, 'listings', editingListing.id), {
        ...newListing,
        updatedAt: new Date(),
      });
      setEditingListing(null);
      setNewListing({ title: '', description: '', price: '', duration: '', destination: '', type: 'adventure', photos: [], rating: 0, reviewsCount: 0 });
      setShowListingForm(false);
      // Refresh listings
      const agencyListingsQuery = query(collection(dbInstance, 'listings'), where('agencyId', '==', user?.uid));
      const querySnapshot = await getDocs(agencyListingsQuery);
      const listingsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAgencyListings(listingsData);
      alert('Listing updated successfully!');
    } catch (error) {
      console.error('Error updating listing:', error);
      alert('Failed to update listing. Please try again.');
    }
  };

  const handleDeleteListing = async (listingId: string) => {
    if (!confirm('Are you sure you want to delete this listing?')) return;
    try {
      const dbInstance = getDbInstance();
      if (!dbInstance) return;
      await deleteDoc(doc(dbInstance, 'listings', listingId));
      // Refresh listings
      const agencyListingsQuery = query(collection(dbInstance, 'listings'), where('agencyId', '==', user?.uid));
      const querySnapshot = await getDocs(agencyListingsQuery);
      const listingsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAgencyListings(listingsData);
      alert('Listing deleted successfully!');
    } catch (error) {
      console.error('Error deleting listing:', error);
      alert('Failed to delete listing. Please try again.');
    }
  };

  const handleViewListing = (listing: any) => {
    setViewingListing(listing);
  };

  const startBooking = (listing: any) => {
    setBookingListing(listing);
    setShowBookingForm(true);
    setBookingStep(1);
    // Pre-fill user data
    setBookingData({
      travelers: 1,
      travelDate: '',
      specialRequests: '',
      contactName: userData?.name || '',
      contactEmail: user?.email || '',
      contactPhone: '',
      preferences: [],
      paymentMethod: 'pay_later',
      insurance: false,
      termsAccepted: false,
      emergencyContact: '',
      dietaryRestrictions: '',
      accessibilityNeeds: '',
      bookingNotes: ''
    });
  };

  const nextBookingStep = () => {
    if (bookingStep < 4) {
      setBookingStep(bookingStep + 1);
    }
  };

  const prevBookingStep = () => {
    if (bookingStep > 1) {
      setBookingStep(bookingStep - 1);
    }
  };

  const submitBooking = async () => {
    if (!user || !bookingListing) return;

    try {
      // Debug: Log the booking listing data
      console.log('Booking listing data:', bookingListing);

      const bookingDoc = {
        userId: user.uid,
        userName: bookingData.contactName,
        userEmail: bookingData.contactEmail,
        userPhone: bookingData.contactPhone,
        listingId: bookingListing.id,
        listingTitle: bookingListing.title || 'Unknown Package',
        agencyId: bookingListing.agencyId,
        agencyName: bookingListing.agencyName || 'Unknown Agency',
        packageType: bookingListing.packageType || 'domestic', // Save package type for currency display
        travelers: bookingData.travelers,
        travelDate: bookingData.travelDate,
        specialRequests: bookingData.specialRequests,
        preferences: bookingData.preferences,
        totalAmount: parseFloat(bookingListing.price || bookingListing.cost || '0') * bookingData.travelers,
        status: 'pending',
        createdAt: new Date(),
        bookingReference: `BK${Date.now().toString().slice(-6)}`,
      };

      console.log('Booking document to be created:', bookingDoc);

      const dbInstance = getDbInstance();
      if (!dbInstance) return;
      await addDoc(collection(dbInstance, 'bookings'), bookingDoc);

      alert(`Booking submitted successfully! Reference: ${bookingDoc.bookingReference}`);
      setShowBookingForm(false);
      setBookingListing(null);
      setBookingStep(1);
      setBookingData({
        travelers: 1,
        travelDate: '',
        specialRequests: '',
        contactName: '',
        contactEmail: '',
        contactPhone: '',
        preferences: [],
        paymentMethod: 'pay_later',
        insurance: false,
        termsAccepted: false,
        emergencyContact: '',
        dietaryRestrictions: '',
        accessibilityNeeds: '',
        bookingNotes: ''
      });

      // Note: Real-time listener will automatically update the bookings list
      // No need to manually refresh as onSnapshot is now being used

    } catch (error) {
      console.error('Error submitting booking:', error);
      alert('Failed to submit booking. Please try again.');
    }
  };

  const submitSupportTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!supportSubject.trim() || !supportDescription.trim()) {
      alert('Please fill out the subject and description.');
      return;
    }

    setSubmittingSupportTicket(true);
    try {
      const dbInstance = getDbInstance();
      if (!dbInstance) throw new Error('Database not initialized');

      // Find selected booking reference or agency details if a booking was chosen
      const chosenBooking = userBookings.find(b => b.id === supportBookingId);

      const ticketDoc = {
        userId: user.uid,
        userName: userData?.name || user.displayName || user.email?.split('@')[0] || 'User',
        userEmail: user.email || '',
        bookingId: supportBookingId || null,
        bookingRef: chosenBooking?.bookingReference || null,
        agencyId: chosenBooking?.agencyId || null,
        agencyName: chosenBooking?.agencyName || null,
        reason: supportReason,
        subject: supportSubject,
        description: supportDescription,
        status: 'pending', // pending, in-review, resolved
        createdAt: new Date(),
      };

      await addDoc(collection(dbInstance, 'support_tickets'), ticketDoc);

      // Clear form
      setSupportBookingId('');
      setSupportReason('Agency is not responding after payment');
      setSupportSubject('');
      setSupportDescription('');

      alert('Dispute ticket submitted successfully! Our platform administrators will review this and contact you within 24 hours.');
    } catch (error) {
      console.error('Error submitting support ticket:', error);
      alert('Failed to submit support ticket. Please try again.');
    } finally {
      setSubmittingSupportTicket(false);
    }
  };

  // Handle register from AuthModal (user only)
  const handleAuthModalRegister = async (
    emailArg: string,
    passwordArg: string,
    role: 'user',
    data: { name: string; phone?: string }
  ) => {
    await register(emailArg, passwordArg, role, data);
  };

  if (loading || (user && !userData)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs text-slate-500 font-medium">Loading Agency Portal...</p>
        </div>
      </div>
    );
  }

  // For admin routes, force login immediately if not authenticated
  if (!user && routeMode === 'admin') {
    return <AdminLoginView />;
  }
  
  // For agency routes, force login immediately if not authenticated
  if (!user && routeMode === 'agency') {
    return <AgencyLoginView />;
  }

  // If user navigated to Agency Portal with authenticated account, ensure agency role is active in Firestore
  if (routeMode === 'agency' && user && userData && userData.role !== 'agency' && userData.role !== 'admin') {
    const dbInstance = getDbInstance();
    if (dbInstance) {
      updateDoc(doc(dbInstance, 'users', user.uid), {
        role: 'agency',
        approved: true,
        companyName: userData.companyName || userData.name || 'Travel Agency',
        phone: userData.phone || userData.contactNumber || '',
        plan: userData.plan || 'free',
        credits: userData.credits ?? 0,
        freeChats: userData.freeChats ?? 2,
      }).catch(console.error);
    }
  }

  if (user && userData) {
    if (userData.role === 'admin') {
      const allListingImages = viewingAdminListing
        ? [
            ...(viewingAdminListing.photos || []),
            ...(viewingAdminListing.placesCovered || []).flatMap((p: any) => p.imageUrls || [])
          ].filter(Boolean)
        : [];

      return (
        <div className="flex h-screen bg-gray-50 overflow-hidden font-sans">
          {/* Sidebar */}
          <div className="w-64 bg-white border-r border-gray-200 flex flex-col z-20 shrink-0">
            <div className="p-6 border-b border-gray-200 flex flex-col items-center text-center shrink-0">
              <div className="w-20 h-20 rounded-2xl bg-gray-100 border border-gray-200 shadow-sm flex items-center justify-center overflow-hidden mb-4 shrink-0">
                <Building2 className="h-8 w-8 text-indigo-500" />
              </div>
              <div className="w-full">
                <h2 className="text-base font-bold text-gray-900 truncate">Trip Dm</h2>
                <p className="text-xs text-gray-500 mt-0.5 truncate">Admin Dashboard</p>
              </div>
            </div>
            <nav className="p-4 flex-1 overflow-y-auto sidebar-scroll">
              <div className="space-y-1">
                <button
                  onClick={() => setActiveSection('overview')}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-3 ${activeSection === 'overview'
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
                    }`}
                >
                  <HomeIcon className="h-4 w-4" /> Overview
                </button>

                <button
                  onClick={() => setActiveSection('agencies')}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-3 ${activeSection === 'agencies'
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
                    }`}
                >
                  <Building className="h-4 w-4" /> Agencies
                </button>
                <button
                  onClick={() => setActiveSection('listings')}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-3 ${activeSection === 'listings'
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
                    }`}
                >
                  <ClipboardList className="h-4 w-4" /> Listings
                </button>
                <button
                  onClick={() => setActiveSection('manage_packages')}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-3 ${activeSection === 'manage_packages'
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
                    }`}
                >
                  <Package className="h-4 w-4" /> Manage Packages
                </button>
                <button
                  onClick={() => setActiveSection('settings')}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-3 ${activeSection === 'settings'
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
                    }`}
                >
                  <Settings className="h-4 w-4" /> Settings
                </button>
                <button
                  onClick={() => setActiveSection('chats')}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-3 ${activeSection === 'chats'
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
                    }`}
                >
                  <MessageSquare className="h-4 w-4" /> All Chats
                </button>
                <button
                  onClick={() => setActiveSection('itinerary_photos')}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center justify-between ${activeSection === 'itinerary_photos'
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <ImageIcon className="h-4 w-4 text-indigo-500" />
                    <span>Itinerary Photos</span>
                  </div>
                  {adminMissingItineraryPhotosCount > 0 && (
                    <span className="bg-amber-100 text-amber-800 text-xs px-2 py-0.5 rounded-full font-bold">
                      {adminMissingItineraryPhotosCount}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setActiveSection('blog_photos')}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center justify-between ${activeSection === 'blog_photos'
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <BookOpen className="h-4 w-4 text-blue-600" />
                    <span>Blog Photos</span>
                  </div>
                  {adminMissingBlogPhotosCount > 0 && (
                    <span className="bg-amber-100 text-amber-800 text-xs px-2 py-0.5 rounded-full font-bold">
                      {adminMissingBlogPhotosCount}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setActiveSection('coupons')}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-3 ${activeSection === 'coupons'
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
                    }`}
                >
                  <Tag className="h-4 w-4 text-orange-500" /> Coupons &amp; Discounts
                </button>

                <div className="pt-2 mt-2 border-t border-gray-100">
                  <a
                    href="/"
                    className="w-full text-left px-3 py-2 rounded-md text-sm font-semibold transition-colors flex items-center gap-3 text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                    title="Navigate to Landing Page"
                  >
                    <Globe className="h-4 w-4 text-blue-500" />
                    <span>View Website</span>
                  </a>
                </div>
              </div>
            </nav>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col min-w-0 bg-gray-50/50">
            <header className="h-16 sticky top-0 z-10 bg-white border-b border-gray-200 px-8 flex items-center justify-between shrink-0">
              <h1 className="text-xl font-semibold text-gray-900">
                {activeSection === 'dashboard' && 'Admin Dashboard'}
                {activeSection === 'approvals' && 'Agency Approvals'}
                {activeSection === 'listings' && 'Listing Approvals'}

                {activeSection === 'agencies' && 'All Agencies'}
                {activeSection === 'manage_packages' && 'Manage Packages'}
                {activeSection === 'settings' && 'Settings'}
                {activeSection === 'chats' && 'All Chats'}
                {activeSection === 'itinerary_photos' && 'Itinerary Photo Manager'}
                {activeSection === 'blog_photos' && 'Blog Photo Manager'}
                {activeSection === 'coupons' && 'Coupon & Discount Management'}

              </h1>
              <div className="flex items-center space-x-4">
                <a
                  href="/"
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200 transition-all shadow-sm"
                  title="View Landing Page Website"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <Globe className="h-3.5 w-3.5 text-blue-500" />
                  <span>View Website</span>
                </a>
                <span className="text-sm text-gray-600">Welcome, {userData.name}</span>
                <Button variant="outline" size="sm" onClick={signOut}>Sign Out</Button>
              </div>
            </header>

            <main className="flex-1 overflow-y-auto p-8 dashboard-scroll">
              {activeSection === 'overview' && (
                <>
                  {/* Analytics Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center">
                          <div className="p-2 bg-blue-100 rounded-lg">
                            <Users className="h-6 w-6 text-blue-600" />
                          </div>
                          <div className="ml-4">
                            <p className="text-sm font-medium text-gray-600">Total Agencies</p>
                            <p className="text-2xl font-bold text-gray-900">{allAgencies.length}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center">
                          <div className="p-2 bg-green-100 rounded-lg">
                            <CheckCircle className="h-6 w-6 text-green-600" />
                          </div>
                          <div className="ml-4">
                            <p className="text-sm font-medium text-gray-600">Approved</p>
                            <p className="text-2xl font-bold text-gray-900">{allAgencies.filter(a => a.approved).length}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center">
                          <div className="p-2 bg-yellow-100 rounded-lg">
                            <Clock className="h-6 w-6 text-yellow-600" />
                          </div>
                          <div className="ml-4">
                            <p className="text-sm font-medium text-gray-600">Pending</p>
                            <p className="text-2xl font-bold text-gray-900">{pendingAgencies.length}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center">
                          <div className="p-2 bg-purple-100 rounded-lg">
                            <TrendingUp className="h-6 w-6 text-purple-600" />
                          </div>
                          <div className="ml-4">
                            <p className="text-sm font-medium text-gray-600">Total Listings</p>
                            <p className="text-2xl font-bold text-gray-900">{listings.length}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* System Overview */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <BarChart2 className="mr-2 h-5 w-5 text-blue-600" />
                        System Overview
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <p className="text-sm font-medium">Active Travel Packages</p>
                            <p className="text-xs text-gray-500">Approved listings available to users</p>
                          </div>
                          <span className="text-lg font-bold text-blue-600">{listings.length}</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <p className="text-sm font-medium">Pending Approvals</p>
                            <p className="text-xs text-gray-500">Listings and agencies awaiting review</p>
                          </div>
                          <span className="text-lg font-bold text-yellow-600">{pendingListings.length + pendingAgencies.length}</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <p className="text-sm font-medium">System Status</p>
                            <p className="text-xs text-gray-500">All services operational</p>
                          </div>
                          <span className="flex items-center gap-1 text-sm font-semibold text-green-600"><CheckCircle className="h-4 w-4 text-green-600" /> Online</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}

              {activeSection === 'approvals' && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Clock className="mr-2 h-5 w-5 text-yellow-600" />
                      Pending Agency Approvals
                    </CardTitle>
                    <CardDescription>
                      Review and approve new travel agency applications
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {pendingAgencies.length === 0 ? (
                      <p className="text-gray-500 text-center py-8">No pending approvals</p>
                    ) : (
                      <div className="space-y-4">
                        {pendingAgencies.map(agency => (
                          <div key={agency.id} className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="flex items-center space-x-4">
                              <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                                <Building className="h-6 w-6 text-gray-600" />
                              </div>
                              <div>
                                <h3 className="font-semibold">{agency.companyName}</h3>
                                <p className="text-sm text-gray-600">{agency.name} • {agency.authEmail || agency.email || agency.contactEmail || 'No email'}</p>
                              </div>
                            </div>
                            <div className="flex space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {/* Reject logic */ }}
                              >
                                Reject
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => approveAgency(agency.id)}
                              >
                                Approve
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}



              {activeSection === 'agencies' && !viewingAgency && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Users className="mr-2 h-5 w-5 text-blue-600" />
                      All Agencies
                    </CardTitle>
                    <CardDescription>
                      Manage all registered travel agencies
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {allAgencies.map(agency => (
                        <div key={agency.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex items-center space-x-4">
                            <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                              <Building className="h-6 w-6 text-gray-600" />
                            </div>
                            <div>
                              <h3 className="font-semibold">{agency.companyName}</h3>
                              <p className="text-sm text-gray-600">{agency.name} • {agency.authEmail || agency.email || agency.contactEmail || 'No email'}</p>
                              <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                                Status: {agency.approved ? <span className="flex items-center gap-1 text-green-600 font-semibold"><CheckCircle className="h-3.5 w-3.5" /> Approved</span> : <span className="flex items-center gap-1 text-yellow-600 font-semibold"><Clock className="h-3.5 w-3.5" /> Pending</span>}
                              </div>
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            <Button variant="outline" size="sm" onClick={() => setViewingAgency(agency)}>
                              View Details
                            </Button>
                            {!agency.approved && (
                              <Button
                                size="sm"
                                onClick={() => approveAgency(agency.id)}
                              >
                                Approve
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {viewingAgency && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center">
                        <Building className="mr-2 h-6 w-6 text-blue-600" />
                        {viewingAgency.companyName} - Details
                      </CardTitle>
                      <Button variant="outline" size="sm" onClick={() => setViewingAgency(null)}>
                        Back
                      </Button>
                    </div>
                    <CardDescription>
                      Complete information about the travel agency
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Basic Information */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h3 className="font-semibold text-lg mb-4">Basic Information</h3>
                        <div className="space-y-3">
                          <div>
                            <p className="text-sm text-gray-600">Agency Name</p>
                            <p className="font-medium">{viewingAgency.companyName}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Owner Name</p>
                            <p className="font-medium">{viewingAgency.name}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Email</p>
                            <p className="font-medium">{viewingAgency.authEmail || viewingAgency.email || viewingAgency.contactEmail || 'No email provided'}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Contact Number</p>
                            <p className="font-medium">{viewingAgency.contactNumber || 'No contact number'}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Business Location</p>
                            <p className="font-medium">{viewingAgency.businessLocation || 'No location specified'}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Status</p>
                            <div className={`font-medium mt-1 flex items-center gap-1 ${viewingAgency.approved ? 'text-green-600' : 'text-yellow-600'}`}>
                              {viewingAgency.approved ? <><CheckCircle className="h-4 w-4" /> Approved</> : <><Clock className="h-4 w-4" /> Pending</>}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h3 className="font-semibold text-lg mb-4">Operating Details</h3>
                        <div className="space-y-3">
                          <div>
                            <p className="text-sm text-gray-600">Operating From</p>
                            <p className="font-medium">
                              {viewingAgency.operatingFromHome && viewingAgency.operatingFromOffice ? 'Home & Office' :
                                viewingAgency.operatingFromHome ? 'Home' :
                                  viewingAgency.operatingFromOffice ? 'Office' : 'Not specified'}
                            </p>
                          </div>
                          {viewingAgency.operatingFromOffice && (
                            <div>
                              <p className="text-sm text-gray-600">Office Address</p>
                              <p className="font-medium">{viewingAgency.officeAddress || 'No office address'}</p>
                            </div>
                          )}
                          <div>
                            <p className="text-sm text-gray-600">Website</p>
                            <p className="font-medium">{viewingAgency.companyName ? viewingAgency.companyName : 'No website'}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Upload Office Photos</p>
                            <p className="font-medium">{viewingAgency.uploadOfficePhotos ? 'Yes' : 'No'}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Upload Branding</p>
                            <p className="font-medium">{viewingAgency.uploadBranding ? 'Yes' : 'No'}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Full Address */}
                    <div>
                      <h3 className="font-semibold text-lg mb-4">Full Address</h3>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="font-medium">{viewingAgency.fullAddress || 'No address provided'}</p>
                      </div>
                    </div>

                    {/* Agency Description */}
                    <div>
                      <h3 className="font-semibold text-lg mb-4">Agency Description</h3>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="font-medium">{viewingAgency.agencyDescription || 'No description provided'}</p>
                      </div>
                    </div>

                    {/* Refund Policy */}
                    <div>
                      <h3 className="font-semibold text-lg mb-4">Refund & Cancellation Policy</h3>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="font-medium">{viewingAgency.refundPolicy || 'No refund policy provided'}</p>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex space-x-2 pt-4">
                      {!viewingAgency.approved && (
                        <Button onClick={() => approveAgency(viewingAgency.id)}>
                          Approve Agency
                        </Button>
                      )}
                      <Button variant="outline" onClick={() => setViewingAgency(null)}>
                        Back
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {activeSection === 'listings' && !viewingAdminListing && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Palmtree className="mr-2 h-5 w-5 text-blue-600" />
                      Pending Listing Approvals
                    </CardTitle>
                    <CardDescription>
                      Review and approve new travel packages from agencies
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {pendingListings.length === 0 ? (
                      <p className="text-gray-500 text-center py-8">No pending listing approvals</p>
                    ) : (
                      <div className="space-y-4">
                        {pendingListings.map(listing => (
                          <div key={listing.id} className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="flex items-center space-x-4">
                              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                                <Palmtree className="h-6 w-6 text-blue-600" />
                              </div>
                              <div>
                                <h3 className="font-semibold">{listing.title}</h3>
                                <p className="text-sm text-gray-600 font-semibold">
                                  {listing.packageType === 'international' ? ' International' : ' Domestic'} • {listing.packageType === 'international' ? (listing.countryName || 'Country not specified') : (listing.stateName || 'State not specified')}
                                </p>
                                <p className="text-sm text-gray-600">
                                  {listing.itinerary?.length || 0} days • ${listing.cost || listing.price || 'N/A'}
                                </p>
                                {listing.placesCovered && listing.placesCovered.length > 0 && (
                                  <p className="text-xs text-gray-500">
                                    Places: {listing.placesCovered.map((place: any) => place.name).join(', ')}
                                  </p>
                                )}
                                <p className="text-xs text-gray-500 mt-1">
                                  By: {listing.agencyName}
                                </p>
                              </div>
                            </div>
                            <div className="flex space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setViewingAdminListing(listing)}
                              >
                                View Details
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => approveListing(listing.id)}
                              >
                                Approve
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {activeSection === 'manage_packages' && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Palmtree className="mr-2 h-5 w-5 text-blue-600" />
                      Manage Agency Packages
                    </CardTitle>
                    <CardDescription>
                      View and manage packages grouped by agency
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-8">
                      {allAgencies.map(agency => {
                        const agencyPkgs = agencyListings.filter(l => l.agencyId === agency.id);
                        if (agencyPkgs.length === 0) return null;
                        
                        return (
                          <div key={agency.id} className="border rounded-lg p-4 bg-gray-50">
                            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                              <Building className="h-5 w-5 text-gray-600" />
                              {agency.companyName} 
                              <span className="text-sm font-normal text-gray-500">({agencyPkgs.length} packages)</span>
                            </h3>
                            <div className="space-y-4">
                              {agencyPkgs.map(pkg => (
                                <div key={pkg.id} className="flex items-center justify-between p-3 bg-white border rounded-md shadow-sm">
                                  <div>
                                    <h4 className="font-semibold">{pkg.title || `${pkg.packageType === 'international' ? pkg.countryName : pkg.stateName} Package`}</h4>
                                    <p className="text-sm text-gray-600">ID: {pkg.id} | Status: {pkg.approved ? 'Approved' : 'Pending'}</p>
                                  </div>
                                  <Button 
                                    variant="destructive" 
                                    size="sm" 
                                    onClick={() => handleDeletePackage(pkg.id)}
                                  >
                                    <Trash2 className="h-4 w-4 mr-1" /> Delete
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                      {allAgencies.every(agency => agencyListings.filter(l => l.agencyId === agency.id).length === 0) && (
                         <p className="text-gray-500 text-center py-8">No packages found for any agency.</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {activeSection === 'listings' && viewingAdminListing && (() => {
                const allListingImages = [
                  ...(viewingAdminListing.photos || []),
                  ...(viewingAdminListing.placesCovered || []).flatMap((p: any) => p.imageUrls || [])
                ].filter(Boolean);
                return (
                  <div className="space-y-6 animate-in fade-in duration-300">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setViewingAdminListing(null)}
                          className="flex items-center justify-center p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-all border border-slate-200 bg-white shadow-sm"
                          title="Back to Listings"
                        >
                          <ChevronLeft className="h-5 w-5" />
                        </button>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Listing Details</span>
                            <span className="text-slate-300">•</span>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                              viewingAdminListing.approved
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}>
                              <span className={`h-1 w-1 rounded-full ${viewingAdminListing.approved ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
                              {viewingAdminListing.approved ? 'Approved' : 'Pending Review'}
                            </span>
                          </div>
                          <h2 className="text-xl font-bold text-slate-900 mt-0.5">{viewingAdminListing.title || 'Untitled Package'}</h2>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <Button
                          variant="outline"
                          onClick={() => setViewingAdminListing(null)}
                          className="rounded-xl border-slate-200 hover:bg-slate-50 text-slate-700 font-medium px-4 py-2 text-sm transition-all"
                        >
                          Back
                        </Button>
                        {!viewingAdminListing.approved && (
                          <Button
                            onClick={() => {
                              approveListing(viewingAdminListing.id);
                              setViewingAdminListing(null);
                            }}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl px-5 py-2 text-sm shadow-md hover:shadow-lg transition-all flex items-center gap-1.5"
                          >
                            <Check className="h-4 w-4" />
                            Approve Package
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                      <div className="lg:col-span-8 space-y-6">
                        {allListingImages.length > 0 ? (
                          <Card className="border-slate-200 shadow-sm overflow-hidden rounded-3xl bg-white">
                            <div className="relative h-64 md:h-80 w-full overflow-hidden bg-slate-950">
                              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-900/30 to-transparent z-10" />
                              <img
                                src={allListingImages[0]}
                                alt={viewingAdminListing.title}
                                className="w-full h-full object-cover opacity-90 hover:scale-105 transition-transform duration-700 ease-out"
                              />
                              <div className="absolute bottom-6 left-6 z-20 text-white">
                                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest bg-indigo-950/80 px-2.5 py-1 rounded-md border border-indigo-500/20">
                                  Primary Package Gallery
                                </span>
                                <h3 className="text-xl md:text-2xl font-black mt-3 text-white tracking-tight">
                                  {viewingAdminListing.title}
                                </h3>
                                <p className="text-xs text-slate-300 mt-1 font-medium flex items-center gap-1">
                                  <MapPin className="h-3.5 w-3.5 text-rose-500" />
                                  {viewingAdminListing.packageType === 'international' 
                                    ? (viewingAdminListing.countryName || 'Global') 
                                    : (viewingAdminListing.stateName || 'India')}
                                </p>
                              </div>
                              
                              {allListingImages.length > 1 && (
                                <div className="absolute bottom-6 right-6 z-20 bg-slate-950/80 backdrop-blur-md text-[10px] font-bold text-white px-3 py-1.5 rounded-xl border border-slate-800">
                                  {allListingImages.length} Package Images
                                </div>
                              )}
                            </div>
                            
                            {allListingImages.length > 1 && (
                              <div className="p-4 bg-slate-50 border-t border-slate-100 overflow-hidden">
                                <div className="flex gap-3 overflow-x-auto py-1 scrollbar-none">
                                  {allListingImages.map((img, idx) => (
                                    <div 
                                      key={idx} 
                                      className="h-16 w-24 rounded-lg overflow-hidden border border-slate-200 shadow-sm shrink-0 cursor-pointer hover:border-indigo-500 hover:scale-105 transition-all duration-300"
                                    >
                                      <img src={img} alt="Package Thumb" className="h-full w-full object-cover" />
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </Card>
                        ) : (
                          <Card className="border-slate-200 shadow-sm overflow-hidden rounded-3xl bg-white">
                            <div className="relative h-48 w-full bg-gradient-to-r from-indigo-950 via-slate-950 to-slate-900 flex flex-col justify-end p-6 text-white overflow-hidden">
                              <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-indigo-500/10 blur-xl" />
                              <div className="z-10">
                                <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest bg-indigo-900/40 px-2 py-0.5 rounded border border-indigo-500/20">
                                  Administrative Review
                                </span>
                                <h3 className="text-lg md:text-xl font-bold mt-2 text-white">
                                  {viewingAdminListing.title}
                                </h3>
                                <p className="text-xs text-slate-400 mt-1">
                                  Review details, timeline itineraries, and specifications for this tour proposal.
                                </p>
                              </div>
                            </div>
                          </Card>
                        )}
                      
                      <Card className="border-slate-200 shadow-sm overflow-hidden rounded-2xl bg-white">
                        <CardHeader className="border-b border-slate-100 bg-slate-50/50 py-4 px-6">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                              <Camera className="h-4 w-4 text-indigo-500" />
                              Destinations Gallery
                            </CardTitle>
                            <span className="text-xs text-slate-500 font-medium">
                              {viewingAdminListing.placesCovered?.length || 0} Places Covered
                            </span>
                          </div>
                        </CardHeader>
                        <CardContent className="p-6">
                          {viewingAdminListing.placesCovered && viewingAdminListing.placesCovered.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                              {viewingAdminListing.placesCovered.map((place: any, idx: number) => {
                                const placeImageUrl = (place.imageUrls && place.imageUrls.length > 0)
                                  ? place.imageUrls[0]
                                  : (viewingAdminListing.photos && viewingAdminListing.photos.length > 0)
                                    ? viewingAdminListing.photos[0]
                                    : null;

                                return (
                                  <div key={idx} className="group relative border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-slate-50 hover:shadow-md transition-all duration-300">
                                    <div className="h-44 overflow-hidden relative bg-slate-200 flex items-center justify-center">
                                      {placeImageUrl ? (
                                        <img
                                          src={placeImageUrl}
                                          alt={place.name}
                                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                                        />
                                      ) : (
                                        <div className="flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-slate-50 to-slate-100 text-slate-400 w-full h-full">
                                          <MapPin className="h-7 w-7 stroke-[1.5]" />
                                          <span className="text-[11px] font-medium">No photos</span>
                                        </div>
                                      )}
                                      <div className="absolute top-2 left-2 bg-slate-900/75 backdrop-blur-sm text-[10px] text-white px-2 py-0.5 rounded-md font-semibold tracking-wider uppercase">
                                        Location {idx + 1}
                                      </div>
                                    </div>
                                    <div className="p-3 bg-white border-t border-slate-100">
                                      <p className="font-semibold text-sm text-slate-900 truncate">{place.name || `Unnamed Place`}</p>
                                      {place.imageUrls && place.imageUrls.length > 1 && (
                                        <div className="flex items-center gap-1 mt-1 text-[10px] text-slate-400 font-medium">
                                          <Camera className="h-3 w-3" />
                                          <span>{place.imageUrls.length} photos available</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 bg-slate-50/50">
                              <MapPin className="h-10 w-10 stroke-[1.5] mb-2 text-slate-300" />
                              <p className="text-sm font-medium">No places specified for this package</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>

                      <Card className="border-slate-200 shadow-sm rounded-2xl bg-white">
                        <CardHeader className="border-b border-slate-100 bg-slate-50/50 py-4 px-6">
                          <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                            <ClipboardList className="h-4 w-4 text-indigo-500" />
                            Detailed Tour Itinerary
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                          {viewingAdminListing.itinerary && viewingAdminListing.itinerary.length > 0 ? (
                            <div className="relative pl-6 sm:pl-8 space-y-8 before:absolute before:top-2 before:bottom-2 before:left-[18px] sm:before:left-[22px] before:w-[2px] before:bg-indigo-100">
                              {viewingAdminListing.itinerary.map((day: any, idx: number) => (
                                <div key={idx} className="relative group">
                                  <div className="absolute -left-[30px] sm:-left-[34px] top-1.5 w-6 h-6 rounded-full bg-white border-2 border-indigo-500 shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                                    <span className="text-[10px] font-extrabold text-indigo-600">{day.day || idx + 1}</span>
                                  </div>
                                  
                                  <div className="bg-slate-50 hover:bg-slate-100/70 border border-slate-200/60 rounded-xl p-4 transition-all duration-300">
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 mb-2">
                                      <h4 className="font-bold text-sm text-slate-900 group-hover:text-indigo-600 transition-colors">
                                        Day {day.day || idx + 1}: {day.placeName || 'Destination Spot'}
                                      </h4>
                                    </div>
                                    <p className="text-xs text-slate-600 leading-relaxed font-normal">
                                      {day.description || 'No descriptive guide provided for this day of the tour.'}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 bg-slate-50/50">
                              <Calendar className="h-10 w-10 stroke-[1.5] mb-2 text-slate-300" />
                              <p className="text-sm font-medium">No day-by-day itinerary detailed</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card className="border-slate-200 shadow-sm rounded-2xl bg-white overflow-hidden">
                          <div className="border-b border-emerald-100 bg-emerald-50/40 py-3.5 px-5 flex items-center gap-2">
                            <div className="h-7 w-7 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600">
                              <Check className="h-4 w-4 stroke-[2.5]" />
                            </div>
                            <h3 className="font-bold text-sm text-slate-900">Inclusions</h3>
                          </div>
                          <CardContent className="p-5">
                            {viewingAdminListing.inclusions ? (
                              <ul className="space-y-3">
                                {viewingAdminListing.inclusions.split('\n').map((line: string, idx: number) => {
                                  if (!line.trim()) return null;
                                  return (
                                    <li key={idx} className="flex items-start gap-2.5">
                                      <span className="h-4 w-4 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center text-[10px] font-bold mt-0.5 border border-emerald-100 shrink-0">
                                        ✓
                                      </span>
                                      <p className="text-xs text-slate-600 leading-normal">{line.trim()}</p>
                                    </li>
                                  );
                                })}
                              </ul>
                            ) : (
                              <p className="text-xs text-slate-400 italic">No package inclusions specified</p>
                            )}
                          </CardContent>
                        </Card>

                        <Card className="border-slate-200 shadow-sm rounded-2xl bg-white overflow-hidden">
                          <div className="border-b border-rose-100 bg-rose-50/40 py-3.5 px-5 flex items-center gap-2">
                            <div className="h-7 w-7 rounded-lg bg-rose-100 flex items-center justify-center text-rose-600">
                              <X className="h-4 w-4 stroke-[2.5]" />
                            </div>
                            <h3 className="font-bold text-sm text-slate-900">Exclusions</h3>
                          </div>
                          <CardContent className="p-5">
                            {viewingAdminListing.exclusions ? (
                              <ul className="space-y-3">
                                {viewingAdminListing.exclusions.split('\n').map((line: string, idx: number) => {
                                  if (!line.trim()) return null;
                                  return (
                                    <li key={idx} className="flex items-start gap-2.5">
                                      <span className="h-4 w-4 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center text-[9px] font-bold mt-0.5 border border-rose-100 shrink-0">
                                        ✕
                                      </span>
                                      <p className="text-xs text-slate-600 leading-normal">{line.trim()}</p>
                                    </li>
                                  );
                                })}
                              </ul>
                            ) : (
                              <p className="text-xs text-slate-400 italic">No package exclusions specified</p>
                            )}
                          </CardContent>
                        </Card>
                      </div>
                    </div>

                    <div className="lg:col-span-4 space-y-6">
                      <Card className="border-slate-200 shadow-md rounded-2xl bg-[#0F172A] text-white overflow-hidden">
                        <div className="p-6 space-y-6">
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Total Price</span>
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider ${
                                viewingAdminListing.packageType === 'international'
                                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              }`}>
                                {viewingAdminListing.packageType === 'international' ? 'International' : 'Domestic'}
                              </span>
                            </div>
                            <div className="flex items-baseline gap-1">
                              <span className="text-3xl font-extrabold tracking-tight" style={{ color: '#ffffff' }}>
                                {viewingAdminListing.packageType === 'international' ? '$' : '₹'}
                                {viewingAdminListing.cost || viewingAdminListing.price || 'N/A'}
                              </span>
                              <span className="text-slate-400 text-xs font-medium">/ person</span>
                            </div>
                          </div>

                          <div className="h-px bg-slate-800" />

                          <div className="space-y-3.5">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-slate-400 flex items-center gap-1.5">
                                <Clock className="h-4 w-4 text-slate-400" />
                                Duration
                              </span>
                              <span className="font-bold text-white">
                                {viewingAdminListing.itinerary?.length || 0} Days / {Math.max(0, (viewingAdminListing.itinerary?.length || 1) - 1)} Nights
                              </span>
                            </div>

                            <div className="flex items-center justify-between text-sm">
                              <span className="text-slate-400 flex items-center gap-1.5">
                                <MapPin className="h-4 w-4 text-slate-400" />
                                Location
                              </span>
                              <span className="font-bold text-white font-sans">
                                {viewingAdminListing.packageType === 'international' 
                                  ? (viewingAdminListing.countryName || 'Global') 
                                  : (viewingAdminListing.stateName || 'India')}
                              </span>
                            </div>

                            <div className="flex items-center justify-between text-sm">
                              <span className="text-slate-400 flex items-center gap-1.5">
                                <TrendingUp className="h-4 w-4 text-slate-400" />
                                Trending status
                              </span>
                              <span className={`font-bold flex items-center gap-1 ${viewingAdminListing.isTrending ? 'text-amber-400' : 'text-slate-400'}`}>
                                {viewingAdminListing.isTrending ? 'High Demand' : 'Standard'}
                              </span>
                            </div>

                            {viewingAdminListing.discountCategory && viewingAdminListing.discountCategory !== 'none' && (
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-slate-400 flex items-center gap-1.5">
                                  <Tag className="h-4 w-4 text-slate-400" />
                                  Active Promotion
                                </span>
                                <span className="font-bold text-rose-400 uppercase">
                                  {viewingAdminListing.discountCategory === '10-off' ? '10% Discount' :
                                    viewingAdminListing.discountCategory === '50-off' ? '50% Super Saver' :
                                      viewingAdminListing.discountCategory === 'flash-deals' ? 'Flash Deal' : viewingAdminListing.discountCategory}
                                </span>
                              </div>
                            )}
                          </div>

                          <div className="h-px bg-slate-800" />

                          <div className="space-y-2.5">
                            {!viewingAdminListing.approved ? (
                              <>
                                <Button
                                  onClick={() => {
                                    approveListing(viewingAdminListing.id);
                                    setViewingAdminListing(null);
                                  }}
                                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 rounded-xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 border-0"
                                >
                                  <Check className="h-4 w-4 stroke-[2.5]" />
                                  Approve & Go Live
                                </Button>
                                <p className="text-[10px] text-center text-slate-400 font-sans">
                                  Approving will make this package active on the user portal.
                                </p>
                              </>
                            ) : (
                              <div className="flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-semibold">
                                <Check className="h-4 w-4 stroke-[2.5]" />
                                Package Approved & Active
                              </div>
                            )}
                          </div>
                        </div>
                      </Card>

                      <Card className="border-slate-200 shadow-sm rounded-2xl bg-white overflow-hidden">
                        <CardHeader className="border-b border-slate-100 bg-slate-50/50 py-4 px-6">
                          <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                            <Info className="h-4 w-4 text-indigo-500" />
                            Specifications
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-5 space-y-4">
                          <div>
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1.5">Tour Categories</span>
                            <div className="flex flex-wrap gap-1.5">
                              {viewingAdminListing.tourCategories && viewingAdminListing.tourCategories.length > 0 ? (
                                viewingAdminListing.tourCategories.map((cat: string, idx: number) => (
                                  <span key={idx} className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                                    {cat}
                                  </span>
                                ))
                              ) : (
                                <span className="text-xs text-slate-400 italic">None specified</span>
                              )}
                            </div>
                          </div>

                          <div>
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1.5">Hotel Accommodations</span>
                            <div className="flex flex-wrap gap-1.5">
                              {viewingAdminListing.hotelTypes && viewingAdminListing.hotelTypes.length > 0 ? (
                                viewingAdminListing.hotelTypes.map((type: string, idx: number) => (
                                  <span key={idx} className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100 capitalize">
                                    {type}
                                  </span>
                                ))
                              ) : (
                                <span className="text-xs text-slate-400 italic">None specified</span>
                              )}
                            </div>
                          </div>

                          {viewingAdminListing.mealPlan && (
                            <div>
                              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1.5">Meal Plan</span>
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 capitalize">
                                <Utensils className="h-3 w-3" />
                                {Array.isArray(viewingAdminListing.mealPlan)
                                  ? (viewingAdminListing.mealPlan.length > 0
                                      ? viewingAdminListing.mealPlan.map((m: string) => {
                                          if (m === 'breakfast-dinner') return 'Breakfast & Dinner';
                                          if (m === 'breakfast-lunch') return 'Breakfast & Lunch';
                                          if (m === 'lunch-dinner') return 'Lunch & Dinner';
                                          if (m === 'all-meals') return 'All Meals';
                                          if (m === 'no-meal') return 'No Meal';
                                          return m.charAt(0).toUpperCase() + m.slice(1);
                                        }).join(' & ')
                                      : 'No Meals')
                                  : (viewingAdminListing.mealPlan === 'breakfast' ? 'Breakfast Included' :
                                      viewingAdminListing.mealPlan === 'lunch' ? 'Lunch Included' :
                                        viewingAdminListing.mealPlan === 'dinner' ? 'Dinner Included' :
                                          viewingAdminListing.mealPlan === 'breakfast-lunch' ? 'Breakfast & Lunch' :
                                            viewingAdminListing.mealPlan === 'breakfast-dinner' ? 'Breakfast & Dinner' :
                                              viewingAdminListing.mealPlan === 'lunch-dinner' ? 'Lunch & Dinner' :
                                                viewingAdminListing.mealPlan === 'all-meals' ? 'All Meals' : 
                                                  (viewingAdminListing.mealPlan === 'no-meal' ? 'No Meals' : viewingAdminListing.mealPlan))}
                              </span>
                            </div>
                          )}

                          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                            <div>
                              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Recommended Season</span>
                              <span className="text-xs font-bold text-slate-700 capitalize">
                                {viewingAdminListing.season ? (viewingAdminListing.season === 'all-seasons' ? 'All Seasons' : `${viewingAdminListing.season} season`) : 'Any season'}
                              </span>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Activity Genre</span>
                              <span className="text-xs font-bold text-slate-700 capitalize">
                                {Array.isArray(viewingAdminListing.experienceType) && viewingAdminListing.experienceType.length > 0
                                  ? viewingAdminListing.experienceType.join(' | ')
                                  : (typeof viewingAdminListing.experienceType === 'string' && viewingAdminListing.experienceType
                                      ? viewingAdminListing.experienceType
                                      : 'Standard tour')}
                              </span>
                            </div>
                          </div>

                          {viewingAdminListing.eventType && viewingAdminListing.eventType !== '' && (
                            <div className="pt-2.5 border-t border-slate-100">
                              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Seasonal Event / Festival</span>
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-100 capitalize">
                                {viewingAdminListing.eventType === 'new-year' ? 'New Year / Christmas' :
                                  viewingAdminListing.eventType === 'diwali' ? 'Diwali Specials' :
                                    viewingAdminListing.eventType === 'summer-vacation' ? 'Summer Vacation' :
                                      viewingAdminListing.eventType === 'weekend' ? 'Long Weekend Special' : viewingAdminListing.eventType}
                              </span>
                            </div>
                          )}
                        </CardContent>
                      </Card>

                      <Card className="border-slate-200 shadow-sm rounded-2xl bg-white overflow-hidden">
                        <CardHeader className="border-b border-slate-100 bg-slate-50/50 py-4 px-6">
                          <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-indigo-500" />
                            Agency Profile
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-5 space-y-3.5 text-xs">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600 text-sm border border-slate-200">
                              {viewingAdminListing.agencyName ? viewingAdminListing.agencyName.charAt(0).toUpperCase() : 'A'}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 text-sm">{viewingAdminListing.agencyName || 'Unknown Agency'}</p>
                              <p className="text-[10px] text-slate-400 font-mono mt-0.5">ID: {viewingAdminListing.agencyId || 'N/A'}</p>
                            </div>
                          </div>

                          <div className="h-px bg-slate-100" />

                          <div className="grid grid-cols-2 gap-2 text-slate-500 font-medium">
                            <div>
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Submission Date</p>
                              <p className="text-slate-800 font-bold mt-0.5">
                                {viewingAdminListing.createdAt
                                  ? new Date(viewingAdminListing.createdAt?.toDate?.() || viewingAdminListing.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                                  : 'N/A'}
                              </p>
                            </div>
                            <div>
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Listing Reference</p>
                              <p className="text-slate-800 font-mono font-bold mt-0.5 truncate" title={viewingAdminListing.id}>
                                {viewingAdminListing.id ? viewingAdminListing.id.substring(0, 8) : 'N/A'}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </div>
              );
            })()}

              {activeSection === 'chats' && <AdminChatViewer />}
              {activeSection === 'itinerary_photos' && (
                <AdminItineraryPhotoManager
                  initialListings={listings}
                  allAgencies={allAgencies}
                  onListingUpdated={(updatedPkg) => {
                    setListings((prev: any[]) =>
                      prev.map((l: any) => (l.id === updatedPkg.id ? { ...l, ...updatedPkg } : l))
                    );
                  }}
                />
              )}
              {activeSection === 'blog_photos' && (
                <AdminBlogPhotoManager
                  initialBlogs={adminBlogs}
                  initialListings={listings}
                  onBlogUpdated={(updatedBlog) => {
                    setAdminBlogs((prev: any[]) =>
                      prev.map((b: any) => (b.id === updatedBlog.id ? { ...b, ...updatedBlog } : b))
                    );
                  }}
                />
              )}
              {activeSection === 'coupons' && <AdminCouponManagement />}

              {activeSection === 'settings' && (
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Settings className="mr-2 h-5 w-5 text-gray-700" />
                        Admin Settings
                      </CardTitle>
                      <CardDescription>
                        Configure system settings and preferences
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <Label htmlFor="adminEmail">Admin Email</Label>
                          <Input id="adminEmail" value={process.env.NEXT_PUBLIC_ADMIN_EMAIL} disabled />
                        </div>
                        <div>
                          <Label htmlFor="notifications">Email Notifications</Label>
                          <select className="w-full p-2 border rounded-lg" defaultValue="enabled">
                            <option value="enabled">Enabled</option>
                            <option value="disabled">Disabled</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <h3 className="text-lg font-semibold mb-4 text-blue-700">Dynamic Pricing Configuration (INR)</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div>
                            <Label>Starter Plan</Label>
                            <Input type="number" value={pricingConfig.starterPrice} onChange={(e) => setPricingConfig({...pricingConfig, starterPrice: parseInt(e.target.value) || 0})} />
                          </div>
                          <div>
                            <Label>Premium Plan</Label>
                            <Input type="number" value={pricingConfig.premiumPrice} onChange={(e) => setPricingConfig({...pricingConfig, premiumPrice: parseInt(e.target.value) || 0})} />
                          </div>
                          <div>
                            <Label>VIP Plan</Label>
                            <Input type="number" value={pricingConfig.vipPrice} onChange={(e) => setPricingConfig({...pricingConfig, vipPrice: parseInt(e.target.value) || 0})} />
                          </div>
                          <div>
                            <Label>Add-on (per cr)</Label>
                            <Input type="number" value={pricingConfig.addonCreditPrice} onChange={(e) => setPricingConfig({...pricingConfig, addonCreditPrice: parseFloat(e.target.value) || 0})} />
                          </div>
                        </div>
                      </div>

                      <Button onClick={async () => {
                        try {
                          const response = await fetch('/api/admin/save-config', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(pricingConfig)
                          });
                          if (!response.ok) throw new Error('Failed to save configuration');
                          alert('Pricing configuration saved successfully!');
                        } catch (err) {
                          alert('Error saving config.');
                          console.error(err);
                        }
                      }}>Save Configuration</Button>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <MessageSquare className="mr-2 h-5 w-5 text-blue-600" />
                        Chat Quick Replies Management
                      </CardTitle>
                      <CardDescription>
                        Add or remove custom quick replies for travelers and agencies
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div>
                        <h3 className="text-lg font-semibold mb-3">Traveler (User) Quick Replies</h3>
                        <div className="flex gap-2 mb-4">
                          <Input
                            value={newBuyerReplyInput}
                            onChange={(e) => setNewBuyerReplyInput(e.target.value)}
                            placeholder="Type a new traveler quick reply..."
                            className="flex-1"
                          />
                          <Button onClick={() => handleAddQuickReply('buyer')}>Add</Button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {BUYER_QUICK_REPLIES.map((reply, idx) => (
                            <span key={`default-buyer-${idx}`} className="px-3 py-1.5 bg-gray-100 text-gray-600 text-xs rounded-full flex items-center gap-1 border border-gray-200">
                              {reply}
                              <span className="text-[10px] text-gray-400 italic ml-1">(Default)</span>
                            </span>
                          ))}
                          {adminBuyerReplies.map((reply, idx) => (
                            <span key={`admin-buyer-${idx}`} className="px-3 py-1.5 bg-blue-50 text-blue-700 text-xs rounded-full flex items-center gap-2 border border-blue-200">
                              {reply}
                              <button onClick={() => handleRemoveQuickReply('buyer', idx)} className="hover:bg-blue-200 rounded-full w-4 h-4 flex items-center justify-center font-bold text-blue-800">×</button>
                            </span>
                          ))}
                        </div>
                      </div>

                      <hr className="border-gray-200" />

                      <div>
                        <h3 className="text-lg font-semibold mb-3">Travel Agency (Seller) Quick Replies</h3>
                        <div className="flex gap-2 mb-4">
                          <Input
                            value={newSellerReplyInput}
                            onChange={(e) => setNewSellerReplyInput(e.target.value)}
                            placeholder="Type a new agency quick reply..."
                            className="flex-1"
                          />
                          <Button onClick={() => handleAddQuickReply('seller')}>Add</Button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {SELLER_QUICK_REPLIES.map((reply, idx) => (
                            <span key={`default-seller-${idx}`} className="px-3 py-1.5 bg-gray-100 text-gray-600 text-xs rounded-full flex items-center gap-1 border border-gray-200">
                              {reply}
                              <span className="text-[10px] text-gray-400 italic ml-1">(Default)</span>
                            </span>
                          ))}
                          {adminSellerReplies.map((reply, idx) => (
                            <span key={`admin-seller-${idx}`} className="px-3 py-1.5 bg-orange-50 text-orange-700 text-xs rounded-full flex items-center gap-2 border border-orange-200">
                              {reply}
                              <button onClick={() => handleRemoveQuickReply('seller', idx)} className="hover:bg-orange-200 rounded-full w-4 h-4 flex items-center justify-center font-bold text-orange-800">×</button>
                            </span>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </main>
          </div>
          <CheckoutModal
            isOpen={checkoutModalOpen}
            onClose={() => setCheckoutModalOpen(false)}
            targetPlan={checkoutTargetPlan}
            planTitle={checkoutPlanTitle}
            originalPrice={checkoutOriginalPrice}
            agencyId={user?.uid || ''}
            agencyName={userData?.companyName || userData?.name}
            agencyEmail={userData?.email}
            onSuccess={(newPlan) => {
              window.location.reload();
            }}
          />
        </div>
      );
    }
  }

  // User Dashboard — render ONLY when routeMode='user' or default public browsing (not on agency/admin portal routes)
  if (routeMode === 'user' || (!routeMode && userData?.role !== 'agency' && userData?.role !== 'admin')) {
      const showHeaderSearch = isScrolled || (userActiveSection !== 'listings' || !!viewingListing || showBookingForm || showComparison);
      return (
        <div className={`flex flex-col bg-white ${userActiveSection === 'chat' ? 'h-screen overflow-hidden' : 'min-h-screen'}`}>
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
                      setUserActiveSection('listings');
                      setViewingListing(null);
                      setSelectedCategoryFilter(null);
                      setDashboardViewMode('categories');
                      setSearchTerm('');
                      setShowBookingForm(false);
                      setShowComparison(false);
                      setMobileMenuOpen(false);
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
                      <Button
                        onClick={() => {
                          setMobileMenuOpen(false);
                          setAuthModalTab('login');
                          setShowAuthModal(true);
                        }}
                        className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold text-xs py-2 h-9 rounded-xl shadow-sm"
                      >
                        <User className="h-4 w-4 mr-1.5" /> Sign In / Register
                      </Button>
                    </div>
                  )}

                  {/* Direct Agency Portal Redirect Card for Mobile Drawer */}
                  {user && userData && userData.role === 'agency' && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <a
                        href="/agencytripdm"
                        className="w-full flex items-center justify-between p-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-semibold transition-all"
                      >
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-gray-600" />
                          <span>Go to Agency Portal</span>
                        </div>
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                      </a>
                    </div>
                  )}

                  {user && userData && userData.role === 'admin' && (
                    <div className="mt-3 pt-3 border-t border-slate-200">
                      <a
                        href="/admin"
                        className="w-full flex items-center justify-between p-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold shadow-md transition-all"
                      >
                        <div className="flex items-center gap-2">
                          <Shield className="h-4 w-4" />
                          <span>Go to Admin Dashboard</span>
                        </div>
                        <ChevronRight className="h-4 w-4" />
                      </a>
                    </div>
                  )}
                </div>

                {/* Drawer Search Input */}
                <div className="p-3 border-b border-slate-100">
                  <AutocompleteSearch
                    placeholder="Search for destination"
                    typewriterPrefix="Search for "
                    typewriter={["Rajasthan", "Kerala", "Kashmir", "Goa", "Himachal Pradesh", "Dubai", "Assam", "Thailand"]}
                    value={searchTerm}
                    onChange={(val) => setSearchTerm(val)}
                    onSelect={(val) => {
                      setSearchTerm(val);
                      setUserActiveSection('listings');
                      setViewingListing(null);
                      setShowComparison(false);
                      setMobileMenuOpen(false);
                    }}
                    suggestions={allDestinations}
                    inputClassName="w-full pl-9 pr-3 py-2 rounded-xl text-slate-900 bg-slate-100/90 focus:bg-white focus:ring-2 focus:ring-orange-500/40 focus:outline-none border border-slate-200 text-xs h-9 shadow-none font-medium"
                    iconClassName="left-3 top-2.5 text-slate-400"
                  />
                </div>

                {/* Navigation Links Scrollable Area */}
                <div className="flex-1 overflow-y-auto py-3 px-3 space-y-1 sidebar-scroll">
                  <p className="text-[10px] uppercase font-bold text-slate-400 px-3 pt-1 pb-1 tracking-wider">Main Navigation</p>

                  {/* Explore Packages */}
                  <button
                    onClick={() => {
                      setFromSection(userActiveSection);
                      setUserActiveSection('listings');
                      setViewingListing(null);
                      setShowBookingForm(false);
                      setShowComparison(false);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                      userActiveSection === 'listings' && !showComparison && !viewingListing
                        ? 'bg-orange-50 text-orange-600 font-bold'
                        : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Palmtree className="h-4 w-4 text-orange-500" />
                      <span>Explore Packages</span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-300" />
                  </button>

                  {/* Compare Packages */}
                  <button
                    onClick={() => {
                      setFromSection(userActiveSection);
                      setUserActiveSection('listings');
                      setShowComparison(true);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                      showComparison
                        ? 'bg-orange-50 text-orange-600 font-bold'
                        : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Scale className="h-4 w-4 text-blue-500" />
                      <span>Compare Packages</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {comparisonList.length > 0 && (
                        <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full">
                          {comparisonList.length}
                        </span>
                      )}
                      <ChevronRight className="h-4 w-4 text-slate-300" />
                    </div>
                  </button>

                  {/* Wishlist */}
                  <button
                    onClick={() => {
                      setFromSection(userActiveSection);
                      setUserActiveSection('wishlist');
                      setShowComparison(false);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                      userActiveSection === 'wishlist'
                        ? 'bg-orange-50 text-orange-600 font-bold'
                        : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                    }`}
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
                      if (!user) {
                        setAuthModalTab('login');
                        setShowAuthModal(true);
                        setMobileMenuOpen(false);
                        return;
                      }
                      setFromSection(userActiveSection);
                      setUserActiveSection('chat');
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                      userActiveSection === 'chat'
                        ? 'bg-orange-50 text-orange-600 font-bold'
                        : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                    }`}
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
                      if (!user) {
                        setAuthModalTab('login');
                        setShowAuthModal(true);
                      } else {
                        setFromSection(userActiveSection);
                        setUserActiveSection('profile');
                      }
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                      userActiveSection === 'profile'
                        ? 'bg-orange-50 text-orange-600 font-bold'
                        : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <User className="h-4 w-4 text-purple-500" />
                      <span>My Profile & Bookings</span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-300" />
                  </button>

                  {/* Location Display */}
                  <div className="pt-2 px-1">
                    <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-xl text-xs text-slate-600 border border-slate-150">
                      <MapPin className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                      <span className="font-medium truncate">Delivery Pincode: <strong>{pincode}</strong></span>
                    </div>
                  </div>

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
                    <a
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
                    </a>
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
                        signOut();
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

          {/* Top Navigation Bar */}
          <header className="header-transition text-gray-900 z-[100] sticky top-0 bg-white/95 backdrop-blur-md shadow-sm border-b border-gray-200">
            {/* Desktop Header Layout */}
            <div className="hidden md:flex max-w-7xl mx-auto items-center justify-between gap-4 px-4 h-16 w-full">
              {/* Logo & Search */}
              <div className="flex items-center gap-4 flex-1">
                <div
                  className="flex items-center gap-1 sm:gap-2 font-extrabold tracking-tight cursor-pointer shrink-0"
                  onClick={() => {
                    setUserActiveSection('listings');
                    setViewingListing(null);
                    setSelectedCategoryFilter(null);
                    setDashboardViewMode('categories');
                    setSearchTerm('');
                    setAdvancedFilters({
                      duration: 7,
                      budget: 77000,
                      budgetCategory: null,
                      hotelCategory: null
                    });
                    setShowBookingForm(false);
                    setShowComparison(false);
                  }}
                >
                  <img src="/tripdm-logo.png" alt="TripDM Logo" className="h-16 md:h-20 w-auto object-contain py-1" />
                </div>
                <div className="relative w-full max-w-xl">
                  <AutocompleteSearch
                    placeholder="Search for destination"
                    typewriterPrefix="Search for "
                    typewriter={["Rajasthan", "Kerala", "Kashmir", "Goa", "Himachal Pradesh", "Dubai", "Assam", "Thailand"]}
                    value={searchTerm}
                    onChange={(val) => setSearchTerm(val)}
                    onSelect={(val) => {
                      setSearchTerm(val);
                    }}
                    suggestions={allDestinations}
                    inputClassName="w-full pl-10 pr-4 py-2 rounded-full text-slate-900 bg-slate-50/90 focus:bg-white focus:ring-2 focus:ring-amber-500/40 focus:outline-none border border-slate-200/90 text-sm h-10 shadow-[0_2px_10px_rgba(0,0,0,0.03)] hover:border-slate-300 transition-all font-medium"
                    iconClassName="left-3.5 top-3 text-slate-400"
                  />
                </div>
              </div>

              {/* Right Links */}
              <div className="flex items-center gap-5 shrink-0 pl-4">
                {/* Location */}
                <div className="flex items-center gap-1.5 text-slate-700 select-none mr-1">
                  <MapPin className="h-4 w-4 text-slate-600" />
                  <div className="flex flex-col leading-[1.1]">
                    <span className="font-semibold text-gray-900 text-[13px]">{pincode}</span>
                  </div>
                </div>

                {/* Compare */}
                <span
                  className="cursor-pointer text-[15px] font-medium text-slate-800 flex items-center gap-1.5 select-none"
                  onClick={() => {
                    setFromSection(userActiveSection);
                    setUserActiveSection('listings');
                    setShowComparison(true);
                  }}
                >
                  <Scale className="h-4 w-4 text-slate-600" /> Compare
                  {comparisonList.length > 0 && (
                    <span className="bg-slate-900 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full ml-0.5">
                      {comparisonList.length}
                    </span>
                  )}
                </span>

                {/* Wishlist */}
                <span
                  className="cursor-pointer text-[15px] font-medium text-slate-800 flex items-center gap-1.5 select-none"
                  onClick={() => {
                    setFromSection(userActiveSection);
                    setUserActiveSection('wishlist');
                    setShowComparison(false);
                  }}
                >
                  <Heart className="h-4 w-4 text-slate-600" /> Wishlist
                  {wishlist.length > 0 && (
                    <span className="bg-slate-900 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full ml-0.5">
                      {wishlist.length}
                    </span>
                  )}
                </span>

                {/* Messages */}
                <span
                  className="cursor-pointer text-[15px] font-medium text-slate-800 flex items-center gap-1.5 select-none"
                  onClick={() => {
                    if (!user) {
                      setAuthModalTab('login');
                      setShowAuthModal(true);
                      return;
                    }
                    setFromSection(userActiveSection);
                    setUserActiveSection('chat');
                  }}
                >
                  <MessageSquare className="h-4 w-4 text-slate-600" /> Messages
                </span>

                {/* Profile / Sign In */}
                {user && userData ? (
                  <div className="flex items-center gap-3 ml-2 border-l border-gray-200 pl-4">
                    {/* ONLY VISIBLE TO LOGGED-IN AGENCIES */}
                    {userData.role === 'agency' && (
                      <a
                        href="/agencytripdm"
                        className="cursor-pointer text-[15px] font-medium flex items-center gap-1.5 text-slate-800 shrink-0"
                        title="Go to Agency Portal"
                      >
                        <Building2 className="h-4 w-4 text-slate-600" />
                        <span>Agency Portal</span>
                      </a>
                    )}
                    {userData.role === 'admin' && (
                      <a
                        href="/admin"
                        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-slate-800 text-white shadow-sm shrink-0"
                        title="Go to Admin Dashboard"
                      >
                        <Shield className="h-3.5 w-3.5" />
                        <span>Admin Portal</span>
                      </a>
                    )}

                    <div
                      className="flex items-center gap-2 cursor-pointer text-[15px] font-medium text-slate-800"
                      onClick={() => {
                        setFromSection(userActiveSection);
                        setUserActiveSection('profile');
                      }}
                    >
                      {userData.avatarUrl ? (
                        <img src={userData.avatarUrl} alt="Profile" className="w-7 h-7 rounded-full object-cover ring-1 ring-slate-200" />
                      ) : (
                        <div className="w-7 h-7 bg-gray-100 rounded-full flex items-center justify-center text-slate-600 border border-gray-200">
                          <User className="h-4 w-4" />
                        </div>
                      )}
                      <span>Hi, {userData?.name ? userData.name.split(' ')[0] : 'User'}</span>
                    </div>
                    
                    <span
                      className="text-[13px] text-slate-600 cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        signOut();
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
              {/* Left: Hamburger Button & Logo */}
              <div className="flex items-center gap-2 sm:gap-3">
                <button
                  onClick={() => setMobileMenuOpen(true)}
                  className="p-2 -ml-1 text-slate-700 hover:text-slate-900 hover:bg-slate-100 active:bg-slate-200 rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-slate-300"
                  aria-label="Open navigation menu"
                >
                  <Menu className="h-6 w-6" />
                </button>

                <div
                  className="cursor-pointer flex items-center"
                  onClick={() => {
                    setUserActiveSection('listings');
                    setViewingListing(null);
                    setSelectedCategoryFilter(null);
                    setDashboardViewMode('categories');
                    setSearchTerm('');
                    setShowBookingForm(false);
                    setShowComparison(false);
                  }}
                >
                  <img src="/tripdm-logo.png" alt="TripDM Logo" className="h-10 sm:h-12 w-auto object-contain py-1" />
                </div>
              </div>

              {/* Right: Quick Action Icons */}
              <div className="flex items-center gap-1 sm:gap-1.5">
                {/* Search Toggle Icon */}
                <button
                  onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
                  className="p-2 rounded-xl text-slate-700 hover:bg-slate-100 transition-colors"
                  aria-label="Search destinations"
                >
                  <Search className="h-5 w-5" />
                </button>

                {/* Compare Icon with Badge */}
                <button
                  onClick={() => {
                    setFromSection(userActiveSection);
                    setUserActiveSection('listings');
                    setShowComparison(true);
                  }}
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

                {/* Wishlist Icon with Badge */}
                <button
                  onClick={() => {
                    setFromSection(userActiveSection);
                    setUserActiveSection('wishlist');
                    setShowComparison(false);
                  }}
                  className="p-2 text-slate-700 hover:bg-slate-100 rounded-xl transition-colors relative"
                  aria-label="View wishlist"
                >
                  <Heart className="h-5 w-5" />
                  {wishlist.length > 0 && (
                    <span className="absolute top-1 right-1 bg-slate-900 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center ring-2 ring-white">
                      {wishlist.length}
                    </span>
                  )}
                </button>

                {/* Messages Icon */}
                <button
                  onClick={() => {
                    if (!user) {
                      setAuthModalTab('login');
                      setShowAuthModal(true);
                      return;
                    }
                    setFromSection(userActiveSection);
                    setUserActiveSection('chat');
                  }}
                  className="p-2 text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
                  aria-label="View messages"
                >
                  <MessageSquare className="h-5 w-5" />
                </button>

                {/* Profile / Login Avatar */}
                {user && userData ? (
                  <div className="flex items-center gap-1.5">
                    {userData.role === 'agency' && (
                      <a
                        href="/agencytripdm"
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-200 transition-all shrink-0"
                        title="Go to Agency Portal"
                      >
                        <Building2 className="h-3.5 w-3.5 text-gray-600" />
                        <span>Portal</span>
                      </a>
                    )}
                    {userData.role === 'admin' && (
                      <a
                        href="/admin"
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-800 text-white shadow-sm transition-all shrink-0"
                        title="Go to Admin Dashboard"
                      >
                        <Shield className="h-3.5 w-3.5" />
                        <span>Admin</span>
                      </a>
                    )}
                    <button
                      onClick={() => {
                        setFromSection(userActiveSection);
                        setUserActiveSection('profile');
                      }}
                      className="ml-0.5 p-0.5 rounded-full ring-2 ring-orange-400 focus:outline-none"
                      aria-label="User Profile"
                    >
                      {userData.avatarUrl ? (
                        <img src={userData.avatarUrl} alt="Profile" className="w-7 h-7 rounded-full object-cover" />
                      ) : (
                        <div className="w-7 h-7 bg-orange-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                          {userData?.name ? userData.name.charAt(0).toUpperCase() : 'U'}
                        </div>
                      )}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setAuthModalTab('login');
                      setShowAuthModal(true);
                    }}
                    className="ml-1 px-2.5 py-1 text-xs font-bold text-orange-600 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors"
                  >
                    Login
                  </button>
                )}
              </div>
            </div>

            {/* Mobile Expandable Search Bar */}
            {mobileSearchOpen && (
              <div className="md:hidden px-4 pb-3 pt-1 border-t border-slate-100 bg-white/95">
                <AutocompleteSearch
                  placeholder="Search for destination"
                  typewriterPrefix="Search for "
                  typewriter={["Rajasthan", "Kerala", "Kashmir", "Goa", "Himachal Pradesh", "Dubai", "Assam", "Thailand"]}
                  value={searchTerm}
                  onChange={(val) => setSearchTerm(val)}
                  onSelect={(val) => {
                    setSearchTerm(val);
                    setMobileSearchOpen(false);
                  }}
                  suggestions={allDestinations}
                  inputClassName="w-full pl-10 pr-4 py-2 rounded-full text-slate-900 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-amber-500/40 focus:outline-none border border-slate-200 text-sm h-10 shadow-sm font-medium"
                  iconClassName="left-3.5 top-3 text-slate-400"
                />
              </div>
            )}
          </header>


          {/* Main Dashboard Scroll Area */}
          <div
            className={`flex-1 w-full min-w-0 ${
              userActiveSection === 'chat' ? 'overflow-hidden flex flex-col h-[calc(100vh-4rem)] max-h-[calc(100vh-4rem)] min-h-0' : ''
            }`}
            id="user-dashboard-scroll-container"
          >
            <main className={`${(userActiveSection === 'chat' || (showComparison && userActiveSection === 'listings')) ? 'w-full flex-1 flex flex-col min-h-0 min-w-0 !p-0 !max-w-none' : (userActiveSection === 'profile' || userActiveSection === 'comparison' || userActiveSection === 'wishlist' || userActiveSection === 'listings') ? 'w-full max-w-[1600px] mx-auto px-4 sm:px-8' : 'px-6 max-w-7xl mx-auto w-full'} ${userActiveSection === 'chat' ? '' : (userActiveSection === 'wishlist' && wishlist.length === 0) ? 'pb-0' : (userActiveSection === 'comparison' || (showComparison && userActiveSection === 'listings') || userActiveSection === 'profile') ? 'pb-0' : 'pb-10'}`}>
              {/* Header logic adjusted for non-listings sections (excludes bookings and profile which have their own layouts) */}
              {userActiveSection !== 'listings' && userActiveSection !== 'bookings' && userActiveSection !== 'profile' && userActiveSection !== 'comparison' && userActiveSection !== 'wishlist' && userActiveSection !== 'chat' && (
                <div className="mb-6 mt-6 px-6 max-w-7xl mx-auto flex justify-between items-center border-b pb-4 border-gray-200">
                  <div className="flex items-center gap-3">
                    {userActiveSection === 'wishlist' && (
                      <button
                        onClick={() => setUserActiveSection(fromSection === 'wishlist' ? 'listings' : fromSection)}
                        className="flex items-center justify-center w-9 h-9 rounded-full border border-gray-200 hover:bg-gray-100 text-gray-750 transition-all hover:scale-105 active:scale-95 text-lg font-bold shadow-sm"
                        title="Go back"
                      >
                        ←
                      </button>
                    )}
                    <h1 className="text-3xl font-bold text-gray-900">
                      {userActiveSection === 'chat' && 'Messages'}
                      {userActiveSection === 'wishlist' && 'My Wishlist'}
                    </h1>
                  </div>
                </div>
              )}

              {userActiveSection === 'listings' && !viewingListing && !showBookingForm && !showComparison && (
                <div className="relative z-10 w-full pt-4">

                  {/* Compute active filter count & summary for mobile button */}
                  {(() => {
                    const activeFilterCount = (
                      (selectedCategoryFilter ? 1 : 0) +
                      (advancedFilters.duration < 7 ? 1 : 0) +
                      (advancedFilters.budget < 77000 ? 1 : 0) +
                      (advancedFilters.budgetCategory ? 1 : 0) +
                      (advancedFilters.hotelCategory ? 1 : 0)
                    );

                    return (
                      <>
                        {/* Mobile View: Floating Filter Button at bottom of screen */}
                        <button
                          onClick={() => setShowFilters(true)}
                          className="sm:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900/95 hover:bg-slate-900 text-white shadow-[0_8px_25px_rgba(0,0,0,0.35)] px-5 py-2.5 rounded-full flex items-center gap-2 font-bold text-xs backdrop-blur-md border border-white/20 active:scale-95 transition-all cursor-pointer"
                        >
                          <SlidersHorizontal className="w-4 h-4 text-orange-400" />
                          <span>Filters</span>
                          {activeFilterCount > 0 && (
                            <span className="bg-orange-500 text-white text-[10px] px-1.5 h-4 min-w-[16px] rounded-full flex items-center justify-center font-mono font-bold">
                              {activeFilterCount}
                            </span>
                          )}
                        </button>

                        {/* Desktop View: Classic Category Nav Strip */}
                        <div id="category-nav-strip" className="hidden sm:flex w-fit max-w-full mx-auto bg-white/85 border border-white/80 rounded-xl p-2.5 mb-8 shadow-[0_10px_35px_-5px_rgba(0,0,0,0.05)] items-center justify-center gap-3 sm:gap-4 py-2.5 sticky top-16 z-[90] backdrop-blur-xl relative transition-all duration-300">
                          <div className="flex gap-2 sm:gap-3.5 items-center justify-center px-2 overflow-x-auto horizontal-scroll-nav scrollbar-hide max-w-full">
                            {[
                              { id: 'all_categories', label: 'Categories', type: 'categories', filter: null },
                              { id: 'all_packages', label: 'All Packages', type: 'all', filter: null, hidden: dashboardViewMode !== 'all' },
                              { id: 'domestic_tab', label: 'Domestic', type: 'all', filter: { category: 'domestic', title: 'Domestic Packages' } },
                              { id: 'intl_tab', label: 'International', type: 'all', filter: { category: 'international', title: 'International Packages' } },
                              { id: 'family_tab', label: 'Family', type: 'all', filter: { category: 'tourCategory', subcategory: 'Family Tour', title: 'Tour by Category - Family Tour' } },
                              { id: 'honeymoon_tab', label: 'Honeymoon', type: 'all', filter: { category: 'tourCategory', subcategory: 'Honeymoon Tour', title: 'Tour by Category - Honeymoon Tour' } },
                              { id: 'experience_tab', label: 'Adventure', type: 'all', filter: { category: 'experiences', subcategory: 'Adventure', title: 'Experience Travel - Adventure' } }
                            ].map((item) => {
                              if ((item as any).hidden) return null;
                              const isCategoriesActive = item.type === 'categories' && dashboardViewMode === 'categories' && !selectedCategoryFilter;
                              const isAllActive = item.type === 'all' && dashboardViewMode === 'all' && !selectedCategoryFilter && !item.filter;
                              const isFilterActive = item.filter && selectedCategoryFilter && 
                                                     selectedCategoryFilter.category === item.filter.category && 
                                                     selectedCategoryFilter.subcategory === item.filter.subcategory;
                              
                              const isActive = isCategoriesActive || isAllActive || isFilterActive;

                              return (
                                <button
                                  key={item.id}
                                  onClick={() => {
                                    setSearchTerm('');
                                    if (item.type === 'categories') {
                                      setDashboardViewMode('categories');
                                      setSelectedCategoryFilter(null);
                                    } else if (item.id === 'domestic_tab') {
                                      setDashboardViewMode('categories');
                                      setSelectedCategoryFilter({ category: 'domestic', title: 'Domestic Packages' });
                                    } else if (item.id === 'intl_tab') {
                                      setDashboardViewMode('categories');
                                      setSelectedCategoryFilter({ category: 'international', title: 'International Packages' });
                                    } else {
                                      setDashboardViewMode('all');
                                      setSelectedCategoryFilter(item.filter);
                                    }
                                  }}
                                  className={`px-4 py-2 rounded-md text-xs sm:text-sm font-semibold transition-all duration-200 flex items-center gap-2 shrink-0 cursor-pointer ${
                                    isActive
                                      ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/25 border border-amber-400/50 scale-[1.02]'
                                      : 'bg-white/80 border border-slate-200/80 text-slate-700 hover:bg-white hover:text-slate-900 hover:border-slate-300 hover:shadow-sm hover:scale-[1.02]'
                                  }`}
                                  style={{ borderRadius: '6px' }}
                                >
                                  {getTabIcon(item.id, "h-3.5 w-3.5")}
                                  {item.label}
                                </button>
                              );
                            })}
                          </div>
                          
                          <div className="h-6 w-px bg-slate-200/80 mx-1 shrink-0"></div>
                          
                          <div className="relative shrink-0 flex items-center">
                            <button
                              onClick={() => setShowFilters(!showFilters)}
                              className={`px-4 py-2 rounded-md text-xs sm:text-sm font-semibold transition-all duration-200 flex items-center gap-2 border ${
                                showFilters 
                                  ? 'bg-orange-50 border-orange-300 text-orange-600 shadow-sm'
                                  : 'bg-white/90 border-slate-200/80 text-slate-700 hover:bg-white hover:text-slate-900 hover:border-slate-300 hover:shadow-sm hover:scale-[1.02]'
                              }`}
                              style={{ borderRadius: '6px' }}
                            >
                              <SlidersHorizontal className={`h-4 w-4 ${showFilters ? 'text-orange-500' : 'text-slate-500'}`} />
                              Filter
                            </button>
                          </div>
                        </div>

                        {/* Filter Sidebar & Mobile Sliding Bottom Sheet */}
                        <FilterSidebar 
                          isOpen={showFilters} 
                          onClose={() => setShowFilters(false)} 
                          initialFilters={advancedFilters}
                          selectedCategory={selectedCategoryFilter}
                          onSelectCategory={(newCat) => {
                            setSelectedCategoryFilter(newCat);
                            if (newCat) {
                              setDashboardViewMode('all');
                            }
                          }}
                          onApply={(newFilters) => {
                            setAdvancedFilters(newFilters);
                            if (dashboardViewMode === 'categories') {
                              setDashboardViewMode('all');
                            }
                          }}
                        />
                      </>
                    );
                  })()}



                  {/* Main View Controller */}
                  {dashboardViewMode === 'categories' && !searchTerm ? (
                    /* Amazon & Thrillophilia Travel Discovery Landing Page */
                    <LandingDiscovery
                      listings={listings}
                      onView={setViewingListing}
                      onBook={startBooking}
                      onChat={handleInitiateChat}
                      onWishlist={handleWishlistToggle}
                      wishlist={wishlist}
                      searchTerm={searchTerm}
                      setSearchTerm={setSearchTerm}
                      allDestinations={allDestinations}
                      onSelectCategoryFilter={(filter) => {
                        setSelectedCategoryFilter(filter);
                        setDashboardViewMode('all');
                      }}
                      initialPackageTypeTab={
                        selectedCategoryFilter?.category === 'domestic'
                          ? 'domestic'
                          : selectedCategoryFilter?.category === 'international'
                          ? 'international'
                          : 'all'
                      }
                    />
                  ) : (
                    /* Filtered Listings Grid - Matching original 3-column card dimensions */
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 w-full justify-items-center sm:justify-items-stretch">
                      {listings.length === 0 ? (
                        <div className="col-span-full py-16 flex flex-col items-center justify-center bg-gray-50/50 rounded-3xl border border-gray-100 border-dashed">
                          <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-6 shadow-inner relative overflow-hidden">
                            <Palmtree className="h-10 w-10 text-blue-600 animate-bounce" />
                          </div>
                          <h3 className="text-xl font-bold text-gray-800 mb-2">Fetching Best Deals</h3>
                          <p className="text-gray-500 font-medium text-center max-w-md">
                            We are looking for the perfect travel packages for you. If nothing appears, check back later!
                          </p>

                          {/* Fake skeletons below the text to simulate loading */}
                          <div className="w-full max-w-4xl mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 opacity-40">
                            {[1, 2, 3].map(i => (
                              <div key={i} className="bg-white border border-gray-100 rounded-3xl p-4 h-48 shadow-sm animate-pulse flex flex-col gap-4">
                                <div className="w-full h-24 bg-gray-200 rounded-2xl"></div>
                                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (() => {
                        const filtered = listings
                          .filter(listing => {
                            if (!listing.approved) return false;

                            // 1. Apply category filter if active
                            if (selectedCategoryFilter) {
                              const { category, subcategory } = selectedCategoryFilter;

                              if (category === 'tourCategory') {
                                const cats = listing.tourCategories || [];
                                const sub = subcategory || '';
                                if (sub === 'Family Tour' && !cats.includes('Family')) return false;
                                if (sub === 'Group Tour' && !(cats.includes('Friends') || cats.includes('Group'))) return false;
                                if (sub === 'Fix Departure Tour' && !cats.includes('Fix Departure')) return false;
                                if (sub === 'Honeymoon Tour' && !cats.includes('Honeymoon')) return false;
                                if (!sub && cats.length === 0) return false;
                              }

                              else if (category === 'domestic') {
                                if (listing.packageType !== 'domestic') return false;
                                if (subcategory) {
                                  const state = ((listing.stateName || '') + ' ' + (listing.destination || '') + ' ' + (listing.title || '')).toLowerCase();
                                  const target = subcategory.toLowerCase();
                                  if (!state.includes(target)) return false;
                                }
                              }

                              else if (category === 'international') {
                                if (listing.packageType !== 'international') return false;
                                if (subcategory) {
                                  const country = ((listing.countryName || '') + ' ' + (listing.destination || '') + ' ' + (listing.title || '')).toLowerCase();
                                  const target = subcategory.toLowerCase();
                                  if (!country.includes(target)) return false;
                                }
                              }

                              else if (category === 'trending') {
                                if (subcategory) {
                                  const dest = ((listing.countryName || '') + ' ' + (listing.stateName || '') + ' ' + (listing.title || '')).toLowerCase();
                                  if (subcategory === 'Baku' && !dest.includes('baku') && !dest.includes('azerbaijan')) return false;
                                  if (subcategory === 'Singapore' && !dest.includes('singapore')) return false;
                                  if (subcategory === 'Leh Ladakh' && !dest.includes('ladakh') && !dest.includes('leh')) return false;
                                  if (subcategory === 'Manali' && !dest.includes('manali')) return false;
                                } else {
                                  if (!listing.isTrending) return false;
                                }
                              }

                              else if (category === 'offers') {
                                const priceVal = parseFloat(listing.cost || listing.price || '0');
                                if (subcategory) {
                                  if (subcategory === '50% Off' && listing.discountCategory !== '50-off') return false;
                                  if (subcategory === '10% Off' && listing.discountCategory !== '10-off') return false;
                                  if (subcategory === 'Packages under 10K' && !(priceVal > 0 && priceVal < 10000)) return false;
                                  if (subcategory === 'Flash Deals' && listing.discountCategory !== 'flash-deals') return false;
                                } else {
                                  const hasOffer = (listing.discountCategory && listing.discountCategory !== 'none') || (priceVal > 0 && priceVal < 10000);
                                  if (!hasOffer) return false;
                                }
                              }

                              else if (category === 'seasons') {
                                if (subcategory) {
                                  const seasonVal = (listing.season || '').toLowerCase();
                                  if (subcategory === 'Summer Retreats' && seasonVal !== 'summer') return false;
                                  if (subcategory === 'Monsoon Magic' && seasonVal !== 'monsoon') return false;
                                  if (subcategory === 'Winter Wonderland' && seasonVal !== 'winter') return false;
                                  if (subcategory === 'Spring Getaways' && seasonVal !== 'spring') return false;
                                }
                              }

                              else if (category === 'events') {
                                if (subcategory) {
                                  const ev = (listing.eventType || '').toLowerCase();
                                  if (subcategory === 'New Year & Christmas' && ev !== 'new-year') return false;
                                  if (subcategory === 'Diwali Specials' && ev !== 'diwali') return false;
                                  if (subcategory === 'Summer Vacations' && ev !== 'summer-vacation') return false;
                                  if (subcategory === 'Long Weekend Escapes' && ev !== 'weekend') return false;
                                }
                              }

                              else if (category === 'experiences') {
                                if (subcategory) {
                                  let expArray: string[] = [];
                                  if (Array.isArray(listing.experienceType)) {
                                    expArray = listing.experienceType.map((e: any) => (e || '').toLowerCase());
                                  } else if (typeof listing.experienceType === 'string' && listing.experienceType) {
                                    expArray = [listing.experienceType.toLowerCase()];
                                  }

                                  if (subcategory === 'Trekking' && !expArray.includes('trekking')) return false;
                                  if (subcategory === 'Snow Enjoyment' && !expArray.includes('snow') && !expArray.includes('snow enjoyment')) return false;
                                  if (subcategory === 'Adventure' && !expArray.includes('adventure')) return false;
                                  if (subcategory === 'Water Sports' && !expArray.includes('water-sports') && !expArray.includes('water sports')) return false;
                                }
                              }
                            }

                            // 2. Apply search filter
                            if (searchTerm) {
                              const searchLower = searchTerm.toLowerCase();
                              const title = (listing.title || '').toLowerCase();
                              const description = (listing.description || '').toLowerCase();
                              const destination = (listing.destination || '').toLowerCase();
                              const stateName = (listing.stateName || '').toLowerCase();
                              const countryName = (listing.countryName || '').toLowerCase();
                              const stateNamesCombined = (listing.stateNames || []).map((s: string) => s.toLowerCase()).join(' ');
                              const countryNamesCombined = (listing.countryNames || []).map((c: string) => c.toLowerCase()).join(' ');
                              const packageType = (listing.packageType || '').toLowerCase();
                              const type = (listing.type || '').toLowerCase();
                              const price = (listing.price || listing.cost || '').toString().toLowerCase();
                              const duration = (listing.duration || '').toString().toLowerCase();
                              const itineraryDays = (listing.itinerary?.length || '').toString();
 
                              // Match dynamic card details
                              const pickup = (listing.placesCovered?.[0]?.name || listing.stateName || 'Delhi').toLowerCase();
                              const drop = (listing.placesCovered?.[listing.placesCovered.length - 1]?.name || listing.stateName || 'Delhi').toLowerCase();
                              const code = (listing.id ? listing.id.slice(-4) : '1045').toLowerCase();
                              const tourCats = (Array.isArray(listing.tourCategories) ? listing.tourCategories : typeof listing.tourCategories === 'string' ? [listing.tourCategories] : [])
                                .map((c: any) => String(c).toLowerCase()).join(' ');
                              const inclusions = (Array.isArray(listing.inclusions) ? listing.inclusions : typeof listing.inclusions === 'string' ? [listing.inclusions] : [])
                                .map((i: any) => String(i).toLowerCase()).join(' ');
                              const agencyName = (listing.agencyName || '').toLowerCase();
                              const places = (Array.isArray(listing.placesCovered) ? listing.placesCovered : [])
                                .map((p: any) => String(p?.name || '').toLowerCase()).join(' ');
                              const itineraryPlaces = (Array.isArray(listing.itinerary) ? listing.itinerary : [])
                                .map((d: any) => String(d?.placeName || '').toLowerCase()).join(' ');
 
                              const matches = 
                                isFuzzySearchMatch(searchLower, title) ||
                                isFuzzySearchMatch(searchLower, description) ||
                                isFuzzySearchMatch(searchLower, destination) ||
                                isFuzzySearchMatch(searchLower, stateName) ||
                                isFuzzySearchMatch(searchLower, countryName) ||
                                isFuzzySearchMatch(searchLower, stateNamesCombined) ||
                                isFuzzySearchMatch(searchLower, countryNamesCombined) ||
                                isFuzzySearchMatch(searchLower, packageType) ||
                                isFuzzySearchMatch(searchLower, type) ||
                                price.includes(searchLower) ||
                                duration.includes(searchLower) ||
                                itineraryDays.includes(searchLower) ||
                                isFuzzySearchMatch(searchLower, pickup) ||
                                isFuzzySearchMatch(searchLower, drop) ||
                                code.includes(searchLower) ||
                                isFuzzySearchMatch(searchLower, tourCats) ||
                                isFuzzySearchMatch(searchLower, inclusions) ||
                                isFuzzySearchMatch(searchLower, agencyName) ||
                                isFuzzySearchMatch(searchLower, places) ||
                                isFuzzySearchMatch(searchLower, itineraryPlaces);

                              if (!matches) {
                                return false;
                              }
                            }

                            // 3. Apply Advanced Filters (from FilterSidebar)
                            // A. Duration
                            if (advancedFilters.duration < 7) {
                              const listNights = parseInt(listing.duration) || (listing.itinerary && Array.isArray(listing.itinerary) ? listing.itinerary.length - 1 : 0);
                              if (listNights > advancedFilters.duration) return false;
                            }

                            // B. Budget & Budget Category
                            const rawPrice = (listing.cost || listing.price || '0').toString();
                            const cleanedPrice = rawPrice.replace(/[^0-9.]/g, '');
                            const priceVal = parseFloat(cleanedPrice || '0');
                            
                            if (advancedFilters.budget < 77000) {
                              if (priceVal > advancedFilters.budget) return false;
                            }
                            
                            if (advancedFilters.budgetCategory) {
                              if (advancedFilters.budgetCategory === '<10k' && priceVal >= 10000) return false;
                              if (advancedFilters.budgetCategory === '10k-15k' && (priceVal < 10000 || priceVal >= 15000)) return false;
                              if (advancedFilters.budgetCategory === '15k-20k' && (priceVal < 15000 || priceVal >= 20000)) return false;
                              if (advancedFilters.budgetCategory === '>20k' && priceVal <= 20000) return false;
                            }

                            // C. Hotel Category
                            if (advancedFilters.hotelCategory) {
                              const hotels = (Array.isArray(listing.hotelTypes) ? listing.hotelTypes : typeof listing.hotelTypes === 'string' ? [listing.hotelTypes] : []).map((h: any) => String(h).toLowerCase());
                              if (advancedFilters.hotelCategory === '<3') {
                                if (!hotels.some((h: any) => h.includes('1') || h.includes('2') || h.includes('hostel'))) return false;
                              } else if (advancedFilters.hotelCategory === '3') {
                                if (!hotels.some((h: any) => h.includes('3') || h.includes('three'))) return false;
                              } else if (advancedFilters.hotelCategory === '4') {
                                if (!hotels.some((h: any) => h.includes('4') || h.includes('four'))) return false;
                              } else if (advancedFilters.hotelCategory === '5') {
                                if (!hotels.some((h: any) => h.includes('5') || h.includes('five'))) return false;
                              }
                            }

                            return true;
                          });

                        if (filtered.length === 0) {
                          return (
                            <div className="col-span-full py-16 flex flex-col items-center justify-center bg-gray-50/50 rounded-3xl border border-gray-100 border-dashed">
                              <Search className="h-10 w-10 text-gray-400 mb-4" />
                              <h3 className="text-lg font-bold text-gray-800 mb-1">No packages match this filter</h3>
                              <p className="text-gray-500 text-sm text-center max-w-sm">
                                Try adjusting your filter category or searching for another destination!
                              </p>
                            </div>
                          );
                        }

                        return filtered.map((listing) => (
                          <ListingCard
                            key={listing.id}
                            listing={listing}
                            onView={setViewingListing}
                            onBook={startBooking}
                            onChat={handleInitiateChat}
                            onWishlist={handleWishlistToggle}
                            isWishlisted={wishlist.includes(listing.id)}
                            variant="user"
                          />
                        ));
                      })()}
                    </div>
                  )}

                </div>
              )}

              {showBookingForm && userActiveSection === 'listings' && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Calendar className="mr-2 h-5 w-5 text-blue-600" />
                      Book Your Trip - Step {bookingStep} of 4
                    </CardTitle>
                    <CardDescription>
                      {bookingListing?.title} • By {bookingListing?.agencyName}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Progress Indicator */}
                    <div className="flex items-center space-x-4 mb-6">
                      {[1, 2, 3, 4].map((step) => (
                        <div key={step} className="flex items-center">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${step <= bookingStep ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-500'
                            }`}>
                            {step}
                          </div>
                          {step < 4 && (
                            <div className={`w-12 h-1 mx-2 ${step < bookingStep ? 'bg-blue-500' : 'bg-gray-200'
                              }`} />
                          )}
                        </div>
                      ))}
                    </div>

                    {bookingStep === 1 && (
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold">Package Details</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="travelers">Number of Travelers</Label>
                            <select
                              id="travelers"
                              className="w-full p-2 border rounded-lg"
                              value={bookingData.travelers}
                              onChange={(e) => setBookingData({ ...bookingData, travelers: parseInt(e.target.value) })}
                            >
                              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                                <option key={num} value={num}>{num} {num === 1 ? 'Traveler' : 'Travelers'}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <Label htmlFor="travelDate">Preferred Travel Date</Label>
                            <Input
                              id="travelDate"
                              type="date"
                              value={bookingData.travelDate}
                              onChange={(e) => setBookingData({ ...bookingData, travelDate: e.target.value })}
                              min={new Date().toISOString().split('T')[0]}
                            />
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="specialRequests">Special Requests or Notes</Label>
                          <textarea
                            id="specialRequests"
                            className="w-full p-2 border rounded-lg"
                            rows={3}
                            value={bookingData.specialRequests}
                            onChange={(e) => setBookingData({ ...bookingData, specialRequests: e.target.value })}
                            placeholder="Any special requirements, dietary restrictions, or preferences..."
                          />
                        </div>
                      </div>
                    )}

                    {bookingStep === 2 && (
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold">Travel Preferences</h3>
                        <div className="space-y-3">
                          <Label>Select your interests (optional)</Label>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {['Adventure', 'Culture', 'Food', 'Relaxation', 'Shopping', 'Nightlife'].map(pref => (
                              <label key={pref} className="flex items-center space-x-2">
                                <input
                                  type="checkbox"
                                  checked={bookingData.preferences.includes(pref)}
                                  onChange={(e) => {
                                    const newPrefs = e.target.checked
                                      ? [...bookingData.preferences, pref]
                                      : bookingData.preferences.filter(p => p !== pref);
                                    setBookingData({ ...bookingData, preferences: newPrefs });
                                  }}
                                  className="rounded"
                                />
                                <span className="text-sm">{pref}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {bookingStep === 3 && (
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold">Contact Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="contactName">Full Name</Label>
                            <Input
                              id="contactName"
                              value={bookingData.contactName}
                              onChange={(e) => setBookingData({ ...bookingData, contactName: e.target.value })}
                              placeholder="Enter your full name"
                            />
                          </div>
                          <div>
                            <Label htmlFor="contactEmail">Email Address</Label>
                            <Input
                              id="contactEmail"
                              type="email"
                              value={bookingData.contactEmail}
                              onChange={(e) => setBookingData({ ...bookingData, contactEmail: e.target.value })}
                              placeholder="Enter your email"
                            />
                          </div>
                          <div className="md:col-span-2">
                            <Label htmlFor="contactPhone">Phone Number</Label>
                            <Input
                              id="contactPhone"
                              value={bookingData.contactPhone}
                              onChange={(e) => setBookingData({ ...bookingData, contactPhone: e.target.value })}
                              placeholder="Enter your phone number"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {bookingStep === 4 && (
                      <div className="space-y-6">
                        <h3 className="text-lg font-semibold">Booking Summary</h3>
                        <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                          <div className="flex justify-between">
                            <span>Package:</span>
                            <span className="font-semibold">{bookingListing?.title}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Package Type:</span>
                            <span className={`font-semibold ${bookingListing?.packageType === 'international' ? 'text-blue-600' : 'text-green-600'}`}>
                              {bookingListing?.packageType === 'international' ? 'International' : 'Domestic'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Travelers:</span>
                            <span>{bookingData.travelers}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Travel Date:</span>
                            <span>{bookingData.travelDate || 'Not specified'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Price per person:</span>
                            <span className="font-semibold">
                              {bookingListing?.packageType === 'international' ? '$' : '₹'}
                              {(bookingListing?.price || bookingListing?.cost || '0')}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Subtotal:</span>
                            <span className="font-semibold">
                              {bookingListing?.packageType === 'international' ? '$' : '₹'}
                              {((parseFloat(bookingListing?.price || bookingListing?.cost || '0') * bookingData.travelers)).toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Service Fee (5%):</span>
                            <span className="font-semibold">
                              {bookingListing?.packageType === 'international' ? '$' : '₹'}
                              {((parseFloat(bookingListing?.price || bookingListing?.cost || '0') * bookingData.travelers * 0.05)).toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between font-bold text-lg border-t pt-2">
                            <span>Total Amount:</span>
                            <span className="text-green-600 font-extrabold">
                              {bookingListing?.packageType === 'international' ? '$' : '₹'}
                              {((parseFloat(bookingListing?.price || bookingListing?.cost || '0') * bookingData.travelers * 1.05)).toFixed(2)}
                            </span>
                          </div>
                        </div>

                        {/* Additional User Features */}
                        <div className="space-y-4">
                          <h3 className="text-lg font-semibold">Additional Services</h3>

                          {/* Travel Insurance */}
                          <div className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="flex items-center space-x-3">
                              <input
                                type="checkbox"
                                checked={bookingData.insurance}
                                onChange={(e) => setBookingData({ ...bookingData, insurance: e.target.checked })}
                                className="h-4 w-4 text-blue-600"
                              />
                              <div>
                                <div className="font-medium">Travel Insurance</div>
                                <div className="text-sm text-gray-600">Covers medical emergencies and trip cancellations</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-semibold">
                                {bookingListing?.packageType === 'international' ? '$' : '₹'}{(bookingData.travelers * 50).toFixed(2)}
                              </div>
                              <div className="text-xs text-gray-500">One-time fee</div>
                            </div>
                          </div>

                          {/* Airport Transfer */}
                          <div className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="flex items-center space-x-3">
                              <input
                                type="checkbox"
                                checked={bookingData.paymentMethod === 'pay_later'}
                                onChange={(e) => setBookingData({ ...bookingData, paymentMethod: e.target.checked ? 'pay_later' : 'pay_now' })}
                                className="h-4 w-4 text-blue-600"
                              />
                              <div>
                                <div className="font-medium">Airport Transfer</div>
                                <div className="text-sm text-gray-600">Pickup and drop from airport</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-semibold">
                                {bookingListing?.packageType === 'international' ? '$' : '₹'}{(bookingData.travelers * 25).toFixed(2)}
                              </div>
                              <div className="text-xs text-gray-500">Round trip</div>
                            </div>
                          </div>

                          {/* Special Requirements */}
                          <div className="space-y-2">
                            <Label htmlFor="emergencyContact">Emergency Contact</Label>
                            <Input
                              id="emergencyContact"
                              placeholder="Emergency contact name and phone"
                              value={bookingData.emergencyContact}
                              onChange={(e) => setBookingData({ ...bookingData, emergencyContact: e.target.value })}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="dietaryRestrictions">Dietary Restrictions</Label>
                            <Input
                              id="dietaryRestrictions"
                              placeholder="Any dietary restrictions or allergies"
                              value={bookingData.dietaryRestrictions}
                              onChange={(e) => setBookingData({ ...bookingData, dietaryRestrictions: e.target.value })}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="accessibilityNeeds">Accessibility Needs</Label>
                            <Input
                              id="accessibilityNeeds"
                              placeholder="Any mobility or accessibility requirements"
                              value={bookingData.accessibilityNeeds}
                              onChange={(e) => setBookingData({ ...bookingData, accessibilityNeeds: e.target.value })}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="bookingNotes">Additional Notes</Label>
                            <textarea
                              id="bookingNotes"
                              className="w-full p-3 border rounded-lg"
                              rows={3}
                              placeholder="Any other special requests or information"
                              value={bookingData.bookingNotes}
                              onChange={(e) => setBookingData({ ...bookingData, bookingNotes: e.target.value })}
                            />
                          </div>
                        </div>

                        <div className="bg-blue-50 p-4 rounded-lg">
                          <h4 className="font-semibold text-blue-800 mb-2">Important Notes:</h4>
                          <ul className="text-sm text-blue-700 space-y-1">
                            <li>• Booking will be confirmed within 24 hours</li>
                            <li>• Payment details will be shared after confirmation</li>
                            <li>• You can modify or cancel your booking before payment</li>
                            <li>• Travel insurance covers medical emergencies up to $10,000</li>
                            <li>• Airport transfer available 24/7 with advance notice</li>
                          </ul>
                        </div>
                      </div>
                    )}

                    <div className="flex justify-between pt-4">
                      <Button
                        variant="outline"
                        onClick={prevBookingStep}
                        disabled={bookingStep === 1}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setShowBookingForm(false)}
                      >
                        Cancel
                      </Button>
                      {bookingStep < 4 ? (
                        <Button onClick={nextBookingStep}>
                          Next
                        </Button>
                      ) : (
                        <Button onClick={submitBooking} className="bg-green-600 hover:bg-green-700">
                          Confirm Booking
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {viewingListing && userActiveSection === 'listings' && !showComparison && (
                <PackageDetailView
                  listing={viewingListing}
                  onBack={() => setViewingListing(null)}
                  onBook={startBooking}
                  onChat={handleInitiateChat}
                  onWishlist={handleWishlistToggle}
                  isWishlisted={wishlist.includes(viewingListing.id)}
                  onRequireLogin={() => {
                    setAuthModalTab('login');
                    setShowAuthModal(true);
                  }}
                />
              )}

              {/* Package Comparison View */}
              {showComparison && userActiveSection === 'listings' && (
                <PackageComparison
                  listings={listings}
                  onBack={() => {
                    const returnUrl = sessionStorage.getItem('tripdm_return_url');
                    if (returnUrl) {
                      sessionStorage.removeItem('tripdm_return_url');
                      window.location.href = returnUrl;
                    } else {
                      setShowComparison(false);
                      setUserActiveSection('listings');
                      setDashboardViewMode('categories');
                      setSelectedCategoryFilter(null);
                    }
                  }}
                  onBrowsePackages={() => {
                    setShowComparison(false);
                    setUserActiveSection('listings');
                    setDashboardViewMode('categories');
                    setSelectedCategoryFilter(null);
                  }}
                  onChat={(agencyId: string, agencyName: string) => {
                    if (!user) {
                      sessionStorage.setItem('pending_chat_target', JSON.stringify({
                        agencyId,
                        agencyName,
                      }));
                      setAuthModalTab('login');
                      setShowAuthModal(true);
                      return;
                    }
                    setShowComparison(false);
                    setCurrentChatAgency(agencyId);
                    setCurrentChatAgencyName(agencyName);
                    const matchedConv = userConversations.find(c => c.agencyId === agencyId);
                    setCurrentChatAgencyIsOnline(matchedConv ? matchedConv.isOnline : false);
                    setUserActiveSection('chat');
                  }}
                  onView={(pkg) => {
                    setShowComparison(false);
                    const matchedListing = listings.find((l: any) => l.id === pkg.id);
                    const fullPkg = matchedListing ? { ...matchedListing, ...pkg } : pkg;
                    setViewingListing(fullPkg);
                  }}
                />
              )}

              {userActiveSection === 'bookings' && (
                <div className="min-h-screen bg-gray-50 -mx-6">
                  {/* Hero Banner for Bookings */}
                  <div className="w-full bg-gradient-to-r from-[#1C1F26] to-[#2B2F3A] py-12 px-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 opacity-5 pointer-events-none select-none"><Plane className="w-64 h-64" /></div>
                    <div className="absolute bottom-0 left-20 opacity-5 pointer-events-none select-none"><MapIcon className="w-52 h-52" /></div>
                    <div className="max-w-5xl mx-auto relative z-10">
                      <div className="inline-block bg-orange-500 text-white text-xs font-bold px-3 py-1 rounded mb-4 tracking-widest uppercase">My Travel History</div>
                      <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-3 tracking-tight">My Tours & Cancellations</h1>
                      <p className="text-gray-400 text-lg">Track your bookings, view itineraries, and manage your travel plans.</p>
                      {userBookings.length > 0 && (
                        <div className="flex gap-6 mt-6 flex-wrap">
                          <div className="bg-white/10 backdrop-blur-sm rounded-xl px-5 py-3 border border-white/10">
                            <div className="text-2xl font-bold text-white">{userBookings.length}</div>
                            <div className="text-xs text-gray-400 uppercase tracking-wider">Total Bookings</div>
                          </div>
                          <div className="bg-white/10 backdrop-blur-sm rounded-xl px-5 py-3 border border-white/10">
                            <div className="text-2xl font-bold text-green-400">{userBookings.filter((b: any) => b.status === 'confirmed').length}</div>
                            <div className="text-xs text-gray-400 uppercase tracking-wider">Confirmed</div>
                          </div>
                          <div className="bg-white/10 backdrop-blur-sm rounded-xl px-5 py-3 border border-white/10">
                            <div className="text-2xl font-bold text-yellow-400">{userBookings.filter((b: any) => b.status === 'pending').length}</div>
                            <div className="text-xs text-gray-400 uppercase tracking-wider">Pending</div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="max-w-5xl mx-auto px-4 py-10 space-y-6">
                    {userBookings.length === 0 ? (
                      <div className="bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden">
                        <div className="bg-gradient-to-r from-[#2B58C4] to-[#407BFF] h-2 w-full" />
                        <div className="p-16 text-center">
                          <div className="w-28 h-28 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl">
                            <Plane className="h-16 w-16 text-white" />
                          </div>
                          <h3 className="text-3xl font-extrabold text-gray-900 mb-3">No Trips Booked Yet</h3>
                          <p className="text-gray-500 text-lg max-w-md mx-auto mb-8 leading-relaxed">
                            Your travel adventures will appear here. Explore our amazing packages and book your first unforgettable trip!
                          </p>
                          <button
                            onClick={() => setUserActiveSection('listings')}
                            className="bg-[#FF9900] hover:bg-[#E68A00] text-white rounded-full px-10 py-4 text-lg font-bold shadow-xl transition-all duration-300 hover:-translate-y-1"
                          >
                            <span className="flex items-center justify-center gap-2"><Globe className="h-5 w-5" /> Explore Packages</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-5">
                        {userBookings.map((booking) => {
                          const isConfirmed = booking.status === 'confirmed';
                          const isPending = booking.status === 'pending';
                          const isCancelled = booking.status === 'cancelled';
                          const isIntl = booking.packageType === 'international';
                          const currency = isIntl ? '$' : '₹';
                          const totalAmt = typeof booking.totalAmount === 'number'
                            ? booking.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                            : parseFloat(booking.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

                          return (
                            <div key={booking.id} className={`rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 border ${isConfirmed ? 'border-green-200' : isPending ? 'border-amber-200' : 'border-red-200'
                              }`}>

                              {/* ── TICKET HEADER ── */}
                              <div className={`relative px-6 py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${isConfirmed
                                  ? 'bg-gradient-to-r from-[#0F4C35] to-[#1a6647]'
                                  : isPending
                                    ? 'bg-gradient-to-r from-[#7B4F00] to-[#A86800]'
                                    : 'bg-gradient-to-r from-[#6B1616] to-[#8B2020]'
                                }`}>
                                {/* Decorative circles (ticket punch) */}
                                <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 bg-gray-100 rounded-full hidden sm:block z-10" />
                                <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-6 h-6 bg-gray-100 rounded-full hidden sm:block z-10" />

                                <div className="flex items-center gap-4">
                                  <div className="w-14 h-14 rounded-xl bg-white/15 flex items-center justify-center text-3xl shadow-inner shrink-0">
                                    {isIntl ? <Globe className="h-7 w-7 text-white" /> : <Mountain className="h-7 w-7 text-white" />}
                                  </div>
                                  <div>
                                    <p className="text-white/60 text-xs font-semibold uppercase tracking-widest mb-0.5">{isIntl ? 'International Tour' : 'Domestic Tour'}</p>
                                    <h3 className="text-white font-extrabold text-xl leading-tight">{booking.listingTitle || 'Travel Package'}</h3>
                                    <p className="text-white/70 text-sm mt-0.5">by <span className="font-semibold text-white/90">{booking.agencyName}</span></p>
                                  </div>
                                </div>

                                <div className="flex flex-col items-start sm:items-end gap-2 shrink-0">
                                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest border ${isConfirmed ? 'bg-green-400/20 text-green-200 border-green-400/40' :
                                      isPending ? 'bg-amber-400/20 text-amber-200 border-amber-400/40' :
                                        'bg-red-400/20 text-red-200 border-red-400/40'
                                    }`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${isConfirmed ? 'bg-green-400' : isPending ? 'bg-amber-400' : 'bg-red-400'} animate-pulse`} />
                                    {isConfirmed ? 'Confirmed' : isPending ? 'Pending Review' : 'Cancelled'}
                                  </span>
                                  <span className="text-white/50 text-xs font-mono bg-white/10 px-2 py-0.5 rounded">
                                    #{booking.bookingReference}
                                  </span>
                                </div>
                              </div>

                              {/* ── TICKET BODY ── */}
                              <div className="bg-white">
                                {/* Dashed divider - ticket tear line */}
                                <div className="flex items-center px-4">
                                  <div className="w-5 h-5 rounded-full bg-gray-100 -ml-7 shrink-0 hidden sm:block border border-gray-200" />
                                  <div className="flex-1 border-t-2 border-dashed border-gray-200 mx-2" />
                                  <div className="w-5 h-5 rounded-full bg-gray-100 -mr-7 shrink-0 hidden sm:block border border-gray-200" />
                                </div>

                                {/* Key Details Row */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-gray-100 border-b border-gray-100">
                                  {[
                                    { label: 'DEPARTURE DATE', value: booking.travelDate || 'TBD', icon: <Calendar className="h-3.5 w-3.5" /> },
                                    { label: 'PASSENGERS', value: `${booking.travelers} ${booking.travelers === 1 ? 'Person' : 'People'}`, icon: <User className="h-3.5 w-3.5" /> },
                                    { label: 'TOTAL FARE', value: `${currency}${totalAmt}`, icon: <CreditCard className="h-3.5 w-3.5" />, green: true },
                                    { label: 'BOOKED ON', value: booking.createdAtFormatted || '—', icon: <Calendar className="h-3.5 w-3.5" /> },
                                  ].map((item, i) => (
                                    <div key={i} className="px-5 py-4">
                                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1 flex items-center gap-1">
                                        <span>{item.icon}</span> {item.label}
                                      </p>
                                      <p className={`font-bold text-sm ${item.green ? 'text-emerald-600' : 'text-gray-900'}`}>{item.value}</p>
                                    </div>
                                  ))}
                                </div>

                                {/* Passenger + Requests Row */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-0 divide-y sm:divide-y-0 sm:divide-x divide-gray-100 border-b border-gray-100">
                                  {/* Passenger Info */}
                                  <div className="px-6 py-5">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-1">
                                      <User className="h-3.5 w-3.5" /> Passenger Info
                                    </p>
                                    <div className="space-y-2.5">
                                      {[
                                        { label: 'Full Name', value: booking.userName },
                                        { label: 'Email', value: booking.userEmail },
                                        { label: 'Mobile', value: booking.userPhone },
                                      ].map((row, i) => (
                                        <div key={i} className="flex justify-between items-center text-sm">
                                          <span className="text-gray-400 font-medium w-20 shrink-0">{row.label}</span>
                                          <span className="text-gray-800 font-semibold text-right truncate ml-2">{row.value || '—'}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>

                                  {/* Status + Preferences */}
                                  <div className="px-6 py-5">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                                      <ClipboardList className="h-3.5 w-3.5" /> {isConfirmed ? 'Booking Status' : isPending ? 'Status Update' : 'Cancellation'}
                                    </p>
                                    {isConfirmed && (
                                      <div className="flex items-start gap-3">
                                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                                        </div>
                                        <div>
                                          <p className="text-green-700 font-bold text-sm">Booking Confirmed</p>
                                          <p className="text-gray-500 text-xs mt-0.5">Your spot is reserved. Check journey details below.</p>
                                        </div>
                                      </div>
                                    )}
                                    {isPending && (
                                      <div className="flex items-start gap-3">
                                        <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                                          <Clock className="h-5 w-5 text-amber-600" />
                                        </div>
                                        <div>
                                          <p className="text-amber-700 font-bold text-sm">Under Review by {booking.agencyName}</p>
                                          <p className="text-gray-500 text-xs mt-0.5">You'll be notified once confirmed.</p>
                                        </div>
                                      </div>
                                    )}
                                    {isCancelled && (
                                      <div className="flex items-start gap-3">
                                        <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                                          <XCircle className="h-5 w-5 text-red-600" />
                                        </div>
                                        <div>
                                          <p className="text-red-700 font-bold text-sm">Booking Cancelled</p>
                                          <p className="text-gray-500 text-xs mt-0.5">Contact {booking.agencyName} for refund info.</p>
                                        </div>
                                      </div>
                                    )}
                                    {booking.preferences && booking.preferences.length > 0 && (
                                      <div className="flex flex-wrap gap-1.5 mt-3">
                                        {booking.preferences.map((pref: string, idx: number) => (
                                          <span key={idx} className="bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full text-xs font-medium border border-gray-200">
                                            {pref}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Journey Preview for Confirmed */}
                                {isConfirmed && booking.journeyDetails && (
                                  <div className="border-b border-gray-100 bg-slate-50 px-6 py-4">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-1">
                                      <MapIcon className="h-3.5 w-3.5" /> Journey Preview
                                    </p>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                      {booking.journeyDetails.flight && (
                                        <div className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm">
                                          <p className="text-[10px] text-blue-500 font-bold uppercase tracking-wider mb-1 flex items-center gap-1"><Plane className="h-3 w-3" /> Flight</p>
                                          <p className="text-sm text-gray-700 font-medium">{booking.journeyDetails.flight}</p>
                                        </div>
                                      )}
                                      {booking.journeyDetails.hotel && (
                                        <div className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm">
                                          <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider mb-1 flex items-center gap-1"><Building className="h-3 w-3" /> Hotel</p>
                                          <p className="text-sm text-gray-700 font-medium">{booking.journeyDetails.hotel}</p>
                                        </div>
                                      )}
                                      {booking.journeyDetails.itinerary && (
                                        <div className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm">
                                          <p className="text-[10px] text-purple-500 font-bold uppercase tracking-wider mb-1 flex items-center gap-1"><ClipboardList className="h-3 w-3" /> Itinerary</p>
                                          <p className="text-sm text-gray-700 font-medium line-clamp-2">{booking.journeyDetails.itinerary}</p>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}

                                {/* ── ACTION BAR ── */}
                                <div className="px-6 py-4 bg-gray-50 flex flex-col sm:flex-row justify-between items-center gap-3">
                                  <p className="text-xs text-gray-400 font-mono">
                                    Booking Ref: <span className="text-gray-600 font-bold">{booking.bookingReference}</span>
                                  </p>
                                  <div className="flex gap-2 w-full sm:w-auto">
                                    {(isConfirmed || isPending) && (
                                      <button
                                        className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 bg-[#1C1F26] hover:bg-black text-white rounded-xl px-5 py-2.5 font-bold text-sm shadow-md transition-all hover:-translate-y-0.5"
                                        onClick={() => {
                                          setSelectedJourneyBooking(booking);
                                          setShowJourneyModal(true);
                                        }}
                                      >
                                        <ClipboardList className="h-4 w-4" /> View Details
                                      </button>
                                    )}
                                    {isConfirmed && (
                                      <button
                                        className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 border border-gray-300 bg-white hover:bg-gray-100 text-gray-705 rounded-xl px-5 py-2.5 font-semibold text-sm transition-all"
                                        onClick={() => window.print()}
                                      >
                                        <Info className="h-4 w-4" /> Print
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {userActiveSection === 'chat' && (
                !user ? (
                  <div className="min-h-[70vh] flex items-center justify-center p-6 bg-gray-50/50">
                    <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200 shadow-xl p-8 text-center space-y-5 animate-in fade-in duration-300">
                      <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-500 text-white rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-orange-500/20">
                        <MessageSquare className="w-8 h-8" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-black text-slate-900 tracking-tight">Login to Chat</h3>
                        <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                          Please log in or create an account to start chatting with verified travel agencies and receive personalized tour plans.
                        </p>
                      </div>
                      <div className="pt-2">
                        <button
                          onClick={() => {
                            setAuthModalTab('login');
                            setShowAuthModal(true);
                          }}
                          className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold py-3.5 px-6 rounded-xl shadow-md transition-all hover:scale-[1.02] cursor-pointer"
                        >
                          Sign In / Register
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                <div className="flex flex-col md:flex-row flex-1 min-h-0 min-w-0 w-full h-full bg-white overflow-hidden">
                  {/* Left Column: Conversations List */}
                  <div className={`w-full md:w-80 md:min-w-[20rem] md:max-w-[20rem] flex-shrink-0 border-r border-gray-200 bg-white flex flex-col h-full z-10 min-w-0 overflow-hidden ${currentChatAgency ? 'hidden md:flex' : 'flex'}`}>
                    {/* Sidebar Header */}
                    <div className="p-4 border-b border-gray-200 bg-white shrink-0">
                      <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                        <MessageSquare className="h-5 w-5 text-blue-600" /> Messages
                      </h3>
                      <p className="text-[10px] text-gray-450 mt-0.5">Agencies you've contacted</p>
                    </div>

                    {/* Search Bar */}
                    <div className="px-3.5 py-2.5 bg-white border-b border-gray-200/80 shrink-0">
                      <div className="relative flex items-center">
                        <Search className="absolute left-3 w-4 h-4 text-gray-400 pointer-events-none" />
                        <input
                          type="text"
                          placeholder="Search conversations..."
                          className="w-full pl-9 pr-8 py-1.5 h-9 rounded-full text-xs text-gray-800 border border-gray-200 bg-gray-50/80 focus:bg-white focus:outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 placeholder-gray-400 transition-all leading-normal"
                          value={chatSearchQuery}
                          onChange={(e) => setChatSearchQuery(e.target.value)}
                        />
                        {chatSearchQuery && (
                          <button
                            onClick={() => setChatSearchQuery('')}
                            className="absolute right-2.5 text-gray-400 hover:text-gray-600 p-0.5 rounded-full"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Scrollable Agency List */}
                    <div className="flex-1 p-3 space-y-2 sidebar-scroll">
                      {userConversations.filter(c => c.agencyName.toLowerCase().includes(chatSearchQuery.toLowerCase())).length === 0 ? (
                        <div className="text-center py-12">
                          <Building className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                          <p className="text-xs text-gray-400 font-semibold">No conversations found</p>
                          <p className="text-[10px] text-gray-400 mt-1 px-4">Contact an agency from a listing card to start chatting.</p>
                        </div>
                      ) : (
                        userConversations
                          .filter(c => c.agencyName.toLowerCase().includes(chatSearchQuery.toLowerCase()))
                          .map((conversation) => {
                            const isActive = currentChatAgency === conversation.agencyId;
                            const initials = conversation.agencyName ? conversation.agencyName.slice(0, 2).toUpperCase() : 'AG';
                            const formattedTime = formatConversationTime(conversation.lastMessageTime);
                            return (
                              <div
                                key={conversation.agencyId}
                                onClick={() => {
                                  setCurrentChatAgency(conversation.agencyId);
                                  setCurrentChatAgencyName(conversation.agencyName);
                                  setCurrentChatAgencyIsOnline(conversation.isOnline || false);
                                  setCurrentChatAgencyLogo(conversation.logoUrl || null);
                                  
                                  const unreadMsgs = chatMessages.filter(m => m.sender === conversation.agencyId && m.status !== 'read');
                                  unreadMsgs.forEach(async (m) => {
                                    try {
                                      const coll = m.isMobile ? 'chat_messages' : 'messages';
                                      await updateDoc(doc(getDbInstance()!, coll, m.id), { status: 'read' });
                                    } catch (e) {}
                                  });
                                }}
                                className={`p-3 rounded-xl cursor-pointer transition-all duration-150 flex items-center gap-3 ${
                                  isActive
                                    ? 'bg-[#f0f2f5] text-gray-900 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.04)]'
                                    : 'bg-transparent hover:bg-[#f5f6f6] text-gray-700'
                                }`}
                              >
                                {/* Avatar */}
                                <div className={`w-10 h-10 text-slate-700 bg-[#dfe5e7] rounded-full flex items-center justify-center font-bold text-xs shrink-0 shadow-xs relative overflow-visible`}>
                                  {conversation.logoUrl ? (
                                    <img src={conversation.logoUrl} alt={initials} className="w-full h-full object-cover rounded-full" />
                                  ) : (
                                    initials
                                  )}
                                  {conversation.isOnline && (
                                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full z-10" />
                                  )}
                                </div>
                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between mb-0.5">
                                    <span className="font-semibold text-xs text-gray-900 truncate pr-2">
                                      {conversation.agencyName}
                                    </span>
                                    {formattedTime && (
                                      <span className="text-[10px] text-gray-400 font-normal shrink-0">
                                        {formattedTime}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center justify-between gap-1">
                                    <p className="text-[11px] text-gray-500 truncate flex-1">
                                      {conversation.lastMessage || "No messages yet"}
                                    </p>
                                    {conversation.unreadCount > 0 && (
                                      <span className="bg-[#25D366] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 min-w-[18px] text-center">
                                        {conversation.unreadCount}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })
                      )}
                    </div>
                  </div>

                  {/* Right Column: Chat Content */}
                  <div className={`flex-1 flex flex-col h-full chat-travel-bg min-w-0 min-h-0 overflow-hidden ${!currentChatAgency ? 'hidden md:flex' : 'flex'}`}>
                    {currentChatAgency ? (
                      <div className="flex flex-col h-full relative min-w-0 min-h-0 overflow-hidden">
                        {/* Conversation Header */}
                        <div className="px-4 md:px-6 py-3 bg-[#f0f2f5] border-b border-gray-200 flex items-center justify-between z-10 shrink-0">
                          <div className="flex items-center gap-2 sm:gap-3">
                            {/* Mobile Back Button */}
                            <button
                              onClick={() => {
                                setCurrentChatAgency('');
                                setCurrentChatAgencyName('');
                                setCurrentChatAgencyIsOnline(false);
                                setCurrentChatAgencyLogo(null);
                                setShowInChatSearch(false);
                                setInChatSearchQuery('');
                              }}
                              className="md:hidden p-1.5 -ml-1 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-xl transition-colors flex items-center gap-1 font-semibold text-xs"
                              aria-label="Back to conversations"
                            >
                              <ChevronLeft className="h-4 w-4" />
                              <span className="hidden xs:inline">Back</span>
                            </button>

                            <div className="w-9 h-9 bg-[#dfe5e7] text-slate-700 rounded-full flex items-center justify-center font-bold text-xs shrink-0 relative">
                              {currentChatAgencyLogo ? (
                                <img src={currentChatAgencyLogo} alt={currentChatAgencyName || 'AG'} className="w-full h-full object-cover rounded-full" />
                              ) : (
                                currentChatAgencyName ? currentChatAgencyName.slice(0, 2).toUpperCase() : 'AG'
                              )}
                              {currentChatAgencyIsOnline && (
                                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full z-10" />
                              )}
                            </div>
                            <div>
                              <h4 className="font-bold text-xs text-gray-900 truncate max-w-[140px] sm:max-w-none">{currentChatAgencyName}</h4>
                              {currentChatAgencyIsOnline ? (
                                <span className="text-[9px] text-emerald-600 font-semibold flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                                  Online
                                </span>
                              ) : (
                                <span className="text-[9px] text-gray-500 font-medium flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
                                  Offline
                                </span>
                              )}
                            </div>
                          </div>
                          
                          {/* Header Actions: Search & Close */}
                          <div className="flex items-center gap-1">
                            <button 
                              onClick={() => {
                                setShowInChatSearch(prev => !prev);
                                if (showInChatSearch) setInChatSearchQuery('');
                              }}
                              className={`p-2 rounded-full transition-all flex items-center justify-center ${
                                showInChatSearch 
                                  ? 'bg-emerald-100 text-emerald-700' 
                                  : 'text-gray-500 hover:text-gray-800 hover:bg-gray-200/70'
                              }`}
                              title="Search in chat"
                              aria-label="Search messages"
                            >
                              <Search className="w-4 h-4" />
                            </button>
                            
                            <button 
                              onClick={() => {
                                setCurrentChatAgency('');
                                setCurrentChatAgencyName('');
                                setCurrentChatAgencyIsOnline(false);
                                setCurrentChatAgencyLogo(null);
                                setShowInChatSearch(false);
                                setInChatSearchQuery('');
                              }}
                              className="text-gray-400 hover:text-gray-700 p-2 hover:bg-gray-200/60 rounded-full transition-all flex items-center justify-center"
                              title="Close Chat"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Search in chat bar (slides down under header) */}
                        {showInChatSearch && (() => {
                          const currentConvMsgs = chatMessages
                            .filter(msg => (msg.sender === currentChatAgency && msg.receiverId === user?.uid) || (msg.sender === user?.uid && msg.receiverId === currentChatAgency))
                            .sort((a, b) => (Number(a.timestamp?.seconds ? a.timestamp.seconds * 1000 : a.timestamp) || 0) - (Number(b.timestamp?.seconds ? b.timestamp.seconds * 1000 : b.timestamp) || 0));
                          
                          const userSearchMatches = inChatSearchQuery.trim()
                            ? currentConvMsgs
                                .map((msg, idx) => ((msg.text || '').toLowerCase().includes(inChatSearchQuery.toLowerCase()) ? idx : -1))
                                .filter(idx => idx !== -1)
                            : [];

                          const jumpToMatch = (targetIdx: number) => {
                            if (userSearchMatches.length === 0) return;
                            const nextIndex = (targetIdx + userSearchMatches.length) % userSearchMatches.length;
                            setInChatSearchIndex(nextIndex);
                            const msgIdx = userSearchMatches[nextIndex];
                            const targetId = `user-msg-${currentConvMsgs[msgIdx]?.id || msgIdx}`;
                            const el = document.getElementById(targetId);
                            if (el) {
                              el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            }
                          };

                          return (
                            <div className="px-4 py-2 bg-[#f0f2f5] border-b border-gray-200 flex items-center gap-2 z-10 shrink-0">
                              <div className="relative flex-1 flex items-center">
                                <Search className="absolute left-3 w-4 h-4 text-gray-400 pointer-events-none" />
                                <input
                                  type="text"
                                  autoFocus
                                  value={inChatSearchQuery}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setInChatSearchQuery(val);
                                    setInChatSearchIndex(0);
                                    if (val.trim()) {
                                      const matches = currentConvMsgs
                                        .map((msg, idx) => ((msg.text || '').toLowerCase().includes(val.toLowerCase()) ? idx : -1))
                                        .filter(idx => idx !== -1);
                                      if (matches.length > 0) {
                                        const targetId = `user-msg-${currentConvMsgs[matches[0]]?.id || matches[0]}`;
                                        setTimeout(() => {
                                          const el = document.getElementById(targetId);
                                          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                        }, 40);
                                      }
                                    }
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      if (e.shiftKey) {
                                        jumpToMatch(inChatSearchIndex - 1);
                                      } else {
                                        jumpToMatch(inChatSearchIndex + 1);
                                      }
                                    } else if (e.key === 'Escape') {
                                      setShowInChatSearch(false);
                                      setInChatSearchQuery('');
                                    }
                                  }}
                                  placeholder="Search messages... (Enter for next, Shift+Enter for prev)"
                                  className="w-full pl-9 pr-8 py-1.5 bg-white text-xs text-gray-800 rounded-lg border border-gray-300 focus:outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 placeholder-gray-400"
                                />
                                {inChatSearchQuery && (
                                  <button
                                    onClick={() => {
                                      setInChatSearchQuery('');
                                      setInChatSearchIndex(0);
                                    }}
                                    className="absolute right-2.5 text-gray-400 hover:text-gray-600 p-0.5 rounded-full"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                              
                              {/* Match counter & Navigation Arrows */}
                              <div className="flex items-center gap-1 shrink-0 select-none">
                                <span className="text-[11px] text-gray-500 font-medium px-1.5 min-w-[45px] text-center">
                                  {userSearchMatches.length > 0 
                                    ? `${inChatSearchIndex + 1} of ${userSearchMatches.length}` 
                                    : inChatSearchQuery.trim() ? '0 of 0' : ''
                                  }
                                </span>
                                <button
                                  type="button"
                                  disabled={userSearchMatches.length <= 1}
                                  onClick={() => jumpToMatch(inChatSearchIndex - 1)}
                                  className="p-1 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-200/80 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                                  title="Previous match (Shift+Enter)"
                                >
                                  <ChevronUp className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  disabled={userSearchMatches.length <= 1}
                                  onClick={() => jumpToMatch(inChatSearchIndex + 1)}
                                  className="p-1 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-200/80 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                                  title="Next match (Enter)"
                                >
                                  <ChevronDown className="w-4 h-4" />
                                </button>
                              </div>

                              <button
                                onClick={() => {
                                  setShowInChatSearch(false);
                                  setInChatSearchQuery('');
                                  setInChatSearchIndex(0);
                                }}
                                className="text-gray-400 hover:text-gray-700 p-1.5 rounded-full hover:bg-gray-200 transition-colors"
                                title="Close search (Esc)"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          );
                        })()}

                        {/* Messages Area */}
                        <div className="flex-1 p-4 md:p-6 space-y-3 chat-scroll overflow-y-auto overflow-x-hidden min-w-0">
                          {(() => {
                            const filteredMsgs = [...chatMessages]
                              .filter(msg => (msg.sender === currentChatAgency && msg.receiverId === user?.uid) || (msg.sender === user?.uid && msg.receiverId === currentChatAgency))
                              .sort((a, b) => (Number(a.timestamp?.seconds ? a.timestamp.seconds * 1000 : a.timestamp) || 0) - (Number(b.timestamp?.seconds ? b.timestamp.seconds * 1000 : b.timestamp) || 0));

                            const userSearchMatches = inChatSearchQuery.trim()
                              ? filteredMsgs
                                  .map((msg, idx) => ((msg.text || '').toLowerCase().includes(inChatSearchQuery.toLowerCase()) ? idx : -1))
                                  .filter(idx => idx !== -1)
                              : [];

                            let lastDateDivider = '';

                            return filteredMsgs.map((msg, index) => {
                              const isSelf = msg.sender === user?.uid;
                              const dateDivider = formatChatDateDivider(msg.timestamp);
                              const showDivider = dateDivider && dateDivider !== lastDateDivider;
                              if (showDivider) {
                                lastDateDivider = dateDivider;
                              }

                              const isCurrentActiveMatch = userSearchMatches.length > 0 && userSearchMatches[inChatSearchIndex] === index;

                              const msgTimeStr = msg.timestamp 
                                ? (msg.timestamp?.seconds ? new Date(msg.timestamp.seconds * 1000) : new Date(msg.timestamp)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
                                : '';

                              return (
                                <React.Fragment key={msg.id || index}>
                                  {showDivider && (
                                    <div className="flex justify-center my-3 select-none">
                                      <span className="bg-white/90 backdrop-blur-xs text-gray-500 text-[11px] font-medium px-3 py-1 rounded-lg shadow-[0_1px_1px_rgba(0,0,0,0.06)] border border-gray-100">
                                        {dateDivider}
                                      </span>
                                    </div>
                                  )}
                                  <div 
                                    id={`user-msg-${msg.id || index}`}
                                    className={`flex ${isSelf ? 'justify-end' : 'justify-start'} transition-all duration-300 scroll-mt-24`}
                                  >
                                    <div 
                                      className={`max-w-[82%] sm:max-w-[70%] px-3 py-1.5 rounded-2xl shadow-[0_1px_0.5px_rgba(11,20,26,0.13)] transition-all duration-300 ${
                                        isCurrentActiveMatch ? 'ring-2 ring-emerald-500 shadow-[0_0_16px_rgba(16,185,129,0.4)] scale-[1.02]' : ''
                                      } ${
                                        isSelf 
                                          ? 'bg-[#d9fdd3] text-gray-900 rounded-tr-xs border border-[#c4ebb8]/40' 
                                          : 'bg-white text-gray-900 rounded-tl-xs border border-gray-100'
                                      }`}
                                    >
                                      <div className="text-[13px] leading-[1.4] text-gray-900 break-words select-text">
                                        <span className="inline">{highlightSearchMatch(msg.text, inChatSearchQuery, isCurrentActiveMatch)}</span>
                                        <span className="inline-flex items-center gap-1 float-right align-bottom ml-2.5 translate-y-0.5 select-none text-[10px] text-gray-500 font-normal">
                                          <span>{msgTimeStr}</span>
                                          {isSelf && (
                                            msg.status === 'read' ? (
                                              <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb] shrink-0" />
                                            ) : (
                                              <Check className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                            )
                                          )}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </React.Fragment>
                              );
                            });
                          })()}
                          <div ref={userChatEndRef} />
                        </div>

                        {/* Message Input Box & Quick Replies */}
                        <div className="bg-white flex flex-col shrink-0 min-w-0 w-full overflow-hidden">
                          {/* Quick Replies Carousel */}
                          {(() => {
                            const currentChatMsgs = chatMessages.filter(msg => msg.chatId === [user?.uid, currentChatAgency].sort().join('_'));
                            const mySentTexts = new Set(currentChatMsgs.filter(msg => msg.sender === user?.uid).map(msg => msg.text));
                            const baseBuyerReplies = [...BUYER_QUICK_REPLIES, ...adminBuyerReplies];
                            if (profilePhone) {
                              baseBuyerReplies.push(`Here is my contact number: ${profilePhone}`);
                            } else if (profileEmail) {
                              baseBuyerReplies.push(`Please contact me at ${profileEmail}`);
                            }
                            const availableBuyerReplies = baseBuyerReplies.filter(reply => !mySentTexts.has(reply));
                            
                            if (availableBuyerReplies.length === 0) return null;
                            return (
                              <div className="px-4 pt-2.5 pb-2 bg-[#f0f2f5] border-t border-gray-200/80 flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth w-full max-w-full min-w-0 shrink-0">
                                {availableBuyerReplies.map((reply, idx) => (
                                  <button
                                    key={idx}
                                    onClick={async () => {
                                      if (!user) return;
                                      const messageData = {
                                        from_user_id: user.uid,
                                        to_user_id: currentChatAgency,
                                        content: reply,
                                        timestamp: Date.now(),
                                        status: 'sent'
                                      };
                                      const dbInstance = getDbInstance();
                                      if (dbInstance) await addDoc(collection(dbInstance, 'chat_messages'), messageData);
                                    }}
                                    className="shrink-0 px-3 py-1.5 bg-white hover:bg-emerald-50 text-gray-700 hover:text-emerald-700 border border-gray-200 hover:border-emerald-300 text-xs rounded-full whitespace-nowrap transition-all shadow-2xs active:scale-95 font-medium"
                                  >
                                    {reply}
                                  </button>
                                ))}
                              </div>
                            );
                          })()}

                          <div className="px-4 py-2.5 bg-[#f0f2f5] border-t border-gray-200 flex items-center gap-2 relative shrink-0 w-full max-w-full min-w-0">
                            {/* Emoji Visual Indicator */}
                            <div className="relative shrink-0">
                              <button 
                                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                className="text-gray-500 hover:text-gray-700 transition-colors p-1.5 hover:bg-gray-200/60 rounded-full focus:outline-none flex items-center justify-center" 
                                title="Add Emoji"
                              >
                                <Smile className="h-5 w-5" />
                              </button>
                              
                              {showEmojiPicker && (
                                <div className="absolute bottom-12 left-0 bg-white border border-gray-200 rounded-2xl p-3 shadow-xl z-30 w-56 animate-in slide-in-from-bottom-2 duration-150">
                                  <div className="grid grid-cols-6 gap-1.5 max-h-32 overflow-y-auto">
                                    {['😊', '😂', '🤣', '👍', '❤️', '🔥', '✈️', '🏝️', '🗺️', '🏨', '🚗', '👏', '😍', '🎉', '🙌', '🙏', '✨', '🌍', '🌅', '🎒', '💬', '🎫', '🏝', '⛰', '🌟', '🛶', '🏄', '🏔', '⛺', '🧭'].map((emoji) => (
                                      <button
                                        key={emoji}
                                        onClick={() => {
                                          setChatInput((prev) => prev + emoji);
                                          setShowEmojiPicker(false);
                                        }}
                                        className="hover:bg-gray-100 p-1.5 rounded-lg text-lg transition-all active:scale-90 flex items-center justify-center"
                                      >
                                        {emoji}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                            <Input
                              value={chatInput}
                              onChange={(e) => setChatInput(e.target.value)}
                              placeholder="Type a message..."
                              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                              className="flex-1 rounded-full border border-gray-200 px-4 py-2 bg-white focus-visible:ring-1 focus-visible:ring-[#00a884] text-gray-900 text-xs h-10 shadow-2xs min-w-0"
                            />
                            
                            <button 
                              onClick={sendMessage} 
                              disabled={!chatInput.trim()}
                              className={`w-9 h-9 rounded-full flex items-center justify-center transition-all shrink-0 ${
                                chatInput.trim()
                                  ? 'bg-[#00a884] hover:bg-[#008f6f] text-white shadow-sm active:scale-95 cursor-pointer' 
                                  : 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
                              }`}
                              title="Send Message"
                            >
                              <Send className="w-4 h-4 ml-0.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-[#f0f2f5]">
                        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-6">
                          <Plane className="h-8 w-8 text-blue-600" />
                        </div>
                        <h4 className="font-extrabold text-gray-900 text-sm mb-2">Your Inbox</h4>
                        <p className="text-xs text-gray-500 max-w-sm leading-relaxed">
                          Select an agency from the sidebar list to discuss itineraries, pricing details, or get support.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                )
              )}

              {userActiveSection === 'wishlist' && (
                <WishlistView 
                  wishlist={wishlist}
                  listings={listings}
                  onWishlistToggle={handleWishlistToggle}
                  onView={(listing) => {
                    setViewingListing(listing);
                    setUserActiveSection('listings');
                  }}
                  onExplore={() => setUserActiveSection('listings')}
                  onBack={() => {
                    const returnUrl = sessionStorage.getItem('tripdm_return_url');
                    if (returnUrl) {
                      sessionStorage.removeItem('tripdm_return_url');
                      window.location.href = returnUrl;
                    } else {
                      setUserActiveSection(fromSection === 'wishlist' ? 'listings' : fromSection);
                    }
                  }}
                />
              )}

              {userActiveSection === 'profile' && (
                <UserProfile
                  user={user}
                  userData={userData}
                  wishlist={wishlist}
                  coTravellers={coTravellers}
                  setCoTravellers={setCoTravellers}
                  profileName={profileName}
                  setProfileName={setProfileName}
                  profilePhone={profilePhone}
                  setProfilePhone={setProfilePhone}
                  profilePhotoUrl={profilePhotoUrl}
                  handleProfilePhotoChange={handleProfilePhotoChange}
                  isEditingProfile={isEditingProfile}
                  setIsEditingProfile={setIsEditingProfile}
                  savingProfile={savingProfile}
                  handleSaveProfile={handleSaveProfile}
                  onNavigateToWishlist={() => {
                    setFromSection('profile');
                    setUserActiveSection('wishlist');
                  }}
                  onNavigateToCompare={() => {
                    setFromSection('profile');
                    setUserActiveSection('listings');
                    setShowComparison(true);
                  }}
                  onNavigateToChat={() => {
                    setFromSection('profile');
                    setUserActiveSection('chat');
                  }}
                />
              )}

              {userActiveSection === 'support' && (
                <div className="py-6 animate-in fade-in duration-200">
                  {/* HERO HEADER */}
                  <div className="bg-gradient-to-r from-blue-700 to-indigo-800 text-white rounded-3xl p-8 mb-8 shadow-lg relative overflow-hidden">
                    <div className="absolute right-10 bottom-0 opacity-10 pointer-events-none select-none"><Shield className="w-56 h-56" /></div>
                    <div className="relative z-10 max-w-2xl">
                      <div className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-sm text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full mb-4">
                        <Shield className="h-4 w-4 text-white" /> Platform Dispute Resolution Center
                      </div>
                      <h1 className="text-3xl md:text-4xl font-extrabold mb-3 tracking-tight">
                        Safe Travel Guarantee
                      </h1>
                      <p className="text-blue-100 text-sm md:text-base leading-relaxed opacity-90">
                        Our platform mediation team is here to assist you. If you face issues with a travel agency—such as payment disputes, lack of communication, or failure to deliver services—submit a ticket below and we will investigate immediately.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* LEFT COLUMN: TICKET SUBMISSION FORM */}
                    <div className="lg:col-span-2">
                      <Card className="bg-white border border-gray-200 shadow-md rounded-2xl p-6">
                        <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                          <Pencil className="h-5 w-5 text-blue-600" /> Submit a Dispute / Help Ticket
                        </h2>

                        <form onSubmit={submitSupportTicket} className="space-y-5">
                          {/* Booking Selector */}
                          <div>
                            <Label htmlFor="supportBooking" className="text-sm font-semibold text-gray-800">
                              Associated Booking / Transaction (Optional)
                            </Label>
                            <select
                              id="supportBooking"
                              value={supportBookingId}
                              onChange={(e) => setSupportBookingId(e.target.value)}
                              className="mt-1.5 block w-full p-3 border border-gray-200 bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-orange-400 rounded-xl text-sm font-medium transition-colors"
                            >
                              <option value="">-- No booking linked / General dispute --</option>
                              {userBookings.map((b: any) => (
                                <option key={b.id} value={b.id}>
                                  {b.listingTitle} • Ref: {b.bookingReference || b.id.slice(-6).toUpperCase()} • Date: {b.travelDate || 'TBD'}
                                </option>
                              ))}
                            </select>
                            <p className="text-xs text-gray-400 mt-1.5">
                              Linking a booking helps our team trace payment records and agency details automatically.
                            </p>
                          </div>

                          {/* Reason Selector */}
                          <div>
                            <Label htmlFor="supportReason" className="text-sm font-semibold text-gray-800">
                              Primary Reason for Dispute
                            </Label>
                            <select
                              id="supportReason"
                              value={supportReason}
                              onChange={(e) => setSupportReason(e.target.value)}
                              className="mt-1.5 block w-full p-3 border border-gray-200 bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-orange-400 rounded-xl text-sm font-medium transition-colors animate-none"
                            >
                              <option value="Agency is not responding after payment">Agency is not responding after payment</option>
                              <option value="Promised service/itinerary was not provided">Promised service/itinerary was not provided</option>
                              <option value="Travel dates changed without user consent">Travel dates changed without user consent</option>
                              <option value="Refund or booking cancellation issue">Refund or booking cancellation issue</option>
                              <option value="Other agency behavior dispute">Other agency behavior dispute</option>
                            </select>
                          </div>

                          {/* Subject */}
                          <div>
                            <Label htmlFor="supportSubject" className="text-sm font-semibold text-gray-800">
                              Subject
                            </Label>
                            <Input
                              id="supportSubject"
                              type="text"
                              placeholder="Brief summary of the issue (e.g., Paid ₹30,000 and agency stopped replying)"
                              value={supportSubject}
                              onChange={(e) => setSupportSubject(e.target.value)}
                              className="mt-1.5 w-full p-3 border border-gray-200 rounded-xl text-sm"
                              required
                            />
                          </div>

                          {/* Detailed Description */}
                          <div>
                            <Label htmlFor="supportDesc" className="text-sm font-semibold text-gray-800">
                              Detailed Description
                            </Label>
                            <textarea
                              id="supportDesc"
                              rows={5}
                              placeholder="Please provide full details of your interaction, including dates, agreed pricing, amount paid, and what exactly went wrong. Our team will read this description to start investigation."
                              value={supportDescription}
                              onChange={(e) => setSupportDescription(e.target.value)}
                              className="mt-1.5 block w-full p-3 border border-gray-200 focus:bg-white focus:ring-2 focus:ring-orange-400 rounded-xl text-sm transition-colors"
                              required
                            />
                          </div>

                          {/* Submit Button */}
                          <div className="pt-2">
                            <Button
                              type="submit"
                              disabled={submittingSupportTicket}
                              className="w-full sm:w-auto px-6 py-2.5 bg-orange-400 hover:bg-orange-500 text-white font-bold rounded-xl shadow-md transition-colors border-none cursor-pointer"
                            >
                              {submittingSupportTicket ? 'Submitting Ticket...' : 'Submit Support Ticket'}
                            </Button>
                          </div>
                        </form>
                      </Card>
                    </div>

                    {/* RIGHT COLUMN: MEDIATION POLICY / DISPUTE HISTORY */}
                    <div className="lg:col-span-1 space-y-6">
                      {/* PLATFORM PROTECTION CARD */}
                      <Card className="bg-white border border-gray-200 shadow-md rounded-2xl p-5">
                        <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-1.5">
                          <Shield className="h-5 w-5 text-blue-500" /> Platform Protection Policy
                        </h3>
                        <ul className="space-y-4 text-xs text-gray-600">
                          <li className="flex gap-2">
                            <span className="text-blue-500 font-bold">1.</span>
                            <div>
                              <strong className="text-gray-800 block">Strict Agency Verification</strong>
                              All registered agencies go through background documentation checks before listing packages.
                            </div>
                          </li>
                          <li className="flex gap-2">
                            <span className="text-blue-500 font-bold">2.</span>
                            <div>
                              <strong className="text-gray-800 block">24-Hour Investigation</strong>
                              Once a ticket is submitted, platform admins review transaction logs and contact the agency within 24 hours.
                            </div>
                          </li>
                          <li className="flex gap-2">
                            <span className="text-blue-500 font-bold">3.</span>
                            <div>
                              <strong className="text-gray-800 block">Fair Dispute Resolution</strong>
                              If an agency violates terms or defrauds users, their listings are suspended, and details are shared to assist in refund recoveries.
                            </div>
                          </li>
                        </ul>
                      </Card>

                      {/* MY TICKETS LIST */}
                      <Card className="bg-white border border-gray-200 shadow-md rounded-2xl p-5">
                        <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-1.5">
                          <ClipboardList className="h-5 w-5 text-blue-600" /> Dispute Tickets History ({supportTickets.length})
                        </h3>

                        {supportTickets.length === 0 ? (
                          <div className="text-center py-6 text-gray-405 text-xs italic bg-gray-50 rounded-xl border border-dashed border-gray-200">
                            No support tickets submitted yet.
                          </div>
                        ) : (
                          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                            {supportTickets.map((ticket) => (
                              <div key={ticket.id} className="p-3 border border-gray-150 rounded-xl hover:bg-gray-50/50 transition-colors text-xs space-y-2">
                                <div className="flex justify-between items-start">
                                  <span className="font-bold text-gray-800 truncate max-w-[120px]" title={ticket.subject}>
                                    {ticket.subject}
                                  </span>
                                  <Badge
                                    className={`
                                      ${ticket.status === 'pending' ? 'bg-yellow-50 text-yellow-750 border-yellow-200 hover:bg-yellow-50' : ''}
                                      ${ticket.status === 'in-review' ? 'bg-blue-50 text-blue-750 border-blue-200 hover:bg-blue-50' : ''}
                                      ${ticket.status === 'resolved' ? 'bg-emerald-50 text-emerald-755 border-emerald-200 hover:bg-emerald-50' : ''}
                                      border px-1.5 py-0 rounded text-[9px] font-bold uppercase
                                    `}
                                  >
                                    {ticket.status}
                                  </Badge>
                                </div>
                                <p className="text-[10px] text-gray-500 line-clamp-2">
                                  {ticket.description}
                                </p>
                                <div className="flex justify-between text-[9px] text-gray-400 border-t pt-1.5 mt-1 border-gray-100">
                                  <span>ID: {ticket.id.slice(-6).toUpperCase()}</span>
                                  <span>{ticket.createdAtFormatted || 'Just now'}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </Card>
                    </div>
                  </div>
                </div>
              )}
            </main>
            {userActiveSection !== 'chat' && userActiveSection !== 'wishlist' && userActiveSection !== 'profile' && !showComparison && userActiveSection !== 'comparison' && (
              <Footer onNavigate={(section) => {
                if ((section === 'chat' || section === 'messages') && !user) {
                  setAuthModalTab('login');
                  setShowAuthModal(true);
                  return;
                }
                setUserActiveSection(section);
              }} />
            )}
          </div>

          {/* Standard Bottom Compare Dock */}
          {comparisonList.length > 0 && !showComparison && !viewingListing && userActiveSection === 'listings' && (
            <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 shadow-[0_-4px_25px_rgba(0,0,0,0.12)] animate-in slide-in-from-bottom duration-300">
              <div className="max-w-7xl mx-auto px-4 py-2.5 sm:py-3 flex items-center justify-between gap-3 sm:gap-6">
                
                {/* Left: Info & Clear All */}
                <div className="flex items-center gap-3 shrink-0">
                  <div className="w-9 h-9 rounded-lg bg-orange-50 border border-orange-200/70 flex items-center justify-center text-orange-600 shrink-0">
                    <Scale className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs sm:text-sm font-bold text-slate-900">
                        Compare Packages
                      </span>
                      <span className="bg-orange-100 text-orange-700 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                        {comparisonList.length}/3
                      </span>
                    </div>
                    <button
                      onClick={clearComparison}
                      className="text-[11px] text-slate-400 hover:text-rose-600 transition-colors font-medium cursor-pointer underline"
                    >
                      Clear all
                    </button>
                  </div>
                </div>

                {/* Middle: Selected Package Chips */}
                <div className="hidden sm:flex items-center gap-2.5 flex-1 max-w-2xl overflow-x-auto no-scrollbar py-0.5">
                  {comparisonList.map((pkg) => {
                    const imgUrl = (pkg.photos && pkg.photos[0]) || (pkg as any).coverImage || (pkg as any).imageUrls?.[0] || '';
                    return (
                      <div
                        key={pkg.id}
                        className="flex items-center gap-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg p-1.5 pr-2.5 shrink-0 transition-colors group relative"
                      >
                        {imgUrl ? (
                          <img
                            src={imgUrl}
                            alt={pkg.title}
                            className="w-8 h-8 rounded object-cover shrink-0 bg-slate-200"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                          />
                        ) : (
                          <div className="w-8 h-8 rounded bg-slate-200 flex items-center justify-center text-slate-400 shrink-0">
                            <Scale className="h-4 w-4" />
                          </div>
                        )}
                        <div className="flex flex-col min-w-0 max-w-[130px] md:max-w-[170px]">
                          <span className="text-[11px] font-semibold text-slate-800 truncate leading-tight" title={pkg.title}>
                            {pkg.title}
                          </span>
                          <span className="text-[10px] text-slate-500 truncate">
                            {pkg.duration ? `${pkg.duration}D` : ''} {pkg.price || pkg.cost ? `• ₹${pkg.price || pkg.cost}` : ''}
                          </span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFromComparison(pkg.id);
                          }}
                          className="text-slate-400 hover:text-rose-600 p-0.5 rounded-full hover:bg-white transition-colors cursor-pointer ml-1"
                          title="Remove from comparison"
                          aria-label={`Remove ${pkg.title}`}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    );
                  })}

                  {/* Empty slots placeholders */}
                  {Array.from({ length: 3 - comparisonList.length }).map((_, i) => (
                    <div
                      key={`empty-${i}`}
                      className="hidden md:flex items-center gap-1.5 border border-dashed border-slate-200 rounded-lg px-3 py-2 text-[11px] text-slate-400 shrink-0 select-none bg-slate-50/40"
                    >
                      <Plus className="h-3 w-3" />
                      <span>Add package</span>
                    </div>
                  ))}
                </div>

                {/* Right: Compare Now Button */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => {
                      setUserActiveSection('listings');
                      setShowComparison(true);
                    }}
                    className="bg-[#b84814] hover:bg-[#963b10] text-white font-bold text-xs sm:text-sm px-4 sm:px-6 py-2.5 rounded-lg shadow-sm transition-all active:scale-95 cursor-pointer flex items-center gap-1.5 sm:gap-2"
                  >
                    <span>Compare Now</span>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>

              </div>
            </div>
          )}

          {/* Journey Details Modal */}
          {showJourneyModal && selectedJourneyBooking && (
            <JourneyDetailsModal
              booking={selectedJourneyBooking}
              onClose={() => {
                setShowJourneyModal(false);
                setSelectedJourneyBooking(null);
              }}
            />
          )}

          {/* Review Modal */}
          {showReviewModal && reviewListing && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <Card className="w-full max-w-2xl mx-4">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Star className="mr-2 h-6 w-6 text-yellow-500 fill-yellow-500" />
                    Write a Review for {reviewListing.title}
                  </CardTitle>
                  <CardDescription>
                    Share your experience to help other travelers
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Rating */}
                  <div>
                    <Label className="text-base font-medium">Your Rating</Label>
                    <div className="flex gap-1 mt-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          onClick={() => setNewReview({ ...newReview, rating: star })}
                          className={`p-1 ${newReview.rating >= star ? 'text-yellow-500' : 'text-gray-300'}`}
                        >
                          <Star className={`h-8 w-8 ${newReview.rating >= star ? 'fill-yellow-500 text-yellow-500' : 'text-gray-300'}`} />
                        </button>
                      ))}
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {newReview.rating === 0 ? 'Select a rating' :
                        newReview.rating === 1 ? 'Poor' :
                          newReview.rating === 2 ? 'Fair' :
                            newReview.rating === 3 ? 'Good' :
                              newReview.rating === 4 ? 'Very Good' : 'Excellent'}
                    </p>
                  </div>

                  {/* Review Text */}
                  <div>
                    <Label htmlFor="reviewComment">Your Review</Label>
                    <textarea
                      id="reviewComment"
                      className="w-full p-3 border rounded-lg mt-1"
                      rows={4}
                      value={newReview.comment}
                      onChange={(e) => setNewReview({ ...newReview, comment: e.target.value })}
                      placeholder="Tell others about your experience..."
                    />
                  </div>

                  {/* Photo Upload */}
                  <div>
                    <Label htmlFor="reviewPhotos">Add Photos (Optional)</Label>
                    <Input
                      id="reviewPhotos"
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={(e) => {
                        console.log('Photos selected:', e.target.files);
                      }}
                      className="mt-1"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Share photos from your trip to help others visualize the experience
                    </p>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button
                      onClick={() => {
                        alert('Review submitted successfully!');
                        setShowReviewModal(false);
                        setNewReview({ listingId: '', rating: 5, comment: '', photos: [] });
                        setReviewListing(null);
                      }}
                      disabled={newReview.rating === 0 || !newReview.comment.trim()}
                      className="flex-1"
                    >
                      Submit Review
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowReviewModal(false);
                        setNewReview({ listingId: '', rating: 5, comment: '', photos: [] });
                        setReviewListing(null);
                      }}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Pincode Change Modal Removed */}

          {/* ── REDESIGNED PREMIUM UNLOCK CHAT CONVERSATION MODAL ── */}
          {showUnlockModal && chatUnlockTarget && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
              <Card className="max-w-md w-full bg-white shadow-2xl rounded-3xl border border-gray-150 overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Visual Premium Header */}
                <div className="bg-gradient-to-r from-blue-700 to-indigo-800 p-6 text-white relative">
                  <div className="absolute top-6 right-6 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/20">
                    Verified Agent
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-white text-blue-700 rounded-2xl flex items-center justify-center shadow-md">
                      <Building className="h-8 w-8 text-blue-700" />
                    </div>
                    <div>
                      <h3 className="text-xl font-extrabold tracking-tight">{chatUnlockTarget.agencyName}</h3>
                      <p className="text-xs text-blue-200 mt-0.5">Connect and discuss "{chatUnlockTarget.packageTitle}"</p>
                    </div>
                  </div>
                </div>

                <div className="p-6 space-y-6">
                  {/* Explanation and Features List */}
                  <div className="space-y-3">
                    <p className="text-sm text-gray-705 font-bold leading-relaxed">
                      Unlock direct messaging and customized itineraries:
                    </p>
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div className="flex items-center gap-2 text-xs text-gray-650 bg-gray-50 border p-2.5 rounded-xl">
                        <MessageSquare className="h-5 w-5 text-blue-500" />
                        <div>
                          <p className="font-bold text-gray-900 leading-tight">Direct Chat</p>
                          <p className="text-[9px] text-gray-505 mt-0.5">Unlimited messaging</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-650 bg-gray-50 border p-2.5 rounded-xl">
                        <ClipboardList className="h-5 w-5 text-blue-500" />
                        <div>
                          <p className="font-bold text-gray-900 leading-tight">Custom Quotes</p>
                          <p className="text-[9px] text-gray-505 mt-0.5">Personalized plans</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-650 bg-gray-50 border p-2.5 rounded-xl">
                        <Phone className="h-5 w-5 text-blue-500" />
                        <div>
                          <p className="font-bold text-gray-900 leading-tight">Direct Call</p>
                          <p className="text-[9px] text-gray-505 mt-0.5">Callbacks enabled</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-650 bg-gray-50 border p-2.5 rounded-xl">
                        <Sparkles className="h-5 w-5 text-blue-500" />
                        <div>
                          <p className="font-bold text-gray-900 leading-tight">Mediation Help</p>
                          <p className="text-[9px] text-gray-505 mt-0.5">100% Secure & safe</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Transaction Box */}
                  <div className="bg-slate-50 border border-slate-150 rounded-2xl p-4 space-y-4">
                    <div className="flex justify-between items-center text-[10px] font-bold uppercase text-gray-400 tracking-wider">
                      <span>Connection Details</span>
                      <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md text-[9px]">
                        Plan: {userData?.plan || 'Free'}
                      </span>
                    </div>

                    {/* Visual credit deduction flow */}
                    <div className="flex items-center justify-between gap-4 py-1">
                      <div className="text-center flex-1">
                        <span className="text-[9px] text-gray-455 font-bold uppercase tracking-wider">Your Balance</span>
                        <div className="text-lg font-black text-gray-800 mt-0.5">
                          {userData?.plan === 'starter' && `${userData?.credits ?? 0}`}
                          {userData?.plan === 'premium' && `${userData?.freeChats ?? 0}`}
                          {(userData?.plan === 'free' || !userData?.plan) && `${userData?.freeChats ?? 0}`}
                        </div>
                        <span className="text-[9px] text-gray-505 font-medium">
                          {userData?.plan === 'starter' ? 'Credits' : 'Free Chats'}
                        </span>
                      </div>

                      <div className="flex flex-col items-center">
                        <span className="text-[9px] text-blue-600 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-full font-black">
                          -{userData?.plan === 'starter' ? '200' : '1'}
                        </span>
                        <span className="text-sm text-blue-600 mt-0.5">➔</span>
                      </div>

                      <div className="text-center flex-1">
                        <span className="text-[9px] text-gray-450 font-bold uppercase tracking-wider">After Unlock</span>
                        <div className="text-lg font-black text-blue-600 mt-0.5">
                          {userData?.plan === 'starter' && `${Math.max(0, (userData?.credits ?? 0) - 200)}`}
                          {userData?.plan === 'premium' && `${Math.max(0, (userData?.freeChats ?? 0) - 1)}`}
                          {(userData?.plan === 'free' || !userData?.plan) && `${Math.max(0, (userData?.freeChats ?? 0) - 1)}`}
                        </div>
                        <span className="text-[9px] text-gray-500 font-medium">
                          {userData?.plan === 'starter' ? 'Credits left' : 'Free Chats left'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Check if user has sufficient credits */}
                  {((userData?.plan === 'starter' && (userData?.credits ?? 0) < 200) ||
                    (userData?.plan === 'premium' && (userData?.freeChats ?? 0) <= 0 && (userData?.credits ?? 0) < 150) ||
                    ((userData?.plan === 'free' || !userData?.plan) && (userData?.freeChats ?? 0) <= 0)) ? (

                    <div className="bg-red-50 text-red-800 border border-red-150 rounded-2xl p-4 flex items-start gap-3 shadow-sm">
                      <AlertCircle className="h-5 w-5 text-amber-500 shrink-0" />
                      <div className="text-xs">
                        <p className="font-extrabold text-red-905">Insufficient Balance</p>
                        <p className="text-red-750 mt-1 leading-relaxed">
                          You need at least {userData?.plan === 'starter' ? '200 Credits' : '1 Free Chat'} to connect with this agency. Top up credits or change plans to continue.
                        </p>
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="p-4 bg-gray-50 border-t flex flex-row gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setShowUnlockModal(false)}
                    className="flex-1 rounded-xl text-xs font-bold border-gray-300 py-3.5 text-gray-700 bg-white hover:bg-gray-100 transition-all border"
                  >
                    Cancel
                  </Button>

                  {((userData?.plan === 'starter' && (userData?.credits ?? 0) < 200) ||
                    (userData?.plan === 'premium' && (userData?.freeChats ?? 0) <= 0 && (userData?.credits ?? 0) < 150) ||
                    ((userData?.plan === 'free' || !userData?.plan) && (userData?.freeChats ?? 0) <= 0)) ? (

                    <Button
                      onClick={() => {
                        setShowUnlockModal(false);
                        setProfileTab('credits');
                        setUserActiveSection('profile');
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="flex-1 bg-gradient-to-r from-orange-500 to-amber-600 text-white rounded-xl text-xs font-bold border-none transition-all hover:scale-[1.02] active:scale-[0.98] shadow-md cursor-pointer"
                    >
                      Top Up / Upgrade Plan
                    </Button>
                  ) : (
                    <Button
                      onClick={() => unlockCustomerChat(chatUnlockTarget.agencyId, chatUnlockTarget.agencyName)}
                      className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white rounded-xl text-xs font-extrabold border-none transition-all hover:scale-[1.02] active:scale-[0.98] shadow-md cursor-pointer"
                    >
                      <span className="flex items-center justify-center gap-2">Confirm & Connect <Sparkles className="h-4 w-4" /></span>
                    </Button>
                  )}
                </div>
              </Card>
            </div>
          )}

          {/* ── TRANSACTION LOADING MODAL ── */}
          {isPurchasingCredits && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
              <Card className="max-w-xs w-full bg-white shadow-2xl rounded-3xl border border-gray-150 p-8 text-center animate-in zoom-in-95 duration-150">
                <div className="relative w-16 h-16 mx-auto mb-6">
                  <div className="w-16 h-16 rounded-full border-4 border-blue-100 border-t-blue-600 animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <CreditCard className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
                <h4 className="font-extrabold text-gray-905 mb-2">Secure Checkout</h4>
                <p className="text-xs text-gray-505 font-medium leading-relaxed">
                  {purchaseStatusText}
                </p>
                <p className="text-[10px] text-gray-405 font-semibold tracking-wider uppercase mt-6 border-t pt-4">
                  Do not close this window
                </p>
              </Card>
            </div>
          )}

          {/* Premium Custom Toast Notification */}
          {toast && (
            <div className="fixed bottom-6 right-6 z-[200] animate-in slide-in-from-bottom-5 fade-in duration-300">
              <div className={`flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl border backdrop-blur-md transition-all duration-300 ${toast.type === 'success' ? 'bg-emerald-50/90 border-emerald-200 text-emerald-900 shadow-emerald-100/50' :
                  toast.type === 'error' ? 'bg-rose-50/90 border-rose-200 text-rose-900 shadow-rose-100/50' :
                    'bg-sky-50/90 border-sky-200 text-sky-900 shadow-sky-100/50'
                }`}>
                <span className="flex items-center justify-center">
                  {toast.type === 'success' && <CheckCircle className="h-5 w-5 text-emerald-600" />}
                  {toast.type === 'error' && <AlertCircle className="h-5 w-5 text-rose-600" />}
                  {toast.type === 'info' && <Info className="h-5 w-5 text-sky-600" />}
                </span>
                <div className="text-xs font-bold tracking-wide">
                  {toast.message}
                </div>
                <button
                  onClick={() => setToast(null)}
                  className="text-gray-400 hover:text-gray-650 transition-colors ml-2 font-bold focus:outline-none"
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          {/* Auth Modal overlay for User Dashboard */}
          <AuthModal
            isOpen={showAuthModal}
            onClose={() => setShowAuthModal(false)}
            initialTab={authModalTab}
            onLogin={signIn}
            onRegister={handleAuthModalRegister}
            onGoogleSignIn={signInWithGoogle}
            googleUser={user}
          />
        </div>
      );
    }

  // Agency Dashboard — render when on agency portal route OR when user has agency role and not on user route
  if ((routeMode === 'agency' && user) || (user && userData?.role === 'agency' && routeMode !== 'user')) {
    return (
        <div className="flex h-screen bg-gray-50 overflow-hidden font-sans">
          <div className={`w-64 bg-white border-r border-gray-200 flex flex-col z-20 shrink-0 ${agencyActiveSection === 'chat' ? 'hidden' : ''}`}>
            <div className="p-6 border-b border-gray-200 flex flex-col items-center text-center shrink-0">
              <div className="w-28 h-20 flex items-center justify-center mb-3 shrink-0">
                {(agencyLogoUrl || userData?.logoUrl || userData?.agencyLogo) ? (
                  <img
                    src={agencyLogoUrl || userData?.logoUrl || userData?.agencyLogo}
                    alt={userData?.companyName || 'Agency Logo'}
                    className="max-h-20 max-w-[140px] object-contain"
                    onError={() => setAgencyLogoError(true)}
                  />
                ) : (
                  <Building2 className="h-10 w-10 text-orange-500" />
                )}
              </div>
              <div className="w-full">
                <h2 className="text-base font-bold text-gray-900 truncate">{userData?.companyName || 'Travel Agency'}</h2>
                <p className="text-xs text-gray-500 mt-0.5 truncate">{userData?.companyName ? 'Travel Agency Partner' : 'Registered Agency'}</p>
              </div>
            </div>
            
            <nav className="p-4 flex-1 overflow-y-auto sidebar-scroll">
              <div className="space-y-1">
                <button
                  onClick={() => setAgencyActiveSection('listings')}
                  className={`w-full text-left px-3.5 py-2.5 rounded-md text-sm font-semibold transition-all duration-200 flex items-center gap-3 cursor-pointer ${
                    agencyActiveSection === 'listings'
                      ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/25 border border-amber-400/50 scale-[1.01]'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-transparent hover:border-slate-200/50'
                  }`}
                  style={{ borderRadius: '6px' }}
                >
                  <ClipboardList className={`h-4 w-4 ${agencyActiveSection === 'listings' ? 'text-white' : 'text-slate-500'}`} />
                  <span>Listings</span>
                </button>

                <button
                  onClick={() => setAgencyActiveSection('chat')}
                  className={`w-full text-left px-3.5 py-2.5 rounded-md text-sm font-semibold transition-all duration-200 flex items-center gap-3 cursor-pointer ${
                    agencyActiveSection === 'chat'
                      ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/25 border border-amber-400/50 scale-[1.01]'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-transparent hover:border-slate-200/50'
                  }`}
                  style={{ borderRadius: '6px' }}
                >
                  <MessageSquare className={`h-4 w-4 ${agencyActiveSection === 'chat' ? 'text-white' : 'text-slate-500'}`} />
                  <span>Customer Chat</span>
                </button>

                <button
                  onClick={() => setAgencyActiveSection('credits')}
                  className={`w-full text-left px-3.5 py-2.5 rounded-md text-sm font-semibold transition-all duration-200 flex items-center gap-3 cursor-pointer ${
                    agencyActiveSection === 'credits'
                      ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/25 border border-amber-400/50 scale-[1.01]'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-transparent hover:border-slate-200/50'
                  }`}
                  style={{ borderRadius: '6px' }}
                >
                  <CreditCard className={`h-4 w-4 ${agencyActiveSection === 'credits' ? 'text-white' : 'text-slate-500'}`} />
                  <span>Plan & Credits</span>
                </button>

                <button
                  onClick={() => setAgencyActiveSection('transactions')}
                  className={`w-full text-left px-3.5 py-2.5 rounded-md text-sm font-semibold transition-all duration-200 flex items-center gap-3 cursor-pointer ${
                    agencyActiveSection === 'transactions'
                      ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/25 border border-amber-400/50 scale-[1.01]'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-transparent hover:border-slate-200/50'
                  }`}
                  style={{ borderRadius: '6px' }}
                >
                  <ClipboardList className={`h-4 w-4 ${agencyActiveSection === 'transactions' ? 'text-white' : 'text-slate-500'}`} />
                  <span>Transactions</span>
                </button>

                <button
                  onClick={() => setAgencyActiveSection('settings')}
                  className={`w-full text-left px-3.5 py-2.5 rounded-md text-sm font-semibold transition-all duration-200 flex items-center gap-3 cursor-pointer ${
                    agencyActiveSection === 'settings'
                      ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/25 border border-amber-400/50 scale-[1.01]'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-transparent hover:border-slate-200/50'
                  }`}
                  style={{ borderRadius: '6px' }}
                >
                  <Settings className={`h-4 w-4 ${agencyActiveSection === 'settings' ? 'text-white' : 'text-slate-500'}`} />
                  <span>Settings</span>
                </button>

                <div className="pt-2 mt-2 border-t border-slate-200/60">
                  <a
                    href="/"
                    className="w-full text-left px-3.5 py-2.5 rounded-md text-sm font-semibold transition-all duration-200 flex items-center gap-3 text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-transparent hover:border-slate-200/50"
                    style={{ borderRadius: '6px' }}
                    title="Navigate back to Landing Page"
                  >
                    <Globe className="h-4 w-4 text-slate-500" />
                    <span>Back to Website</span>
                  </a>
                </div>
              </div>
            </nav>
            
            {userData?.approved && (
              <div className="p-4 border-t border-slate-200/70 bg-slate-50/50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-0.5">
                      Plan: <span className="text-orange-600 font-extrabold">{userData?.plan || 'Free'}</span>
                    </p>
                    <p className="text-xs font-bold text-slate-900">
                      {`${userData?.credits ?? 0} Credits`}
                    </p>
                  </div>
                  <button
                    onClick={() => setAgencyActiveSection('credits')}
                    className="text-xs font-semibold text-white bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 px-3 py-1.5 rounded-md shadow-xs border border-amber-400/40 hover:scale-[1.02] transition-all duration-200 cursor-pointer"
                    style={{ borderRadius: '6px' }}
                  >
                    Upgrade
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="flex-1 flex flex-col min-w-0 bg-gray-50/50">
            <header className="h-16 sticky top-0 z-10 bg-white border-b border-gray-200 px-8 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                {agencyActiveSection === 'chat' && (
                  <button
                    onClick={() => setAgencyActiveSection('listings')}
                    className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-gray-100 transition-colors border border-gray-200 shadow-sm mr-2"
                    title="Back to Dashboard"
                  >
                    ←
                  </button>
                )}
                <h1 className="text-xl font-semibold text-gray-900">
                  {agencyActiveSection === 'overview' && 'Agency Overview'}
                  {agencyActiveSection === 'listings' && 'Travel Listings'}
                  {agencyActiveSection === 'bookings' && 'Booking Management'}
                  {agencyActiveSection === 'chat' && 'Customer Chat'}
                  {agencyActiveSection === 'credits' && 'Plan & Credits'}
                  {agencyActiveSection === 'transactions' && 'Payment History'}
                  {agencyActiveSection === 'settings' && 'Agency Settings'}
                </h1>
              </div>
              <div className="flex items-center space-x-4">
                <a
                  href="/"
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-md text-xs sm:text-sm font-semibold bg-white/90 text-slate-700 hover:bg-white hover:text-slate-900 border border-slate-200/80 hover:border-slate-300 hover:shadow-sm hover:scale-[1.02] transition-all duration-200"
                  style={{ borderRadius: '6px' }}
                  title="View Landing Page Website"
                >
                  <ArrowLeft className="h-3.5 w-3.5 text-slate-500" />
                  <Globe className="h-3.5 w-3.5 text-slate-500" />
                  <span>Back to Website</span>
                </a>
                <span className="text-sm text-gray-600 flex items-center gap-1">Status: {userData?.approved ? <span className="flex items-center gap-1"><CheckCircle className="h-4 w-4 text-green-600" /> Approved</span> : <span className="flex items-center gap-1"><Clock className="h-4 w-4 text-yellow-600" /> Pending</span>}</span>
                <button
                  onClick={signOut}
                  className="px-3.5 py-2 rounded-md text-xs sm:text-sm font-semibold bg-white/90 text-slate-700 hover:bg-red-50 hover:text-red-600 border border-slate-200/80 hover:border-red-200 hover:shadow-sm hover:scale-[1.02] transition-all duration-200 cursor-pointer"
                  style={{ borderRadius: '6px' }}
                >
                  Sign Out
                </button>
              </div>
            </header>

            <main className={`overflow-y-auto dashboard-scroll ${agencyActiveSection === 'chat' ? 'flex-1 flex flex-col min-h-0 p-0' : 'flex-1 p-8'}`}>
              {userData?.approved || routeMode === 'agency' || userData?.role === 'agency' ? (
                <>
                  {agencyActiveSection === 'overview' && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                      <Card className="bg-white border border-slate-200/80 shadow-xs rounded-md overflow-hidden" style={{ borderRadius: '6px' }}>
                        <CardContent className="p-6">
                          <div className="flex items-center">
                            <div className="p-2 bg-amber-50 border border-amber-200/60 rounded-md" style={{ borderRadius: '6px' }}>
                              <Users className="h-6 w-6 text-amber-600" />
                            </div>
                            <div className="ml-4">
                              <p className="text-sm font-medium text-gray-600">Total Agencies</p>
                              <p className="text-2xl font-bold text-gray-900">{allAgencies.length}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="bg-white border border-slate-200/80 shadow-xs rounded-md overflow-hidden" style={{ borderRadius: '6px' }}>
                        <CardContent className="p-6">
                          <div className="flex items-center">
                            <div className="p-2 bg-emerald-50 border border-emerald-200/60 rounded-md" style={{ borderRadius: '6px' }}>
                              <CheckCircle className="h-6 w-6 text-emerald-600" />
                            </div>
                            <div className="ml-4">
                              <p className="text-sm font-medium text-gray-600">Approved Agencies</p>
                              <p className="text-2xl font-bold text-gray-900">{allAgencies.filter(a => a.approved).length}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="bg-white border border-slate-200/80 shadow-xs rounded-md overflow-hidden" style={{ borderRadius: '6px' }}>
                        <CardContent className="p-6">
                          <div className="flex items-center">
                            <div className="p-2 bg-amber-50 border border-amber-200/60 rounded-md" style={{ borderRadius: '6px' }}>
                              <Clock className="h-6 w-6 text-amber-600" />
                            </div>
                            <div className="ml-4">
                              <p className="text-sm font-medium text-gray-600">Pending Approvals</p>
                              <p className="text-2xl font-bold text-gray-900">{pendingAgencies.length}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )}

                  {agencyActiveSection === 'listings' && (
                    <div className="space-y-6">
                      {/* Navigation Buttons */}
                      <div className="flex flex-wrap gap-3 mb-6">
                        <button
                          onClick={() => {
                            setShowListingForm(false);
                            setShowBulkUpload(false);
                            setEditingListing(null);
                            setViewingListing(null);
                          }}
                          className={`px-4 py-2 rounded-md text-xs sm:text-sm font-semibold transition-all duration-200 flex items-center gap-2 shrink-0 cursor-pointer ${
                            (!showListingForm && !showBulkUpload && !viewingListing)
                              ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/25 border border-amber-400/50 scale-[1.02]'
                              : 'bg-white/80 border border-slate-200/80 text-slate-700 hover:bg-white hover:text-slate-900 hover:border-slate-300 hover:shadow-sm hover:scale-[1.02]'
                          }`}
                          style={{ borderRadius: '6px' }}
                        >
                          <ClipboardList className="h-4 w-4" /> My Listings
                        </button>
                        <button
                          onClick={() => {
                            setShowListingForm(true);
                            setShowBulkUpload(false);
                            setEditingListing(null);
                            setViewingListing(null);
                          }}
                          className={`px-4 py-2 rounded-md text-xs sm:text-sm font-semibold transition-all duration-200 flex items-center gap-2 shrink-0 cursor-pointer ${
                            showListingForm
                              ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/25 border border-amber-400/50 scale-[1.02]'
                              : 'bg-white/80 border border-slate-200/80 text-slate-700 hover:bg-white hover:text-slate-900 hover:border-slate-300 hover:shadow-sm hover:scale-[1.02]'
                          }`}
                          style={{ borderRadius: '6px' }}
                        >
                          <Plus className="h-4 w-4" /> New Listing
                        </button>
                        <button
                          onClick={() => {
                            setShowBulkUpload(true);
                            setShowListingForm(false);
                            setEditingListing(null);
                            setViewingListing(null);
                          }}
                          className={`px-4 py-2 rounded-md text-xs sm:text-sm font-semibold transition-all duration-200 flex items-center gap-2 shrink-0 cursor-pointer ${
                            showBulkUpload
                              ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/25 border border-amber-400/50 scale-[1.02]'
                              : 'bg-white/80 border border-slate-200/80 text-slate-700 hover:bg-white hover:text-slate-900 hover:border-slate-300 hover:shadow-sm hover:scale-[1.02]'
                          }`}
                          style={{ borderRadius: '6px' }}
                        >
                          <Upload className="h-4 w-4" /> Bulk Import CSV
                        </button>
                      </div>

                      {/* New Listing Form */}
                      {showListingForm && (
                        <AgencyListingForm
                          agencyId={user?.uid || ''}
                          onSuccess={() => {
                            setShowListingForm(false);
                            setShowBulkUpload(false);
                            setEditingListing(null);
                            setViewingListing(null);
                            // Refresh listings
                            const fetchAgencyListings = async () => {
                              const dbInstance = getDbInstance();
                              if (!dbInstance) return;
                              const agencyListingsQuery = query(collection(dbInstance, 'listings'), where('agencyId', '==', user?.uid));
                              const querySnapshot = await getDocs(agencyListingsQuery);
                              const listingsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                              setAgencyListings(listingsData);
                            };
                            fetchAgencyListings();
                          }}
                          onCancel={() => {
                            setShowListingForm(false);
                            setEditingListing(null);
                            setViewingListing(null);
                          }}
                          initialData={editingListing || undefined}
                        />
                      )}

                      {/* Bulk Upload Form */}
                      {showBulkUpload && (
                        <BulkUploadForm
                          agencyId={user?.uid || ''}
                          onSuccess={() => {
                            setShowListingForm(false);
                            setShowBulkUpload(false);
                            setEditingListing(null);
                            setViewingListing(null);
                            // Refresh listings
                            const fetchAgencyListings = async () => {
                              const dbInstance = getDbInstance();
                              if (!dbInstance) return;
                              const agencyListingsQuery = query(collection(dbInstance, 'listings'), where('agencyId', '==', user?.uid));
                              const querySnapshot = await getDocs(agencyListingsQuery);
                              const listingsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                              setAgencyListings(listingsData);
                            };
                            fetchAgencyListings();
                          }}
                        />
                      )}

                      {/* My Listings */}
                      {!showListingForm && !showBulkUpload && !viewingListing && (() => {
                        const filteredAgencyListings = agencyListingSearchQuery.trim()
                          ? agencyListings.filter((listing) => {
                              const q = agencyListingSearchQuery.toLowerCase().trim();
                              const titleMatch = listing.title?.toLowerCase().includes(q);
                              const destMatch = listing.destination?.toLowerCase().includes(q);
                              const stateMatch = listing.stateName?.toLowerCase().includes(q);
                              const countryMatch = listing.countryName?.toLowerCase().includes(q);
                              const typeMatch = listing.packageType?.toLowerCase().includes(q);
                              const priceMatch = (listing.cost?.toString() || listing.price?.toString() || '').includes(q);
                              const statusMatch = listing.approved ? 'approved'.includes(q) : 'pending'.includes(q);
                              const placesMatch = Array.isArray(listing.placesCovered) && listing.placesCovered.some((p: any) => p?.name?.toLowerCase().includes(q));
                              return titleMatch || destMatch || stateMatch || countryMatch || typeMatch || priceMatch || statusMatch || placesMatch;
                            })
                          : agencyListings;

                        return (
                          <Card className="bg-white border border-slate-200/80 shadow-xs rounded-md overflow-hidden w-full" style={{ borderRadius: '8px' }}>
                            <CardHeader className="border-b border-slate-100 bg-slate-50/50 p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                              <div>
                                <CardTitle className="flex items-center text-xl font-bold text-gray-900">
                                  <Palmtree className="mr-2 h-6 w-6 text-amber-600" />
                                  Your Travel Listings
                                </CardTitle>
                                <CardDescription className="text-gray-500 text-xs mt-1">
                                  Manage and search your travel packages ({agencyListings.length} total)
                                </CardDescription>
                              </div>

                              {/* Search Bar */}
                              {agencyListings.length > 0 && (
                                <div className="relative w-full sm:w-72 md:w-80">
                                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                                  <input
                                    type="text"
                                    placeholder="Search packages by title, state, price..."
                                    value={agencyListingSearchQuery}
                                    onChange={(e) => setAgencyListingSearchQuery(e.target.value)}
                                    className="w-full pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all shadow-2xs"
                                  />
                                  {agencyListingSearchQuery && (
                                    <button
                                      onClick={() => setAgencyListingSearchQuery('')}
                                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-100 transition-colors"
                                      title="Clear search"
                                    >
                                      <X className="h-3.5 w-3.5" />
                                    </button>
                                  )}
                                </div>
                              )}
                            </CardHeader>
                            <CardContent className="p-6">
                              {agencyListingSearchQuery && (
                                <div className="mb-4 flex items-center justify-between text-xs text-slate-600 bg-amber-50/70 border border-amber-200/60 px-3.5 py-2 rounded-lg">
                                  <span>
                                    Found <strong className="text-slate-900">{filteredAgencyListings.length}</strong> {filteredAgencyListings.length === 1 ? 'package' : 'packages'} matching &ldquo;<strong className="text-amber-800">{agencyListingSearchQuery}</strong>&rdquo;
                                  </span>
                                  <button
                                    onClick={() => setAgencyListingSearchQuery('')}
                                    className="text-amber-700 hover:text-amber-900 font-semibold underline ml-2 cursor-pointer"
                                  >
                                    Clear
                                  </button>
                                </div>
                              )}

                              <div className="space-y-4">
                                {agencyListings.length === 0 ? (
                                  <div className="text-center py-12">
                                    <div className="w-16 h-16 bg-amber-50 border border-amber-200/60 rounded-md flex items-center justify-center mx-auto mb-4" style={{ borderRadius: '6px' }}>
                                      <ClipboardList className="h-8 w-8 text-amber-600" />
                                    </div>
                                    <h3 className="text-lg font-bold text-gray-900 mb-2">No Listings Yet</h3>
                                    <p className="text-gray-500 text-xs mb-4 max-w-sm mx-auto leading-relaxed">
                                      Create your first travel package to start attracting customers.
                                    </p>
                                    <button
                                      onClick={() => {
                                        setShowListingForm(true);
                                        setShowBulkUpload(false);
                                        setEditingListing(null);
                                      }}
                                      className="px-5 py-2.5 rounded-md text-sm font-semibold transition-all duration-200 inline-flex items-center gap-2 cursor-pointer bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-md shadow-amber-500/25 border border-amber-400/50 hover:scale-[1.02]"
                                      style={{ borderRadius: '6px' }}
                                    >
                                      <Plus className="h-4 w-4" /> Create Your First Listing
                                    </button>
                                  </div>
                                ) : filteredAgencyListings.length === 0 ? (
                                  <div className="text-center py-12 bg-slate-50/50 border border-dashed border-slate-200 rounded-xl">
                                    <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-400">
                                      <Search className="h-5 w-5" />
                                    </div>
                                    <h4 className="text-sm font-bold text-slate-800 mb-1">No packages found</h4>
                                    <p className="text-xs text-slate-500 mb-3">
                                      No packages matched your search &ldquo;{agencyListingSearchQuery}&rdquo;
                                    </p>
                                    <button
                                      onClick={() => setAgencyListingSearchQuery('')}
                                      className="px-3.5 py-1.5 rounded-md text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
                                    >
                                      Clear search
                                    </button>
                                  </div>
                                ) : (
                                  filteredAgencyListings.map((listing) => (
                                    <div key={listing.id} className="flex items-center justify-between p-4 bg-white border border-slate-200/80 hover:border-amber-300 hover:shadow-xs transition-all duration-200 rounded-md" style={{ borderRadius: '6px' }}>
                                      <div className="flex items-center space-x-4">
                                        <div className="w-12 h-12 bg-amber-50 border border-amber-200/60 rounded-md flex items-center justify-center shrink-0" style={{ borderRadius: '6px' }}>
                                          <Palmtree className="h-6 w-6 text-amber-600" />
                                        </div>
                                        <div>
                                          <h3 className="font-bold text-gray-900 text-sm">{listing.title}</h3>
                                          {listing.packageType && (
                                            <p className="text-xs text-slate-600 mb-1 font-semibold">
                                              {listing.packageType === 'international' ? ' International' : ' Domestic'}
                                              {listing.packageType === 'international' && listing.countryName && ` • ${listing.countryName}`}
                                              {listing.packageType === 'domestic' && listing.stateName && ` • ${listing.stateName}`}
                                            </p>
                                          )}
                                          <p className="text-xs text-gray-500">
                                            {listing.itinerary?.length || 0} days • {listing.packageType === 'international' ? '$' : '₹'}{listing.cost || listing.price || 'N/A'}
                                            <span className={`ml-2 px-2 py-0.5 rounded-md text-[10px] font-bold border ${listing.approved ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                                              }`} style={{ borderRadius: '4px' }}>
                                              {listing.approved ? 'Approved' : 'Pending'}
                                            </span>
                                          </p>
                                          {listing.placesCovered && listing.placesCovered.length > 0 && (
                                            <p className="text-[11px] text-gray-400 mt-1">
                                              Places: {listing.placesCovered.map((place: any) => place.name).join(', ')}
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                      <div className="flex space-x-2">
                                        <button
                                          onClick={() => handleViewListing(listing)}
                                          className="px-3 py-1.5 rounded-md text-xs font-semibold bg-white/90 border border-slate-200/80 text-slate-700 hover:bg-white hover:text-slate-900 hover:border-slate-300 hover:shadow-xs hover:scale-[1.02] transition-all duration-200 cursor-pointer"
                                          style={{ borderRadius: '6px' }}
                                        >
                                          Preview
                                        </button>
                                        <button
                                          onClick={() => {
                                            setShowListingForm(true);
                                            setShowBulkUpload(false);
                                            setEditingListing(listing);
                                          }}
                                          className="px-3 py-1.5 rounded-md text-xs font-semibold bg-white/90 border border-slate-200/80 text-slate-700 hover:bg-white hover:text-slate-900 hover:border-slate-300 hover:shadow-xs hover:scale-[1.02] transition-all duration-200 cursor-pointer"
                                          style={{ borderRadius: '6px' }}
                                        >
                                          Edit
                                        </button>
                                        <button
                                          onClick={() => handleDeleteListing(listing.id)}
                                          className="px-3 py-1.5 rounded-md text-xs font-semibold bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 hover:text-red-700 hover:shadow-xs hover:scale-[1.02] transition-all duration-200 cursor-pointer"
                                          style={{ borderRadius: '6px' }}
                                        >
                                          Delete
                                        </button>
                                      </div>
                                    </div>
                                  ))
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })()}

                      {/* Preview Listing */}
                      {!showListingForm && !showBulkUpload && viewingListing && (
                        <PackageDetailView
                          listing={viewingListing}
                          onBack={() => setViewingListing(null)}
                          isWishlisted={false}
                          isPreview={true}
                        />
                      )}
                    </div>
                  )}

                  {agencyActiveSection === 'bookings' && (
                    <div className="space-y-6 w-full">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Card className="bg-white border border-slate-200/80 shadow-xs rounded-md overflow-hidden" style={{ borderRadius: '6px' }}>
                          <CardContent className="p-6">
                            <div className="flex items-center">
                              <div className="p-2 bg-amber-50 border border-amber-200/60 rounded-md" style={{ borderRadius: '6px' }}>
                                <Calendar className="h-6 w-6 text-amber-600" />
                              </div>
                              <div className="ml-4">
                                <p className="text-sm font-medium text-gray-600">Total Bookings</p>
                                <p className="text-2xl font-bold text-gray-900">{agencyBookings.length}</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        <Card className="bg-white border border-slate-200/80 shadow-xs rounded-md overflow-hidden" style={{ borderRadius: '6px' }}>
                          <CardContent className="p-6">
                            <div className="flex items-center">
                              <div className="p-2 bg-amber-50 border border-amber-200/60 rounded-md" style={{ borderRadius: '6px' }}>
                                <Clock className="h-6 w-6 text-amber-600" />
                              </div>
                              <div className="ml-4">
                                <p className="text-sm font-medium text-gray-600">Pending</p>
                                <p className="text-2xl font-bold text-gray-900">{agencyBookings.filter(b => b.status === 'pending').length}</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        <Card className="bg-white border border-slate-200/80 shadow-xs rounded-md overflow-hidden" style={{ borderRadius: '6px' }}>
                          <CardContent className="p-6">
                            <div className="flex items-center">
                              <div className="p-2 bg-emerald-50 border border-emerald-200/60 rounded-md" style={{ borderRadius: '6px' }}>
                                <CheckCircle className="h-6 w-6 text-emerald-600" />
                              </div>
                              <div className="ml-4">
                                <p className="text-sm font-medium text-gray-600">Confirmed</p>
                                <p className="text-2xl font-bold text-gray-900">{agencyBookings.filter(b => b.status === 'confirmed').length}</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      <Card className="bg-white border border-slate-200/80 shadow-xs rounded-md overflow-hidden w-full" style={{ borderRadius: '8px' }}>
                        <CardHeader className="border-b border-slate-100 bg-slate-50/50 p-6">
                          <CardTitle className="flex items-center text-xl font-bold text-gray-900">
                            <Calendar className="mr-2 h-6 w-6 text-amber-600" />
                            Recent Bookings
                          </CardTitle>
                          <CardDescription className="text-xs text-gray-500 mt-1">
                            Manage customer bookings and inquiries
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="p-6">
                          {agencyBookings.length === 0 ? (
                            <div className="text-center py-12">
                              <div className="w-16 h-16 bg-amber-50 border border-amber-200/60 rounded-md flex items-center justify-center mx-auto mb-4" style={{ borderRadius: '6px' }}>
                                <Calendar className="h-8 w-8 text-amber-600" />
                              </div>
                              <h3 className="text-lg font-bold text-gray-900 mb-2">No Bookings Yet</h3>
                              <p className="text-gray-500 text-xs mb-4 max-w-sm mx-auto leading-relaxed">
                                When customers book your travel packages, they will appear here for you to manage.
                              </p>
                              <p className="text-xs text-gray-400">
                                You can confirm bookings, communicate with customers, and track payments.
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              {agencyBookings.map((booking) => (
                                <div key={booking.id} className="flex items-center justify-between p-4 bg-white border border-slate-200/80 hover:border-amber-300 hover:shadow-xs transition-all duration-200 rounded-md" style={{ borderRadius: '6px' }}>
                                  <div className="flex items-center space-x-4">
                                    <div className="w-12 h-12 bg-amber-50 border border-amber-200/60 rounded-md flex items-center justify-center shrink-0" style={{ borderRadius: '6px' }}>
                                      <User className="h-6 w-6 text-amber-600" />
                                    </div>
                                    <div>
                                      <h3 className="font-bold text-gray-900 text-sm">{booking.userName}</h3>
                                      <p className="text-xs text-slate-600 mb-0.5 font-medium">
                                        {booking.listingTitle} • {booking.travelers} traveler{booking.travelers > 1 ? 's' : ''} • ${booking.totalAmount}
                                      </p>
                                      <p className="text-xs text-gray-500">
                                        Travel Date: {booking.travelDate || 'Not specified'} • Ref: {booking.bookingReference}
                                      </p>
                                      <p className="text-xs text-gray-500">
                                        {booking.userEmail} • {(userData?.role === 'agency' && (userData?.plan === 'free' || !userData?.plan)) && booking.userPhone ? (
                                          <span 
                                            className="select-none inline-block bg-gray-200/50 rounded px-1"
                                            style={{ filter: 'blur(4px)' }}
                                            title="Upgrade plan to view phone number"
                                          >
                                            [Phone Blurred]
                                          </span>
                                        ) : (
                                          booking.userPhone || 'No phone'
                                        )}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex flex-col items-end space-y-2">
                                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${booking.status === 'confirmed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                        booking.status === 'pending' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                          'bg-red-50 text-red-700 border-red-200'
                                      }`} style={{ borderRadius: '4px' }}>
                                      {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                                    </span>
                                    <div className="flex space-x-2">
                                      <button
                                        onClick={() => {
                                          alert(`Booking Details:\n\n${booking.specialRequests || 'No special requests'}\n\nPreferences: ${booking.preferences.join(', ') || 'None'}`);
                                        }}
                                        className="px-3 py-1.5 rounded-md text-xs font-semibold bg-white/90 border border-slate-200/80 text-slate-700 hover:bg-white hover:text-slate-900 hover:border-slate-300 hover:shadow-xs hover:scale-[1.02] transition-all duration-200 cursor-pointer"
                                        style={{ borderRadius: '6px' }}
                                      >
                                        Details
                                      </button>
                                      {booking.status === 'pending' && (
                                        <button
                                          onClick={async () => {
                                            try {
                                              const dbInstance = getDbInstance();
                                              if (!dbInstance) return;
                                              await updateDoc(doc(dbInstance, 'bookings', booking.id), { status: 'confirmed' });
                                              const updatedBookings = agencyBookings.map(b =>
                                                b.id === booking.id ? { ...b, status: 'confirmed' } : b
                                              );
                                              setAgencyBookings(updatedBookings);
                                              alert('Booking confirmed successfully!');
                                            } catch (error) {
                                              console.error('Error confirming booking:', error);
                                              alert('Failed to confirm booking. Please try again.');
                                            }
                                          }}
                                          className="px-3 py-1.5 rounded-md text-xs font-semibold bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-md shadow-amber-500/25 border border-amber-400/50 hover:scale-[1.02] transition-all duration-200 cursor-pointer"
                                          style={{ borderRadius: '6px' }}
                                        >
                                          Confirm
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  )}
                  {agencyActiveSection === 'chat' && (
                    <div className="bg-white flex flex-col md:flex-row flex-1 min-h-0 min-w-0 w-full h-full overflow-hidden">
                      {/* Left Column: Conversations List */}
                      <div className={`w-full md:w-80 md:min-w-[20rem] md:max-w-[20rem] flex-shrink-0 border-r border-gray-150 bg-gray-50/40 flex flex-col h-full min-w-0 overflow-hidden ${selectedConversation ? 'hidden md:flex' : 'flex'}`}>
                        {/* Sidebar Header */}
                        <div className="p-4 border-b border-gray-150 bg-white shrink-0">
                          <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                            <Users className="h-5 w-5 text-blue-600" /> Conversations
                          </h3>
                          <p className="text-[10px] text-gray-450 mt-0.5">Customers who contacted you</p>
                        </div>

                        {/* Search Bar */}
                        <div className="px-3.5 py-2.5 bg-white border-b border-gray-200/80 shrink-0">
                          <div className="relative flex items-center">
                            <Search className="absolute left-3 w-4 h-4 text-gray-400 pointer-events-none" />
                            <input
                              type="text"
                              placeholder="Search conversations..."
                              className="w-full pl-9 pr-8 py-1.5 h-9 rounded-full text-xs text-gray-800 border border-gray-200 bg-gray-50/80 focus:bg-white focus:outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 placeholder-gray-400 transition-all leading-normal"
                              value={agencyChatSearchQuery}
                              onChange={(e) => setAgencyChatSearchQuery(e.target.value)}
                            />
                            {agencyChatSearchQuery && (
                              <button
                                onClick={() => setAgencyChatSearchQuery('')}
                                className="absolute right-2.5 text-gray-400 hover:text-gray-600 p-0.5 rounded-full"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Scrollable Customers List */}
                        <div className="flex-1 p-3 space-y-2 sidebar-scroll">
                          {agencyConversations.filter(c => c.userName.toLowerCase().includes(agencyChatSearchQuery.toLowerCase())).length === 0 ? (
                            <div className="text-center py-12">
                              <User className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                              <p className="text-xs text-gray-400 font-semibold">No conversations found</p>
                              <p className="text-[10px] text-gray-400 mt-1 px-4">Conversations will appear here once customers contact you.</p>
                            </div>
                          ) : (
                            agencyConversations
                              .filter(c => c.userName.toLowerCase().includes(agencyChatSearchQuery.toLowerCase()))
                              .map((conversation) => {
                                const isActive = selectedConversation?.userId === conversation.userId;
                                const initials = conversation.userName ? conversation.userName.slice(0, 2).toUpperCase() : 'US';
                                const formattedTime = formatConversationTime(conversation.lastMessageTime);
                                return (
                                  <div
                                    key={conversation.userId}
                                    onClick={() => {
                                      hasManuallyClosedChatRef.current = false;
                                      selectConversation(conversation);
                                      
                                      const unreadMsgs = agencyChatMessages.filter(m => m.sender === conversation.userId && m.status !== 'read');
                                      unreadMsgs.forEach(async (m) => {
                                        try {
                                          const coll = m.isMobile ? 'chat_messages' : 'messages';
                                          await updateDoc(doc(getDbInstance()!, coll, m.id), { status: 'read' });
                                        } catch (e) {}
                                      });
                                    }}
                                    className={`p-3 rounded-xl cursor-pointer transition-all duration-150 flex items-center gap-3 ${
                                      isActive
                                        ? 'bg-[#f0f2f5] text-gray-900 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.04)]'
                                        : 'bg-transparent hover:bg-[#f5f6f6] text-gray-700'
                                    }`}
                                  >
                                    {/* Avatar */}
                                    <div className="w-10 h-10 text-slate-700 bg-[#dfe5e7] rounded-full flex items-center justify-center font-bold text-xs shrink-0 shadow-xs relative overflow-visible">
                                      {conversation.userLogo ? (
                                        <img src={conversation.userLogo} alt={initials} className="w-full h-full object-cover rounded-full" />
                                      ) : (
                                        initials
                                      )}
                                    </div>
                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center justify-between mb-0.5">
                                        <span className="font-semibold text-xs text-gray-900 truncate pr-2">
                                          {conversation.userName}
                                        </span>
                                        {formattedTime && (
                                          <span className="text-[10px] text-gray-400 font-normal shrink-0">
                                            {formattedTime}
                                          </span>
                                        )}
                                      </div>
                                      <div className="flex items-center justify-between gap-1">
                                        <p className="text-[11px] text-gray-500 truncate flex-1">
                                          {conversation.lastMessage || "No messages yet"}
                                        </p>
                                        {conversation.unreadCount > 0 && (
                                          <span className="bg-[#25D366] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 min-w-[18px] text-center">
                                            {conversation.unreadCount}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })
                          )}
                        </div>
                      </div>

                      {/* Right Column: Chat Content */}
                      <div className={`flex-1 flex flex-col h-full chat-travel-bg min-w-0 min-h-0 overflow-hidden ${!selectedConversation ? 'hidden md:flex' : 'flex'}`}>
                        {selectedConversation ? (
                          <div className="flex flex-col h-full relative min-w-0 min-h-0 overflow-hidden">
                            {/* Conversation Header */}
                            {(() => {
                              const unlockRecord = (userData?.unlockedUsers as any[] || []).find((u: any) => typeof u === 'string' ? u === selectedConversation.userId : u.userId === selectedConversation.userId);
                              const isUnlocked = unlockRecord ? (typeof unlockRecord === 'string' ? true : (unlockRecord as any).expiresAt > Date.now()) : false;
                              const daysRemaining = (isUnlocked && unlockRecord && typeof unlockRecord !== 'string') 
                                ? Math.ceil(((unlockRecord as any).expiresAt - Date.now()) / (1000 * 60 * 60 * 24)) 
                                : null;

                              return (
                                <div className="px-4 md:px-6 py-3 bg-[#f0f2f5] border-b border-gray-200 flex items-center justify-between shadow-2xs z-10 shrink-0">
                                  <div className="flex items-center gap-2 sm:gap-3">
                                    {/* Mobile Back Button */}
                                    <button
                                      onClick={() => {
                                        hasManuallyClosedChatRef.current = true;
                                        setSelectedConversation(null);
                                        setShowAgencyInChatSearch(false);
                                        setAgencyInChatSearchQuery('');
                                      }}
                                      className="md:hidden p-1.5 -ml-1 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-xl transition-colors flex items-center gap-1 font-semibold text-xs"
                                      aria-label="Back to conversations"
                                    >
                                      <ChevronLeft className="h-4 w-4" />
                                      <span className="hidden xs:inline">Back</span>
                                    </button>

                                    <div className="w-9 h-9 bg-orange-100 text-orange-755 rounded-full flex items-center justify-center font-bold text-xs shadow-inner shrink-0">
                                      {selectedConversation.userName ? selectedConversation.userName.slice(0, 2).toUpperCase() : 'US'}
                                    </div>
                                    <div>
                                      <h4 className="font-bold text-xs text-gray-900 truncate max-w-[140px] sm:max-w-none">{selectedConversation.userName}</h4>
                                      <span className="text-[9px] text-gray-500 font-medium flex items-center gap-2 mt-0.5">
                                        <span>Customer ID: {selectedConversation.userId.slice(0, 8)}</span>
                                        {daysRemaining !== null && (
                                          <span className="flex items-center gap-1 text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded border border-orange-100 font-bold">
                                            <Clock className="w-3 h-3" /> {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'} left
                                          </span>
                                        )}
                                      </span>
                                    </div>
                                  </div>
                                  
                                  {/* Header Actions: Search & Close */}
                                  <div className="flex items-center gap-1">
                                    <button 
                                      onClick={() => {
                                        setShowAgencyInChatSearch(prev => !prev);
                                        if (showAgencyInChatSearch) setAgencyInChatSearchQuery('');
                                      }}
                                      className={`p-2 rounded-full transition-all flex items-center justify-center ${
                                        showAgencyInChatSearch 
                                          ? 'bg-emerald-100 text-emerald-700' 
                                          : 'text-gray-500 hover:text-gray-800 hover:bg-gray-200/70'
                                      }`}
                                      title="Search in chat"
                                      aria-label="Search messages"
                                    >
                                      <Search className="w-4 h-4" />
                                    </button>

                                    <button 
                                      onClick={() => {
                                        hasManuallyClosedChatRef.current = true;
                                        setSelectedConversation(null);
                                        setShowAgencyInChatSearch(false);
                                        setAgencyInChatSearchQuery('');
                                      }}
                                      className="text-gray-400 hover:text-gray-700 p-2 hover:bg-gray-200/60 rounded-full transition-all flex items-center justify-center"
                                      title="Close Chat"
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                              );
                            })()}

                            {/* Agency Search in chat bar */}
                            {showAgencyInChatSearch && (() => {
                              const currentConvMsgs = agencyChatMessages
                                .filter(msg => (msg.sender === selectedConversation.userId && msg.receiverId === user?.uid) || (msg.sender === user?.uid && msg.receiverId === selectedConversation.userId))
                                .sort((a, b) => (Number(a.timestamp?.seconds ? a.timestamp.seconds * 1000 : a.timestamp) || 0) - (Number(b.timestamp?.seconds ? b.timestamp.seconds * 1000 : b.timestamp) || 0));

                              const agencySearchMatches = agencyInChatSearchQuery.trim()
                                ? currentConvMsgs
                                    .map((msg, idx) => ((msg.text || '').toLowerCase().includes(agencyInChatSearchQuery.toLowerCase()) ? idx : -1))
                                    .filter(idx => idx !== -1)
                                : [];

                              const jumpToAgencyMatch = (targetIdx: number) => {
                                if (agencySearchMatches.length === 0) return;
                                const nextIndex = (targetIdx + agencySearchMatches.length) % agencySearchMatches.length;
                                setAgencyInChatSearchIndex(nextIndex);
                                const msgIdx = agencySearchMatches[nextIndex];
                                const targetId = `agency-msg-${currentConvMsgs[msgIdx]?.id || msgIdx}`;
                                const el = document.getElementById(targetId);
                                if (el) {
                                  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                }
                              };

                              return (
                                <div className="px-4 py-2 bg-[#f0f2f5] border-b border-gray-200 flex items-center gap-2 z-10 shrink-0">
                                  <div className="relative flex-1 flex items-center">
                                    <Search className="absolute left-3 w-4 h-4 text-gray-400 pointer-events-none" />
                                    <input
                                      type="text"
                                      autoFocus
                                      value={agencyInChatSearchQuery}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        setAgencyInChatSearchQuery(val);
                                        setAgencyInChatSearchIndex(0);
                                        if (val.trim()) {
                                          const matches = currentConvMsgs
                                            .map((msg, idx) => ((msg.text || '').toLowerCase().includes(val.toLowerCase()) ? idx : -1))
                                            .filter(idx => idx !== -1);
                                          if (matches.length > 0) {
                                            const targetId = `agency-msg-${currentConvMsgs[matches[0]]?.id || matches[0]}`;
                                            setTimeout(() => {
                                              const el = document.getElementById(targetId);
                                              if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                            }, 40);
                                          }
                                        }
                                      }}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          e.preventDefault();
                                          if (e.shiftKey) {
                                            jumpToAgencyMatch(agencyInChatSearchIndex - 1);
                                          } else {
                                            jumpToAgencyMatch(agencyInChatSearchIndex + 1);
                                          }
                                        } else if (e.key === 'Escape') {
                                          setShowAgencyInChatSearch(false);
                                          setAgencyInChatSearchQuery('');
                                        }
                                      }}
                                      placeholder="Search messages... (Enter / Shift+Enter to jump)"
                                      className="w-full pl-9 pr-8 py-1.5 bg-white text-xs text-gray-800 rounded-lg border border-gray-300 focus:outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 placeholder-gray-400"
                                    />
                                    {agencyInChatSearchQuery && (
                                      <button
                                        onClick={() => {
                                          setAgencyInChatSearchQuery('');
                                          setAgencyInChatSearchIndex(0);
                                        }}
                                        className="absolute right-2.5 text-gray-400 hover:text-gray-600 p-0.5 rounded-full"
                                      >
                                        <X className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                  
                                  {/* Match counter & Navigation Arrows */}
                                  <div className="flex items-center gap-1 shrink-0 select-none">
                                    <span className="text-[11px] text-gray-500 font-medium px-1.5 min-w-[45px] text-center">
                                      {agencySearchMatches.length > 0 
                                        ? `${agencyInChatSearchIndex + 1} of ${agencySearchMatches.length}` 
                                        : agencyInChatSearchQuery.trim() ? '0 of 0' : ''
                                      }
                                    </span>
                                    <button
                                      type="button"
                                      disabled={agencySearchMatches.length <= 1}
                                      onClick={() => jumpToAgencyMatch(agencyInChatSearchIndex - 1)}
                                      className="p-1 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-200/80 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                                      title="Previous match (Shift+Enter)"
                                    >
                                      <ChevronUp className="w-4 h-4" />
                                    </button>
                                    <button
                                      type="button"
                                      disabled={agencySearchMatches.length <= 1}
                                      onClick={() => jumpToAgencyMatch(agencyInChatSearchIndex + 1)}
                                      className="p-1 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-200/80 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                                      title="Next match (Enter)"
                                    >
                                      <ChevronDown className="w-4 h-4" />
                                    </button>
                                  </div>

                                  <button
                                    onClick={() => {
                                      setShowAgencyInChatSearch(false);
                                      setAgencyInChatSearchQuery('');
                                      setAgencyInChatSearchIndex(0);
                                    }}
                                    className="text-gray-400 hover:text-gray-700 p-1.5 rounded-full hover:bg-gray-200 transition-colors"
                                    title="Close search (Esc)"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              );
                            })()}

                            {/* Messages Area */}
                            <div className="flex-1 p-4 md:p-6 space-y-3 chat-scroll overflow-y-auto overflow-x-hidden w-full min-w-0">
                              {(() => {
                                const filteredMsgs = [...agencyChatMessages]
                                  .filter(msg => (msg.sender === selectedConversation.userId && msg.receiverId === user?.uid) || (msg.sender === user?.uid && msg.receiverId === selectedConversation.userId))
                                  .sort((a, b) => (Number(a.timestamp?.seconds ? a.timestamp.seconds * 1000 : a.timestamp) || 0) - (Number(b.timestamp?.seconds ? b.timestamp.seconds * 1000 : b.timestamp) || 0));

                                const agencySearchMatches = agencyInChatSearchQuery.trim()
                                  ? filteredMsgs
                                      .map((msg, idx) => ((msg.text || '').toLowerCase().includes(agencyInChatSearchQuery.toLowerCase()) ? idx : -1))
                                      .filter(idx => idx !== -1)
                                  : [];

                                let lastDateDivider = '';

                                return filteredMsgs.map((msg, index) => {
                                  const isSelf = msg.sender === user?.uid;
                                  const dateDivider = formatChatDateDivider(msg.timestamp);
                                  const showDivider = dateDivider && dateDivider !== lastDateDivider;
                                  if (showDivider) {
                                    lastDateDivider = dateDivider;
                                  }

                                  const isCurrentActiveMatch = agencySearchMatches.length > 0 && agencySearchMatches[agencyInChatSearchIndex] === index;

                                  const msgTimeStr = msg.timestamp 
                                    ? (msg.timestamp?.seconds ? new Date(msg.timestamp.seconds * 1000) : new Date(msg.timestamp)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
                                    : '';

                                  return (
                                    <React.Fragment key={msg.id || index}>
                                      {showDivider && (
                                        <div className="flex justify-center my-3 select-none">
                                          <span className="bg-white/90 backdrop-blur-xs text-gray-500 text-[11px] font-medium px-3 py-1 rounded-lg shadow-[0_1px_1px_rgba(0,0,0,0.06)] border border-gray-100">
                                            {dateDivider}
                                          </span>
                                        </div>
                                      )}
                                      <div 
                                        id={`agency-msg-${msg.id || index}`}
                                        className={`flex ${isSelf ? 'justify-end' : 'justify-start'} transition-all duration-300 scroll-mt-24`}
                                      >
                                        <div 
                                          className={`max-w-[82%] sm:max-w-[70%] px-3 py-1.5 rounded-2xl shadow-[0_1px_0.5px_rgba(11,20,26,0.13)] transition-all duration-300 ${
                                            isCurrentActiveMatch ? 'ring-2 ring-emerald-500 shadow-[0_0_16px_rgba(16,185,129,0.4)] scale-[1.02]' : ''
                                          } ${
                                            isSelf 
                                              ? 'bg-[#d9fdd3] text-gray-900 rounded-tr-xs border border-[#c4ebb8]/40' 
                                              : 'bg-white text-gray-900 rounded-tl-xs border border-gray-100'
                                          }`}
                                        >
                                          <div className="text-[13px] leading-[1.4] text-gray-900 break-words select-text">
                                            <span className="inline">
                                              {highlightSearchMatch(
                                                renderMessageText(msg.text, userData?.role === 'agency' && (userData?.plan === 'free' || !userData?.plan)),
                                                agencyInChatSearchQuery,
                                                isCurrentActiveMatch
                                              )}
                                            </span>
                                            <span className="inline-flex items-center gap-1 float-right align-bottom ml-2.5 translate-y-0.5 select-none text-[10px] text-gray-500 font-normal">
                                              <span>{msgTimeStr}</span>
                                              {isSelf && (
                                                msg.status === 'read' ? (
                                                  <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb] shrink-0" />
                                                ) : (
                                                  <Check className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                                )
                                              )}
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                    </React.Fragment>
                                  );
                                });
                              })()}
                              <div ref={agencyChatEndRef} />
                            </div>

                            {/* Message Input / Unlock Box */}
                            {(() => {
                              const checkIsUnlocked = (unlockedUsersList: any[], targetId: string) => {
                                const record = (unlockedUsersList || []).find((u: any) => typeof u === 'string' ? u === targetId : u.userId === targetId);
                                if (!record) return false;
                                if (typeof record === 'string') return true;
                                return (record as any).expiresAt > Date.now();
                              };
                              const isUnlocked = checkIsUnlocked(userData?.unlockedUsers || [], selectedConversation.userId);
                              const isFreePlan = (userData?.role as string) === 'agency' && (userData?.plan === 'free' || !userData?.plan);
                              const hasPhoneInInput = isFreePlan && agencyChatInput.replace(/\D/g, '').length >= 10;
                              return isUnlocked ? (
                                <div className="bg-white flex flex-col shrink-0 relative min-w-0 w-full overflow-hidden">
                                  {hasPhoneInInput && (
                                    <div className="absolute -top-8 left-4 text-[10px] font-bold text-red-500 bg-red-50 px-2.5 py-1 rounded-md border border-red-200 shadow-sm animate-pulse z-20">
                                      <span className="flex items-center gap-1"><AlertCircle className="h-3.5 w-3.5 text-red-500 shrink-0" /> Phone numbers cannot be sent on the Free Plan. Upgrade to Starter/Premium.</span>
                                    </div>
                                  )}

                                  {/* Quick Replies Carousel */}
                                  {(() => {
                                    const currentAgencyMsgs = agencyChatMessages.filter(msg => msg.chatId === [user?.uid, selectedConversation?.userId].sort().join('_'));
                                    const mySentAgencyTexts = new Set(currentAgencyMsgs.filter(msg => msg.sender === user?.uid).map(msg => msg.text));
                                    const availableSellerReplies = [...SELLER_QUICK_REPLIES, ...adminSellerReplies].filter(reply => !mySentAgencyTexts.has(reply));
                                    
                                    if (availableSellerReplies.length === 0) return null;
                                    return (
                                      <div className="px-4 pt-2.5 pb-2 bg-[#f0f2f5] border-t border-gray-200/80 flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth w-full max-w-full min-w-0 shrink-0">
                                        {availableSellerReplies.map((reply, idx) => (
                                          <button
                                            key={idx}
                                            onClick={async () => {
                                              if (!user || !selectedConversation) return;
                                              const messageData = {
                                                from_user_id: user.uid,
                                                to_user_id: selectedConversation.userId,
                                                content: reply,
                                                timestamp: Date.now(),
                                                status: 'sent'
                                              };
                                              const dbInstance = getDbInstance();
                                              if (dbInstance) await addDoc(collection(dbInstance, 'chat_messages'), messageData);
                                            }}
                                            className="shrink-0 px-3 py-1.5 bg-white hover:bg-emerald-50 text-gray-700 hover:text-emerald-700 border border-gray-200 hover:border-emerald-300 text-xs rounded-full whitespace-nowrap transition-all shadow-2xs active:scale-95 font-medium"
                                          >
                                            {reply}
                                          </button>
                                        ))}
                                      </div>
                                    );
                                  })()}
                                  
                                  <div className="px-4 py-2.5 bg-[#f0f2f5] border-t border-gray-200 flex items-center gap-2 relative shrink-0 w-full max-w-full min-w-0">
                                    {/* Emoji Visual Indicator */}
                                    <div className="relative shrink-0">
                                      <button 
                                        onClick={() => setShowAgencyEmojiPicker(!showAgencyEmojiPicker)}
                                        className="text-gray-500 hover:text-gray-700 transition-colors p-1.5 hover:bg-gray-200/60 rounded-full focus:outline-none flex items-center justify-center" 
                                        title="Add Emoji"
                                      >
                                        <Smile className="h-5 w-5" />
                                      </button>
                                      
                                      {showAgencyEmojiPicker && (
                                        <div className="absolute bottom-12 left-0 bg-white border border-gray-200 rounded-2xl p-3 shadow-xl z-30 w-56 animate-in slide-in-from-bottom-2 duration-150">
                                          <div className="grid grid-cols-6 gap-1.5 max-h-32 overflow-y-auto">
                                            {['😊', '😂', '🤣', '👍', '❤️', '🔥', '✈️', '🏝️', '🗺️', '🏨', '🚗', '👏', '😍', '🎉', '🙌', '🙏', '✨', '🌍', '🌅', '🎒', '💬', '🎫', '🏝', '⛰', '🌟', '🛶', '🏄', '🏔', '⛺', '🧭'].map((emoji) => (
                                              <button
                                                key={emoji}
                                                onClick={() => {
                                                  setAgencyChatInput((prev) => prev + emoji);
                                                  setShowAgencyEmojiPicker(false);
                                                }}
                                                className="hover:bg-gray-100 p-1.5 rounded-lg text-lg transition-all active:scale-90 flex items-center justify-center"
                                              >
                                                {emoji}
                                              </button>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                    </div>

                                    <Input
                                      value={agencyChatInput}
                                      onChange={(e) => setAgencyChatInput(e.target.value)}
                                      placeholder="Type a message..."
                                      onKeyPress={(e) => e.key === 'Enter' && !hasPhoneInInput && sendAgencyMessage()}
                                      className="flex-1 rounded-full border border-gray-200 px-4 py-2 bg-white focus-visible:ring-1 focus-visible:ring-[#00a884] text-gray-900 text-xs h-10 shadow-2xs min-w-0"
                                    />
                                    
                                    <button 
                                      onClick={sendAgencyMessage} 
                                      disabled={!agencyChatInput.trim() || hasPhoneInInput}
                                      className={`w-9 h-9 rounded-full flex items-center justify-center transition-all shrink-0 ${
                                        agencyChatInput.trim() && !hasPhoneInInput
                                          ? 'bg-[#00a884] hover:bg-[#008f6f] text-white shadow-sm active:scale-95 cursor-pointer' 
                                          : 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
                                      }`}
                                      title="Send Message"
                                    >
                                      <Send className="w-4 h-4 ml-0.5" />
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                  <div className="px-6 py-3.5 bg-white border-t border-gray-200 shrink-0 flex flex-col sm:flex-row items-center justify-between gap-4">
                                    <div className="space-y-0.5 text-center sm:text-left">
                                      <h4 className="text-xs font-bold text-gray-900 flex items-center gap-1.5 justify-center sm:justify-start">
                                        <Lock className="h-3.5 w-3.5 text-amber-600" /> Conversation Locked
                                      </h4>
                                      <p className="text-[11px] text-gray-500">
                                        To reply to this traveler, you need to unlock the conversation. Cost: {
                                          userData?.plan === 'vip' ? '30 Credits' : 
                                          userData?.plan === 'premium' ? '40 Credits' : 
                                          '50 Credits'
                                        }.
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                      <div className="text-right hidden md:block">
                                        <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Your Balance</p>
                                        <p className="text-xs font-black text-gray-800">
                                          {`${userData?.credits ?? 0} Credits`}
                                        </p>
                                      </div>
                                      <button
                                        onClick={() => unlockCustomerChat(selectedConversation.userId, selectedConversation.userName)}
                                        className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-all duration-200 shadow-sm hover:shadow flex items-center gap-1.5 cursor-pointer hover:scale-[1.02] active:scale-95"
                                      >
                                        <Sparkles className="h-3.5 w-3.5" /> Unlock to Reply
                                      </button>
                                    </div>
                                  </div>
                              );
                            })()}
                          </div>
                        ) : (
                          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-gray-55/30">
                            <div className="w-16 h-16 bg-white border border-gray-150 rounded-2xl flex items-center justify-center shadow-md mb-6">
                              <Plane className="h-8 w-8 text-blue-600" />
                            </div>
                            <h4 className="font-extrabold text-gray-900 text-sm mb-2">Your Inbox</h4>
                            <p className="text-xs text-gray-500 max-w-sm leading-relaxed">
                              Select a customer from the sidebar list to discuss itineraries, pricing details, or answer questions.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {agencyActiveSection === 'transactions' && (() => {
                    const txList = [...(userData?.creditHistory || [])].reverse();
                    const totalPaid = txList.reduce((s: number, tx: any) => s + (Number(tx.amountPaid) || 0), 0);
                    const planCount = txList.filter((tx: any) => tx.type === 'plan-change').length;
                    const topupCount = txList.filter((tx: any) => tx.type === 'top-up').length;
                    return (
                      <div className="space-y-5 w-full">
                        {/* Page Title */}
                        <div className="flex items-center justify-between">
                          <div>
                            <h2 className="text-xl font-bold text-gray-900">Billing &amp; Transactions</h2>
                            <p className="text-xs text-gray-500 mt-0.5">All payments made on your TripDM account</p>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-slate-500 border border-slate-200/80 bg-white rounded-md px-3 py-1.5 shadow-xs" style={{ borderRadius: '6px' }}>
                            <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                            Secured by Razorpay
                          </div>
                        </div>

                        {/* Summary Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="bg-white border border-slate-200/80 rounded-md p-4 shadow-xs" style={{ borderRadius: '6px' }}>
                            <p className="text-[11px] text-gray-500 font-medium mb-1">Total Transactions</p>
                            <p className="text-2xl font-bold text-gray-900">{txList.length}</p>
                            <p className="text-[10px] text-gray-400 mt-1">All time</p>
                          </div>
                          <div className="bg-white border border-slate-200/80 rounded-md p-4 shadow-xs" style={{ borderRadius: '6px' }}>
                            <p className="text-[11px] text-gray-500 font-medium mb-1">Total Amount Paid</p>
                            <p className="text-2xl font-bold text-gray-900">₹{totalPaid.toLocaleString('en-IN')}</p>
                            <p className="text-[10px] text-gray-400 mt-1">{planCount} upgrade{planCount !== 1 ? 's' : ''} · {topupCount} top-up{topupCount !== 1 ? 's' : ''}</p>
                          </div>
                          <div className="bg-white border border-slate-200/80 rounded-md p-4 shadow-xs" style={{ borderRadius: '6px' }}>
                            <p className="text-[11px] text-gray-500 font-medium mb-1">Current Plan</p>
                            <p className="text-2xl font-bold text-gray-900 capitalize">{userData?.plan || 'Free'}</p>
                            <p className="text-[10px] text-gray-400 mt-1">{userData?.credits ?? 0} credits remaining</p>
                          </div>
                        </div>

                        {/* Table */}
                        <div className="bg-white border border-slate-200/80 rounded-md overflow-hidden shadow-xs" style={{ borderRadius: '8px' }}>
                          {/* Table Header Bar */}
                          <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
                            <p className="text-xs font-bold text-gray-800">Transaction History</p>
                            <p className="text-[11px] text-gray-400">{txList.length} record{txList.length !== 1 ? 's' : ''}</p>
                          </div>

                          {txList.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 text-center">
                              <div className="w-12 h-12 bg-amber-50 border border-amber-200/60 rounded-md flex items-center justify-center mb-3" style={{ borderRadius: '6px' }}>
                                <ClipboardList className="w-6 h-6 text-amber-600" />
                              </div>
                              <p className="text-sm font-semibold text-gray-700 mb-1">No transactions yet</p>
                              <p className="text-xs text-gray-400 mb-4">Payments will appear here after your first purchase.</p>
                              <button
                                onClick={() => setAgencyActiveSection('credits')}
                                className="px-4 py-2 rounded-md text-xs font-semibold bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-md shadow-amber-500/25 border border-amber-400/50 hover:scale-[1.02] transition-all duration-200 inline-flex items-center gap-1.5 cursor-pointer"
                                style={{ borderRadius: '6px' }}
                              >
                                View Plans &amp; Credits →
                              </button>
                            </div>
                          ) : (
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="border-b border-slate-100 bg-slate-50/30">
                                    <th className="text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">Date</th>
                                    <th className="text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">Description</th>
                                    <th className="text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">Type</th>
                                    <th className="text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">Payment ID</th>
                                    <th className="text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">Amount</th>
                                    <th className="text-center text-[11px] font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">Status</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50 text-xs">
                                  {txList.map((tx: any, idx: number) => {
                                    const isPlan = tx.type === 'plan-change';
                                    const isTopUp = tx.type === 'top-up';
                                    const date = new Date(tx.timestamp);
                                    const payId = tx.razorpay_payment_id || tx.id || '';
                                    const shortId = payId ? payId.slice(-12).toUpperCase() : `TXN-${String(idx + 1).padStart(4, '0')}`;
                                    return (
                                      <tr key={tx.id || idx} className="hover:bg-gray-50/70 transition-colors">
                                        {/* Date */}
                                        <td className="px-5 py-3.5 whitespace-nowrap">
                                          <p className="text-xs font-medium text-gray-900">{date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                                          <p className="text-[11px] text-gray-400">{date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</p>
                                        </td>
                                        {/* Description */}
                                        <td className="px-5 py-3.5">
                                          <p className="text-xs font-semibold text-gray-900">{tx.description}</p>
                                          <p className="text-[11px] text-gray-400">
                                            {isPlan ? `→ ${String(tx.amount || '').toUpperCase()} Plan` : isTopUp ? `+${tx.amount} Credits added` : `${tx.amount}`}
                                          </p>
                                        </td>
                                        {/* Type Badge */}
                                        <td className="px-5 py-3.5 whitespace-nowrap">
                                          <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md border ${
                                            isPlan
                                              ? 'bg-violet-50 text-violet-700 border-violet-200'
                                              : isTopUp
                                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                              : 'bg-blue-50 text-blue-700 border-blue-200'
                                          }`} style={{ borderRadius: '4px' }}>
                                            {isPlan ? 'Plan Upgrade' : isTopUp ? 'Credit Top-up' : 'Credit'}
                                          </span>
                                        </td>
                                        {/* Payment ID */}
                                        <td className="px-5 py-3.5">
                                          <span className="font-mono text-[11px] text-gray-400 hover:text-gray-700 transition-colors cursor-default" title={payId}>
                                            {payId ? shortId : '—'}
                                          </span>
                                        </td>
                                        {/* Amount */}
                                        <td className="px-5 py-3.5 text-right whitespace-nowrap">
                                          <p className="text-sm font-bold text-gray-900">
                                            {tx.amountPaid ? `₹${Number(tx.amountPaid).toLocaleString('en-IN')}` : '—'}
                                          </p>
                                        </td>
                                        {/* Status */}
                                        <td className="px-5 py-3.5 text-center">
                                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md" style={{ borderRadius: '4px' }}>
                                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                                            Paid
                                          </span>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          )}

                          {/* Table Footer */}
                          {txList.length > 0 && (
                            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
                              <p className="text-[11px] text-gray-400">Showing {txList.length} of {txList.length} transactions · Amounts in INR</p>
                              <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
                                <svg className="w-3 h-3 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                                <span>Secured by Razorpay</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {agencyActiveSection === 'settings' && (
                    <Card className="bg-white border border-slate-200/80 shadow-xs rounded-md overflow-hidden w-full" style={{ borderRadius: '8px' }}>
                      <CardHeader className="border-b border-slate-100 bg-slate-50/50 p-6 md:p-8">
                        <CardTitle className="flex items-center text-xl font-bold text-gray-900">
                          <Settings className="mr-2.5 h-6 w-6 text-amber-600" />
                          Profile Branding & Contact Information
                        </CardTitle>
                        <CardDescription className="text-xs text-gray-500 mt-1">
                          Manage your agency profile branding, contact info, and business description
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="p-6 md:p-8 space-y-8">
                        {/* Agency Logo Upload Section */}
                        <div className="bg-slate-50 border border-slate-200/80 rounded-md p-6 flex flex-col md:flex-row items-center gap-6 shadow-xs" style={{ borderRadius: '6px' }}>
                          <div className="w-20 h-20 bg-white rounded-md border border-slate-200/80 shadow-xs flex items-center justify-center overflow-hidden shrink-0" style={{ borderRadius: '6px' }}>
                            {(agencyLogoUrl || userData?.logoUrl || userData?.agencyLogo) && !agencyLogoError ? (
                              <img
                                src={agencyLogoUrl || userData?.logoUrl || userData?.agencyLogo}
                                alt="Agency Logo"
                                className="w-full h-full object-contain p-1"
                                onError={() => setAgencyLogoError(true)}
                              />
                            ) : (
                              <Building2 className="h-8 w-8 text-slate-400" />
                            )}
                          </div>
                          <div className="flex-1 text-center md:text-left">
                            <h3 className="text-sm font-bold text-gray-900">Agency Branding Logo</h3>
                            <p className="text-xs text-gray-500 mt-1 max-w-lg leading-relaxed">
                              Upload a clean, professional company logo to stand out in travel listings and customer chats. We recommend a high-resolution PNG or JPG.
                            </p>
                            <label
                              className="mt-4 inline-flex items-center gap-2 bg-white/90 hover:bg-white text-slate-700 hover:text-slate-900 text-xs font-semibold px-4 py-2 rounded-md border border-slate-200/80 shadow-xs cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:border-slate-300"
                              style={{ borderRadius: '6px' }}
                            >
                              <span className="flex items-center gap-1.5"><Upload className="h-4 w-4 text-amber-600" /> Upload New Logo</span>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={handleAgencyLogoChange}
                                className="hidden"
                              />
                            </label>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <Label htmlFor="agencyName" className="text-xs font-semibold text-gray-600 mb-1.5 block">Agency Company Name</Label>
                            <Input
                              id="agencyName"
                              value={agencyCompanyName}
                              onChange={(e) => setAgencyCompanyName(e.target.value)}
                              className="bg-white border-gray-200 text-gray-800 rounded-md p-3.5 text-sm focus-visible:ring-orange-400 shadow-xs"
                              style={{ borderRadius: '6px' }}
                            />
                          </div>
                          <div>
                            <Label htmlFor="contactEmail" className="text-xs font-semibold text-gray-600 mb-1.5 block">Contact Email</Label>
                            <Input
                              id="contactEmail"
                              value={agencyContactEmail}
                              onChange={(e) => setAgencyContactEmail(e.target.value)}
                              className="bg-white border-gray-200 text-gray-800 rounded-md p-3.5 text-sm focus-visible:ring-orange-400 shadow-xs"
                              style={{ borderRadius: '6px' }}
                            />
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="description" className="text-xs font-semibold text-gray-600 mb-1.5 block">Agency Description & Specialization</Label>
                          <textarea
                            id="description"
                            className="w-full p-4 border border-gray-200 rounded-md text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 shadow-xs"
                            rows={4}
                            value={agencyDescription}
                            onChange={(e) => setAgencyDescription(e.target.value)}
                            placeholder="Tell travelers about your agency's expertise, popular tour packages, and premium services..."
                            style={{ borderRadius: '6px' }}
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Default Inclusions */}
                          <div className="space-y-4 bg-white p-5 border border-slate-200/80 rounded-md shadow-xs" style={{ borderRadius: '6px' }}>
                            <div className="flex justify-between items-center border-b border-gray-100 pb-2.5">
                              <Label className="text-xs font-bold text-gray-800 uppercase tracking-wider block">Default Inclusions</Label>
                              <button
                                type="button"
                                onClick={() => setAgencyDefaultInclusions(prev => [...prev, ''])}
                                className="h-7 px-2.5 text-[11px] rounded-md bg-white border border-slate-200/80 text-slate-700 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300 font-semibold shadow-xs flex items-center gap-1 transition-all duration-200 hover:scale-[1.02] cursor-pointer"
                                style={{ borderRadius: '6px' }}
                              >
                                <Plus className="h-3.5 w-3.5 text-amber-600" /> Add Option
                              </button>
                            </div>
                            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                              {agencyDefaultInclusions.map((item, index) => (
                                <div key={`def-inclusion-${index}`} className="flex items-center gap-2">
                                  <Input
                                    placeholder="e.g. 3 Star hotel stay, daily breakfast..."
                                    value={item}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setAgencyDefaultInclusions(prev => {
                                        const updated = [...prev];
                                        updated[index] = val;
                                        return updated;
                                      });
                                    }}
                                    className="flex-1 bg-gray-50/50 border-gray-200 text-gray-800 rounded-md text-xs h-9 focus-visible:ring-orange-400"
                                    style={{ borderRadius: '6px' }}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setAgencyDefaultInclusions(prev => prev.filter((_, i) => i !== index))}
                                    className="h-9 w-9 shrink-0 rounded-md bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 hover:text-red-700 flex items-center justify-center transition-all duration-200 hover:scale-[1.02] cursor-pointer"
                                    style={{ borderRadius: '6px' }}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              ))}
                              {agencyDefaultInclusions.length === 0 && (
                                <p className="text-[11px] text-gray-400 italic">No default inclusions defined yet.</p>
                              )}
                            </div>
                          </div>

                          {/* Default Exclusions */}
                          <div className="space-y-4 bg-white p-5 border border-slate-200/80 rounded-md shadow-xs" style={{ borderRadius: '6px' }}>
                            <div className="flex justify-between items-center border-b border-gray-100 pb-2.5">
                              <Label className="text-xs font-bold text-gray-800 uppercase tracking-wider block">Default Exclusions</Label>
                              <button
                                type="button"
                                onClick={() => setAgencyDefaultExclusions(prev => [...prev, ''])}
                                className="h-7 px-2.5 text-[11px] rounded-md bg-white border border-slate-200/80 text-slate-700 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300 font-semibold shadow-xs flex items-center gap-1 transition-all duration-200 hover:scale-[1.02] cursor-pointer"
                                style={{ borderRadius: '6px' }}
                              >
                                <Plus className="h-3.5 w-3.5 text-amber-600" /> Add Option
                              </button>
                            </div>
                            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                              {agencyDefaultExclusions.map((item, index) => (
                                <div key={`def-exclusion-${index}`} className="flex items-center gap-2">
                                  <Input
                                    placeholder="e.g. Flight tickets, personal expenses..."
                                    value={item}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setAgencyDefaultExclusions(prev => {
                                        const updated = [...prev];
                                        updated[index] = val;
                                        return updated;
                                      });
                                    }}
                                    className="flex-1 bg-gray-50/50 border-gray-200 text-gray-800 rounded-md text-xs h-9 focus-visible:ring-orange-400"
                                    style={{ borderRadius: '6px' }}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setAgencyDefaultExclusions(prev => prev.filter((_, i) => i !== index))}
                                    className="h-9 w-9 shrink-0 rounded-md bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 hover:text-red-700 flex items-center justify-center transition-all duration-200 hover:scale-[1.02] cursor-pointer"
                                    style={{ borderRadius: '6px' }}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              ))}
                              {agencyDefaultExclusions.length === 0 && (
                                <p className="text-[11px] text-gray-400 italic">No default exclusions defined yet.</p>
                              )}
                            </div>
                          </div>
                        </div>

                        <div>
                          <h3 className="text-sm font-bold text-gray-900 mb-3">Notification Preferences</h3>
                          <div className="space-y-3 bg-slate-50/70 border border-slate-200/80 rounded-md p-5 shadow-xs" style={{ borderRadius: '6px' }}>
                            <label className="flex items-center gap-3 cursor-pointer">
                              <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-orange-600 focus:ring-orange-400" defaultChecked />
                              <span className="text-xs font-semibold text-gray-700">Email notifications for new user bookings & inquiries</span>
                            </label>
                            <label className="flex items-center gap-3 cursor-pointer">
                              <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-orange-600 focus:ring-orange-400" defaultChecked />
                              <span className="text-xs font-semibold text-gray-700">SMS notifications for urgent customer chat messages</span>
                            </label>
                            <label className="flex items-center gap-3 cursor-pointer">
                              <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-orange-600 focus:ring-orange-400" />
                              <span className="text-xs font-semibold text-gray-700">Marketing emails, seasonal promotions & platform updates</span>
                            </label>
                          </div>
                        </div>

                        <div className="pt-2 flex justify-end">
                          <button
                            onClick={handleSaveAgencySettings}
                            disabled={savingAgencySettings}
                            className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs sm:text-sm font-semibold px-6 py-2.5 rounded-md shadow-md shadow-amber-500/25 border border-amber-400/50 hover:scale-[1.02] transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            style={{ borderRadius: '6px' }}
                          >
                            {savingAgencySettings ? 'Saving Settings...' : 'Save All Settings'}
                          </button>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {agencyActiveSection === 'credits' && (
                    <Card id="plans-and-credits-card" className="bg-white border border-slate-200/80 shadow-xs rounded-md overflow-hidden w-full" style={{ borderRadius: '8px' }}>
                      <CardHeader className="border-b border-slate-100 bg-slate-50/50 p-6 md:p-8">
                        <CardTitle className="flex items-center text-xl font-bold text-gray-900">
                          <CreditCard className="mr-2.5 h-6 w-6 text-amber-600" />
                          Plan & Message Credits
                        </CardTitle>
                        <CardDescription className="text-xs text-gray-500 mt-1">
                          Manage subscription plans, buy add-on credits, and track transaction history
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="p-6 md:p-8 space-y-8">
                        {/* Hero Header */}
                        <div className="bg-slate-50 border border-slate-200/80 rounded-md p-6 flex flex-col md:flex-row items-center gap-6 shadow-xs" style={{ borderRadius: '6px' }}>
                          <div className="w-20 h-20 bg-white rounded-md border border-slate-200/80 shadow-xs flex items-center justify-center overflow-hidden shrink-0" style={{ borderRadius: '6px' }}>
                            <CreditCard className="h-8 w-8 text-slate-400" />
                          </div>
                          <div className="flex-1 text-center md:text-left">
                            <div className="inline-flex items-center gap-1.5 bg-white text-slate-800 text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-md border border-slate-200/80 shadow-xs mb-3" style={{ borderRadius: '6px' }}>
                              <CreditCard className="w-3.5 h-3.5 mr-1 text-amber-600" /> Billing & Subscription Control Panel
                            </div>
                            <h3 className="text-sm font-bold text-gray-900">
                              Premium Reply Credits
                            </h3>
                            <p className="text-xs text-gray-500 mt-1 max-w-lg leading-relaxed">
                              Select subscription plans or purchase add-on credit packages to reply to traveler inquiries.
                            </p>
                          </div>
                        </div>

                        {/* Current Plan Summary Card & Stats */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div className="md:col-span-1 bg-white border border-slate-200/80 shadow-xs rounded-md p-5 relative overflow-hidden flex flex-col justify-between" style={{ borderRadius: '6px' }}>
                            <div>
                              <div className="flex justify-between items-center mb-4">
                                <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Current Plan</h3>
                                <Badge className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wide border ${userData?.plan === 'premium' ? 'bg-purple-100 text-purple-700 border-purple-200' :
                                    userData?.plan === 'starter' ? 'bg-amber-100 text-amber-700 border-amber-200' :
                                      'bg-blue-100 text-blue-700 border-blue-200'
                                  }`} style={{ borderRadius: '4px' }}>
                                  {userData?.plan || 'Free'} Plan
                                </Badge>
                              </div>
                              <div className="space-y-3">
                                <div>
                                  <p className="text-2xl font-extrabold text-gray-900">
                                    {`${userData?.credits ?? 0} Credits`}
                                  </p>
                                  <p className="text-[10px] text-gray-500 mt-0.5">Cycle balance remaining</p>
                                </div>
                                <div className="border-t border-slate-100 pt-3 space-y-1.5 text-[11px]">
                                  <div className="flex justify-between">
                                    <span className="text-gray-500">Cycle Ends</span>
                                    <span className="font-semibold text-gray-800">July 16, 2026</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-500">Unlocked Travelers</span>
                                    <span className="font-semibold text-gray-800">
                                      {(userData?.unlockedUsers || []).filter((u: any) => typeof u === 'string' || u.expiresAt > Date.now()).length} Travelers
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Quick Stats Grid */}
                          <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="bg-white border border-slate-200/80 shadow-xs rounded-md p-4 flex items-center justify-between" style={{ borderRadius: '6px' }}>
                              <div className="space-y-0.5">
                                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Per Reply Cost</p>
                                <h4 className="text-sm font-bold text-gray-900">
                                  {userData?.plan === 'free' && '50 Credits'}
                                  {userData?.plan === 'starter' && '50 Credits'}
                                  {userData?.plan === 'premium' && '40 Credits'}
                                  {userData?.plan === 'vip' && '30 Credits'}
                                </h4>
                                <p className="text-[10px] text-gray-500 leading-snug">
                                  Deducted per unlock
                                </p>
                              </div>
                              <div className="w-10 h-10 bg-amber-50 border border-amber-200/60 rounded-md flex items-center justify-center text-amber-600 text-lg" style={{ borderRadius: '6px' }}>
                                <MessageSquare className="w-5 h-5" />
                              </div>
                            </div>

                            <div className="bg-white border border-slate-200/80 shadow-xs rounded-md p-4 flex items-center justify-between" style={{ borderRadius: '6px' }}>
                              <div className="space-y-0.5">
                                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Transactions</p>
                                <h4 className="text-sm font-bold text-gray-900">
                                  {(userData?.creditHistory || []).length} Operations
                                </h4>
                                <p className="text-[10px] text-gray-500 leading-snug">Logs of top-ups & usage</p>
                              </div>
                              <div className="w-10 h-10 bg-amber-50 border border-amber-200/60 rounded-md flex items-center justify-center text-amber-600 text-lg" style={{ borderRadius: '6px' }}>
                                <ClipboardList className="w-5 h-5" />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Developer Testing Panel inside Dashboard */}
                        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/80 rounded-md p-4 shadow-xs" style={{ borderRadius: '6px' }}>
                          <h4 className="text-xs font-bold text-orange-800 flex items-center gap-1.5 mb-1.5">
                            <Wrench className="w-4 h-4 mr-1.5 text-amber-600" /> Developer Billing & Credits Simulator
                          </h4>
                          <p className="text-[10px] text-orange-700 mb-3 leading-relaxed">
                            Use these controls to simulate plan resets, add credits, and verify unlock behavior. Changes reflect in Firebase Firestore immediately.
                          </p>
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => simulateResetCredits('free')}
                              className="bg-white hover:bg-slate-50 text-[11px] border border-slate-200/80 font-semibold rounded-md text-blue-700 py-1.5 px-3 shadow-xs hover:border-slate-300 hover:scale-[1.02] transition-all duration-200 cursor-pointer"
                              style={{ borderRadius: '6px' }}
                            >
                              Reset to Free
                            </button>
                            <button
                              onClick={() => simulateResetCredits('starter')}
                              className="bg-white hover:bg-slate-50 text-[11px] border border-slate-200/80 font-semibold rounded-md text-amber-700 py-1.5 px-3 shadow-xs hover:border-slate-300 hover:scale-[1.02] transition-all duration-200 cursor-pointer"
                              style={{ borderRadius: '6px' }}
                            >
                              Reset to Starter
                            </button>
                            <button
                              onClick={() => simulateResetCredits('premium')}
                              className="bg-white hover:bg-slate-50 text-[11px] border border-slate-200/80 font-semibold rounded-md text-purple-700 py-1.5 px-3 shadow-xs hover:border-slate-300 hover:scale-[1.02] transition-all duration-200 cursor-pointer"
                              style={{ borderRadius: '6px' }}
                            >
                              Reset to Premium
                            </button>
                            <button
                              onClick={async () => {
                                if (!user || !userData) return;
                                const currentCredits = userData.credits || 0;
                                const txId = 'TX-SIM-' + Math.random().toString(36).substr(2, 9).toUpperCase();
                                const newTransaction = {
                                  id: txId,
                                  type: 'top-up',
                                  amount: 500,
                                  description: 'Simulated Developer top-up',
                                  timestamp: Date.now()
                                };
                                await updateDoc(doc(getDbInstance()!, 'users', user.uid), {
                                  credits: currentCredits + 500,
                                  creditHistory: [newTransaction, ...(userData.creditHistory || [])]
                                });
                                alert('Simulated: Added 500 Credits');
                              }}
                              className="bg-white hover:bg-slate-50 text-[11px] border border-slate-200/80 font-semibold rounded-md text-emerald-700 py-1.5 px-3 shadow-xs hover:border-slate-300 hover:scale-[1.02] transition-all duration-200 cursor-pointer"
                              style={{ borderRadius: '6px' }}
                            >
                              +500 Credits
                            </button>
                          </div>
                        </div>

                        {/* Plan Grid */}
                        <div id="plans-comparison-grid" className="pt-2">
                          <div className="mb-4">
                            <h2 className="text-base font-bold text-gray-900 mb-0.5">Subscription Plans</h2>
                            <p className="text-[11px] text-gray-500">Select the perfect tier to unlock and respond to traveler inquiries. Upgrade or downgrade anytime.</p>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            {/* Free Plan */}
                            <div className={`bg-white border rounded-md p-4 shadow-xs flex flex-col justify-between plan-card-hover ${userData?.plan === 'free' || !userData?.plan ? 'ring-2 ring-amber-500 border-amber-400' : 'border-slate-200/80'
                              }`} style={{ borderRadius: '6px' }}>
                              <div>
                                <div className="mb-2">
                                  <span className="text-[8px] font-bold text-blue-600 uppercase tracking-widest bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-200" style={{ borderRadius: '4px' }}>Basic Tier</span>
                                </div>
                                <h3 className="text-sm font-bold text-gray-900 mb-0.5">Free Plan</h3>
                                <div className="flex items-baseline gap-1 my-1.5">
                                  <span className="text-lg font-extrabold text-gray-900">₹0</span>
                                  <span className="text-[9px] text-gray-500 font-medium">/ year</span>
                                </div>
                                <p className="text-[10px] text-gray-500 mb-4 leading-relaxed">Perfect for simple search and quick traveler responses.</p>
                                <ul className="space-y-2 text-[10px] text-gray-600 border-t border-slate-100 pt-3 mb-4">
                                  <li className="flex items-center gap-1.5">
                                    <span className="text-green-500 font-bold">✓</span>
                                    <span><strong>2 Listings</strong></span>
                                  </li>
                                  <li className="flex items-center gap-1.5">
                                    <span className="text-green-500 font-bold">✓</span>
                                    <span><strong>2 Leads</strong></span>
                                  </li>
                                </ul>
                              </div>
                              <button
                                onClick={() => upgradePlan('free')}
                                disabled={userData?.plan === 'free' || !userData?.plan}
                                className={`w-full text-xs font-semibold py-2.5 rounded-md transition-all duration-200 flex items-center justify-center cursor-pointer ${
                                  userData?.plan === 'free' || !userData?.plan
                                    ? 'bg-slate-100 border border-slate-200 text-slate-400 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-md shadow-amber-500/25 border border-amber-400/50 hover:scale-[1.02]'
                                }`}
                                style={{ borderRadius: '6px' }}
                              >
                                {userData?.plan === 'free' || !userData?.plan ? 'Current Plan' : 'Select Free Plan'}
                              </button>
                            </div>

                            {/* Standard Plan */}
                            <div className={`bg-white border rounded-md p-4 shadow-xs flex flex-col justify-between plan-card-hover ${userData?.plan === 'starter' ? 'ring-2 ring-amber-500 border-amber-400' : 'border-slate-200/80'
                              }`} style={{ borderRadius: '6px' }}>
                              <div>
                                <div className="mb-2 flex justify-between items-center">
                                  <span className="text-[8px] font-bold text-amber-600 uppercase tracking-widest bg-amber-50 px-2.5 py-0.5 rounded-md border border-amber-200" style={{ borderRadius: '4px' }}>Most Popular</span>
                                </div>
                                <h3 className="text-sm font-bold text-gray-900 mb-0.5">Standard Plan</h3>
                                <div className="flex items-baseline gap-1 my-1.5">
                                  <span className="text-lg font-extrabold text-gray-900">₹{pricingConfig.starterPrice.toLocaleString('en-IN')}</span>
                                  <span className="text-[9px] text-gray-500 font-medium">/ year</span>
                                </div>
                                <p className="text-[10px] text-gray-500 mb-4 leading-relaxed">Best for active agencies replying to holiday inquiries.</p>
                                <ul className="space-y-2 text-[10px] text-gray-600 border-t border-slate-100 pt-3 mb-4">
                                  <li className="flex items-center gap-1.5">
                                    <span className="text-green-500 font-bold">✓</span>
                                    <span><strong>10 Listings</strong></span>
                                  </li>
                                  <li className="flex items-center gap-1.5">
                                    <span className="text-green-500 font-bold">✓</span>
                                    <span><strong>200 credit</strong> per lead</span>
                                  </li>
                                </ul>
                              </div>
                              <button
                                onClick={() => openUpgradeCheckout('starter')}
                                disabled={userData?.plan === 'starter'}
                                className={`w-full text-xs font-semibold py-2.5 rounded-md transition-all duration-200 flex items-center justify-center cursor-pointer ${
                                  userData?.plan === 'starter'
                                    ? 'bg-slate-100 border border-slate-200 text-slate-400 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-md shadow-amber-500/25 border border-amber-400/50 hover:scale-[1.02]'
                                }`}
                                style={{ borderRadius: '6px' }}
                              >
                                {userData?.plan === 'starter' ? 'Current Plan' : 'Upgrade to Standard'}
                              </button>
                            </div>

                            {/* Premium Plan */}
                            <div className={`bg-white border rounded-md p-4 shadow-xs flex flex-col justify-between plan-card-hover ${userData?.plan === 'premium' ? 'ring-2 ring-purple-500 border-purple-400' : 'border-slate-200/80'
                              }`} style={{ borderRadius: '6px' }}>
                              <div>
                                <div className="mb-2">
                                  <span className="text-[8px] font-bold text-purple-600 uppercase tracking-widest bg-purple-50 px-2.5 py-0.5 rounded-md border border-purple-200" style={{ borderRadius: '4px' }}>Power User</span>
                                </div>
                                <h3 className="text-sm font-bold text-gray-900 mb-0.5">Premium Plan</h3>
                                <div className="flex items-baseline gap-1 my-1.5">
                                  <span className="text-lg font-extrabold text-gray-900">₹{pricingConfig.premiumPrice.toLocaleString('en-IN')}</span>
                                  <span className="text-[9px] text-gray-500 font-medium">/ year</span>
                                </div>
                                <p className="text-[10px] text-gray-500 mb-4 leading-relaxed">For frequent high-volume agency messaging needs.</p>
                                <ul className="space-y-2 text-[10px] text-gray-600 border-t border-slate-100 pt-3 mb-4">
                                  <li className="flex items-center gap-1.5">
                                    <span className="text-green-500 font-bold">✓</span>
                                    <span><strong>50 Listings</strong></span>
                                  </li>
                                  <li className="flex items-center gap-1.5">
                                    <span className="text-green-500 font-bold">✓</span>
                                    <span><strong>175 credit</strong> per lead</span>
                                  </li>
                                </ul>
                              </div>
                              <button
                                onClick={() => openUpgradeCheckout('premium')}
                                disabled={userData?.plan === 'premium'}
                                className={`w-full text-xs font-semibold py-2.5 rounded-md transition-all duration-200 flex items-center justify-center cursor-pointer ${
                                  userData?.plan === 'premium'
                                    ? 'bg-slate-100 border border-slate-200 text-slate-400 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-md shadow-amber-500/25 border border-amber-400/50 hover:scale-[1.02]'
                                }`}
                                style={{ borderRadius: '6px' }}
                              >
                                {userData?.plan === 'premium' ? 'Current Plan' : 'Upgrade to Premium'}
                              </button>
                            </div>
                            
                            {/* VIP Plan */}
                            <div className={`bg-white border rounded-md p-4 shadow-xs flex flex-col justify-between plan-card-hover ${userData?.plan === 'vip' ? 'ring-2 ring-rose-500 border-rose-400' : 'border-slate-200/80'
                              }`} style={{ borderRadius: '6px' }}>
                              <div>
                                <div className="mb-2">
                                  <span className="text-[8px] font-bold text-rose-600 uppercase tracking-widest bg-rose-50 px-2.5 py-0.5 rounded-md border border-rose-200" style={{ borderRadius: '4px' }}>Elite Tier</span>
                                </div>
                                <h3 className="text-sm font-bold text-gray-900 mb-0.5">VIP Plan</h3>
                                <div className="flex items-baseline gap-1 my-1.5">
                                  <span className="text-lg font-extrabold text-gray-900">₹{pricingConfig.vipPrice.toLocaleString('en-IN')}</span>
                                  <span className="text-[9px] text-gray-500 font-medium">/ year</span>
                                </div>
                                <p className="text-[10px] text-gray-500 mb-4 leading-relaxed">Ultimate package for top agencies wanting maximum visibility.</p>
                                <ul className="space-y-2 text-[10px] text-gray-600 border-t border-slate-100 pt-3 mb-4">
                                  <li className="flex items-center gap-1.5">
                                    <span className="text-green-500 font-bold">✓</span>
                                    <span><strong>Unlimited Listings</strong></span>
                                  </li>
                                  <li className="flex items-center gap-1.5">
                                    <span className="text-green-500 font-bold">✓</span>
                                    <span><strong>150 credit</strong> per lead</span>
                                  </li>
                                </ul>
                              </div>
                              <button
                                onClick={() => openUpgradeCheckout('vip')}
                                disabled={userData?.plan === 'vip'}
                                className={`w-full text-xs font-semibold py-2.5 rounded-md transition-all duration-200 flex items-center justify-center cursor-pointer ${
                                  userData?.plan === 'vip'
                                    ? 'bg-slate-100 border border-slate-200 text-slate-400 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-md shadow-amber-500/25 border border-amber-400/50 hover:scale-[1.02]'
                                }`}
                                style={{ borderRadius: '6px' }}
                              >
                                {userData?.plan === 'vip' ? 'Current Plan' : 'Upgrade to VIP'}
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Link to dedicated Transactions page */}
                        <div
                          onClick={() => setAgencyActiveSection('transactions')}
                          className="flex items-center justify-between bg-slate-50 border border-slate-200/80 hover:border-amber-300 hover:bg-amber-50/50 rounded-md p-5 cursor-pointer transition-all group shadow-xs"
                          style={{ borderRadius: '6px' }}
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-amber-100 group-hover:bg-amber-200 rounded-md flex items-center justify-center transition-colors" style={{ borderRadius: '6px' }}>
                              <ClipboardList className="w-5 h-5 text-amber-600" />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-gray-900">Payment History</p>
                              <p className="text-[11px] text-gray-500">{(userData?.creditHistory || []).length} transaction{(userData?.creditHistory || []).length !== 1 ? 's' : ''} · Plan upgrades & credit top-ups</p>
                            </div>
                          </div>
                          <div
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-white border border-slate-200/80 text-amber-600 shadow-xs group-hover:bg-amber-500 group-hover:text-white group-hover:border-amber-500 transition-all duration-200"
                            style={{ borderRadius: '6px' }}
                          >
                            View All →
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </>
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Clock className="w-8 h-8 text-yellow-600" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">Account Pending Approval</h3>
                    <p className="text-gray-600 mb-4">
                      Your agency registration is being reviewed by our admin team.
                      You'll receive access to your dashboard once approved.
                    </p>
                    <p className="text-sm text-gray-500">
                      Usually takes 24-48 hours for review.
                    </p>
                  </CardContent>
                </Card>
              )}
            </main>
          </div>
          <CheckoutModal
            isOpen={checkoutModalOpen}
            onClose={() => setCheckoutModalOpen(false)}
            targetPlan={checkoutTargetPlan}
            planTitle={checkoutPlanTitle}
            originalPrice={checkoutOriginalPrice}
            agencyId={user?.uid || ''}
            agencyName={userData?.companyName || userData?.name}
            agencyEmail={userData?.email}
            onSuccess={(newPlan) => {
              window.location.reload();
            }}
          />
        </div>
      );
    }



  // Journey Details Modal Component
  function JourneyDetailsModal({ booking, onClose }: { booking: any; onClose: () => void }) {
    console.log('Modal component rendering with booking:', booking);

    if (!booking) return null;

    const currencySymbol = booking.packageType === 'international' ? '$' : '₹';

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-bold">Journey Details</h2>
                <p className="text-blue-100 mt-1">{booking.listingTitle}</p>
              </div>
              <button
                onClick={onClose}
                className="bg-white/20 hover:bg-white/30 rounded-full p-2 transition-colors"
              >
                <span className="text-xl">✕</span>
              </button>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Status Badge */}
            <div className="flex items-center justify-between">
              <span className={`px-4 py-2 rounded-full text-sm font-medium ${booking.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                  booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                }`}>
                {booking.status === 'confirmed' ? <span className="flex items-center gap-1"><CheckCircle className="w-4 h-4 text-green-600" /> Confirmed</span> :
                  booking.status === 'pending' ? <span className="flex items-center gap-1"><Clock className="w-4 h-4 text-yellow-600" /> Pending</span> : <span className="flex items-center gap-1"><XCircle className="w-4 h-4 text-red-600" /> Cancelled</span>}
              </span>
              <span className="text-gray-500 text-sm">
                Booked on {booking.createdAtFormatted}
              </span>
            </div>

            {/* Booking Info */}
            <div className="bg-gray-50 p-5 rounded-xl">
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-gray-700" /> Booking Information
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="bg-white p-3 rounded-lg">
                  <span className="text-gray-500 text-xs uppercase tracking-wide block">Reference</span>
                  <p className="font-mono font-semibold text-gray-800">{booking.bookingReference}</p>
                </div>
                <div className="bg-white p-3 rounded-lg">
                  <span className="text-gray-500 text-xs uppercase tracking-wide block">Travel Date</span>
                  <p className="font-semibold text-gray-800">{booking.travelDate || 'Not specified'}</p>
                </div>
                <div className="bg-white p-3 rounded-lg">
                  <span className="text-gray-500 text-xs uppercase tracking-wide block">Travelers</span>
                  <p className="font-semibold text-gray-800">{booking.travelers} {booking.travelers === 1 ? 'person' : 'people'}</p>
                </div>
                <div className="bg-white p-3 rounded-lg">
                  <span className="text-gray-500 text-xs uppercase tracking-wide block">Package Type</span>
                  <p className="font-semibold text-gray-800">
                    {booking.packageType === 'international' ? <span className="flex items-center gap-1"><Globe className="w-4 h-4 text-blue-600" /> International</span> : <span className="flex items-center gap-1"><HomeIcon className="w-4 h-4 text-green-600" /> Domestic</span>}
                  </p>
                </div>
                <div className="bg-white p-3 rounded-lg col-span-2">
                  <span className="text-gray-500 text-xs uppercase tracking-wide block">Agency</span>
                  <p className="font-semibold text-gray-800">{booking.agencyName}</p>
                </div>
              </div>
            </div>

            {/* Journey Details */}
            {booking.journeyDetails ? (
              <div className="space-y-4">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <Plane className="w-5 h-5 text-gray-700" /> Travel Itinerary
                </h3>

                {booking.journeyDetails.flight && (
                  <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
                    <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                      <Plane className="w-4 h-4 text-blue-700" /> Flight Information
                    </h4>
                    <p className="text-blue-800 whitespace-pre-line">{booking.journeyDetails.flight}</p>
                  </div>
                )}

                {booking.journeyDetails.hotel && (
                  <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-r-lg">
                    <h4 className="font-semibold text-green-900 mb-2 flex items-center gap-2">
                      <Building className="w-4 h-4 text-green-700" /> Hotel Accommodation
                    </h4>
                    <p className="text-green-800 whitespace-pre-line">{booking.journeyDetails.hotel}</p>
                  </div>
                )}

                {booking.journeyDetails.itinerary && (
                  <div className="bg-purple-50 border-l-4 border-purple-500 p-4 rounded-r-lg">
                    <h4 className="font-semibold text-purple-900 mb-2 flex items-center gap-2">
                      <ClipboardList className="w-4 h-4 text-purple-700" /> Day-by-Day Itinerary
                    </h4>
                    <div className="text-purple-800 whitespace-pre-line leading-relaxed">
                      {booking.journeyDetails.itinerary}
                    </div>
                  </div>
                )}

                {booking.journeyDetails.additionalNotes && (
                  <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded-r-lg">
                    <h4 className="font-semibold text-yellow-900 mb-2 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-yellow-700" /> Additional Notes
                    </h4>
                    <p className="text-yellow-800">{booking.journeyDetails.additionalNotes}</p>
                  </div>
                )}

                {!booking.journeyDetails.flight && !booking.journeyDetails.hotel && !booking.journeyDetails.itinerary && (
                  <div className="bg-yellow-50 p-4 rounded-lg text-center">
                    <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Clock className="w-6 h-6 text-yellow-600" />
                    </div>
                    <h3 className="font-semibold mb-2">Journey Details Being Prepared</h3>
                    <p className="text-yellow-800">
                      Your agency is finalizing your complete travel itinerary. Check back soon!
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-yellow-50 border border-yellow-200 p-6 rounded-xl text-center">
                <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Clock className="w-8 h-8 text-yellow-600" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Journey Details Coming Soon</h3>
                <p className="text-yellow-800">
                  Your agency is preparing your complete travel itinerary. You'll receive flight, hotel, and activity details within 24 hours of booking confirmation.
                </p>
              </div>
            )}

            {/* Special Requests */}
            {booking.specialRequests && (
              <div className="bg-pink-50 border-l-4 border-pink-500 p-4 rounded-r-lg">
                <h4 className="font-semibold text-pink-900 mb-2 flex items-center gap-1.5"><FileText className="w-4 h-4 text-pink-700" /> Your Special Requests</h4>
                <p className="text-pink-800">{booking.specialRequests}</p>
              </div>
            )}

            {/* Payment Summary */}
            <div className="bg-gray-50 p-5 rounded-xl">
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-gray-700" /> Payment Summary
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Package Cost ({booking.travelers} traveler{booking.travelers > 1 ? 's' : ''})</span>
                  <span className="font-medium">
                    {currencySymbol}{parseFloat(booking.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="border-t pt-2 flex justify-between">
                  <span className="font-semibold">Total Paid</span>
                  <span className="font-bold text-green-600 text-xl">
                    {currencySymbol}{parseFloat(booking.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="bg-blue-50 p-5 rounded-xl">
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <Phone className="w-5 h-5 text-blue-700" /> Contact & Emergency Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-blue-700 font-medium block">Agency</span>
                  <p className="text-blue-900">{booking.agencyName}</p>
                </div>
                <div>
                  <span className="text-blue-700 font-medium block">Your Contact</span>
                  <p className="text-blue-900">{booking.userName} • {booking.userPhone || 'No phone'}</p>
                </div>
                {booking.journeyDetails?.emergencyContact && (
                  <div className="md:col-span-2">
                    <span className="text-blue-700 font-medium block">Emergency Contact</span>
                    <p className="text-blue-900">{booking.journeyDetails.emergencyContact}</p>
                  </div>
                )}
              </div>
              <p className="text-xs text-blue-600 mt-4 bg-blue-100 p-2 rounded">
                <Info className="w-4 h-4 inline mr-1 text-blue-600" /> Keep this information handy during your travels. Contact your agency for any assistance.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3 pt-4 border-t">
              <Button onClick={onClose} variant="outline" className="flex-1">
                Close
              </Button>
              <Button
                onClick={() => window.print()}
                variant="outline"
                className="flex-1 flex items-center justify-center gap-1.5"
              >
                <Printer className="w-4 h-4" /> Print Details
              </Button>
              {booking.status === 'confirmed' && (
                <Button
                  className="flex-1 bg-green-600 hover:bg-green-700 flex items-center justify-center gap-1.5"
                  onClick={() => {
                    // Share functionality
                    const shareData = {
                      title: `My Travel Booking - ${booking.listingTitle}`,
                      text: `Booking Reference: ${booking.bookingReference}\nTravel Date: ${booking.travelDate || 'TBD'}`,
                      url: window.location.href,
                    };
                    if (navigator.share) {
                      navigator.share(shareData).catch((err) => console.error('Error sharing:', err));
                    } else {
                      navigator.clipboard.writeText(shareData.url).then(() => {
                        alert('Booking details link copied to clipboard!');
                      });
                    }
                  }}
                >
                  <Share2 className="w-4 h-4" /> Share
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Fallback for unauthenticated admin/agency routes
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center bg-[url('https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=2021&auto=format&fit=crop')] bg-cover bg-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>
      <div className="z-10 bg-white p-8 rounded-3xl shadow-2xl flex flex-col items-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Admin & Agency Portal</h2>
        <p className="text-gray-600 mb-6 text-center max-w-sm">Please log in to access your dashboard. The credentials must correspond to a registered administrative or agency account.</p>
        <button 
          onClick={() => setShowAuthModal(true)}
          className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-8 rounded-xl transition-all hover:scale-105 hover:shadow-lg"
        >
          Open Login
        </button>
      </div>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => {}} // Cannot close on restricted routes
        initialTab={routeMode === 'agency' ? 'signup' : 'login'}
        onLogin={signIn}
        onRegister={handleAuthModalRegister}
        onGoogleSignIn={signInWithGoogle}
        googleUser={user}
      />

      {/* Checkout Modal Overlay for Agency Plan Upgrades */}
      <CheckoutModal
        isOpen={checkoutModalOpen}
        onClose={() => setCheckoutModalOpen(false)}
        targetPlan={checkoutTargetPlan}
        planTitle={checkoutPlanTitle}
        originalPrice={checkoutOriginalPrice}
        agencyId={user?.uid || ''}
        agencyName={userData?.companyName || userData?.name}
        agencyEmail={userData?.email}
        onSuccess={(newPlan) => {
          window.location.reload();
        }}
      />
    </div>
  );
}
