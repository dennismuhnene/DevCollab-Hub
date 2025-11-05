
'use server';

import { db } from '@/lib/firebase/config';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import type { Notification } from '@/types';

// This is a server action, callable from client components.
export async function addNotification(userId: string, notification: Omit<Notification, 'id' | 'timestamp'>) {
  if (!userId) {
    console.error('Cannot add notification for an undefined user.');
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
    // In a real app, you might want to handle this more gracefully, e.g., by re-throwing
  }
}
