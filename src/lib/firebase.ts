import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getDatabase, type Database } from 'firebase/database';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

let app: FirebaseApp | null = null;
let _auth: Auth | null = null;
let _db: Firestore | null = null;
let _rtdb: Database | null = null;
let _storage: FirebaseStorage | null = null;

function getFirebaseConfig() {
  return {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || `https://travel-agent-management-29c27-default-rtdb.firebaseio.com/`,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };
}

function initializeFirebaseApp() {
  if (!app && typeof window !== 'undefined' && process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
    app = initializeApp(getFirebaseConfig());
  }
}

export const getAuthInstance = (): Auth | null => {
  if (!_auth) {
    initializeFirebaseApp();
    if (app) {
      _auth = getAuth(app);
    }
  }
  return _auth;
};

export const getDbInstance = (): Firestore | null => {
  if (!_db) {
    initializeFirebaseApp();
    if (app) {
      _db = getFirestore(app);
    }
  }
  return _db;
};

export const getRtdbInstance = (): Database | null => {
  if (!_rtdb) {
    initializeFirebaseApp();
    if (app) {
      _rtdb = getDatabase(app);
    }
  }
  return _rtdb;
};

export const getStorageInstance = (): FirebaseStorage | null => {
  if (!_storage) {
    initializeFirebaseApp();
    if (app) {
      _storage = getStorage(app);
    }
  }
  return _storage;
};

// For backward compatibility, but these will be null during SSR/build time
export const auth = getAuthInstance();
export const db = getDbInstance();
export const rtdb = getRtdbInstance();
export const storage = getStorageInstance();
