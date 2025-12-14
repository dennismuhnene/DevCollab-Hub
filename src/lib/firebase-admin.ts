import * as admin from 'firebase-admin';

// Check if the app is already initialized to prevent errors
if (!admin.apps.length) {
  // Check for the App Hosting build environment OR the runtime environment.
  // FIREBASE_APP_HOSTING_BUILD is set to 'true' during the build phase.
  // K_SERVICE is set during the runtime phase.
  if (process.env.FIREBASE_APP_HOSTING_BUILD || process.env.K_SERVICE) {
    // In any App Hosting environment, initializeApp() discovers credentials automatically.
    admin.initializeApp();
  } else {
    // For local development, use the service account key from the environment variable.
    // This block will now only run on your local machine.
    if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY is not set for local development. Check your .env file.');
    }
    try {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    } catch (e) {
      console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY. Make sure it is a valid JSON string.', e);
      throw e;
    }
  }
}

export const firebaseAdmin = admin;
