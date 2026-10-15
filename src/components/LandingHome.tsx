'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  Calendar,
  Users,
  ChevronDown,
  ArrowRight,
  MessageSquare,
  ShieldCheck,
  IndianRupee,
  MapPin,
  Ticket,
  ChevronRight,
  X,
} from 'lucide-react';
import { PackageListing, splitDestinationTokens, normalizeDestinationName } from '@/lib/discoveryEngine';
import { resolveDestinationWithAutocorrect, levenshteinDistance } from '@/lib/destinationResolver';

interface LandingHomeProps {
  listings: PackageListing[];
  allDestinations: string[];
  onNavigateToDestinations: (targetSearch?: string) => void;
  onNavigateToHowItWorks?: () => void;
  onNavigateToStories?: () => void;
  onNavigateToAgents?: () => void;
  onViewListing?: (listing: PackageListing) => void;
}

const DEFAULT_FALLBACK_TAGS = [
  'Kashmir',
  'Rajasthan',
  'Himachal Pradesh',
  'Kerala',
  'Goa',
  'Andaman',
];

const DATE_OPTIONS = [
  { label: 'Anytime', value: 'anytime' },
  { label: 'This Month', value: 'this_month' },
  { label: 'Next Month', value: 'next_month' },
  { label: 'Summer Getaway', value: 'summer' },
  { label: 'Monsoon Escapes', value: 'monsoon' },
  { label: 'Winter Holidays', value: 'winter' },
];

const TRAVELER_OPTIONS = [
  { label: '1 Traveler (Solo)', value: '1' },
  { label: '2 Travelers (Couple)', value: '2' },
  { label: '3-5 Travelers (Family)', value: '3-5' },
  { label: '6+ Travelers (Group)', value: '6+' },
];

export default function LandingHome({
  listings = [],
  allDestinations = [],
  onNavigateToDestinations,
  onNavigateToHowItWorks,
  onNavigateToStories,
  onNavigateToAgents,
  onViewListing,
}: LandingHomeProps) {
  const [destinationInput, setDestinationInput] = useState('');
  const [showDestDropdown, setShowDestDropdown] = useState(false);
  const [selectedDates, setSelectedDates] = useState('Travel dates');
  const [showDateDropdown, setShowDateDropdown] = useState(false);
  const [selectedTravelers, setSelectedTravelers] = useState('Travelers');
  const [showTravelerDropdown, setShowTravelerDropdown] = useState(false);

  const searchBoxRef = useRef<HTMLDivElement>(null);
  const dateDropdownRef = useRef<HTMLDivElement>(null);
  const travelerDropdownRef = useRef<HTMLDivElement>(null);

  // Filter destination suggestions with fuzzy typo tolerance
  const filteredDestinations = React.useMemo(() => {
    if (!destinationInput.trim()) return [];
    const query = destinationInput.toLowerCase().trim();

    const resolved = resolveDestinationWithAutocorrect(query);
    const resolvedName = resolved.displayName;

    const scored = allDestinations.map((dest) => {
      const dLower = dest.toLowerCase();
      let score = 0;
      if (dLower === query) score = 100;
      else if (dLower === resolved.canonicalKey || dLower === resolvedName.toLowerCase()) score = 95;
      else if (dLower.startsWith(query)) score = 85;
      else if (dLower.includes(query)) score = 70;
      else if (query.length >= 3) {
        const dist = levenshteinDistance(query, dLower);
        if (dist <= 1) score = 60;
        else if (dist <= 2 && query.length >= 5) score = 45;
      }
      return { dest, score };
    });

    const suggestions = scored
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((s) => s.dest);

    if (resolved.wasCorrected && !suggestions.includes(resolvedName)) {
      suggestions.unshift(resolvedName);
    }

    return Array.from(new Set(suggestions)).slice(0, 8);
  }, [destinationInput, allDestinations]);

  // Dynamic Popular Tags: states/destinations from real agency-uploaded packages
  const popularTags = React.useMemo(() => {
    const stateCounts = new Map<string, number>();

    listings.forEach((listing) => {
      if (listing.approved === false) return;

      const rawStates: string[] = [];
      if (listing.stateName) rawStates.push(...splitDestinationTokens(listing.stateName));
      if (Array.isArray(listing.stateNames)) {
        listing.stateNames.forEach((s) => s && rawStates.push(...splitDestinationTokens(s)));
      }
      // Fallback to destination if state not specified
      if (rawStates.length === 0 && listing.destination) {
        rawStates.push(...splitDestinationTokens(listing.destination));
      }
      // Fallback to countryName for international packages
      if (rawStates.length === 0 && listing.countryName) {
        rawStates.push(...splitDestinationTokens(listing.countryName));
      }

      const seenInListing = new Set<string>();
      rawStates.forEach((raw) => {
        const norm = normalizeDestinationName(raw);
        if (norm && norm.length > 1 && !/package|tour|trip|holiday/i.test(norm) && !/^india$/i.test(norm)) {
          seenInListing.add(norm);
        }
      });

      seenInListing.forEach((name) => {
        stateCounts.set(name, (stateCounts.get(name) || 0) + 1);
      });
    });

    const sortedFromListings = Array.from(stateCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name]) => name);

    if (sortedFromListings.length > 0) {
      return sortedFromListings.slice(0, 10);
    }

    return DEFAULT_FALLBACK_TAGS;
  }, [listings]);

  // Click outside to close dropdowns
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) {
        setShowDestDropdown(false);
      }
      if (dateDropdownRef.current && !dateDropdownRef.current.contains(e.target as Node)) {
        setShowDateDropdown(false);
      }
      if (travelerDropdownRef.current && !travelerDropdownRef.current.contains(e.target as Node)) {
        setShowTravelerDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!destinationInput.trim()) return;
    const resolved = resolveDestinationWithAutocorrect(destinationInput.trim());
    onNavigateToDestinations(resolved.displayName);
  };

  const handleSelectPopularTag = (tag: string) => {
    const resolved = resolveDestinationWithAutocorrect(tag);
    setDestinationInput(resolved.displayName);
    onNavigateToDestinations(resolved.displayName);
  };

  return (
    <div className="w-full bg-white text-slate-900 h-[calc(100dvh-4rem)] md:h-[calc(100dvh-4rem)] md:max-h-[calc(100dvh-4rem)] flex flex-col justify-between overflow-x-hidden overflow-y-auto md:overflow-hidden select-none pb-[68px] md:pb-0">
      {/* ─── UNIFIED HERO CANVAS: TITLE, SUBTITLE, SEARCH BAR, SCENIC VISTA & 4 VALUE PROPOSITIONS ─── */}
      <div className="relative w-full flex-1 flex flex-col justify-evenly md:justify-between overflow-visible md:overflow-hidden min-h-0 shrink-0 md:shrink">
        {/* Full-bleed Scenic Background Image across the entire hero canvas - DESKTOP ONLY */}
        <div
          className="hidden md:block absolute inset-0 bg-cover bg-no-repeat bg-[center_14%] sm:bg-[84%_36%] md:bg-[85%_36%] lg:bg-[86%_50%]"
          style={{
            backgroundImage: "url('/hero-traveler-vista.jpeg')",
          }}
        />

        {/* Soft top gradient - DESKTOP ONLY */}
        <div className="hidden md:block absolute inset-x-0 top-0 h-28 sm:h-36 bg-gradient-to-b from-white via-white/60 to-transparent pointer-events-none" />

        {/* Soft bottom gradient - DESKTOP ONLY */}
        <div className="hidden md:block absolute inset-x-0 bottom-0 h-36 sm:h-44 bg-gradient-to-t from-white via-white/95 to-transparent pointer-events-none" />

        {/* ── BLOCK 1: HEADLINE & SUBTITLE ── */}
        <div className="relative z-20 w-full pt-2 sm:pt-6 md:pt-12 px-3 sm:px-6 text-center">
          <div className="max-w-3xl mx-auto px-2">
            {/* Main Headline */}
            <h1 className="text-2xl sm:text-3xl md:text-[34px] lg:text-[38px] font-black text-slate-900 tracking-tight leading-[1.18]">
              Find Travel Agents <br />
              for <span className="text-[#FF5500]">Your Next Trip</span>
            </h1>

            {/* Subtitle */}
            <p className="text-xs sm:text-[12.5px] md:text-[13px] text-slate-600 font-medium text-center max-w-xl mx-auto mt-2 sm:mt-1.5 leading-relaxed px-2">
              Search destinations and connect directly with multiple verified travel agents. <br className="hidden sm:inline" />
              Compare options, chat, customize and book — with zero commission on package price.
            </p>
          </div>
        </div>

        {/* ── BLOCK 2: SEARCH BAR & POPULAR TAGS ── */}
        <div className="relative z-20 w-full md:mt-8 max-w-4xl mx-auto px-3 sm:px-6 text-center">
          {/* SEARCH BAR */}
          <form
            onSubmit={handleSearchSubmit}
            suppressHydrationWarning
            className="relative z-50 bg-white p-1 sm:p-1.5 rounded-2xl sm:rounded-full border border-slate-200/90 transition-colors shadow-xs hover:shadow-xs hover:border-slate-300 max-w-2xl sm:max-w-3xl mx-auto"
          >
              <div className="flex flex-col sm:flex-row sm:items-center">
                {/* Field 1: Destination Search Input + Mobile Inline Search Button */}
                <div ref={searchBoxRef} className="relative flex-1 flex items-center min-w-0 pl-3 pr-1.5 py-1 sm:py-0.5">
                  <Search className="h-4 w-4 text-slate-400 shrink-0 mr-2" />
                  <input
                    type="text"
                    suppressHydrationWarning
                    value={destinationInput}
                    onChange={(e) => {
                      setDestinationInput(e.target.value);
                      setShowDestDropdown(true);
                    }}
                    placeholder="Where do you want to go?"
                    className="w-full bg-transparent text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none"
                  />

                  {destinationInput && (
                    <button
                      type="button"
                      onClick={() => {
                        setDestinationInput('');
                        setShowDestDropdown(false);
                      }}
                      className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer mr-1"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}

                  {/* Autocomplete Dropdown - Only when user is actively typing a query */}
                  {showDestDropdown && destinationInput.trim().length >= 2 && filteredDestinations.length > 0 && (
                    <div
                      className="absolute left-0 right-0 top-[calc(100%+8px)] bg-white shadow-md border border-slate-200 rounded-xl py-1.5 z-[100] text-left max-h-52 overflow-y-auto"
                    >
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 py-1">
                        Matching Destinations
                      </p>
                      {filteredDestinations.map((dest, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => {
                            setDestinationInput(dest);
                            setShowDestDropdown(false);
                            onNavigateToDestinations(dest);
                          }}
                          className="w-full px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-900 flex items-center gap-2 transition-colors text-left cursor-pointer"
                        >
                          <MapPin className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                          <span>{dest}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Mobile-only Search Button: Compact pill on right side of input */}
                  <button
                    type="submit"
                    suppressHydrationWarning
                    className="sm:hidden bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 active:scale-95 text-white font-bold px-3.5 py-1.5 rounded-xl shadow-xs text-xs cursor-pointer shrink-0 ml-1 transition-all"
                  >
                    Search
                  </button>
                </div>

                {/* Secondary Filters: Row 2 on Mobile (side-by-side) / Inline on Desktop */}
                <div className="flex items-center border-t border-slate-100 sm:border-t-0 sm:contents">
                  {/* Desktop Divider 1 */}
                  <div className="hidden sm:block w-px h-5 bg-slate-200/90 shrink-0" />

                  {/* Field 2: Travel Dates Dropdown */}
                  <div ref={dateDropdownRef} className="relative flex-1 sm:flex-initial sm:shrink-0 px-2.5 sm:px-3 py-1 sm:py-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        setShowDateDropdown(!showDateDropdown);
                        setShowTravelerDropdown(false);
                        setShowDestDropdown(false);
                      }}
                      className="flex items-center gap-1.5 text-[11px] sm:text-[13px] font-medium text-slate-700 hover:text-slate-900 cursor-pointer w-full sm:w-auto justify-center sm:justify-start"
                    >
                      <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span className={`truncate max-w-[95px] sm:max-w-none ${selectedDates !== 'Travel dates' ? 'text-slate-900 font-semibold' : ''}`}>
                        {selectedDates}
                      </span>
                      <ChevronDown className="h-3 w-3 text-slate-400 shrink-0" />
                    </button>

                    {showDateDropdown && (
                      <div
                        className="absolute left-0 sm:right-0 sm:left-auto top-[calc(100%+8px)] w-48 bg-white shadow-md border border-slate-200 rounded-xl py-1.5 z-[100] text-left"
                      >
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 py-1">
                          Select Season / Month
                        </p>
                        {DATE_OPTIONS.map((opt, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => {
                              setSelectedDates(opt.label);
                              setShowDateDropdown(false);
                            }}
                            className={`w-full px-3 py-1.5 text-xs font-semibold text-left transition-colors cursor-pointer flex items-center justify-between ${
                              selectedDates === opt.label
                                ? 'bg-slate-100 text-slate-900 font-bold'
                                : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                            }`}
                          >
                            <span>{opt.label}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Hairline Divider between Dates & Travelers on Mobile */}
                  <div className="w-px h-4 bg-slate-200/80 shrink-0 sm:hidden" />

                  {/* Desktop Divider 2 */}
                  <div className="hidden sm:block w-px h-5 bg-slate-200/90 shrink-0" />

                  {/* Field 3: Travelers Dropdown */}
                  <div ref={travelerDropdownRef} className="relative flex-1 sm:flex-initial sm:shrink-0 px-2.5 sm:px-3 py-1 sm:py-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        setShowTravelerDropdown(!showTravelerDropdown);
                        setShowDateDropdown(false);
                        setShowDestDropdown(false);
                      }}
                      className="flex items-center gap-1.5 text-[11px] sm:text-[13px] font-medium text-slate-700 hover:text-slate-900 cursor-pointer w-full sm:w-auto justify-center sm:justify-start"
                    >
                      <Users className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span className={`truncate max-w-[95px] sm:max-w-none ${selectedTravelers !== 'Travelers' ? 'text-slate-900 font-semibold' : ''}`}>
                        {selectedTravelers}
                      </span>
                      <ChevronDown className="h-3 w-3 text-slate-400 shrink-0" />
                    </button>

                    {showTravelerDropdown && (
                      <div
                        className="absolute right-0 top-[calc(100%+8px)] w-52 bg-white shadow-md border border-slate-200 rounded-xl py-1.5 z-[100] text-left"
                      >
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 py-1">
                          Who is traveling?
                        </p>
                        {TRAVELER_OPTIONS.map((opt, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => {
                              setSelectedTravelers(opt.label);
                              setShowTravelerDropdown(false);
                            }}
                            className={`w-full px-3 py-1.5 text-xs font-semibold text-left transition-colors cursor-pointer flex items-center justify-between ${
                              selectedTravelers === opt.label
                                ? 'bg-slate-100 text-slate-900 font-bold'
                                : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                            }`}
                          >
                            <span>{opt.label}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Desktop Search Button */}
                <button
                  type="submit"
                  className="hidden sm:inline-flex items-center justify-center bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 active:scale-95 text-white font-bold px-6 py-2 rounded-full transition-all duration-200 shadow-sm shadow-amber-500/25 border border-amber-400/50 text-xs sm:text-sm cursor-pointer shrink-0 ml-1"
                >
                  Search
                </button>
              </div>
            </form>

            {/* Popular Destination Tags */}
            <div className="mt-2 sm:mt-2.5 relative z-10 flex items-center justify-start sm:justify-center gap-1 sm:gap-1.5 px-1 overflow-x-auto no-scrollbar sm:flex-wrap max-w-full py-0.5">
              <span className="text-[10.5px] sm:text-[11.5px] font-bold text-slate-900 mr-1 shrink-0">
                Popular:
              </span>
              {popularTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleSelectPopularTag(tag)}
                  className="px-2.5 py-0.5 bg-white/95 hover:bg-white text-slate-700 hover:text-black font-semibold text-[10.5px] sm:text-[11px] rounded-full transition-colors border border-slate-200/90 hover:border-slate-300 cursor-pointer shadow-none hover:shadow-none shrink-0 whitespace-nowrap active:scale-95"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

        {/* ── BLOCK 3: 4 VALUE PROPOSITIONS ── */}
        <div className="relative z-20 w-full md:mt-auto md:mb-0 pt-1.5 sm:pt-3 pb-1 sm:pb-3 px-3 sm:px-6 bg-transparent md:bg-gradient-to-t md:from-white md:via-white/85 md:to-transparent">
          <div className="max-w-4xl mx-auto py-0.5">
            {/* Mobile: 2 on Left, 2 on Right (Strictly Phone Side: md:hidden) */}
            <div className="grid md:hidden grid-cols-2 gap-x-4 gap-y-3.5 w-full max-w-md mx-auto px-1 sm:px-2">
              {/* Left Item 1: Multiple Agents */}
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-900 shrink-0">
                  <Users className="h-4 w-4 text-slate-800" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-[13px] font-bold text-slate-900 leading-tight">Multiple Agents</h4>
                  <p className="text-[11px] text-slate-500 font-medium leading-tight mt-0.5">Verified experts</p>
                </div>
              </div>

              {/* Right Item 1: No Commission */}
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-900 shrink-0">
                  <IndianRupee className="h-4 w-4 text-slate-800" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-[13px] font-bold text-slate-900 leading-tight">No Commission</h4>
                  <p className="text-[11px] text-slate-500 font-medium leading-tight mt-0.5">0% middleman fee</p>
                </div>
              </div>

              {/* Left Item 2: Chat Directly */}
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-900 shrink-0">
                  <MessageSquare className="h-4 w-4 text-slate-800" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-[13px] font-bold text-slate-900 leading-tight">Chat Directly</h4>
                  <p className="text-[11px] text-slate-500 font-medium leading-tight mt-0.5">Customize with agent</p>
                </div>
              </div>

              {/* Right Item 2: Verified Agents */}
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-900 shrink-0">
                  <ShieldCheck className="h-4 w-4 text-slate-800" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-[13px] font-bold text-slate-900 leading-tight">Verified Agents</h4>
                  <p className="text-[11px] text-slate-500 font-medium leading-tight mt-0.5">100% verified & safe</p>
                </div>
              </div>
            </div>

            {/* Desktop: 4 Columns in 1 line (md and up only) */}
            <div className="hidden md:grid grid-cols-4 gap-1 sm:gap-2">
              {/* Item 1 */}
              <div className="flex flex-col items-center text-center p-0.5 sm:p-1">
                <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-slate-100 border border-slate-200/80 flex items-center justify-center text-slate-900 mb-1 shrink-0">
                  <Users className="h-3 w-3 sm:h-4 sm:w-4 text-slate-900" />
                </div>
                <h3 className="text-[9.5px] sm:text-xs md:text-[12.5px] font-bold text-slate-900 leading-tight">
                  Multiple Travel Agents
                </h3>
                <p className="hidden md:block text-[10px] sm:text-[10.5px] text-slate-500 font-medium leading-tight mt-0.5">
                  Get options from many verified agents
                </p>
              </div>

              {/* Item 2 */}
              <div className="flex flex-col items-center text-center p-0.5 sm:p-1 border-l border-slate-200/80">
                <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-slate-100 border border-slate-200/80 flex items-center justify-center text-slate-900 mb-1 shrink-0">
                  <MessageSquare className="h-3 w-3 sm:h-4 sm:w-4 text-slate-900" />
                </div>
                <h3 className="text-[9.5px] sm:text-xs md:text-[12.5px] font-bold text-slate-900 leading-tight">
                  Chat Directly
                </h3>
                <p className="hidden md:block text-[10px] sm:text-[10.5px] text-slate-500 font-medium leading-tight mt-0.5">
                  Discuss, negotiate and customize
                </p>
              </div>

              {/* Item 3 */}
              <div className="flex flex-col items-center text-center p-0.5 sm:p-1 border-l border-slate-200/80">
                <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-slate-100 border border-slate-200/80 flex items-center justify-center text-slate-900 mb-1 shrink-0">
                  <IndianRupee className="h-3 w-3 sm:h-4 sm:w-4 text-slate-900" />
                </div>
                <h3 className="text-[9.5px] sm:text-xs md:text-[12.5px] font-bold text-slate-900 leading-tight">
                  No Commission
                </h3>
                <p className="hidden md:block text-[10px] sm:text-[10.5px] text-slate-500 font-medium leading-tight mt-0.5">
                  You pay the agency directly
                </p>
              </div>

              {/* Item 4 */}
              <div className="flex flex-col items-center text-center p-0.5 sm:p-1 border-l border-slate-200/80">
                <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-slate-100 border border-slate-200/80 flex items-center justify-center text-slate-900 mb-1 shrink-0">
                  <ShieldCheck className="h-3 w-3 sm:h-4 sm:w-4 text-slate-900" />
                </div>
                <h3 className="text-[9.5px] sm:text-xs md:text-[12.5px] font-bold text-slate-900 leading-tight">
                  Verified Agents
                </h3>
                <p className="hidden md:block text-[10px] sm:text-[10.5px] text-slate-500 font-medium leading-tight mt-0.5">
                  Safe, reliable and trusted
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── 3. HOW TRIPDM WORKS SECTION (CLEAN BOTTOM BAR) ───────────── */}
      <div id="how-it-works" className="relative z-10 w-full shrink-0 border-t border-slate-100 bg-white py-1.5 sm:py-2 shadow-xs">
        <div className="max-w-5xl mx-auto px-3 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-1.5 md:gap-4 items-center">
            {/* Left Column (Heading & Learn More) */}
            <div className="md:col-span-4 flex items-center md:block justify-between">
              <div>
                <h2 className="text-xs sm:text-base md:text-lg font-black text-slate-900 tracking-tight leading-tight">
                  How TripDM Works
                </h2>
                <p className="text-[9.5px] sm:text-[11px] text-slate-500 font-normal mt-0.5">
                  Plan and book your trip with travel agents in 3 simple steps.
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigateToHowItWorks ? onNavigateToHowItWorks() : onNavigateToDestinations()}
                className="md:mt-2 inline-flex items-center gap-1 px-2.5 py-1 sm:px-3.5 sm:py-1.5 bg-white border border-slate-200 hover:border-slate-400 text-slate-700 hover:text-slate-900 hover:bg-slate-50 font-bold text-[10.5px] sm:text-[11px] transition-all cursor-pointer shadow-2xs shrink-0"
                style={{ borderRadius: '6px' }}
              >
                <span>Learn More</span>
                <ArrowRight className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
              </button>
            </div>

            {/* Right Column (3 Steps with Chevrons) */}
            <div className="md:col-span-8 mt-1 md:mt-0 pt-0.5 md:pt-0">
              <div className="grid grid-cols-3 sm:flex items-stretch sm:items-start justify-between gap-1.5 sm:gap-2">
                {/* Step 1 */}
                <div className="flex items-center sm:items-start gap-1 sm:gap-2.5 flex-1 min-w-0 bg-transparent border-0 p-0 rounded-none">
                  <span
                    className="w-4 h-4 sm:w-5 sm:h-5 bg-slate-100 text-black border border-slate-200 font-black flex items-center justify-center text-[9.5px] sm:text-[11px] shrink-0"
                    style={{ borderRadius: '4px' }}
                  >
                    1
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1 sm:gap-1.5 h-4 sm:h-5">
                      <Search className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-slate-800 shrink-0" />
                      <h4 className="text-[10.5px] sm:text-[13px] font-bold text-slate-900 truncate">
                        Search
                      </h4>
                    </div>
                    <p className="hidden md:block text-[10px] sm:text-[11px] text-slate-500 leading-snug mt-0.5">
                      Enter your destination and find multiple travel agents.
                    </p>
                  </div>
                </div>

                {/* Chevron 1 */}
                <ChevronRight className="h-4 w-4 text-slate-300 shrink-0 hidden md:block mx-1 mt-0.5" />

                {/* Step 2 */}
                <div className="flex items-center sm:items-start gap-1 sm:gap-2.5 flex-1 min-w-0 bg-transparent border-0 p-0 rounded-none">
                  <span
                    className="w-4 h-4 sm:w-5 sm:h-5 bg-slate-100 text-black border border-slate-200 font-black flex items-center justify-center text-[9.5px] sm:text-[11px] shrink-0"
                    style={{ borderRadius: '4px' }}
                  >
                    2
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1 sm:gap-1.5 h-4 sm:h-5">
                      <MessageSquare className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-slate-800 shrink-0" />
                      <h4 className="text-[10.5px] sm:text-[13px] font-bold text-slate-900 truncate">
                        Chat
                      </h4>
                    </div>
                    <p className="hidden md:block text-[10px] sm:text-[11px] text-slate-500 leading-snug mt-0.5">
                      DM agents, compare options and customize your trip.
                    </p>
                  </div>
                </div>

                {/* Chevron 2 */}
                <ChevronRight className="h-4 w-4 text-slate-300 shrink-0 hidden md:block mx-1 mt-0.5" />

                {/* Step 3 */}
                <div className="flex items-center sm:items-start gap-1 sm:gap-2.5 flex-1 min-w-0 bg-transparent border-0 p-0 rounded-none">
                  <span
                    className="w-4 h-4 sm:w-5 sm:h-5 bg-slate-100 text-black border border-slate-200 font-black flex items-center justify-center text-[9.5px] sm:text-[11px] shrink-0"
                    style={{ borderRadius: '4px' }}
                  >
                    3
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1 sm:gap-1.5 h-4 sm:h-5">
                      <Ticket className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-slate-800 shrink-0" />
                      <h4 className="text-[10.5px] sm:text-[13px] font-bold text-slate-900 truncate">
                        Book Directly
                      </h4>
                    </div>
                    <p className="hidden md:block text-[10px] sm:text-[11px] text-slate-500 leading-snug mt-0.5">
                      Finalize and book with agency — no commission.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
