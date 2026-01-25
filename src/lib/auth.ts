import * as admin from 'firebase-admin';
import { cert } from 'firebase-admin/app';

// Initialize Firebase Admin
let firebaseApp: any = null;

export function initializeFirebase() {
  if (!admin.apps.length) {
    // For Cloud Run, use service account credentials from environment
    const serviceAccount = {
      type: "service_account",
      project_id: process.env.FIREBASE_PROJECT_ID,
      private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
      private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      client_id: process.env.FIREBASE_CLIENT_ID,
      auth_uri: process.env.FIREBASE_AUTH_URI,
      token_uri: process.env.FIREBASE_TOKEN_URI,
      auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
      client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL
    };

    firebaseApp = admin.initializeApp({
      credential: cert(serviceAccount as any),
      projectId: process.env.FIREBASE_PROJECT_ID
    });
  } else {
    firebaseApp = admin.app();
  }
}

export async function verifyToken(token: string): Promise<admin.auth.DecodedIdToken> {
  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    return decodedToken;
  } catch (error) {
    throw new Error('Invalid authentication token');
  }
}

export async function handleAuthMessage(message: any) {
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
  } catch (error) {
    console.error('Authentication failed:', error);
    return null;
  }
}

// For API route authentication
export async function authenticateRequest(request: Request): Promise<admin.auth.DecodedIdToken | null> {
  try {
    const authHeader = request.headers.get('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    return await verifyToken(token);
  } catch (error) {
    console.error('Request authentication failed:', error);
    return null;
  }
}

// Middleware for API routes that require authentication
export function withAuth(handler: (request: Request, user: admin.auth.DecodedIdToken) => Promise<Response>) {
  return async (request: Request): Promise<Response> => {
    try {
      const user = await authenticateRequest(request);

      if (!user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      return await handler(request, user);
    } catch (error) {
      console.error('Auth middleware error:', error);
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  };
}
