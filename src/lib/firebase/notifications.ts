
'use server';

import { db } from '@/lib/firebase/config';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import type { Notification } from '@/types';

// Note: This is a server action. It can be called from client components.
export async function addNotification(userId: string, notification: Omit<Notification, 'id' | 'timestamp'>) {
  if (!userId) {
    console.error('Cannot add notification for undefined user.');
    return;
  }
  
  try {
    const notificationData = {
        ...notification,
        timestamp: serverTimestamp(), // Use serverTimestamp for consistency
    };
    await addDoc(collection(db, 'users', userId, 'notifications'), notificationData);
  } catch (error) {
    console.error('Error adding notification:', error);
  }
}
