'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { collection, query, where, getDocs, updateDoc, doc, getDoc, addDoc, deleteDoc, onSnapshot, orderBy } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { compressMultipleImages, isValidImageFile, validateFileSize } from '@/lib/imageUtils';

export default function Home() {
  const { user, userData, loading, signIn, signInWithGoogle, signOut, register } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [isAgencyRegistration, setIsAgencyRegistration] = useState(true);
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [pendingAgencies, setPendingAgencies] = useState<any[]>([]);
  const [activeSection, setActiveSection] = useState('dashboard');
  const [allAgencies, setAllAgencies] = useState<any[]>([]);
  const [pendingListings, setPendingListings] = useState<any[]>([]);
  const [agencyActiveSection, setAgencyActiveSection] = useState('overview');
  const [userActiveSection, setUserActiveSection] = useState('listings');
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [currentChatAgency, setCurrentChatAgency] = useState<string>('agency1');
  const [currentChatAgencyName, setCurrentChatAgencyName] = useState<string>('Adventure Travels');
  const [listings, setListings] = useState<any[]>([]);
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
  const [agencyChatMessages, setAgencyChatMessages] = useState<any[]>([]);
  const [agencyChatInput, setAgencyChatInput] = useState('');
  const [agencyConversations, setAgencyConversations] = useState<any[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<any>(null);
  const [showListingForm, setShowListingForm] = useState(false);
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
    preferences: [] as string[]
  });
  const [agencyBookings, setAgencyBookings] = useState<any[]>([]);

  useEffect(() => {
    if (userData?.role === 'admin') {
      const fetchPending = async () => {
        const q = query(collection(db, 'users'), where('approved', '==', false), where('role', '==', 'agency'));
        const querySnapshot = await getDocs(q);
        const agencies = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setPendingAgencies(agencies);
      };

      const fetchAllAgencies = async () => {
        const q = query(collection(db, 'users'), where('role', '==', 'agency'));
        const querySnapshot = await getDocs(q);
        const agencies = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setAllAgencies(agencies);
      };

      const fetchPendingListings = async () => {
        const q = query(collection(db, 'listings'), where('approved', '==', false));
        const querySnapshot = await getDocs(q);
        const listings = await Promise.all(querySnapshot.docs.map(async (docSnapshot) => {
          const listingData = docSnapshot.data() as any;
          // Get agency name
          const agencyDoc = await getDoc(doc(db, 'users', listingData.agencyId));
          const agencyName = agencyDoc.exists() ? (agencyDoc.data() as any).companyName : 'Unknown Agency';
          return { id: docSnapshot.id, ...listingData, agencyName };
        }));
        setPendingListings(listings);
      };

      fetchPending();
      fetchAllAgencies();
      fetchPendingListings();
    }
  }, [userData]);

  useEffect(() => {
    if (user && userData?.role === 'user') {
      const chatId = `${user.uid}_${currentChatAgency}`;
      const messagesQuery = query(
        collection(db, 'messages'),
        where('chatId', '==', chatId)
      );

      const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
        const messages: any[] = [];
        snapshot.forEach((doc) => {
          messages.push({ id: doc.id, ...doc.data() });
        });
        // Sort messages by timestamp in JavaScript
        messages.sort((a, b) => a.timestamp - b.timestamp);
        setChatMessages(messages);
      });

      return () => unsubscribe();
    }
  }, [user, userData, currentChatAgency]);

  useEffect(() => {
    if (user && userData?.role === 'agency') {
      // Agencies listen for messages where they are either sender or receiver
      const unsubscribe = onSnapshot(collection(db, 'messages'), (snapshot) => {
        const messages: any[] = [];
        snapshot.forEach((doc) => {
          const msgData = doc.data();
          // Include messages where agency is sender OR receiver
          if (msgData.sender === user.uid || msgData.receiverId === user.uid) {
            messages.push({ id: doc.id, ...msgData });
          }
        });
        // Sort messages by timestamp in JavaScript
        messages.sort((a, b) => a.timestamp - b.timestamp);
        setAgencyChatMessages(messages);

        // Create conversations list with user names
        const conversationsMap = new Map();
        const fetchConversations = async () => {
          for (const msg of messages) {
            try {
              // For conversations, we want the other party (not the agency)
              const otherUserId = msg.sender === user.uid ? msg.receiverId : msg.sender;

              // Skip messages with invalid user IDs
              if (!otherUserId || typeof otherUserId !== 'string' || otherUserId.trim() === '') {
                console.warn('Skipping message with invalid user ID:', msg);
                continue;
              }

              if (!conversationsMap.has(otherUserId)) {
                try {
                  // Fetch user name
                  const userDoc = await getDoc(doc(db, 'users', otherUserId));
                  const userName = userDoc.exists() ? (userDoc.data() as any).name || 'Unknown User' : 'Unknown User';

                  conversationsMap.set(otherUserId, {
                    userId: otherUserId,
                    userName,
                    chatId: msg.chatId,
                    lastMessage: msg.text,
                    lastMessageTime: msg.timestamp,
                    unreadCount: 0, // Could implement read status
                  });
                } catch (error) {
                  console.warn('Error fetching user data for conversation:', error);
                  // Still add conversation with default name
                  conversationsMap.set(otherUserId, {
                    userId: otherUserId,
                    userName: 'Unknown User',
                    chatId: msg.chatId,
                    lastMessage: msg.text,
                    lastMessageTime: msg.timestamp,
                    unreadCount: 0,
                  });
                }
              }
            } catch (error) {
              console.warn('Error processing message for conversation:', error, msg);
              continue;
            }
          }
          const conversations = Array.from(conversationsMap.values());
          setAgencyConversations(conversations);

          // Auto-select first conversation if none selected
          if (!selectedConversation && conversations.length > 0) {
            setSelectedConversation(conversations[0]);
          }
        };
        fetchConversations();
      });

      return () => unsubscribe();
    }
  }, [user, userData, selectedConversation]);

  useEffect(() => {
    // Fetch listings for users - only when user is authenticated
    if (user) {
      const fetchListings = async () => {
        const listingsQuery = query(collection(db, 'listings'), where('approved', '==', true));
        const querySnapshot = await getDocs(listingsQuery);
        const listingsData = await Promise.all(querySnapshot.docs.map(async (docSnapshot) => {
          const listingData = docSnapshot.data() as any;
          // Get agency name
          const agencyDoc = await getDoc(doc(db, 'users', listingData.agencyId));
          const agencyData = agencyDoc.exists() ? agencyDoc.data() as any : null;
          const agencyName = agencyData?.companyName || 'Unknown Agency';
          return { id: docSnapshot.id, ...listingData, agencyName, agencyData };
        }));
        setListings(listingsData);
      };
      fetchListings();
    }
  }, [user]);

  useEffect(() => {
    // Fetch agency's own listings
    if (user && userData?.role === 'agency') {
      const fetchAgencyListings = async () => {
        const agencyListingsQuery = query(collection(db, 'listings'), where('agencyId', '==', user.uid));
        const querySnapshot = await getDocs(agencyListingsQuery);
        const listingsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setAgencyListings(listingsData);
      };
      fetchAgencyListings();
    }
  }, [user, userData]);

  useEffect(() => {
    // Fetch agency's bookings
    if (user && userData?.role === 'agency') {
      const fetchAgencyBookings = async () => {
        const bookingsQuery = query(collection(db, 'bookings'), where('agencyId', '==', user.uid));
        const querySnapshot = await getDocs(bookingsQuery);
        const bookingsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // Sort bookings by createdAt in descending order (most recent first)
        bookingsData.sort((a, b) => new Date((b as any).createdAt).getTime() - new Date((a as any).createdAt).getTime());
        setAgencyBookings(bookingsData);
      };
      fetchAgencyBookings();
    }
  }, [user, userData]);

  const approveAgency = async (id: string) => {
    try {
      await updateDoc(doc(db, 'users', id), { approved: true });
      setPendingAgencies(prev => prev.filter(agency => agency.id !== id));
      // Refresh all agencies data
      const q = query(collection(db, 'users'), where('role', '==', 'agency'));
      const querySnapshot = await getDocs(q);
      const agencies = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAllAgencies(agencies);
      alert('Agency approved successfully!');
    } catch (error) {
      console.error('Error approving agency:', error);
      alert('Failed to approve agency. Please try again.');
    }
  };

  const approveListing = async (id: string) => {
    try {
      await updateDoc(doc(db, 'listings', id), { approved: true });
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
        const userDataInput = isAgencyRegistration ? { name, companyName } : { name };
        await register(email, password, role, userDataInput, file || undefined);
        alert(`Registration successful! ${role === 'agency' ? 'Please wait for admin approval.' : ''}`);
        setIsLogin(true);
      }
      setError('');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const sendMessage = async () => {
    if (!chatInput.trim() || !user) return;
    const messageData = {
      text: chatInput,
      sender: user.uid,
      receiverId: currentChatAgency,
      chatId: `${user.uid}_${currentChatAgency}`,
      timestamp: Date.now(),
    };
    await addDoc(collection(db, 'messages'), messageData);
    setChatInput('');
  };

  const sendAgencyMessage = async () => {
    if (!agencyChatInput.trim() || !user || !selectedConversation) return;

    // For agency replies, we need to send to the user's chatId
    // The selectedConversation should have the user's chatId
    const messageData = {
      text: agencyChatInput,
      sender: user.uid,
      receiverId: selectedConversation.userId,
      chatId: selectedConversation.chatId,
      timestamp: Date.now(),
    };

    await addDoc(collection(db, 'messages'), messageData);
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
          const storageRef = ref(storage, `listings/${user.uid}/${Date.now()}_${file.name}`);
          await uploadBytes(storageRef, file);
          const downloadURL = await getDownloadURL(storageRef);
          photoUrls.push(downloadURL);
        }
      }

      await addDoc(collection(db, 'listings'), {
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
      const agencyListingsQuery = query(collection(db, 'listings'), where('agencyId', '==', user.uid));
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
      await updateDoc(doc(db, 'listings', editingListing.id), {
        ...newListing,
        updatedAt: new Date(),
      });
      setEditingListing(null);
      setNewListing({ title: '', description: '', price: '', duration: '', destination: '', type: 'adventure', photos: [], rating: 0, reviewsCount: 0 });
      setShowListingForm(false);
      // Refresh listings
      const agencyListingsQuery = query(collection(db, 'listings'), where('agencyId', '==', user?.uid));
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
      await deleteDoc(doc(db, 'listings', listingId));
      // Refresh listings
      const agencyListingsQuery = query(collection(db, 'listings'), where('agencyId', '==', user?.uid));
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
      ...bookingData,
      contactName: userData?.name || '',
      contactEmail: user?.email || '',
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
      const bookingDoc = {
        userId: user.uid,
        userName: bookingData.contactName,
        userEmail: bookingData.contactEmail,
        userPhone: bookingData.contactPhone,
        listingId: bookingListing.id,
        listingTitle: bookingListing.title,
        agencyId: bookingListing.agencyId,
        agencyName: bookingListing.agencyName,
        travelers: bookingData.travelers,
        travelDate: bookingData.travelDate,
        specialRequests: bookingData.specialRequests,
        preferences: bookingData.preferences,
        totalAmount: parseFloat(bookingListing.price) * bookingData.travelers,
        status: 'pending',
        createdAt: new Date(),
        bookingReference: `BK${Date.now().toString().slice(-6)}`,
      };

      await addDoc(collection(db, 'bookings'), bookingDoc);

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
        preferences: []
      });
    } catch (error) {
      console.error('Error submitting booking:', error);
      alert('Failed to submit booking. Please try again.');
    }
  };

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center">Loading...</div>;
  }

  if (user && userData) {
    if (userData.role === 'admin') {
      return (
        <div className="flex h-screen bg-gray-100">
          {/* Sidebar */}
          <div className="w-64 bg-white shadow-lg">
            <div className="p-6 border-b">
              <h2 className="text-2xl font-bold text-gray-800">TravelAgent Pro</h2>
              <p className="text-sm text-gray-600">Admin Dashboard</p>
            </div>
            <nav className="p-4">
              <div className="space-y-2">
                <button
                  onClick={() => setActiveSection('dashboard')}
                  className={`w-full text-left px-4 py-2 rounded-lg font-medium ${
                    activeSection === 'dashboard'
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                   Dashboard
                </button>
                <button
                  onClick={() => setActiveSection('approvals')}
                  className={`w-full text-left px-4 py-2 rounded-lg ${
                    activeSection === 'approvals'
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                   Approvals
                </button>
                <button
                  onClick={() => setActiveSection('analytics')}
                  className={`w-full text-left px-4 py-2 rounded-lg ${
                    activeSection === 'analytics'
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                   Analytics
                </button>
                <button
                  onClick={() => setActiveSection('agencies')}
                  className={`w-full text-left px-4 py-2 rounded-lg ${
                    activeSection === 'agencies'
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                   Agencies
                </button>
                <button
                  onClick={() => setActiveSection('listings')}
                  className={`w-full text-left px-4 py-2 rounded-lg ${
                    activeSection === 'listings'
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                   🏖️ Listings
                </button>
                <button
                  onClick={() => setActiveSection('settings')}
                  className={`w-full text-left px-4 py-2 rounded-lg ${
                    activeSection === 'settings'
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                   Settings
                </button>
              </div>
            </nav>
          </div>

          {/* Main Content */}
          <div className="flex-1 overflow-auto">
            <header className="bg-white shadow-sm border-b p-6">
              <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-gray-900">
                  {activeSection === 'dashboard' && 'Admin Dashboard'}
                  {activeSection === 'approvals' && 'Agency Approvals'}
                  {activeSection === 'listings' && 'Listing Approvals'}
                  {activeSection === 'analytics' && 'Analytics & Reports'}
                  {activeSection === 'agencies' && 'All Agencies'}
                  {activeSection === 'settings' && 'Settings'}
                </h1>
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-gray-600">Welcome, {userData.name}</span>
                  <Button variant="outline" size="sm" onClick={signOut}>Sign Out</Button>
                </div>
              </div>
            </header>

            <main className="p-6">
              {activeSection === 'dashboard' && (
                <>
                  {/* Analytics Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center">
                          <div className="p-2 bg-blue-100 rounded-lg">
                            <span className="text-2xl">👥</span>
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
                            <span className="text-2xl">✅</span>
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
                            <span className="text-2xl">⏳</span>
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
                            <span className="text-2xl">📈</span>
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
                        <span className="mr-2">📊</span>
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
                          <span className="text-sm font-semibold text-green-600">✅ Online</span>
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
                      <span className="mr-2">⏳</span>
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
                                <span className="text-lg">🏢</span>
                              </div>
                              <div>
                                <h3 className="font-semibold">{agency.companyName}</h3>
                                <p className="text-sm text-gray-600">{agency.name} • {agency.email || 'No email'}</p>
                              </div>
                            </div>
                            <div className="flex space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {/* Reject logic */}}
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

              {activeSection === 'analytics' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Revenue Analytics</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                          <p className="text-gray-500"> Revenue Chart Coming Soon</p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>User Growth</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                          <p className="text-gray-500">📈 Growth Chart Coming Soon</p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle>All Agencies</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {allAgencies.filter(a => a.approved).length === 0 ? (
                          <p className="text-gray-500 text-center py-8">No approved agencies yet</p>
                        ) : (
                          allAgencies.filter(a => a.approved).slice(0, 5).map(agency => (
                            <div key={agency.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                  <span className="text-sm">🏢</span>
                                </div>
                                <div>
                                  <p className="font-medium">{agency.companyName}</p>
                                  <p className="text-sm text-gray-600">{agencyListings.filter(l => l.agencyId === agency.id).length} listings</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="font-semibold text-blue-600">{agencyListings.filter(l => l.agencyId === agency.id && l.approved).length}</p>
                                <p className="text-xs text-gray-500">Active</p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {activeSection === 'agencies' && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <span className="mr-2">👥</span>
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
                              <span className="text-lg">🏢</span>
                            </div>
                            <div>
                              <h3 className="font-semibold">{agency.companyName}</h3>
                              <p className="text-sm text-gray-600">{agency.name} • {agency.email || 'No email'}</p>
                              <p className="text-xs text-gray-500">
                                Status: {agency.approved ? '✅ Approved' : '⏳ Pending'}
                              </p>
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            <Button variant="outline" size="sm">
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

              {activeSection === 'listings' && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <span className="mr-2">🏖️</span>
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
                                <span className="text-lg">🏖️</span>
                              </div>
                              <div>
                                <h3 className="font-semibold">{listing.title}</h3>
                                <p className="text-sm text-gray-600">
                                  {listing.duration} days • ${listing.price} • {listing.destination}
                                </p>
                                <p className="text-xs text-gray-500">
                                  By: {listing.agencyName}
                                </p>
                              </div>
                            </div>
                            <div className="flex space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {/* View details logic */}}
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

              {activeSection === 'settings' && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <span className="mr-2">⚙️</span>
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
                      <h3 className="text-lg font-semibold mb-4">Security Settings</h3>
                      <div className="space-y-3">
                        <label className="flex items-center">
                          <input type="checkbox" className="mr-2" defaultChecked />
                          <span className="text-sm">Require document verification for agencies</span>
                        </label>
                        <label className="flex items-center">
                          <input type="checkbox" className="mr-2" defaultChecked />
                          <span className="text-sm">Enable two-factor authentication</span>
                        </label>
                        <label className="flex items-center">
                          <input type="checkbox" className="mr-2" defaultChecked />
                          <span className="text-sm">Auto-approve agencies from trusted domains</span>
                        </label>
                      </div>
                    </div>

                    <Button>Save Settings</Button>
                  </CardContent>
                </Card>
              )}
            </main>
          </div>
        </div>
      );
    } else if (userData.role === 'user') {
      // User Dashboard
      return (
        <div className="flex h-screen bg-gray-100">
          <div className="w-64 bg-white shadow-lg">
            <div className="p-6 border-b">
              <h2 className="text-2xl font-bold text-gray-800">TravelAgent Pro</h2>
              <p className="text-sm text-gray-600">User Dashboard</p>
            </div>
            <nav className="p-4">
              <div className="space-y-2">
                <button
                  onClick={() => setUserActiveSection('listings')}
                  className={`w-full text-left px-4 py-2 rounded-lg ${
                    userActiveSection === 'listings'
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  🏖️ Travel Listings
                </button>
                <button
                  onClick={() => setUserActiveSection('chat')}
                  className={`w-full text-left px-4 py-2 rounded-lg ${
                    userActiveSection === 'chat'
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  💬 Chat with Agencies
                </button>
              </div>
            </nav>
          </div>

          <div className="flex-1 overflow-auto">
            <header className="bg-white shadow-sm border-b p-6">
              <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-gray-900">
                  {userActiveSection === 'listings' && 'Travel Listings'}
                  {userActiveSection === 'chat' && 'Chat with Agencies'}
                </h1>
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-gray-600">Welcome, {userData.name}</span>
                  <Button variant="outline" size="sm" onClick={signOut}>Sign Out</Button>
                </div>
              </div>
            </header>

            <main className="p-6">
              {userActiveSection === 'listings' && !viewingListing && !showBookingForm && (
                <>
                  <div className="mb-6">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Available Travel Packages</h2>
                    <p className="text-gray-600">Browse and book amazing travel experiences</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {listings.length === 0 ? (
                      <div className="col-span-full text-center py-12">
                        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <span className="text-3xl">🏖️</span>
                        </div>
                        <p className="text-gray-500">No travel packages available yet.</p>
                      </div>
                    ) : (
                      listings.map((listing) => (
                        <Card key={listing.id} className="hover:shadow-lg transition-shadow">
                          <CardHeader className="pb-3">
                            {listing.photos && listing.photos.length > 0 && (
                              <div className="w-full h-48 bg-gray-100 rounded-lg mb-4 overflow-hidden">
                                <img
                                  src={listing.photos[0]}
                                  alt={listing.title}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            )}
                            <CardTitle className="text-lg">{listing.title}</CardTitle>
                            <CardDescription className="flex items-center space-x-2">
                              <span>{listing.type}</span>
                              <span>•</span>
                              <span>{listing.duration} days</span>
                              <span>•</span>
                              <span>${listing.price}</span>
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <p className="text-sm text-gray-600 mb-4 line-clamp-2">{listing.description}</p>
                            <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                              <span>By {listing.agencyName}</span>
                              {listing.rating > 0 && (
                                <span className="flex items-center">
                                  ⭐ {listing.rating} ({listing.reviewsCount} reviews)
                                </span>
                              )}
                            </div>
                            <div className="flex space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex-1"
                                onClick={() => setViewingListing(listing)}
                              >
                                View Details
                              </Button>
                              <Button
                                size="sm"
                                className="flex-1"
                                onClick={() => startBooking(listing)}
                              >
                                Book Now
                              </Button>
                            </div>
                            <div className="mt-2 text-center">
                              <Button
                                variant="link"
                                size="sm"
                                className="text-xs text-blue-600"
                                onClick={() => {
                                  setCurrentChatAgency(listing.agencyId);
                                  setCurrentChatAgencyName(listing.agencyName);
                                  setUserActiveSection('chat');
                                }}
                              >
                                💬 Chat Support
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                </>
              )}

              {showBookingForm && userActiveSection === 'listings' && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <span className="mr-2">📅</span>
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
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                            step <= bookingStep ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-500'
                          }`}>
                            {step}
                          </div>
                          {step < 4 && (
                            <div className={`w-12 h-1 mx-2 ${
                              step < bookingStep ? 'bg-blue-500' : 'bg-gray-200'
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
                            <span>Travelers:</span>
                            <span>{bookingData.travelers}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Travel Date:</span>
                            <span>{bookingData.travelDate || 'Not specified'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Price per person:</span>
                            <span>${bookingListing?.price}</span>
                          </div>
                          <div className="flex justify-between font-bold text-lg border-t pt-2">
                            <span>Total Amount:</span>
                            <span>${(parseFloat(bookingListing?.price || '0') * bookingData.travelers).toFixed(2)}</span>
                          </div>
                        </div>
                        <div className="bg-blue-50 p-4 rounded-lg">
                          <h4 className="font-semibold text-blue-800 mb-2">Important Notes:</h4>
                          <ul className="text-sm text-blue-700 space-y-1">
                            <li>• Booking will be confirmed within 24 hours</li>
                            <li>• Payment details will be shared after confirmation</li>
                            <li>• You can modify or cancel your booking before payment</li>
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

              {viewingListing && userActiveSection === 'listings' && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <span className="mr-2">🏖️</span>
                      {viewingListing.title}
                    </CardTitle>
                    <CardDescription>
                      {viewingListing.type} Package • By {viewingListing.agencyName}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {viewingListing.photos && viewingListing.photos.length > 0 && (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {viewingListing.photos.map((photo: string, index: number) => (
                          <img
                            key={index}
                            src={photo}
                            alt={`${viewingListing.title} ${index + 1}`}
                            className="w-full h-48 object-cover rounded-lg"
                          />
                        ))}
                      </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h3 className="font-semibold text-lg mb-2">Package Details</h3>
                        <div className="space-y-2">
                          <p><strong>Destination:</strong> {viewingListing.destination}</p>
                          <p><strong>Duration:</strong> {viewingListing.duration} days</p>
                          <p><strong>Price:</strong> ${viewingListing.price}</p>
                          <p><strong>Type:</strong> {viewingListing.type}</p>
                          {viewingListing.rating > 0 && (
                            <p><strong>Rating:</strong> ⭐ {viewingListing.rating} ({viewingListing.reviewsCount} reviews)</p>
                          )}
                        </div>
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg mb-2">Description</h3>
                        <p className="text-gray-600">{viewingListing.description}</p>
                      </div>
                    </div>
                    <div className="flex space-x-4">
                      <Button onClick={() => {
                        setCurrentChatAgency(viewingListing.agencyId);
                        setCurrentChatAgencyName(viewingListing.agencyName);
                        setUserActiveSection('chat');
                        setViewingListing(null);
                      }}>
                        Chat with Agency
                      </Button>
                      <Button variant="outline" onClick={() => setViewingListing(null)}>
                        Back to Listings
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {userActiveSection === 'chat' && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <span className="mr-2">💬</span>
                      Chat with {currentChatAgencyName}
                    </CardTitle>
                    <CardDescription>
                      Ask questions about packages and get personalized recommendations
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-96 bg-gray-50 rounded-lg p-4 flex flex-col">
                      <div className="flex-1 overflow-y-auto space-y-3 mb-4">
                        {chatMessages.map((msg, index) => (
                          <div key={index} className={`flex ${msg.sender === user?.uid ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-xs px-3 py-2 rounded-lg ${msg.sender === user?.uid ? 'bg-blue-500 text-white' : 'bg-white text-gray-800'}`}>
                              <p className="text-sm">{msg.text}</p>
                              <p className="text-xs opacity-75">{new Date(msg.timestamp).toLocaleTimeString()}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="flex space-x-2">
                        <Input
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          placeholder="Type your message..."
                          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                        />
                        <Button onClick={sendMessage}>Send</Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </main>
          </div>
        </div>
      );
    } else {
      // Agency Dashboard
      return (
        <div className="flex h-screen bg-gray-100">
          <div className="w-64 bg-white shadow-lg">
            <div className="p-6 border-b">
              <h2 className="text-2xl font-bold text-gray-800">TravelAgent Pro</h2>
              <p className="text-sm text-gray-600">{userData.companyName}</p>
            </div>
            <nav className="p-4">
              <div className="space-y-2">
                <button
                  onClick={() => setAgencyActiveSection('overview')}
                  className={`w-full text-left px-4 py-2 rounded-lg ${
                    agencyActiveSection === 'overview'
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  📊 Overview
                </button>
                <button
                  onClick={() => setAgencyActiveSection('listings')}
                  className={`w-full text-left px-4 py-2 rounded-lg ${
                    agencyActiveSection === 'listings'
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  🏖️ Listings
                </button>
                <button
                  onClick={() => setAgencyActiveSection('analytics')}
                  className={`w-full text-left px-4 py-2 rounded-lg ${
                    agencyActiveSection === 'analytics'
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  📈 Analytics
                </button>
                <button
                  onClick={() => setAgencyActiveSection('bookings')}
                  className={`w-full text-left px-4 py-2 rounded-lg ${
                    agencyActiveSection === 'bookings'
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  📅 Bookings
                </button>
                <button
                  onClick={() => setAgencyActiveSection('revenue')}
                  className={`w-full text-left px-4 py-2 rounded-lg ${
                    agencyActiveSection === 'revenue'
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  💰 Revenue
                </button>
                <button
                  onClick={() => setAgencyActiveSection('chat')}
                  className={`w-full text-left px-4 py-2 rounded-lg ${
                    agencyActiveSection === 'chat'
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  💬 Customer Chat
                </button>
                <button
                  onClick={() => setAgencyActiveSection('settings')}
                  className={`w-full text-left px-4 py-2 rounded-lg ${
                    agencyActiveSection === 'settings'
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  ⚙️ Settings
                </button>
              </div>
            </nav>
          </div>

          <div className="flex-1 overflow-auto">
            <header className="bg-white shadow-sm border-b p-6">
              <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-gray-900">
                  {agencyActiveSection === 'overview' && 'Agency Overview'}
                  {agencyActiveSection === 'listings' && 'Travel Listings'}
                  {agencyActiveSection === 'analytics' && 'Agency Analytics'}
                  {agencyActiveSection === 'bookings' && 'Booking Management'}
                  {agencyActiveSection === 'revenue' && 'Revenue Dashboard'}
                  {agencyActiveSection === 'chat' && 'Customer Chat'}
                  {agencyActiveSection === 'settings' && 'Agency Settings'}
                </h1>
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-gray-600">Status: {userData.approved ? '✅ Approved' : '⏳ Pending'}</span>
                  <Button variant="outline" size="sm" onClick={signOut}>Sign Out</Button>
                </div>
              </div>
            </header>

            <main className="p-6">
              {userData.approved ? (
                <>
                  {agencyActiveSection === 'overview' && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                      <Card>
                        <CardContent className="p-6">
                          <div className="flex items-center">
                            <div className="p-2 bg-blue-100 rounded-lg">
                              <span className="text-2xl">🏖️</span>
                            </div>
                            <div className="ml-4">
                              <p className="text-sm font-medium text-gray-600">Active Listings</p>
                              <p className="text-2xl font-bold text-gray-900">{agencyListings.filter(l => l.approved).length}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="p-6">
                          <div className="flex items-center">
                            <div className="p-2 bg-green-100 rounded-lg">
                              <span className="text-2xl">💬</span>
                            </div>
                            <div className="ml-4">
                              <p className="text-sm font-medium text-gray-600">Active Chats</p>
                              <p className="text-2xl font-bold text-gray-900">{agencyConversations.length}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="p-6">
                          <div className="flex items-center">
                            <div className="p-2 bg-yellow-100 rounded-lg">
                              <span className="text-2xl">⏳</span>
                            </div>
                            <div className="ml-4">
                              <p className="text-sm font-medium text-gray-600">Pending Listings</p>
                              <p className="text-2xl font-bold text-gray-900">{agencyListings.filter(l => !l.approved).length}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )}

                  {agencyActiveSection === 'listings' && (
                    <div className="space-y-6">
                      {showListingForm && (
                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center">
                              <span className="mr-2">{editingListing ? '✏️' : '➕'}</span>
                              {editingListing ? 'Edit Listing' : 'Add New Listing'}
                            </CardTitle>
                            <CardDescription>
                              {editingListing ? 'Update your travel package details' : 'Create a new travel package for customers'}
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <Label htmlFor="listingTitle">Title</Label>
                                <Input
                                  id="listingTitle"
                                  value={newListing.title}
                                  onChange={(e) => setNewListing({ ...newListing, title: e.target.value })}
                                  placeholder="e.g., Bali Paradise Package"
                                />
                              </div>
                              <div>
                                <Label htmlFor="listingDestination">Destination</Label>
                                <Input
                                  id="listingDestination"
                                  value={newListing.destination}
                                  onChange={(e) => setNewListing({ ...newListing, destination: e.target.value })}
                                  placeholder="e.g., Bali, Indonesia"
                                />
                              </div>
                              <div>
                                <Label htmlFor="listingPrice">Price ($)</Label>
                                <Input
                                  id="listingPrice"
                                  type="number"
                                  value={newListing.price}
                                  onChange={(e) => setNewListing({ ...newListing, price: e.target.value })}
                                  placeholder="2499"
                                />
                              </div>
                              <div>
                                <Label htmlFor="listingDuration">Duration (days)</Label>
                                <Input
                                  id="listingDuration"
                                  type="number"
                                  value={newListing.duration}
                                  onChange={(e) => setNewListing({ ...newListing, duration: e.target.value })}
                                  placeholder="7"
                                />
                              </div>
                            </div>
                            <div>
                              <Label htmlFor="listingDescription">Description</Label>
                              <textarea
                                id="listingDescription"
                                className="w-full p-2 border rounded-lg"
                                rows={4}
                                value={newListing.description}
                                onChange={(e) => setNewListing({ ...newListing, description: e.target.value })}
                                placeholder="Describe your travel package..."
                              />
                            </div>
                            <div>
                              <Label htmlFor="listingType">Package Type</Label>
                              <select
                                id="listingType"
                                className="w-full p-2 border rounded-lg"
                                value={newListing.type}
                                onChange={(e) => setNewListing({ ...newListing, type: e.target.value })}
                              >
                                <option value="adventure">Adventure</option>
                                <option value="luxury">Luxury</option>
                                <option value="budget">Budget</option>
                                <option value="cultural">Cultural</option>
                                <option value="family">Family</option>
                                <option value="romantic">Romantic</option>
                              </select>
                            </div>
                            <div>
                              <Label htmlFor="listingPhotos">Photos</Label>
                              <Input
                                id="listingPhotos"
                                type="file"
                                multiple
                                onChange={(e) => setTempPhotoFiles(Array.from(e.target.files || []))}
                              />
                              <p className="text-xs text-gray-500 mt-1">
                                Upload multiple photos of your travel package
                              </p>
                            </div>
                            <div className="flex space-x-2">
                              <Button
                                onClick={editingListing ? handleUpdateListing : handleAddListing}
                                disabled={!newListing.title.trim()}
                              >
                                {editingListing ? 'Update Listing' : 'Add Listing'}
                              </Button>
                              <Button
                                variant="outline"
                                onClick={() => {
                                  setShowListingForm(false);
                                  setEditingListing(null);
                                  setNewListing({ title: '', description: '', price: '', duration: '', destination: '', type: 'adventure', photos: [], rating: 0, reviewsCount: 0 });
                                }}
                              >
                                Cancel
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center">
                            <span className="mr-2">🏖️</span>
                            Your Travel Listings
                          </CardTitle>
                          <CardDescription>
                            Manage your travel packages and destinations
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            {agencyListings.length === 0 ? (
                              <p className="text-gray-500 text-center py-8">No listings yet. Add your first travel package!</p>
                            ) : (
                              agencyListings.map((listing) => (
                                <div key={listing.id} className="flex items-center justify-between p-4 border rounded-lg">
                                  <div className="flex items-center space-x-4">
                                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                                      <span className="text-lg">🏖️</span>
                                    </div>
                                    <div>
                                      <h3 className="font-semibold">{listing.title}</h3>
                                      <p className="text-sm text-gray-600">
                                        {listing.duration} days • ${listing.price} • {listing.destination}
                                        <span className={`ml-2 px-2 py-1 rounded-full text-xs ${
                                          listing.approved ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                                        }`}>
                                          {listing.approved ? 'Approved' : 'Pending'}
                                        </span>
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex space-x-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleViewListing(listing)}
                                    >
                                      View
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleEditListing(listing)}
                                    >
                                      Edit
                                    </Button>
                                    <Button
                                      variant="destructive"
                                      size="sm"
                                      onClick={() => handleDeleteListing(listing.id)}
                                    >
                                      Delete
                                    </Button>
                                  </div>
                                </div>
                              ))
                            )}

                            <Button
                              className="w-full"
                              onClick={() => setShowListingForm(true)}
                            >
                              + Add New Listing
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )}

                  {agencyActiveSection === 'analytics' && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card>
                          <CardHeader>
                            <CardTitle>Booking Trends</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                              <p className="text-gray-500">📈 Booking Chart Coming Soon</p>
                            </div>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardHeader>
                            <CardTitle>Popular Destinations</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="h-32 bg-gray-100 rounded-lg flex items-center justify-center">
                              <p className="text-gray-500">📊 Analytics Coming Soon</p>
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      <Card>
                        <CardHeader>
                          <CardTitle>Recent Activity</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                              <div>
                                <p className="font-medium">No Recent Bookings</p>
                                <p className="text-sm text-gray-600">Booking system integration pending</p>
                              </div>
                              <span className="text-gray-600 font-semibold">Coming Soon</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )}

                  {agencyActiveSection === 'bookings' && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Card>
                          <CardContent className="p-6">
                            <div className="flex items-center">
                              <div className="p-2 bg-blue-100 rounded-lg">
                                <span className="text-2xl">📅</span>
                              </div>
                              <div className="ml-4">
                                <p className="text-sm font-medium text-gray-600">Total Bookings</p>
                                <p className="text-2xl font-bold text-gray-900">{agencyBookings.length}</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardContent className="p-6">
                            <div className="flex items-center">
                              <div className="p-2 bg-yellow-100 rounded-lg">
                                <span className="text-2xl">⏳</span>
                              </div>
                              <div className="ml-4">
                                <p className="text-sm font-medium text-gray-600">Pending</p>
                                <p className="text-2xl font-bold text-gray-900">{agencyBookings.filter(b => b.status === 'pending').length}</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardContent className="p-6">
                            <div className="flex items-center">
                              <div className="p-2 bg-green-100 rounded-lg">
                                <span className="text-2xl">✅</span>
                              </div>
                              <div className="ml-4">
                                <p className="text-sm font-medium text-gray-600">Confirmed</p>
                                <p className="text-2xl font-bold text-gray-900">{agencyBookings.filter(b => b.status === 'confirmed').length}</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center">
                            <span className="mr-2">📅</span>
                            Recent Bookings
                          </CardTitle>
                          <CardDescription>
                            Manage customer bookings and inquiries
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          {agencyBookings.length === 0 ? (
                            <div className="text-center py-12">
                              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <span className="text-2xl">📅</span>
                              </div>
                              <h3 className="text-lg font-semibold mb-2">No Bookings Yet</h3>
                              <p className="text-gray-600 mb-4">
                                When customers book your travel packages, they will appear here for you to manage.
                              </p>
                              <p className="text-sm text-gray-500">
                                You can confirm bookings, communicate with customers, and track payments.
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              {agencyBookings.map((booking) => (
                                <div key={booking.id} className="flex items-center justify-between p-4 border rounded-lg">
                                  <div className="flex items-center space-x-4">
                                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                                      <span className="text-lg">👤</span>
                                    </div>
                                    <div>
                                      <h3 className="font-semibold">{booking.userName}</h3>
                                      <p className="text-sm text-gray-600">
                                        {booking.listingTitle} • {booking.travelers} traveler{booking.travelers > 1 ? 's' : ''} • ${booking.totalAmount}
                                      </p>
                                      <p className="text-xs text-gray-500">
                                        Travel Date: {booking.travelDate || 'Not specified'} • Ref: {booking.bookingReference}
                                      </p>
                                      <p className="text-xs text-gray-500">
                                        {booking.userEmail} • {booking.userPhone || 'No phone'}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex flex-col items-end space-y-2">
                                    <span className={`px-2 py-1 rounded-full text-xs ${
                                      booking.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                                      booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                      'bg-red-100 text-red-800'
                                    }`}>
                                      {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                                    </span>
                                    <div className="flex space-x-2">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                          // TODO: Implement booking details modal
                                          alert(`Booking Details:\n\n${booking.specialRequests || 'No special requests'}\n\nPreferences: ${booking.preferences.join(', ') || 'None'}`);
                                        }}
                                      >
                                        Details
                                      </Button>
                                      {booking.status === 'pending' && (
                                        <Button
                                          size="sm"
                                          onClick={async () => {
                                            try {
                                              await updateDoc(doc(db, 'bookings', booking.id), { status: 'confirmed' });
                                              // Refresh bookings
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
                                        >
                                          Confirm
                                        </Button>
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

                  {agencyActiveSection === 'revenue' && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <Card>
                          <CardContent className="p-6">
                            <div className="text-center">
                              <p className="text-2xl font-bold text-green-600">$0</p>
                              <p className="text-sm text-gray-600">This Month</p>
                            </div>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardContent className="p-6">
                            <div className="text-center">
                              <p className="text-2xl font-bold text-blue-600">$0</p>
                              <p className="text-sm text-gray-600">This Year</p>
                            </div>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardContent className="p-6">
                            <div className="text-center">
                              <p className="text-2xl font-bold text-purple-600">0</p>
                              <p className="text-sm text-gray-600">Total Bookings</p>
                            </div>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardContent className="p-6">
                            <div className="text-center">
                              <p className="text-2xl font-bold text-yellow-600">N/A</p>
                              <p className="text-sm text-gray-600">Avg Rating</p>
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      <Card>
                        <CardHeader>
                          <CardTitle>Revenue Overview</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-center py-8">
                            <p className="text-gray-500">Revenue tracking will be available once booking system is implemented</p>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )}

                  {agencyActiveSection === 'chat' && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* Conversations List */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center">
                            <span className="mr-2">👥</span>
                            Conversations
                          </CardTitle>
                          <CardDescription>
                            Customers who contacted you
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2 max-h-96 overflow-y-auto">
                            {agencyConversations.length === 0 ? (
                              <p className="text-gray-500 text-center py-4">No conversations yet</p>
                            ) : (
                              agencyConversations.map((conversation) => (
                                <div
                                  key={conversation.userId}
                                  onClick={() => selectConversation(conversation)}
                                  className={`p-3 rounded-lg cursor-pointer border ${
                                    selectedConversation?.userId === conversation.userId
                                      ? 'bg-blue-50 border-blue-200'
                                      : 'bg-gray-50 hover:bg-gray-100'
                                  }`}
                                >
                                  <div className="flex items-center space-x-3">
                                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                      <span className="text-sm">👤</span>
                                    </div>
                                    <div className="flex-1">
                                      <p className="font-medium text-sm">{conversation.userName}</p>
                                      <p className="text-xs text-gray-600 truncate">{conversation.lastMessage}</p>
                                    </div>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </CardContent>
                      </Card>

                      {/* Chat Messages */}
                      <div className="md:col-span-2">
                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center">
                              <span className="mr-2">💬</span>
                              {selectedConversation ? `Chat with Customer ${selectedConversation.userId.slice(0, 8)}` : 'Select a conversation'}
                            </CardTitle>
                            <CardDescription>
                              {selectedConversation ? 'Respond to customer inquiries' : 'Choose a conversation from the list'}
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            {selectedConversation ? (
                              <div className="h-96 bg-gray-50 rounded-lg p-4 flex flex-col">
                                <div className="flex-1 overflow-y-auto space-y-3 mb-4">
                                  {agencyChatMessages
                                    .filter(msg => msg.chatId === selectedConversation.chatId)
                                    .sort((a, b) => a.timestamp - b.timestamp)
                                    .map((msg, index) => (
                                      <div key={index} className={`flex ${msg.sender === user?.uid ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-xs px-3 py-2 rounded-lg ${msg.sender === user?.uid ? 'bg-blue-500 text-white' : 'bg-white text-gray-800'}`}>
                                          <p className="text-sm">{msg.text}</p>
                                          <p className="text-xs opacity-75">{new Date(msg.timestamp).toLocaleTimeString()}</p>
                                        </div>
                                      </div>
                                    ))}
                                </div>
                                <div className="flex space-x-2">
                                  <Input
                                    value={agencyChatInput}
                                    onChange={(e) => setAgencyChatInput(e.target.value)}
                                    placeholder="Type your reply..."
                                    onKeyPress={(e) => e.key === 'Enter' && sendAgencyMessage()}
                                  />
                                  <Button onClick={sendAgencyMessage} disabled={!agencyChatInput.trim()}>
                                    Send
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div className="h-96 bg-gray-50 rounded-lg p-4 flex items-center justify-center">
                                <p className="text-gray-500">Select a conversation to start chatting</p>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  )}

                  {agencyActiveSection === 'settings' && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center">
                          <span className="mr-2">⚙️</span>
                          Agency Settings
                        </CardTitle>
                        <CardDescription>
                          Manage your agency profile and preferences
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <Label htmlFor="agencyName">Agency Name</Label>
                            <Input id="agencyName" defaultValue={userData.companyName} />
                          </div>
                          <div>
                            <Label htmlFor="contactEmail">Contact Email</Label>
                            <Input id="contactEmail" defaultValue={user?.email || ''} />
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="description">Agency Description</Label>
                          <textarea
                            id="description"
                            className="w-full p-2 border rounded-lg"
                            rows={4}
                            placeholder="Tell travelers about your agency..."
                          />
                        </div>

                        <div>
                          <h3 className="text-lg font-semibold mb-4">Notification Preferences</h3>
                          <div className="space-y-3">
                            <label className="flex items-center">
                              <input type="checkbox" className="mr-2" defaultChecked />
                              <span className="text-sm">Email notifications for new bookings</span>
                            </label>
                            <label className="flex items-center">
                              <input type="checkbox" className="mr-2" defaultChecked />
                              <span className="text-sm">SMS notifications for urgent updates</span>
                            </label>
                            <label className="flex items-center">
                              <input type="checkbox" className="mr-2" />
                              <span className="text-sm">Marketing emails and promotions</span>
                            </label>
                          </div>
                        </div>

                        <Button>Save Settings</Button>
                      </CardContent>
                    </Card>
                  )}
                </>
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-3xl">⏳</span>
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
        </div>
      );
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{isLogin ? 'Login' : `Register as ${isAgencyRegistration ? 'Agency' : 'User'}`}</CardTitle>
          <CardDescription>
            {isLogin ? 'Sign in to your account' : `Create a new ${isAgencyRegistration ? 'agency' : 'user'} account`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!isLogin && (
            <div className="mb-4">
              <Button
                type="button"
                variant={isAgencyRegistration ? 'default' : 'outline'}
                size="sm"
                onClick={() => setIsAgencyRegistration(true)}
                className="mr-2"
              >
                Agency
              </Button>
              <Button
                type="button"
                variant={!isAgencyRegistration ? 'default' : 'outline'}
                size="sm"
                onClick={() => setIsAgencyRegistration(false)}
              >
                User
              </Button>
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {!isLogin && (
              <>
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                {isAgencyRegistration && (
                  <>
                    <div>
                      <Label htmlFor="companyName">Company Name</Label>
                      <Input
                        id="companyName"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="file">Proof Document (Optional - Storage needs billing)</Label>
                      <Input
                        id="file"
                        type="file"
                        onChange={(e) => setFile(e.target.files?.[0] || null)}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        File upload requires Firebase billing. You can register without a file for now.
                      </p>
                    </div>
                  </>
                )}
              </>
            )}
            {error && <p className="text-red-500 text-sm">{error}</p>}
            {isLogin && (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => signInWithGoogle()}
              >
                Sign in with Google
              </Button>
            )}
            <Button type="submit" className="w-full">
              {isLogin ? 'Sign In' : 'Register'}
            </Button>
          </form>
          <div className="mt-4 text-center">
            <Button variant="link" onClick={() => setIsLogin(!isLogin)}>
              {isLogin ? 'Need to register?' : 'Already have an account?'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
