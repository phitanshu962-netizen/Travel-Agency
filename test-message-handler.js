// Test MessageHandler directly
const { MessageHandler } = require('./dist/src/lib/messageHandler');
const { messageService } = require('./dist/src/lib/messageService');
const { userService } = require('./dist/src/lib/userService');
const { initializeFirebase } = require('./dist/src/lib/auth');

async function testMessageHandler() {
  console.log('Testing MessageHandler authentication...');

  // Initialize Firebase first
  console.log('Initializing Firebase...');
  try {
    initializeFirebase();
    console.log('Firebase initialized successfully');
  } catch (error) {
    console.error('Failed to initialize Firebase:', error);
    return;
  }

  // Create a mock WebSocket
  const mockWs = {
    readyState: 1, // OPEN
    send: (data) => console.log('WebSocket send:', data),
    close: () => console.log('WebSocket close called')
  };

  // Create message handler
  const handler = new MessageHandler(messageService, userService);

  // Test AUTH message with guest token
  const authMessage = {
    type: 'AUTH',
    payload: { token: 'guest-token-demo-user-123' },
    timestamp: Date.now()
  };

  console.log('Testing AUTH message:', JSON.stringify(authMessage, null, 2));

  try {
    await handler.handleAuth(mockWs, authMessage);
    console.log('handleAuth completed successfully');
  } catch (error) {
    console.error('handleAuth failed:', error);
  }
}

testMessageHandler().catch(console.error);
