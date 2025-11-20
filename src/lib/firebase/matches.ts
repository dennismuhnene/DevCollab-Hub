'use server';

import { db } from '@/lib/firebase/config';
import { collection, addDoc, serverTimestamp, doc, getDoc, writeBatch, arrayUnion, arrayRemove } from 'firebase/firestore';
import type { UserProfile, Project, Notification } from '@/types';
import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';

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
    
    const matchCollectionRef = collection(db, 'matches');

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

    // This server action now ONLY creates the match document.
    const matchRef = await addDoc(matchCollectionRef, matchData);
    
    return matchRef.id;

  } catch (error) {
    console.error("Error in createMatch Server Action:", error);
    if (error instanceof Error) {
        throw new Error(error.message || 'An unknown error occurred while creating the match.');
    }
    throw new Error('An unknown error occurred while creating the match.');
  }
}
