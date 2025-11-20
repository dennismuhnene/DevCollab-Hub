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
  
  try {
    const batch = writeBatch(db);

    if (remove) {
      batch.update(projectRef, { interestedUsers: arrayRemove(interestedUserId) });
    } else {
      batch.update(projectRef, { interestedUsers: arrayUnion(interestedUserId) });

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
    console.error('Error expressing interest:', error);
    // Re-throw the original error to be caught by the client and displayed in the Next.js overlay
    throw error;
  }
}

export async function addNotification(userId: string, notification: any) {
    if (!userId) return;
    const notificationRef = collection(db, 'users', userId, 'notifications');
    await addDoc(notificationRef, {
        ...notification,
        timestamp: serverTimestamp(),
    });
}