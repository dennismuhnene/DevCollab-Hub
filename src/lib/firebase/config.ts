'use client';

import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

let app: FirebaseApp | undefined;

// This prevents re-initializing the app on hot reloads
if (!getApps().length) {
  const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
  };

  // In the App Hosting build environment, K_SERVICE is set and we can auto-init
  if (process.env.K_SERVICE) {
    app = initializeApp({});
  } 
  // For local dev and builds, only initialize if the API key is provided
  else if (firebaseConfig.apiKey) {
    app = initializeApp(firebaseConfig);
  }
} else {
  app = getApp();
}

// Initialize auth, db, and storage only if the app has been initialized
const auth = app ? getAuth(app) : undefined;
const db = app ? getFirestore(app) : undefined;
const storage = app ? getStorage(app) : undefined;

export { app, auth, db, storage };
