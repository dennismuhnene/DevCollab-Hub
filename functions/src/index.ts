
export * from './generate-upload-url';
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

/**
 * Sends a notification to the advisor when a new engagement is requested.
 */
export const onEngagementCreated = functions.firestore
    .document('engagements/{engagementId}')
    .onCreate(async (snapshot, context) => {
        const engagement = snapshot.data();
        if (!engagement) {
            logger.error("No data associated with the engagement creation event.");
            return;
        }

        const { advisorId, developerName } = engagement;
        logger.info(`New engagement ${context.params.engagementId} created. Notifying advisor ${advisorId}.`);

        const notificationRef = adminDb.collection(`users/${advisorId}/notifications`).doc();
        await notificationRef.set({
            type: 'engagement',
            title: 'New Engagement Request',
            message: `You have a new advisory request from ${developerName}.`,
            link: '/dashboard',
            read: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
    });

/**
 * Sends notifications when an engagement's status changes.
 */
export const onEngagementUpdated = functions.firestore
    .document('engagements/{engagementId}')
    .onUpdate(async (change, context) => {
        const before = change.before.data();
        const after = change.after.data();

        if (before.status === after.status) {
            return null; // No status change
        }

        const { developerId, advisorId, developerName, advisorName } = after;
        let recipientId: string | null = null;
        let notification = {};

        // Case 1: Request was accepted or rejected by advisor
        if (before.status === 'requested') {
            recipientId = developerId;
            if (after.status === 'active') {
                logger.info(`Engagement ${context.params.engagementId} accepted. Notifying developer ${developerId}.`);
                notification = {
                    type: 'engagement',
                    title: 'Engagement Request Accepted!',
                    message: `${advisorName} has accepted your request. The engagement room is now open.`,
                    link: `/engagements/${context.params.engagementId}`,
                };
            } else if (after.status === 'rejected') {
                logger.info(`Engagement ${context.params.engagementId} rejected. Notifying developer ${developerId}.`);
                notification = {
                    type: 'engagement',
                    title: 'Engagement Request Denied',
                    message: `Unfortunately, ${advisorName} has denied your recent engagement request.`,
                    link: '/dashboard',
                };
            }
        }

        // Case 2: Engagement was closed
        else if (after.status === 'closed' && before.status === 'active') {
            // The closer is the one who is NOT the recipient of the notification.
            // We need to determine who initiated the close. 
            // We'll assume the 'lastMessageSenderId' at the time of closing is the closer.
            // This is a proxy, a more robust solution might involve adding a 'closedBy' field.
            const closerId = after.lastMessageSenderId; 
            const closerName = closerId === developerId ? developerName : advisorName;
            recipientId = closerId === developerId ? advisorId : developerId;

            logger.info(`Engagement ${context.params.engagementId} closed by ${closerName}. Notifying ${recipientId}.`);

            notification = {
                type: 'engagement',
                title: 'Engagement Closed',
                message: `${closerName} has closed the engagement.`,
                link: `/engagements/${context.params.engagementId}`,
            };
        }

        if (recipientId) {
            const notificationRef = adminDb.collection(`users/${recipientId}/notifications`).doc();
            await notificationRef.set({
                ...notification,
                read: false,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        }

        return null;
    });

/**
 * Sends a notification when a new message is sent in an engagement.
 */
export const onNewEngagementMessage = functions.firestore
    .document('engagements/{engagementId}/messages/{messageId}')
    .onCreate(async (snapshot, context) => {
        const { engagementId } = context.params;
        const message = snapshot.data();

        if (!message) {
            logger.error("No data associated with the message creation event.");
            return;
        }

        const engagementRef = adminDb.doc(`engagements/${engagementId}`);
        const engagementSnap = await engagementRef.get();
        const engagement = engagementSnap.data();

        if (!engagement) {
            logger.error(`Engagement ${engagementId} not found.`);
            return;
        }

        const { developerId, advisorId, developerName, advisorName } = engagement;
        const senderId = message.senderId;

        // Determine recipient and sender
        const recipientId = senderId === developerId ? advisorId : developerId;
        const senderName = senderId === developerId ? developerName : advisorName;

        if (!recipientId) {
            logger.error(`Recipient could not be determined for message in engagement ${engagementId}.`);
            return;
        }

        logger.info(`New message in engagement ${engagementId}. Notifying ${recipientId}.`);

        const batch = adminDb.batch();

        // 1. Create notification for the recipient
        const notificationRef = adminDb.collection(`users/${recipientId}/notifications`).doc();
        batch.set(notificationRef, {
            type: 'engagement',
            title: `New Message from ${senderName}`,
            message: `You have a new message: "${message.text.substring(0, 100)}${message.text.length > 100 ? '...' : ''}"`,
            link: `/engagements/${engagementId}`,
            read: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // 2. Update the parent engagement doc with last message info
        batch.update(engagementRef, {
            lastMessage: message.text,
            lastMessageTimestamp: admin.firestore.FieldValue.serverTimestamp(),
            lastMessageSenderId: senderId,
        });

        await batch.commit();
    });
