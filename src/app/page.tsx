import { Metadata } from 'next';
import HomeClient from './HomeClient';
import { parseFirestoreDocument } from '@/lib/firestoreParser';

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
        next: { revalidate: 30 } // Cache for 30 seconds
      }),
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(usersQuery),
        next: { revalidate: 60 }
      }).catch(() => null)
    ]);

    if (!listingsRes.ok) {
      console.error("Error fetching listings from REST API:", await listingsRes.text());
      return { listings: [], agencies: [] };
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

    const agencies = Object.values(agencyMap).filter((u: any) => u.role === 'agency');

    // runQuery returns an array of { document: { name, fields, ... } }
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
  title: "TripDM: Direct Message. Better Travel.",
  description: "TripDM connects travelers directly with trusted travel agents through instant messaging. Browse top travel packages.",
  alternates: {
    canonical: 'https://tripdm.com',
  },
  openGraph: {
    title: "TripDM: Direct Message. Better Travel.",
    description: "TripDM connects travelers directly with trusted travel agents through instant messaging. Browse top travel packages.",
    url: 'https://tripdm.com',
    siteName: 'TripDM',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: "TripDM: Direct Message. Better Travel.",
    description: "TripDM connects travelers directly with trusted travel agents through instant messaging. Browse top travel packages.",
  },
};

import { Suspense } from 'react';
import PageLoader from '@/components/PageLoader';

export default async function HomePage({
  searchParams
}: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }> | { [key: string]: string | string[] | undefined };
}) {
  const resolvedParams = searchParams ? await Promise.resolve(searchParams) : {};
  const defaultAgencyId = typeof resolvedParams.agencyId === 'string' ? resolvedParams.agencyId : undefined;
  const defaultSection = typeof resolvedParams.section === 'string'
    ? resolvedParams.section
    : (defaultAgencyId ? 'agents' : undefined);

  // Fetch initial data on the server for pure HTML SSR
  const { listings, agencies } = await getInitialData();

  // Render the client component monolith, passing the server-fetched data as initial state
  return (
    <Suspense fallback={<PageLoader text="Fetching details..." />}>
      <HomeClient
        initialListings={listings}
        initialAgencies={agencies}
        defaultSection={defaultSection}
        defaultAgencyId={defaultAgencyId}
        routeMode="user"
      />
    </Suspense>
  );
}
