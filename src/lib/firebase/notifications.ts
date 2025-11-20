'use server';

import { db } from '@/lib/firebase/config';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

// This is a general-purpose function to add any notification.
// Specific logic for interest/match notifications is now in `lib/firebase/actions.ts`.
export async function addNotification(userId: string, notification: any) {
    if (!userId) return;
    try {
        const notificationRef = collection(db, 'users', userId, 'notifications');
        await addDoc(notificationRef, {
            ...notification,
            timestamp: serverTimestamp(),
        });
    } catch (error) {
        console.error("Failed to add notification: ", error);
        // We don't re-throw here as this is a more general utility.
        // The calling server action is responsible for primary error handling.
    }
}
