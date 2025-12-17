'use server';

import { initializeFirebaseAdmin } from '@/lib/firebase-admin';
import { checkRateLimit } from '@/lib/rate-limiter';
import { getChatInsights } from '@/ai/flows/get-chat-insights';
import type { GetChatInsightsInput } from '@/types/ai';

export async function generateChatInsightsAction(payload: GetChatInsightsInput & { authToken: string }) {
  try {
    const firebaseAdmin = initializeFirebaseAdmin();
    const decodedToken = await firebaseAdmin.auth().verifyIdToken(payload.authToken);
    const userId = decodedToken.uid;

    await checkRateLimit(userId);

    const insights = await getChatInsights({
      currentUser: payload.currentUser,
      otherUser: payload.otherUser,
      project: payload.project,
    });

    return { success: true, data: insights };

  } catch (error: any) {
    if (error.code === 'auth/id-token-expired' || error.code === 'auth/argument-error') {
      return { success: false, error: 'Unauthorized' };
    }
    if (error.message.includes('Rate limit')) {
      return { success: false, error: 'Rate limit exceeded' };
    }
    console.error('Error generating chat insights:', error);
    // Return the actual error message to the client
    return { success: false, error: error.message || 'An unexpected error occurred.' };
  }
}
