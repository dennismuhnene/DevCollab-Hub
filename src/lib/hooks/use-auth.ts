'use client';

// The FirebaseProvider (src/firebase/provider.tsx) has been refactored to be the single source of truth
// for authentication and user profile data. It now directly provides a `useAuth` hook that includes
// the user, their real-time profile, and loading states.
//
// This file previously contained a separate, redundant hook that also tried to fetch the user profile.
// To fix the build error and remove duplicated logic, this file now simply re-exports the authoritative
// `useAuth` hook from the central provider. All components importing from `@/lib/hooks/use-auth`
// will now correctly receive the data from the main context.

export { useAuth } from '@/firebase/provider';
