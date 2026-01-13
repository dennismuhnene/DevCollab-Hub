import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// Ensure Firebase is initialized
if (admin.apps.length === 0) {
  admin.initializeApp();
}

export const getAdvisorApplicationForEngagement = functions.https.onCall(async (data, context) => {
  // Ensure the user is authenticated.
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
  }

  const { advisorId, advisorApplicationId } = data;

  // Validate the data
  if (!advisorId || !advisorApplicationId) {
    throw new functions.https.HttpsError('invalid-argument', 'The function must be called with both "advisorId" and "advisorApplicationId".');
  }

  try {
    const applicationDoc = await admin.firestore()
      .collection('users').doc(advisorId)
      .collection('advisorApplications').doc(advisorApplicationId)
      .get();

    if (!applicationDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'The requested advisor application was not found.');
    }

    return applicationDoc.data();

  } catch (error) {
    console.error("Error fetching advisor application:", error);
    // The error is re-thrown so the client can handle it.
    throw new functions.https.HttpsError('internal', 'An unexpected error occurred while fetching the advisor application.');
  }
});
