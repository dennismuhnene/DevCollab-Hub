import * as admin from 'firebase-admin';

// This function ensures Firebase Admin is initialized only once.
export function initializeFirebaseAdmin() {
  if (admin.apps.length > 0) {
    return admin;
  }

  /**
   * IMPORTANT:
   * During `next build`, Firebase App Hosting does NOT inject secrets.
   * NEXT_RUNTIME is undefined at build time.
   * We must not attempt local credential initialization during build.
   */
  const isBuildTime = process.env.NEXT_RUNTIME === undefined;

  // When running on Google Cloud (including App Hosting runtime),
  // GCLOUD_PROJECT is set and credentials are auto-discovered.
  if (process.env.GCLOUD_PROJECT) {
    admin.initializeApp();
    return admin;
  }

  // Skip initialization entirely during build
  if (isBuildTime) {
    return admin;
  }

  // Local development: use service account key from env
  if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    throw new Error(
      'FIREBASE_SERVICE_ACCOUNT_KEY is not set. Check your .env file for local development.'
    );
  }

  try {
    const serviceAccount = JSON.parse(
      process.env.FIREBASE_SERVICE_ACCOUNT_KEY
    );

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } catch (e) {
    console.error(
      'Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY. Make sure it is a valid JSON string.',
      e
    );
    throw new Error('Could not initialize Firebase Admin SDK.');
  }

  return admin;
}
