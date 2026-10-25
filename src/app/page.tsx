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
export default async function HomePage() {
  // Fetch initial data on the server for pure HTML SSR
  const { listings, agencies } = await getInitialData();

  return (
    <HomeClient
      initialListings={listings}
      initialAgencies={agencies}
      routeMode="user"
    />
  );
}
