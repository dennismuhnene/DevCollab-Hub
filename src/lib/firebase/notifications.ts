'use server';

import { db } from '@/lib/firebase/config';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

// Note: This is a server action. It can be called from client components.
export async function addNotification(userId: string, notification: any) {
  if (!userId) {
    console.error('Cannot add notification for undefined user.');
    return;
  }
  
  try {
    const notificationData = {
        ...notification,
        timestamp: serverTimestamp(),
    };
    await addDoc(collection(db, 'users', userId, 'notifications'), notificationData);
  } catch (error) {
    console.error('Error adding notification:', error);
  }
}
