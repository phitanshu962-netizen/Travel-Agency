"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeWebSocketServer = initializeWebSocketServer;
exports.getWebSocketServer = getWebSocketServer;
exports.getMessageHandler = getMessageHandler;
const ws_1 = require("ws");
const messageHandler_1 = require("./messageHandler");
const messageService_1 = require("./messageService");
const userService_1 = require("./userService");
const types_1 = require("./types");
let wss = null;
let messageHandler = null;
function initializeWebSocketServer(server) {
    if (wss) {
        console.log('WebSocket server already initialized');
        return;
    }
    // Initialize message handler
    messageHandler = new messageHandler_1.MessageHandler(messageService_1.messageService, userService_1.userService);
    // Create WebSocket server
    wss = new ws_1.WebSocketServer({
        server,
        host: '0.0.0.0',
        path: '/api/chat/websocket'
    });
    // Clean up old messages every hour
    setInterval(() => {
        if (messageHandler) {
            messageHandler.cleanupOldMessages();
        }
    }, 60 * 60 * 1000);
    wss.on('connection', (ws, request) => {
        console.log('New WebSocket connection established');
        // Set up ping/pong for connection health
        const pingInterval = setInterval(() => {
            if (ws.readyState === ws_1.WebSocket.OPEN && messageHandler) {
                messageHandler.handlePing(ws);
            }
        }, 30000); // Ping every 30 seconds
        ws.on('message', async (data) => {
            try {
                const message = JSON.parse(data.toString());
                if (!messageHandler) {
                    sendError(ws, 'Server not ready');
                    return;
                }
                switch (message.type) {
                    case types_1.MessageType.AUTH:
                        await messageHandler.handleAuth(ws, message);
                        break;
                    case types_1.MessageType.MESSAGE:
                        await messageHandler.handleMessage(ws, message);
                        break;
                    case types_1.MessageType.ACK:
                        await messageHandler.handleAck(ws, message);
                        break;
                    case types_1.MessageType.HISTORY_REQUEST:
                        await messageHandler.handleHistoryRequest(ws, message);
                        break;
                    case types_1.MessageType.PING:
                        messageHandler.handlePing(ws);
                        break;
                    default:
                        sendError(ws, `Unknown message type: ${message.type}`);
                        break;
                }
            }
            catch (error) {
                console.error('Error processing message:', error);
                sendError(ws, 'Invalid message format');
            }
        });
        ws.on('close', () => {
            console.log('WebSocket connection closed');
            clearInterval(pingInterval);
            // Unregister user if connected
            if (messageHandler) {
                // Note: We don't have direct access to userId here
                // The messageHandler handles this internally
            }
        });
        ws.on('error', (error) => {
            console.error('WebSocket error:', error);
            clearInterval(pingInterval);
        });
    });
    wss.on('error', (error) => {
        console.error('WebSocket server error:', error);
    });
    console.log('WebSocket server initialized');
}
function getWebSocketServer() {
    return wss;
}
function getMessageHandler() {
    return messageHandler;
}
function sendError(ws, error) {
    const errorMessage = {
        type: types_1.MessageType.ERROR,
        payload: { error },
        timestamp: Date.now()
    };
    if (ws.readyState === ws_1.WebSocket.OPEN) {
        ws.send(JSON.stringify(errorMessage));
    }
}
