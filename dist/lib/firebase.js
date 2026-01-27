"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.storage = exports.rtdb = exports.db = exports.auth = exports.getStorageInstance = exports.getRtdbInstance = exports.getDbInstance = exports.getAuthInstance = void 0;
const app_1 = require("firebase/app");
const auth_1 = require("firebase/auth");
const firestore_1 = require("firebase/firestore");
const database_1 = require("firebase/database");
const storage_1 = require("firebase/storage");
let app = null;
let _auth = null;
let _db = null;
let _rtdb = null;
let _storage = null;
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
        app = (0, app_1.initializeApp)(getFirebaseConfig());
    }
}
const getAuthInstance = () => {
    if (!_auth) {
        initializeFirebaseApp();
        if (app) {
            _auth = (0, auth_1.getAuth)(app);
        }
    }
    return _auth;
};
exports.getAuthInstance = getAuthInstance;
const getDbInstance = () => {
    if (!_db) {
        initializeFirebaseApp();
        if (app) {
            _db = (0, firestore_1.getFirestore)(app);
        }
    }
    return _db;
};
exports.getDbInstance = getDbInstance;
const getRtdbInstance = () => {
    if (!_rtdb) {
        initializeFirebaseApp();
        if (app) {
            _rtdb = (0, database_1.getDatabase)(app);
        }
    }
    return _rtdb;
};
exports.getRtdbInstance = getRtdbInstance;
const getStorageInstance = () => {
    if (!_storage) {
        initializeFirebaseApp();
        if (app) {
            _storage = (0, storage_1.getStorage)(app);
        }
    }
    return _storage;
};
exports.getStorageInstance = getStorageInstance;
// For backward compatibility, but these will be null during SSR/build time
exports.auth = (0, exports.getAuthInstance)();
exports.db = (0, exports.getDbInstance)();
exports.rtdb = (0, exports.getRtdbInstance)();
exports.storage = (0, exports.getStorageInstance)();
