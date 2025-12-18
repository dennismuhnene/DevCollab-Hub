
import { db } from '@/lib/firebase/config';
import { collection, addDoc, serverTimestamp, query, where, getDocs, updateDoc, doc, writeBatch } from 'firebase/firestore';

export async function addNotification(userId: string, notification: any) {
    if (!userId) return;
    try {
        const notificationRef = collection(db, 'users', userId, 'notifications');
        await addDoc(notificationRef, {
            ...notification,
            read: notification.read ?? false,
            createdAt: serverTimestamp(),
        });
    } catch (error) {
        console.error("Failed to add notification: ", error);
    }
}

// NEW FUNCTION: mark all message notifications for a match as read
export async function markMatchNotificationsAsRead(userId: string, matchId: string) {
    if (!userId || !matchId) return;

    try {
        const notifsRef = collection(db, 'users', userId, 'notifications');
        // This query now also includes type: 'match'
        const q = query(notifsRef, where('matchId', '==', matchId), where('read', '==', false));
        const snapshot = await getDocs(q);
        if (snapshot.empty) return;

        const batch = writeBatch(db);
        snapshot.docs.forEach(docSnap => {
            const notification = docSnap.data();
            // We ensure we only mark message or match notifications as read here.
            if (notification.type === 'message' || notification.type === 'match') {
               batch.update(doc(db, 'users', userId, 'notifications', docSnap.id), { read: true });
            }
        });
        await batch.commit();
    } catch (error) {
        console.error("Failed to mark match/message notifications as read:", error);
    }
}

export async function markInterestNotificationsAsRead(userId: string, projectId: string) {
    if (!userId || !projectId) return;
    try {
        const notifsRef = collection(db, 'users', userId, 'notifications');
        const q = query(notifsRef, where('projectId', '==', projectId), where('type', '==', 'interest'), where('read', '==', false));
        const snapshot = await getDocs(q);
        if (snapshot.empty) return;

        const batch = writeBatch(db);
        snapshot.docs.forEach(docSnap => {
            batch.update(doc(db, 'users', userId, 'notifications', docSnap.id), { read: true });
        });
        await batch.commit();
    } catch (error) {
        console.error("Failed to mark interest notifications as read:", error);
    }
}
