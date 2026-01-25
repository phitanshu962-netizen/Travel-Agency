import { databaseService, Message } from './database';
import { MessageResponse } from './types';

export class MessageService {
  async saveMessage(fromUserId: string, toUserId: string, content: string): Promise<Message> {
    return await databaseService.saveMessage({
      from_user_id: fromUserId,
      to_user_id: toUserId,
      content,
      timestamp: Date.now(),
      status: 'sent'
    });
  }

  async getMessageHistory(userId1: string, userId2: string, limit: number = 50, beforeTimestamp?: number): Promise<MessageResponse[]> {
    const messages = await databaseService.getMessageHistory(userId1, userId2, limit, beforeTimestamp);

    return messages.map(msg => ({
      id: msg.id,
      from: msg.from_user_id,
      to: msg.to_user_id,
      content: msg.content,
      timestamp: msg.timestamp,
      status: msg.status
    }));
  }

  async acknowledgeMessage(messageId: string, userId: string): Promise<void> {
    await databaseService.acknowledgeMessage(messageId, userId);
  }

  async cleanupOldMessages(olderThanDays: number = 30): Promise<void> {
    await databaseService.cleanupOldMessages(olderThanDays);
  }
}

export const messageService = new MessageService();
