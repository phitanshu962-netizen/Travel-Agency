import * as admin from 'firebase-admin';
import { initializeFirebase } from './auth';

export interface SendPushNotificationOptions {
  userId?: string;
  tokens?: string[];
  title: string;
  body: string;
  icon?: string;
  url?: string;
  data?: Record<string, string>;
}

export async function getUserFcmTokens(db: admin.firestore.Firestore, userId: string): Promise<string[]> {
  const tokenSet = new Set<string>();

  try {
    // 1. Check user_fcm_tokens/{userId}
    const userTokenDoc = await db.collection('user_fcm_tokens').doc(userId).get();
    if (userTokenDoc.exists) {
      const data = userTokenDoc.data();
      if (data && Array.isArray(data.tokens)) {
        data.tokens.forEach((t: string) => {
          if (typeof t === 'string' && t.trim().length > 10) tokenSet.add(t.trim());
        });
      }
    }
  } catch (e) {
    console.warn(`[FCM Server] user_fcm_tokens lookup note for ${userId}:`, e);
  }

  try {
    // 2. Check users/{userId}
    const userDoc = await db.collection('users').doc(userId).get();
    if (userDoc.exists) {
      const data = userDoc.data();
      if (data) {
        if (Array.isArray(data.fcmTokens)) {
          data.fcmTokens.forEach((t: string) => {
            if (typeof t === 'string' && t.trim().length > 10) tokenSet.add(t.trim());
          });
        }
        if (typeof data.fcmToken === 'string' && data.fcmToken.trim().length > 10) {
          tokenSet.add(data.fcmToken.trim());
        }
      }
    }
  } catch (e) {
    console.warn(`[FCM Server] users doc lookup note for ${userId}:`, e);
  }

  try {
    // 3. Check fcm_tokens/{userId} (written by Android clients and direct registrations)
    const fcmTokenDoc = await db.collection('fcm_tokens').doc(userId).get();
    if (fcmTokenDoc.exists) {
      const data = fcmTokenDoc.data();
      if (data) {
        if (typeof data.token === 'string' && data.token.trim().length > 10) {
          tokenSet.add(data.token.trim());
        }
        if (typeof data.fcmToken === 'string' && data.fcmToken.trim().length > 10) {
          tokenSet.add(data.fcmToken.trim());
        }
      }
    }
  } catch (e) {
    console.warn(`[FCM Server] fcm_tokens doc lookup note for ${userId}:`, e);
  }

  return Array.from(tokenSet);
}

export async function sendWebPushNotification(options: SendPushNotificationOptions) {
  const { userId, title, body, icon = '/tripdm-logo.png', url = '/', data = {} } = options;

  initializeFirebase();

  let targetTokens: string[] = options.tokens || [];

  // If userId is provided, look up tokens from all collections in Firestore
  if (userId && targetTokens.length === 0) {
    const db = admin.firestore();
    targetTokens = await getUserFcmTokens(db, userId);
  }

  if (targetTokens.length === 0) {
    console.log(`[FCM Server] No tokens found to send notification for user ${userId || 'unknown'}`);
    return { success: false, error: 'No tokens found' };
  }

  // Construct high-urgency FCM payload for Chrome Web Push
  const multicastMessage: admin.messaging.MulticastMessage = {
    tokens: targetTokens,
    notification: {
      title,
      body,
      imageUrl: icon
    },
    webpush: {
      headers: {
        Urgency: 'normal',
        TTL: '86400' // 24 hours retention
      },
      notification: {
        title,
        body,
        icon,
        badge: icon,
        requireInteraction: false,
        actions: [
          {
            action: 'open',
            title: 'Open Message'
          }
        ]
      },
      fcmOptions: {
        link: url
      }
    },
    data: {
      ...data,
      url,
      title,
      body,
      icon,
      timestamp: Date.now().toString()
    },
    android: {
      priority: 'high',
      ttl: 86400 * 1000,
      notification: {
        title,
        body,
        icon: 'icon',
        color: '#2563eb',
        sound: 'default',
        priority: 'high',
        visibility: 'public'
      }
    }
  };

  try {
    const response = await admin.messaging().sendEachForMulticast(multicastMessage);
    console.log(`[FCM Server] Notification sent successfully! Success count: ${response.successCount}, Failure count: ${response.failureCount}`);

    // Clean up stale tokens if any failed
    if (response.failureCount > 0 && userId) {
      const db = admin.firestore();
      const validTokens: string[] = [];
      response.responses.forEach((resp, idx) => {
        if (resp.success) {
          validTokens.push(targetTokens[idx]);
        } else {
          console.warn(`[FCM Server] Token ${targetTokens[idx]} failed:`, resp.error?.message);
        }
      });

      if (validTokens.length !== targetTokens.length) {
        await db.collection('user_fcm_tokens').doc(userId).set({
          tokens: validTokens,
          lastUpdated: Date.now()
        }, { merge: true });
      }
    }

    return {
      success: true,
      successCount: response.successCount,
      failureCount: response.failureCount
    };
  } catch (error: any) {
    console.error('[FCM Server] Error sending FCM push notification:', error);
    return { success: false, error: error.message };
  }
}
