import { initializeApp, getApps, cert, type ServiceAccount } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { v4 as uuidv4 } from 'uuid';

export interface User {
  id: string;
  email?: string;
  display_name?: string;
  avatar_url?: string;
  bio?: string;
  is_online: boolean;
  last_seen: Date;
  created_at: Date;
  updated_at: Date;
}

export interface Message {
  id: string;
  from_user_id: string;
  to_user_id: string;
  content: string;
  timestamp: number;
  status: 'sent' | 'delivered' | 'read';
  created_at: Date;
}

export interface MessageAck {
  message_id: string;
  user_id: string;
  timestamp: number;
}

class DatabaseService {
  private db: FirebaseFirestore.Firestore | null = null;

  private initializeFirebase() {
    // Firebase Admin SDK is already initialized in auth.ts
    // Just ensure we have the Firestore instance
    if (!this.db) {
      this.db = getFirestore();
    }
  }

  async initialize(): Promise<void> {
    // Firebase Firestore doesn't need explicit table creation
    // Collections are created automatically when first document is added
    console.log('Firebase Firestore initialized successfully');
  }

  async createOrUpdateUser(userData: {
    id: string;
    email?: string;
    displayName?: string;
    avatar_url?: string;
    bio?: string;
    isAnonymous?: boolean;
  }): Promise<User> {
    this.initializeFirebase();
    const userRef = this.db!.collection('chat_users').doc(userData.id);
    const now = new Date();

    const userDoc = await userRef.get();
    let existingData: any = {};

    if (userDoc.exists) {
      existingData = userDoc.data();
    }

    const userDataToSave = {
      id: userData.id,
      email: userData.email || existingData.email,
      display_name: userData.displayName || existingData.display_name,
      avatar_url: userData.avatar_url || existingData.avatar_url,
      bio: userData.bio || existingData.bio,
      is_online: existingData.is_online || false,
      last_seen: existingData.last_seen || Timestamp.fromDate(now),
      created_at: existingData.created_at || Timestamp.fromDate(now),
      updated_at: Timestamp.fromDate(now)
    };

    await userRef.set(userDataToSave, { merge: true });

    return {
      id: userDataToSave.id,
      email: userDataToSave.email,
      display_name: userDataToSave.display_name,
      avatar_url: userDataToSave.avatar_url,
      bio: userDataToSave.bio,
      is_online: userDataToSave.is_online,
      last_seen: userDataToSave.last_seen.toDate(),
      created_at: userDataToSave.created_at.toDate(),
      updated_at: userDataToSave.updated_at.toDate()
    };
  }

  async getUserById(id: string): Promise<User | null> {
    this.initializeFirebase();
    const userRef = this.db!.collection('chat_users').doc(id);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return null;
    }

    const data = userDoc.data()!;
    return {
      id: data.id,
      email: data.email,
      display_name: data.display_name,
      avatar_url: data.avatar_url,
      bio: data.bio,
      is_online: data.is_online || false,
      last_seen: data.last_seen?.toDate() || new Date(),
      created_at: data.created_at?.toDate() || new Date(),
      updated_at: data.updated_at?.toDate() || new Date()
    };
  }

  async updateUserOnlineStatus(userId: string, isOnline: boolean): Promise<void> {
    this.initializeFirebase();
    const userRef = this.db!.collection('chat_users').doc(userId);
    await userRef.update({
      is_online: isOnline,
      last_seen: Timestamp.fromDate(new Date()),
      updated_at: Timestamp.fromDate(new Date())
    });
  }

  async saveMessage(message: Omit<Message, 'id' | 'created_at'>): Promise<Message> {
    this.initializeFirebase();
    const id = uuidv4();
    const now = new Date();

    const messageData = {
      id,
      from_user_id: message.from_user_id,
      to_user_id: message.to_user_id,
      content: message.content,
      timestamp: message.timestamp,
      status: message.status,
      created_at: Timestamp.fromDate(now)
    };

    await this.db!.collection('chat_messages').doc(id).set(messageData);

    return {
      id,
      from_user_id: message.from_user_id,
      to_user_id: message.to_user_id,
      content: message.content,
      timestamp: message.timestamp,
      status: message.status,
      created_at: now
    };
  }

  async getMessageHistory(userId1: string, userId2: string, limit: number = 50, beforeTimestamp?: number): Promise<Message[]> {
    this.initializeFirebase();
    let query = this.db!.collection('chat_messages')
      .where('from_user_id', 'in', [userId1, userId2])
      .where('to_user_id', 'in', [userId1, userId2])
      .orderBy('timestamp', 'desc')
      .limit(limit);

    if (beforeTimestamp) {
      query = query.where('timestamp', '<', beforeTimestamp);
    }

    const snapshot = await query.get();
    const messages: Message[] = [];

    snapshot.forEach(doc => {
      const data = doc.data();
      messages.push({
        id: data.id,
        from_user_id: data.from_user_id,
        to_user_id: data.to_user_id,
        content: data.content,
        timestamp: data.timestamp,
        status: data.status,
        created_at: data.created_at?.toDate() || new Date()
      });
    });

    // Reverse to get chronological order (oldest first)
    return messages.reverse();
  }

  async acknowledgeMessage(messageId: string, userId: string): Promise<void> {
    this.initializeFirebase();
    const ackId = `${messageId}_${userId}`;
    const ackData = {
      message_id: messageId,
      user_id: userId,
      timestamp: Date.now(),
      created_at: Timestamp.fromDate(new Date())
    };

    // Use set with merge to avoid duplicates
    await this.db!.collection('chat_message_acks').doc(ackId).set(ackData, { merge: true });

    // Update message status
    const messageRef = this.db!.collection('chat_messages').doc(messageId);
    await messageRef.update({
      status: 'delivered'
    });
  }

  async getOnlineUsers(): Promise<User[]> {
    this.initializeFirebase();
    const snapshot = await this.db!.collection('chat_users')
      .where('is_online', '==', true)
      .orderBy('last_seen', 'desc')
      .get();

    const users: User[] = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      users.push({
        id: data.id,
        email: data.email,
        display_name: data.display_name,
        avatar_url: data.avatar_url,
        bio: data.bio,
        is_online: data.is_online || false,
        last_seen: data.last_seen?.toDate() || new Date(),
        created_at: data.created_at?.toDate() || new Date(),
        updated_at: data.updated_at?.toDate() || new Date()
      });
    });

    return users;
  }

  async cleanupOldMessages(olderThanDays: number = 30): Promise<void> {
    this.initializeFirebase();
    const cutoffTime = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000);

    // Delete old messages
    const messagesQuery = this.db!.collection('chat_messages')
      .where('timestamp', '<', cutoffTime);

    const messagesSnapshot = await messagesQuery.get();
    const batch = this.db!.batch();

    messagesSnapshot.forEach(doc => {
      batch.delete(doc.ref);
    });

    // Delete old acknowledgments
    const acksQuery = this.db!.collection('chat_message_acks')
      .where('timestamp', '<', cutoffTime);

    const acksSnapshot = await acksQuery.get();
    acksSnapshot.forEach(doc => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    console.log(`Cleaned up messages and acks older than ${olderThanDays} days`);
  }

  // Utility method for direct Firestore operations
  getFirestore(): FirebaseFirestore.Firestore {
    this.initializeFirebase();
    return this.db!;
  }

  async close(): Promise<void> {
    // Firestore doesn't need explicit closing
  }
}

export const databaseService = new DatabaseService();
