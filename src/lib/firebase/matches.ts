'use server';

import { db } from '@/lib/firebase/config';
import { collection, addDoc, serverTimestamp, doc, getDoc, writeBatch, arrayUnion, arrayRemove } from 'firebase/firestore';
import type { UserProfile, Project, Notification } from '@/types';

// This is now an atomic server action that handles all DB writes in a single batch.
export async function createMatch(projectId: string, ownerId: string, matchedUserId: string): Promise<string> {
  if (!projectId || !ownerId || !matchedUserId) {
    throw new Error("Invalid arguments for creating a match.");
  }
  
  const ownerDocRef = doc(db, 'users', ownerId);
  const matchedUserDocRef = doc(db, 'users', matchedUserId);
  const projectDocRef = doc(db, 'projects', projectId);

  try {
    // 1. Fetch all necessary documents first.
    const [ownerDoc, matchedUserDoc, projectDoc] = await Promise.all([
      getDoc(ownerDocRef),
      getDoc(matchedUserDocRef),
      getDoc(projectDocRef)
    ]);

    if (!ownerDoc.exists() || !matchedUserDoc.exists() || !projectDoc.exists()) {
      throw new Error("Invalid user or project provided for match.");
    }

    const ownerData = ownerDoc.data() as UserProfile;
    const matchedUserData = matchedUserDoc.data() as UserProfile;
    const projectData = projectDoc.data() as Project;
    
    // 2. Prepare all writes in a batch.
    const batch = writeBatch(db);

    // 2a. Create the new match document.
    const matchDocRef = doc(collection(db, 'matches'));
    const matchData = {
      projectId,
      projectTitle: projectData.title,
      ownerId,
      matchedUserId,
      participants: [ownerId, matchedUserId],
      participantsDetails: [
        { uid: ownerId, name: ownerData.name || 'Owner', photoURL: ownerData.photoURL || '' },
        { uid: matchedUserId, name: matchedUserData.name || 'Developer', photoURL: matchedUserData.photoURL || '' },
      ],
      status: 'active',
      timestamp: serverTimestamp(),
    };
    batch.set(matchDocRef, matchData);

    // 2b. Update the project document.
    batch.update(projectDocRef, {
      interestedUsers: arrayRemove(matchedUserId),
      matchedUsers: arrayUnion(matchedUserId)
    });

    // 2c. Create notification for the matched user.
    const notificationRef = doc(collection(db, 'users', matchedUserId, 'notifications'));
    const notificationData: Omit<Notification, 'id'> = {
        type: 'match',
        fromUserId: ownerId,
        fromUserName: ownerData.name || 'A user',
        matchId: matchDocRef.id,
        projectTitle: projectData.title,
        read: false,
        timestamp: serverTimestamp(),
    };
    batch.set(notificationRef, notificationData);

    // 3. Commit the atomic batch write.
    await batch.commit();
    
    return matchDocRef.id;

  } catch (error) {
    console.error("Error in createMatch Server Action:", error);
    // Re-throwing the error to be caught by the client-side caller
    if (error instanceof Error) {
        throw new Error(error.message || 'An unknown error occurred while creating the match.');
    }
    throw new Error('An unknown error occurred while creating the match.');
  }
}
