import { Metadata } from 'next';
import HomeClient from '../HomeClient';
import { parseFirestoreDocument } from '@/lib/firestoreParser';
import { Suspense } from 'react';
import PageLoader from '@/components/PageLoader';

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'travel-agent-management-29c27';

export const revalidate = 60;

async function getInitialData() {
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
        limit: 1000
      }
    };

    const usersQuery = {
      structuredQuery: {
        from: [{ collectionId: "users" }],
        limit: 1000
      }
    };

    const [listingsRes, usersRes] = await Promise.all([
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(query),
        next: { revalidate: 30 }
      }),
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(usersQuery),
        next: { revalidate: 60 }
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

    const agencies = Object.values(agencyMap).filter((u: any) => u.role === 'agency');

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

export default async function TravelAgentsPage({
  searchParams
}: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }> | { [key: string]: string | string[] | undefined };
}) {
  const resolvedParams = searchParams ? await Promise.resolve(searchParams) : {};
  const defaultAgencyId = typeof resolvedParams.agencyId === 'string' ? resolvedParams.agencyId : undefined;

  const { listings, agencies } = await getInitialData();

  return (
    <Suspense fallback={<PageLoader text="Loading travel agents..." />}>
      <HomeClient
        initialListings={listings}
        initialAgencies={agencies}
        defaultSection="agents"
        defaultAgencyId={defaultAgencyId}
        routeMode="user"
      />
    </Suspense>
  );
}
