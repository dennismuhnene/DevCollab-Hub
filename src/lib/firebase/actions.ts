'use server';

import { db } from '@/lib/firebase/config';
import { collection, doc, writeBatch, serverTimestamp, arrayUnion, arrayRemove } from 'firebase/firestore';

// --- MATCH ACTIONS ---
interface CreateMatchArgs {
  projectId: string;
  projectTitle: string;
  ownerId: string;
  ownerName: string;
  ownerPhotoURL: string;
  matchedUserId: string;
  matchedUserName: string;
  matchedUserPhotoURL: string;
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
     throw new Error('Invalid arguments for creating a match.');
  }

  const projectDocRef = doc(db, 'projects', projectId);
  
  try {
    const batch = writeBatch(db);

    // 1. Create the new match document.
    const matchDocRef = doc(collection(db, 'matches'));
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
      timestamp: serverTimestamp(),
    };
    batch.set(matchDocRef, matchData);

    // 2. Update the project document: remove from interested, add to matched
    batch.update(projectDocRef, {
      interestedUsers: arrayRemove(matchedUserId),
      matchedUsers: arrayUnion(matchedUserId)
    });

    // 3. Create notification for the matched user.
    const userNotificationRef = doc(collection(db, 'users', matchedUserId, 'notifications'));
    const userNotificationData = {
        type: 'match',
        fromUserId: ownerId,
        fromUserName: ownerName,
        matchId: matchDocRef.id,
        projectId: projectId,
        projectTitle: projectTitle,
        read: false,
        timestamp: serverTimestamp(),
    };
    batch.set(userNotificationRef, userNotificationData);

    // 4. Create notification for the project owner.
    const ownerNotificationRef = doc(collection(db, 'users', ownerId, 'notifications'));
    const ownerNotificationData = {
        type: 'match',
        fromUserId: matchedUserId,
        fromUserName: matchedUserName,
        matchId: matchDocRef.id,
        projectId: projectId,
        projectTitle: projectTitle,
        read: false,
        timestamp: serverTimestamp(),
    };
    batch.set(ownerNotificationRef, ownerNotificationData);

    // 5. Commit the atomic batch write.
    await batch.commit();
    
    return { success: true, matchId: matchDocRef.id };

  } catch (error) {
    console.error("Error in createMatch Server Action:", error);
    // Re-throw the original error to be caught by the client for detailed debugging
    throw error;
  }
}

// This action is being kept in case it's needed elsewhere, but the primary interest logic
// is now handled on the client with non-blocking updates for better error reporting.
export async function toggleInterest(projectId: string, userId: string, isInterested: boolean) {
  if (!projectId || !userId) {
    throw new Error('Project ID and User ID must be provided');
  }
  const projectRef = doc(db, 'projects', projectId);
  try {
    await updateDoc(projectRef, {
      interestedUsers: isInterested ? arrayRemove(userId) : arrayUnion(userId),
    });
    return { success: true };
  } catch (error) {
    console.error('Error toggling interest:', error);
    throw error;
  }
}
