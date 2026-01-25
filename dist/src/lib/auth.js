"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeFirebase = initializeFirebase;
exports.verifyToken = verifyToken;
exports.handleAuthMessage = handleAuthMessage;
exports.authenticateRequest = authenticateRequest;
exports.withAuth = withAuth;
const admin = __importStar(require("firebase-admin"));
const app_1 = require("firebase-admin/app");
// Initialize Firebase Admin
let firebaseApp = null;
function initializeFirebase() {
    if (!admin.apps.length) {
        // For Cloud Run, use service account credentials from environment
        const serviceAccount = {
            type: "service_account",
            project_id: process.env.FB_PROJECT_ID,
            private_key_id: process.env.FB_PRIVATE_KEY_ID,
            private_key: process.env.FB_PRIVATE_KEY?.replace(/\\n/g, '\n'),
            client_email: process.env.FB_CLIENT_EMAIL,
            client_id: process.env.FB_CLIENT_ID,
            auth_uri: process.env.FB_AUTH_URI,
            token_uri: process.env.FB_TOKEN_URI,
            auth_provider_x509_cert_url: process.env.FB_AUTH_PROVIDER_X509_CERT_URL,
            client_x509_cert_url: process.env.FB_CLIENT_X509_CERT_URL
        };
        firebaseApp = admin.initializeApp({
            credential: (0, app_1.cert)(serviceAccount),
            projectId: process.env.FB_PROJECT_ID
        });
    }
    else {
        firebaseApp = admin.app();
    }
}
async function verifyToken(token) {
    try {
        const decodedToken = await admin.auth().verifyIdToken(token);
        return decodedToken;
    }
    catch (error) {
        throw new Error('Invalid authentication token');
    }
}
async function handleAuthMessage(message) {
    // This function handles WebSocket authentication messages
    // It expects a token in the payload
    console.log('handleAuthMessage called with message:', JSON.stringify(message));
    if (!message.payload || !message.payload.token) {
        console.log('No payload or token found');
        return null;
    }
    const token = message.payload.token;
    console.log('Token received:', token);
    // Check if it's a demo/guest token from Android app
    if (token.includes('guest')) {
        console.log('Demo token detected (contains guest)');
        const userId = token.replace('guest-token-', '').replace('guest-', '');
        console.log('Extracted userId:', userId);
        return {
            userId: userId,
            user: {
                id: userId,
                email: '',
                displayName: 'Demo User',
                isAnonymous: true
            }
        };
    }
    console.log('Not a demo token, trying Firebase verification');
    try {
        const decodedToken = await verifyToken(token);
        return {
            userId: decodedToken.uid,
            user: {
                id: decodedToken.uid,
                email: decodedToken.email,
                displayName: decodedToken.name || decodedToken.email?.split('@')[0],
                isAnonymous: false
            }
        };
    }
    catch (error) {
        console.error('Authentication failed:', error);
        return null;
    }
}
// For API route authentication
async function authenticateRequest(request) {
    try {
        const authHeader = request.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return null;
        }
        const token = authHeader.substring(7); // Remove 'Bearer ' prefix
        return await verifyToken(token);
    }
    catch (error) {
        console.error('Request authentication failed:', error);
        return null;
    }
}
// Middleware for API routes that require authentication
function withAuth(handler) {
    return async (request) => {
        try {
            const user = await authenticateRequest(request);
            if (!user) {
                return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                    status: 401,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
            return await handler(request, user);
        }
        catch (error) {
            console.error('Auth middleware error:', error);
            return new Response(JSON.stringify({ error: 'Internal server error' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    };
}
