/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import {onRequest} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import {getFirestore, FieldValue} from "firebase-admin/firestore";
import {getAuth} from "firebase-admin/auth";
import * as cors from "cors";

// Start writing functions
// https://firebase.google.com/docs/functions/typescript

// Initialize firebase-admin
admin.initializeApp();

const adminDb = getFirestore();
const corsHandler = cors({origin: true});


/**
 * A secure HTTP-callable function to initiate the user deletion process.
 */
export const deleteUserAccount = onRequest({
  // This allows us to check auth status
  invoker: "private",
}, async (req, res) => {
  corsHandler(req, res, async () => {
    logger.info("deleteUserAccount function triggered", {
      headers: req.headers,
    });

    if (req.method !== "POST") {
      res.status(405).send("Method Not Allowed");
      return;
    }

    const authHeader = req.headers.authorization || "";
    const idToken = authHeader.split("Bearer ")[1];

    if (!idToken) {
      logger.warn("Authorization token not found.");
      res.status(401).send("Unauthorized");
      return;
    }

    try {
      // Verify the user's ID token
      const decodedToken = await getAuth().verifyIdToken(idToken);
      const uid = decodedToken.uid;
      logger.info(`Token verified for UID: ${uid}. Proceeding with deletion.`);

      // This call will trigger the onUserAccountDeleted function
      await getAuth().deleteUser(uid);

      res.status(200).send({
        message: `Successfully initiated deletion for user ${uid}.`,
      });
    } catch (error) {
      logger.error("Error in deleteUserAccount function:", error);
      if (error instanceof Error && "code" in error) {
        const firebaseError = error as { code: string; message: string };
        if (firebaseError.code === "auth/id-token-expired") {
          res.status(401).send("Unauthorized: ID token has expired.");
        } else if (firebaseError.code === "auth/user-not-found") {
           res.status(404).send("User not found.");
        } else {
          res.status(500).send("Internal Server Error");
        }
      } else {
        res.status(500).send("Internal Server Error");
      }
    }
  });
});


/**
 * A background Cloud Function that triggers when a Firebase Auth user
 * is deleted. It performs a "cascade delete" of all associated Firestore data.
 */
export const onUserAccountDeleted = admin.auth.user().onDelete(async (user) => {
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
      // Note: Subcollections like "messages" are NOT automatically deleted.
      // For a full cleanup, a more complex recursive delete on the subcollection
      // would be needed here, but for this app's purpose, deleting the match
      // effectively removes it from the UI.
    });
  }

  // Commit all the batched deletions
  try {
    await batch.commit();
    logger.info(`Successfully completed cascade delete for user: ${uid}`);
  } catch (error) {
    logger.error(`Error committing cascade delete for user ${uid}:`, error);
  }
});
