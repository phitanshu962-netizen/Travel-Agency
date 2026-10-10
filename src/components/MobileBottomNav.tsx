'use client';

import React from 'react';
import { Compass, Users, BookOpen, MessageSquare, User } from 'lucide-react';

export type MobileNavTab = 'explore' | 'agents' | 'stories' | 'messages' | 'profile';

interface MobileBottomNavProps {
  activeTab?: MobileNavTab | string;
  unreadCount?: number;
  onTabClick?: (tab: MobileNavTab) => void;
  show?: boolean;
}

export default function MobileBottomNav({
  activeTab = 'explore',
  unreadCount = 0,
  onTabClick,
  show = true,
}: MobileBottomNavProps) {
  if (!show) return null;

  const handleTab = (tab: MobileNavTab) => {
    if (onTabClick) {
      onTabClick(tab);
    }
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-[120] md:hidden bg-white/95 backdrop-blur-md border-t border-slate-200/80 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] transition-all duration-300"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 6px)' }}
      aria-label="Mobile Bottom Navigation"
    >
      <div className="max-w-md mx-auto grid grid-cols-5 items-center px-1 pt-1.5 pb-0.5">
        {/* 1. Explore */}
        <button
          type="button"
          onClick={() => handleTab('explore')}
          className={`flex flex-col items-center justify-center py-1 px-1.5 rounded-lg transition-colors cursor-pointer ${
            activeTab === 'explore' || activeTab === 'home' || activeTab === 'destinations'
              ? 'text-orange-600 font-bold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
          aria-label="Explore packages and destinations"
        >
          <Compass className="h-5 w-5 mb-0.5" />
          <span className="text-[10px] leading-tight">Explore</span>
        </button>

        {/* 2. Agents */}
        <button
          type="button"
          onClick={() => handleTab('agents')}
          className={`flex flex-col items-center justify-center py-1 px-1.5 rounded-lg transition-colors cursor-pointer ${
            activeTab === 'agents'
              ? 'text-orange-600 font-bold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
          aria-label="Find Travel Agents"
        >
          <Users className="h-5 w-5 mb-0.5" />
          <span className="text-[10px] leading-tight">Agents</span>
        </button>

        {/* 3. Stories / Blog */}
        <button
          type="button"
          onClick={() => handleTab('stories')}
          className={`flex flex-col items-center justify-center py-1 px-1.5 rounded-lg transition-colors cursor-pointer ${
            activeTab === 'stories'
              ? 'text-orange-600 font-bold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
          aria-label="Travel Guides and Stories"
        >
          <BookOpen className="h-5 w-5 mb-0.5" />
          <span className="text-[10px] leading-tight">Stories</span>
        </button>

        {/* 4. Messages / Chat */}
        <button
          type="button"
          onClick={() => handleTab('messages')}
          className={`flex flex-col items-center justify-center py-1 px-1.5 rounded-lg transition-colors relative cursor-pointer ${
            activeTab === 'messages' || activeTab === 'chat'
              ? 'text-orange-600 font-bold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
          aria-label="Messages"
        >
          <div className="relative">
            <MessageSquare className="h-5 w-5 mb-0.5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-2.5 bg-[#25D366] text-white text-[8px] font-bold px-1 py-0.2 rounded-full min-w-[14px] text-center shadow-xs">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </div>
          <span className="text-[10px] leading-tight">Messages</span>
        </button>

        {/* 5. Profile */}
        <button
          type="button"
          onClick={() => handleTab('profile')}
          className={`flex flex-col items-center justify-center py-1 px-1.5 rounded-lg transition-colors cursor-pointer ${
            activeTab === 'profile'
              ? 'text-orange-600 font-bold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
          aria-label="Account Profile"
        >
          <User className="h-5 w-5 mb-0.5" />
          <span className="text-[10px] leading-tight">Profile</span>
        </button>
      </div>
    </nav>
  );
}
