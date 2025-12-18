
import * as functions from "firebase-functions";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import {getFirestore} from "firebase-admin/firestore";
import {getAuth, UserRecord} from "firebase-admin/auth";

// Initialize firebase-admin
admin.initializeApp();
const adminDb = getFirestore();

/**
 * A secure HTTP-callable function to initiate the user deletion process.
 */
export const deleteUserAccount = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
  }
  const uid = context.auth.uid;
  try {
    await getAuth().deleteUser(uid);
    return { message: `Successfully initiated deletion for user ${uid}.` };
  } catch (error: any) {
    logger.error("Error in deleteUserAccount function:", error);
    throw new functions.https.HttpsError('internal', 'An error occurred while trying to delete the user.', error.message);
  }
});

/**
 * A background Cloud Function that triggers when a Firebase Auth user
 * is deleted. It performs a "cascade delete" of all associated Firestore data.
 */
export const onUserAccountDeleted = functions.auth.user().onDelete(async (user: UserRecord) => {
  const uid = user.uid;
  logger.info(`Starting cascade delete for user: ${uid}`);
  const batch = adminDb.batch();

  // 1. Delete the user's profile document
  const userProfileRef = adminDb.doc(`users/${uid}`);
  batch.delete(userProfileRef);

  // 2. Delete all projects owned by the user
  const projectsQuery = adminDb.collection("projects").where("ownerId", "==", uid);
  const projectsSnapshot = await projectsQuery.get();
  projectsSnapshot.forEach((doc) => batch.delete(doc.ref));

  // 3. Delete all matches the user was a part of
  const matchesQuery = adminDb.collection("matches").where("participants", "array-contains", uid);
  const matchesSnapshot = await matchesQuery.get();
  matchesSnapshot.forEach((doc) => {
      batch.delete(doc.ref);
  });

  try {
    await batch.commit();
    logger.info(`Successfully completed data cleanup for user: ${uid}`);
  } catch (error) {
    logger.error(`Error committing data cleanup for user ${uid}:`, error);
  }
});
