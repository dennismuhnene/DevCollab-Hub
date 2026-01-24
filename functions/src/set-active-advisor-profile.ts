
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

if (admin.apps.length === 0) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * Toggles a user's active advisor profile.
 * This function handles both activating a new profile and deactivating an existing one.
 */
export const setActiveAdvisorProfile = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }

    const userId = context.auth.uid;
    const { applicationId } = data;

    if (!applicationId || typeof applicationId !== 'string') {
        throw new functions.https.HttpsError('invalid-argument', 'The function must be called with a valid "applicationId" string.');
    }

    const userRef = db.collection('users').doc(userId);
    const publicProfileRef = db.collection('publicAdvisorProfiles').doc(userId);
    const applicationRef = userRef.collection('advisorApplications').doc(applicationId);

    const batch = db.batch();

    try {
        const userDoc = await userRef.get();
        const appDoc = await applicationRef.get();

        if (!userDoc.exists || !appDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'User or Application not found.');
        }

        const userData = userDoc.data()!;
        const appData = appDoc.data()!;

        if (appData.verificationStatus !== 'verified') {
            throw new functions.https.HttpsError('failed-precondition', 'Application must be verified.');
        }

        const isDeactivating = userData.activeAdvisorApplicationId === applicationId;

        if (isDeactivating) {
            batch.update(userRef, { activeAdvisorApplicationId: admin.firestore.FieldValue.delete() });
            batch.delete(publicProfileRef);
            await admin.auth().setCustomUserClaims(userId, { ...(userData.customClaims || {}), isAdvisor: false });
        } else {
            batch.update(userRef, { activeAdvisorApplicationId: applicationId });
            batch.set(publicProfileRef, {
                uid: userId,
                name: userData.name || "Anonymous Advisor",
                photoURL: userData.photoURL || null,
                headline: appData.headline,
                bio: appData.bio,
                specialties: appData.specialties || [],
                credentials: appData.credentials || [],
                standardDeliverables: appData.standardDeliverables || [],
                activeAdvisorApplicationId: applicationId,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            await admin.auth().setCustomUserClaims(userId, { ...(userData.customClaims || {}), isAdvisor: true });
        }
        
        await batch.commit();

        return { success: true, message: isDeactivating ? 'Profile deactivated.' : 'Profile activated.' };

    } catch (error) {
        console.error('Error in setActiveAdvisorProfile:', error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', 'An internal error occurred.');
    }
});

/**
 * Updates the photoURL for a user's public advisor profile.
 * This is a dedicated function to securely update profile imagery.
 */
export const updatePublicAdvisorProfileData = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "You must be logged in to update your profile.");
    }

    const { photoURL } = data;
    if (!photoURL || typeof photoURL !== 'string') {
        throw new functions.https.HttpsError("invalid-argument", "The function must be called with a 'photoURL' string argument.");
    }

    const uid = context.auth.uid;
    const publicProfileRef = db.collection("publicAdvisorProfiles").doc(uid);

    try {
        await publicProfileRef.update({ photoURL });
        return { success: true, message: "Public advisor profile photo updated successfully." };
    } catch (error) {
        console.warn(`Could not update public advisor profile for UID: ${uid}. This may be because the profile does not exist yet.`);
        // Return success to the client as this is a non-critical failure. 
        // The main user profile photo was updated successfully.
        return { success: true, message: "Public profile not found or could not be updated." };
    }
});
