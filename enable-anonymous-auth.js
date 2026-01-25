// Script to test and enable anonymous authentication
// Run this after enabling anonymous auth in Firebase Console

const { initializeApp } = require('firebase/app');
const { getAuth, signInAnonymously } = require('firebase/auth');
const { getFirestore, collection, addDoc, getDocs, query, where } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: 'AIzaSyBBRmuO-xfWP-1bxiP5Ex1aSOo3dWu4Mhs',
  authDomain: 'travel-agent-management-29c27.firebaseapp.com',
  projectId: 'travel-agent-management-29c27',
  storageBucket: 'travel-agent-management-29c27.firebasestorage.app',
  messagingSenderId: '387994411670',
  appId: '1:387994411670:web:5591a4bc9e4befb09f18b7'
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function testAnonymousAuthAndAddListings() {
  try {
    console.log('🔐 Testing anonymous authentication...');

    // Test anonymous sign in
    const userCredential = await signInAnonymously(auth);
    console.log('✅ Anonymous sign in successful, user:', userCredential.user.uid);

    console.log('📝 Checking existing approved listings...');
    const q = query(collection(db, 'listings'), where('approved', '==', true));
    const querySnapshot = await getDocs(q);
    console.log(`Found ${querySnapshot.size} approved listings`);

    if (querySnapshot.size === 0) {
      console.log('🚀 No approved listings found, adding sample listings...');

      // Create agency user first
      await addDoc(collection(db, 'users'), {
        id: 'test-agency-admin',
        email: 'admin@travelagency.com',
        name: 'Travel Agency Admin',
        companyName: 'Test Travel Agency',
        role: 'agency',
        approved: true,
        createdAt: new Date()
      });
      console.log('✅ Created agency user');

      // Add sample approved listings
      const listings = [
        {
          title: 'Bali Paradise Adventure',
          description: 'Experience the magic of Bali with this comprehensive adventure package including volcano trekking, rice terrace tours, and beach relaxation.',
          price: 2499.0,
          duration: 7,
          destination: 'Bali, Indonesia',
          type: 'adventure',
          photos: ['https://example.com/bali1.jpg'],
          rating: 4.5,
          reviewsCount: 23,
          agencyId: 'test-agency-admin',
          agencyName: 'Test Travel Agency',
          approved: true,
          createdAt: new Date()
        },
        {
          title: 'Swiss Alps Luxury Getaway',
          description: 'Indulge in luxury at the Swiss Alps with private chalets, gourmet dining, and exclusive skiing experiences.',
          price: 4999.0,
          duration: 5,
          destination: 'Swiss Alps, Switzerland',
          type: 'luxury',
          photos: ['https://example.com/swiss1.jpg'],
          rating: 4.8,
          reviewsCount: 15,
          agencyId: 'test-agency-admin',
          agencyName: 'Test Travel Agency',
          approved: true,
          createdAt: new Date()
        },
        {
          title: 'Tokyo Budget Explorer',
          description: 'Discover Tokyo on a budget with guided tours of temples, shopping districts, and local cuisine experiences.',
          price: 1299.0,
          duration: 6,
          destination: 'Tokyo, Japan',
          type: 'budget',
          photos: ['https://example.com/tokyo1.jpg'],
          rating: 4.2,
          reviewsCount: 31,
          agencyId: 'test-agency-admin',
          agencyName: 'Test Travel Agency',
          approved: true,
          createdAt: new Date()
        }
      ];

      for (const listing of listings) {
        const docRef = await addDoc(collection(db, 'listings'), listing);
        console.log(`✅ Added approved listing: ${listing.title} (ID: ${docRef.id})`);
      }

      console.log('\n🎉 Setup complete! The Android app should now work properly.');
      console.log('Test the app by:');
      console.log('1. Launch the app');
      console.log('2. Tap "Continue as Guest"');
      console.log('3. Check if travel listings appear in the dashboard');
    } else {
      console.log('✅ Approved listings already exist, no action needed.');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code === 'auth/admin-restricted-operation') {
      console.log('\n🔧 SOLUTION: Enable Anonymous Authentication in Firebase Console');
      console.log('1. Go to https://console.firebase.google.com/');
      console.log('2. Select project: travel-agent-management-29c27');
      console.log('3. Go to Authentication > Sign-in method');
      console.log('4. Enable "Anonymous" sign-in provider');
      console.log('5. Run this script again');
    }
  }
}

testAnonymousAuthAndAddListings();
