'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, signInWithEmailAndPassword, signOut as firebaseSignOut, onAuthStateChanged, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, db, storage } from '@/lib/firebase';

interface UserData {
  role: 'admin' | 'agency' | 'user';
  approved: boolean;
  name?: string;
  companyName?: string;
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
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: User | null) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        // Fetch user data from Firestore
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (userDoc.exists()) {
          setUserData(userDoc.data() as UserData);
        }
      } else {
        setUser(null);
        setUserData(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    console.log('User UID:', userCredential.user.uid);
    const userDocRef = doc(db, 'users', userCredential.user.uid);
    console.log('Looking for document:', userDocRef.path);
    const userDoc = await getDoc(userDocRef);
    console.log('Document exists:', userDoc.exists());
    if (userDoc.exists()) {
      const data = userDoc.data() as UserData;
      console.log('User data:', data);
      if (!data.approved) {
        throw new Error('Account not approved yet. Please wait for admin approval.');
      }
      setUserData(data);
    } else {
      console.log('Available docs in users collection:');
      // Try to list all docs (this might not work in test mode, but let's see)
      throw new Error('User data not found.');
    }
  };

  const signInWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      console.log('Google User UID:', userCredential.user.uid);
      const userDocRef = doc(db, 'users', userCredential.user.uid);
      console.log('Looking for document:', userDocRef.path);
      const userDoc = await getDoc(userDocRef);
      console.log('Document exists:', userDoc.exists());
      if (userDoc.exists()) {
        const data = userDoc.data() as UserData;
        console.log('User data:', data);
        if (!data.approved) {
          throw new Error('Account not approved yet. Please wait for admin approval.');
        }
        setUserData(data);
      } else {
        // For Google sign-in, if no document exists, create one as agency (or check if it's admin email)
        const isAdmin = userCredential.user.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL;
        const userDataToSave = {
          role: isAdmin ? 'admin' : 'agency',
          approved: isAdmin, // Auto-approve admin
          name: userCredential.user.displayName || 'User',
          ...(isAdmin ? {} : { companyName: 'Pending Setup' }), // Only add companyName for agencies
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
    await firebaseSignOut(auth);
  };

  const register = async (email: string, password: string, role: 'agency' | 'user', userDataInput: Omit<UserData, 'role' | 'approved'>, file?: File) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      let proofUrl = null;
      // Upload file if provided
      if (file) {
        const storageRef = ref(storage, `proofs/${user.uid}/${file.name}`);
        await uploadBytes(storageRef, file);
        proofUrl = await getDownloadURL(storageRef);
      }

      // Save to Firestore
      await setDoc(doc(db, 'users', user.uid), {
        ...userDataInput,
        role,
        approved: role === 'user', // Users are auto-approved
        ...(proofUrl && { proofUrl }),
      });
    } catch (error: any) {
      // Handle specific Firebase errors with user-friendly messages
      if (error.code === 'auth/email-already-in-use') {
        throw new Error('This email is already registered. Please use a different email address or try logging in instead.');
      } else if (error.code === 'auth/weak-password') {
        throw new Error('Password should be at least 6 characters long.');
      } else if (error.code === 'auth/invalid-email') {
        throw new Error('Please enter a valid email address.');
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
