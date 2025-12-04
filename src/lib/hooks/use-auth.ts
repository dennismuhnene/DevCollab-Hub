'use client';

import { useUser } from '@/firebase/provider';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import type { UserProfile } from '@/types';
import { useEffect, useState, useCallback } from 'react';

export const useAuth = () => {
  const { user, isUserLoading, userError } = useUser();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [key, setKey] = useState(0); // Add a key to force re-fetching

  const fetchUserProfile = useCallback(async () => {
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
  }, [user]);

  useEffect(() => {
    if (isUserLoading) {
      setLoading(true);
    } else if (user) {
      setLoading(true);
      fetchUserProfile();
    } else {
      // Handle the case where the user is not logged in.
      setUserProfile(null);
      setLoading(false);
    }
  }, [user, isUserLoading, fetchUserProfile, key]);

  const reloadUserProfile = useCallback(() => {
    setKey(prevKey => prevKey + 1);
  }, []);

  return {
    user,
    userProfile,
    loading,
    error: userError,
    reloadUserProfile
  };
};
