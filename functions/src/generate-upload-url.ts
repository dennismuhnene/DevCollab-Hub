
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { v4 as uuidv4 } from 'uuid';

if (admin.apps.length === 0) {
  admin.initializeApp();
}

/**
 * Creates a signed URL that can be used to upload a file to a specific engagement.
 */
export const generateSignedUrl = functions.https.onCall(async (data, context) => {
  // 1. Authentication and Authorization
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated', 
      'You must be logged in to upload files.'
    );
  }

  const { engagementId, fileName, fileType } = data;
  const { uid } = context.auth;

  if (!engagementId || !fileName || !fileType) {
    throw new functions.https.HttpsError(
      'invalid-argument', 
      'The function must be called with \'engagementId\', \'fileName\', and \'fileType\'.'
    );
  }

  // 2. Verify the user is a participant in the engagement.
  const engagementRef = admin.firestore().collection('engagements').doc(engagementId);
  const engagementDoc = await engagementRef.get();

  if (!engagementDoc.exists) {
    throw new functions.https.HttpsError(
      'not-found', 
      'The specified engagement does not exist.'
    );
  }

  const { developerId, advisorId } = engagementDoc.data()!;
  if (uid !== developerId && uid !== advisorId) {
    throw new functions.https.HttpsError(
      'permission-denied', 
      'You do not have permission to upload files to this engagement.'
    );
  }

  // 3. Generate a unique file path and the signed URL.
  const uniqueFileName = `${uuidv4()}_${fileName}`;
  const filePath = `engagements/${engagementId}/${uniqueFileName}`;
  
  const bucket = admin.storage().bucket();
  const file = bucket.file(filePath);

  const options = {
    version: 'v4' as const,
    action: 'write' as const,
    expires: Date.now() + 15 * 60 * 1000, // 15 minutes
    contentType: fileType,
  };

  const [url] = await file.getSignedUrl(options);

  // 4. Return the URL and the final file path to the client.
  return { url, filePath };
});
