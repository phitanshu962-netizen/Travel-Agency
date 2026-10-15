'use client';

import React from 'react';
import Link from 'next/link';
import { Facebook, Instagram, Youtube } from 'lucide-react';

interface FooterProps {
  onNavigate?: (section: string) => void;
}

export default function Footer({ onNavigate }: FooterProps = {}) {
  return (
    <footer className="w-full bg-[#181818] text-white relative z-10 border-t border-[#262626]">
      {/* ─── DESKTOP FOOTER (md and up) ─── */}
      <div className="hidden md:block">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-4 gap-8">
            {/* Column 1 */}
            <div>
              <h3 className="text-base font-bold mb-4 text-white">Get to Know us</h3>
              <ul className="space-y-2.5 text-sm text-gray-400">
                <li><Link href="/policies/about" className="hover:text-white transition-colors">About us</Link></li>
                <li><Link href="/how-it-works" className="hover:text-white transition-colors">How It Works</Link></li>
                <li><Link href="/blog" className="hover:text-white transition-colors">Blog</Link></li>
              </ul>
            </div>

            {/* Column 2 */}
            <div>
              <h3 className="text-base font-bold mb-4 text-white">Get in touch with us</h3>
              <ul className="space-y-2.5 text-sm text-gray-400">
                <li>
                  <a
                    href="https://www.facebook.com/profile.php?id=61594024299870"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-white transition-colors"
                  >
                    Facebook
                  </a>
                </li>
                <li>
                  <a
                    href="https://www.instagram.com/tripdm_official/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-white transition-colors"
                  >
                    Instagram
                  </a>
                </li>
                <li>
                  <a
                    href="https://www.youtube.com/@TripDm"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-white transition-colors"
                  >
                    YouTube
                  </a>
                </li>
                <li><Link href="#" className="hover:text-white transition-colors">Contact us</Link></li>
              </ul>
            </div>

            {/* Column 3 */}
            <div>
              <h3 className="text-base font-bold mb-4 text-white">Earn with us</h3>
              <ul className="space-y-2.5 text-sm text-gray-400">
                <li>
                  <Link href="/agencytripdm" className="hover:text-orange-400 font-medium transition-colors">
                    Join as an Agency
                  </Link>
                </li>
              </ul>
            </div>

            {/* Column 4 */}
            <div>
              <h3 className="text-base font-bold mb-4 text-white">Let Us Help You</h3>
              <ul className="space-y-2.5 text-sm text-gray-400">
                <li>
                  <a href="#" onClick={(e) => { if (onNavigate) { e.preventDefault(); onNavigate('profile'); } }} className="hover:text-white transition-colors cursor-pointer">
                    My Account
                  </a>
                </li>
                <li>
                  <a href="#" onClick={(e) => { if (onNavigate) { e.preventDefault(); onNavigate('chat'); } }} className="hover:text-white transition-colors cursor-pointer">
                    My Chat
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Desktop Bottom Bar */}
        <div className="border-t border-[#262626]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="grid grid-cols-4 gap-8 items-center">
              <div className="col-span-2 flex justify-start items-center">
                <img src="/tripdm-logo.png" alt="TripDM Logo" className="h-14 sm:h-16 w-auto object-contain brightness-125" />
              </div>
              <div className="col-span-2 flex flex-wrap pl-32 gap-4 text-xs text-gray-400">
                <Link href="/policies/conditions-of-use" className="hover:text-orange-400 transition-colors">Condition of Use and Sale</Link>
                <Link href="/policies/privacy-notice" className="hover:text-orange-400 transition-colors">Privacy Notice</Link>
                <Link href="/policies/internet-based-policy" className="hover:text-orange-400 transition-colors">Internet-Based Policy</Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── MOBILE FOOTER (Strictly phone side only: < md) ─── */}
      <div className="block md:hidden px-4 pt-6 pb-24 space-y-6">
        {/* Section 1: Get to Know us */}
        <div>
          <h3 className="text-sm font-bold mb-2 text-white tracking-wide">Get to Know us</h3>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-gray-400">
            <Link href="/policies/about" className="hover:text-white transition-colors">About us</Link>
            <Link href="/how-it-works" className="hover:text-white transition-colors">How It Works</Link>
            <Link href="/blog" className="hover:text-white transition-colors">Blog</Link>
          </div>
        </div>

        {/* Section 2: Get in touch with us */}
        <div>
          <h3 className="text-sm font-bold mb-2 text-white tracking-wide">Get in touch with us</h3>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-gray-400">
            <a
              href="https://www.facebook.com/profile.php?id=61594024299870"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors"
            >
              Facebook
            </a>
            <a
              href="https://www.instagram.com/tripdm_official/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors"
            >
              Instagram
            </a>
            <a
              href="https://www.youtube.com/@TripDm"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors"
            >
              YouTube
            </a>
            <Link href="#" className="hover:text-white transition-colors">Contact us</Link>
          </div>
        </div>

        {/* Section 3: Earn with us & Let Us Help You */}
        <div className="grid grid-cols-2 gap-4 pt-1 border-t border-[#262626]">
          <div>
            <h3 className="text-sm font-bold mb-2 text-white tracking-wide">Earn with us</h3>
            <div className="text-xs text-gray-400">
              <Link href="/agencytripdm" className="hover:text-orange-400 font-medium transition-colors">
                Join as an Agency
              </Link>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-bold mb-2 text-white tracking-wide">Let Us Help You</h3>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-400">
              <a
                href="#"
                onClick={(e) => { if (onNavigate) { e.preventDefault(); onNavigate('profile'); } }}
                className="hover:text-white transition-colors cursor-pointer"
              >
                My Account
              </a>
              <a
                href="#"
                onClick={(e) => { if (onNavigate) { e.preventDefault(); onNavigate('chat'); } }}
                className="hover:text-white transition-colors cursor-pointer"
              >
                My Chat
              </a>
            </div>
          </div>
        </div>

        {/* Section 4: Logo & Social Media Icons Row */}
        <div className="pt-4 border-t border-[#262626]">
          <div className="flex items-center justify-between gap-3">
            <img src="/tripdm-logo.png" alt="TripDM Logo" className="h-10 w-auto object-contain brightness-125" />
            
            {/* Social Media Links beside Logo */}
            <div className="flex items-center gap-2.5">
              <a
                href="https://www.facebook.com/profile.php?id=61594024299870"
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-full bg-[#262626] hover:bg-[#333333] flex items-center justify-center text-gray-300 hover:text-white transition-colors"
                aria-label="Facebook"
              >
                <Facebook className="h-4 w-4" />
              </a>
              <a
                href="https://www.instagram.com/tripdm_official/"
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-full bg-[#262626] hover:bg-[#333333] flex items-center justify-center text-gray-300 hover:text-white transition-colors"
                aria-label="Instagram"
              >
                <Instagram className="h-4 w-4" />
              </a>
              <a
                href="https://www.youtube.com/@TripDm"
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-full bg-[#262626] hover:bg-[#333333] flex items-center justify-center text-gray-300 hover:text-white transition-colors"
                aria-label="YouTube"
              >
                <Youtube className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Legal / Policy Links */}
          <div className="flex flex-wrap gap-x-3.5 gap-y-1.5 pt-3.5 text-[11px] text-gray-400">
            <Link href="/policies/conditions-of-use" className="hover:text-orange-400 transition-colors">Condition of Use and Sale</Link>
            <Link href="/policies/privacy-notice" className="hover:text-orange-400 transition-colors">Privacy Notice</Link>
            <Link href="/policies/internet-based-policy" className="hover:text-orange-400 transition-colors">Internet-Based Policy</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
