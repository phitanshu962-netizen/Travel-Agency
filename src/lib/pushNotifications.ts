import { getMessagingInstance, getDbInstance, getFirebaseConfig } from './firebase';
import { doc, setDoc, arrayUnion } from 'firebase/firestore';

export async function registerPushNotifications(userId?: string): Promise<string | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('Notification' in window)) {
    console.log('[Push] Push notifications not supported in this environment.');
    return null;
  }

  try {
    // Request notification permission if needed
    let permission = Notification.permission;
    if (permission === 'default') {
      permission = await Notification.requestPermission();
    }

    if (permission !== 'granted') {
      console.log('[Push] Notification permission denied or dismissed by user.');
      return null;
    }

    // Register Service Worker with config params
    const config = getFirebaseConfig();
    const swUrl = `/firebase-messaging-sw.js?apiKey=${encodeURIComponent(config.apiKey || '')}&projectId=${encodeURIComponent(config.projectId || '')}&messagingSenderId=${encodeURIComponent(config.messagingSenderId || '')}&appId=${encodeURIComponent(config.appId || '')}`;
    
    const swRegistration = await navigator.serviceWorker.register(swUrl, { scope: '/' });
    console.log('[Push] Service worker registered successfully:', swRegistration.scope);

    // Get FCM messaging instance
    const messaging = await getMessagingInstance();
    if (!messaging) {
      console.log('[Push] Messaging not supported or initialized.');
      return null;
    }

    const { getToken } = await import('firebase/messaging');

    // Get FCM Token
    const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
    const token = await getToken(messaging, {
      vapidKey: vapidKey || undefined,
      serviceWorkerRegistration: swRegistration
    });

    if (token) {
      console.log('[Push] FCM Token obtained:', token.substring(0, 15) + '...');
      if (userId) {
        await saveFcmToken(userId, token);
      }
      return token;
    } else {
      console.warn('[Push] No registration token available.');
      return null;
    }
  } catch (error: any) {
    console.warn('[Push] Registration note:', error?.message || error);
    return null;
  }
}

export async function saveFcmToken(userId: string, token: string): Promise<void> {
  const db = getDbInstance();
  if (!db || !userId || !token) return;

  try {
    // 1. Save to user document (matches Android app schema)
    const userRef = doc(db, 'users', userId);
    await setDoc(userRef, {
      fcmToken: token,
      fcmTokens: arrayUnion(token),
      pushNotificationsEnabled: true,
      lastTokenUpdate: Date.now()
    }, { merge: true });

    // 2. Save to fcm_tokens with userId as doc ID (matches Android app FCMTokenRepository.kt)
    const userFcmDocRef = doc(db, 'fcm_tokens', userId);
    await setDoc(userFcmDocRef, {
      userId,
      token,
      updatedAt: Date.now()
    }, { merge: true });

    // 3. Save to user_fcm_tokens collection
    const userTokenRef = doc(db, 'user_fcm_tokens', userId);
    await setDoc(userTokenRef, {
      userId,
      tokens: arrayUnion(token),
      lastUpdated: Date.now()
    }, { merge: true });

    console.log(`[Push] Token successfully linked to user ${userId}`);
  } catch (err: any) {
    console.warn('[Push] FCM token save note:', err?.message || err);
  }
}

export async function initForegroundNotificationListener(onNotificationReceived?: (payload: any) => void) {
  if (typeof window === 'undefined') return;

  try {
    const messaging = await getMessagingInstance();
    if (!messaging) return;

    const { onMessage } = await import('firebase/messaging');

    onMessage(messaging, (payload) => {
      console.log('[Push] Foreground notification received:', payload);

      if (onNotificationReceived) {
        onNotificationReceived(payload);
      } else {
        // Fallback default browser notification when tab is in foreground
        const title = payload.notification?.title || payload.data?.title || 'TripDM Notification';
        const body = payload.notification?.body || payload.data?.body || '';
        if (Notification.permission === 'granted') {
          new Notification(title, {
            body,
            icon: payload.notification?.icon || '/tripdm-logo.png'
          });
        }
      }
    });
  } catch (err: any) {
    console.warn('[Push] Foreground message listener note:', err?.message || err);
  }
}
