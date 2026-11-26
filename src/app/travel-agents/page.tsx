import { Metadata } from 'next';
import HomeClient from '../HomeClient';
import { parseFirestoreDocument } from '@/lib/firestoreParser';
import { Suspense } from 'react';
import PageLoader from '@/components/PageLoader';

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'travel-agent-management-29c27';

export const revalidate = 300;

async function getInitialData() {
  try {
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:runQuery`;

    // For the travel-agents page we only need images + agency linkage from listings
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
            { fieldPath: "reviewsCount" }, { fieldPath: "tourCategories" },
            { fieldPath: "pickUpLocation" }, { fieldPath: "dropLocation" }, { fieldPath: "duration" },
          ]
        },
        limit: 48
      }
    };

    // For agencies, fetch all with key profile fields only
    const usersQuery = {
      structuredQuery: {
        from: [{ collectionId: "users" }],
        where: {
          fieldFilter: {
            field: { fieldPath: "role" },
            op: "EQUAL",
            value: { stringValue: "agency" }
          }
        },
        select: {
          fields: [
            { fieldPath: "companyName" }, { fieldPath: "name" }, { fieldPath: "displayName" },
            { fieldPath: "agencyName" }, { fieldPath: "logoUrl" }, { fieldPath: "agencyLogo" },
            { fieldPath: "avatarUrl" }, { fieldPath: "role" }, { fieldPath: "approved" },
            { fieldPath: "verified" }, { fieldPath: "rating" }, { fieldPath: "reviewCount" },
            { fieldPath: "experienceYears" }, { fieldPath: "happyTravelersCount" },
            { fieldPath: "description" }, { fieldPath: "bio" }, { fieldPath: "specialties" },
            { fieldPath: "destinations" }, { fieldPath: "tripTypes" }, { fieldPath: "languages" },
            { fieldPath: "photos" }, { fieldPath: "packageImages" }, { fieldPath: "coverImage" },
            { fieldPath: "businessLocation" }, { fieldPath: "officeAddress" }, { fieldPath: "city" },
            { fieldPath: "state" }, { fieldPath: "country" }, { fieldPath: "pincode" },
            { fieldPath: "featured" }, { fieldPath: "latitude" }, { fieldPath: "longitude" },
          ]
        },
        limit: 200
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
      return { listings: [], agencies: [] };
    }

    const data = await listingsRes.json();
    
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

    const agencies = Object.values(agencyMap)
      .filter((u: any) => u.role === 'agency')
      .map((u: any) => {
        const company = (u.companyName || u.agencyName || '').trim();
        const personal = (u.name || u.displayName || '').trim();
        const isGeneric = (str: string) =>
          ['admin', 'travel agency', 'verified agency', 'verified travel agency', 'unknown agency', 'unknown'].includes(str.toLowerCase());
        const resolvedName = (company && !isGeneric(company))
          ? company
          : (personal && !isGeneric(personal))
          ? personal
          : company || personal || 'Travel Agency';
        return {
          ...u,
          name: resolvedName,
          companyName: u.companyName || resolvedName,
          agencyName: u.agencyName || resolvedName,
          ownerName: personal || u.ownerName,
        };
      });

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
      
    return { listings, agencies };
  } catch (error) {
    console.error("Exception fetching listings:", error);
    return { listings: [], agencies: [] };
  }
}

export const metadata: Metadata = {
  title: "Verified Travel Agents | TripDM",
  description: "Discover and connect directly with multiple verified travel agents across India and worldwide. Chat, compare, customize, and book with no commission.",
  alternates: {
    canonical: 'https://tripdm.com/travel-agents',
  },
  openGraph: {
    title: "Verified Travel Agents | TripDM",
    description: "Discover and connect directly with multiple verified travel agents across India and worldwide. Chat, compare, customize, and book with no commission.",
    url: 'https://tripdm.com/travel-agents',
    siteName: 'TripDM',
    type: 'website',
  },
};

export default async function TravelAgentsPage() {
  const { listings, agencies } = await getInitialData();

  return (
    <Suspense fallback={<PageLoader text="Loading travel agents..." />}>
      <HomeClient
        initialListings={listings}
        initialAgencies={agencies}
        defaultSection="agents"
        routeMode="user"
      />
    </Suspense>
  );
}
