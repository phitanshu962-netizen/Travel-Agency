import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { MessageHandler } from './messageHandler';
import { messageService } from './messageService';
import { userService } from './userService';
import { WebSocketMessage, MessageType } from './types';

let wss: WebSocketServer | null = null;
let messageHandler: MessageHandler | null = null;

export function initializeWebSocketServer(server: any) {
  if (wss) {
    console.log('WebSocket server already initialized');
    return;
  }

  // Initialize message handler
  messageHandler = new MessageHandler(messageService, userService);

  // Create WebSocket server
  wss = new WebSocketServer({
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

  wss.on('connection', (ws: WebSocket, request: IncomingMessage) => {
    console.log('New WebSocket connection established');

    // Set up ping/pong for connection health
    const pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN && messageHandler) {
        messageHandler.handlePing(ws);
      }
    }, 30000); // Ping every 30 seconds

    ws.on('message', async (data: Buffer) => {
      try {
        const message: WebSocketMessage = JSON.parse(data.toString());

        if (!messageHandler) {
          sendError(ws, 'Server not ready');
          return;
        }

        switch (message.type) {
          case MessageType.AUTH:
            await messageHandler.handleAuth(ws, message);
            break;

          case MessageType.MESSAGE:
            await messageHandler.handleMessage(ws, message);
            break;

          case MessageType.ACK:
            await messageHandler.handleAck(ws, message);
            break;

          case MessageType.HISTORY_REQUEST:
            await messageHandler.handleHistoryRequest(ws, message);
            break;

          case MessageType.PING:
            messageHandler.handlePing(ws);
            break;

          default:
            sendError(ws, `Unknown message type: ${message.type}`);
            break;
        }
      } catch (error) {
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

export function getWebSocketServer(): WebSocketServer | null {
  return wss;
}

export function getMessageHandler(): MessageHandler | null {
  return messageHandler;
}

function sendError(ws: WebSocket, error: string) {
  const errorMessage: WebSocketMessage = {
    type: MessageType.ERROR,
    payload: { error },
    timestamp: Date.now()
  };
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(errorMessage));
  }
}
