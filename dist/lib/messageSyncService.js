"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.messageSyncService = exports.MessageSyncService = void 0;
const database_1 = require("./database");
class MessageSyncService {
    /**
     * Get messages that were sent while the user was offline
     * This includes messages from other users and any messages the user sent that weren't delivered via WebSocket
     */
    async getMissedMessages(options) {
        const { userId, lastSyncTimestamp, limit = 50 } = options;
        try {
            // Get messages where:
            // 1. Messages sent TO the user (from others)
            // 2. Messages sent BY the user (in case they weren't delivered via WebSocket)
            // 3. Messages newer than lastSyncTimestamp
            const messages = await database_1.databaseService.getFirestore()
                .collection('chat_messages')
                .where('timestamp', '>', lastSyncTimestamp)
                .where('to_user_id', '==', userId)
                .orderBy('timestamp', 'desc')
                .limit(limit)
                .get();
            const messageResponses = [];
            messages.forEach(doc => {
                const data = doc.data();
                messageResponses.push({
                    id: data.id,
                    from: data.from_user_id,
                    to: data.to_user_id,
                    content: data.content,
                    timestamp: data.timestamp,
                    status: data.status
                });
            });
            // Also get messages sent by the user that might not have been delivered via WebSocket
            const sentMessages = await database_1.databaseService.getFirestore()
                .collection('chat_messages')
                .where('timestamp', '>', lastSyncTimestamp)
                .where('from_user_id', '==', userId)
                .orderBy('timestamp', 'desc')
                .limit(limit)
                .get();
            sentMessages.forEach(doc => {
                const data = doc.data();
                // Only add if not already in the list (avoid duplicates)
                if (!messageResponses.find(m => m.id === data.id)) {
                    messageResponses.push({
                        id: data.id,
                        from: data.from_user_id,
                        to: data.to_user_id,
                        content: data.content,
                        timestamp: data.timestamp,
                        status: data.status
                    });
                }
            });
            // Sort by timestamp (oldest first)
            messageResponses.sort((a, b) => a.timestamp - b.timestamp);
            return messageResponses;
        }
        catch (error) {
            console.error('Error getting missed messages:', error);
            return [];
        }
    }
    /**
     * Get the latest timestamp for synchronization
     */
    getCurrentTimestamp() {
        return Date.now();
    }
    /**
     * Mark messages as delivered to prevent re-syncing
     */
    async markMessagesAsSynced(messageIds) {
        try {
            const batch = database_1.databaseService.getFirestore().batch();
            for (const messageId of messageIds) {
                const messageRef = database_1.databaseService.getFirestore()
                    .collection('chat_messages')
                    .doc(messageId);
                batch.update(messageRef, {
                    status: 'delivered',
                    synced_at: Date.now()
                });
            }
            await batch.commit();
        }
        catch (error) {
            console.error('Error marking messages as synced:', error);
        }
    }
}
exports.MessageSyncService = MessageSyncService;
exports.messageSyncService = new MessageSyncService();
