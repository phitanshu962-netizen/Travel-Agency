const admin = require('firebase-admin');
require('dotenv').config();

// Use service account credentials from .env file
const serviceAccount = {
  type: 'service_account',
  project_id: process.env.FB_PROJECT_ID,
  private_key_id: process.env.FB_PRIVATE_KEY_ID,
  private_key: process.env.FB_PRIVATE_KEY.replace(/\\n/g, '\n'),
  client_email: process.env.FB_CLIENT_EMAIL,
  client_id: process.env.FB_CLIENT_ID,
  auth_uri: process.env.FB_AUTH_URI,
  token_uri: process.env.FB_TOKEN_URI,
  auth_provider_x509_cert_url: process.env.FB_AUTH_PROVIDER_X509_CERT_URL,
  client_x509_cert_url: process.env.FB_CLIENT_X509_CERT_URL
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: process.env.FB_PROJECT_ID
});

const db = admin.firestore();

async function checkAdminUsers() {
  try {
    console.log('🔍 Checking for admin users in production Firestore database...');

    let adminUsersFound = false;

    // Check 'users' collection (as referenced in firestore.rules)
    console.log('\n=== Checking users collection ===');
    const usersSnapshot = await db.collection('users').get();
    console.log(`📊 Users collection has ${usersSnapshot.size} documents`);

    if (!usersSnapshot.empty) {
      usersSnapshot.forEach(doc => {
        const data = doc.data();
        console.log(`👤 User ID: ${doc.id}`);
        console.log('📋 Data:', JSON.stringify(data, null, 2));
        if (data.role === 'admin') {
          console.log('🚨 *** ADMIN USER FOUND ***');
          adminUsersFound = true;
        }
        console.log('---');
      });
    }

    // Check 'chat_users' collection (as used in database.ts)
    console.log('\n=== Checking chat_users collection ===');
    const chatUsersSnapshot = await db.collection('chat_users').get();
    console.log(`📊 Chat_users collection has ${chatUsersSnapshot.size} documents`);

    if (!chatUsersSnapshot.empty) {
      chatUsersSnapshot.forEach(doc => {
        const data = doc.data();
        console.log(`👤 User ID: ${doc.id}`);
        console.log('📋 Data:', JSON.stringify(data, null, 2));
        if (data.role === 'admin') {
          console.log('🚨 *** ADMIN USER FOUND ***');
          adminUsersFound = true;
        }
        console.log('---');
      });
    }

    // Check if there are any collections at all
    console.log('\n=== All collections in database ===');
    const collections = await db.listCollections();
    console.log(`📂 Found ${collections.length} collections:`);
    collections.forEach(collection => {
      console.log(`  • ${collection.id}`);
    });

    // Summary
    console.log('\n=== SUMMARY ===');
    if (adminUsersFound) {
      console.log('✅ Admin users exist in the database');
    } else {
      console.log('❌ No admin users found in the database');
      console.log('ℹ️  The Firestore rules support admin functionality, but no users have been assigned admin roles yet.');
    }

  } catch (error) {
    console.error('❌ Error checking admin users:', error.message);
    console.log('\n💡 Troubleshooting:');
    console.log('1. Make sure Firebase CLI is logged in: firebase login');
    console.log('2. Ensure you have access to the travel-agent-management-29c27 project');
    console.log('3. Check that Firestore is enabled in the Firebase console');
  } finally {
    process.exit(0);
  }
}

checkAdminUsers();
