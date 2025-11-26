import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import type { UserProfile } from "@/types";

export async function createMatch(userA_Id: string, userB_Id: string, projectTitle: string) {
  // Ensure consistent match ID regardless of who initiates
  const matchId = [userA_Id, userB_Id].sort().join("_");
  const matchRef = doc(db, "matches", matchId);

  // Fetch both user profiles to store their details
  const userADocRef = doc(db, "users", userA_Id);
  const userBDocRef = doc(db, "users", userB_Id);

  const [userADoc, userBDoc] = await Promise.all([getDoc(userADocRef), getDoc(userBDocRef)]);

  if (!userADoc.exists() || !userBDoc.exists()) {
    throw new Error("One or both users in the match do not exist.");
  }

  const userA = userADoc.data() as UserProfile;
  const userB = userBDoc.data() as UserProfile;

  const matchData = {
    participants: [userA_Id, userB_Id],
    participantsDetails: {
      [userA_Id]: {
        name: userA.name || 'User A',
        photoURL: userA.photoURL || '',
      },
      [userB_Id]: {
        name: userB.name || 'User B',
        photoURL: userB.photoURL || '',
      },
    },
    projectTitle,
    timestamp: serverTimestamp(),
    lastMessage: null,
    createdAt: serverTimestamp(),
    status: 'active',
  };

  await setDoc(matchRef, matchData, { merge: true });

  return matchId;
}
