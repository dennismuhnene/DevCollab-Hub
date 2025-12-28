'use server';

import admin from 'firebase-admin';

// Initialize firebase-admin once (singleton pattern).
if (!admin.apps.length) {
  if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    throw new Error('Missing FIREBASE_SERVICE_ACCOUNT_KEY environment variable for firebase-admin initialization.');
  }
  let serviceAccount;
  try {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
  } catch (err) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY is not valid JSON. Make sure you pasted the JSON key stringified into the env var.');
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

// Note: FieldValue is accessed via admin.firestore.FieldValue, not imported directly.
const adminDb = admin.firestore();

export { admin, adminDb };
