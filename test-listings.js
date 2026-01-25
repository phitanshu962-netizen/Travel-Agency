// Test script to add sample listings using Firebase Admin SDK
const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('./firebase-admin-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'travel-agent-management-29c27'
});

const db = admin.firestore();

async function addSampleListings() {
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
      agencyId: 'agency1',
      agencyName: 'Adventure Travels',
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
      agencyId: 'agency2',
      agencyName: 'Luxury Escapes',
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
      agencyId: 'agency3',
      agencyName: 'Budget Adventures',
      approved: true,
      createdAt: admin.firestore.Timestamp.fromDate(new Date())
    }
  ];

  console.log('Adding sample travel listings...');

  for (const listing of listings) {
    try {
      const docRef = await db.collection('listings').add(listing);
      console.log(`✅ Added listing: ${listing.title} (ID: ${docRef.id})`);
    } catch (error) {
      console.error(`❌ Error adding listing ${listing.title}:`, error);
    }
  }

  console.log('Sample listings added successfully!');
  process.exit(0);
}

addSampleListings();
