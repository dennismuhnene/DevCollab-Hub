
'use client';

import { ReactNode, useEffect } from 'react';
import { useAuth } from '@/lib/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function AuthLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.push('/developers');
    }
  }, [user, loading, router]);

  // While checking for the user, show a loading spinner.
  // If the user is found, the useEffect above will trigger a redirect.
  // The destination page (/developers) will then show its own loading state.
  if (loading || user) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading...</p>
      </div>
    );
  }

  // If no user is found and loading is complete, show the login/signup form.
  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex flex-1 items-center justify-center bg-background/50 py-12">
        {children}
      </main>
    </div>
  );
}
