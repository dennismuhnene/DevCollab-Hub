'use client';

import { useUser } from '@/firebase/provider';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import type { UserProfile } from '@/types';
import { useEffect, useState } from 'react';

export const useAuth = () => {
  const { user, isUserLoading, userError } = useUser();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUserProfile() {
      if (user) {
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          setUserProfile({ uid: user.uid, ...userDoc.data() } as UserProfile);
        } else {
          setUserProfile(null);
        }
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    }

    if (!isUserLoading) {
      fetchUserProfile();
    }
  }, [user, isUserLoading]);

  return { user, userProfile, loading: loading || isUserLoading, error: userError };
};
