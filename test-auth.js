// Test authentication logic directly
const { handleAuthMessage } = require('./dist/src/lib/auth');

async function testAuth() {
  console.log('Testing authentication logic directly...');

  // Test with guest token
  const guestMessage = {
    payload: { token: 'guest-token-demo-user-123' }
  };

  console.log('Testing guest token:', guestMessage.payload.token);

  try {
    const result = await handleAuthMessage(guestMessage);
    console.log('Guest auth result:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Guest auth error:', error.message);
  }

  // Test with invalid token
  const invalidMessage = {
    payload: { token: 'invalid-token' }
  };

  console.log('\nTesting invalid token:', invalidMessage.payload.token);

  try {
    const result = await handleAuthMessage(invalidMessage);
    console.log('Invalid auth result:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Invalid auth error:', error.message);
  }
}

testAuth().catch(console.error);
