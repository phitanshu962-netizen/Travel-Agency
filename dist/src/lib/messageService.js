"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.messageService = exports.MessageService = void 0;
const database_1 = require("./database");
class MessageService {
    async saveMessage(fromUserId, toUserId, content) {
        // For demo users, skip Firebase operations and create a mock message
        if (fromUserId.includes('demo') || fromUserId.startsWith('user-')) {
            console.log(`Demo user ${fromUserId} - creating mock message`);
            const now = new Date();
            const mockId = `demo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            return {
                id: mockId,
                from_user_id: fromUserId,
                to_user_id: toUserId,
                content,
                timestamp: Date.now(),
                status: 'sent',
                created_at: now
            };
        }
        const savedMessage = await database_1.databaseService.saveMessage({
            from_user_id: fromUserId,
            to_user_id: toUserId,
            content,
            timestamp: Date.now(),
            status: 'sent'
        });
        // Also save to the web app's messages collection for compatibility
        try {
            const db = database_1.databaseService.getFirestore();
            // Use consistent chatId format: sender_receiver (smaller ID first for consistency)
            const chatId = [fromUserId, toUserId].sort().join('_');
            await db.collection('messages').add({
                text: content,
                sender: fromUserId,
                receiverId: toUserId,
                chatId: chatId,
                timestamp: savedMessage.timestamp,
                createdAt: new Date(savedMessage.created_at)
            });
        }
        catch (error) {
            console.error('Error saving message to web app collection:', error);
            // Don't fail the entire operation if web app collection save fails
        }
        return savedMessage;
    }
    async getMessageHistory(userId1, userId2, limit = 50, beforeTimestamp) {
        const messages = await database_1.databaseService.getMessageHistory(userId1, userId2, limit, beforeTimestamp);
        return messages.map(msg => ({
            id: msg.id,
            from: msg.from_user_id,
            to: msg.to_user_id,
            content: msg.content,
            timestamp: msg.timestamp,
            status: msg.status
        }));
    }
    async acknowledgeMessage(messageId, userId) {
        await database_1.databaseService.acknowledgeMessage(messageId, userId);
    }
    async cleanupOldMessages(olderThanDays = 30) {
        await database_1.databaseService.cleanupOldMessages(olderThanDays);
    }
}
exports.MessageService = MessageService;
exports.messageService = new MessageService();
