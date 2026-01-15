
export * from './engagements';
export * from './generate-upload-url';
export * from './set-active-advisor-profile';
export * from './manage-meeting';
export * from './google-auth'; // Exports getGoogleAuthUrl and handleGoogleRedirect
export * from './get-advisor-application';
export * from './startMilestone';
export * from './closeEngagement';

import * as functions from "firebase-functions";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
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
 * A background Cloud Function that triggers when a Firebase Auth user
 * is deleted. It performs a "cascade delete" of all associated Firestore data.
 */
export const onUserAccountDeleted = functions.auth.user().onDelete(async (user: UserRecord) => {
    const uid = user.uid;
    logger.info(`Starting cascade actions for deleted user: ${uid}`);

    const batch = adminDb.batch();

    // 1. Delete the user's main profile and public advisor profile
    batch.delete(adminDb.doc(`users/${uid}`));
    batch.delete(adminDb.doc(`publicAdvisorProfiles/${uid}`));
    logger.info(`Scheduled deletion for user profiles: users/${uid} and publicAdvisorProfiles/${uid}`);

    // 2. Delete all projects owned by the user
    const projectsQuery = adminDb.collection("projects").where("ownerId", "==", uid);
    const projectsSnapshot = await projectsQuery.get();
    if (!projectsSnapshot.empty) {
        projectsSnapshot.forEach((doc) => {
            batch.delete(doc.ref);
            logger.info(`Scheduled deletion for project: ${doc.ref.path}`);
        });
    }

    // 3. Mark the user as deleted in any matches (conversations)
    const matchesQuery = adminDb.collection("matches").where("participants", "array-contains", uid);
    const matchesSnapshot = await matchesQuery.get();
    if (!matchesSnapshot.empty) {
        matchesSnapshot.forEach((doc) => {
            batch.update(doc.ref, {
                deletedParticipants: admin.firestore.FieldValue.arrayUnion(uid),
            });
            logger.info(`Marking user ${uid} as deleted in match: ${doc.ref.path}`);
        });
    }

    // 4. Update engagements to 'participant_deleted' status
    const engagementsAsDevQuery = adminDb.collection("engagements").where("developerId", "==", uid);
    const engagementsAsDevSnapshot = await engagementsAsDevQuery.get();
    if (!engagementsAsDevSnapshot.empty) {
        engagementsAsDevSnapshot.forEach((doc) => {
            batch.update(doc.ref, {
                status: 'participant_deleted',
                closingReason: 'The developer on this engagement has deleted their account.',
                closedById: uid,
            });
            logger.info(`Marking engagement ${doc.ref.path} as participant_deleted`);
        });
    }

    const engagementsAsAdvisorQuery = adminDb.collection("engagements").where("advisorId", "==", uid);
    const engagementsAsAdvisorSnapshot = await engagementsAsAdvisorQuery.get();
    if (!engagementsAsAdvisorSnapshot.empty) {
        engagementsAsAdvisorSnapshot.forEach((doc) => {
            batch.update(doc.ref, {
                status: 'participant_deleted',
                closingReason: 'The advisor on this engagement has deleted their account.',
                closedById: uid,
            });
            logger.info(`Marking engagement ${doc.ref.path} as participant_deleted`);
        });
    }

    // Commit all batched operations
    await batch.commit();
    logger.info(`Successfully completed cascade actions for user: ${uid}`);
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
    message: `Application successfully ${status}.`
  };
});

/**
 * Sends a notification to the advisor when a new engagement is requested.
 */
export const onEngagementCreated = functions.firestore
    .document('engagements/{engagementId}')
    .onCreate(async (snapshot, context) => {
        const engagement = snapshot.data();
        if (!engagement || !engagement.developerRequest) {
            logger.error("No data or developer request associated with the engagement creation event.");
            return;
        }

        const { advisorId, developerName, developerRequest } = engagement;
        logger.info(`New engagement ${context.params.engagementId} created. Notifying advisor ${advisorId}.`);

        const notificationRef = adminDb.collection(`users/${advisorId}/notifications`).doc();
        await notificationRef.set({
            type: 'engagement',
            title: developerRequest.subject || 'New Engagement Request',
            message: `You have a new advisory request from ${developerName}.`,
            link: '/dashboard',
            read: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
    });

/**
 * Sends notifications when an engagement's status or milestones change.
 */
export const onEngagementUpdated = functions.firestore
    .document('engagements/{engagementId}')
    .onUpdate(async (change, context) => {
        const before = change.before.data();
        const after = change.after.data();
        const engagementId = context.params.engagementId;

        const { developerId, advisorId, developerName, advisorName, developerRequest } = after;
        let recipientId: string | null = null;
        let notificationPayload: { title: string, message: string, link: string } | null = null;

        // --- Status Change Notifications (Negotiation) ---
        const statusChanged = before.status !== after.status;
        if (statusChanged) {
            const subject = developerRequest?.subject;
            switch (after.status) {
                case 'pending_developer_acceptance':
                    if (before.status === 'pending_proposal' || before.status === 'revision_requested') {
                        recipientId = developerId;
                        notificationPayload = {
                            title: subject ? `Re: ${subject}` : 'Proposal Ready for Review',
                            message: `${advisorName} has sent you a proposal. Please review and respond.`,
                            link: `/engagements/${engagementId}`
                        };
                    }
                    break;
                case 'revision_requested':
                    recipientId = advisorId;
                    notificationPayload = {
                        title: subject ? `Re: ${subject}` : 'Revision Requested',
                        message: `${developerName} has requested a revision to your proposal.`,
                        link: `/engagements/${engagementId}`
                    };
                    break;
                case 'active':
                    if (before.status === 'pending_developer_acceptance') {
                        recipientId = advisorId;
                        notificationPayload = {
                            title: 'Proposal Accepted!',
                            message: `${developerName} has accepted your proposal. The engagement is now active.`,
                            link: `/engagements/${engagementId}`
                        };
                    }
                    break;
                case 'rejected':
                    if (before.status.startsWith('pending')) {
                        recipientId = (after.closedById === developerId) ? advisorId : developerId;
                        const closingParty = (after.closedById === developerId) ? developerName : advisorName;
                        notificationPayload = {
                            title: 'Engagement Closed',
                            message: `${closingParty} has closed the engagement request.`,
                            link: '/dashboard'
                        };
                    }
                    break;
                case 'closed':
                     if (before.status === 'active') {
                        const closerId = after.closedById;
                        const closerName = closerId === developerId ? developerName : advisorName;
                        recipientId = closerId === developerId ? advisorId : developerId;

                        if (recipientId) {
                            notificationPayload = {
                                title: 'Engagement Closed',
                                message: `${closerName} has closed the engagement.`,
                                link: `/engagements/${engagementId}`
                            };
                        }
                    }
                    break;
            }
        }

        // --- Milestone Change Notifications ---
        const milestonesBefore = before.advisorProposal?.milestones || [];
        const milestonesAfter = after.advisorProposal?.milestones || [];

        if (milestonesAfter.length > 0) {
            for (let i = 0; i < milestonesAfter.length; i++) {
                const beforeMilestone = milestonesBefore[i] || {};
                const afterMilestone = milestonesAfter[i];

                if (beforeMilestone.status !== afterMilestone.status) {
                    const milestoneDesc = afterMilestone.description.substring(0, 50);
                    switch (afterMilestone.status) {
                        case 'in_progress':
                            recipientId = developerId;
                            notificationPayload = {
                                title: 'Milestone Started',
                                message: `${advisorName} has started work on: "${milestoneDesc}..."`,
                                link: `/engagements/${engagementId}`
                            };
                            break;
                        case 'submitted':
                            recipientId = developerId;
                            notificationPayload = {
                                title: 'Work Submitted for Review',
                                message: `${advisorName} has submitted work for: "${milestoneDesc}..."`,
                                link: `/engagements/${engagementId}`
                            };
                            break;
                        case 'accepted':
                            recipientId = advisorId;
                            notificationPayload = {
                                title: 'Milestone Complete!',
                                message: `${developerName} has accepted your work for: "${milestoneDesc}..."`,
                                link: `/engagements/${engagementId}`
                            };
                            break;
                    }
                }
            }
        }


        // Send the notification if a valid scenario was matched
        if (recipientId && notificationPayload) {
            logger.info(`Sending notification to ${recipientId} for engagement ${engagementId}`);
            const notificationRef = adminDb.collection(`users/${recipientId}/notifications`).doc();
            await notificationRef.set({
                ...notificationPayload,
                type: 'engagement',
                read: false,
                createdAt: FieldValue.serverTimestamp(),
            });
        } else {
            logger.info(`No notification needed for this update in engagement ${engagementId}`);
        }
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
