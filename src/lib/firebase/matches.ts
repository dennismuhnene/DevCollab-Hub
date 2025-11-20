'use server';

import { db } from '@/lib/firebase/config';
import { collection, addDoc, serverTimestamp, doc, getDoc, writeBatch, arrayUnion, arrayRemove } from 'firebase/firestore';
import type { UserProfile, Project, Notification } from '@/types';

export async function createMatch(projectId: string, ownerId: string, matchedUserId: string): Promise<string> {
  if (!projectId || !ownerId || !matchedUserId) {
    throw new Error("Invalid arguments for creating a match.");
  }
  
  const ownerDocRef = doc(db, 'users', ownerId);
  const matchedUserDocRef = doc(db, 'users', matchedUserId);
  const projectDocRef = doc(db, 'projects', projectId);

  try {
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
    
    const batch = writeBatch(db);

    const matchCollectionRef = collection(db, 'matches');
    const newMatchRef = doc(matchCollectionRef); // Create a new ref with a unique ID

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

    // 1. Create the match document
    batch.set(newMatchRef, matchData);
    
    // 2. Update the project document
    batch.update(projectDocRef, {
        matchedUsers: arrayUnion(matchedUserId),
        interestedUsers: arrayRemove(matchedUserId),
    });

    // 3. Create a notification for the USER WHO WAS MATCHED
    const matchedUserNotificationRef = doc(collection(db, 'users', matchedUserId, 'notifications'));
    batch.set(matchedUserNotificationRef, {
      type: 'match',
      fromUserId: ownerId,
      fromUserName: ownerData.name || 'A user',
      matchId: newMatchRef.id,
      projectTitle: projectData.title,
      read: false,
      timestamp: serverTimestamp(),
    } as Omit<Notification, 'id'>);
    
    await batch.commit();

    return newMatchRef.id;

  } catch (error) {
    console.error("Error in createMatch Server Action:", error);
    // Re-throwing the error to be caught by the client-side caller
    if (error instanceof Error) {
        throw new Error(error.message || 'An unknown error occurred while creating the match.');
    }
    throw new Error('An unknown error occurred while creating the match.');
  }
}
