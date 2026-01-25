// Script to create approved listings using Firebase Admin SDK
const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('./firebase-admin-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'travel-agent-management-29c27'
});

const db = admin.firestore();

async function createApprovedListings() {
  console.log('Creating approved travel listings with Admin SDK...');

  try {
    // Use a fixed agency ID since we're using Admin SDK
    const agencyId = 'test-agency-admin';

    // Create agency user document first
    await db.collection('users').doc(agencyId).set({
      id: agencyId,
      email: 'test@travelagency.com',
      name: 'Test Agency',
      companyName: 'Test Travel Agency',
      role: 'agency',
      approved: true,
      createdAt: admin.firestore.Timestamp.fromDate(new Date())
    });
    console.log('✅ Created test agency user');

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
        agencyId: agencyId,
        agencyName: 'Test Travel Agency',
        approved: true,
        createdAt: admin.firestore.Timestamp.fromDate(new Date())
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
        agencyId: agencyId,
        agencyName: 'Test Travel Agency',
        approved: true,
        createdAt: admin.firestore.Timestamp.fromDate(new Date())
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
        agencyId: agencyId,
        agencyName: 'Test Travel Agency',
        approved: true,
        createdAt: admin.firestore.Timestamp.fromDate(new Date())
      },
      {
        title: 'Santorini Romantic Escape',
        description: 'Fall in love with the stunning sunsets and white-washed buildings of Santorini. Perfect for couples seeking romance and relaxation.',
        price: 3299.0,
        duration: 5,
        destination: 'Santorini, Greece',
        type: 'romantic',
        photos: ['https://example.com/santorini1.jpg'],
        rating: 4.7,
        reviewsCount: 28,
        agencyId: agencyId,
        agencyName: 'Test Travel Agency',
        approved: true,
        createdAt: admin.firestore.Timestamp.fromDate(new Date())
      },
      {
        title: 'Machu Picchu Cultural Journey',
        description: 'Embark on a spiritual journey to the ancient Incan citadel of Machu Picchu with expert guides and cultural immersion.',
        price: 2899.0,
        duration: 8,
        destination: 'Cusco, Peru',
        type: 'cultural',
        photos: ['https://example.com/machu1.jpg'],
        rating: 4.6,
        reviewsCount: 19,
        agencyId: agencyId,
        agencyName: 'Test Travel Agency',
        approved: true,
        createdAt: admin.firestore.Timestamp.fromDate(new Date())
      },
      {
        title: 'Maldives Family Paradise',
        description: 'Create unforgettable family memories in the crystal-clear waters of the Maldives with water sports and kids activities.',
        price: 4199.0,
        duration: 7,
        destination: 'Maldives',
        type: 'family',
        photos: ['https://example.com/maldives1.jpg'],
        rating: 4.4,
        reviewsCount: 35,
        agencyId: agencyId,
        agencyName: 'Test Travel Agency',
        approved: true,
        createdAt: admin.firestore.Timestamp.fromDate(new Date())
      }
    ];

    console.log('Creating approved travel listings...');
    for (const listing of listings) {
      const docRef = await db.collection('listings').add(listing);
      console.log(`✅ Added approved listing: ${listing.title} (ID: ${docRef.id})`);
    }

    console.log('\n🎉 All approved listings created successfully!');
    console.log('The mobile app should now display these travel packages.');

  } catch (error) {
    console.error('❌ Error:', error);
  }

  process.exit(0);
}

// Check if listings already exist
async function checkExistingListings() {
  console.log('Checking existing listings...');
  try {
    const listingsRef = db.collection('listings');
    const snapshot = await listingsRef.get();

    console.log(`Found ${snapshot.size} total listings:`);
    snapshot.forEach((doc) => {
      const data = doc.data();
      console.log(`- ${data.title} (${doc.id}) - approved: ${data.approved}`);
    });

    // Check approved listings
    const approvedSnapshot = await listingsRef.where('approved', '==', true).get();
    console.log(`Found ${approvedSnapshot.size} approved listings`);

  } catch (error) {
    console.error('Error checking listings:', error);
  }
}

if (process.argv[2] === 'check') {
  checkExistingListings();
} else {
  createApprovedListings();
}
