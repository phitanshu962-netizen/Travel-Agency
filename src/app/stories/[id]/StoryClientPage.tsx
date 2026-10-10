'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DestinationStoryDetail from '@/components/DestinationStoryDetail';
import MobileBottomNav, { MobileNavTab } from '@/components/MobileBottomNav';
import { PackageListing } from '@/lib/discoveryEngine';

interface StoryClientPageProps {
  initialStory: any;
  initialListings: PackageListing[];
}

export default function StoryClientPage({
  initialStory,
  initialListings,
}: StoryClientPageProps) {
  const router = useRouter();
  const [wishlist, setWishlist] = useState<string[]>([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('tripdm_wishlist');
      if (saved) {
        setWishlist(JSON.parse(saved));
      }
    } catch (e) {
      // ignore
    }
  }, []);

  const handleWishlist = (listingId: string) => {
    setWishlist((prev) => {
      const next = prev.includes(listingId)
        ? prev.filter((id) => id !== listingId)
        : [...prev, listingId];
      try {
        localStorage.setItem('tripdm_wishlist', JSON.stringify(next));
      } catch (e) {
        // ignore
      }
      return next;
    });
  };

  const handleView = (listing: PackageListing) => {
    router.push(`/package/${listing.id}`);
  };

  const handleBook = (listing: PackageListing) => {
    router.push(`/package/${listing.id}?book=true`);
  };

  const handleChat = (listing: PackageListing) => {
    router.push(`/package/${listing.id}?chat=true`);
  };

  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push('/');
    }
  };

  const handleNavTab = (tab: MobileNavTab) => {
    if (tab === 'explore') router.push('/');
    else if (tab === 'agents') router.push('/travel-agents');
    else if (tab === 'stories') router.push('/blog');
    else if (tab === 'messages') router.push('/?section=chat');
    else if (tab === 'profile') router.push('/?section=profile');
  };

  return (
    <div className="pb-20 md:pb-0">
      <DestinationStoryDetail
        story={initialStory}
        listings={initialListings}
        onBack={handleBack}
        onView={handleView}
        onBook={handleBook}
        onChat={handleChat}
        onWishlist={handleWishlist}
        wishlist={wishlist}
      />
      <MobileBottomNav activeTab="stories" onTabClick={handleNavTab} />
    </div>
  );
}
