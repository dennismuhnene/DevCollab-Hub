"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onUserAccountDeleted = exports.deleteUserAccount = void 0;
const functions = require("firebase-functions");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");
const firestore_1 = require("firebase-admin/firestore");
const auth_1 = require("firebase-admin/auth");
// Initialize firebase-admin
admin.initializeApp();
const adminDb = (0, firestore_1.getFirestore)();
/**
 * A secure HTTP-callable function to initiate the user deletion process.
 * This is an `onCall` function, designed to be invoked directly from the client SDK.
 */
exports.deleteUserAccount = functions.https.onCall(async (data, context) => {
    // Check if the user is authenticated.
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }
    const uid = context.auth.uid;
    logger.info(`Authenticated user UID: ${uid}. Proceeding with deletion.`);
    try {
        // This call will trigger the onUserAccountDeleted function
        await (0, auth_1.getAuth)().deleteUser(uid);
        logger.info(`Successfully initiated deletion for user ${uid}.`);
        // Return a success message to the client. This is the critical part.
        return {
            message: `Successfully initiated deletion for user ${uid}.`,
        };
    }
    catch (error) {
        logger.error("Error in deleteUserAccount function:", error);
        // Throw an HttpsError to send a structured error back to the client.
        throw new functions.https.HttpsError('internal', 'An error occurred while trying to delete the user.', error.message);
    }
});
/**
 * A background Cloud Function that triggers when a Firebase Auth user
 * is deleted. It performs a "cascade delete" of all associated Firestore data.
 */
exports.onUserAccountDeleted = functions.auth.user().onDelete(async (user) => {
    const uid = user.uid;
    logger.info(`Starting cascade delete for user: ${uid}`);
    const batch = adminDb.batch();
    // 1. Delete the user's profile document
    const userProfileRef = adminDb.doc(`users/${uid}`);
    batch.delete(userProfileRef);
    logger.info(`Scheduled deletion for user profile: users/${uid}`);
    // 2. Delete all projects owned by the user
    const projectsQuery = adminDb.collection("projects").where("ownerId", "==", uid);
    const projectsSnapshot = await projectsQuery.get();
    if (!projectsSnapshot.empty) {
        projectsSnapshot.forEach((doc) => {
            batch.delete(doc.ref);
            logger.info(`Scheduled deletion for project: ${doc.ref.path}`);
        });
    }
    // 3. Delete all matches the user was a part of
    const matchesQuery = adminDb.collection("matches").where("participants", "array-contains", uid);
    const matchesSnapshot = await matchesQuery.get();
    if (!matchesSnapshot.empty) {
        matchesSnapshot.forEach((doc) => {
            batch.delete(doc.ref);
            logger.info(`Scheduled deletion for match: ${doc.ref.path}`);
        });
    }
    // Commit all the batched deletions
    try {
        await batch.commit();
        logger.info(`Successfully completed cascade delete for user: ${uid}`);
    }
    catch (error) {
        logger.error(`Error committing cascade delete for user ${uid}:`, error);
    }
});
