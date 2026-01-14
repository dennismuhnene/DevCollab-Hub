'use strict';

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

if (admin.apps.length === 0) {
    admin.initializeApp();
}

const db = admin.firestore();

export const startMilestone = functions.https.onCall(async (data, context) => {
    const { engagementId, milestoneId } = data;
    const uid = context.auth?.uid;

    if (!uid) {
        throw new functions.https.HttpsError('unauthenticated', 'User is not authenticated.');
    }

    if (!engagementId || !milestoneId) {
        throw new functions.https.HttpsError('invalid-argument', 'Missing required data: engagementId and milestoneId.');
    }

    const engagementRef = db.collection('engagements').doc(engagementId);

    try {
        const engagementDoc = await engagementRef.get();
        if (!engagementDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Engagement not found.');
        }

        const engagement = engagementDoc.data()!;

        if (uid !== engagement.advisorId) {
            throw new functions.https.HttpsError('permission-denied', 'Only the advisor can start a milestone.');
        }

        const milestones = engagement.advisorProposal.milestones;
        const milestoneIndex = milestones.findIndex((m: any) => m.id === milestoneId);

        if (milestoneIndex === -1) {
            throw new functions.https.HttpsError('not-found', 'Milestone not found in the proposal.');
        }

        if (milestones[milestoneIndex].status !== 'pending') {
            throw new functions.https.HttpsError('failed-precondition', 'This milestone has already been started or completed.');
        }

        milestones[milestoneIndex].status = 'in_progress';
        // CORRECTED: Use a standard Date object to avoid the SDK crash.
        milestones[milestoneIndex].startedAt = new Date();

        const updates: { [key: string]: any } = {
            'advisorProposal.milestones': milestones
        };

        // As per the blueprint, starting a milestone implies the engagement is active.
        if (engagement.status !== 'active') {
            updates.status = 'active';
        }

        await engagementRef.update(updates);

        return { success: true, message: 'Milestone started successfully.' };

    } catch (error) {
        console.error('Error in startMilestone function:', error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', 'An unexpected error occurred while starting the milestone.', error);
    }
});
