'use client';

import React, { createContext, useContext, ReactNode, useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { FirebaseApp } from 'firebase/app';
import { Firestore, doc, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { Auth, User, onAuthStateChanged } from 'firebase/auth';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';
import { useRouter, usePathname } from 'next/navigation';
import { UserProfile } from '@/types';
import OnboardingWizard from '@/components/onboarding-wizard';

interface FirebaseProviderProps {
  children: ReactNode;
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
}

export interface AuthContextState {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  error: Error | null;
  reloadUserProfile: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextState | undefined>(undefined);

export const FirebaseProvider: React.FC<FirebaseProviderProps> = ({ children, firebaseApp, firestore, auth }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  const reloadUserProfile = useCallback(async () => {
    if (auth.currentUser) {
        await auth.currentUser.reload();
        // The onSnapshot listener will handle the userProfile update automatically
    }
  }, [auth]);

  useEffect(() => {
    let unsubscribeProfile: Unsubscribe | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      // Clean up previous profile listener
      if (unsubscribeProfile) {
        unsubscribeProfile();
      }

      if (firebaseUser) {
        setLoading(true);
        setUser(firebaseUser);

        // Listen for profile changes in real-time
        const userDocRef = doc(firestore, 'users', firebaseUser.uid);
        unsubscribeProfile = onSnapshot(userDocRef, (doc) => {
            if (doc.exists()) {
                setUserProfile({ uid: doc.id, ...doc.data() } as UserProfile);
            } else {
                // This case happens for a new user before the wizard creates the document.
                setUserProfile(null);
            }
            setLoading(false);
        }, (err) => {
            console.error("Error fetching user profile:", err);
            setError(err);
            setLoading(false);
        });

        // Session Management & Verification Checks
        try {
            await firebaseUser.reload();
            const idToken = await firebaseUser.getIdToken();
            await fetch('/api/auth/session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ idToken }),
            });

            if (!firebaseUser.emailVerified) {
                const allowedUnverifiedPaths = ['/verify-email', '/login', '/signup', '/forgot-password'];
                if (!allowedUnverifiedPaths.includes(pathnameRef.current)) {
                    router.push('/verify-email');
                }
            }
        } catch (err: any) {
            console.error("Error during auth state processing:", err);
            setError(err);
        }

      } else {
        // User is logged out
        setUser(null);
        setUserProfile(null);
        setLoading(false);
        try {
            await fetch('/api/auth/session', { method: 'DELETE' });
        } catch (err) {
            console.error("Error deleting session cookie:", err);
        }
      }
    }, (err) => {
      console.error("onAuthStateChanged error:", err);
      setError(err);
      setLoading(false);
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) {
        unsubscribeProfile();
      }
    };
  }, [auth, firestore, router]);

  const contextValue = useMemo(() => ({
    user,
    userProfile,
    loading,
    error,
    reloadUserProfile,
  }), [user, userProfile, loading, error, reloadUserProfile]);

  // Define paths where the onboarding wizard should NOT take over.
  const onboardingBypassPaths = ['/login', '/signup', '/verify-email', '/forgot-password', '/advisory'];
  const onBypassPath = onboardingBypassPaths.includes(pathname);

  // A user is considered "onboarded" if they have the new `onboardingComplete` flag,
  // or if they have a "legacy" complete profile (a bio and at least one skill).
  // This prevents the wizard from showing to established users.
  const isLegacyProfileComplete = !!(userProfile?.bio && userProfile.skills && userProfile.skills.length > 0);
  const isOnboarded = userProfile?.onboardingComplete || isLegacyProfileComplete;

  // Show wizard if user is logged in, not loading, not on a bypass path, AND has not been onboarded.
  const showOnboarding = user && !loading && !onBypassPath && !isOnboarded;

  return (
    <AuthContext.Provider value={contextValue}>
        <FirebaseErrorListener />
        {showOnboarding ? <OnboardingWizard /> : children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextState => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within a FirebaseProvider.');
  }
  return context;
};
