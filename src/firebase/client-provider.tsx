'use client';

import React, { useMemo, type ReactNode } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { app, auth, db } from '@/lib/firebase/config';

interface FirebaseClientProviderProps {
  children: ReactNode;
}

export function FirebaseClientProvider({
  children,
}: FirebaseClientProviderProps) {
  // The firebase services are already initialized in @/lib/firebase/config.ts
  // We just need to pass them to the provider.
  const firebaseServices = useMemo(() => {
    return { firebaseApp: app, auth, firestore: db };
  }, []); 

  return (
    <FirebaseProvider
      firebaseApp={firebaseServices.firebaseApp}
      auth={firebaseServices.auth}
      firestore={firebaseServices.firestore}
    >
      {children}
    </FirebaseProvider>
  );
}
