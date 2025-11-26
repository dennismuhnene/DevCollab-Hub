import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/config";

export async function createMatch(userA: string, userB: string, projectTitle: string) {
  const matchId = [userA, userB].sort().join("_");

  const matchRef = doc(db, "matches", matchId);

  await setDoc(
    matchRef,
    {
      participants: [userA, userB],
      projectTitle,
      timestamp: serverTimestamp(),
      lastMessage: null,
      createdAt: serverTimestamp(),
      repaired: false
    },
    { merge: true }
  );

  return matchId;
}
