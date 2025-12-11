'use client';

import React, { useMemo, type ReactNode } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { app, auth, db } from '@/lib/firebase/config';
import { getAnalytics } from "firebase/analytics";
import { setAnalyticsInstance } from '@/firebase/analytics-instance';

interface FirebaseClientProviderProps {
  children: ReactNode;
}

export function FirebaseClientProvider({
  children,
}: FirebaseClientProviderProps) {
  const firebaseServices = useMemo(() => {
    const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;
    if (analytics) {
      setAnalyticsInstance(analytics);
    }
    return { firebaseApp: app, auth, firestore: db, analytics };
  }, []); 

  return (
    <FirebaseProvider
      firebaseApp={firebaseServices.firebaseApp}
      auth={firebaseServices.auth}
      firestore={firebaseServices.firestore}
      analytics={firebaseServices.analytics}
    >
      {children}
    </FirebaseProvider>
  );
}
