'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  collection, 
  getDocs 
} from 'firebase/firestore';
import { getDbInstance } from '@/lib/firebase';
import { 
  Users, 
  Search, 
  RefreshCw, 
  Mail, 
  Phone, 
  Calendar, 
  Clock,
  UserCheck, 
  Shield, 
  X,
  LogIn
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export interface TravelerRecord {
  id: string;
  name: string;
  email: string;
  phone: string;
  isOnline: boolean;
  role: string;
  avatarUrl?: string;
  createdAt?: number | string | null;
  lastLoginAt?: number | string | null;
  credits?: number;
  freeChats?: number;
  coTravellersCount?: number;
  loginMethod?: string;
  raw: any;
}

export default function AdminTravelersViewer() {
  const [travelers, setTravelers] = useState<TravelerRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'online' | 'offline'>('all');
  const [selectedTraveler, setSelectedTraveler] = useState<TravelerRecord | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetchTravelers();
  }, []);

  const fetchTravelers = async () => {
    const db = getDbInstance();
    if (!db) {
      setLoading(false);
      return;
    }

    try {
      setRefreshing(true);
      const travelersMap = new Map<string, TravelerRecord>();

      // 1. Fetch from 'users' collection
      try {
        const usersSnap = await getDocs(collection(db, 'users'));
        usersSnap.forEach((docSnap) => {
          const d = docSnap.data();
          const role = (d.role || '').toLowerCase();

          // Exclude agency and admin accounts — keep travelers / normal users
          if (role === 'agency' || role === 'admin') return;

          // Determine name
          const name = d.name || 
                       d.displayName || 
                       d.display_name || 
                       d.fullName || 
                       d.userName || 
                       (d.email ? d.email.split('@')[0] : '') || 
                       'Traveler';

          const email = d.email || d.authEmail || '';
          const phone = d.phone || d.contactNumber || '';

          // Normalize created timestamp (first registration/login)
          let created: any = null;
          if (d.createdAt) {
            created = d.createdAt.toDate ? d.createdAt.toDate().getTime() : d.createdAt;
          } else if (d.created_at) {
            created = d.created_at.toDate ? d.created_at.toDate().getTime() : d.created_at;
          } else if (d.timestamp) {
            created = d.timestamp;
          } else if (Array.isArray(d.creditHistory) && d.creditHistory.length > 0) {
            // Welcome bonus TX-INIT has exact registration timestamp
            const initTx = d.creditHistory.find((c: any) => c.id === 'TX-INIT') || d.creditHistory[0];
            if (initTx && initTx.timestamp) created = initTx.timestamp;
          }

          // Normalize last login / last active timestamp
          let lastLogin: any = null;
          if (d.lastLoginAt) {
            lastLogin = d.lastLoginAt.toDate ? d.lastLoginAt.toDate().getTime() : d.lastLoginAt;
          } else if (d.lastLogin) {
            lastLogin = d.lastLogin.toDate ? d.lastLogin.toDate().getTime() : d.lastLogin;
          } else if (d.lastSeen) {
            lastLogin = d.lastSeen.toDate ? d.lastSeen.toDate().getTime() : d.lastSeen;
          } else if (d.last_seen) {
            lastLogin = d.last_seen.toDate ? d.last_seen.toDate().getTime() : d.last_seen;
          } else if (d.updatedAt) {
            lastLogin = d.updatedAt.toDate ? d.updatedAt.toDate().getTime() : d.updatedAt;
          }

          // Determine login method
          let loginMethod = 'Email / Password';
          if (d.authEmail && d.authEmail.includes('@gmail.com')) {
            loginMethod = 'Google Auth';
          } else if (d.loginMethod) {
            loginMethod = d.loginMethod;
          } else if (d.isAnonymous) {
            loginMethod = 'Guest / Anonymous';
          }

          travelersMap.set(docSnap.id, {
            id: docSnap.id,
            name: typeof name === 'string' ? name.trim() : 'Traveler',
            email: typeof email === 'string' ? email.trim() : '',
            phone: typeof phone === 'string' ? phone.trim() : '',
            isOnline: Boolean(d.isOnline),
            role: 'traveler',
            avatarUrl: d.avatarUrl || d.photoURL || d.profilePic || null,
            createdAt: created,
            lastLoginAt: lastLogin,
            credits: typeof d.credits === 'number' ? d.credits : 0,
            freeChats: typeof d.freeChats === 'number' ? d.freeChats : (d.freeChats !== undefined ? Number(d.freeChats) : 2),
            coTravellersCount: Array.isArray(d.coTravellers) ? d.coTravellers.length : 0,
            loginMethod,
            raw: d
          });
        });
      } catch (err) {
        console.error('Error loading users collection:', err);
      }

      // 2. Fetch from 'chat_users' collection (mobile / guest users)
      try {
        const chatUsersSnap = await getDocs(collection(db, 'chat_users'));
        chatUsersSnap.forEach((docSnap) => {
          const d = docSnap.data();
          const existing = travelersMap.get(docSnap.id);

          const name = d.display_name || d.displayName || d.name || (d.email ? d.email.split('@')[0] : 'Traveler');
          const email = d.email || '';
          
          let created: any = null;
          if (d.created_at) {
            created = d.created_at.toDate ? d.created_at.toDate().getTime() : d.created_at;
          }
          let lastLogin: any = null;
          if (d.last_seen) {
            lastLogin = d.last_seen.toDate ? d.last_seen.toDate().getTime() : d.last_seen;
          }

          if (existing) {
            if (!existing.avatarUrl && d.avatar_url) existing.avatarUrl = d.avatar_url;
            if (!existing.createdAt && created) existing.createdAt = created;
            if (!existing.lastLoginAt && lastLogin) existing.lastLoginAt = lastLogin;
            if (d.is_online !== undefined) existing.isOnline = existing.isOnline || Boolean(d.is_online);
          } else {
            travelersMap.set(docSnap.id, {
              id: docSnap.id,
              name: typeof name === 'string' ? name.trim() : 'Traveler',
              email: typeof email === 'string' ? email.trim() : '',
              phone: '',
              isOnline: Boolean(d.is_online),
              role: 'traveler',
              avatarUrl: d.avatar_url || null,
              createdAt: created,
              lastLoginAt: lastLogin,
              credits: 0,
              freeChats: 2,
              coTravellersCount: 0,
              loginMethod: d.isAnonymous ? 'Guest / Mobile' : 'Mobile App',
              raw: d
            });
          }
        });
      } catch (err) {
        console.warn('chat_users lookup note:', err);
      }

      // 3. Enrich with official Firebase Auth metadata (creationTime, lastSignInTime)
      try {
        const res = await fetch('/api/admin/travelers');
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.authUsers) {
            Object.entries(data.authUsers).forEach(([uid, meta]: [string, any]) => {
              const tr = travelersMap.get(uid);
              if (tr) {
                if (meta.creationTime && !tr.createdAt) {
                  tr.createdAt = meta.creationTime;
                }
                if (meta.lastSignInTime && !tr.lastLoginAt) {
                  tr.lastLoginAt = meta.lastSignInTime;
                }
                if (meta.providerId === 'google.com') {
                  tr.loginMethod = 'Google Auth';
                }
              }
            });
          }
        }
      } catch (authMetaErr) {
        console.warn('Could not fetch auth metadata from API:', authMetaErr);
      }

      const list = Array.from(travelersMap.values());
      // Sort: Online first, then by most recent login/registration
      list.sort((a, b) => {
        if (a.isOnline !== b.isOnline) return a.isOnline ? -1 : 1;
        const timeA = a.lastLoginAt ? new Date(a.lastLoginAt).getTime() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
        const timeB = b.lastLoginAt ? new Date(b.lastLoginAt).getTime() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
        return timeB - timeA;
      });

      setTravelers(list);
    } catch (error) {
      console.error('Error fetching travelers:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filteredTravelers = useMemo(() => {
    return travelers.filter((t) => {
      if (statusFilter === 'online' && !t.isOnline) return false;
      if (statusFilter === 'offline' && t.isOnline) return false;

      if (!searchTerm.trim()) return true;
      const q = searchTerm.toLowerCase();
      return (
        t.name.toLowerCase().includes(q) ||
        t.email.toLowerCase().includes(q) ||
        t.phone.toLowerCase().includes(q) ||
        t.id.toLowerCase().includes(q) ||
        (t.loginMethod && t.loginMethod.toLowerCase().includes(q))
      );
    });
  }, [travelers, searchTerm, statusFilter]);

  const stats = useMemo(() => {
    const total = travelers.length;
    const online = travelers.filter((t) => t.isOnline).length;
    const withEmail = travelers.filter((t) => Boolean(t.email)).length;
    const withPhone = travelers.filter((t) => Boolean(t.phone)).length;
    return { total, online, withEmail, withPhone };
  }, [travelers]);

  // Format date & time nicely with full precision: "19 Oct 2026, 11:20 AM"
  const formatDateTime = (val: any) => {
    if (!val) return 'Recently';
    try {
      const d = typeof val === 'number' ? new Date(val) : new Date(String(val));
      if (isNaN(d.getTime())) return 'Recently';
      return d.toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return 'Recently';
    }
  };

  const getInitials = (name: string) => {
    if (!name) return 'TR';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Travelers</p>
            <p className="text-3xl font-extrabold text-gray-900 mt-1">{stats.total}</p>
            <p className="text-xs text-gray-400 mt-1">Registered customer accounts</p>
          </div>
          <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Currently Online</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              <p className="text-3xl font-extrabold text-emerald-600">{stats.online}</p>
            </div>
            <p className="text-xs text-gray-400 mt-1">Active on the platform now</p>
          </div>
          <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
            <UserCheck className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">With Email</p>
            <p className="text-3xl font-extrabold text-indigo-600 mt-1">{stats.withEmail}</p>
            <p className="text-xs text-gray-400 mt-1">Verified email accounts</p>
          </div>
          <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
            <Mail className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">With Phone</p>
            <p className="text-3xl font-extrabold text-amber-600 mt-1">{stats.withPhone}</p>
            <p className="text-xs text-gray-400 mt-1">Contact number available</p>
          </div>
          <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600">
            <Phone className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search traveler by name, email, phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-gray-50 border-gray-200 text-sm"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          <div className="flex bg-gray-100 p-1 rounded-lg text-xs font-medium">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-md transition-all ${
                statusFilter === 'all'
                  ? 'bg-white text-gray-900 shadow-sm font-semibold'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              All ({travelers.length})
            </button>
            <button
              onClick={() => setStatusFilter('online')}
              className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
                statusFilter === 'online'
                  ? 'bg-white text-emerald-700 shadow-sm font-semibold'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
              Online ({stats.online})
            </button>
            <button
              onClick={() => setStatusFilter('offline')}
              className={`px-3 py-1.5 rounded-md transition-all ${
                statusFilter === 'offline'
                  ? 'bg-white text-gray-900 shadow-sm font-semibold'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Offline ({stats.total - stats.online})
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchTravelers}
            disabled={refreshing}
            className="flex items-center gap-1.5 text-xs text-gray-700"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-blue-600' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Travelers Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-16 text-center text-gray-500">
            <div className="animate-spin w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full mx-auto mb-3"></div>
            <p className="font-medium text-gray-700">Loading registered travelers...</p>
            <p className="text-xs text-gray-400 mt-1">Connecting to Firestore database</p>
          </div>
        ) : filteredTravelers.length === 0 ? (
          <div className="p-16 text-center text-gray-500">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="font-semibold text-gray-700 text-base">No travelers found</p>
            <p className="text-xs text-gray-400 mt-1">
              {searchTerm ? 'Try adjusting your search criteria' : 'No traveler users have logged in yet.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 text-xs uppercase font-bold text-gray-500 border-b border-gray-200">
                <tr>
                  <th scope="col" className="px-6 py-4">Traveler</th>
                  <th scope="col" className="px-6 py-4">Contact</th>
                  <th scope="col" className="px-6 py-4">Status</th>
                  <th scope="col" className="px-6 py-4">First Registered / Login</th>
                  <th scope="col" className="px-6 py-4">Last Active</th>
                  <th scope="col" className="px-6 py-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredTravelers.map((traveler) => (
                  <tr 
                    key={traveler.id} 
                    className="hover:bg-gray-50/80 transition-colors"
                  >
                    {/* Traveler Name & Avatar */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {traveler.avatarUrl ? (
                          <img
                            src={traveler.avatarUrl}
                            alt={traveler.name}
                            className="w-10 h-10 rounded-full object-cover border border-gray-200 shadow-sm"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 text-white font-bold text-xs flex items-center justify-center shadow-sm">
                            {getInitials(traveler.name)}
                          </div>
                        )}
                        <div>
                          <p className="font-bold text-gray-900">{traveler.name}</p>
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500">
                            <Shield className="w-2.5 h-2.5 text-slate-400" />
                            {traveler.loginMethod || 'Google Auth'}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Contact details */}
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        {traveler.email ? (
                          <a
                            href={`mailto:${traveler.email}`}
                            className="text-xs text-blue-600 hover:underline flex items-center gap-1.5"
                          >
                            <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            <span className="truncate max-w-[200px]">{traveler.email}</span>
                          </a>
                        ) : (
                          <span className="text-xs text-gray-400 flex items-center gap-1">
                            <Mail className="w-3.5 h-3.5 text-gray-300" /> No email
                          </span>
                        )}

                        {traveler.phone ? (
                          <a
                            href={`tel:${traveler.phone}`}
                            className="text-xs text-gray-700 hover:underline flex items-center gap-1.5"
                          >
                            <Phone className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                            <span>{traveler.phone}</span>
                          </a>
                        ) : (
                          <span className="text-xs text-gray-400 flex items-center gap-1">
                            <Phone className="w-3.5 h-3.5 text-gray-300" /> No phone
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Online / Offline status */}
                    <td className="px-6 py-4">
                      {traveler.isOnline ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                          Online
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                          <span className="w-2 h-2 rounded-full bg-gray-400"></span>
                          Offline
                        </span>
                      )}
                    </td>

                    {/* First Registered / Login Time */}
                    <td className="px-6 py-4">
                      <div className="text-xs">
                        <p className="text-gray-900 font-semibold flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-blue-600" />
                          {formatDateTime(traveler.createdAt || traveler.lastLoginAt)}
                        </p>
                        <p className="text-gray-400 text-[11px] mt-0.5">
                          First recorded login
                        </p>
                      </div>
                    </td>

                    {/* Last Active Time */}
                    <td className="px-6 py-4">
                      <div className="text-xs">
                        <p className="text-gray-900 font-medium flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-emerald-600" />
                          {formatDateTime(traveler.lastLoginAt || traveler.createdAt)}
                        </p>
                        <p className="text-gray-400 text-[11px] mt-0.5">
                          {traveler.isOnline ? 'Active now' : 'Session recorded'}
                        </p>
                      </div>
                    </td>

                    {/* View Details */}
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => setSelectedTraveler(traveler)}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors border border-blue-200"
                      >
                        View Full Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Full Details Modal - Rendered via React Portal onto document.body to be perfectly centered */}
      {mounted && selectedTraveler && createPortal(
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto"
          onClick={() => setSelectedTraveler(null)}
        >
          <div 
            className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl relative border border-gray-100 my-auto animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between pb-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                {selectedTraveler.avatarUrl ? (
                  <img
                    src={selectedTraveler.avatarUrl}
                    alt={selectedTraveler.name}
                    className="w-14 h-14 rounded-full object-cover border-2 border-blue-500 shadow-sm"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold text-lg flex items-center justify-center shadow-sm">
                    {getInitials(selectedTraveler.name)}
                  </div>
                )}
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{selectedTraveler.name}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs bg-blue-100 text-blue-800 font-semibold px-2 py-0.5 rounded">
                      Traveler Account
                    </span>
                    {selectedTraveler.isOnline ? (
                      <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Online
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">Offline</span>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedTraveler(null)}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="py-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {/* Registration Timing */}
                <div className="bg-blue-50/70 p-3 rounded-xl border border-blue-100">
                  <p className="text-[11px] font-bold uppercase text-blue-700 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-blue-600" />
                    First Registered / Login
                  </p>
                  <p className="text-xs font-bold text-gray-900 mt-1">
                    {formatDateTime(selectedTraveler.createdAt || selectedTraveler.lastLoginAt)}
                  </p>
                </div>

                {/* Last Active Timing */}
                <div className="bg-emerald-50/70 p-3 rounded-xl border border-emerald-100">
                  <p className="text-[11px] font-bold uppercase text-emerald-700 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-emerald-600" />
                    Last Active / Login
                  </p>
                  <p className="text-xs font-bold text-gray-900 mt-1">
                    {formatDateTime(selectedTraveler.lastLoginAt || selectedTraveler.createdAt)}
                  </p>
                </div>

                <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <p className="text-[11px] font-bold uppercase text-gray-400">Email Address</p>
                  <p className="text-xs font-semibold text-gray-900 mt-1 break-all">
                    {selectedTraveler.email || 'None registered'}
                  </p>
                </div>

                <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <p className="text-[11px] font-bold uppercase text-gray-400">Phone Number</p>
                  <p className="text-xs font-semibold text-gray-900 mt-1">
                    {selectedTraveler.phone || 'None registered'}
                  </p>
                </div>

                <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <p className="text-[11px] font-bold uppercase text-gray-400">Auth Method</p>
                  <p className="text-xs font-semibold text-gray-900 mt-1">
                    {selectedTraveler.loginMethod}
                  </p>
                </div>

                <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <p className="text-[11px] font-bold uppercase text-gray-400">Free Chats Balance</p>
                  <p className="text-xs font-semibold text-emerald-700 mt-1">
                    {selectedTraveler.freeChats} chats available
                  </p>
                </div>
              </div>

              {/* Unique ID */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Firebase User UID</p>
                <p className="text-xs font-mono font-medium text-slate-800 break-all select-all mt-0.5">
                  {selectedTraveler.id}
                </p>
              </div>

              {/* Co-travellers breakdown if any */}
              {Array.isArray(selectedTraveler.raw?.coTravellers) && selectedTraveler.raw.coTravellers.length > 0 && (
                <div className="border border-gray-100 rounded-xl p-3 bg-gray-50/50">
                  <p className="text-xs font-bold text-gray-700 mb-2">Saved Co-Travellers ({selectedTraveler.raw.coTravellers.length}):</p>
                  <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                    {selectedTraveler.raw.coTravellers.map((ct: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center text-xs bg-white p-2 rounded-lg border border-gray-100">
                        <span className="font-medium text-gray-800">{ct.name || `Traveler ${idx + 1}`}</span>
                        <span className="text-gray-400 text-[11px]">{ct.age ? `Age: ${ct.age}` : ''} {ct.gender || ''}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="pt-3 border-t border-gray-100 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedTraveler(null)}
                className="text-xs font-medium"
              >
                Close
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
