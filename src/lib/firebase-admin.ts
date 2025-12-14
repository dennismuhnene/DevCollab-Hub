import * as admin from 'firebase-admin';

// Check if the app is already initialized to prevent errors
if (!admin.apps.length) {
  // When deployed to App Hosting, K_SERVICE is automatically set.
  // We use this to detect the production environment and use auto-initialization.
  if (process.env.K_SERVICE) {
    // In the App Hosting environment, initializeApp() discovers credentials automatically.
    admin.initializeApp();
  } else {
    // For local development, use the service account key from the environment variable.
    if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY is not set for local development.');
    }
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  }
}

export const firebaseAdmin = admin;
