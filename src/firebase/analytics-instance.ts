'use client';

import { Analytics } from 'firebase/analytics';

// This is a singleton to hold the analytics instance.
export let analyticsInstance: Analytics | null = null;

export const setAnalyticsInstance = (instance: Analytics) => {
  if (!analyticsInstance) {
    analyticsInstance = instance;
  }
};
