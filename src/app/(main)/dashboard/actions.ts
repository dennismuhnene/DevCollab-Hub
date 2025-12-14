'use server';

import { initializeFirebaseAdmin } from '@/lib/firebase-admin';
import { checkRateLimit } from '@/lib/rate-limiter';
import { getProfileInsights } from '@/ai/flows/get-profile-insights';
import type { GetProfileInsightsInput } from '@/types/ai';

export async function generateDashboardInsightsAction(payload: GetProfileInsightsInput & { authToken: string }) {
  try {
    const firebaseAdmin = initializeFirebaseAdmin();
    const decodedToken = await firebaseAdmin.auth().verifyIdToken(payload.authToken);
    const userId = decodedToken.uid;

    await checkRateLimit(userId);

    const insights = await getProfileInsights({
      userProfile: payload.userProfile,
      userProjects: payload.userProjects,
      interestedDevelopers: payload.interestedDevelopers,
    });

    return { success: true, data: insights };

  } catch (error: any) {
    if (error.code === 'auth/id-token-expired' || error.code === 'auth/argument-error') {
      return { success: false, error: 'Unauthorized' };
    }
    if (error.message.includes('Rate limit')) {
      return { success: false, error: 'Rate limit exceeded' };
    }
    console.error('Error generating dashboard insights:', error);
    return { success: false, error: 'Internal Server Error' };
  }
}
