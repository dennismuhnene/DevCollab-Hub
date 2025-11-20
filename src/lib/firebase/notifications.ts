'use server';

import { db } from '@/lib/firebase/config';
import { collection, addDoc, serverTimestamp, writeBatch, doc, arrayUnion, arrayRemove } from 'firebase/firestore';

interface ExpressInterestArgs {
  projectId: string;
  projectTitle: string;
  projectOwnerId: string;
  interestedUserId: string;
  interestedUserName: string;
  remove: boolean;
}

interface InterestResult {
    success: boolean;
    error?: string;
}

export async function expressInterest(args: ExpressInterestArgs): Promise<InterestResult> {
  const {
    projectId,
    projectTitle,
    projectOwnerId,
    interestedUserId,
    interestedUserName,
    remove,
  } = args;

  if (!projectId || !projectOwnerId || !interestedUserId) {
    return { success: false, error: "Invalid arguments for expressing interest." };
  }

  const projectRef = doc(db, 'projects', projectId);
  const notificationRef = doc(collection(db, 'users', projectOwnerId, 'notifications'));
  
  try {
    const batch = writeBatch(db);

    if (remove) {
      // If removing interest, just update the project
      batch.update(projectRef, { interestedUsers: arrayRemove(interestedUserId) });
      // Note: We don't remove the notification to keep the owner's history clean.
    } else {
      // Add interest to project
      batch.update(projectRef, { interestedUsers: arrayUnion(interestedUserId) });

      // Create notification for project owner
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
    console.error('Error expressing interest:', error);
    if (error instanceof Error) {
        return { success: false, error: error.message };
    }
    return { success: false, error: 'An unknown error occurred.' };
  }
}
