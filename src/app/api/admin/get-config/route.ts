import { NextResponse } from 'next/server';
import { initializeFirebase } from '@/lib/auth';
import { getFirestore } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const fallbackData = {
      starterPrice: 2000,
      premiumPrice: 5000,
      vipPrice: 10000,
      addonCreditPrice: 1
    };

    let data = fallbackData;
    try {
      initializeFirebase();
      const db = getFirestore();
      const configDoc = await db.collection('admin').doc('config').get();
      if (configDoc.exists) {
        data = configDoc.data() as any;
      }
    } catch (e: any) {
      console.warn('Admin config unavailable, using default pricing:', e?.message || e);
    }

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error: any) {
    console.warn('Error in get-config route:', error?.message || error);
    return NextResponse.json({
      starterPrice: 2000,
      premiumPrice: 5000,
      vipPrice: 10000,
      addonCreditPrice: 1
    });
  }
}
