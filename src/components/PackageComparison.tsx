'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  ChevronLeft,
  Share2,
  Trash2,
  Star,
  Calendar,
  Utensils,
  Bus,
  Hotel,
  Tag,
  XCircle,
  Plus,
  MapPin,
  ExternalLink,
  CheckCircle,
  Scale,
  Building2,
  Layers,
  Compass
} from 'lucide-react';
import { ComparisonPackage, useComparison } from '@/contexts/ComparisonContext';
import { optimizeImageUrl } from '@/lib/imageOptimization';
import { getDbInstance } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

interface PackageComparisonProps {
  onBack: () => void;
  onChat: (agencyId: string, agencyName: string) => void;
  onView?: (pkg: any) => void;
  onBrowsePackages?: () => void;
  listings?: any[];
}

// Helpers for data extraction
const getMainImage = (pkg: ComparisonPackage) => {
  if (pkg.itinerary && pkg.itinerary.length > 0) {
    for (const day of pkg.itinerary) {
      if (day.imageUrls && day.imageUrls.length > 0 && day.imageUrls[0]) return day.imageUrls[0];
      if (day.imageUrl) return day.imageUrl;
    }
  }
  if (pkg.placesCovered && pkg.placesCovered.length > 0 && 
      pkg.placesCovered[0].imageUrls && pkg.placesCovered[0].imageUrls.length > 0) {
    return pkg.placesCovered[0].imageUrls[0];
  }
  if (pkg.photos && pkg.photos.length > 0) {
    return pkg.photos[0];
  }
  return null;
};

const parseList = (text?: string) => {
  if (!text) return [];
  return text.split('\n').map(s => s.trim()).filter(Boolean);
};

const getMealPlanClean = (inclusions?: string) => {
  if (!inclusions) return 'As per Itinerary';
  const incl = inclusions.toLowerCase();
  const meals: string[] = [];
  if (incl.includes('breakfast')) meals.push('Breakfast');
  if (incl.includes('lunch')) meals.push('Lunch');
  if (incl.includes('dinner')) meals.push('Dinner');
  if (meals.length === 3) return 'All Meals (Breakfast, Lunch, Dinner)';
  if (meals.length > 0) return meals.join(' & ');
  if (incl.includes('meal')) return 'Meals Included';
  return 'As per Itinerary';
};

const getTransferClean = (inclusions?: string) => {
  if (!inclusions) return 'Airport Transfers';
  const incl = inclusions.toLowerCase();
  if (incl.includes('private cab') || incl.includes('private transfer') || incl.includes('private car')) return 'Private Cab / Car';
  if (incl.includes('shared')) return 'Shared Transfers';
  if (incl.includes('airport')) return 'Airport Transfers';
  if (incl.includes('transfer') || incl.includes('transport') || incl.includes('cab')) return 'Transfers Included';
  return 'Airport Transfers';
};

const getHotelTypeClean = (pkg: ComparisonPackage) => {
  if (pkg.hotelTypes && Array.isArray(pkg.hotelTypes) && pkg.hotelTypes.length > 0) {
    return pkg.hotelTypes.map((h: any) => {
      const str = typeof h === 'string' ? h.trim() : (h?.name || h?.type || String(h || ''));
      if (!str) return 'Standard Hotels';
      if (str.toLowerCase() === 'budget') return 'Budget Stays';
      if (str.toLowerCase() === 'standard' || str.toLowerCase().includes('3')) return '3★ Standard Hotels';
      if (str.toLowerCase() === 'deluxe' || str.toLowerCase().includes('4')) return '4★ Deluxe Resorts';
      if (str.toLowerCase() === 'luxury' || str.toLowerCase().includes('5')) return '5★ Luxury Hotels';
      return str.charAt(0).toUpperCase() + str.slice(1);
    }).join(', ');
  }
  return 'Standard Hotels';
};

const getPlacesCoveredClean = (pkg: ComparisonPackage) => {
  if (pkg.placesCovered && Array.isArray(pkg.placesCovered) && pkg.placesCovered.length > 0) {
    const list = pkg.placesCovered
      .map((p: any) => {
        if (!p) return '';
        if (typeof p === 'string') return p;
        if (typeof p === 'object') return p.name || p.place || p.title || p.destination || p.cityName || '';
        return '';
      })
      .map((s: string) => String(s).trim())
      .filter((s: string) => Boolean(s) && s.toLowerCase() !== 'photos');

    if (list.length > 0) return list.slice(0, 5).join(', ');
  }
  if (pkg.stateName) return pkg.stateName;
  if (pkg.countryName) return pkg.countryName;
  return 'Top Destinations';
};

const getTourCategoriesClean = (pkg: ComparisonPackage) => {
  if (pkg.tourCategories && Array.isArray(pkg.tourCategories) && pkg.tourCategories.length > 0) {
    const list = pkg.tourCategories.map((c: any) => typeof c === 'string' ? c : (c?.name || String(c))).filter(Boolean);
    if (list.length > 0) return list.join(', ');
  }
  return pkg.packageType === 'international' ? 'International Tour' : 'Domestic Tour';
};

export default function PackageComparison({ onBack, onChat, onView, onBrowsePackages, listings = [] }: PackageComparisonProps) {
  const { comparisonList, removeFromComparison, clearComparison } = useComparison();
  const [agencyNamesMap, setAgencyNamesMap] = useState<Record<string, string>>({});

  // Fetch real agency company names for packages in comparison if not directly in package data
  useEffect(() => {
    const fetchAgencyNames = async () => {
      const db = getDbInstance();
      const updates: Record<string, string> = {};

      for (const pkg of comparisonList) {
        // 1. Check in-memory listings
        const matchedListing = listings.find((l: any) => l.id === pkg.id);
        const resolvedFromListing = matchedListing?.agencyName || matchedListing?.agencyData?.companyName || matchedListing?.companyName;
        if (resolvedFromListing && resolvedFromListing !== 'Verified Agency' && resolvedFromListing !== 'Travel Agency' && resolvedFromListing !== 'Travel Partner') {
          updates[pkg.id] = resolvedFromListing;
          continue;
        }

        // 2. Check if pkg directly has valid company name
        if (pkg.agencyData?.companyName) {
          updates[pkg.id] = pkg.agencyData.companyName;
          continue;
        }
        if (pkg.agencyName && pkg.agencyName !== 'Verified Agency' && pkg.agencyName !== 'Travel Agency' && pkg.agencyName !== 'Travel Partner' && pkg.agencyName !== 'Unknown Agency') {
          updates[pkg.id] = pkg.agencyName;
          continue;
        }

        // 3. Extract agencyId from pkg or matchedListing
        let agencyId = pkg.agencyId || (pkg as any).userId || matchedListing?.agencyId || matchedListing?.userId;

        // 4. If agencyId is not present, fetch the listing doc from Firestore
        if (!agencyId && db && pkg.id) {
          try {
            const listSnap = await getDoc(doc(db, 'listings', pkg.id));
            if (listSnap.exists()) {
              const lData = listSnap.data();
              agencyId = lData.agencyId || lData.userId;
              if (lData.agencyName && lData.agencyName !== 'Verified Agency' && lData.agencyName !== 'Travel Agency' && lData.agencyName !== 'Travel Partner') {
                updates[pkg.id] = lData.agencyName;
                continue;
              }
            }
          } catch (e) {
            console.error('Error fetching listing doc for agencyId:', e);
          }
        }

        // 5. Query user document by agencyId
        if (agencyId && db) {
          try {
            const docSnap = await getDoc(doc(db, 'users', agencyId));
            if (docSnap.exists()) {
              const data = docSnap.data();
              const name = data.companyName || data.name || data.agencyName || data.displayName;
              if (name) {
                updates[pkg.id] = name;
              }
            }
          } catch (e) {
            console.error('Error fetching agency name for comparison:', e);
          }
        }
      }

      if (Object.keys(updates).length > 0) {
        setAgencyNamesMap((prev: Record<string, string>) => ({ ...prev, ...updates }));
      }
    };

    if (comparisonList.length > 0) {
      fetchAgencyNames();
    }
  }, [comparisonList, listings]);

  const getResolvedAgencyName = (pkg: ComparisonPackage) => {
    if (agencyNamesMap[pkg.id]) return agencyNamesMap[pkg.id];
    const matchedListing = listings.find((l: any) => l.id === pkg.id);
    if (matchedListing?.agencyName && matchedListing.agencyName !== 'Verified Agency' && matchedListing.agencyName !== 'Travel Agency' && matchedListing.agencyName !== 'Travel Partner') {
      return matchedListing.agencyName;
    }
    if (matchedListing?.agencyData?.companyName) return matchedListing.agencyData.companyName;
    if (matchedListing?.companyName) return matchedListing.companyName;
    if (pkg.agencyData?.companyName) return pkg.agencyData.companyName;
    if (pkg.agencyName && pkg.agencyName !== 'Verified Agency' && pkg.agencyName !== 'Travel Agency' && pkg.agencyName !== 'Travel Partner' && pkg.agencyName !== 'Unknown Agency') {
      return pkg.agencyName;
    }
    if (pkg.agencyData?.name) return pkg.agencyData.name;
    if (pkg.agencyData?.displayName) return pkg.agencyData.displayName;
    return 'Travel Partner';
  };

  const handleAction = (pkg: ComparisonPackage) => {
    const resolvedName = getResolvedAgencyName(pkg);
    const enrichedPkg = {
      ...pkg,
      agencyName: (resolvedName && resolvedName !== 'Travel Partner' && resolvedName !== 'Verified Agency') ? resolvedName : pkg.agencyName,
    };
    if (onView) {
      onView(enrichedPkg);
    } else {
      onChat(pkg.agencyId || '', resolvedName);
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: 'Package Comparison - TripDM',
      text: `Compare travel packages side by side on TripDM`,
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.href);
        alert('Comparison link copied to clipboard!');
      }
    } catch (err) {
      console.error('Error sharing:', err);
    }
  };

  if (comparisonList.length === 0) {
    return (
      <div className="w-full min-h-[75vh] flex items-center justify-center bg-white py-16 px-4">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl p-8 sm:p-10 text-center shadow-xs">
          <div className="w-16 h-16 bg-orange-50 text-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-5 border border-orange-100">
            <Scale className="w-8 h-8 text-orange-500" />
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 mb-2">No Packages in Comparison</h2>
          <p className="text-xs sm:text-sm text-slate-500 mb-6 leading-relaxed">
            You haven&apos;t added any packages to compare yet. Browse packages and click the Compare button to view them side by side.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              onClick={onBack}
              className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold py-2.5 rounded-lg shadow-sm text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" /> Back to Packages
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const colCount = Math.max(comparisonList.length, 1);
  const gridColsClass = colCount === 1 
    ? 'grid-cols-[200px_1fr] lg:grid-cols-[220px_1fr]'
    : colCount === 2
    ? 'grid-cols-[200px_repeat(2,minmax(240px,1fr))] lg:grid-cols-[220px_repeat(2,1fr)]'
    : 'grid-cols-[200px_repeat(3,minmax(240px,1fr))] lg:grid-cols-[220px_repeat(3,1fr)]';

  // Row Definition helper for full-width pixel-perfect table alignment
  const renderRow = (
    label: string,
    icon: React.ReactNode,
    renderCell: (pkg: ComparisonPackage) => React.ReactNode,
    isAlternate = false
  ) => (
    <div className={`grid ${gridColsClass} border-b border-slate-200 items-stretch ${isAlternate ? 'bg-slate-50/60' : 'bg-white'}`}>
      <div className="flex items-center gap-2.5 px-6 py-4 text-xs sm:text-sm font-bold text-slate-700 border-r border-slate-200 bg-slate-50">
        <div className="text-slate-400 shrink-0">
          {icon}
        </div>
        <span>{label}</span>
      </div>
      {comparisonList.map((pkg) => (
        <div key={pkg.id} className="px-6 py-4 text-xs sm:text-sm text-slate-800 border-r border-slate-200 flex items-center justify-center text-center last:border-r-0">
          {renderCell(pkg)}
        </div>
      ))}
    </div>
  );

  return (
    <div className="w-full min-h-screen bg-white font-sans pb-16">
      
      {/* Top Full-Width Control & Header Bar */}
      <div className="w-full px-4 sm:px-8 lg:px-12 py-5 border-b border-slate-200 bg-white flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Button 
            variant="ghost" 
            onClick={onBack}
            className="mb-1 -ml-2 text-slate-500 hover:text-slate-900 font-bold hover:bg-slate-100 rounded-lg px-2.5 py-1.5 text-xs sm:text-sm cursor-pointer"
          >
            <ChevronLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Compare Packages</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5 font-medium">Compare features, pricing, inclusions, and itineraries side-by-side.</p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <Button 
            variant="outline" 
            size="sm"
            className="rounded-lg border-slate-200 text-slate-700 hover:bg-slate-50 font-bold shadow-xs text-xs cursor-pointer px-3.5 py-2"
            onClick={handleShare}
          >
            <Share2 className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
            Share
          </Button>
          <Button 
            onClick={clearComparison} 
            size="sm" 
            variant="outline" 
            className="rounded-lg border-slate-200 text-slate-700 hover:bg-rose-50 hover:text-rose-600 font-bold shadow-xs text-xs cursor-pointer px-3.5 py-2"
          >
            <Trash2 className="w-3.5 h-3.5 mr-1.5" />
            Clear All
          </Button>
        </div>
      </div>

      {/* Full-Width Side-by-Side Comparison Table */}
      <div className="w-full overflow-x-auto border-b border-slate-200">
        <div className="w-full min-w-[760px]">
          
          {/* TOP ROW: Package Cards */}
          <div className={`grid ${gridColsClass} border-b border-slate-200 items-stretch bg-slate-50/50`}>
            {/* Column 0 Header Box */}
            <div className="p-6 flex flex-col items-center justify-center text-center border-r border-slate-200 bg-slate-50">
              <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center mb-2 shadow-2xs">
                <Scale className="w-6 h-6" />
              </div>
              <span className="font-extrabold text-slate-900 text-xs tracking-wider uppercase">Package Specs</span>
              <span className="text-[11px] text-slate-400 mt-0.5">Side-by-side comparison</span>
            </div>

            {/* Columns 1, 2, 3: Package Cards */}
            {comparisonList.map((pkg) => {
              const mainImage = getMainImage(pkg);
              const optimizedImage = mainImage ? optimizeImageUrl(mainImage, { quality: 80, format: 'auto' }) : null;
              const price = pkg.cost || pkg.price || 0;
              const currency = pkg.packageType === 'international' ? '$' : '₹';
              const location = pkg.packageType === 'international' 
                ? (pkg.countryName || 'International')
                : (pkg.stateName || getPlacesCoveredClean(pkg) || 'Domestic');
              
              return (
                <div key={pkg.id} className="p-5 border-r border-slate-200 flex flex-col justify-between bg-white last:border-r-0">
                  {/* Image & Remove button */}
                  <div className="relative h-36 sm:h-40 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 mb-3.5 group">
                    {optimizedImage ? (
                      <img src={optimizedImage} alt={pkg.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-400">
                        <Compass className="w-8 h-8" />
                      </div>
                    )}
                    <button 
                      onClick={() => removeFromComparison(pkg.id)}
                      className="absolute top-2.5 right-2.5 w-7 h-7 bg-white/95 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-full flex items-center justify-center shadow-md border border-slate-200 transition-colors cursor-pointer"
                      title="Remove from comparison"
                      aria-label="Remove from comparison"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <div className="absolute bottom-2.5 left-2.5 bg-slate-900/85 backdrop-blur-xs text-white px-2 py-0.5 rounded text-[10px] font-semibold">
                      {pkg.packageType === 'international' ? 'International' : 'Domestic'}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="space-y-1.5">
                    <h3 className="font-bold text-slate-900 text-sm leading-tight line-clamp-2 min-h-[36px]" title={pkg.title}>
                      {pkg.title}
                    </h3>
                    <p className="text-[11.5px] text-slate-500 font-medium flex items-center truncate">
                      <MapPin className="w-3.5 h-3.5 mr-1 text-slate-400 shrink-0" />
                      <span className="truncate">{location}</span>
                    </p>
                    <div className="pt-1">
                      <span className="text-xl font-black text-slate-900 leading-none">
                        {currency}{price}
                      </span>
                      <span className="text-[11px] text-slate-400 font-normal ml-1">/ person</span>
                    </div>

                    {/* Real Rating Display */}
                    <div className="pt-0.5">
                      {pkg.reviewsCount && pkg.reviewsCount > 0 && pkg.rating ? (
                        <div className="flex items-center text-xs font-semibold text-slate-700">
                          <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 mr-1" />
                          <span>{Number(pkg.rating).toFixed(1)}</span>
                          <span className="text-slate-400 font-normal ml-1">({pkg.reviewsCount} {pkg.reviewsCount === 1 ? 'review' : 'reviews'})</span>
                        </div>
                      ) : pkg.rating ? (
                        <div className="flex items-center text-xs font-semibold text-slate-700">
                          <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 mr-1" />
                          <span>{Number(pkg.rating).toFixed(1)}</span>
                        </div>
                      ) : (
                        <div className="flex items-center text-[11px] text-slate-400">
                          <Star className="w-3 h-3 text-slate-300 mr-1" />
                          <span>No reviews yet</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ATTRIBUTE ROWS */}
          {renderRow(
            'Price (Per Person)',
            <Tag className="w-4 h-4" />,
            (pkg) => {
              const price = pkg.cost || pkg.price || 0;
              const currency = pkg.packageType === 'international' ? '$' : '₹';
              return <span className="font-black text-slate-900 text-sm sm:text-base">{currency}{price}</span>;
            },
            false
          )}

          {renderRow(
            'Duration',
            <Calendar className="w-4 h-4" />,
            (pkg) => {
              const duration = pkg.itinerary?.length || pkg.duration || 0;
              const nights = duration > 0 ? duration - 1 : 0;
              return <span className="font-semibold text-slate-800">{duration} Days / {nights} Nights</span>;
            },
            true
          )}

          {renderRow(
            'Tour Category',
            <Layers className="w-4 h-4" />,
            (pkg) => {
              return <span className="font-medium text-slate-700">{getTourCategoriesClean(pkg)}</span>;
            },
            false
          )}

          {renderRow(
            'Destinations Covered',
            <MapPin className="w-4 h-4" />,
            (pkg) => {
              return <span className="font-medium text-slate-700">{getPlacesCoveredClean(pkg)}</span>;
            },
            true
          )}

          {renderRow(
            'Accommodation',
            <Hotel className="w-4 h-4" />,
            (pkg) => {
              return <span className="font-medium text-slate-700">{getHotelTypeClean(pkg)}</span>;
            },
            false
          )}

          {renderRow(
            'Meals Included',
            <Utensils className="w-4 h-4" />,
            (pkg) => {
              return <span className="font-medium text-slate-700">{getMealPlanClean(pkg.inclusions)}</span>;
            },
            true
          )}

          {renderRow(
            'Transfers & Transport',
            <Bus className="w-4 h-4" />,
            (pkg) => {
              return <span className="font-medium text-slate-700">{getTransferClean(pkg.inclusions)}</span>;
            },
            false
          )}

          {renderRow(
            'Key Inclusions',
            <CheckCircle className="w-4 h-4 text-emerald-600" />,
            (pkg) => {
              const list = parseList(pkg.inclusions);
              if (list.length > 0) {
                return (
                  <div className="flex flex-col gap-1 text-left w-full max-w-[320px]">
                    {list.slice(0, 3).map((item, i) => (
                      <div key={i} className="flex items-start gap-1.5 text-xs text-slate-600">
                        <span className="text-emerald-500 font-bold shrink-0">✓</span>
                        <span className="line-clamp-1">{item}</span>
                      </div>
                    ))}
                  </div>
                );
              }
              return <span className="text-slate-500 text-xs">Sightseeing, Hotels & Transfers</span>;
            },
            true
          )}

          {renderRow(
            'Exclusions',
            <XCircle className="w-4 h-4 text-slate-400" />,
            (pkg) => {
              const list = parseList(pkg.exclusions);
              if (list.length > 0) {
                return (
                  <div className="flex flex-col gap-1 text-left w-full max-w-[320px]">
                    {list.slice(0, 3).map((item, i) => (
                      <div key={i} className="flex items-start gap-1.5 text-xs text-slate-500">
                        <span className="text-rose-400 font-bold shrink-0">✕</span>
                        <span className="line-clamp-1">{item}</span>
                      </div>
                    ))}
                  </div>
                );
              }
              return <span className="text-slate-400 text-xs">Airfare, Personal Expenses</span>;
            },
            false
          )}

          {renderRow(
            'Offered By',
            <Building2 className="w-4 h-4" />,
            (pkg) => {
              return (
                <span className="font-bold text-slate-800 text-xs sm:text-sm">
                  {getResolvedAgencyName(pkg)}
                </span>
              );
            },
            true
          )}

          {/* ACTION ROW */}
          <div className={`grid ${gridColsClass} items-stretch bg-white`}>
            <div className="flex items-center gap-2.5 px-6 py-4 text-xs sm:text-sm font-bold text-slate-700 border-r border-slate-200 bg-slate-50">
              <ExternalLink className="w-4 h-4 text-slate-400" />
              <span>Action</span>
            </div>
            {comparisonList.map((pkg) => (
              <div key={pkg.id} className="px-6 py-4 border-r border-slate-200 flex items-center justify-center last:border-r-0">
                <Button 
                  onClick={() => handleAction(pkg)}
                  className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold py-2.5 rounded-lg shadow-sm text-xs sm:text-sm transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span>View Details</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
          </div>

        </div>
      </div>

    </div>
  );
}

