'use client';

import React, { DependencyList, createContext, useContext, ReactNode, useMemo, useState, useEffect, useRef } from 'react';
import { FirebaseApp } from 'firebase/app';
import { Firestore } from 'firebase/firestore';
import { Auth, User, onAuthStateChanged } from 'firebase/auth';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';
import { useRouter, usePathname } from 'next/navigation';

interface FirebaseProviderProps {
  children: ReactNode;
  firebaseApp: FirebaseApp | undefined;
  firestore: Firestore | undefined;
  auth: Auth | undefined;
} 

interface UserAuthState {
  user: User | null;
  isUserLoading: boolean;
  userError: Error | null;
}

export interface FirebaseContextState {
  areServicesAvailable: boolean;
  firebaseApp: FirebaseApp | null;
  firestore: Firestore | null;
  auth: Auth | null;
  user: User | null;
  isUserLoading: boolean;
  userError: Error | null;
}

export interface FirebaseServicesAndUser {
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
  user: User | null;
  isUserLoading: boolean;
  userError: Error | null;
}

export interface UserHookResult {
  user: User | null;
  isUserLoading: boolean;
  userError: Error | null;
  emailVerified: boolean | null;
}

export const FirebaseContext = createContext<FirebaseContextState | undefined>(undefined);

export const FirebaseProvider: React.FC<FirebaseProviderProps> = ({
  children,
  firebaseApp,
  firestore,
  auth,
}) => {
  const [userAuthState, setUserAuthState] = useState<UserAuthState>({
    user: null,
    isUserLoading: true,
    userError: null,
  });
  const router = useRouter();
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    if (!auth) {
      setUserAuthState({ user: null, isUserLoading: false, userError: new Error("Auth service not provided.") });
      return;
    }

    const unsubscribe = onAuthStateChanged(
      auth,
      (firebaseUser) => {
        if (firebaseUser) {
            firebaseUser.reload().then(async () => {
              const freshUser = auth.currentUser;
              if (!freshUser) return;

              // Session Management
              try {
                const idToken = await freshUser.getIdToken();
                await fetch('/api/auth/session', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ idToken }),
                });
              } catch (error) {
                console.error("FirebaseProvider: Error creating session cookie:", error);
              }

              setUserAuthState({ user: freshUser, isUserLoading: false, userError: null });
    
              const currentPath = pathnameRef.current;

              // Check if it's a new user and redirect to profile
              const { creationTime, lastSignInTime } = freshUser.metadata;
              if (creationTime && lastSignInTime) {
                  const creationTimestamp = new Date(creationTime).getTime();
                  const lastSignInTimestamp = new Date(lastSignInTime).getTime();
                  // Check if the difference is less than 10 seconds to identify a new user
                  if (Math.abs(lastSignInTimestamp - creationTimestamp) < 10000) {
                      if (currentPath !== '/profile') {
                          router.push('/profile');
                          return; // Stop further checks after redirect
                      }
                  }
              }

              // Check for email verification
              if (!freshUser.emailVerified) {
                  const allowedUnverifiedPaths = ['/verify-email', '/login', '/signup', '/forgot-password'];
                  if (!allowedUnverifiedPaths.includes(currentPath)) {
                    router.push('/verify-email');
                  }
              }

            }).catch(error => {
                console.error("FirebaseProvider: user.reload() error:", error);
                setUserAuthState({ user: auth.currentUser, isUserLoading: false, userError: error });
            });
        } else {
            // User is logged out
            (async () => {
              try {
                await fetch('/api/auth/session', { method: 'DELETE' });
              } catch (error) {
                console.error("FirebaseProvider: Error deleting session cookie:", error);
              }
            })();
            setUserAuthState({ user: null, isUserLoading: false, userError: null });
        }
      },
      (error) => {
        console.error("FirebaseProvider: onAuthStateChanged error:", error);
        setUserAuthState({ user: null, isUserLoading: false, userError: error });
      }
    );

    return () => unsubscribe();
  }, [auth, router]);

  const contextValue = useMemo((): FirebaseContextState => {
    const servicesAvailable = !!(firebaseApp && firestore && auth);
    return {
      areServicesAvailable: servicesAvailable,
      firebaseApp: servicesAvailable ? firebaseApp : null,
      firestore: servicesAvailable ? firestore : null,
      auth: servicesAvailable ? auth : null,
      user: userAuthState.user,
      isUserLoading: userAuthState.isUserLoading,
      userError: userAuthState.userError,
    };
  }, [firebaseApp, firestore, auth, userAuthState]);

  return (
    <FirebaseContext.Provider value={contextValue}>
      <FirebaseErrorListener />
      {children}
    </FirebaseContext.Provider>
  );
};

export const useFirebase = (): FirebaseContextState => {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error('useFirebase must be used within a FirebaseProvider.');
  }
  return context;
};


export const useFirebaseAuth = (): Auth | null => {
  const { auth } = useFirebase();
  return auth;
};

export const useFirestore = (): Firestore | null => {
  const { firestore } = useFirebase();
  return firestore;
};

export const useFirebaseApp = (): FirebaseApp | null => {
  const { firebaseApp } = useFirebase();
  return firebaseApp;
};

type MemoFirebase <T> = T & {__memo?: boolean};

export function useMemoFirebase<T>(factory: () => T, deps: DependencyList): T | (MemoFirebase<T>) {
  const memoized = useMemo(factory, deps);
  if(typeof memoized !== 'object' || memoized === null) return memoized;
  (memoized as MemoFirebase<T>).__memo = true;
  return memoized;
}

export const useUser = (): UserHookResult => {
  const { user, isUserLoading, userError } = useFirebase();
  return { user, isUserLoading, userError, emailVerified: user?.emailVerified ?? null };
};