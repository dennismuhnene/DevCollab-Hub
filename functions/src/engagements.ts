'use strict';

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

if (admin.apps.length === 0) {
    admin.initializeApp();
}

const db = admin.firestore();
const SUMMARY_CHAR_LIMIT = 1500; // Approx. 300 words

export const submitMilestoneForReview = functions.https.onCall(async (data, context) => {
    const { engagementId, milestoneId, summary } = data;
    const uid = context.auth?.uid;

    if (!uid) {
        throw new functions.https.HttpsError('unauthenticated', 'User is not authenticated.');
    }

    if (!engagementId || !milestoneId || !summary) {
        throw new functions.https.HttpsError('invalid-argument', 'Missing required data.');
    }

    if (summary.length > SUMMARY_CHAR_LIMIT) {
        throw new functions.https.HttpsError('invalid-argument', `Summary must be ${SUMMARY_CHAR_LIMIT} characters or less.`);
    }

    const engagementRef = db.collection('engagements').doc(engagementId);

    try {
        const engagementDoc = await engagementRef.get();
        if (!engagementDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Engagement not found.');
        }

        const engagement = engagementDoc.data()!;

        if (uid !== engagement.advisorId) {
            throw new functions.https.HttpsError('permission-denied', 'Only the advisor can submit a milestone for review.');
        }

        const milestones = engagement.advisorProposal.milestones;
        const milestoneIndex = milestones.findIndex((m: any) => m.id === milestoneId);

        if (milestoneIndex === -1) {
            throw new functions.https.HttpsError('not-found', 'Milestone not found.');
        }

        milestones[milestoneIndex].status = 'submitted';
        milestones[milestoneIndex].advisorSummary = summary;
        milestones[milestoneIndex].completedAt = new Date();

        await engagementRef.update({ 'advisorProposal.milestones': milestones });

        return { success: true, message: 'Milestone submitted for review.' };

    } catch (error) {
        console.error('Error submitting milestone for review:', error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', 'An internal error occurred.');
    }
});

export const acceptMilestoneAndLogOutcome = functions.https.onCall(async (data, context) => {
    const { engagementId, milestoneId, developerReflection } = data;
    const uid = context.auth?.uid;

    if (!uid) {
        throw new functions.https.HttpsError('unauthenticated', 'User is not authenticated.');
    }

    if (!engagementId || !milestoneId) {
        throw new functions.https.HttpsError('invalid-argument', 'Missing required data.');
    }

    if (developerReflection && developerReflection.length > SUMMARY_CHAR_LIMIT) {
        throw new functions.https.HttpsError('invalid-argument', `Reflection must be ${SUMMARY_CHAR_LIMIT} characters or less.`);
    }

    const engagementRef = db.collection('engagements').doc(engagementId);

    try {
        const engagementDoc = await engagementRef.get();
        if (!engagementDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Engagement not found.');
        }

        const engagement = engagementDoc.data()!;

        if (uid !== engagement.developerId) {
            throw new functions.https.HttpsError('permission-denied', 'Only the developer can accept a milestone.');
        }

        const milestones = engagement.advisorProposal.milestones;
        const milestoneIndex = milestones.findIndex((m: any) => m.id === milestoneId);

        if (milestoneIndex === -1) {
            throw new functions.https.HttpsError('not-found', 'Milestone not found.');
        }

        if (milestones[milestoneIndex].status !== 'submitted') {
            throw new functions.https.HttpsError('failed-precondition', 'Milestone has not been submitted for review.');
        }

        const milestoneToLog = { ...milestones[milestoneIndex] };
        milestones[milestoneIndex].status = 'accepted';

        const outcomeLogEntry = {
            milestoneId: milestoneToLog.id,
            milestoneDescription: milestoneToLog.description,
            advisorSummary: milestoneToLog.advisorSummary || '',
            developerReflection: developerReflection || '',
            completedAt: new Date(),
        };

        await engagementRef.update({
            'advisorProposal.milestones': milestones,
            outcomeLog: admin.firestore.FieldValue.arrayUnion(outcomeLogEntry),
        });

        return { success: true, message: 'Milestone accepted and outcome logged.' };

    } catch (error) {
        console.error('Error accepting milestone:', error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', 'An internal error occurred.');
    }
});
