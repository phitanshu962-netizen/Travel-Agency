"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageHandler = void 0;
const ws_1 = __importDefault(require("ws"));
const types_1 = require("./types");
class MessageHandler {
    constructor(messageService, userService) {
        this.messageService = messageService;
        this.userService = userService;
        this.connections = new Map(); // ws -> userId
        this.userConnections = new Map(); // userId -> ws
    }
    registerUser(userId, ws) {
        this.connections.set(ws, userId);
        this.userConnections.set(userId, ws);
        // Update user online status
        this.userService.updateUserOnlineStatus(userId, true);
    }
    unregisterUser(userId) {
        const ws = this.userConnections.get(userId);
        if (ws) {
            this.connections.delete(ws);
            this.userConnections.delete(userId);
            // Update user offline status
            this.userService.updateUserOnlineStatus(userId, false);
        }
    }
    async handleAuth(ws, message) {
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
            }
            else {
                // Try real authentication
                const auth = await Promise.resolve().then(() => __importStar(require('./auth')));
                result = await auth.handleAuthMessage(message);
            }
            if (result) {
                let dbUser;
                // For demo users, skip database operations to avoid Firebase auth issues
                if (result.user.isAnonymous && (result.userId.includes('demo') || token.includes('guest'))) {
                    console.log('Demo user - skipping database operations');
                    dbUser = {
                        id: result.userId,
                        display_name: result.user.displayName,
                        email: result.user.email,
                        avatar_url: '',
                        bio: '',
                        is_online: true,
                        last_seen: new Date()
                    };
                }
                else {
                    // Create or update user in database for real users
                    dbUser = await this.userService.createOrUpdateUser({
                        id: result.userId,
                        email: result.user.email,
                        displayName: result.user.displayName,
                        isAnonymous: result.user.isAnonymous
                    });
                }
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
                const successMessage = {
                    type: types_1.MessageType.AUTH,
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
                    },
                    timestamp: Date.now()
                };
                this.sendToWebSocket(ws, successMessage);
                console.log(`User ${result.userId} authenticated successfully`);
            }
            else {
                // Send failure response
                const failureMessage = {
                    type: types_1.MessageType.AUTH,
                    payload: { success: false, error: 'Authentication failed' },
                    timestamp: Date.now()
                };
                this.sendToWebSocket(ws, failureMessage);
                ws.close(1008, 'Authentication failed');
            }
        }
        catch (error) {
            console.error('Authentication error:', error);
            const errorMessage = {
                type: types_1.MessageType.AUTH,
                payload: { success: false, error: 'Authentication error' },
                timestamp: Date.now()
            };
            this.sendToWebSocket(ws, errorMessage);
            ws.close(1011, 'Authentication error');
        }
    }
    async handleMessage(ws, message) {
        const userId = this.connections.get(ws);
        if (!userId) {
            this.sendError(ws, 'Connection not authenticated');
            return;
        }
        try {
            const payload = message.payload;
            if (!payload.to || !payload.content) {
                this.sendError(ws, 'Invalid message payload');
                return;
            }
            // Save message to database
            const savedMessage = await this.messageService.saveMessage(userId, payload.to, payload.content);
            // Create message response
            const messageResponse = {
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
                const outgoingMessage = {
                    type: types_1.MessageType.MESSAGE,
                    payload: messageResponse,
                    timestamp: Date.now()
                };
                this.sendToWebSocket(recipientWs, outgoingMessage);
            }
            // Send back to sender as confirmation
            const confirmationMessage = {
                type: types_1.MessageType.MESSAGE,
                payload: messageResponse,
                timestamp: Date.now()
            };
            this.sendToWebSocket(ws, confirmationMessage);
        }
        catch (error) {
            console.error('Error handling message:', error);
            this.sendError(ws, 'Failed to send message');
        }
    }
    async handleAck(ws, message) {
        const userId = this.connections.get(ws);
        if (!userId) {
            this.sendError(ws, 'Connection not authenticated');
            return;
        }
        try {
            const payload = message.payload;
            if (!payload.messageId) {
                this.sendError(ws, 'Invalid ACK payload');
                return;
            }
            await this.messageService.acknowledgeMessage(payload.messageId, userId);
            // Send ACK confirmation back to sender
            const ackMessage = {
                type: types_1.MessageType.ACK,
                payload: { messageId: payload.messageId },
                timestamp: Date.now()
            };
            this.sendToWebSocket(ws, ackMessage);
        }
        catch (error) {
            console.error('Error handling ACK:', error);
            this.sendError(ws, 'Failed to acknowledge message');
        }
    }
    async handleHistoryRequest(ws, message) {
        const userId = this.connections.get(ws);
        if (!userId) {
            this.sendError(ws, 'Connection not authenticated');
            return;
        }
        try {
            const payload = message.payload;
            if (!payload.withUserId) {
                this.sendError(ws, 'Invalid history request payload');
                return;
            }
            const messages = await this.messageService.getMessageHistory(userId, payload.withUserId, payload.limit, payload.beforeTimestamp);
            const historyResponse = {
                withUserId: payload.withUserId,
                messages
            };
            const responseMessage = {
                type: types_1.MessageType.HISTORY_RESPONSE,
                payload: historyResponse,
                timestamp: Date.now()
            };
            this.sendToWebSocket(ws, responseMessage);
        }
        catch (error) {
            console.error('Error handling history request:', error);
            this.sendError(ws, 'Failed to retrieve message history');
        }
    }
    handlePing(ws) {
        // Respond with pong
        const pongMessage = {
            type: types_1.MessageType.PONG,
            timestamp: Date.now()
        };
        this.sendToWebSocket(ws, pongMessage);
    }
    cleanupOldMessages() {
        // Run cleanup in background
        this.messageService.cleanupOldMessages().catch(error => {
            console.error('Error cleaning up old messages:', error);
        });
    }
    getOnlineUsersCount() {
        return this.userConnections.size;
    }
    sendToWebSocket(ws, message) {
        if (ws.readyState === ws_1.default.OPEN) {
            try {
                ws.send(JSON.stringify(message));
            }
            catch (error) {
                console.error('Error sending message to WebSocket:', error);
            }
        }
    }
    sendError(ws, error) {
        const errorMessage = {
            type: types_1.MessageType.ERROR,
            payload: { error },
            timestamp: Date.now()
        };
        this.sendToWebSocket(ws, errorMessage);
    }
}
exports.MessageHandler = MessageHandler;
