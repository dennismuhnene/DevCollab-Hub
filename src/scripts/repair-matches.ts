import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, updateDoc } from "firebase/firestore";
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

    // Fix missing participants
    if (!data.participants || !Array.isArray(data.participants)) {
      console.log(`⚠ Repairing ${docSnap.id} — participants missing`);
      data.participants = [];
      needsRepair = true;
    }

    // Remove null/empty strings
    data.participants = data.participants.filter((p: any) => typeof p === "string" && p.length > 0);

    // Fix missing timestamp
    if (!data.timestamp) {
      console.log(`⚠ Repairing ${docSnap.id} — timestamp missing`);
      data.timestamp = null;
      needsRepair = true;
    }

    if (needsRepair) {
      await updateDoc(docSnap.ref, {
        ...data,
        repaired: true
      });
      fixedCount++;
    }
  }

  console.log(`✅ Repair complete. Fixed ${fixedCount} broken documents.`);
}

repairMatches().then(() => {
    console.log("Script finished.");
    process.exit(0);
}).catch(err => {
    console.error("Script failed:", err);
    process.exit(1);
});
