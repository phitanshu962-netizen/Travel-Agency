'use client';

import React from 'react';
import Link from 'next/link';


interface FooterProps {
  onNavigate?: (section: string) => void;
}

export default function Footer({ onNavigate }: FooterProps = {}) {
  return (
    <footer className="w-full bg-[#181818] text-white relative z-10 border-t border-[#262626]">
      {/* Main Footer Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">

          {/* Column 1 */}
          <div>
            <h3 className="text-base font-bold mb-4 text-white">Get to Know us</h3>
            <ul className="space-y-2.5 text-sm text-gray-400">
              <li><Link href="#" className="hover:text-white transition-colors">About us</Link></li>
              <li><Link href="/blog" className="hover:text-white transition-colors">Blog</Link></li>
              {/* <li><Link href="#" className="hover:text-white transition-colors">Career</Link></li>
              <li><Link href="#" className="hover:text-white transition-colors">Press Release</Link></li> */}
            </ul>
          </div>

          {/* Column 2 */}
          <div>
            <h3 className="text-base font-bold mb-4 text-white">Get in touch with us</h3>
            <ul className="space-y-2.5 text-sm text-gray-400">
              <li><Link href="#" className="hover:text-white transition-colors">Facebook</Link></li>
              {/* <li><Link href="#" className="hover:text-white transition-colors">Twitter</Link></li> */}
              <li><Link href="#" className="hover:text-white transition-colors">Instagram</Link></li>
              <li><Link href="#" className="hover:text-white transition-colors">YouTube</Link></li>
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
              <li><Link href="#" className="hover:text-white transition-colors">Become an Affiliate</Link></li>
            </ul>
          </div>

          {/* Column 4 */}
          <div>
            <h3 className="text-base font-bold mb-4 text-white">Let Us Help You</h3>
            <ul className="space-y-2.5 text-sm text-gray-400">
              <li>
                <a href="#" onClick={(e) => { if(onNavigate) { e.preventDefault(); onNavigate('profile'); } }} className="hover:text-white transition-colors cursor-pointer">
                  My Account
                </a>
              </li>
              <li><Link href="#" className="hover:text-white transition-colors">Upcoming Tour</Link></li>
              <li>
                <a href="#" onClick={(e) => { if(onNavigate) { e.preventDefault(); onNavigate('chat'); } }} className="hover:text-white transition-colors cursor-pointer">
                  My Chat
                </a>
              </li>
              {/* <li><Link href="#" className="hover:text-white transition-colors">Talk to our Customer care</Link></li> */}
            </ul>
          </div>

        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-[#262626]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 items-center">
            <div className="md:col-span-2 flex justify-start items-center">
              <img src="/tripdm-logo.png" alt="TripDM Logo" className="h-14 sm:h-16 w-auto object-contain brightness-125" />
            </div>
            <div className="md:col-span-2 flex flex-wrap md:pl-32 gap-4 text-xs text-gray-400">
              <Link href="/policies/conditions-of-use" className="hover:text-orange-400 transition-colors">Condition of Use and Sale</Link>
              <Link href="/policies/privacy-notice" className="hover:text-orange-400 transition-colors">Privacy Notice</Link>
              <Link href="/policies/internet-based-policy" className="hover:text-orange-400 transition-colors">Internet-Based Policy</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
