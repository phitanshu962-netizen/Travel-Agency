"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.messageService = exports.MessageService = void 0;
const database_1 = require("./database");
class MessageService {
    async saveMessage(fromUserId, toUserId, content) {
        return await database_1.databaseService.saveMessage({
            from_user_id: fromUserId,
            to_user_id: toUserId,
            content,
            timestamp: Date.now(),
            status: 'sent'
        });
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
