'use client';

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

let app;

// This prevents re-initializing the app on hot reloads
if (!getApps().length) {
  // When deployed to App Hosting, the K_SERVICE environment variable is automatically set.
  // We can use this to detect the production environment and use auto-initialization.
  // For local development AND local builds, we'll use the .env file.
  if (process.env.K_SERVICE) {
    // Use empty config to trigger auto-init from App Hosting environment variables
    app = initializeApp({});
  } else {
    // This is used for local development (`npm run dev`) and local builds (`npm run build`)
    const firebaseConfig = {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
      measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
    };
    app = initializeApp(firebaseConfig);
  }
} else {
  app = getApp();
}

const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };
