const express = require('express');
const next = require('next');
const { createServer } = require('http');
const WebSocket = require('ws');

const dev = process.env.NODE_ENV !== 'production';
const nextApp = next({ dev });
const handle = nextApp.getRequestHandler();

// Initialize services
const { initializeFirebase } = require('./dist/src/lib/auth.js');
const { databaseService } = require('./dist/src/lib/database.js');
const { MessageHandler } = require('./dist/src/lib/messageHandler.js');
const { messageService } = require('./dist/src/lib/messageService.js');
const { userService } = require('./dist/src/lib/userService.js');

let messageHandler;
let wss;

async function initializeServices() {
  try {
    // Initialize Firebase (includes Firestore)
    initializeFirebase();
    console.log('Firebase initialized');

    // Initialize database service (no actual DB setup needed for Firestore)
    await databaseService.initialize();
    console.log('Database service initialized');

    // Initialize message handler
    messageHandler = new MessageHandler(messageService, userService);
    console.log('Message handler initialized');

  } catch (error) {
    console.error('Failed to initialize services:', error);
    process.exit(1);
  }
}

nextApp.prepare().then(async () => {
  await initializeServices();

  const app = express();
  const server = createServer(app);

// Initialize WebSocket server without automatic server handling
wss = new WebSocket.Server({
    noServer: true
});

console.log('WebSocket server initialized');

// Handle WebSocket upgrade manually to ensure it works with Cloud Run
server.on('upgrade', (request, socket, head) => {
  console.log('Upgrade request received:', request.url);

  if (request.url === '/api/chat/websocket') {
    console.log('Handling WebSocket upgrade for /api/chat/websocket');
    wss.handleUpgrade(request, socket, head, (ws) => {
      console.log('WebSocket upgrade successful');
      wss.emit('connection', ws, request);
    });
  } else {
    console.log('Rejecting upgrade for non-WebSocket path:', request.url);
    socket.destroy();
  }
});

  // Clean up old messages every hour
  setInterval(() => {
    if (messageHandler) {
      messageHandler.cleanupOldMessages();
    }
  }, 60 * 60 * 1000);

  wss.on('connection', (ws) => {
    console.log('New WebSocket connection established');

    // Set up ping/pong for connection health
    const pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN && messageHandler) {
        messageHandler.handlePing(ws);
      }
    }, 30000); // Ping every 30 seconds

    ws.on('message', async (data) => {
      console.log('Received WebSocket message:', data.toString());
      try {
        const message = JSON.parse(data.toString());
        console.log('Parsed message:', JSON.stringify(message));

        if (!messageHandler) {
          console.log('Message handler not ready');
          sendError(ws, 'Server not ready');
          return;
        }

        switch (message.type) {
          case 'AUTH':
            console.log('Handling AUTH message');
            await messageHandler.handleAuth(ws, message);
            break;

          case 'MESSAGE':
            await messageHandler.handleMessage(ws, message);
            break;

          case 'ACK':
            await messageHandler.handleAck(ws, message);
            break;

          case 'HISTORY_REQUEST':
            await messageHandler.handleHistoryRequest(ws, message);
            break;

          case 'SYNC_REQUEST':
            await messageHandler.handleSyncRequest(ws, message);
            break;

          case 'PING':
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

  // Handle all other routes with Next.js
  app.all('*', (req, res) => {
    return handle(req, res);
  });

  const port = process.env.PORT || 8080;

  server.listen(port, '0.0.0.0', (err) => {
    if (err) throw err;
    console.log(`> Ready on http://0.0.0.0:${port}`);
    console.log(`> WebSocket server ready on ws://0.0.0.0:${port}/api/chat/websocket`);
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('Shutting down server...');
    server.close(() => {
      databaseService.close().then(() => {
        process.exit(0);
      });
    });
  });

  process.on('SIGINT', () => {
    console.log('Shutting down server...');
    server.close(() => {
      databaseService.close().then(() => {
        process.exit(0);
      });
    });
  });
}).catch((ex) => {
  console.error(ex.stack);
  process.exit(1);
});

function sendError(ws, error) {
  const errorMessage = {
    type: 'ERROR',
    payload: { error },
    timestamp: Date.now()
  };
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(errorMessage));
  }
}
