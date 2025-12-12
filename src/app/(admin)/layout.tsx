
'use client';

import { useAuth } from '@/lib/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user?.email !== process.env.NEXT_PUBLIC_ADMIN_EMAIL) {
      router.push('/');
    }
  }, [user, loading, router]);

  if (loading || user?.email !== process.env.NEXT_PUBLIC_ADMIN_EMAIL) {
    return <p>Loading...</p>;
  }

  return <>{children}</>;
}
