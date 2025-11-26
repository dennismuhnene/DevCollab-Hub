import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, updateDoc, serverTimestamp } from "firebase/firestore";
import { firebaseConfig } from "../lib/firebase/config";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function repairMatches() {
  console.log("🔍 Scanning for broken match documents...");

  const snapshot = await getDocs(collection(db, "matches"));
  let fixedCount = 0;

  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();
    let needsRepair = false;
    const updateData: any = {};


    // Fix missing participants
    if (!data.participants || !Array.isArray(data.participants)) {
      console.log(`⚠ Repairing ${docSnap.id} — participants missing`);
      updateData.participants = [];
      needsRepair = true;
    }

    // Fix missing timestamp
    if (!data.timestamp) {
      console.log(`⚠ Repairing ${docSnap.id} — timestamp missing`);
      updateData.timestamp = serverTimestamp();
      needsRepair = true;
    }

    if (needsRepair) {
      updateData.repaired = true;
      await updateDoc(docSnap.ref, updateData);
      fixedCount++;
    }
  }

  console.log(`✅ Repair complete. Fixed ${fixedCount} broken documents.`);
}

repairMatches().then(() => {
    console.log("Script finished.");
}).catch(err => {
    console.error("Script failed:", err);
});
