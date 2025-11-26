'use client';

import { useEffect } from 'react';
import { db } from '@/lib/firebase/config';
import { collection, getDocs } from 'firebase/firestore';
import { useAuth } from '@/lib/hooks/use-auth';

export default function DebugNotifs() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    (async () => {
      try {
        const snap = await getDocs(collection(db, 'users', user.uid, 'notifications'));
        console.log("DEBUG_NOTIFS getDocs size:", snap.size);
        snap.forEach(d => console.log(d.id, d.data()));
        alert(`Check console: found ${snap.size} notifications`);
      } catch (err) {
        console.error("DEBUG_NOTIFS getDocs error:", err);
        alert("Error! See console.");
      }
    })();
  }, [user]);

  return (
    <div className="p-8">
      <h1 className="text-xl font-bold">Notification Debug</h1>
      <p>Open your console to see results after your user logs in.</p>
    </div>
  );
}
