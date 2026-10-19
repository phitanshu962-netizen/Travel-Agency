'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, signInWithEmailAndPassword, signOut as firebaseSignOut, onAuthStateChanged, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot, updateDoc } from 'firebase/firestore';
import { getAuthInstance, getDbInstance } from '@/lib/firebase';
import { registerPushNotifications, initForegroundNotificationListener } from '@/lib/pushNotifications';

interface UserData {
  role: 'admin' | 'agency' | 'user';
  approved: boolean;
  name?: string;
  email?: string;
  authEmail?: string;
  companyName?: string;
  phone?: string;
  contactNumber?: string;
  contactEmail?: string;
  description?: string;
  agencyDescription?: string;
  avatarUrl?: string;
  logoUrl?: string;
  agencyLogo?: string;
  proofUrl?: string;
  coTravellers?: any[];
  defaultInclusions?: string[] | string;
  defaultExclusions?: string[] | string;
  plan?: 'free' | 'starter' | 'premium' | 'vip';
  credits?: number;
  freeChats?: number;
  unlockedAgencies?: string[];
  unlockedUsers?: string[];
  isOnline?: boolean;
  creditHistory?: Array<{
    id: string;
    type: string;
    amount: number;
    description: string;
    timestamp: number;
  }>;
  createdAt?: number | string | any;
  lastLoginAt?: number | string | any;
}

interface AuthContextType {
  user: User | null;
  userData: UserData | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  register: (email: string, password: string, role: 'agency' | 'user', userData: Omit<UserData, 'role' | 'approved'>, file?: File) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = sessionStorage.getItem('tripdm_auth_userdata');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed && typeof parsed === 'object') return parsed;
        }
      } catch {}
    }
    return null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const authInstance = getAuthInstance();
    if (!authInstance) return;

    let docUnsubscribe: (() => void) | null = null;

    const handleAuthStateChange = async (firebaseUser: User | null) => {
      // Clean up previous user listener
      if (docUnsubscribe) {
        docUnsubscribe();
        docUnsubscribe = null;
      }

      if (firebaseUser) {
        setUser(firebaseUser);
        try { localStorage.setItem('tripdm_auth_uid', firebaseUser.uid); } catch {}
        // Register Web Push notification token and listeners
        registerPushNotifications(firebaseUser.uid).catch((err) =>
          console.warn('[Push] Registration error:', err)
        );
        initForegroundNotificationListener();

        // Fetch user data from Firestore with real-time updates
        const dbInstance = getDbInstance();
        if (dbInstance) {
          const docRef = doc(dbInstance, 'users', firebaseUser.uid);

          docUnsubscribe = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
              const data = docSnap.data() as UserData;
              setUserData(data);
              try {
                sessionStorage.setItem('tripdm_auth_userdata', JSON.stringify(data));
              } catch {}
              // Update online status immediately on login if not already online
              if (!data.isOnline) {
                updateDoc(docRef, { isOnline: true }).catch(() => {});
              }
            } else {
              setUserData(null);
              try {
                sessionStorage.removeItem('tripdm_auth_userdata');
              } catch {}
            }
            setLoading(false);
          }, (error) => {
            // Silently handle listener lifecycle changes during signout/unapproved status
            console.warn('User document listener note:', error?.message || error);
            setLoading(false);
          });
        } else {
          setLoading(false);
        }
      } else {
        setUser(null);
        setUserData(null);
        try {
          sessionStorage.removeItem('tripdm_auth_userdata');
        } catch {}
        setLoading(false);
      }
    };

    const unsubscribe = onAuthStateChanged(authInstance, handleAuthStateChange);

    // Handle redirect result for Google sign-in
    const handleRedirectResult = async () => {
      try {
        const redirectResult = await getRedirectResult(authInstance);
        if (redirectResult) {
          console.log('Google User UID from redirect:', redirectResult.user.uid);
          
          const dbInstance = getDbInstance();
          if (!dbInstance) throw new Error('Database not initialized');

          const userDocRef = doc(dbInstance, 'users', redirectResult.user.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            const data = userDoc.data() as UserData;
            if (!data.approved) {
              throw new Error('Account not approved yet. Please wait for admin approval.');
            }
            // Update online status, authEmail, and login timestamp on redirect login
            updateDoc(userDocRef, { 
              isOnline: true,
              authEmail: redirectResult.user.email || data.email || '',
              lastLoginAt: Date.now(),
              ...(!data.createdAt ? { createdAt: Date.now() } : {})
            }).catch(console.error);
            setUserData(data);
          } else {
            // For Google sign-in, if no document exists, create one as agency (or check if it's admin email)
            const adminEmails = process.env.NEXT_PUBLIC_ADMIN_EMAILS?.split(',').map(email => email.trim()) || [];
            const isAdmin = adminEmails.includes(redirectResult.user.email || '');
            const userDataToSave = {
              role: isAdmin ? 'admin' : 'user',
              approved: true, // Auto-approve all users
              name: redirectResult.user.displayName || 'User',
              email: redirectResult.user.email || '',
              authEmail: redirectResult.user.email || '',
              isOnline: true,
              createdAt: Date.now(),
              lastLoginAt: Date.now(),
              ...(isAdmin ? {} : {}), // Removed companyName
            };
            await setDoc(userDocRef, userDataToSave);
            setUserData(userDataToSave as UserData);
          }
          
          // Clear the redirect flag
          sessionStorage.removeItem('google_signin_redirect');
        }
      } catch (error: any) {
        console.error('Error handling redirect result:', error);
        // Clear the redirect flag on error
        sessionStorage.removeItem('google_signin_redirect');
      }
    };

    // Always check redirect result on mount to complete Google login on mobile
    handleRedirectResult();

    return () => {
      unsubscribe();
      if (docUnsubscribe) {
        docUnsubscribe();
      }
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    
    const handleVisibilityChange = () => {
      const dbInstance = getDbInstance();
      if (!dbInstance) return;
      const docRef = doc(dbInstance, 'users', user.uid);
      try {
        if (document.visibilityState === 'visible') {
          updateDoc(docRef, { isOnline: true }).catch(() => {});
        } else {
          updateDoc(docRef, { isOnline: false }).catch(() => {});
        }
      } catch {}
    };
    
    const handleBeforeUnload = () => {
      const dbInstance = getDbInstance();
      if (!dbInstance) return;
      const docRef = doc(dbInstance, 'users', user.uid);
      try {
        updateDoc(docRef, { isOnline: false }).catch(() => {});
      } catch {}
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [user]);

  const signIn = async (email: string, password: string) => {
    try {
      console.log('🔐 Starting sign-in process for:', email);

      const authInstance = getAuthInstance();
      if (!authInstance) {
        console.error('❌ Auth instance not initialized');
        throw new Error('Authentication service not available. Please check your connection.');
      }

      console.log('🔄 Attempting Firebase authentication...');
      const userCredential = await signInWithEmailAndPassword(authInstance, email, password);
      console.log('✅ Firebase auth successful for user:', userCredential.user.uid);

      const dbInstance = getDbInstance();
      if (!dbInstance) {
        console.error('❌ Database instance not initialized');
        throw new Error('Database service not available. Please try again later.');
      }

      const userDocRef = doc(dbInstance, 'users', userCredential.user.uid);
      console.log('🔍 Fetching user document:', userDocRef.path);

      const userDoc = await getDoc(userDocRef);
      console.log('📄 User document exists:', userDoc.exists());

      if (userDoc.exists()) {
        const data = userDoc.data() as UserData;
        
        // Ensure authEmail and login timestamp are updated
        await updateDoc(userDocRef, { 
          authEmail: userCredential.user.email || data.email || '',
          lastLoginAt: Date.now(),
          ...(!data.createdAt ? { createdAt: Date.now() } : {})
        }).catch(console.error);

        console.log('👤 User data retrieved:', { role: data.role, approved: data.approved, name: data.name });

        if (!data.approved) {
          console.warn('⚠️ User account not approved yet');
          if (authInstance) {
            await firebaseSignOut(authInstance).catch(() => {});
          }
          setUser(null);
          setUserData(null);
          throw new Error('Your agency account is pending approval from the admin. You will be able to log in once approved.');
        }

        setUserData(data);
        console.log('✅ Sign-in process completed successfully');
      } else {
        console.error('❌ User document not found in database');
        if (authInstance) {
          await firebaseSignOut(authInstance).catch(() => {});
        }
        setUser(null);
        setUserData(null);
        throw new Error('This account does not exist or has been removed by admin. Please register first.');
      }
    } catch (error: any) {
      console.error('❌ Sign-in failed:', error);

      // Re-throw with more user-friendly messages
      if (error.code === 'auth/user-not-found') {
        throw new Error('No account found with this email address.');
      } else if (error.code === 'auth/wrong-password') {
        throw new Error('Incorrect password. Please try again.');
      } else if (error.code === 'auth/invalid-email') {
        throw new Error('Please enter a valid email address.');
      } else if (error.code === 'auth/user-disabled') {
        throw new Error('This account has been disabled. Please contact support.');
      } else if (error.code === 'auth/too-many-requests') {
        throw new Error('Too many failed attempts. Please try again later.');
      } else if (error.code === 'unavailable') {
        throw new Error('Service temporarily unavailable. Please check your connection.');
      }

      throw error;
    }
  };

  const signInWithGoogle = async () => {
    try {
      const authInstance = getAuthInstance();
      if (!authInstance) throw new Error('Auth not initialized');

      const provider = new GoogleAuthProvider();
      
      // Configure Google Auth provider for better popup handling
      provider.setCustomParameters({
        prompt: 'select_account' // Force account selection
      });

      let userCredential;
      
      try {
        // Try popup first
        userCredential = await signInWithPopup(authInstance, provider);
      } catch (popupError: any) {
        // If popup fails, try redirect method as fallback
        if (popupError.code === 'auth/popup-blocked' || 
            popupError.code === 'auth/popup-closed-by-user' || 
            popupError.code === 'auth/cancelled-popup-request') {
          
          console.warn('Popup method failed, attempting redirect method...');
          
          // Store a flag in sessionStorage to indicate we're using redirect
          sessionStorage.setItem('google_signin_redirect', 'true');
          
          // Use redirect method
          await signInWithRedirect(authInstance, provider);
          
          // This will redirect the page, so we won't reach here
          return;
        }
        
        // If it's not a popup-related error, re-throw
        throw popupError;
      }

      console.log('Google User UID:', userCredential.user.uid);

      const dbInstance = getDbInstance();
      if (!dbInstance) throw new Error('Database not initialized');

      const userDocRef = doc(dbInstance, 'users', userCredential.user.uid);
      console.log('Looking for document:', userDocRef.path);
      const userDoc = await getDoc(userDocRef);
      console.log('Document exists:', userDoc.exists());
      if (userDoc.exists()) {
        const data = userDoc.data() as UserData;
        
        // Ensure authEmail and login timestamp are updated
        await updateDoc(userDocRef, { 
          authEmail: userCredential.user.email || data.email || '',
          lastLoginAt: Date.now(),
          ...(!data.createdAt ? { createdAt: Date.now() } : {})
        }).catch(console.error);

        console.log('User data:', data);
        if (!data.approved) {
          throw new Error('Account not approved yet. Please wait for admin approval.');
        }
        setUserData(data);
      } else {
        // For Google sign-in, if no document exists, create one as agency (or check if it's admin email)
        const adminEmails = process.env.NEXT_PUBLIC_ADMIN_EMAILS?.split(',').map(email => email.trim()) || [];
        const isAdmin = adminEmails.includes(userCredential.user.email || '');
        const userDataToSave = {
          role: isAdmin ? 'admin' : 'user',
          approved: isAdmin ? true : true, // Auto-approve admin AND regular users
          name: userCredential.user.displayName || 'User',
          email: userCredential.user.email || '',
          authEmail: userCredential.user.email || '',
          isOnline: true,
          createdAt: Date.now(),
          lastLoginAt: Date.now(),
          ...(isAdmin ? {} : {}), // Removed companyName for normal users
        };
        await setDoc(userDocRef, userDataToSave);
        setUserData(userDataToSave as UserData);
      }
    } catch (error: any) {
      // Handle popup-related errors gracefully
      if (error.code === 'auth/popup-blocked' || error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
        console.warn('Google sign-in popup was blocked or cancelled. Please allow popups for this site or use email/password login.');
        throw new Error('Google sign-in popup was blocked. Please allow popups for this site or use email/password login instead.');
      }
      throw error;
    }
  };

  const signOut = async () => {
    try {
      if (user) {
        const dbInstance = getDbInstance();
        if (dbInstance) {
          try {
            await updateDoc(doc(dbInstance, 'users', user.uid), { isOnline: false });
          } catch {}
        }
      }
      // Clear cached agency chat & auth data
      try {
        sessionStorage.removeItem('agency_conversations');
        sessionStorage.removeItem('agency_chat_messages');
        sessionStorage.removeItem('agency_selected_conversation');
        sessionStorage.removeItem('tripdm_auth_userdata');
      } catch {}
      const authInstance = getAuthInstance();
      if (authInstance) {
        await firebaseSignOut(authInstance);
      }
      setUser(null);
      setUserData(null);
    } catch (error) {
      console.warn('Sign out warning:', error);
    }
  };

  const register = async (email: string, password: string, role: 'agency' | 'user', userDataInput: Omit<UserData, 'role' | 'approved'>, file?: File) => {
    try {
      const authInstance = getAuthInstance();
      if (!authInstance) throw new Error('Auth not initialized');

      let userCredential;
      try {
        userCredential = await createUserWithEmailAndPassword(authInstance, email, password);
      } catch (authErr: any) {
        if (authErr.code === 'auth/email-already-in-use') {
          // Check if this is an orphaned account (e.g., previously removed by admin)
          try {
            const cleanRes = await fetch('/api/auth/clean-orphaned-user', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email })
            });
            const cleanData = await cleanRes.json();
            if (cleanData.cleaned) {
              // Retry account creation now that the orphaned record was removed
              userCredential = await createUserWithEmailAndPassword(authInstance, email, password);
            } else {
              throw authErr;
            }
          } catch (retryErr) {
            throw authErr;
          }
        } else {
          throw authErr;
        }
      }
      const user = userCredential.user;

      let uploadedFileUrl: string | null = null;
      // Upload file if provided via R2 API
      if (file) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('category', role === 'agency' ? 'logos' : 'proofs');
        formData.append('userId', user.uid);

        const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData });
        if (!uploadRes.ok) {
          const errData = await uploadRes.json().catch(() => ({}));
          throw new Error(errData.error || (role === 'agency' ? 'Agency logo upload failed' : 'Identity proof upload failed'));
        }
        const uploadData = await uploadRes.json();
        uploadedFileUrl = uploadData.url;
      }

      // Save to Firestore
      const userDataToSave = {
        role,
        approved: role === 'user', // Auto-approve users, agencies need manual approval
        name: userDataInput.name || 'User',
        email: email,
        authEmail: email,
        isOnline: true,
        ...userDataInput,
        ...(uploadedFileUrl && (role === 'agency' ? {
          logoUrl: uploadedFileUrl,
          agencyLogo: uploadedFileUrl,
          avatarUrl: uploadedFileUrl,
        } : {
          proofUrl: uploadedFileUrl,
        })),
        ...(role === 'agency' && {
          plan: 'free',
          credits: 0,
          freeChats: 2,
          unlockedUsers: [],
          creditHistory: [
            {
              id: 'TX-INIT',
              type: 'reset',
              amount: 2,
              description: 'Welcome Bonus: 2 Free Chats',
              timestamp: Date.now()
            }
          ]
        })
      };

      // 1. Save via server-side Admin API to prevent client permission issues
      try {
        const saveRes = await fetch('/api/auth/register-agency', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.uid,
            userData: userDataToSave
          })
        });
        if (!saveRes.ok) {
          const dbInstance = getDbInstance();
          if (dbInstance) {
            await setDoc(doc(dbInstance, 'users', user.uid), userDataToSave);
          }
        }
      } catch (saveErr) {
        const dbInstance = getDbInstance();
        if (dbInstance) {
          await setDoc(doc(dbInstance, 'users', user.uid), userDataToSave);
        }
      }
    } catch (error: any) {
      console.error('Registration error details:', error);
      // Handle specific Firebase errors with user-friendly messages
      if (error.code === 'auth/email-already-in-use') {
        throw new Error('This email is already registered. Please use a different email address or try logging in instead.');
      } else if (error.code === 'auth/weak-password') {
        throw new Error('Password should be at least 6 characters long.');
      } else if (error.code === 'auth/invalid-email') {
        throw new Error('Please enter a valid email address.');
      } else if (error.message) {
        throw error;
      } else {
        throw new Error('Registration failed. Please try again.');
      }
    }
  };

  const value = {
    user,
    userData,
    loading,
    signIn,
    signInWithGoogle,
    signOut,
    register,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
