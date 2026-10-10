'use client';

import { doc, setDoc, arrayUnion } from 'firebase/firestore';
import { getDbInstance, getFirebaseAppInstance } from '@/lib/firebase';

/**
 * Check if the current browser environment supports Push Notifications & Service Workers
 */
export function isPushNotificationSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'Notification' in window &&
    'serviceWorker' in navigator &&
    'PushManager' in window
  );
}

/**
 * Get current permission state: 'granted' | 'denied' | 'default' | 'unsupported'
 */
export function getNotificationPermissionStatus(): NotificationPermission | 'unsupported' {
  if (!isPushNotificationSupported()) return 'unsupported';
  return Notification.permission;
}

/**
 * Request notification permission and save the FCM device token to Firestore
 */
export async function requestAndSaveFcmToken(userId: string): Promise<{ success: boolean; token?: string; error?: string }> {
  if (!isPushNotificationSupported()) {
    return { success: false, error: 'Push notifications are not supported by this browser.' };
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return { success: false, error: 'Notification permission was denied.' };
    }

    // Register Service Worker
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
      scope: '/'
    });

    await navigator.serviceWorker.ready;

    const { getMessaging, getToken, isSupported } = await import('firebase/messaging');
    const supported = await isSupported();
    if (!supported) {
      return { success: false, error: 'Firebase Messaging is not supported in this environment.' };
    }

    const app = getFirebaseAppInstance();
    if (!app) {
      return { success: false, error: 'Firebase App not initialized.' };
    }

    const messaging = getMessaging(app);

    // VAPID key
    const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY || 'BNzm2vGbAdsH4f5ecaGPQjxl2i_rQRj1U4-_nwe2_54No8s1VOVjox7tvd3t7ZFwxdcSKgBc2A9X4mvmAH_A0zU';

    const token = await getToken(messaging, {
      serviceWorkerRegistration: registration,
      ...(vapidKey ? { vapidKey } : {})
    });

    if (!token) {
      return { success: false, error: 'Failed to generate FCM registration token.' };
    }

    // Save token to Firestore under users and fcm_tokens collections using setDoc + merge
    const db = getDbInstance();
    if (db && userId) {
      try {
        const userRef = doc(db, 'users', userId);
        await setDoc(userRef, {
          fcmToken: token,
          fcmTokens: arrayUnion(token),
          pushNotificationsEnabled: true,
          lastTokenUpdate: Date.now()
        }, { merge: true });

        const userFcmDocRef = doc(db, 'fcm_tokens', userId);
        await setDoc(userFcmDocRef, {
          userId,
          token,
          updatedAt: Date.now()
        }, { merge: true });

        const userTokenRef = doc(db, 'user_fcm_tokens', userId);
        await setDoc(userTokenRef, {
          userId,
          tokens: arrayUnion(token),
          lastUpdated: Date.now()
        }, { merge: true });
      } catch (saveErr: any) {
        console.warn('[FCM] Token sync warning:', saveErr?.message || saveErr);
      }
    }

    console.log('[FCM] Successfully registered device token for user:', userId, token.substring(0, 15) + '...');
    return { success: true, token };
  } catch (error: any) {
    console.warn('[FCM] Token initialization note:', error?.message || error);
    return { success: false, error: error?.message || 'Failed to initialize notifications.' };
  }
}

/**
 * Auto-sync FCM device token if browser permission is already granted for the domain
 */
export async function autoSyncFcmTokenIfGranted(userId: string): Promise<void> {
  if (!isPushNotificationSupported() || !userId) return;
  if (Notification.permission === 'granted') {
    try {
      await requestAndSaveFcmToken(userId);
    } catch (e) {
      console.warn('[FCM] Auto-sync token note:', e);
    }
  }
}

/**
 * Listen for foreground push messages when the customer has the tab open
 */
export async function listenToForegroundMessages(onMessageReceived?: (payload: any) => void) {
  if (!isPushNotificationSupported()) return () => {};
  try {
    const { getMessaging, onMessage, isSupported } = await import('firebase/messaging');
    const supported = await isSupported();
    if (!supported) return () => {};
    const app = getFirebaseAppInstance();
    if (!app) return () => {};
    const messaging = getMessaging(app);

    return onMessage(messaging, (payload) => {
      console.log('[FCM Foreground] Received message in tab:', payload);
      
      // Smart check: Only display OS notification if document is unfocused / hidden / or user is looking at another section
      const isWindowActive = typeof document !== 'undefined' && document.hasFocus() && !document.hidden;
      const currentChatAgency = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('user_current_chat_agency') : null;
      const isViewingThisChat = isWindowActive && currentChatAgency && currentChatAgency === payload.data?.agencyId;

      if (!isViewingThisChat && typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        const agencyName = payload.data?.agencyName || '';
        const fallbackTitle = agencyName ? `${agencyName} (TripDM)` : 'TripDM';
        const title = payload.notification?.title || payload.data?.title || fallbackTitle;
        const body = payload.notification?.body || payload.data?.body || 'You have received a new message.';
        try {
          const n = new Notification(title, {
            body,
            icon: '/tripdm-logo.png',
            tag: payload.data?.agencyId ? `chat_${payload.data.agencyId}` : 'tripdm_chat_reply',
          });
          n.onclick = () => {
            window.focus();
            if (payload.data?.url) {
              window.location.href = payload.data.url;
            }
          };
        } catch (e) {
          console.warn('[FCM] Foreground notification display note:', e);
        }
      }
      if (onMessageReceived) onMessageReceived(payload);
    });
  } catch (err) {
    console.warn('[FCM Foreground] Listener setup note:', err);
    return () => {};
  }
}

/**
 * Trigger server-side vendor reply notification to that specific customer
 */
export async function sendVendorReplyNotification(params: {
  senderId: string;
  senderName: string;
  recipientId: string;
  messageContent: string;
  packageTitle?: string;
}): Promise<{ success: boolean; deliveredCount?: number; error?: string }> {
  try {
    const res = await fetch('/api/notifications/send-chat-notification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return { success: false, error: data.error || 'Failed to dispatch notification' };
    }

    console.log('[FCM] Push dispatch result:', data);
    return { success: true, deliveredCount: data.deliveredCount };
  } catch (err: any) {
    console.warn('[FCM] Notification API dispatch note:', err?.message || err);
    return { success: false, error: err?.message };
  }
}


