import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { google, Auth } from 'googleapis';
import { v4 as uuidv4 } from 'uuid';
require('dotenv').config();

if (admin.apps.length === 0) {
  admin.initializeApp();
}

const db = admin.firestore();

async function getOAuth2Client(userId: string): Promise<Auth.OAuth2Client> {
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    const userData = userDoc.data();

    if (!userData || !userData.googleTokens || !userData.googleTokens.refresh_token) {
        throw new functions.https.HttpsError('failed-precondition', 'The advisor has not connected their Google account, or permissions have been revoked.');
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
        throw new functions.https.HttpsError('internal', 'The server is not configured for Google Calendar integration.');
    }

    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
    let tokens = userData.googleTokens;

    if (!tokens.expiry_date || (new Date().getTime() > tokens.expiry_date)) {
        functions.logger.log(`Token for user ${userId} is expired. Refreshing...`);
        oauth2Client.setCredentials({ refresh_token: tokens.refresh_token });

        try {
            const { credentials } = await oauth2Client.refreshAccessToken();
            tokens = { ...tokens, ...credentials };
            
            await userRef.update({ googleTokens: tokens });

        } catch (error: any) {
            functions.logger.error("Error refreshing access token:", error);
            const errorDetails = JSON.stringify({ message: error.message, code: error.code, errors: error.errors });
            throw new functions.https.HttpsError('permission-denied', `Failed to refresh Google authentication token: ${error.message}`, { details: errorDetails });
        }
    }

    oauth2Client.setCredentials(tokens);
    return oauth2Client;
}

export const manageMeeting = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }
    const uid = context.auth.uid;
    const { engagementId, action, meeting } = data;

    if (!engagementId || !action || !meeting) {
        throw new functions.https.HttpsError('invalid-argument', 'Missing required parameters: engagementId, action, and meeting.');
    }

    if ((action === 'schedule' || action === 'reschedule') && (!meeting.startTime || !meeting.endTime)) {
        throw new functions.https.HttpsError('invalid-argument', 'A startTime and endTime are required to schedule or reschedule a meeting.');
    }

    const engagementRef = db.collection('engagements').doc(engagementId);
    let oauth2Client: Auth.OAuth2Client;

    try {
        const engagementSnapshot = await engagementRef.get();
        if (!engagementSnapshot.exists) {
            throw new functions.https.HttpsError('not-found', 'Engagement not found.');
        }
        const { advisorId } = engagementSnapshot.data()!;

        if (uid !== advisorId) {
            throw new functions.https.HttpsError('permission-denied', 'Only the assigned advisor can manage meetings.');
        }

        oauth2Client = await getOAuth2Client(advisorId);

        const transactionResult = await db.runTransaction(async (transaction) => {
            const engagementDoc = await transaction.get(engagementRef);
            if (!engagementDoc.exists) {
                throw new functions.https.HttpsError('not-found', 'Engagement not found within transaction.');
            }
            const engagementData = engagementDoc.data()!;
            const { developerId, developerName, advisorName, meetings = {} } = engagementData;

            const advisorUserDoc = await transaction.get(db.collection('users').doc(advisorId));
            const developerUserDoc = await transaction.get(db.collection('users').doc(developerId));

            const advisorEmail = advisorUserDoc.data()?.email;
            const developerEmail = developerUserDoc.data()?.email;

            if (!developerEmail || !advisorEmail) {
                throw new functions.https.HttpsError('failed-precondition', 'Could not find email for developer or advisor.');
            }

            if (action === 'schedule' || action === 'reschedule') {
                const newStartTime = new Date(meeting.startTime);
                const newEndTime = new Date(meeting.endTime);
                const advisorEngagementsQuery = db.collection('engagements').where('advisorId', '==', advisorId).where('status', '==', 'active');
                const snapshot = await transaction.get(advisorEngagementsQuery);

                for (const doc of snapshot.docs) {
                    const engagementMeetings = doc.data().meetings || {};
                    for (const existingMeetingId in engagementMeetings) {
                        if (action === 'reschedule' && existingMeetingId === meeting.id) {
                            continue;
                        }

                        const existingMeeting = engagementMeetings[existingMeetingId];
                        const existingStartTime = new Date(existingMeeting.startTime);
                        const existingEndTime = new Date(existingMeeting.endTime);

                        if (newStartTime < existingEndTime && newEndTime > existingStartTime) {
                            throw new functions.https.HttpsError('already-exists', 'This time slot conflicts with another scheduled meeting.');
                        }
                    }
                }
            }

            const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
            const meetingId = meeting.id || uuidv4();
            const timezone = meeting.timezone || 'UTC';

            if (action === 'schedule') {
                if (Object.keys(meetings).length >= 3) {
                    throw new functions.https.HttpsError('failed-precondition', 'A maximum of 3 meetings can be scheduled for an engagement.');
                }

                const event = await calendar.events.insert({
                    calendarId: 'primary',
                    conferenceDataVersion: 1,
                    requestBody: {
                        summary: meeting.title,
                        description: `DevCollab mentorship session with ${developerName}. Engagement ID: ${engagementId}`,
                        start: { dateTime: meeting.startTime, timeZone: timezone },
                        end: { dateTime: meeting.endTime, timeZone: timezone },
                        organizer: { email: advisorEmail, displayName: advisorName, self: true },
                        attendees: [{ email: developerEmail }, { email: advisorEmail }],
                        conferenceData: { createRequest: { requestId: uuidv4() } },
                    },
                });

                const newMeetingData = {
                    ...meeting,
                    id: meetingId,
                    eventId: event.data.id,
                    meetLink: event.data.hangoutLink,
                    status: 'scheduled',
                    timezone: timezone,
                    rescheduleCount: 0,
                };
                
                transaction.update(engagementRef, { [`meetings.${meetingId}`]: newMeetingData });

            } else if (action === 'reschedule') {
                if (!meeting.id || !meeting.eventId) throw new functions.https.HttpsError('invalid-argument', 'Meeting ID and Event ID are required for rescheduling.');
                
                const existingMeeting = meetings[meeting.id];
                if (!existingMeeting || existingMeeting.eventId !== meeting.eventId) throw new functions.https.HttpsError('not-found', 'The meeting to reschedule does not exist or you do not have permission to modify it.');

                const rescheduleCount = existingMeeting.rescheduleCount || 0;
                if (rescheduleCount >= 5) {
                    throw new functions.https.HttpsError('failed-precondition', 'This meeting has been rescheduled the maximum number of times (5).');
                }
                
                await calendar.events.patch({
                    calendarId: 'primary',
                    eventId: meeting.eventId,
                    requestBody: {
                        start: { dateTime: meeting.startTime, timeZone: timezone },
                        end: { dateTime: meeting.endTime, timeZone: timezone },
                    }
                });
                transaction.update(engagementRef, { 
                    [`meetings.${meeting.id}.startTime`]: meeting.startTime,
                    [`meetings.${meeting.id}.endTime`]: meeting.endTime,
                    [`meetings.${meeting.id}.timezone`]: timezone,
                    [`meetings.${meeting.id}.rescheduleCount`]: admin.firestore.FieldValue.increment(1),
                });

            } else if (action === 'cancel') {
                if (!meeting.id || !meeting.eventId) throw new functions.https.HttpsError('invalid-argument', 'Meeting ID and Event ID are required for cancellation.');
                
                const existingMeeting = meetings[meeting.id];
                if (!existingMeeting || existingMeeting.eventId !== meeting.eventId) throw new functions.https.HttpsError('not-found', 'The meeting to cancel does not exist or you do not have permission to modify it.');

                try {
                    await calendar.events.delete({ calendarId: 'primary', eventId: meeting.eventId });
                } catch(err: any) {
                    if (err.code !== 410) { throw err; } // Ignore if event is already gone
                }
                transaction.update(engagementRef, { [`meetings.${meeting.id}`]: admin.firestore.FieldValue.delete() });

            } else {
                throw new functions.https.HttpsError('invalid-argument', 'Invalid action specified.');
            }
            
            return { success: true, message: `Meeting successfully ${action}d.` };
        });

        return { ...transactionResult };

    } catch (err: any) {
        functions.logger.error("Error in manageMeeting function:", err);
        const errorDetails = JSON.stringify({ message: err.message, code: err.code, errors: err.errors });
        
        let userFacingMessage = `An unexpected error occurred: ${err.message}`;
        if (err instanceof functions.https.HttpsError) {
            userFacingMessage = err.message;
        } else if (err.code) { 
            userFacingMessage = `Google Calendar API Error: ${err.message} (Code: ${err.code})`;
        }

        throw new functions.https.HttpsError(
            err.code && (typeof err.code === 'string' || typeof err.code === 'number') ? err.code : 'internal', 
            userFacingMessage,
            { details: errorDetails }
        );
    }
});
