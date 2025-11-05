'use server';

import { db } from '@/lib/firebase/config';
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import type { UserProfile } from '@/types';
import { addNotification } from './notifications';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export async function createMatch(projectId: string, ownerId: string, matchedUserId: string): Promise<string> {
  const ownerDoc = await getDoc(doc(db, 'users', ownerId));
  const matchedUserDoc = await getDoc(doc(db, 'users', matchedUserId));
  const projectDoc = await getDoc(doc(db, 'projects', projectId));

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
    participants: [ownerId, matchedUserId],
    participantsDetails: [
      { uid: ownerId, name: ownerData.name, photoURL: ownerData.photoURL || '' },
      { uid: matchedUserId, name: matchedUserData.name, photoURL: matchedUserData.photoURL || '' },
    ],
    timestamp: serverTimestamp(),
    status: 'active',
  };

  const matchesCollection = collection(db, 'matches');

  // Return the promise here so we can still get the ID on success
  return addDoc(matchesCollection, matchData).then(async (matchRef) => {
    // Notify both users on success
    await addNotification(ownerId, {
      type: 'match',
      fromUserId: matchedUserId,
      fromUserName: matchedUserData.name,
      projectId,
      projectTitle: projectData.title,
      matchId: matchRef.id,
      read: false,
      timestamp: new Date(),
    });

    await addNotification(matchedUserId, {
      type: 'match',
      fromUserId: ownerId,
      fromUserName: ownerData.name,
      projectId,
      projectTitle: projectData.title,
      matchId: matchRef.id,
      read: false,
      timestamp: new Date(),
    });
    
    return matchRef.id;
  }).catch((serverError) => {
    // On failure, create and emit a contextual error
    const permissionError = new FirestorePermissionError({
      path: matchesCollection.path,
      operation: 'create',
      requestResourceData: matchData,
    });
    errorEmitter.emit('permission-error', permissionError);
    // Re-throw the original error to ensure the client promise rejects
    throw serverError;
  });
}
