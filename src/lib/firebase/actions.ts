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

// --- MATCH ACTIONS ---
interface CreateMatchArgs {
  projectId: string;
  projectTitle: string;
  ownerId: string;
  ownerName?: string;
  ownerPhotoURL?: string;
  matchedUserId: string;
  matchedUserName?: string;
  matchedUserPhotoURL?: string;
}

interface MatchResult {
  success: boolean;
  matchId?: string;
  error?: string;
}

export async function createMatch(args: CreateMatchArgs): Promise<MatchResult> {
  const {
    projectId,
    projectTitle,
    ownerId,
    ownerName,
    ownerPhotoURL,
    matchedUserId,
    matchedUserName,
    matchedUserPhotoURL,
  } = args;

  if (!projectId || !ownerId || !matchedUserId) {
    throw new Error('Invalid arguments for creating a match. Missing projectId, ownerId, or matchedUserId.');
  }

  try {
    // 0. Verify the calling user is the project owner.
    const projectRef = adminDb.doc(`projects/${projectId}`);
    const projectSnap = await projectRef.get();
    if (!projectSnap.exists) {
      return { success: false, error: 'Project not found.' };
    }
    const projectData = projectSnap.data();
    if (!projectData || projectData.ownerId !== ownerId) {
      return { success: false, error: 'Not authorized: provided ownerId does not match project owner.' };
    }

    // 1. Build batch
    const batch = adminDb.batch();

    // 1a. Create match doc in top-level 'matches' collection
    const matchDocRef = adminDb.collection('matches').doc(); // auto id
    const matchData = {
      projectId,
      projectTitle,
      ownerId,
      matchedUserId,
      participants: [ownerId, matchedUserId],
      participantsDetails: [
        { uid: ownerId, name: ownerName || 'Project Owner', photoURL: ownerPhotoURL || '' },
        { uid: matchedUserId, name: matchedUserName || 'A Developer', photoURL: matchedUserPhotoURL || '' },
      ],
      status: 'active',
      timestamp: FieldValue.serverTimestamp(),
    };
    batch.set(matchDocRef, matchData);

    // 1b. Update project document
    batch.update(projectRef, {
      interestedUsers: FieldValue.arrayRemove(matchedUserId),
      matchedUsers: FieldValue.arrayUnion(matchedUserId),
      updatedAt: FieldValue.serverTimestamp(),
    });

    // 1c. Create notification for the matched user
    const userNotificationRef = adminDb.collection('users').doc(matchedUserId).collection('notifications').doc();
    const userNotificationData = {
      type: 'match',
      fromUserId: ownerId,
      fromUserName: ownerName || 'A User',
      matchId: matchDocRef.id,
      projectId: projectId,
      projectTitle: projectTitle,
      read: false,
      timestamp: FieldValue.serverTimestamp(),
    };
    batch.set(userNotificationRef, userNotificationData);

    // 1d. Create notification for the project owner
    const ownerNotificationRef = adminDb.collection('users').doc(ownerId).collection('notifications').doc();
    const ownerNotificationData = {
      type: 'match',
      fromUserId: matchedUserId,
      fromUserName: matchedUserName || 'A User',
      matchId: matchDocRef.id,
      projectId: projectId,
      projectTitle: projectTitle,
      read: false,
      timestamp: FieldValue.serverTimestamp(),
    };
    batch.set(ownerNotificationRef, ownerNotificationData);

    // 2. Commit the batch atomically
    await batch.commit();

    return { success: true, matchId: matchDocRef.id };
  } catch (error: any) {
    console.error('Error in createMatch server action (admin):', error);
    return { success: false, error: error?.message || String(error) };
  }
}
