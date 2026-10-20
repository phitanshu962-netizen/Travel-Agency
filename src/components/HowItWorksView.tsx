'use client';

import React, { useState } from 'react';
import {
  Users,
  MessageSquare,
  ShieldCheck,
  IndianRupee,
  Lightbulb,
  Check,
  X as CloseIcon,
  ChevronDown,
  ArrowRight,
} from 'lucide-react';

interface HowItWorksViewProps {
  onNavigateToDestinations: (targetSearch?: string) => void;
  onNavigateToAgents: (targetDestination?: string) => void;
  onInitiateChat?: (data: { agencyId?: string; agencyName: string; packageTitle?: string }) => void;
}

const FAQS_DATA = [
  {
    id: 'faq-1',
    question: 'Is TripDM a travel agency?',
    answer:
      'No. TripDM is a platform that connects you with multiple verified travel agencies. You chat and book directly with them.',
  },
  {
    id: 'faq-2',
    question: 'Do you charge any commission?',
    answer:
      'No. We do not charge any commission on your package price. You pay the travel agency directly.',
  },
  {
    id: 'faq-3',
    question: 'Can I chat with multiple travel agents?',
    answer:
      'Yes. You can send messages to multiple travel agencies and compare options before booking.',
  },
  {
    id: 'faq-4',
    question: 'How do I know the agents are verified?',
    answer:
      'All travel agents on TripDM are verified and reviewed. You can check their ratings, experience and customer reviews before chatting.',
  },
  {
    id: 'faq-5',
    question: 'Can I get customized itineraries?',
    answer:
      'Absolutely. Every trip can be customized 100%. You can discuss your travel dates, preferred hotels, sightseeing preferences, and budget with agencies in real-time.',
  },
  {
    id: 'faq-6',
    question: 'How does payment and booking work?',
    answer:
      'Once you finalize your customized itinerary with the agency via chat, you pay the agency directly through their accepted payment methods without any platform middleman fees.',
  },
];

const COMPARISON_ROWS = [
  { feature: 'Multiple travel agencies', tripdm: true, traditional: false },
  { feature: 'Chat directly with agents', tripdm: true, traditional: false },
  { feature: 'Customize your package', tripdm: true, traditional: false },
  { feature: 'No commission on package price', tripdm: true, traditional: false },
  { feature: 'Compare multiple options', tripdm: true, traditional: false },
  { feature: 'Pay directly to agency', tripdm: true, traditional: false },
];

export default function HowItWorksView({
  onNavigateToDestinations,
  onNavigateToAgents,
  onInitiateChat,
}: HowItWorksViewProps) {
  const [openFaqId, setOpenFaqId] = useState<string | null>(null);

  const toggleFaq = (id: string) => {
    setOpenFaqId(openFaqId === id ? null : id);
  };

  return (
    <div className="w-full bg-white text-slate-900 min-h-screen">
      {/* ─── 1. TOP HERO SECTION (Full-Width with Pure White Background) ─── */}
      <div className="relative w-full bg-white pt-3 sm:pt-10 pb-2 sm:pb-8 overflow-hidden">
        {/* Scenic Background Photo on Right Side with smooth alpha mask fade to pure white - Hidden on phone */}
        <div
          className="hidden sm:block absolute inset-y-0 right-0 w-full sm:w-[85%] md:w-[70%] lg:w-[58%] bg-cover bg-no-repeat bg-right pointer-events-none"
          style={{
            backgroundImage: "url('/how-it-works-hero.jpg')",
            maskImage: 'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.15) 20%, rgba(0,0,0,0.7) 45%, black 100%)',
            WebkitMaskImage: 'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.15) 20%, rgba(0,0,0,0.7) 45%, black 100%)',
          }}
        >
          {/* Subtle bottom gradient to blend cleanly into the page */}
          <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent pointer-events-none opacity-80" />
        </div>

        <div className="relative z-10 w-full max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-start justify-between min-h-0 sm:min-h-[140px]">
            {/* Left Hero Text Block with custom left spacing */}
            <div className="max-w-xl pl-0 sm:pl-8 md:pl-12 lg:pl-16 xl:pl-20 z-10">
              {/* Orange Eyebrow Tag */}
              <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider sm:tracking-widest text-[#FF5500]">
                HOW IT WORKS
              </span>

              {/* Main Headline */}
              <h1 className="text-2xl sm:text-4xl md:text-[44px] font-black text-slate-900 tracking-tight leading-tight sm:leading-[1.14] mt-1 sm:mt-2">
                Your Next Trip <br className="hidden sm:inline" />
                in <span className="text-[#FF5500]">3 Simple Steps</span>
              </h1>

              {/* Description */}
              <p className="text-[11.5px] sm:text-sm text-slate-600 font-normal leading-snug sm:leading-relaxed mt-1.5 sm:mt-3 max-w-lg">
                TripDM connects you with multiple verified travel agencies so you can compare, chat, customize and book directly — with no commission on package price.
              </p>
            </div>

            {/* Cursive Sticker Badge in Clear Sky (to the left of Signpost in open blue sky) */}
            <div className="hidden lg:flex flex-col items-start select-none pointer-events-none transform -rotate-3 mt-1 mr-[22rem] xl:mr-[27rem] 2xl:mr-[32rem]">
              <span className="text-xs sm:text-[13px] font-bold text-slate-800 font-serif italic tracking-tight drop-shadow-2xs">
                Find
              </span>
              <span className="text-xs sm:text-[13px] font-bold text-slate-800 font-serif italic tracking-tight drop-shadow-2xs">
                Chat
              </span>
              <span className="text-xs sm:text-[13px] font-extrabold text-slate-900 font-serif italic tracking-tight drop-shadow-2xs flex items-center gap-1">
                Travel Your Way
                <svg className="w-3.5 h-3.5 text-slate-900 transform rotate-12 inline-block" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── 2. 3 SIMPLE STEPS WORKFLOW SECTION (Direct on Page - No Container Boxes) ─── */}
      <div className="w-full max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 pt-3 pb-6 sm:py-14 bg-white">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-8 lg:gap-12 relative">
          {/* STEP 1: Search Destinations */}
          <div className="flex flex-col relative group p-0 bg-transparent border-none shadow-none">
            <div className="flex items-center gap-2.5 sm:gap-3 mb-1 sm:mb-2.5">
              <span
                className="w-6 h-6 sm:w-8 sm:h-8 bg-slate-100 text-black border border-slate-200 font-black flex items-center justify-center text-xs sm:text-sm shrink-0"
                style={{ borderRadius: '6px' }}
              >
                1
              </span>
              <h3 className="text-sm sm:text-lg font-bold text-slate-900 leading-tight">
                Search Destinations
              </h3>
            </div>
            <p className="text-[11.5px] sm:text-sm text-slate-600 font-normal leading-snug sm:leading-relaxed">
              Enter your destination, travel dates and preferences to find multiple travel agents.
            </p>

            {/* Connecting Arrow for Desktop */}
            <div className="hidden md:flex absolute -right-6 top-1/2 -translate-y-1/2 z-20 w-7 h-7 rounded-full bg-white border border-slate-200 shadow-sm items-center justify-center text-slate-400">
              <ArrowRight className="w-3.5 h-3.5 text-slate-700" />
            </div>
          </div>

          {/* STEP 2: Compare & Chat with Agents */}
          <div className="flex flex-col relative group p-0 bg-transparent border-none shadow-none">
            <div className="flex items-center gap-2.5 sm:gap-3 mb-1 sm:mb-2.5">
              <span
                className="w-6 h-6 sm:w-8 sm:h-8 bg-slate-100 text-black border border-slate-200 font-black flex items-center justify-center text-xs sm:text-sm shrink-0"
                style={{ borderRadius: '6px' }}
              >
                2
              </span>
              <h3 className="text-sm sm:text-lg font-bold text-slate-900 leading-tight">
                Compare & Chat with Agents
              </h3>
            </div>
            <p className="text-[11.5px] sm:text-sm text-slate-600 font-normal leading-snug sm:leading-relaxed">
              View multiple verified travel agents offering packages for your destination. Chat directly, ask questions and customize your trip.
            </p>

            {/* Connecting Arrow for Desktop */}
            <div className="hidden md:flex absolute -right-6 top-1/2 -translate-y-1/2 z-20 w-7 h-7 rounded-full bg-white border border-slate-200 shadow-sm items-center justify-center text-slate-400">
              <ArrowRight className="w-3.5 h-3.5 text-slate-700" />
            </div>
          </div>

          {/* STEP 3: Customize & Book Directly */}
          <div className="flex flex-col relative group p-0 bg-transparent border-none shadow-none">
            <div className="flex items-center gap-2.5 sm:gap-3 mb-1 sm:mb-2.5">
              <span
                className="w-6 h-6 sm:w-8 sm:h-8 bg-slate-100 text-black border border-slate-200 font-black flex items-center justify-center text-xs sm:text-sm shrink-0"
                style={{ borderRadius: '6px' }}
              >
                3
              </span>
              <h3 className="text-sm sm:text-lg font-bold text-slate-900 leading-tight">
                Customize & Book Directly
              </h3>
            </div>
            <p className="text-[11.5px] sm:text-sm text-slate-600 font-normal leading-snug sm:leading-relaxed">
              Discuss your requirements, negotiate, finalize the itinerary and book directly with the travel agency.
            </p>
          </div>
        </div>
      </div>

      {/* ─── 3. WHY CHOOSE TRIPDM SECTION (Direct on Page - No Container Boxes) ─── */}
      <div className="w-full bg-white py-10 sm:py-14 border-t border-slate-100">
        <div className="max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-24 sm:mb-12">
            <span className="text-[11px] sm:text-xs font-black uppercase tracking-widest text-[#FF5500]">
              WHY CHOOSE TRIPDM
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight mt-1.5">
              A Smarter Way to Plan Your Travels
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            {/* Feature 1: Multiple Options */}
            <div className="flex flex-col items-center text-center p-3 group bg-transparent border-none shadow-none">
              <div className="w-12 h-12 rounded-full bg-slate-100 border border-slate-200 text-black flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <Users className="w-6 h-6 text-black" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1.5">
                Multiple Options
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 font-normal leading-relaxed">
                Get packages from many verified travel agencies in one place.
              </p>
            </div>

            {/* Feature 2: Direct Communication */}
            <div className="flex flex-col items-center text-center p-3 group bg-transparent border-none shadow-none">
              <div className="w-12 h-12 rounded-full bg-slate-100 border border-slate-200 text-black flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <MessageSquare className="w-6 h-6 text-black" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1.5">
                Direct Communication
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 font-normal leading-relaxed">
                Chat, negotiate and customize directly with travel agents.
              </p>
            </div>

            {/* Feature 3: No Commission */}
            <div className="flex flex-col items-center text-center p-3 group bg-transparent border-none shadow-none">
              <div className="w-12 h-12 rounded-full bg-slate-100 border border-slate-200 text-black flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <IndianRupee className="w-6 h-6 text-black" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1.5">
                No Commission
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 font-normal leading-relaxed">
                You pay the travel agency directly. No extra charges from TripDM.
              </p>
            </div>

            {/* Feature 4: Verified Agents */}
            <div className="flex flex-col items-center text-center p-3 group bg-transparent border-none shadow-none">
              <div className="w-12 h-12 rounded-full bg-slate-100 border border-slate-200 text-black flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <ShieldCheck className="w-6 h-6 text-black" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1.5">
                Verified Agents
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 font-normal leading-relaxed">
                Connect with trusted and verified travel operators.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ─── 4. COMPARISON TABLE & YOU ARE IN CONTROL SECTION (Direct on Page) ─── */}
      <div className="w-full max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 bg-white border-t border-slate-100">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
          {/* Left Column: Comparison Table */}
          <div className="lg:col-span-7 flex flex-col justify-between bg-transparent p-0 border-none shadow-none">
            <div>
              <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight mb-6">
                TripDM vs Traditional Travel Booking Sites
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                      <th className="pb-3.5 pr-4">Feature</th>
                      <th className="pb-3.5 px-4 text-center font-black text-slate-900">TripDM</th>
                      <th className="pb-3.5 pl-4 text-center text-slate-600">Traditional Travel Sites</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {COMPARISON_ROWS.map((row, i) => (
                      <tr key={i} className="hover:bg-slate-50/40 transition-colors">
                        <td className="py-3.5 pr-4 text-slate-800 font-semibold text-xs sm:text-[13px]">
                          {row.feature}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-100 text-black">
                            <Check className="w-3.5 h-3.5 stroke-[3] text-black" />
                          </span>
                        </td>
                        <td className="py-3.5 pl-4 text-center">
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-100 text-slate-400">
                            <CloseIcon className="w-3 h-3 stroke-[2.5]" />
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                100% Direct agency communication & zero markup.
              </span>
              <button
                type="button"
                onClick={() => onNavigateToDestinations()}
                className="text-xs font-bold text-slate-900 hover:text-black hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Browse Packages</span>
                <ArrowRight className="w-3.5 h-3.5 text-black" />
              </button>
            </div>
          </div>

          {/* Right Column: "You are in Control" with Photo */}
          <div className="lg:col-span-5 flex flex-col justify-between bg-transparent p-0 border-none shadow-none">
            {/* Top Text Content */}
            <div className="pb-4">
              <div className="w-9 h-9 rounded-lg bg-slate-100 border border-slate-200 text-black flex items-center justify-center mb-3.5">
                <Lightbulb className="w-5 h-5 text-black" />
              </div>
              <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight mb-2">
                You are in Control
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Get multiple options, talk to real travel agents, customize your trip and book directly — all on one platform.
              </p>
            </div>

            {/* Bottom Scenic Image */}
            <div
              className="relative w-full h-56 sm:h-64 overflow-hidden border border-slate-200 shadow-2xs"
              style={{ borderRadius: '6px' }}
            >
              <img
                src="/how-it-works-friends.jpg"
                alt="Friends traveling and hiking with backpacks"
                className="w-full h-full object-cover object-center"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
              <div className="absolute bottom-3 left-4 right-4 text-white text-xs font-semibold drop-shadow-md">
                Verified travel agencies ready to craft your journey.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── 5. FREQUENTLY ASKED QUESTIONS SECTION (Direct Accordion on Page) ─── */}
      <div className="w-full bg-white py-12 sm:py-16 border-t border-slate-100">
        <div className="max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8 sm:mb-10">
            <span className="text-[11px] sm:text-xs font-black uppercase tracking-widest text-[#FF5500]">
              FREQUENTLY ASKED QUESTIONS
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight mt-1.5">
              Got Questions? We've Got Answers.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 sm:gap-x-12 gap-y-2">
            {FAQS_DATA.map((faq) => {
              const isOpen = openFaqId === faq.id;
              return (
                <div
                  key={faq.id}
                  className="border-b border-slate-200 bg-transparent transition-colors py-1"
                >
                  <button
                    type="button"
                    onClick={() => toggleFaq(faq.id)}
                    className="w-full py-3.5 flex items-center justify-between gap-3 text-left cursor-pointer group"
                  >
                    <h3 className={`text-xs sm:text-sm font-bold leading-snug transition-colors ${isOpen ? 'text-black' : 'text-slate-900 group-hover:text-black'
                      }`}>
                      {faq.question}
                    </h3>
                    <ChevronDown
                      className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${isOpen ? 'transform rotate-180 text-black' : 'group-hover:text-slate-700'
                        }`}
                    />
                  </button>

                  {isOpen && (
                    <div className="pb-3.5 pt-0 text-xs sm:text-[13px] text-slate-600 leading-relaxed">
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ─── 6. BOTTOM CALL-TO-ACTION (CTA) BANNER (Full-Width) ─── */}
      <div className="w-full pt-8 pb-20 sm:py-16 px-4 sm:px-6 lg:px-8 bg-white">
        <div
          className="max-w-[1720px] mx-auto relative overflow-hidden p-8 sm:p-12 lg:p-16 shadow-xl bg-slate-900"
          style={{ borderRadius: '8px' }}
        >
          {/* Panoramic Background Image */}
          <div
            className="absolute inset-0 bg-cover bg-center opacity-40 mix-blend-luminosity pointer-events-none"
            style={{ backgroundImage: "url('/how-it-works-cta.jpg')" }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-900/90 to-slate-900/60 pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
            <div className="max-w-2xl">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight leading-tight">
                Ready to Plan Your Next Trip?
              </h2>
              <p className="text-xs sm:text-sm md:text-base text-slate-200 mt-2 leading-relaxed max-w-xl">
                Explore destinations, connect with multiple travel agents and get personalized options — only on TripDM.
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => onNavigateToDestinations()}
                  className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 active:scale-95 text-white font-bold px-7 py-3 text-xs sm:text-sm shadow-lg shadow-orange-500/30 border border-amber-400/50 transition-all cursor-pointer flex items-center gap-2"
                  style={{ borderRadius: '6px' }}
                >
                  <span>Explore Destinations</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => onNavigateToAgents()}
                  className="bg-white/10 hover:bg-white/20 active:scale-95 text-white font-bold px-6 py-3 text-xs sm:text-sm border border-white/20 backdrop-blur-sm transition-all cursor-pointer"
                  style={{ borderRadius: '6px' }}
                >
                  Find Travel Agents
                </button>
              </div>
            </div>

            {/* Right Cursive Script Sticker */}
            <div className="hidden lg:flex flex-col items-start select-none pointer-events-none transform -rotate-3 text-white/95">
              <span className="text-sm sm:text-base font-bold font-serif italic tracking-tight drop-shadow-md">
                Find a Trip.
              </span>
              <span className="text-sm sm:text-base font-bold font-serif italic tracking-tight drop-shadow-md">
                Send a DM.
              </span>
              <span className="text-sm sm:text-base font-black text-amber-400 font-serif italic tracking-tight drop-shadow-md flex items-center gap-1.5">
                Start Your Journey.
                <svg className="w-5 h-5 text-amber-400 transform rotate-12 inline-block" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
