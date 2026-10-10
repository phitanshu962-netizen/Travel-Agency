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
import { PackageListing } from '@/lib/discoveryEngine';
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

const POPULAR_TAGS = [
  'Kashmir',
  'Manali',
  'Rajasthan',
  'Kerala',
  'Andaman',
  'Goa',
  'Singapore',
  'Dubai',
  'Bali',
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
    <div className="w-full bg-white text-slate-900 min-h-[calc(100dvh-4rem)] lg:h-[calc(100dvh-4rem)] lg:max-h-[calc(100dvh-4rem)] flex flex-col justify-between overflow-y-auto lg:overflow-hidden select-none pb-16 lg:pb-0">
      {/* ─── MAIN HERO CONTAINER ────────────────────────────────────────── */}
      <div className="relative w-full flex-1 flex flex-col justify-between pt-5 sm:pt-7 pb-2 px-4 sm:px-6 overflow-hidden">
        {/* Scenic Background Image matching Mockup */}
        <div
          className="absolute inset-0 bg-cover bg-no-repeat bg-center pointer-events-none"
          style={{
            backgroundImage: "url('/hero-scenic-8k.jpg?v=2')",
          }}
        />
        {/* Subtle luminous overlay for crisp typography and vibrant scenic depth */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/75 via-white/30 to-white/90 pointer-events-none" />

        {/* ─── 1. TOP HERO: TITLE, SUBTITLE & SEARCH ─────────────────── */}
        <div className="relative z-20 max-w-4xl mx-auto px-2 text-center w-full my-auto">
          {/* Main Headline */}
          <h1 className="text-3xl sm:text-4xl md:text-[44px] lg:text-[46px] font-black text-slate-900 tracking-tight leading-[1.12]">
            Find Travel Agents <br className="hidden sm:inline" />
            for <span className="text-[#FF5500]">Your Next Trip</span>
          </h1>

          {/* Subtitle */}
          <p className="text-xs sm:text-sm md:text-[15px] text-slate-900 font-semibold text-center max-w-3xl mx-auto mt-2.5 leading-relaxed px-4 drop-shadow-[0_1px_3px_rgba(255,255,255,0.95)]">
            Search destinations and connect directly with multiple verified travel agents. <br className="hidden sm:inline" />
            Compare options, chat, customize and book — with zero commission on package price.
          </p>

          {/* ─── SEARCH BAR ────────────────────────────────────────── */}
          <div className="mt-3.5 sm:mt-5 max-w-3xl mx-auto relative z-40">
            <form
              onSubmit={handleSearchSubmit}
              className="relative z-50 bg-white/95 backdrop-blur-md p-1 sm:p-1.5 rounded-2xl sm:rounded-full shadow-[0_8px_30px_rgba(0,0,0,0.08)] border border-slate-200/90 transition-all hover:shadow-[0_12px_36px_rgba(0,0,0,0.12)] max-w-2xl sm:max-w-3xl mx-auto"
            >
              <div className="flex flex-col sm:flex-row sm:items-center">
                {/* Field 1: Destination Search Input + Mobile Inline Search Button */}
                <div ref={searchBoxRef} className="relative flex-1 flex items-center min-w-0 pl-3 pr-1.5 py-1.5 sm:py-1">
                  <Search className="h-4 w-4 text-slate-400 shrink-0 mr-2" />
                  <input
                    type="text"
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
                      className="absolute left-0 right-0 top-[calc(100%+8px)] bg-white shadow-[0_20px_50px_rgba(0,0,0,0.16)] border border-slate-200 rounded-xl py-1.5 z-[100] text-left max-h-52 overflow-y-auto"
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
                          className="w-full px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-orange-50 hover:text-[#FF5500] flex items-center gap-2 transition-colors text-left cursor-pointer"
                        >
                          <MapPin className="h-3.5 w-3.5 text-orange-400 shrink-0" />
                          <span>{dest}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Mobile-only Search Button: Compact pill on right side of input */}
                  <button
                    type="submit"
                    className="sm:hidden bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 active:scale-95 text-white font-bold px-3.5 py-1.5 rounded-xl shadow-xs text-xs cursor-pointer shrink-0 ml-1 transition-all"
                  >
                    Search
                  </button>
                </div>

                {/* Secondary Filters: Row 2 on Mobile (side-by-side) / Inline on Desktop */}
                <div className="flex items-center border-t border-slate-100 sm:border-t-0 sm:contents">
                  {/* Desktop Divider 1 */}
                  <div className="hidden sm:block w-px h-6 bg-slate-200/90 shrink-0" />

                  {/* Field 2: Travel Dates Dropdown */}
                  <div ref={dateDropdownRef} className="relative flex-1 sm:flex-initial sm:shrink-0 px-2.5 sm:px-3 py-1.5 sm:py-1">
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
                        className="absolute left-0 sm:right-0 sm:left-auto top-[calc(100%+8px)] w-48 bg-white shadow-[0_20px_50px_rgba(0,0,0,0.16)] border border-slate-200 rounded-xl py-1.5 z-[100] text-left"
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
                                ? 'bg-orange-50 text-[#FF5500]'
                                : 'text-slate-700 hover:bg-orange-50/60 hover:text-[#FF5500]'
                            }`}
                          >
                            <span>{opt.label}</span>
                            {selectedDates === opt.label && (
                              <span className="w-1.5 h-1.5 rounded-full bg-[#FF5500]" />
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Hairline Divider between Dates & Travelers on Mobile */}
                  <div className="w-px h-4 bg-slate-200/80 shrink-0 sm:hidden" />

                  {/* Desktop Divider 2 */}
                  <div className="hidden sm:block w-px h-6 bg-slate-200/90 shrink-0" />

                  {/* Field 3: Travelers Dropdown */}
                  <div ref={travelerDropdownRef} className="relative flex-1 sm:flex-initial sm:shrink-0 px-2.5 sm:px-3 py-1.5 sm:py-1">
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
                        className="absolute right-0 top-[calc(100%+8px)] w-52 bg-white shadow-[0_20px_50px_rgba(0,0,0,0.16)] border border-slate-200 rounded-xl py-1.5 z-[100] text-left"
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
                                ? 'bg-orange-50 text-[#FF5500]'
                                : 'text-slate-700 hover:bg-orange-50/60 hover:text-[#FF5500]'
                            }`}
                          >
                            <span>{opt.label}</span>
                            {selectedTravelers === opt.label && (
                              <span className="w-1.5 h-1.5 rounded-full bg-[#FF5500]" />
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Desktop Search Button */}
                <button
                  type="submit"
                  className="hidden sm:inline-flex items-center justify-center bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 active:scale-95 text-white font-bold px-7 py-2.5 rounded-full transition-all duration-200 shadow-md shadow-amber-500/25 border border-amber-400/50 text-xs sm:text-sm cursor-pointer shrink-0 ml-1"
                >
                  Search
                </button>
              </div>
            </form>

            {/* Popular Destination Tags */}
            <div className="mt-2.5 sm:mt-3 relative z-10 flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 px-1">
              <span className="text-[11px] sm:text-xs font-bold text-slate-900 mr-1 drop-shadow-[0_1px_2px_rgba(255,255,255,0.9)]">
                Popular:
              </span>
              {POPULAR_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleSelectPopularTag(tag)}
                  className="px-2.5 py-0.5 sm:px-3 sm:py-1 bg-white/95 hover:bg-white text-slate-800 hover:text-orange-600 font-semibold text-[11px] sm:text-xs rounded-full transition-all shadow-2xs border border-slate-200/90 hover:border-orange-500 backdrop-blur-xs cursor-pointer hover:shadow-xs"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ─── 2. 4 VALUE PROPOSITIONS (FROSTED GLASS CONTAINER) ─── */}
        <div className="relative z-10 w-full mt-3.5 sm:mt-5 px-3 sm:px-6">
          <div className="max-w-4xl mx-auto bg-white/92 backdrop-blur-md rounded-2xl p-2.5 sm:p-3 border border-white/80 shadow-[0_8px_24px_rgba(0,0,0,0.08)]">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
              {/* Item 1 */}
              <div className="flex flex-col items-center text-center p-2 sm:p-1.5 rounded-xl bg-slate-50/60 sm:bg-transparent">
                <div className="w-8 h-8 rounded-full bg-orange-100/80 border border-orange-200/60 flex items-center justify-center text-[#FF5500] mb-1.5 shrink-0 shadow-2xs">
                  <Users className="h-4 w-4" />
                </div>
                <h3 className="text-xs sm:text-[13px] font-bold text-slate-900 leading-tight">
                  Multiple Travel Agents
                </h3>
                <p className="text-[10px] sm:text-[11px] text-slate-600 font-medium leading-tight mt-0.5">
                  Get options from verified agents
                </p>
              </div>

              {/* Item 2 */}
              <div className="flex flex-col items-center text-center p-2 sm:p-1.5 rounded-xl bg-slate-50/60 sm:bg-transparent sm:border-l sm:border-slate-200/60">
                <div className="w-8 h-8 rounded-full bg-orange-100/80 border border-orange-200/60 flex items-center justify-center text-[#FF5500] mb-1.5 shrink-0 shadow-2xs">
                  <MessageSquare className="h-4 w-4" />
                </div>
                <h3 className="text-xs sm:text-[13px] font-bold text-slate-900 leading-tight">
                  Chat Directly
                </h3>
                <p className="text-[10px] sm:text-[11px] text-slate-600 font-medium leading-tight mt-0.5">
                  Discuss, negotiate & customize
                </p>
              </div>

              {/* Item 3 */}
              <div className="flex flex-col items-center text-center p-2 sm:p-1.5 rounded-xl bg-slate-50/60 sm:bg-transparent sm:border-l sm:border-slate-200/60">
                <div className="w-8 h-8 rounded-full bg-orange-100/80 border border-orange-200/60 flex items-center justify-center text-[#FF5500] mb-1.5 shrink-0 shadow-2xs">
                  <IndianRupee className="h-4 w-4" />
                </div>
                <h3 className="text-xs sm:text-[13px] font-bold text-slate-900 leading-tight">
                  No Commission
                </h3>
                <p className="text-[10px] sm:text-[11px] text-slate-600 font-medium leading-tight mt-0.5">
                  You pay the agency directly
                </p>
              </div>

              {/* Item 4 */}
              <div className="flex flex-col items-center text-center p-2 sm:p-1.5 rounded-xl bg-slate-50/60 sm:bg-transparent sm:border-l sm:border-slate-200/60">
                <div className="w-8 h-8 rounded-full bg-orange-100/80 border border-orange-200/60 flex items-center justify-center text-[#FF5500] mb-1.5 shrink-0 shadow-2xs">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <h3 className="text-xs sm:text-[13px] font-bold text-slate-900 leading-tight">
                  Verified Agents
                </h3>
                <p className="text-[10px] sm:text-[11px] text-slate-600 font-medium leading-tight mt-0.5">
                  Safe, reliable & trusted
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── 3. HOW TRIPDM WORKS SECTION (CLEAN BOTTOM BAR) ───────────── */}
      <div id="how-it-works" className="relative z-10 w-full shrink-0 border-t border-slate-100 bg-white py-3 sm:py-4 shadow-xs">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-6 items-center">
            {/* Left Column (Heading & Learn More) */}
            <div className="md:col-span-4 flex items-center md:block justify-between">
              <div>
                <h2 className="text-base sm:text-lg md:text-xl font-black text-slate-900 tracking-tight leading-tight">
                  How TripDM Works
                </h2>
                <p className="text-[10px] sm:text-[11px] text-slate-500 font-normal mt-0.5">
                  Plan and book your trip with travel agents in 3 simple steps.
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigateToHowItWorks ? onNavigateToHowItWorks() : onNavigateToDestinations()}
                className="md:mt-2 inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white/80 border border-slate-200/80 hover:border-[#FF5500] text-slate-700 hover:text-[#FF5500] hover:bg-orange-50/40 font-bold text-[11px] transition-all cursor-pointer shadow-2xs shrink-0"
                style={{ borderRadius: '6px' }}
              >
                <span>Learn More</span>
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>

            {/* Right Column (3 Steps with Chevrons) */}
            <div className="md:col-span-8">
              <div className="grid grid-cols-1 sm:flex items-stretch sm:items-center justify-between gap-3 sm:gap-2">
                {/* Step 1 */}
                <div className="flex items-start gap-2.5 sm:gap-2.5 flex-1 min-w-0 bg-slate-50/70 sm:bg-transparent p-2 sm:p-0 rounded-lg sm:rounded-none">
                  <span
                    className="w-5 h-5 bg-orange-100 text-[#FF5500] font-black flex items-center justify-center text-[11px] shrink-0 mt-0.5"
                    style={{ borderRadius: '4px' }}
                  >
                    1
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <Search className="h-3.5 w-3.5 text-slate-800 shrink-0" />
                      <h4 className="text-xs sm:text-[13px] font-bold text-slate-900 truncate">
                        Search
                      </h4>
                    </div>
                    <p className="text-[10px] sm:text-[11px] text-slate-500 leading-snug mt-0.5">
                      Enter your destination and find multiple travel agents.
                    </p>
                  </div>
                </div>

                {/* Chevron 1 */}
                <ChevronRight className="h-4 w-4 text-slate-300 shrink-0 hidden sm:block mx-1" />

                {/* Step 2 */}
                <div className="flex items-start gap-2.5 sm:gap-2.5 flex-1 min-w-0 bg-slate-50/70 sm:bg-transparent p-2 sm:p-0 rounded-lg sm:rounded-none">
                  <span
                    className="w-5 h-5 bg-orange-100 text-[#FF5500] font-black flex items-center justify-center text-[11px] shrink-0 mt-0.5"
                    style={{ borderRadius: '4px' }}
                  >
                    2
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <MessageSquare className="h-3.5 w-3.5 text-slate-800 shrink-0" />
                      <h4 className="text-xs sm:text-[13px] font-bold text-slate-900 truncate">
                        Chat
                      </h4>
                    </div>
                    <p className="text-[10px] sm:text-[11px] text-slate-500 leading-snug mt-0.5">
                      DM agents, compare options and customize your trip.
                    </p>
                  </div>
                </div>

                {/* Chevron 2 */}
                <ChevronRight className="h-4 w-4 text-slate-300 shrink-0 hidden sm:block mx-1" />

                {/* Step 3 */}
                <div className="flex items-start gap-2.5 sm:gap-2.5 flex-1 min-w-0 bg-slate-50/70 sm:bg-transparent p-2 sm:p-0 rounded-lg sm:rounded-none">
                  <span
                    className="w-5 h-5 bg-orange-100 text-[#FF5500] font-black flex items-center justify-center text-[11px] shrink-0 mt-0.5"
                    style={{ borderRadius: '4px' }}
                  >
                    3
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <Ticket className="h-3.5 w-3.5 text-slate-800 shrink-0" />
                      <h4 className="text-xs sm:text-[13px] font-bold text-slate-900 truncate">
                        Book Directly
                      </h4>
                    </div>
                    <p className="text-[10px] sm:text-[11px] text-slate-500 leading-snug mt-0.5">
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
