import { Metadata } from 'next';
import HomeClient from '../HomeClient';
import { parseFirestoreDocument } from '@/lib/firestoreParser';
import { Suspense } from 'react';
import PageLoader from '@/components/PageLoader';

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'travel-agent-management-29c27';

export const revalidate = 300;

async function getApprovedListings() {
  try {
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:runQuery`;
    
    const query = {
      structuredQuery: {
        from: [{ collectionId: "listings" }],
        where: {
          fieldFilter: {
            field: { fieldPath: "approved" },
            op: "EQUAL",
            value: { booleanValue: true }
          }
        },
        select: {
          fields: [
            { fieldPath: "title" }, { fieldPath: "approved" }, { fieldPath: "packageType" },
            { fieldPath: "stateName" }, { fieldPath: "countryName" }, { fieldPath: "cost" },
            { fieldPath: "price" }, { fieldPath: "itinerary" }, { fieldPath: "photos" },
            { fieldPath: "placesCovered" }, { fieldPath: "imageUrls" }, { fieldPath: "imageUrl" },
            { fieldPath: "agencyId" }, { fieldPath: "userId" }, { fieldPath: "agencyName" },
            { fieldPath: "agencyLogo" }, { fieldPath: "logoUrl" }, { fieldPath: "rating" },
            { fieldPath: "reviewsCount" }, { fieldPath: "reviews" }, { fieldPath: "tourCategories" },
            { fieldPath: "pickUpLocation" }, { fieldPath: "dropLocation" }, { fieldPath: "duration" },
            { fieldPath: "description" },
          ]
        },
        limit: 48
      }
    };

    const usersQuery = {
      structuredQuery: {
        from: [{ collectionId: "users" }],
        select: {
          fields: [
            { fieldPath: "companyName" }, { fieldPath: "name" }, { fieldPath: "displayName" },
            { fieldPath: "agencyName" }, { fieldPath: "logoUrl" }, { fieldPath: "agencyLogo" },
            { fieldPath: "avatarUrl" }, { fieldPath: "role" }, { fieldPath: "approved" },
          ]
        },
        limit: 100
      }
    };

    const [listingsRes, usersRes] = await Promise.all([
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(query),
        next: { revalidate: 300 }
      }),
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(usersQuery),
        next: { revalidate: 300 }
      }).catch(() => null)
    ]);

    if (!listingsRes.ok) {
      console.error("Error fetching listings from REST API:", await listingsRes.text());
      return [];
    }

    const data = await listingsRes.json();
    
    // Build agency map
    const agencyMap: Record<string, any> = {};
    if (usersRes && usersRes.ok) {
      try {
        const usersData = await usersRes.json();
        if (Array.isArray(usersData)) {
          usersData.forEach((item: any) => {
            if (item.document) {
              const u = parseFirestoreDocument(item.document);
              if (u && u.id) {
                agencyMap[u.id] = u;
              }
            }
          });
        }
      } catch (err) {
        console.warn("Error parsing users for SSR listings:", err);
      }
    }

    const listings = data
      .filter((item: any) => item.document)
      .map((item: any) => {
        const parsed = parseFirestoreDocument(item.document);
        const agencyId = parsed.agencyId || parsed.userId;
        const ag = agencyId ? agencyMap[agencyId] : null;
        return {
          ...parsed,
          agencyName: parsed.agencyName || ag?.companyName || ag?.name || ag?.displayName || 'Travel Agency',
          agencyLogo: parsed.agencyLogo || parsed.logoUrl || ag?.logoUrl || ag?.agencyLogo || ag?.avatarUrl || null,
          agencyData: parsed.agencyData || ag || null,
        };
      });
      
    return listings;
  } catch (error) {
    console.error("Exception fetching listings:", error);
    return [];
  }
}

export const metadata: Metadata = {
  title: "Explore Popular Destinations | TripDM",
  description: "Browse curated travel destinations, packages, and custom itineraries crafted by verified travel agents.",
  alternates: {
    canonical: 'https://tripdm.com/destinations',
  },
  openGraph: {
    title: "Explore Popular Destinations | TripDM",
    description: "Browse curated travel destinations, packages, and custom itineraries crafted by verified travel agents.",
    url: 'https://tripdm.com/destinations',
    siteName: 'TripDM',
    type: 'website',
  },
};

export default async function DestinationsPage() {
  const initialListings = await getApprovedListings();

  return (
    <Suspense fallback={<PageLoader text="Loading destinations..." />}>
      <HomeClient initialListings={initialListings} defaultSection="destinations" routeMode="user" />
    </Suspense>
  );
}
