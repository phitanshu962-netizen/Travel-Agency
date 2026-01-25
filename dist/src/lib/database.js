"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.databaseService = void 0;
const firestore_1 = require("firebase-admin/firestore");
const uuid_1 = require("uuid");
class DatabaseService {
    constructor() {
        this.db = null;
    }
    initializeFirebase() {
        // Firebase Admin SDK is already initialized in auth.ts
        // Just ensure we have the Firestore instance
        if (!this.db) {
            this.db = (0, firestore_1.getFirestore)();
        }
    }
    async initialize() {
        // Firebase Firestore doesn't need explicit table creation
        // Collections are created automatically when first document is added
        console.log('Firebase Firestore initialized successfully');
    }
    async createOrUpdateUser(userData) {
        this.initializeFirebase();
        const userRef = this.db.collection('chat_users').doc(userData.id);
        const now = new Date();
        const userDoc = await userRef.get();
        let existingData = {};
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
            last_seen: existingData.last_seen || firestore_1.Timestamp.fromDate(now),
            created_at: existingData.created_at || firestore_1.Timestamp.fromDate(now),
            updated_at: firestore_1.Timestamp.fromDate(now)
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
    async getUserById(id) {
        this.initializeFirebase();
        const userRef = this.db.collection('chat_users').doc(id);
        const userDoc = await userRef.get();
        if (!userDoc.exists) {
            return null;
        }
        const data = userDoc.data();
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
    async updateUserOnlineStatus(userId, isOnline) {
        this.initializeFirebase();
        const userRef = this.db.collection('chat_users').doc(userId);
        await userRef.update({
            is_online: isOnline,
            last_seen: firestore_1.Timestamp.fromDate(new Date()),
            updated_at: firestore_1.Timestamp.fromDate(new Date())
        });
    }
    async saveMessage(message) {
        this.initializeFirebase();
        const id = (0, uuid_1.v4)();
        const now = new Date();
        const messageData = {
            id,
            from_user_id: message.from_user_id,
            to_user_id: message.to_user_id,
            content: message.content,
            timestamp: message.timestamp,
            status: message.status,
            created_at: firestore_1.Timestamp.fromDate(now)
        };
        await this.db.collection('chat_messages').doc(id).set(messageData);
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
    async getMessageHistory(userId1, userId2, limit = 50, beforeTimestamp) {
        this.initializeFirebase();
        let query = this.db.collection('chat_messages')
            .where('from_user_id', 'in', [userId1, userId2])
            .where('to_user_id', 'in', [userId1, userId2])
            .orderBy('timestamp', 'desc')
            .limit(limit);
        if (beforeTimestamp) {
            query = query.where('timestamp', '<', beforeTimestamp);
        }
        const snapshot = await query.get();
        const messages = [];
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
    async acknowledgeMessage(messageId, userId) {
        this.initializeFirebase();
        const ackId = `${messageId}_${userId}`;
        const ackData = {
            message_id: messageId,
            user_id: userId,
            timestamp: Date.now(),
            created_at: firestore_1.Timestamp.fromDate(new Date())
        };
        // Use set with merge to avoid duplicates
        await this.db.collection('chat_message_acks').doc(ackId).set(ackData, { merge: true });
        // Update message status
        const messageRef = this.db.collection('chat_messages').doc(messageId);
        await messageRef.update({
            status: 'delivered'
        });
    }
    async getOnlineUsers() {
        this.initializeFirebase();
        const snapshot = await this.db.collection('chat_users')
            .where('is_online', '==', true)
            .orderBy('last_seen', 'desc')
            .get();
        const users = [];
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
    async cleanupOldMessages(olderThanDays = 30) {
        this.initializeFirebase();
        const cutoffTime = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000);
        // Delete old messages
        const messagesQuery = this.db.collection('chat_messages')
            .where('timestamp', '<', cutoffTime);
        const messagesSnapshot = await messagesQuery.get();
        const batch = this.db.batch();
        messagesSnapshot.forEach(doc => {
            batch.delete(doc.ref);
        });
        // Delete old acknowledgments
        const acksQuery = this.db.collection('chat_message_acks')
            .where('timestamp', '<', cutoffTime);
        const acksSnapshot = await acksQuery.get();
        acksSnapshot.forEach(doc => {
            batch.delete(doc.ref);
        });
        await batch.commit();
        console.log(`Cleaned up messages and acks older than ${olderThanDays} days`);
    }
    // Utility method for direct Firestore operations
    getFirestore() {
        this.initializeFirebase();
        return this.db;
    }
    async close() {
        // Firestore doesn't need explicit closing
    }
}
exports.databaseService = new DatabaseService();
