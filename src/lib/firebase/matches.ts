
'use server';

import { db } from '@/lib/firebase/config';
import { collection, addDoc, serverTimestamp, doc, getDoc, writeBatch } from 'firebase/firestore';
import type { UserProfile } from '@/types';
import { addNotification } from './notifications';

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
    const projectData = projectDoc.data();

    const matchData = {
      projectId,
      projectTitle: projectData.title,
      ownerId,
      matchedUserId,
      participants: [ownerId, matchedUserId], // CRITICAL for security rules
      participantsDetails: [
        { uid: ownerId, name: ownerData.name || 'Owner', photoURL: ownerData.photoURL || '' },
        { uid: matchedUserId, name: matchedUserData.name || 'Developer', photoURL: matchedUserData.photoURL || '' },
      ],
      status: 'active',
      timestamp: serverTimestamp(), // For sorting conversations
    };

    const matchesCollectionRef = collection(db, 'matches');
    const matchRef = await addDoc(matchesCollectionRef, matchData);

    // Notify both users about the new match
    await Promise.all([
      addNotification(ownerId, {
        type: 'match',
        fromUserId: matchedUserId,
        fromUserName: matchedUserData.name || 'A Developer',
        projectId,
        projectTitle: projectData.title,
        matchId: matchRef.id,
        read: false,
      }),
      addNotification(matchedUserId, {
        type: 'match',
        fromUserId: ownerId,
        fromUserName: ownerData.name || 'A Project Owner',
        projectId,
        projectTitle: projectData.title,
        matchId: matchRef.id,
        read: false,
      })
    ]);
    
    return matchRef.id;
  } catch (error) {
    console.error("Error in createMatch Server Action:", error);
    // Re-throwing the error to be caught by the client-side caller
    if (error instanceof Error) {
        throw new Error(error.message || 'An unknown error occurred while creating the match.');
    }
    throw new Error('An unknown error occurred while creating the match.');
  }
}
