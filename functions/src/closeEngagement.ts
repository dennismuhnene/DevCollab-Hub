import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

if (admin.apps.length === 0) {
  admin.initializeApp();
}

const db = admin.firestore();

export const closeEngagement = functions.https.onCall(async (data, context) => {
  // 1. Authentication Check
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
  }

  const { engagementId } = data;

  // 2. Data Validation
  if (!engagementId) {
    throw new functions.https.HttpsError('invalid-argument', 'The function must be called with an "engagementId".');
  }

  const engagementRef = db.collection('engagements').doc(engagementId);
  const uid = context.auth.uid;

  try {
    const engagementDoc = await engagementRef.get();

    if (!engagementDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'No engagement found with the provided ID.');
    }

    const engagementData = engagementDoc.data();
    if (!engagementData) {
        throw new functions.https.HttpsError('internal', 'Engagement data is missing.');
    }

    // 3. Authorization Check: Is the caller a participant?
    if (uid !== engagementData.developerId && uid !== engagementData.advisorId) {
      throw new functions.https.HttpsError('permission-denied', 'You are not a participant in this engagement.');
    }
    
    // 4. Check if already closed
    if (engagementData.status === 'closed') {
        console.log(`Engagement ${engagementId} is already closed.`);
        return { status: 'success', message: 'Engagement was already closed.' };
    }

    // 5. Perform the update
    await engagementRef.update({
      status: 'closed',
      closedById: uid,
      closedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { status: 'success', message: 'Engagement closed successfully.' };

  } catch (error) {
    console.error(`Error closing engagement ${engagementId}:`, error);
    if (error instanceof functions.https.HttpsError) {
        throw error;
    }
    throw new functions.https.HttpsError('internal', 'An unexpected error occurred while closing the engagement.');
  }
});