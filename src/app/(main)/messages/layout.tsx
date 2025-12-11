'use client';

import { useAuth } from '@/lib/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { ReactNode, useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { sendGAEvent } from '@next/third-parties/google';

export default function MessagesLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
    if (!loading && user) {
        sendGAEvent({ event: 'screen_view', type: 'screen_name', value: 'Messages' });
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="container mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex gap-8">
          <div className="w-1/3">
            <Skeleton className="h-16 w-full mb-4" />
            <Skeleton className="h-96 w-full" />
          </div>
          <div className="w-2/3">
            <Skeleton className="h-full w-full" />
          </div>
        </div>
      </div>
    );
  }

  return <div className="h-[calc(100vh-theme(height.14))]">{children}</div>;
}
