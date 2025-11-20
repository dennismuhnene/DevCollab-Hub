'use server';

import { db } from '@/lib/firebase/config';
import { collection, doc, writeBatch, serverTimestamp, arrayUnion, arrayRemove, getDoc } from 'firebase/firestore';

// --- INTEREST ACTIONS ---
interface ToggleInterestArgs {
  projectId: string;
  projectTitle: string;
  projectOwnerId: string;
  interestedUserId: string;
  interestedUserName: string;
}

export async function toggleInterest(args: ToggleInterestArgs): Promise<{ success: boolean; error?: string }> {
  const {
    projectId,
    projectTitle,
    projectOwnerId,
    interestedUserId,
    interestedUserName,
  } = args;

  if (!projectId || !projectOwnerId || !interestedUserId) {
    throw new Error("Invalid arguments for toggling interest.");
  }

  const projectRef = doc(db, 'projects', projectId);

  try {
    const projectSnap = await getDoc(projectRef);
    if (!projectSnap.exists()) {
      throw new Error("Project not found.");
    }
    
    const projectData = projectSnap.data();
    const isCurrentlyInterested = projectData.interestedUsers?.includes(interestedUserId);
    
    const batch = writeBatch(db);

    if (isCurrentlyInterested) {
      // --- REMOVE INTEREST ---
      batch.update(projectRef, { interestedUsers: arrayRemove(interestedUserId) });
      // Note: We are not deleting the notification to keep the owner's history.
    } else {
      // --- ADD INTEREST ---
      batch.update(projectRef, { interestedUsers: arrayUnion(interestedUserId) });

      // Create notification for the project owner
      const notificationRef = doc(collection(db, 'users', projectOwnerId, 'notifications'));
      const notificationData = {
        type: 'interest',
        fromUserId: interestedUserId,
        fromUserName: interestedUserName,
        projectId: projectId,
        projectTitle: projectTitle,
        read: false,
        timestamp: serverTimestamp(),
      };
      batch.set(notificationRef, notificationData);
    }
    
    await batch.commit();
    return { success: true };

  } catch (error) {
    console.error('Error in toggleInterest Server Action:', error);
    // Re-throw the original error to be caught by the client for detailed debugging
    throw error;
  }
}

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
        { uid: ownerId, name: ownerName, photoURL: ownerPhotoURL },
        { uid: matchedUserId, name: matchedUserName, photoURL: matchedUserPhotoURL },
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
