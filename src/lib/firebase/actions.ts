'use server';

import admin from 'firebase-admin';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

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
    // Optional: if you use databaseURL in other admin APIs add it to env and here:
    // databaseURL: process.env.FIREBASE_DATABASE_URL,
  });
}

const adminDb = getFirestore();
