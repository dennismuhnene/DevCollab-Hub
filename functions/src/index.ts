
export * from './set-active-advisor-profile';
import * as functions from "firebase-functions";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth, UserRecord } from "firebase-admin/auth";

if (admin.apps.length === 0) {
    admin.initializeApp();
}
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
 * Cascade delete on user removal
 */
export const onUserAccountDeleted = functions.auth.user().onDelete(async (user: UserRecord) => {
  const uid = user.uid;
  logger.info(`Starting cascade delete for user: ${uid}`);

  const batch = adminDb.batch();

  batch.delete(adminDb.doc(`users/${uid}`));
  batch.delete(adminDb.doc(`publicAdvisorProfiles/${uid}`));

  const projects = await adminDb.collection("projects").where("ownerId", "==", uid).get();
  projects.forEach(doc => batch.delete(doc.ref));

  const matches = await adminDb.collection("matches").where("participants", "array-contains", uid).get();
  matches.forEach(doc => batch.delete(doc.ref));

  await batch.commit();
});

/**
 * ✅ FIXED: Advisor verification function
 * This function now ONLY handles the verification status and notifications.
 * It NO LONGER automatically creates a public profile.
 */
export const setAdvisorVerificationStatus = functions.https.onCall(async (data, context) => {
  logger.info("setAdvisorVerificationStatus invoked");

  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Authentication required.");
  }

  const isAdmin = context.auth.uid === "Jv4XV8flpAgUqJpd2P7SKr3PijX2";
  if (!isAdmin) {
    throw new functions.https.HttpsError("permission-denied", "Admin access required.");
  }

  const { applicantId, applicationId, status } = data;

  if (!applicantId || !applicationId || !["verified", "rejected"].includes(status)) {
    throw new functions.https.HttpsError("invalid-argument", "Invalid parameters.");
  }

  const appRef = adminDb.doc(`users/${applicantId}/advisorApplications/${applicationId}`);
  const userRef = adminDb.doc(`users/${applicantId}`);
  const publicProfileRef = adminDb.doc(`publicAdvisorProfiles/${applicantId}`);
  const notificationRef = adminDb.collection(`users/${applicantId}/notifications`).doc();

  const batch = adminDb.batch();

  const userSnap = await userRef.get();
  if (!userSnap.exists) {
      throw new functions.https.HttpsError("not-found", "User not found.");
  }
  const userData = userSnap.data()!;

  // Update application status
  batch.update(appRef, { verificationStatus: status });

  // If rejecting, check if it was the active profile and deactivate it.
  if (status === "rejected" && userData.activeAdvisorApplicationId === applicationId) {
      batch.delete(publicProfileRef);
      batch.update(userRef, { activeAdvisorApplicationId: admin.firestore.FieldValue.delete() });
  }
  
  // Create a notification for the user
  batch.set(notificationRef, {
    type: 'system',
    title: status === 'verified' 
      ? 'Advisor Application Approved' 
      : 'Advisor Application Rejected',
    message: status === 'verified'
      ? 'Congratulations! Your application has been verified. You can now set it as your active public profile.'
      : 'Your application was reviewed but not approved at this time.',
    link: '/profile#applications', // Direct link to the relevant section
    read: false,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  await batch.commit();

  // Update custom claims if rejecting a previously verified advisor
  if (status === "rejected") {
      const user = await admin.auth().getUser(applicantId);
      await admin.auth().setCustomUserClaims(applicantId, {
          ...(user.customClaims || {}),
          isAdvisor: false, 
      });
  }

  return {
    success: true,
    message: `Application successfully ${status}.`,
  };
});
