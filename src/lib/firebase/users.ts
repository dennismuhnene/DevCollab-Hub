'use client';
import { doc, updateDoc, arrayUnion, arrayRemove, getDoc, deleteDoc } from 'firebase/firestore';
import { db } from './config';

/**
 * Blocks a user by updating the blocker's `blockedUsers` list.
 * This function is designed to run on the client and only writes to the current user's document,
 * which is permitted by the security rules.
 * @param {string} blockerId - The UID of the user initiating the block.
 * @param {string} blockeeId - The UID of the user being blocked.
 */
export const blockUser = async (blockerId: string, blockeeId:string): Promise<void> => {
    if (blockerId === blockeeId) {
        throw new Error("A user cannot block themselves.");
    }
    const userRef = doc(db, 'users', blockerId);
    await updateDoc(userRef, {
        blockedUsers: arrayUnion(blockeeId)
    });
};

/**
 * Unblocks a user by removing them from the blocker's `blockedUsers` list.
 * This function is designed to run on the client and only writes to the current user's document.
 * @param {string} blockerId - The UID of the user initiating the unblock.
 * @param {string} blockeeId - The UID of the user being unblocked.
 */
export const unblockUser = async (blockerId: string, blockeeId: string): Promise<void> => {
    const userRef = doc(db, 'users', blockerId);
    await updateDoc(userRef, {
        blockedUsers: arrayRemove(blockeeId)
    });
};


/**
 * Checks if a block exists between two users.
 * Returns true if either user has blocked the other.
 * @param {string} userId1 - The UID of the first user.
 * @param {string} userId2 - The UID of the second user.
 * @returns {Promise<boolean>} - True if a block exists, false otherwise.
 */
export const checkBlockStatus = async (userId1: string, userId2: string): Promise<boolean> => {
    if (!userId1 || !userId2) return false;

    try {
        const user1Ref = doc(db, 'users', userId1);
        const user1Snap = await getDoc(user1Ref);
        if (user1Snap.exists() && user1Snap.data().blockedUsers?.includes(userId2)) {
            return true;
        }

        const user2Ref = doc(db, 'users', userId2);
        const user2Snap = await getDoc(user2Ref);
        if (user2Snap.exists() && user2Snap.data().blockedUsers?.includes(userId1)) {
            return true;
        }
    } catch (error) {
        console.error("Error checking block status:", error);
        return true; // Fail safe: if we can't check, assume they are blocked.
    }

    return false;
};

/**
 * Deletes a user's account from Firestore.
 * This is intended to trigger backend functions for full data cleanup.
 * @param {string} userId - The UID of the user to be deleted.
 */
export const deleteUserAccount = async (userId: string): Promise<void> => {
    if (!userId) {
        throw new Error("User ID is required to delete an account.");
    }
    const userRef = doc(db, 'users', userId);
    await deleteDoc(userRef);
};
