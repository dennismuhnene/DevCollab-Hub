
export * from './generate-upload-url';
export * from './set-active-advisor-profile';
export * from './manage-meeting';
export * from './google-auth'; // Exports getGoogleAuthUrl and handleGoogleRedirect

import * as functions from "firebase-functions";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth, UserRecord } from "firebase-admin/auth";
import axios from 'axios';

if (admin.apps.length === 0) {
    admin.initializeApp();
}
const adminDb = getFirestore();

/**
 * Creates or retrieves a private Daily.co video room for an engagement and generates a meeting token.
 * This function is now idempotent and resilient to partial failures.
 */
export const createVideoRoom = functions.https.onCall(async (data, context) => {
  logger.info("createVideoRoom function invoked - v2");

  // 1. Authentication Check
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
  }

  const { engagementId } = data;
  if (!engagementId) {
    throw new functions.https.HttpsError('invalid-argument', 'The function must be called with an "engagementId".');
  }

  const uid = context.auth.uid;
  const engagementRef = adminDb.doc(`engagements/${engagementId}`);

  try {
    const engagementSnap = await engagementRef.get();
    if (!engagementSnap.exists) {
      throw new functions.https.HttpsError('not-found', 'Engagement not found.');
    }

    const engagement = engagementSnap.data();
    if (!engagement) {
        throw new functions.https.HttpsError('internal', 'Failed to retrieve engagement data.');
    }

    // 2. Authorization Check
    const isParticipant = engagement.advisorId === uid || engagement.developerId === uid;
    if (!isParticipant) {
        throw new functions.https.HttpsError('permission-denied', 'You are not a participant in this engagement.');
    }
    
    const dailyApiKey = process.env.DAILY_API_KEY;
    if (!dailyApiKey) {
        logger.error("Daily API key is not configured.");
        throw new functions.https.HttpsError('internal', 'The video conferencing service is not configured on the server.');
    }

    let roomUrl = engagement.videoRoomUrl;

    // 3. Ensure Room Exists and URL is in Firestore
    if (!roomUrl) {
        logger.info(`No room URL found for engagement ${engagementId}. Attempting to create or retrieve from Daily.co.`);
        try {
            const roomResponse = await axios.post(
              'https://api.daily.co/v1/rooms',
              { name: engagementId, privacy: 'private', properties: { exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 30) } },
              { headers: { 'Authorization': `Bearer ${dailyApiKey}`, 'Content-Type': 'application/json' } }
            );
            roomUrl = roomResponse.data.url;
            logger.info(`New room created successfully for engagement: ${engagementId}`);

        } catch(creationError: any) {
            if (axios.isAxiosError(creationError) && creationError.response?.data?.info?.includes('already exists')) {
                logger.warn(`Room creation failed because it already exists. Fetching existing room details for engagement: ${engagementId}`);
                const roomGetResponse = await axios.get(
                    `https://api.daily.co/v1/rooms/${engagementId}`,
                    { headers: { 'Authorization': `Bearer ${dailyApiKey}` } }
                );
                roomUrl = roomGetResponse.data.url;
            } else {
                throw creationError; // Re-throw other errors
            }
        }

        if (!roomUrl) {
            throw new functions.https.HttpsError('internal', 'Failed to create or retrieve the video room URL.');
        }

        await engagementRef.update({ videoRoomUrl: roomUrl });
        logger.info(`Successfully saved videoRoomUrl for engagement: ${engagementId}`);
    }

    // 4. Create a Meeting Token
    const isOwner = engagement.advisorId === uid;
    logger.info(`Creating meeting token for user: ${uid} (isOwner: ${isOwner}) in room: ${engagementId}`);
    const tokenResponse = await axios.post(
        'https://api.daily.co/v1/meeting-tokens',
        {
            properties: {
                room_name: engagementId,
                is_owner: isOwner,
                user_name: isOwner ? engagement.advisorName : engagement.developerName,
                exp: Math.floor(Date.now() / 1000) + (60 * 60 * 2), // Token expires in 2 hours
            },
        },
        { headers: { 'Authorization': `Bearer ${dailyApiKey}`, 'Content-Type': 'application/json' } }
    );

    const token = tokenResponse.data.token;
    if (!token) {
        throw new functions.https.HttpsError('internal', 'Could not retrieve meeting token.');
    }

    // 5. Return URL and Token
    return { success: true, url: roomUrl, token: token };

  } catch (error: any) {
    logger.error("Fatal error in createVideoRoom function:", error);
    if (axios.isAxiosError(error) && error.response) {
        logger.error('Daily API Error Details:', error.response.data);
    }
    throw new functions.https.HttpsError('internal', 'An unexpected error occurred while preparing the video room.', error.message);
  }
});


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
 * Sends notifications when an engagement's status or meetings change.
 */
export const onEngagementUpdated = functions.firestore
    .document('engagements/{engagementId}')
    .onUpdate(async (change, context) => {
        const before = change.before.data();
        const after = change.after.data();
        const engagementId = context.params.engagementId;

        const { developerId, advisorId, developerName, advisorName } = after;
        let recipientId: string | null = null;
        let notification: { type: string, title: string, message: string, link: string } | null = null;

        // Case 1: Status changed from 'requested'
        if (before.status === 'requested' && before.status !== after.status) {
            recipientId = developerId;
            if (after.status === 'active') {
                logger.info(`Engagement ${engagementId} accepted. Notifying developer ${developerId}.`);
                notification = {
                    type: 'engagement',
                    title: 'Engagement Request Accepted!',
                    message: `${advisorName} has accepted your request. The engagement room is now open.`,
                    link: `/engagements/${engagementId}`,
                };
            } else if (after.status === 'rejected') {
                logger.info(`Engagement ${engagementId} rejected. Notifying developer ${developerId}.`);
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
            const closerId = after.lastMessageSenderId;
            const closerName = closerId === developerId ? developerName : advisorName;
            recipientId = closerId === developerId ? advisorId : developerId;

            logger.info(`Engagement ${engagementId} closed by ${closerName}. Notifying ${recipientId}.`);

            notification = {
                type: 'engagement',
                title: 'Engagement Closed',
                message: `${closerName} has closed the engagement.`,
                link: `/engagements/${engagementId}`,
            };
        }

        // **NEW**: Case 3: Meeting has been updated
        const beforeMeetings = before.meetings || {};
        const afterMeetings = after.meetings || {};
        const beforeMeetingIds = Object.keys(beforeMeetings);
        const afterMeetingIds = Object.keys(afterMeetings);
        recipientId = developerId; // The developer is always the recipient of meeting notifications

        if (afterMeetingIds.length > beforeMeetingIds.length) {
            const newMeetingId = afterMeetingIds.find(id => !beforeMeetingIds.includes(id));
            if (newMeetingId) {
                const newMeeting = afterMeetings[newMeetingId];
                logger.info(`Meeting scheduled in engagement ${engagementId}. Notifying developer ${developerId}.`);
                notification = {
                    type: 'engagement',
                    title: 'New Meeting Scheduled',
                    message: `${advisorName} has scheduled a new meeting for ${new Date(newMeeting.startTime).toLocaleString()}.`,
                    link: `/engagements/${engagementId}`,
                };
            }
        } else if (afterMeetingIds.length < beforeMeetingIds.length) {
            const cancelledMeetingId = beforeMeetingIds.find(id => !afterMeetingIds.includes(id));
            if (cancelledMeetingId) {
                const cancelledMeeting = beforeMeetings[cancelledMeetingId];
                logger.info(`Meeting cancelled in engagement ${engagementId}. Notifying developer ${developerId}.`);
                notification = {
                    type: 'engagement',
                    title: 'Meeting Canceled',
                    message: `${advisorName} has canceled your meeting that was scheduled for ${new Date(cancelledMeeting.startTime).toLocaleString()}.`,
                    link: `/engagements/${engagementId}`,
                };
            }
        } else {
            for (const id of afterMeetingIds) {
                if (beforeMeetings[id] && beforeMeetings[id].startTime !== afterMeetings[id].startTime) {
                    const rescheduledMeeting = afterMeetings[id];
                    logger.info(`Meeting rescheduled in engagement ${engagementId}. Notifying developer ${developerId}.`);
                    notification = {
                        type: 'engagement',
                        title: 'Meeting Rescheduled',
                        message: `${advisorName} has rescheduled your meeting to ${new Date(rescheduledMeeting.startTime).toLocaleString()}.`,
                        link: `/engagements/${engagementId}`,
                    };
                    break; // Found the rescheduled meeting, no need to check others
                }
            }
        }


        if (recipientId && notification) {
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
            link: `/engagements/${context.params.engagementId}`,
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
