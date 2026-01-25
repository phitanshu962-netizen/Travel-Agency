import WebSocket from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { MessageService, messageService } from './messageService';
import { UserService, userService } from './userService';
import { MessageSyncService, messageSyncService } from './messageSyncService';
import { WebSocketMessage, MessageType, MessageResponse, AuthResponse, HistoryResponsePayload, ErrorPayload, SyncResponsePayload } from './types';

export class MessageHandler {
  private connections = new Map<WebSocket, string>(); // ws -> userId
  private userConnections = new Map<string, WebSocket>(); // userId -> ws

  constructor(
    private messageService: MessageService,
    private userService: UserService
  ) {}

  registerUser(userId: string, ws: WebSocket): void {
    this.connections.set(ws, userId);
    this.userConnections.set(userId, ws);

    // Update user online status
    this.userService.updateUserOnlineStatus(userId, true);
  }

  unregisterUser(userId: string): void {
    const ws = this.userConnections.get(userId);
    if (ws) {
      this.connections.delete(ws);
      this.userConnections.delete(userId);

      // Update user offline status
      this.userService.updateUserOnlineStatus(userId, false);
    }
  }

  async handleAuth(ws: WebSocket, message: WebSocketMessage): Promise<void> {
    try {
      console.log('handleAuth called with message:', JSON.stringify(message));

      // For demo purposes, accept any token containing 'guest'
      const token = message.payload?.token || '';
      console.log('Auth token:', token);

      let result = null;

      if (token.includes('guest')) {
        console.log('Demo token detected, accepting');
        const userId = token.replace('guest-token-', '').replace('guest-', '') || 'demo-user';
        result = {
          userId: userId,
          user: {
            id: userId,
            email: '',
            displayName: 'Demo User',
            isAnonymous: true
          }
        };
      } else {
        // Try real authentication
        const auth = await import('./auth');
        result = await auth.handleAuthMessage(message);
      }

      if (result) {
        // Create or update user in database
        const dbUser = await this.userService.createOrUpdateUser({
          id: result.userId,
          email: result.user.email,
          displayName: result.user.displayName,
          isAnonymous: result.user.isAnonymous
        });

        // Check if user is already connected
        const existingConnection = this.userConnections.get(result.userId);
        if (existingConnection) {
          // Close existing connection
          existingConnection.close(1000, 'New connection established');
          this.unregisterUser(result.userId);
        }

        // Register new connection
        this.registerUser(result.userId, ws);

        // Send success response
        const successMessage: WebSocketMessage = {
          type: MessageType.AUTH,
          payload: {
            success: true,
            user: {
              id: dbUser.id,
              displayName: dbUser.display_name,
              email: dbUser.email,
              avatar_url: dbUser.avatar_url,
              bio: dbUser.bio,
              is_online: dbUser.is_online,
              last_seen: dbUser.last_seen.toISOString()
            }
          } as AuthResponse,
          timestamp: Date.now()
        };
        this.sendToWebSocket(ws, successMessage);

        console.log(`User ${result.userId} authenticated successfully`);
      } else {
        // Send failure response
        const failureMessage: WebSocketMessage = {
          type: MessageType.AUTH,
          payload: { success: false, error: 'Authentication failed' } as AuthResponse,
          timestamp: Date.now()
        };
        this.sendToWebSocket(ws, failureMessage);
        ws.close(1008, 'Authentication failed');
      }
    } catch (error) {
      console.error('Authentication error:', error);
      const errorMessage: WebSocketMessage = {
        type: MessageType.AUTH,
        payload: { success: false, error: 'Authentication error' } as AuthResponse,
        timestamp: Date.now()
      };
      this.sendToWebSocket(ws, errorMessage);
      ws.close(1011, 'Authentication error');
    }
  }

  async handleMessage(ws: WebSocket, message: WebSocketMessage): Promise<void> {
    const userId = this.connections.get(ws);
    if (!userId) {
      this.sendError(ws, 'Connection not authenticated');
      return;
    }

    try {
      const payload = message.payload as { to: string; content: string };
      if (!payload.to || !payload.content) {
        this.sendError(ws, 'Invalid message payload');
        return;
      }

      // Save message to database
      const savedMessage = await this.messageService.saveMessage(
        userId,
        payload.to,
        payload.content
      );

      // Create message response
      const messageResponse: MessageResponse = {
        id: savedMessage.id,
        from: savedMessage.from_user_id,
        to: savedMessage.to_user_id,
        content: savedMessage.content,
        timestamp: savedMessage.timestamp,
        status: savedMessage.status
      };

      // Send to recipient if online
      const recipientWs = this.userConnections.get(payload.to);
      if (recipientWs) {
        const outgoingMessage: WebSocketMessage = {
          type: MessageType.MESSAGE,
          payload: messageResponse,
          timestamp: Date.now()
        };
        this.sendToWebSocket(recipientWs, outgoingMessage);
      }

      // Send back to sender as confirmation
      const confirmationMessage: WebSocketMessage = {
        type: MessageType.MESSAGE,
        payload: messageResponse,
        timestamp: Date.now()
      };
      this.sendToWebSocket(ws, confirmationMessage);

    } catch (error) {
      console.error('Error handling message:', error);
      this.sendError(ws, 'Failed to send message');
    }
  }

  async handleAck(ws: WebSocket, message: WebSocketMessage): Promise<void> {
    const userId = this.connections.get(ws);
    if (!userId) {
      this.sendError(ws, 'Connection not authenticated');
      return;
    }

    try {
      const payload = message.payload as { messageId: string };
      if (!payload.messageId) {
        this.sendError(ws, 'Invalid ACK payload');
        return;
      }

      await this.messageService.acknowledgeMessage(payload.messageId, userId);

      // Send ACK confirmation back to sender
      const ackMessage: WebSocketMessage = {
        type: MessageType.ACK,
        payload: { messageId: payload.messageId },
        timestamp: Date.now()
      };
      this.sendToWebSocket(ws, ackMessage);

    } catch (error) {
      console.error('Error handling ACK:', error);
      this.sendError(ws, 'Failed to acknowledge message');
    }
  }

  async handleHistoryRequest(ws: WebSocket, message: WebSocketMessage): Promise<void> {
    const userId = this.connections.get(ws);
    if (!userId) {
      this.sendError(ws, 'Connection not authenticated');
      return;
    }

    try {
      const payload = message.payload as { withUserId: string; limit?: number; beforeTimestamp?: number };
      if (!payload.withUserId) {
        this.sendError(ws, 'Invalid history request payload');
        return;
      }

      const messages = await this.messageService.getMessageHistory(
        userId,
        payload.withUserId,
        payload.limit,
        payload.beforeTimestamp
      );

      const historyResponse: HistoryResponsePayload = {
        withUserId: payload.withUserId,
        messages
      };

      const responseMessage: WebSocketMessage = {
        type: MessageType.HISTORY_RESPONSE,
        payload: historyResponse,
        timestamp: Date.now()
      };
      this.sendToWebSocket(ws, responseMessage);

    } catch (error) {
      console.error('Error handling history request:', error);
      this.sendError(ws, 'Failed to retrieve message history');
    }
  }

  async handleSyncRequest(ws: WebSocket, message: WebSocketMessage): Promise<void> {
    const userId = this.connections.get(ws);
    if (!userId) {
      this.sendError(ws, 'Connection not authenticated');
      return;
    }

    try {
      const payload = message.payload as { lastSyncTimestamp: number; limit?: number };
      if (!payload.lastSyncTimestamp) {
        this.sendError(ws, 'Invalid sync request payload');
        return;
      }

      const messages = await messageSyncService.getMissedMessages({
        userId,
        lastSyncTimestamp: payload.lastSyncTimestamp,
        limit: payload.limit
      });

      const syncResponse: SyncResponsePayload = {
        messages,
        syncTimestamp: messageSyncService.getCurrentTimestamp(),
        hasMore: messages.length === (payload.limit || 50)
      };

      const responseMessage: WebSocketMessage = {
        type: MessageType.SYNC_RESPONSE,
        payload: syncResponse,
        timestamp: Date.now()
      };
      this.sendToWebSocket(ws, responseMessage);

      console.log(`Synced ${messages.length} messages for user ${userId}`);

    } catch (error) {
      console.error('Error handling sync request:', error);
      this.sendError(ws, 'Failed to sync messages');
    }
  }

  handlePing(ws: WebSocket): void {
    // Respond with pong
    const pongMessage: WebSocketMessage = {
      type: MessageType.PONG,
      timestamp: Date.now()
    };
    this.sendToWebSocket(ws, pongMessage);
  }

  cleanupOldMessages(): void {
    // Run cleanup in background
    this.messageService.cleanupOldMessages().catch(error => {
      console.error('Error cleaning up old messages:', error);
    });
  }

  getOnlineUsersCount(): number {
    return this.userConnections.size;
  }

  private sendToWebSocket(ws: WebSocket, message: WebSocketMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify(message));
      } catch (error) {
        console.error('Error sending message to WebSocket:', error);
      }
    }
  }

  private sendError(ws: WebSocket, error: string): void {
    const errorMessage: WebSocketMessage = {
      type: MessageType.ERROR,
      payload: { error } as ErrorPayload,
      timestamp: Date.now()
    };
    this.sendToWebSocket(ws, errorMessage);
  }
}
