// To run this script, use: npm run get:users

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, Firestore } from 'firebase/firestore';
import { config } from 'dotenv';

// Load environment variables from .env file
config();

// Manually construct the config object from environment variables
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Check if all necessary config values are present
if (!firebaseConfig.projectId) {
  console.error("Firebase project ID is not defined. Make sure NEXT_PUBLIC_FIREBASE_PROJECT_ID is set in your .env file.");
  process.exit(1);
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function fetchUsers(db: Firestore) {
  console.log("Fetching users from Firestore...");
  try {
    const usersCollection = collection(db, 'users');
    const userSnapshot = await getDocs(usersCollection);
    
    if (userSnapshot.empty) {
      console.log("No users found in the 'users' collection.");
      return;
    }

    console.log("--- User Data ---");
    userSnapshot.forEach((doc) => {
      console.log(`\nUser ID: ${doc.id}`);
      console.log(JSON.stringify(doc.data(), null, 2));
      console.log("-----------------");
    });
  } catch (error) {
    console.error("Error fetching users:", error);
  } finally {
    // Since this is a short-lived script, we can exit the process.
    // Note: In a real app, you wouldn't do this.
    process.exit(0);
  }
}

fetchUsers(db);
