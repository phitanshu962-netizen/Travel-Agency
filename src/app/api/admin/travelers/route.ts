import { NextResponse } from 'next/server';
import { initializeFirebase } from '@/lib/auth';
import * as admin from 'firebase-admin';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    initializeFirebase();
    const auth = admin.auth();

    const authUsersMap: Record<string, {
      creationTime: string | null;
      lastSignInTime: string | null;
      providerId: string;
      email?: string;
      displayName?: string;
      phoneNumber?: string;
    }> = {};

    try {
      const listUsersResult = await auth.listUsers(1000);
      listUsersResult.users.forEach((u) => {
        authUsersMap[u.uid] = {
          creationTime: u.metadata.creationTime || null,
          lastSignInTime: u.metadata.lastSignInTime || null,
          providerId: u.providerData?.[0]?.providerId || 'password',
          email: u.email,
          displayName: u.displayName,
          phoneNumber: u.phoneNumber,
        };
      });
    } catch (authErr: any) {
      console.warn('Firebase Auth listUsers warning:', authErr?.message || authErr);
    }

    return NextResponse.json({
      success: true,
      authUsers: authUsersMap
    });
  } catch (error: any) {
    console.error('Error fetching travelers auth metadata:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
